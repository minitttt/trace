import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { NewLessonForm } from "@/components/new-lesson-form";
import { createClient } from "@/lib/supabase/server";

export default async function NewLessonPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  return (
    <AppShell userEmail={user.email}>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
        <div className="mb-8">
          <p className="text-sm font-semibold text-[#7a89ad] dark:text-[#9aaaff]">New lesson</p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.07em]">Start with a source.</h1>
        </div>
        <NewLessonForm userId={user.id} />
      </div>
    </AppShell>
  );
}
