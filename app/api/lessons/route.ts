import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest";
import { isLocalProcessingEnabled, processLessonJob } from "@/lib/process-lesson";
import { createClient } from "@/lib/supabase/server";
import { lessonPreferencesSchema, sourceTypeSchema } from "@/lib/types";
import { z } from "zod";

const createLessonSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  sourceType: sourceTypeSchema,
  sourcePath: z.string().trim().min(1).max(500).nullable().optional(),
  publicUrl: z.string().url().max(2000).nullable().optional(),
  ...lessonPreferencesSchema.shape,
}).superRefine((value, context) => {
  if (Boolean(value.sourcePath) === Boolean(value.publicUrl)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["sourcePath"],
      message: "Provide exactly one uploaded file or public source URL",
    });
  }
  if (value.publicUrl && value.sourceType !== "video") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["publicUrl"],
      message: "Public URLs are supported for video lessons only",
    });
  }
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lessons: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = createLessonSchema.safeParse(requestBody);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const values = parsed.data;
  if (!values.sourcePath && !values.publicUrl) {
    return NextResponse.json({ error: "Add a file or a public source URL" }, { status: 400 });
  }
  if (values.sourcePath && values.sourcePath.split("/")[0] !== user.id) {
    return NextResponse.json({ error: "Invalid source path" }, { status: 400 });
  }
  if (values.sourcePath?.split("/").some((segment) => segment === "..")) {
    return NextResponse.json({ error: "Invalid source path" }, { status: 400 });
  }
  if (values.sourcePath) {
    const extension = values.sourcePath.split(".").pop()?.toLowerCase();
    const allowedExtensions = values.sourceType === "pdf" ? ["pdf"] : ["mp4", "mov", "webm"];
    if (!extension || !allowedExtensions.includes(extension)) {
      return NextResponse.json({ error: "Source file type does not match the lesson type" }, { status: 400 });
    }
  }

  const { data: lesson, error } = await supabase
    .from("lessons")
    .insert({
      user_id: user.id,
      title: values.title ?? "Untitled lesson",
      source_type: values.sourceType,
      source_path: values.sourcePath ?? null,
      public_url: values.publicUrl ?? null,
      goal: values.goal,
      difficulty: values.difficulty,
      audience: values.audience,
      output_language: values.outputLanguage,
      status: "queued",
      processing_stage: "uploading",
    })
    .select("*")
    .single();

  if (error || !lesson)
    return NextResponse.json(
      { error: error?.message ?? "Could not create lesson" },
      { status: 500 },
    );

  if (isLocalProcessingEnabled()) {
    void processLessonJob(lesson.id).catch((processingError) =>
      console.error("Trace local lesson processing failed", processingError),
    );
  } else {
    try {
      await inngest.send({ name: "trace/lesson.created", data: { lessonId: lesson.id } });
    } catch (sendError) {
      await supabase
        .from("lessons")
        .update({ status: "failed", processing_error: "Could not enqueue processing job" })
        .eq("id", lesson.id);
      const message =
        sendError instanceof Error ? sendError.message : "Could not enqueue processing job";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  return NextResponse.json({ lesson }, { status: 201 });
}
