"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className={
        compact
          ? "grid h-10 w-10 place-items-center rounded-full border border-border-token bg-surface text-text-muted transition hover:bg-surface-muted hover:text-fg"
          : "inline-flex items-center gap-2 rounded-full border border-border-token bg-surface px-3 py-2 text-sm font-semibold text-text-muted transition hover:bg-surface-muted hover:text-fg"
      }
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {!compact && (dark ? "Light mode" : "Dark mode")}
    </button>
  );
}
