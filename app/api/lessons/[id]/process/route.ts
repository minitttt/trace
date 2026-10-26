import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest";
import { createClient } from "@/lib/supabase/server";
import { PROCESSING_STALE_MS, processLessonJob } from "@/lib/process-lesson";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: lesson, error } = await authClient
    .from("lessons")
    .select("id, status, updated_at")
    .eq("id", params.id)
    .single();
  if (error || !lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  if (lesson.status === "complete") return NextResponse.json({ status: "complete" });
  const isLocalProcessing =
    process.env.NODE_ENV !== "production" || process.env.TRACE_LOCAL_PROCESSING === "true";
  const isFresh = Date.now() - new Date(lesson.updated_at).getTime() < PROCESSING_STALE_MS;
  if (lesson.status === "processing" && isFresh)
    return NextResponse.json({ status: "processing" });

  if (!isLocalProcessing) {
    const { error: resetError } = await authClient
      .from("lessons")
      .update({ status: "queued", processing_stage: "uploading", processing_error: null })
      .eq("id", params.id);
    if (resetError) return NextResponse.json({ error: resetError.message }, { status: 500 });

    try {
      await inngest.send({ name: "trace/lesson.created", data: { lessonId: params.id } });
    } catch {
      await authClient
        .from("lessons")
        .update({ status: "failed", processing_error: "Could not start lesson processing" })
        .eq("id", params.id);
      return NextResponse.json({ error: "Could not enqueue processing job" }, { status: 502 });
    }
    return NextResponse.json({ status: "queued" }, { status: 202 });
  }

  void processLessonJob(params.id).catch((processingError) =>
    console.error("Trace retry processing failed", processingError),
  );
  return NextResponse.json({ status: "processing" }, { status: 202 });
}
