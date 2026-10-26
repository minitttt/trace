import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Library } from "@/components/library";
import { createClient } from "@/lib/supabase/server";
import type { Lesson } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  const { data } = await supabase
    .from("lessons")
    .select("*")
    .order("created_at", { ascending: false });
  return (
    <AppShell userEmail={user.email}>
      <Library lessons={(data ?? []) as Lesson[]} />
    </AppShell>
  );
}
