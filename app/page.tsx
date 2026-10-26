import Link from "next/link";
import { ArrowRight, FileText, Play, Sparkles } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-bg text-fg">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Brand />
        <div className="flex items-center gap-3">
          <ThemeToggle compact />
          <Link href="/sign-in" className="hidden px-4 py-2 text-sm font-semibold text-text-muted hover:text-fg sm:inline">
            Sign in
          </Link>
          <Link href="/dashboard/new" className={cn(buttonVariants({ size: "md" }))}>
            Start learning <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </nav>
      <section className="relative mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pb-28 lg:pt-24">
        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#dbe2ff] bg-[#f1f4ff] px-3 py-1.5 text-xs font-semibold text-[#5369b2] dark:border-[#303c68] dark:bg-[#1b2442] dark:text-[#b8c6ff]">
            <Sparkles className="h-3.5 w-3.5" /> Your learning layer for the internet
          </div>
          <h1 className="max-w-2xl text-5xl font-semibold leading-[1.02] tracking-[-0.07em] sm:text-7xl">
            Turn what you watch into what you{" "}
            <span className="text-[#5d73c8] dark:text-[#9db0ff]">remember.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-text-muted">
            Trace turns videos and PDFs into a focused lesson, a practical study plan, and a tutor
            that actually knows what you just learned.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/dashboard/new" className={cn(buttonVariants({ size: "lg" }))}>
              Create a lesson <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#how-it-works"
              className="h-13 inline-flex items-center gap-2 rounded-full border border-border-token bg-surface px-6 text-sm font-semibold text-fg hover:bg-surface-muted"
            >
              See how it works
            </Link>
          </div>
          <div className="mt-12 flex items-center gap-8 text-sm text-text-subtle">
            <span className="flex items-center gap-2">
              <Play className="h-4 w-4 text-[#7890e0] dark:text-[#91a6ff]" /> Video to lesson
            </span>
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#7890e0] dark:text-[#91a6ff]" /> PDF to lesson
            </span>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-[#dfe5ff] opacity-70 blur-3xl dark:bg-[#1e2b55] dark:opacity-40" />
          <div className="relative rounded-[36px] border border-[#dfe5ff] bg-[#eef1ff] p-4 shadow-soft dark:border-[#303d68] dark:bg-[#18213a] sm:p-7">
            <div className="rounded-[28px] border border-border-token bg-surface p-5 sm:p-7">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-subtle">
                    Now learning
                  </p>
                  <h2 className="mt-2 text-xl font-bold tracking-[-0.04em]">
                    The craft of clear thinking
                  </h2>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-mint text-[#5369b2] dark:bg-[#26345e] dark:text-[#b8c6ff]">
                  <Sparkles className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-7 rounded-2xl bg-surface-muted p-4">
                <div className="mb-3 flex justify-between text-xs font-semibold text-text-subtle">
                  <span>Lesson progress</span>
                  <span>68%</span>
                </div>
                <div className="h-2 rounded-full bg-border-muted">
                  <div className="h-2 w-[68%] rounded-full bg-[#8da4ff] dark:bg-[#7088f1]" />
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border-muted p-4">
                  <p className="text-xs font-bold text-text-subtle">Key concept</p>
                  <p className="mt-2 text-sm font-semibold">Make the hidden assumption visible.</p>
                </div>
                <div className="rounded-2xl border border-border-muted p-4">
                  <p className="text-xs font-bold text-text-subtle">Tutor prompt</p>
                  <p className="mt-2 text-sm font-semibold">
                    Ask me to connect this to your project.
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-ink p-4 text-white dark:border dark:border-[#35446f] dark:bg-[#202d52]">
                <p className="text-xs font-semibold text-[#c1ccff]">Trace takeaway</p>
                <p className="mt-2 text-sm leading-6 text-[#edf0ff] dark:text-[#e2e7ff]">
                  Good notes do not just capture information. They create a next action.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section id="how-it-works" className="bg-surface/40 border-t border-border-muted">
        <div className="mx-auto grid max-w-6xl gap-5 px-6 py-16 sm:grid-cols-3">
          <div>
            <span className="text-sm font-bold text-[#7187d4] dark:text-[#9cadff]">01</span>
            <h3 className="mt-3 text-xl font-bold tracking-[-0.04em]">Bring your source</h3>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              Upload a video or PDF, or paste a public video URL.
            </p>
          </div>
          <div>
            <span className="text-sm font-bold text-[#7187d4] dark:text-[#9cadff]">02</span>
            <h3 className="mt-3 text-xl font-bold tracking-[-0.04em]">Set your intent</h3>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              Tell Trace your goal, level, audience, and language.
            </p>
          </div>
          <div>
            <span className="text-sm font-bold text-[#7187d4] dark:text-[#9cadff]">03</span>
            <h3 className="mt-3 text-xl font-bold tracking-[-0.04em]">Learn in context</h3>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              Get structured material, checkpoints, and a grounded tutor.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
