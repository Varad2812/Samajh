"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  realCount: number;
  at: number | null;
  error: string | null;
  withDemo: boolean;
  onWithDemo: (v: boolean) => void;
}

/** "Live" status for the teacher's real class, plus the demo-classmates toggle. */
export function LiveClassBar({ realCount, at, error, withDemo, onWithDemo }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const ago = at === null ? null : Math.max(0, Math.round((now - at) / 1000));

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span
        className={cn(
          "flex h-7 items-center gap-2 rounded-full border px-3",
          error ? "border-developing/40 bg-developing/10 text-developing" : "border-proficient/40 bg-proficient/10 text-proficient",
        )}
        role="status"
      >
        <span className="relative flex size-2">
          {!error && <span className="absolute inline-flex size-full animate-ping rounded-full bg-proficient opacity-60" />}
          <span className={cn("relative inline-flex size-2 rounded-full", error ? "bg-developing" : "bg-proficient")} />
        </span>
        {error ? `Reconnecting… (${error})` : at === null ? "Connecting to your class…" : `Live · ${realCount} student${realCount === 1 ? "" : "s"} · updated ${ago}s ago`}
      </span>
      <button
        type="button"
        aria-pressed={withDemo}
        onClick={() => onWithDemo(!withDemo)}
        className={cn(
          "flex h-7 items-center gap-1.5 rounded-full border px-3 transition-colors hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
          withDemo ? "border-accent/50 bg-accent/10 text-foreground" : "border-border text-muted-foreground",
        )}
      >
        <Users className="size-3.5" aria-hidden /> {withDemo ? "Showing" : "Show"} 30 demo classmates
      </button>
    </div>
  );
}
