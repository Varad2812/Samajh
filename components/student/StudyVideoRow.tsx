"use client";

import { Check, ExternalLink, Search } from "lucide-react";
import type { StudyVideo } from "@/lib/ai/studyPlan";
import { cn, masteryColor } from "@/lib/utils";

interface Props {
  index: number;
  video: StudyVideo;
  /** Mastery of the mapped concept (chip colour). */
  p: number;
  onToggle: () => void;
  onFocus: () => void;
}

/** One ordered video: thumbnail (verified) or search tile, mapped concept chip, minutes, watched toggle. */
export function StudyVideoRow({ index, video: v, p, onToggle, onFocus }: Props) {
  return (
    <li className={cn("grid grid-cols-[22px_88px_minmax(0,1fr)] gap-2.5 rounded-lg border border-border p-2 transition-colors hover:border-accent/30", v.done && "opacity-60")}>
      <button
        onClick={onToggle}
        aria-pressed={v.done}
        aria-label={v.done ? `Mark video ${index} as not watched` : `Mark video ${index} as watched`}
        className={cn(
          "mt-0.5 flex size-5 items-center justify-center rounded-full border font-mono text-[10px] tabular transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
          v.done ? "border-proficient bg-proficient text-bg" : "border-border text-muted-foreground hover:border-accent/50",
        )}
      >
        {v.done ? <Check className="size-3" aria-hidden /> : index}
      </button>
      <a
        href={v.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-video overflow-hidden rounded-md bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        aria-label={`Open ${v.title} on YouTube`}
      >
        {v.videoId ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote YouTube thumbnail, no optimisation needed
          <img src={`https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`} alt="" className="size-full object-cover" loading="lazy" />
        ) : (
          <span className="flex size-full items-center justify-center text-muted-foreground">
            <Search className="size-4" aria-hidden />
          </span>
        )}
        <span className="absolute right-1 bottom-1 rounded bg-bg/85 px-1 font-mono text-[10px] tabular">{v.minutes}m</span>
      </a>
      <div className="min-w-0">
        <a
          href={v.url}
          target="_blank"
          rel="noopener noreferrer"
          className="line-clamp-2 text-xs leading-snug font-medium hover:text-accent focus-visible:underline focus-visible:outline-none"
        >
          {v.title}
          <ExternalLink className="ml-1 inline size-3 align-[-1px] text-muted-foreground" aria-hidden />
        </a>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
          <button
            onClick={onFocus}
            className="shrink-0 rounded border px-1 font-mono transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            style={{ borderColor: masteryColor(p), color: masteryColor(p) }}
            aria-label={`Show ${v.conceptId} in the galaxy`}
          >
            {v.conceptId}
          </button>
          <span className="truncate">{v.channel}</span>
        </div>
        {v.why && <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground/80">{v.why}</p>}
      </div>
    </li>
  );
}
