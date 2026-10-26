import { inngest } from "@/lib/inngest";
import {
  analyzePreparedSource,
  isGeminiFallbackError,
  uploadSourceFile,
  waitForUploadedSource,
} from "@/lib/providers/gemini";
import {
  createFallbackLearningMaterial,
  createLearningMaterialWithFallback,
} from "@/lib/providers/mistral";
import { analyzeSourceWithFallback } from "@/lib/providers/source-fallback";
import { createServiceClient } from "@/lib/supabase/server";
import { lessonPreferencesSchema, type Lesson, type LessonPreferences } from "@/lib/types";

export const PROCESSING_STALE_MS = 5 * 60_000;

// Never run a fire-and-forget lesson job inside a production Vercel request.
// Production must use Inngest so the work survives the request ending.
export function isLocalProcessingEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.TRACE_LOCAL_PROCESSING !== "false";
}

type StepRunner = {
  run: (name: string, handler: () => Promise<unknown>) => Promise<unknown>;
};

type ProcessOptions = {
  allowRetry?: boolean;
  finalAttempt?: boolean;
};

function sourceMimeType(sourcePath: string | null, sourceType: Lesson["source_type"]) {
  if (sourceType === "pdf") return "application/pdf";
  const extension = sourcePath?.split(".").pop()?.toLowerCase();
  if (extension === "mov") return "video/quicktime";
  if (extension === "webm") return "video/webm";
  return "video/mp4";
}

