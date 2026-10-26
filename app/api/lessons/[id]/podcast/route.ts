import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generatePodcast } from "@/lib/podcast";
import { lessonContentSchema, type LearningMaterial, type LessonContent } from "@/lib/types";

const podcastRequestSchema = z.object({ regenerate: z.boolean().optional() });

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: content, error } = await supabase
    .from("lesson_content")
    .select("learning_material")
    .eq("lesson_id", params.id)
    .single();

  if (error || !content) {
    return NextResponse.json({ error: "Lesson content not found" }, { status: 404 });
  }

  const parsedContent = lessonContentSchema.safeParse(content);
  if (!parsedContent.success) return NextResponse.json({ error: "Lesson content is invalid" }, { status: 500 });
  const material = parsedContent.data.learning_material as LearningMaterial | null;
  const podcast = material?.podcast ?? null;
  return NextResponse.json({ podcast });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get lesson details and content
  const [{ data: lesson }, { data: contentRow, error: contentError }] = await Promise.all([
    supabase.from("lessons").select("title, output_language").eq("id", params.id).single(),
    supabase.from("lesson_content").select("*").eq("lesson_id", params.id).single(),
  ]);

  if (contentError || !contentRow) {
    return NextResponse.json({ error: "Lesson content not ready" }, { status: 404 });
  }

  const parsedContent = lessonContentSchema.safeParse(contentRow);
  if (!parsedContent.success) {
    return NextResponse.json({ error: "Lesson content is invalid" }, { status: 500 });
  }
  const content = parsedContent.data as LessonContent;
  let body: { regenerate?: boolean } = {};
  try {
    const parsedBody = podcastRequestSchema.safeParse(await request.json());
    if (!parsedBody.success) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    body = parsedBody.data;
  } catch {
    // Empty body
  }

  // Return existing podcast if not forced to regenerate
  if (!body.regenerate && content.learning_material?.podcast) {
    return NextResponse.json({ podcast: content.learning_material.podcast });
  }

  if (
    body.regenerate &&
    contentRow.updated_at &&
    Date.now() - new Date(contentRow.updated_at).getTime() < 5 * 60_000
  ) {
    return NextResponse.json(
      { error: "Please wait a few minutes before generating another audio overview." },
      { status: 429, headers: { "Retry-After": "300" } },
    );
  }

  // Generate new podcast script
  let podcast;
  try {
    podcast = await generatePodcast({
      title: content.title || lesson?.title || "Untitled Lesson",
      summary: content.summary,
      key_concepts: content.key_concepts || [],
      chapters: content.chapters || [],
      takeaways: content.learning_material?.takeaways || [],
      outputLanguage: lesson?.output_language || "English",
    });
  } catch (error) {
    console.error("Trace audio overview generation failed", error);
    return NextResponse.json({ error: "Could not generate an audio overview" }, { status: 502 });
  }

  // Persist into Supabase lesson_content
  const updatedMaterial = {
    ...content.learning_material,
    podcast,
  };

  const { error: updateError } = await supabase
    .from("lesson_content")
    .update({ learning_material: updatedMaterial })
    .eq("lesson_id", params.id);

  if (updateError) {
    console.warn("Failed to persist podcast to Supabase:", updateError.message);
  }

  return NextResponse.json({ podcast });
}
