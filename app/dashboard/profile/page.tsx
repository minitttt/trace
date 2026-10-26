import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ProfileView } from "@/components/profile-view";
import { createClient } from "@/lib/supabase/server";
import type { Lesson } from "@/lib/types";

export const metadata = {
  title: "Profile — Trace",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: lessons, count } = await supabase
    .from("lessons")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  const allLessons = (lessons ?? []) as Lesson[];
  const complete = allLessons.filter((l) => l.status === "complete").length;
  const failed = allLessons.filter((l) => l.status === "failed").length;
  const processing = allLessons.filter(
    (l) => l.status === "processing" || l.status === "queued",
  ).length;

  const stats = {
    total: count ?? 0,
    complete,
    failed,
    processing,
    joinedAt: user.created_at,
  };

  return (
    <AppShell userEmail={user.email}>
      <ProfileView
        user={{ email: user.email ?? "", id: user.id }}
        stats={stats}
        recentLessons={allLessons.slice(0, 5)}
      />
    </AppShell>
  );
}