async function downloadSourceForFallback(
  lesson: Lesson,
  supabase: ReturnType<typeof createServiceClient>,
) {
  if (lesson.public_url) {
    const response = await fetch(lesson.public_url, {
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) throw new Error(`Could not download public source (${response.status})`);
    return {
      bytes: Buffer.from(await response.arrayBuffer()),
      mimeType: response.headers.get("content-type") ?? sourceMimeType(null, lesson.source_type),
      fileName: "public-source.mp4",
    };
  }

  if (!lesson.source_path) throw new Error("No source was provided for fallback processing");
  const { data, error } = await supabase.storage.from("sources").download(lesson.source_path);
  if (error || !data) throw error ?? new Error("Could not download source for fallback processing");
  return {
    bytes: Buffer.from(await data.arrayBuffer()),
    mimeType: sourceMimeType(lesson.source_path, lesson.source_type),
    fileName: lesson.source_path.split("/").pop() ?? "source",
  };
}

async function updateLesson(lessonId: string, values: Record<string, unknown>) {
  const supabase = createServiceClient();
  const query = supabase.from("lessons").update(values).eq("id", lessonId);
  const { data, error } = await query.select("id").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Lesson could not be updated");
}

async function claimLesson(lessonId: string, allowRetry: boolean) {
  const supabase = createServiceClient();
  const processingValues = {
    status: "processing",
    processing_stage: "reading_source",
    processing_error: null,
  };

  const { data: queuedClaim, error: queuedError } = await supabase
    .from("lessons")
    .update(processingValues)
    .eq("id", lessonId)
    .in("status", ["queued", "failed"])
    .select("id")
    .maybeSingle();
  if (queuedError) throw queuedError;
  if (queuedClaim) return true;

  // Inngest retries are explicitly allowed to reclaim the current processing lease.
  if (allowRetry) {
    const { data: retryClaim, error: retryError } = await supabase
      .from("lessons")
      .update(processingValues)
      .eq("id", lessonId)
      .eq("status", "processing")
      .select("id")
      .maybeSingle();
    if (retryError) throw retryError;
    if (retryClaim) return true;
  }

  const staleBefore = new Date(Date.now() - PROCESSING_STALE_MS).toISOString();
  const { data: staleClaim, error: staleError } = await supabase
    .from("lessons")
    .update(processingValues)
    .eq("id", lessonId)
    .eq("status", "processing")
    .lt("updated_at", staleBefore)
    .select("id")
    .maybeSingle();
  if (staleError) throw staleError;
  return Boolean(staleClaim);
}

function userFacingProcessingError(error: unknown, stage: string) {
  const message = error instanceof Error ? error.message : String(error);
  if (
    /GOOGLE_GEMINI_API_KEY|MISTRAL_API_KEY|SUPABASE_SERVICE_ROLE_KEY|not configured|unauthorized|forbidden|\b401\b|\b403\b/i.test(
      message,
    )
  ) {
    return "AI processing is not configured correctly on the server. Check the production environment variables.";
  }
  if (/download source|storage|No source was provided|unsupported|mime|file/i.test(message)) {
    return "We could not read this source. Try a supported video or PDF file, or a public video URL.";
  }
  if (
    /429|quota|rate limit|resource exhausted|high demand|temporarily unavailable/i.test(message)
  ) {
    return "The AI service is temporarily at capacity. Please try again in a moment.";
  }
  if (/timed out|timeout|deadline/i.test(message)) {
    return stage === "reading_source"
      ? "Source analysis took too long. Try a shorter video or PDF."
      : "Lesson processing took too long. Please try again in a moment.";
  }
  if (/invalid|JSON|schema|empty/i.test(message)) {
    return "The AI returned an incomplete result for this source. Please try again.";
  }
  if (/unavailable|temporarily/i.test(message)) {
    return "The source could not be processed right now. Please try again in a moment.";
  }
  return "We could not finish building this lesson. Please try again.";
}

export const processLesson = inngest.createFunction(
  { id: "process-trace-lesson", retries: 3, triggers: [{ event: "trace/lesson.created" }] },
  async ({ event, step, attempt, maxAttempts }) =>
    processLessonJob(event.data.lessonId, step, {
      allowRetry: attempt > 0,
      finalAttempt: attempt >= (maxAttempts ?? 4) - 1,
    }),
);

export async function processLessonJob(
  lessonId: string,
  step?: StepRunner,
  options: ProcessOptions = {},
) {
  const supabase = createServiceClient();
  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .single<Lesson>();
  if (lessonError || !lesson) throw lessonError ?? new Error("Lesson not found");

  if (lesson.status === "complete") return { lessonId: lesson.id, status: "complete" };

  const claimed = await claimLesson(lesson.id, options.allowRetry === true);
  if (!claimed) return { lessonId: lesson.id, status: "processing" };

  let activeStage = "reading_source";

  try {
    const runStep = <T>(name: string, handler: () => Promise<T>) =>
      step ? (step.run(name, handler) as Promise<T>) : handler();

    const sourceReference = await runStep("prepare-source", async () => {
      if (lesson.public_url) {
        return { sourcePart: { type: "video" as const, uri: lesson.public_url } };
      }

      if (!lesson.source_path) throw new Error("No source was provided to Gemini");
      const { data, error } = await supabase.storage.from("sources").download(lesson.source_path);
      if (error || !data)
        throw error ?? new Error("Could not download source from Supabase Storage");

      try {
        const fileName = await uploadSourceFile({
          bytes: Buffer.from(await data.arrayBuffer()),
          mimeType: sourceMimeType(lesson.source_path, lesson.source_type),
          fileName: lesson.source_path.split("/").pop(),
        });
        return { uploadedFileName: fileName };
      } catch (error) {
        if (!isGeminiFallbackError(error)) throw error;
        console.warn("Gemini source upload failed; switching to fallback source analysis", {
          lessonId: lesson.id,
          message: error instanceof Error ? error.message : String(error),
        });
        return { useFallback: true as const };
      }
    });

    const sourcePart = await runStep("wait-for-source", async () => {
      if (sourceReference.uploadedFileName) {
        try {
          return await waitForUploadedSource({
            fileName: sourceReference.uploadedFileName,
            sourceType: lesson.source_type,
          });
        } catch (error) {
          if (!isGeminiFallbackError(error)) throw error;
          console.warn("Gemini source preparation failed; switching to fallback source analysis", {
            lessonId: lesson.id,
            message: error instanceof Error ? error.message : String(error),
          });
          return null;
        }
      }
      if (sourceReference.useFallback) return null;
      if (!sourceReference.sourcePart) throw new Error("No source was provided to Gemini");
      return sourceReference.sourcePart;
    });

    const source = await runStep("analyze-source", async () => {
      let analysis;
      if (!sourcePart) {
        const fallbackSource = await downloadSourceForFallback(lesson, supabase);
        analysis = await analyzeSourceWithFallback({
          sourceType: lesson.source_type,
          ...fallbackSource,
        });
      } else {
        try {
          analysis = await analyzePreparedSource({
            sourceType: lesson.source_type,
            sourcePart,
            publicUrl: lesson.public_url ?? undefined,
          });
        } catch (error) {
          if (!isGeminiFallbackError(error)) throw error;
          console.warn("Gemini source analysis failed; switching to fallback source analysis", {
            lessonId: lesson.id,
            message: error instanceof Error ? error.message : String(error),
          });
          const fallbackSource = await downloadSourceForFallback(lesson, supabase);
          analysis = await analyzeSourceWithFallback({
            sourceType: lesson.source_type,
            ...fallbackSource,
          });
        }
      }

      // Mark extracting_content after source analysis so the stage is visible
      activeStage = "extracting_content";
      await updateLesson(lesson.id, { processing_stage: "extracting_content" });
      return analysis;
    });

    // Mark creating_material right before the primary/fallback material step starts
    activeStage = "creating_material";
    await updateLesson(lesson.id, { processing_stage: "creating_material" });

    const preferences = lessonPreferencesSchema.parse({
      goal: lesson.goal,
      difficulty: lesson.difficulty,
      audience: lesson.audience,
      outputLanguage: lesson.output_language,
    }) satisfies LessonPreferences;
    let material;
    try {
      material = await runStep("create-learning-material", () =>
        createLearningMaterialWithFallback(source, preferences),
      );
    } catch (error) {
      if (
        process.env.NODE_ENV !== "production" &&
        process.env.TRACE_ALLOW_LOCAL_FALLBACK === "true"
      ) {
        console.warn("Trace is using local learning-material fallback", error);
        material = createFallbackLearningMaterial(source, preferences);
      } else {
        throw error;
      }
    }

    activeStage = "preparing_tutor";
    await updateLesson(lesson.id, { processing_stage: "preparing_tutor" });
    const { error: contentError } = await supabase.from("lesson_content").upsert({
      lesson_id: lesson.id,
      title: source.title,
      summary: source.summary,
      transcript: source.transcript,
      chapters: source.chapters,
      key_concepts: source.keyConcepts,
      important_examples: source.importantExamples,
      learning_material: material,
    });
    if (contentError) throw contentError;

    await updateLesson(lesson.id, {
      title: source.title,
      status: "complete",
      processing_stage: "complete",
      processing_error: null,
    });

    return { lessonId: lesson.id, status: "complete" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Trace lesson processing failed", {
      lessonId: lesson.id,
      stage: activeStage,
      message,
    });
    if (options.finalAttempt !== false) {
      try {
        await updateLesson(lesson.id, {
          status: "failed",
          processing_error: userFacingProcessingError(error, activeStage),
        });
      } catch (updateError) {
        console.error("Trace could not save lesson processing failure", {
          lessonId: lesson.id,
          message: updateError instanceof Error ? updateError.message : String(updateError),
        });
      }
    }
    throw error;
  }
}
