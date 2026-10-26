"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Circle, Loader2, RefreshCcw, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { processingStages } from "@/lib/constants";
import type { Lesson } from "@/lib/types";

export function ProcessingView({
  initialLesson,
  autoStartProcessing,
}: {
  initialLesson: Lesson;
  autoStartProcessing: boolean;
}) {
  const router = useRouter();
  const [lesson, setLesson] = useState(initialLesson);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const processRequested = useRef(false);

  useEffect(() => {
    if (lesson.status === "complete" || lesson.status === "failed") return;
    if (autoStartProcessing && !processRequested.current) {
      processRequested.current = true;
      void fetch(`/api/lessons/${lesson.id}/process`, { method: "POST" });
    }
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/lessons/${lesson.id}`, { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      setLesson(payload.lesson);
      if (payload.lesson.status === "complete") window.location.reload();
    }, 3500);
    return () => window.clearInterval(timer);
  }, [autoStartProcessing, lesson.id, lesson.status]);

  async function handleRetry() {
    setRetrying(true);
    setRetryError(null);
    try {
      const response = await fetch(`/api/lessons/${lesson.id}/process`, { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Could not restart processing");
      processRequested.current = true;
      setLesson((current) => ({
        ...current,
        status: "processing",
        processing_stage: "uploading",
        processing_error: null,
      }));
    } catch (error) {
      setRetryError(error instanceof Error ? error.message : "Could not restart processing");
    } finally {
      setRetrying(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/lessons/${lesson.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      }
    } finally {
      setDeleting(false);
    }
  }

  const currentIndex = processingStages.findIndex((stage) => stage.key === lesson.processing_stage);
  const failed = lesson.status === "failed";

  return (
    <Card className="mx-auto max-w-3xl overflow-hidden">
      <div className="bg-ink px-6 py-8 text-white dark:border-b dark:border-[#35446f] dark:bg-[#18213a] sm:px-10">
        <div className="flex items-center justify-between gap-4">
          <div>
          <Badge className="bg-white/10 text-[#d7def4] dark:bg-white/5 dark:text-[#c1ccff]">
              {failed ? "Processing paused" : "Working on it"}
            </Badge>
            <h1 className="mt-4 text-3xl font-bold tracking-[-0.06em]">
              {failed ? "We hit a snag." : "Building your lesson."}
            </h1>
              <p className="mt-2 max-w-lg text-sm leading-6 text-[#c1c9dc] dark:text-[#aeb9cf]">
              {failed
                ? "Your source is safe. Check the error below and try again with a supported source."
                : "You can leave this page open or come back from your library. Trace keeps the job moving in the background."}
            </p>
          </div>
          {failed ? (
            <X className="h-7 w-7 text-[#f0a493]" />
          ) : (
            <Loader2 className="h-7 w-7 animate-spin text-[#b2d5b7]" />
          )}
        </div>
      </div>

      <div className="space-y-1 p-6 sm:p-10">
        {processingStages.map((stage, index) => {
          const complete = !failed && currentIndex > index;
          const active = !failed && currentIndex === index;
          return (
            <div
              key={stage.key}
              className={`flex gap-4 rounded-2xl p-4 transition-colors ${
                 active ? "bg-[#f3f5ff] dark:bg-[#1b2442]" : ""
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {complete ? (
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-mint text-[#5369b2] dark:bg-[#2a3762] dark:text-[#b8c6ff]">
                    <Check className="h-4 w-4" />
                  </span>
                ) : active ? (
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[#e2e8ff] text-[#5369b2] dark:bg-[#2a3762] dark:text-[#b8c6ff]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </span>
                ) : (
                  <Circle className="h-7 w-7 text-[#d2d8e4] dark:text-[#3a465d]" />
                )}
              </div>
              <div>
                <p className={`text-sm font-bold ${active ? "text-fg" : "text-text-muted"}`}>
                  {stage.label}
                </p>
                <p className="mt-1 text-sm leading-5 text-text-subtle">{stage.description}</p>
              </div>
            </div>
          );
        })}

        {failed && (
          <div className="mt-5 rounded-2xl bg-[#fff0ec] p-4 dark:bg-[#341b17]">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a85541] dark:text-[#f4a18f]">
              Error details
            </p>
            <p className="mt-2 text-sm leading-6 text-[#8f4b3a] dark:text-[#f0b5a8]">
              {lesson.processing_error ?? "We could not finish building this lesson."}
            </p>
            {retryError && <p className="mt-2 text-sm text-[#8f4b3a]">{retryError}</p>}
          </div>
        )}

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => {
                window.location.href = "/dashboard";
              }}
            >
              Back to library
            </Button>
            {failed && (
              <Button onClick={handleRetry} disabled={retrying}>
                {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                {retrying ? "Retrying…" : "Try again"}
              </Button>
            )}
          </div>

          {/* Delete Option */}
          <div className="relative">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-subtle transition hover:text-coral dark:hover:text-[#f4a18f]"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete lesson
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">Delete this lesson?</span>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-full px-2.5 py-1 text-xs font-semibold text-text-muted hover:bg-surface-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="rounded-full bg-coral px-3 py-1 text-xs font-semibold text-white hover:bg-[#d9735d] dark:bg-[#b0533d]"
                >
                  {deleting ? "Deleting…" : "Confirm"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
