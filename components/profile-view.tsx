"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock3,
  FileText,
  LogOut,
  Mail,
  Play,
  User,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { signOutUser } from "@/lib/auth-helpers";
import type { Lesson } from "@/lib/types";

interface ProfileStats {
  total: number;
  complete: number;
  failed: number;
  processing: number;
  joinedAt: string;
}

interface ProfileViewProps {
  user: { email: string; id: string };
  stats: ProfileStats;
  recentLessons: Lesson[];
}

export function ProfileView({ user, stats, recentLessons }: ProfileViewProps) {
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const initials = user.email.slice(0, 2).toUpperCase();

  async function handleSignOut() {
    setSigningOut(true);
    setSignOutError(null);
    try {
      await signOutUser();
    } catch {
      setSignOutError("Could not sign out. Please try again.");
      setSigningOut(false);
    }
  }

  const completionRate = stats.total > 0 ? Math.round((stats.complete / stats.total) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm font-semibold text-[#7a89ad] dark:text-[#9aaaff]">Account</p>
        <h1 className="mt-2 text-4xl font-bold tracking-[-0.07em]">Your profile</h1>
      </div>

      {/* Identity card */}
      <Card className="overflow-hidden">
        <div className="flex flex-col items-start gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
          {/* Avatar */}
          <div className="relative">
            <div className="grid h-20 w-20 place-items-center rounded-3xl bg-mint text-2xl font-black text-[#5369b2] dark:bg-[#2a3762] dark:text-[#b8c6ff]">
              {initials}
            </div>
            <div className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border-2 border-surface bg-[#8da4ff] dark:bg-[#7088f1]">
              <User className="h-3 w-3 text-white" />
            </div>
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-bold tracking-[-0.04em]">{user.email}</h2>
              <Badge tone="sage">Active</Badge>
            </div>
            <div className="mt-2 flex flex-col gap-1 text-sm text-text-muted sm:flex-row sm:items-center sm:gap-4">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> {user.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Joined {formatDate(stats.joinedAt)}
              </span>
            </div>
          </div>

          {/* Sign out */}
          <div className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              disabled={signingOut}
              onClick={handleSignOut}
              className="w-full gap-2 sm:w-auto"
            >
              <LogOut className="h-4 w-4" />
              {signingOut ? "Signing out…" : "Sign out"}
            </Button>
            {signOutError && (
              <p className="mt-2 text-xs text-coral dark:text-[#f4a18f]">{signOutError}</p>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border-muted" />

        {/* Auth info row */}
        <div className="flex flex-wrap items-center gap-4 px-6 py-4 text-xs text-text-subtle sm:px-8">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#8da4ff] dark:bg-[#7088f1]" />
            Magic link (passwordless)
          </span>
          <span>User ID: {user.id.slice(0, 8)}…</span>
        </div>
      </Card>

      {/* Learning stats */}
      <h2 className="mb-4 mt-10 text-lg font-bold tracking-[-0.03em]">Learning stats</h2>
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard
          icon={<BookOpen className="h-5 w-5" />}
          label="Total notebooks"
          value={stats.total}
          color="sage"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Completed"
          value={stats.complete}
          color="green"
        />
        <StatCard
          icon={<Clock3 className="h-5 w-5" />}
          label="In progress"
          value={stats.processing}
          color="neutral"
        />
        <StatCard
          icon={<XCircle className="h-5 w-5" />}
          label="Failed"
          value={stats.failed}
          color="coral"
        />
      </div>

      {/* Completion rate bar */}
      {stats.total > 0 && (
        <Card className="mt-4 p-5">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>Completion rate</span>
            <span className="text-[#5d73c8] dark:text-[#9db0ff]">{completionRate}%</span>
          </div>
          <div className="mt-3 h-2.5 rounded-full bg-surface-muted">
            <div
              className="h-2.5 rounded-full bg-[#8da4ff] transition-all duration-700 dark:bg-[#7088f1]"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-text-subtle">
            {stats.complete} of {stats.total} notebooks ready to learn
          </p>
        </Card>
      )}

      {/* Recent notebooks */}
      {recentLessons.length > 0 && (
        <>
          <div className="mt-10 flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-[-0.03em]">Recent notebooks</h2>
            <Link
              href="/dashboard"
              className="flex items-center gap-1 text-sm font-semibold text-text-muted transition hover:text-fg"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {recentLessons.map((lesson) => (
              <Link key={lesson.id} href={`/dashboard/lessons/${lesson.id}`}>
                <Card className="group flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-lg dark:hover:border-[#38533e]">
                  <div
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                      lesson.source_type === "pdf"
                        ? "bg-[#fff0dc] text-[#b77a3c] dark:bg-[#342416] dark:text-[#f4b676]"
                        : "bg-[#e8edff] text-[#5369b2] dark:bg-[#202d52] dark:text-[#b8c6ff]"
                    }`}
                  >
                    {lesson.source_type === "pdf" ? (
                      <FileText className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{lesson.title}</p>
                    <p className="text-xs text-text-muted">{formatDate(lesson.created_at)}</p>
                  </div>
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
                        ? "Failed"
                        : "Processing"}
                  </Badge>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Danger zone */}
      <div className="mt-12">
        <h2 className="mb-4 text-lg font-bold tracking-[-0.03em]">Session</h2>
        <Card className="border-coral/20 p-5 dark:border-coral/10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold">Sign out of Trace</p>
              <p className="mt-1 text-xs leading-5 text-text-muted">
                You will be redirected to the sign-in page. All your notebooks are saved.
              </p>
            </div>
            <Button
              variant="coral"
              size="sm"
              disabled={signingOut}
              onClick={handleSignOut}
              className="shrink-0"
            >
              <LogOut className="h-4 w-4" />
              {signingOut ? "Signing out…" : "Sign out now"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "sage" | "green" | "neutral" | "coral";
}) {
  const colorMap = {
    sage: "bg-mint text-[#5369b2] dark:bg-[#26345e] dark:text-[#c1ccff]",
    green: "bg-[#e2e8ff] text-[#5369b2] dark:bg-[#202d52] dark:text-[#b8c6ff]",
    neutral: "bg-surface-muted text-text-muted",
    coral: "bg-[#fae1da] text-[#9d4f3e] dark:bg-[#3b1c16] dark:text-[#f89b88]",
  };

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${colorMap[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold tracking-[-0.05em]">{value}</p>
        <p className="mt-0.5 text-xs font-semibold text-text-subtle">{label}</p>
      </div>
    </Card>
  );
}
