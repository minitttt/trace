import { AppShell } from "@/components/app-shell";

export default function LessonLoading() {
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
        <div className="animate-pulse">
          {/* Back link skeleton */}
          <div className="h-4 w-28 rounded bg-surface-muted" />

          {/* Title block skeleton */}
          <div className="mt-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="h-5 w-20 rounded-full bg-surface-muted" />
                <div className="h-5 w-28 rounded-full bg-surface-muted" />
              </div>
              <div className="h-9 w-96 rounded-lg bg-surface-muted" />
              <div className="h-4 w-80 rounded-lg bg-surface-muted" />
              <div className="h-4 w-64 rounded-lg bg-surface-muted" />
            </div>
            <div className="h-10 w-36 rounded-2xl bg-surface-muted" />
          </div>

          {/* Two-column workspace skeleton */}
          <div className="mt-9 grid gap-6 lg:grid-cols-[1fr_350px]">
            {/* Main content */}
            <div>
              {/* Tab bar */}
              <div className="flex gap-1 border-b border-border-muted pb-0">
                {["Overview", "Chapters", "Practice"].map((tab) => (
                  <div key={tab} className="h-11 w-24 rounded-t-xl bg-surface-muted" />
                ))}
              </div>

              {/* Content cards */}
              <div className="mt-6 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-border-token bg-surface p-5">
                    <div className="h-4 w-32 rounded bg-surface-muted" />
                    <div className="mt-3 space-y-2">
                      <div className="h-3 w-full rounded bg-surface-muted" />
                      <div className="h-3 w-5/6 rounded bg-surface-muted" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tutor sidebar skeleton */}
            <div className="rounded-3xl border border-border-token bg-surface">
              {/* Tutor header */}
              <div className="border-b border-border-muted p-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-mint dark:bg-[#2a3762]" />
                  <div className="space-y-2">
                    <div className="h-4 w-24 rounded bg-surface-muted" />
                    <div className="h-3 w-32 rounded bg-surface-muted" />
                  </div>
                </div>
              </div>
              {/* Prompt suggestions skeleton */}
              <div className="p-5">
                <div className="space-y-3 rounded-2xl bg-surface-muted p-4">
                  <div className="h-4 w-20 rounded bg-surface" />
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-3 w-5/6 rounded bg-surface" />
                  ))}
                </div>
              </div>
              {/* Input skeleton */}
              <div className="mt-auto border-t border-border-muted p-4">
                <div className="h-16 rounded-2xl bg-surface-muted" />
                <div className="mx-auto mt-2 h-3 w-40 rounded bg-surface-muted" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
