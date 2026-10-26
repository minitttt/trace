"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState(false);
  const [loading, setLoading] = useState<"email" | "google" | null>(null);

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error");
    if (error === "oauth") {
      setMessage("Google sign-in could not be completed. Try again or use a magic link.");
      setMessageError(true);
    } else if (error === "link") {
      setMessage("That sign-in link is invalid or expired. Request a new one.");
      setMessageError(true);
    }
  }, []);

  function callbackUrl() {
    return `${window.location.origin}/auth/callback`;
  }

  async function signIn() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setMessage("Enter a valid email address.");
      setMessageError(true);
      return;
    }
    setLoading("email");
    setMessage("");
    setMessageError(false);
    const { error } = await createClient().auth.signInWithOtp({
      email: normalizedEmail,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(null);
    setMessageError(Boolean(error));
    setMessage(error ? error.message : "Check your inbox for your secure sign-in link.");
  }

  async function signInWithGoogle() {
    setLoading("google");
    setMessage("");
    setMessageError(false);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    if (error) {
      setLoading(null);
      setMessageError(true);
      setMessage("Google sign-in is not available yet. Check the provider setup.");
    }
  }

  return (
    <main className="grid min-h-screen bg-bg text-fg lg:grid-cols-[.9fr_1.1fr]">
      <section className="hidden bg-ink p-10 text-white dark:border-r dark:border-[#2b3550] dark:bg-[#121722] lg:flex lg:flex-col lg:justify-between">
        <Brand />
        <div>
          <p className="max-w-lg text-5xl font-semibold leading-[1.03] tracking-[-0.07em]">
            Make every source of knowledge easier to return to.
          </p>
          <p className="mt-6 max-w-md text-base leading-7 text-[#c1c9dc] dark:text-[#aeb9cf]">
            Your private library for learning from the things you already watch and read.
          </p>
        </div>
        <p className="text-sm text-[#9aa6bd] dark:text-[#7886a0]">Built for focused learners.</p>
      </section>
      <section className="flex items-center justify-center bg-bg px-6 py-10">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center justify-between lg:hidden">
            <Brand />
            <ThemeToggle compact />
          </div>
          <Card className="p-7 sm:p-10">
            <div className="mb-8">
              <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-mint text-[#5369b2] dark:bg-[#2a3762] dark:text-[#b8c6ff]">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-bold tracking-[-0.06em]">Welcome to Trace</h1>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                Sign in with Google or use a magic link.
              </p>
            </div>
            <Button
              variant="outline"
              className="h-[52px] w-full justify-center border-[#dadce0] bg-white text-[15px] font-medium tracking-[-0.01em] text-[#3c4043] shadow-[0_1px_2px_rgba(60,64,67,0.08)] hover:border-[#c6c9cc] hover:bg-[#f8faff] hover:text-[#3c4043] dark:border-[#5f6368] dark:bg-[#202124] dark:text-[#e8eaed] dark:shadow-none dark:hover:border-[#8ab4f8] dark:hover:bg-[#2b2d30] dark:hover:text-[#e8eaed]"
              size="lg"
              disabled={loading !== null}
              onClick={signInWithGoogle}
            >
              <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M21.35 12.27c0-.72-.06-1.42-.18-2.09H12v3.95h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.25Z"
                />
                <path
                  fill="#34A853"
                  d="M12 21.7c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.55 0-4.71-1.72-5.49-4.04H3.27v2.53A9.74 9.74 0 0 0 12 21.7Z"
                />
                <path
                  fill="#FBBC05"
                  d="M6.51 13.77a5.84 5.84 0 0 1 0-3.54V7.7H3.27a9.77 9.77 0 0 0 0 8.6l3.24-2.53Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 6.19c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.83 3.29 14.62 2.3 12 2.3a9.74 9.74 0 0 0-8.73 5.4l3.24 2.53C7.29 7.91 9.45 6.19 12 6.19Z"
                />
              </svg>
              {loading === "google" ? "Connecting…" : "Continue with Google"}
            </Button>
            <div className="my-5 flex items-center gap-3 text-xs text-text-subtle">
              <span className="h-px flex-1 bg-border-muted" />
              <span>or</span>
              <span className="h-px flex-1 bg-border-muted" />
            </div>
            <label className="text-sm font-semibold">
              Email address
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                placeholder="you@example.com"
                className="mt-2 h-12 w-full rounded-xl border border-border-token bg-surface px-4 text-sm text-fg outline-none transition focus:border-[#8da4ff] focus:ring-2 focus:ring-[#dfe5ff] dark:focus:ring-[#2b3760]"
              />
            </label>
            <Button className="mt-5 w-full" size="lg" disabled={!email || loading !== null} onClick={signIn}>
              {loading === "email" ? "Sending link…" : "Send magic link"}
              <ArrowRight className="h-4 w-4" />
            </Button>
            {message && (
              <p
                className={`mt-4 rounded-xl p-3 text-sm leading-5 ${
                  messageError
                    ? "bg-[#fff0ec] text-[#a85541] dark:bg-[#341b17] dark:text-[#f4a18f]"
                    : "bg-[#f1f4ff] text-[#5369b2] dark:bg-[#26345e] dark:text-[#c1ccff]"
                }`}
              >
                {message}
              </p>
            )}
            <div className="mt-7 flex items-center gap-2 text-xs text-text-subtle">
              <Mail className="h-3.5 w-3.5" /> We will only use your email for authentication.
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
