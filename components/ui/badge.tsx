import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  children,
  tone = "neutral",
}: {
  className?: string;
  children: React.ReactNode;
  tone?: "neutral" | "sage" | "coral";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        tone === "sage" && "bg-mint text-[#5369b2] dark:bg-[#26345e] dark:text-[#c1ccff]",
        tone === "coral" && "bg-[#fae1da] text-[#9d4f3e] dark:bg-[#3b1c16] dark:text-[#f89b88]",
        tone === "neutral" && "bg-fog text-[#667085] dark:bg-[#202734] dark:text-[#a7b4c8]",
        className,
      )}
    >
      {children}
    </span>
  );
}
