"use client";

import { Search, X } from "lucide-react";
import { CHAPTERS } from "@/lib/data/concepts";
import { CHAPTER_COLOR } from "@/lib/galaxy/layout";
import { masteryColor, TOKENS } from "@/lib/utils";

interface Props {
  query: string;
  matches: number;
  onQuery: (q: string) => void;
  onSubmit: () => void;
}

const MASTERY_LEGEND: [string, string][] = [
  ["weak", masteryColor(0.1)],
  ["developing", masteryColor(0.45)],
  ["proficient", masteryColor(0.72)],
  ["mastered", masteryColor(0.95)],
  ["estimated", TOKENS.unknown],
];

/** Overlay on top of the galaxy: chapter legend · mastery legend · search. */
export function GalaxyToolbar({ query, matches, onQuery, onSubmit }: Props) {
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
