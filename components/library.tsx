"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  Clock3,
  FileText,
  Loader2,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDate, truncate } from "@/lib/utils";
import type { Lesson } from "@/lib/types";

export function Library({ lessons }: { lessons: Lesson[] }) {
  const router = useRouter();
  const [lessonList, setLessonList] = useState<Lesson[]>(lessons);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const complete = lessonList.filter((lesson) => lesson.status === "complete").length;
  const processing = lessonList.filter(
    (lesson) => lesson.status === "processing" || lesson.status === "queued",
  ).length;

  async function handleDelete(lessonId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDeletingId(lessonId);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/lessons/${lessonId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete lesson");
      }

      setLessonList((prev) => prev.filter((item) => item.id !== lessonId));
      setConfirmDeleteId(null);
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-[#7a89ad] dark:text-[#9aaaff]">
            Your learning library
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.07em]">Keep the thread.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-text-muted">
            Every source becomes a lesson you can return to, ask questions about, and put into
            practice.
          </p>
        </div>
        <Link
          href="/dashboard/new"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-[#263453] dark:bg-[#2d3d72] dark:hover:bg-[#3a4d8f]"
        >
          <Plus className="h-4 w-4" /> New lesson
        </Link>
      </div>

      {deleteError && (
        <div className="mt-6 flex items-center gap-2 rounded-2xl border border-[#fae1da] bg-[#fff5f3] p-4 text-sm text-[#a85541] dark:border-[#4d221a] dark:bg-[#281512] dark:text-[#f3a492]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{deleteError}</span>
        </div>
      )}

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <Stat
          label="Total lessons"
          value={lessonList.length.toString()}
          icon={<BookOpen className="h-4 w-4" />}
        />
        <Stat
          label="Ready to learn"
          value={complete.toString()}
          icon={<ArrowUpRight className="h-4 w-4" />}
        />
        <Stat
          label="In progress"
          value={processing.toString()}
          icon={<Clock3 className="h-4 w-4" />}
        />
      </div>

      {lessonList.length === 0 ? (
        <Card className="mt-6 flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-mint text-[#5369b2] dark:bg-[#2a3762] dark:text-[#b8c6ff]">
            <BookOpen className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-2xl font-bold tracking-[-0.05em]">
            Your library is quiet for now.
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-text-muted">
            Start with a lecture, tutorial, talk, or paper. Trace will turn it into a lesson you can
            use.
          </p>
          <Link
            href="/dashboard/new"
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-[#263453] dark:bg-[#2d3d72] dark:hover:bg-[#3a4d8f]"
          >
            Create your first lesson <Plus className="h-4 w-4" />
          </Link>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {lessonList.map((lesson) => {
            const isConfirming = confirmDeleteId === lesson.id;
            const isDeleting = deletingId === lesson.id;

            return (
              <div key={lesson.id} className="relative">
                <Card className="group relative flex h-full flex-col justify-between p-5 transition hover:-translate-y-0.5 hover:border-[#bfd6c1] hover:shadow-lg dark:hover:border-[#38533e]">
                  {/* Top bar with icon, badge, and delete button */}
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={`grid h-11 w-11 place-items-center rounded-2xl ${
                        lesson.source_type === "pdf"
                          ? "bg-[#fff0dc] text-[#b77a3c] dark:bg-[#342416] dark:text-[#f4b676]"
                          : "bg-[#e8edff] text-[#5369b2] dark:bg-[#202d52] dark:text-[#b8c6ff]"
                      }`}
                    >
                      {lesson.source_type === "pdf" ? (
                        <FileText className="h-5 w-5" />
                      ) : (
                        <Play className="h-5 w-5" />
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        tone={
                          lesson.status === "complete"
                            ? "sage"
                            : lesson.status === "failed"
                              ? "coral"
                              : "neutral"
                        }
                      >
                        {lesson.status === "complete"
                          ? "Ready"
                          : lesson.status === "failed"
                            ? "Needs attention"
                            : "Processing"}
                      </Badge>

                      {/* Standalone delete trigger */}
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(isConfirming ? null : lesson.id)}
                        aria-label={`Delete ${lesson.title}`}
                        className="rounded-full p-1.5 text-text-subtle transition hover:bg-surface-muted hover:text-coral dark:hover:text-[#f3a492]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Body link */}
                  <Link href={`/dashboard/lessons/${lesson.id}`} className="mt-4 block flex-1">
                    <h2 className="line-clamp-2 text-xl font-bold tracking-[-0.04em] transition group-hover:text-ink dark:group-hover:text-white">
                      {lesson.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-text-muted">
                      {lesson.goal} · {lesson.difficulty} · {lesson.output_language}
                    </p>

                    {lesson.processing_error && (
                      <p className="mt-3 text-xs text-coral dark:text-[#f3a492]">
                        {truncate(lesson.processing_error, 100)}
                      </p>
                    )}
                  </Link>

                  {/* Footer link */}
                  <Link
                    href={`/dashboard/lessons/${lesson.id}`}
                    className="mt-6 flex items-center justify-between border-t border-border-muted pt-4 text-xs text-text-subtle"
                  >
                    <span>{formatDate(lesson.created_at)}</span>
                     <span className="flex items-center gap-1 font-semibold text-[#72809a] group-hover:text-fg dark:text-[#9aaaff]">
                      Open lesson <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>

                  {/* Inline Confirmation Card Overlay */}
                  {isConfirming && (
                    <div
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className="bg-surface/98 animate-in fade-in zoom-in-95 absolute inset-0 z-20 flex flex-col justify-between rounded-[24px] border border-coral/40 p-5 shadow-soft backdrop-blur duration-150"
                    >
                      <div>
                        <div className="flex items-center gap-2 text-coral dark:text-[#f3a492]">
                          <Trash2 className="h-4 w-4" />
                          <span className="text-sm font-bold">Delete notebook / lesson?</span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-text-muted">
                          This will permanently delete &ldquo;{truncate(lesson.title, 60)}&rdquo;
                          along with its notes, summary, quiz, and tutor chats.
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-full px-4 py-2 text-xs font-semibold text-text-muted transition hover:bg-surface-muted"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={(e) => handleDelete(lesson.id, e)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-coral px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#d9735d] disabled:opacity-50 dark:bg-[#b0533d] dark:hover:bg-[#c2624a]"
                        >
                          {isDeleting ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" /> Deleting…
                            </>
                          ) : (
                            "Yes, delete"
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="flex items-center gap-4 p-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-surface-muted text-[#7181aa] dark:text-[#9aaaff]">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold tracking-[-0.05em]">{value}</p>
        <p className="mt-1 text-xs font-semibold text-text-subtle">{label}</p>
      </div>
    </Card>
  );
}
