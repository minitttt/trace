import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { lessonContentSchema } from "@/lib/types";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: lesson, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", params.id)
    .single();
  if (error || !lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const { data: content } = await supabase
    .from("lesson_content")
    .select("*")
    .eq("lesson_id", params.id)
    .maybeSingle();
  const parsedContent = content ? lessonContentSchema.safeParse(content) : null;
  if (content && !parsedContent?.success) {
    return NextResponse.json({ error: "Lesson content is invalid" }, { status: 500 });
  }
  const { data: messages } = await supabase
    .from("lesson_chat_messages")
    .select("*")
    .eq("lesson_id", params.id)
    .order("created_at", { ascending: true });
  return NextResponse.json({ lesson, content: parsedContent?.data ?? null, messages: messages ?? [] });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: lesson, error: fetchError } = await supabase
    .from("lessons")
    .select("id, source_path, user_id")
    .eq("id", params.id)
    .single();

  if (fetchError || !lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  if (lesson.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (lesson.source_path) {
    const { error: storageError } = await supabase.storage
      .from("sources")
      .remove([lesson.source_path]);
    if (storageError) {
      return NextResponse.json({ error: "Could not remove the lesson source" }, { status: 502 });
    }
  }

  const { error: chatDeleteError } = await supabase
    .from("lesson_chat_messages")
    .delete()
    .eq("lesson_id", params.id);
  if (chatDeleteError) return NextResponse.json({ error: chatDeleteError.message }, { status: 500 });

  const { error: contentDeleteError } = await supabase
    .from("lesson_content")
    .delete()
    .eq("lesson_id", params.id);
  if (contentDeleteError)
    return NextResponse.json({ error: contentDeleteError.message }, { status: 500 });

  const { error: deleteError } = await supabase.from("lessons").delete().eq("id", params.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
