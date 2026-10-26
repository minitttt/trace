import { inngest } from "@/lib/inngest";
import { analyzeSource } from "@/lib/providers/gemini";
import { createFallbackLearningMaterial, createLearningMaterial } from "@/lib/providers/mistral";
import { createServiceClient } from "@/lib/supabase/server";
import { lessonPreferencesSchema, type Lesson, type LessonPreferences } from "@/lib/types";

export const PROCESSING_STALE_MS = 5 * 60_000;

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

function userFacingProcessingError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/unsupported|mime|file|source/i.test(message)) {
    return "We could not read this source. Try a supported video or PDF file, or a public video URL.";
  }
  if (/timed out|unavailable|rate limit|high demand|temporarily/i.test(message)) {
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

  try {
    const runStep = <T>(name: string, handler: () => Promise<T>) =>
      step ? (step.run(name, handler) as Promise<T>) : handler();

    const source = await runStep("analyze-source", async () => {
      let bytes: Buffer | undefined;
      if (lesson.source_path) {
        const { data, error } = await supabase.storage.from("sources").download(lesson.source_path);
        if (error || !data)
          throw error ?? new Error("Could not download source from Supabase Storage");
        bytes = Buffer.from(await data.arrayBuffer());
      }

      const analysis = await analyzeSource({
        sourceType: lesson.source_type,
        bytes,
        mimeType: sourceMimeType(lesson.source_path, lesson.source_type),
        fileName: lesson.source_path?.split("/").pop(),
        publicUrl: lesson.public_url ?? undefined,
      });

      // Mark extracting_content after source analysis so the stage is visible
      await updateLesson(lesson.id, { processing_stage: "extracting_content" });
      return analysis;
    });

    // Mark creating_material right before the Mistral step starts
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
        createLearningMaterial(source, preferences),
      );
    } catch (error) {
      if (process.env.NODE_ENV !== "production" && process.env.TRACE_ALLOW_LOCAL_FALLBACK === "true") {
        console.warn("Trace is using local learning-material fallback", error);
        material = createFallbackLearningMaterial(source, preferences);
      } else {
        throw error;
      }
    }

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
    if (options.finalAttempt !== false) {
      await updateLesson(
        lesson.id,
        {
          status: "failed",
          processing_error: userFacingProcessingError(error),
        },
      );
    }
    throw error;
  }
}
