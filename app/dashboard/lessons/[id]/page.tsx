import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ProcessingView } from "@/components/processing-view";
import { LessonWorkspace } from "@/components/lesson-workspace";
import { createClient } from "@/lib/supabase/server";
import { lessonContentSchema, type ChatMessage, type Lesson, type LessonContent } from "@/lib/types";

export default async function LessonPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  const { data: lesson } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", params.id)
    .single<Lesson>();
  if (!lesson) notFound();
  const { data: contentRow } = await supabase
    .from("lesson_content")
    .select("*")
    .eq("lesson_id", params.id)
    .maybeSingle<LessonContent>();
  const parsedContent = contentRow ? lessonContentSchema.safeParse(contentRow) : null;
  const content = parsedContent?.success ? parsedContent.data : null;
  const { data: messages } = await supabase
    .from("lesson_chat_messages")
    .select("*")
    .eq("lesson_id", params.id)
    .order("created_at", { ascending: true });
  return (
    <AppShell userEmail={user.email}>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
        {lesson.status !== "complete" || !content ? (
          <ProcessingView
            initialLesson={lesson}
            autoStartProcessing={
              process.env.NODE_ENV !== "production" || process.env.TRACE_LOCAL_PROCESSING === "true"
            }
          />
        ) : (
          <LessonWorkspace
            lesson={lesson}
            content={content}
            initialMessages={(messages ?? []) as ChatMessage[]}
          />
        )}
      </div>
    </AppShell>
  );
}
