"use client";

import { Search, X } from "lucide-react";
import { CHAPTERS } from "@/lib/data/concepts";
import { CHAPTER_COLOR } from "@/lib/galaxy/layout";
import { LENSES, type Lens } from "@/lib/galaxy/lenses";
import { cn, masteryColor, TOKENS } from "@/lib/utils";

interface Props {
  query: string;
  matches: number;
  onQuery: (q: string) => void;
  onSubmit: () => void;
  lens: Lens;
  /** Lit-star count per lens (null = all). */
  lensCounts: Record<Lens, number | null>;
  onLens: (lens: Lens) => void;
}

const MASTERY_LEGEND: [string, string][] = [
  ["weak", masteryColor(0.1)],
  ["developing", masteryColor(0.45)],
  ["proficient", masteryColor(0.72)],
  ["mastered", masteryColor(0.95)],
  ["estimated", TOKENS.unknown],
];

/** Overlay on top of the galaxy: chapter legend · mastery legend · search. */
export function GalaxyToolbar({ query, matches, onQuery, onSubmit, lens, lensCounts, onLens }: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-start gap-x-4 gap-y-2 bg-gradient-to-b from-bg/90 to-transparent p-3 pb-8">
      <div className="pointer-events-auto">
        <h2 className="label-caps">Knowledge galaxy</h2>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {CHAPTERS.map((ch) => (
            <span key={ch.id} className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full" style={{ background: CHAPTER_COLOR[ch.id] }} />
              {ch.short}
            </span>
          ))}
          <span className="hidden text-border sm:inline">|</span>
          {MASTERY_LEGEND.map(([label, color]) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
              {label}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full border border-accent" /> review due
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-misconception" /> misconception
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1" role="toolbar" aria-label="Galaxy lens">
          {LENSES.map((l) => (
            <button
              key={l.id}
              onClick={() => onLens(l.id)}
              aria-pressed={lens === l.id}
              className={cn(
                "flex h-6 items-center gap-1 rounded-full border px-2 text-[11px] backdrop-blur transition-colors hover:border-accent/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
                lens === l.id ? "border-accent/60 bg-accent/15 text-foreground" : "border-border bg-surface-2/80 text-muted-foreground",
              )}
            >
              {l.label}
              {lensCounts[l.id] !== null && <span className="font-mono tabular opacity-70">{lensCounts[l.id]}</span>}
            </button>
          ))}
        </div>
      </div>
      <form
        className="pointer-events-auto ml-auto flex h-8 w-full items-center gap-2 rounded-lg border border-border bg-surface-2/90 px-2.5 backdrop-blur focus-within:border-accent/50 sm:w-56"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        role="search"
      >
        <Search className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && onQuery("")}
          placeholder="Find a concept (e.g. C6, lens)"
          aria-label="Search concepts"
          className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <>
            <span className="font-mono text-[11px] text-muted-foreground tabular">{matches}</span>
            <button type="button" onClick={() => onQuery("")} aria-label="Clear search" className="text-muted-foreground hover:text-foreground">
              <X className="size-3.5" />
            </button>
          </>
        )}
      </form>
    </div>
  );
}
