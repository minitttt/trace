"use client";

import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock3,
  Headphones,
  Lightbulb,
  Loader2,
  MessageCircle,
  Play,
  Radio,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AudioOverview } from "@/components/audio-overview";
import type { ChatMessage, Lesson, LessonContent } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

type Tab = "overview" | "audio" | "chapters" | "practice";

export function LessonWorkspace({
  lesson,
  content,
  initialMessages,
}: {
  lesson: Lesson;
  content: LessonContent;
  initialMessages: ChatMessage[];
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [messages, setMessages] = useState(initialMessages);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/lessons/${lesson.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete lesson");
      }
      window.location.href = "/dashboard";
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete lesson");
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-text-muted transition hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" /> Back to library
        </Link>

        {/* Delete Lesson Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            aria-label="Delete this lesson"
            className="inline-flex items-center gap-1.5 rounded-full border border-border-token bg-surface px-3 py-1.5 text-xs font-semibold text-text-muted transition hover:border-coral/50 hover:bg-[#fff5f3] hover:text-coral dark:hover:bg-[#281512] dark:hover:text-[#f3a492]"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete notebook
          </button>

          {confirmDelete && (
            <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-2xl border border-coral/30 bg-surface p-4 shadow-soft backdrop-blur">
              <p className="text-xs font-bold text-coral dark:text-[#f3a492]">
                Permanently delete notebook?
              </p>
              <p className="mt-1 text-xs leading-4 text-text-muted">
                All notes, study material, quiz questions, and chat history will be removed.
              </p>
              {deleteError && (
                <p className="mt-2 text-xs text-coral dark:text-[#f3a492]">{deleteError}</p>
              )}
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-full px-3 py-1 text-xs font-semibold text-text-muted hover:bg-surface-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1 rounded-full bg-coral px-3 py-1 text-xs font-semibold text-white hover:bg-[#d9735d] disabled:opacity-50 dark:bg-[#b0533d] dark:hover:bg-[#c2624a]"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" /> Deleting…
                    </>
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="sage">
              {lesson.source_type === "pdf" ? "PDF lesson" : "Video lesson"}
            </Badge>
            <span className="text-xs font-semibold text-text-subtle">
              {lesson.goal} · {lesson.difficulty}
            </span>
          </div>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-[-0.07em]">{content.title}</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-text-muted">{content.summary}</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-border-token bg-surface px-4 py-3 text-sm text-text-muted">
             <Sparkles className="h-4 w-4 text-[#7187d4] dark:text-[#9db0ff]" /> Ready to learn
        </div>
      </div>

      <div className="mt-9 grid gap-6 lg:grid-cols-[1fr_350px]">
        <div>
          <div className="flex gap-1 overflow-x-auto border-b border-border-muted">
            <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
              Overview
            </TabButton>
            <TabButton active={tab === "audio"} onClick={() => setTab("audio")}>
              <span className="flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Audio Overview
                 <span className="rounded-full bg-mint px-1.5 py-0.5 text-[10px] font-bold text-[#5369b2] dark:bg-[#26345e] dark:text-[#c1ccff]">
                  Deep Dive
                </span>
              </span>
            </TabButton>
            <TabButton active={tab === "chapters"} onClick={() => setTab("chapters")}>
              Chapters
            </TabButton>
            <TabButton active={tab === "practice"} onClick={() => setTab("practice")}>
              Practice
            </TabButton>
          </div>
          {tab === "overview" && <Overview content={content} onOpenAudio={() => setTab("audio")} />}
          {tab === "audio" && (
            <div className="pt-6">
              <AudioOverview
                lessonId={lesson.id}
                lessonTitle={content.title}
                outputLanguage={lesson.output_language}
                initialPodcast={content.learning_material?.podcast}
              />
            </div>
          )}
          {tab === "chapters" && <Chapters content={content} />}
          {tab === "practice" && <Practice material={content.learning_material} />}
        </div>
        <Tutor lessonId={lesson.id} messages={messages} onMessages={setMessages} />
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${
        active
          ? "border-ink text-ink dark:border-[#aebcff] dark:text-[#c1ccff]"
          : "border-transparent text-text-muted hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

function Overview({ content, onOpenAudio }: { content: LessonContent; onOpenAudio: () => void }) {
  return (
    <div className="space-y-6 pt-6">
      {/* Audio Overview Feature Spotlight */}
      <div
        onClick={onOpenAudio}
        className="group relative flex cursor-pointer items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[#dfe5ff] bg-gradient-to-r from-[#f0f3ff] via-[#f8f9ff] to-[#eef1ff] p-4 transition hover:border-[#aebcf0] hover:shadow-soft dark:border-[#303d68] dark:from-[#18213a] dark:via-[#101521] dark:to-[#172039]"
      >
        <div className="flex items-center gap-3.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#5369b2] shadow-sm dark:bg-[#26345e] dark:text-[#b8c6ff]">
            <Headphones className="h-5 w-5 transition group-hover:scale-110" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#5369b2] dark:text-[#aebcff]">
                Audio Deep Dive
              </p>
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-[#5369b2] dark:bg-[#26345e] dark:text-[#c1ccff]">
                  Audio Deep Dive
              </span>
            </div>
            <p className="mt-0.5 text-sm font-semibold text-fg">
              Prefer listening? Leo & Maya break down this lesson in an engaging 3-min conversation.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenAudio();
          }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white transition group-hover:bg-[#263453] dark:bg-[#2d3d72] dark:hover:bg-[#3a4d8f]"
        >
          <Play className="h-3 w-3 fill-current" /> Listen now
        </button>
      </div>
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-[#df9b53]" />
          <h2 className="text-lg font-bold tracking-[-0.03em]">Key concepts</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {content.key_concepts.map((concept) => (
            <Card key={concept.term} className="p-5">
              <p className="text-sm font-bold">{concept.term}</p>
              <p className="mt-2 text-sm leading-6 text-text-muted">{concept.explanation}</p>
            </Card>
          ))}
        </div>
      </section>
      <section>
        <div className="mb-4 flex items-center gap-2">
           <BookOpen className="h-4 w-4 text-[#7187d4] dark:text-[#9db0ff]" />
          <h2 className="text-lg font-bold tracking-[-0.03em]">Important examples</h2>
        </div>
        <div className="space-y-3">
          {content.important_examples.map((example, index) => (
            <div
              key={example}
              className="flex gap-4 rounded-2xl border border-border-token bg-surface p-5 shadow-soft transition-colors"
            >
               <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-mint text-xs font-bold text-[#5369b2] dark:bg-[#26345e] dark:text-[#c1ccff]">
                {index + 1}
              </span>
              <p className="text-fg/90 text-sm leading-6">{example}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Chapters({ content }: { content: LessonContent }) {
  return (
    <div className="space-y-3 pt-6">
      {content.chapters.map((chapter, index) => (
        <Card key={`${chapter.title}-${index}`} className="flex gap-4 p-5">
           <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-muted text-sm font-bold text-[#7181aa] dark:text-[#9aaaff]">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold">{chapter.title}</h2>
              {chapter.startSeconds !== undefined && (
                <span className="flex items-center gap-1 text-xs font-semibold text-text-subtle">
                  <Clock3 className="h-3.5 w-3.5" />
                  {formatDuration(chapter.startSeconds)}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm leading-6 text-text-muted">{chapter.description}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Practice({ material }: { material: LessonContent["learning_material"] }) {
  return (
    <div className="space-y-6 pt-6">
       <Card className="bg-ink p-6 text-white dark:border dark:border-[#35446f] dark:bg-[#202d52]">
         <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#c1ccff]">
          Suggested practice
        </p>
        <p className="mt-3 text-lg font-semibold leading-7">{material.practicalPrompt}</p>
      </Card>
      <section>
        <h2 className="mb-4 text-lg font-bold tracking-[-0.03em]">Study plan</h2>
        <div className="space-y-3">
          {material.studyPlan.map((step, index) => (
            <div
              key={step.title}
              className="flex gap-4 rounded-2xl border border-border-token bg-surface p-5 shadow-soft transition-colors"
            >
           <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-mint text-sm font-bold text-[#5369b2] dark:bg-[#26345e] dark:text-[#c1ccff]">
                {index + 1}
              </span>
              <div>
                <p className="font-bold">
                  {step.title}
                  {step.durationMinutes ? (
                    <span className="ml-2 text-xs font-semibold text-text-subtle">
                      {step.durationMinutes} min
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-sm leading-6 text-text-muted">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-4 text-lg font-bold tracking-[-0.03em]">Flashcards</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {material.flashcards.map((card) => (
            <Flashcard key={card.question} question={card.question} answer={card.answer} />
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-4 text-lg font-bold tracking-[-0.03em]">Quick check</h2>
        <div className="space-y-3">
          {material.quiz.map((question, index) => (
            <QuizQuestion key={question.question} question={question} index={index} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Flashcard({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button onClick={() => setOpen(!open)} className="w-full text-left">
      <Card className="h-full p-5 transition hover:border-[#c0d7c3] dark:hover:border-[#38533e]">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-bold leading-6">{question}</p>
          {open ? (
             <ChevronUp className="h-4 w-4 shrink-0 text-[#7187d4] dark:text-[#9db0ff]" />
          ) : (
             <ChevronDown className="h-4 w-4 shrink-0 text-[#7187d4] dark:text-[#9db0ff]" />
          )}
        </div>
        {open && (
          <p className="mt-4 border-t border-border-muted pt-4 text-sm leading-6 text-text-muted">
            {answer}
          </p>
        )}
      </Card>
    </button>
  );
}

function QuizQuestion({
  question,
  index,
}: {
  question: LessonContent["learning_material"]["quiz"][number];
  index: number;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const answered = selected !== null;
  return (
    <Card className="p-5">
      <p className="text-sm font-bold leading-6">
         <span className="mr-2 text-[#7181aa] dark:text-[#9aaaff]">{index + 1}.</span>
        {question.question}
      </p>
      <div className="mt-4 grid gap-2">
        {question.options.map((option) => (
          <button
            key={option}
            onClick={() => setSelected(option)}
            className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${
              selected === option
                ? option === question.answer
                   ? "border-[#aebcf0] bg-mint text-[#5369b2] dark:border-[#465a9b] dark:bg-[#26345e] dark:text-[#c1ccff]"
                  : "border-[#f0b4a4] bg-[#fff0ec] text-[#a85541] dark:border-[#522b24] dark:bg-[#341b17] dark:text-[#f4a18f]"
                : "border-border-token text-text-muted hover:bg-surface-muted hover:text-fg"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      {answered && (
        <div
          className={`mt-4 rounded-xl p-3 text-sm leading-5 ${
            selected === question.answer
               ? "bg-mint text-[#5369b2] dark:bg-[#26345e] dark:text-[#c1ccff]"
              : "bg-[#fff0ec] text-[#a85541] dark:bg-[#341b17] dark:text-[#f4a18f]"
          }`}
        >
          {selected === question.answer
            ? "Nice — that's right. "
            : `Not quite. The answer is ${question.answer}. `}
          {question.explanation}
        </div>
      )}
    </Card>
  );
}

function Tutor({
  lessonId,
  messages,
  onMessages,
}: {
  lessonId: string;
  messages: ChatMessage[];
  onMessages: Dispatch<SetStateAction<ChatMessage[]>>;
}) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const savedQuestionRef = useRef<string>("");
  const requestInFlightRef = useRef(false);

  async function ask(overrideQuestion?: string) {
    const q = (overrideQuestion ?? question).trim();
    if (!q || requestInFlightRef.current) return;

    requestInFlightRef.current = true;
    setLoading(true);
    setError(null);
    setStreamingContent("");
    savedQuestionRef.current = q;
    setQuestion("");

    try {
      const response = await fetch(`/api/lessons/${lessonId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      if (!response.ok || !response.body) {
        setError("Something went wrong. Your question has been restored.");
        setQuestion(savedQuestionRef.current);
        setStreamingContent(null);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setStreamingContent(fullText);
      }

      const finalText = fullText.trim();
      if (!finalText) throw new Error("Tutor returned an empty response");

      setStreamingContent(null);

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        lesson_id: lessonId,
        user_id: "",
        role: "user",
        content: q,
        created_at: new Date().toISOString(),
      };
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        lesson_id: lessonId,
        user_id: "",
        role: "assistant",
        content: finalText,
        created_at: new Date().toISOString(),
      };
      onMessages((currentMessages) => [...currentMessages, userMsg, assistantMsg]);
    } catch {
      setError("Something went wrong. Your question has been restored.");
      setQuestion(savedQuestionRef.current);
      setStreamingContent(null);
    } finally {
      requestInFlightRef.current = false;
      setLoading(false);
    }
  }

  return (
    <Card className="flex min-h-[520px] flex-col overflow-hidden lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:max-h-[720px]">
      <div className="bg-surface/50 border-b border-border-muted p-5">
        <div className="flex items-center gap-3">
           <div className="grid h-10 w-10 place-items-center rounded-2xl bg-mint text-[#5369b2] dark:bg-[#26345e] dark:text-[#c1ccff]">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold">Ask your tutor</h2>
            <p className="mt-1 text-xs text-text-subtle">Grounded in this lesson</p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 && streamingContent === null && (
          <div className="rounded-2xl bg-surface-muted p-4">
            <p className="text-sm font-semibold">Try asking:</p>
            <ul className="mt-3 space-y-2 text-sm leading-5 text-text-muted">
              <li>&ldquo;What is the main idea in plain language?&rdquo;</li>
              <li>&ldquo;How would I apply this at work?&rdquo;</li>
              <li>&ldquo;Quiz me on the difficult parts.&rdquo;</li>
            </ul>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={`${message.id}-${index}`}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                message.role === "user"
                   ? "bg-ink text-white dark:bg-[#2d3d72] dark:text-[#f2f4ff]"
                  : "bg-surface-muted text-fg"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {/* Streaming bubble */}
        {streamingContent !== null && (
          <div className="flex justify-start">
            <div className="max-w-[88%] rounded-2xl bg-surface-muted px-4 py-3 text-sm leading-6 text-fg">
              {streamingContent.length > 0 ? (
                <>
                  {streamingContent}
                   <span className="ml-0.5 inline-block animate-pulse font-bold text-[#7187d4] dark:text-[#9db0ff]">
                    ▋
                  </span>
                </>
              ) : (
                <>
                  Thinking
                   <span className="ml-0.5 inline-block animate-pulse font-bold text-[#7187d4] dark:text-[#9db0ff]">
                    ▋
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border-muted p-4">
        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-xl bg-[#fff0ec] p-3 text-sm text-[#a85541] dark:bg-[#341b17] dark:text-[#f4a18f]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              onClick={() => {
                setError(null);
                ask(savedQuestionRef.current);
              }}
              className="flex shrink-0 items-center gap-1 font-semibold underline-offset-2 hover:underline"
            >
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </div>
        )}

        <div className="flex items-end gap-2 rounded-2xl border border-border-token bg-surface p-2 focus-within:border-sage dark:focus-within:border-[#4d7554]">
          <textarea
            value={question}
            onChange={(event) => {
              setQuestion(event.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                ask();
              }
            }}
            rows={2}
            placeholder="Ask about this lesson…"
            className="min-h-11 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm text-fg outline-none placeholder:text-text-subtle"
          />
          <Button
            size="icon"
            disabled={loading || !question.trim()}
            onClick={() => ask()}
            aria-label="Send question"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-center text-[11px] text-text-subtle">
          Enter to send · Shift + Enter for a new line
        </p>
      </div>
    </Card>
  );
}
