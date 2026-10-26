import { z } from "zod";
import { answerTutorQuestionFallback } from "@/lib/providers/mistral";
import { streamTutorQuestion } from "@/lib/providers/tutor";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { lessonContentSchema, type LessonContent, type ChatMessage, type Lesson } from "@/lib/types";

const bodySchema = z.object({ question: z.string().trim().min(1).max(3000) });

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400 });
  }

  const body = bodySchema.safeParse(requestBody);
  if (!body.success)
    return new Response(JSON.stringify({ error: "Ask a question first" }), { status: 400 });

  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { count: recentMessageCount } = await supabase
    .from("lesson_chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", oneMinuteAgo);
  if ((recentMessageCount ?? 0) >= 20) {
    return new Response(JSON.stringify({ error: "Please wait a moment before asking more questions." }), {
      status: 429,
      headers: { "Retry-After": "60", "Content-Type": "application/json" },
    });
  }

  const { data: contentRow, error: contentError } = await supabase
    .from("lesson_content")
    .select("*")
    .eq("lesson_id", params.id)
    .single<LessonContent>();
  if (contentError || !contentRow)
    return new Response(JSON.stringify({ error: "Lesson content is not ready" }), { status: 409 });
  const parsedContent = lessonContentSchema.safeParse(contentRow);
  if (!parsedContent.success)
    return new Response(JSON.stringify({ error: "Lesson content is invalid" }), { status: 500 });
  const content = parsedContent.data;

  const { data: lesson } = await supabase
    .from("lessons")
    .select("source_type")
    .eq("id", params.id)
    .single<Pick<Lesson, "source_type">>();

  const { data: history } = await supabase
    .from("lesson_chat_messages")
    .select("role, content")
    .eq("lesson_id", params.id)
    .order("created_at", { ascending: false })
    .limit(12);
  const orderedHistory = [...(history ?? [])].reverse();

  const analysis = {
    title: content.title,
    sourceType: lesson?.source_type ?? "video",
    summary: content.summary,
    transcript: content.transcript,
    chapters: content.chapters,
    keyConcepts: content.key_concepts,
    importantExamples: content.important_examples,
  } as const;

  const allowFallback =
    process.env.NODE_ENV !== "production" && process.env.TRACE_ALLOW_LOCAL_FALLBACK === "true";

  try {
    const textStream = await streamTutorQuestion({
      question: body.data.question,
      analysis,
      material: content.learning_material,
      history: orderedHistory as Array<Pick<ChatMessage, "role" | "content">>,
    });

    // We need to persist after streaming completes. Use a TransformStream to
    // tee the chunks, reassemble the full answer, then insert on close.
    const serviceClient = createServiceClient();
    const userId = user.id;
    const lessonId = params.id;
    const question = body.data.question;

    const chunks: string[] = [];
    const decoder = new TextDecoder();

    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        chunks.push(decoder.decode(chunk, { stream: true }));
        controller.enqueue(chunk);
      },
      async flush(controller) {
        chunks.push(decoder.decode());
        const fullAnswer = chunks.join("").trim();
        if (!fullAnswer) {
          controller.error(new Error("Tutor returned an empty response"));
          return;
        }
        const userCreatedAt = new Date().toISOString();
        const assistantCreatedAt = new Date(Date.now() + 1).toISOString();
        // Persist both turns to Supabase after the stream closes
        const { error: persistError } = await serviceClient.from("lesson_chat_messages").insert([
          {
            lesson_id: lessonId,
            user_id: userId,
            role: "user",
            content: question,
            created_at: userCreatedAt,
          },
          {
            lesson_id: lessonId,
            user_id: userId,
            role: "assistant",
            content: fullAnswer,
            created_at: assistantCreatedAt,
          },
        ]);
        if (persistError) {
          console.error("Trace tutor history save failed", persistError.message);
        }
        controller.terminate();
      },
    });

    textStream.pipeTo(writable).catch(() => {
      // If the client disconnects early, suppress the BrokenPipe error
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    if (allowFallback) {
      const answer = answerTutorQuestionFallback({
        question: body.data.question,
        analysis,
        material: content.learning_material,
      });
        const serviceClient = createServiceClient();
        const userCreatedAt = new Date().toISOString();
        const assistantCreatedAt = new Date(Date.now() + 1).toISOString();
        const { error: persistError } = await serviceClient.from("lesson_chat_messages").insert([
          {
            lesson_id: params.id,
            user_id: user.id,
            role: "user",
            content: body.data.question,
            created_at: userCreatedAt,
          },
          {
            lesson_id: params.id,
            user_id: user.id,
            role: "assistant",
            content: answer,
            created_at: assistantCreatedAt,
          },
        ]);
      if (persistError) {
        return new Response(JSON.stringify({ error: "Could not save the tutor response" }), { status: 500 });
      }

      const encoder = new TextEncoder();
      const readable = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode(answer));
          controller.close();
        },
      });

      return new Response(readable, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    const message = error instanceof Error ? error.message : "Tutor is temporarily unavailable";
    console.error("Trace tutor request failed", message);
    return new Response(JSON.stringify({ error: "The tutor is temporarily unavailable." }), { status: 502 });
  }
}
