"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Library, LogOut, Moon, Plus, Sun, User } from "lucide-react";
import { Brand } from "@/components/brand";
import { useTheme } from "@/components/theme-provider";
import { signOutUser } from "@/lib/auth-helpers";

export function AppShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail?: string;
}) {
  const { theme, toggle } = useTheme();
  const pathname = usePathname();
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const initials = userEmail?.slice(0, 2).toUpperCase() ?? "TR";

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (desktopMenuRef.current && !desktopMenuRef.current.contains(target)) {
        setDesktopMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    await signOutUser();
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[238px] border-r border-[#e5e8ef] bg-[#f7f8fb] px-5 py-6 dark:border-[#252d3a] dark:bg-[#12151c] lg:flex lg:flex-col">
        <Brand />

        <nav className="mt-12 flex-1 space-y-2">
          <p className="px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#98a2b3] dark:text-[#68758c]">
            Workspace
          </p>
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              pathname === "/dashboard"
                ? "bg-mint text-ink dark:bg-[#26345e] dark:text-[#c1ccff]"
                : "text-[#667085] hover:bg-white dark:text-[#a7b4c8] dark:hover:bg-[#202734]"
            }`}
          >
            <Library className="h-4 w-4" /> Library
          </Link>
          <Link
            href="/dashboard/new"
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              pathname === "/dashboard/new"
                ? "bg-mint text-ink dark:bg-[#26345e] dark:text-[#c1ccff]"
                : "text-[#667085] hover:bg-white dark:text-[#a7b4c8] dark:hover:bg-[#202734]"
            }`}
          >
            <Plus className="h-4 w-4" /> New lesson
          </Link>
          <Link
            href="/dashboard/profile"
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              pathname === "/dashboard/profile"
                ? "bg-mint text-ink dark:bg-[#26345e] dark:text-[#c1ccff]"
                : "text-[#667085] hover:bg-white dark:text-[#a7b4c8] dark:hover:bg-[#202734]"
            }`}
          >
            <User className="h-4 w-4" /> Profile
          </Link>
        </nav>

        {/* Footer: dark mode toggle + user chip */}
        <div className="mt-4 space-y-2">
          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggle}
            aria-label="Toggle dark mode"
            className="flex w-full items-center gap-3 rounded-2xl border border-[#e1e6ee] bg-white px-3 py-2.5 text-sm font-semibold text-[#667085] transition hover:bg-fog dark:border-[#303b4d] dark:bg-[#1b202a] dark:text-[#a7b4c8] dark:hover:bg-[#252d3a]"
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-4 w-4" />
                Light mode
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" />
                Dark mode
              </>
            )}
          </button>

          {/* User chip — opens popover menu */}
          <div ref={desktopMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setDesktopMenuOpen((o) => !o)}
              aria-haspopup="true"
              aria-expanded={desktopMenuOpen}
              className="flex w-full items-center gap-3 rounded-2xl border border-[#e1e6ee] bg-white p-3 text-left transition hover:border-[#b8c5ea] hover:bg-fog dark:border-[#303b4d] dark:bg-[#1b202a] dark:hover:border-[#46557a] dark:hover:bg-[#252d3a]"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e7ebff] text-xs font-bold text-[#5369b2] dark:bg-[#2a3762] dark:text-[#b8c6ff]">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold dark:text-[#d9e0ef]">
                  {userEmail ?? "Trace learner"}
                </p>
                <p className="text-[11px] text-[#98a2b3] dark:text-[#68758c]">Personal workspace</p>
              </div>
              <User className="h-4 w-4 shrink-0 text-[#a7b0bf] dark:text-[#68758c]" />
            </button>

            {/* Dropdown */}
            {desktopMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-2xl border border-border-token bg-surface shadow-soft">
                <Link
                  href="/dashboard/profile"
                  onClick={() => setDesktopMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-fg transition hover:bg-surface-muted"
                >
                  <User className="h-4 w-4 text-text-muted" />
                  View profile
                </Link>
                <div className="mx-4 border-t border-border-muted" />
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-coral transition hover:bg-[#fff5f3] disabled:opacity-50 dark:text-[#f4a18f] dark:hover:bg-[#281512]"
                >
                  <LogOut className="h-4 w-4" />
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="min-h-screen lg:pl-[238px]">
        {/* Mobile header */}
        <header className="flex items-center justify-between border-b border-[#e5e8ef] bg-[#f8f9fb]/90 px-5 py-4 backdrop-blur dark:border-[#252d3a] dark:bg-[#0f1117]/90 lg:hidden">
          <Brand compact />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              aria-label="Toggle dark mode"
              className="rounded-full p-2 text-[#667085] transition hover:bg-fog dark:text-[#a7b4c8] dark:hover:bg-[#202734]"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Mobile user menu */}
            <div className="relative" ref={mobileMenuRef}>
              <button
                type="button"
                onClick={() => setMobileMenuOpen((o) => !o)}
                className="grid h-9 w-9 place-items-center rounded-full bg-[#e7ebff] text-xs font-bold text-[#5369b2] dark:bg-[#2a3762] dark:text-[#b8c6ff]"
                aria-label="Open user menu"
              >
                {initials}
              </button>
              {mobileMenuOpen && (
                <div className="absolute right-0 top-full z-30 mt-2 w-52 overflow-hidden rounded-2xl border border-border-token bg-surface shadow-soft">
                  <div className="border-b border-border-muted px-4 py-3">
                    <p className="truncate text-xs font-semibold">{userEmail}</p>
                  </div>
                  <Link
                    href="/dashboard/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-fg hover:bg-surface-muted"
                  >
                    <User className="h-4 w-4 text-text-muted" />
                    View profile
                  </Link>
                  <div className="mx-4 border-t border-border-muted" />
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-coral hover:bg-[#fff5f3] disabled:opacity-50 dark:text-[#f4a18f] dark:hover:bg-[#281512]"
                  >
                    <LogOut className="h-4 w-4" />
                    {signingOut ? "Signing out…" : "Sign out"}
                  </button>
                </div>
              )}
            </div>

            <Link
              href="/dashboard/new"
              className="rounded-full bg-ink p-2.5 text-white dark:bg-[#2d3d72]"
            >
              <Plus className="h-4 w-4" />
            </Link>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
