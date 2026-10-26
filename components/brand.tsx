import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className="group inline-flex items-center gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-sm font-black tracking-[-0.08em] text-white shadow-sm">
        TR
      </span>
      <span className={compact ? "sr-only" : "text-lg font-bold tracking-[-0.04em]"}>Trace</span>
    </Link>
  );
}
