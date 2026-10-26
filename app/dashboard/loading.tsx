import { AppShell } from "@/components/app-shell";

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-3xl border border-border-token bg-surface p-5">
      <div className="flex items-start justify-between">
        <div className="h-11 w-11 rounded-2xl bg-surface-muted" />
        <div className="h-5 w-16 rounded-full bg-surface-muted" />
      </div>
      <div className="mt-5 h-5 w-3/4 rounded-lg bg-surface-muted" />
      <div className="mt-2 h-4 w-1/2 rounded-lg bg-surface-muted" />
      <div className="mt-6 flex items-center justify-between border-t border-border-muted pt-4">
        <div className="h-3 w-20 rounded bg-surface-muted" />
        <div className="h-3 w-20 rounded bg-surface-muted" />
      </div>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-4 rounded-3xl border border-border-token bg-surface p-5">
      <div className="h-10 w-10 rounded-xl bg-surface-muted" />
      <div className="space-y-2">
        <div className="h-6 w-8 rounded bg-surface-muted" />
        <div className="h-3 w-20 rounded bg-surface-muted" />
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
        {/* Header skeleton */}
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-36 rounded-lg bg-surface-muted" />
            <div className="h-9 w-56 rounded-lg bg-surface-muted" />
            <div className="h-4 w-80 rounded-lg bg-surface-muted" />
          </div>
          <div className="h-11 w-32 animate-pulse rounded-full bg-surface-muted" />
        </div>

        {/* Stats skeleton */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
        </div>

        {/* Cards skeleton — 2-column grid of 6 ghost cards */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
