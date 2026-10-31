"use client";

import { CalendarDays, FastForward } from "lucide-react";
import { formatVirtualDate } from "@/lib/clock";
import { useStore, useVirtualNow } from "@/lib/store";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function VirtualClock() {
  const at = useVirtualNow();
  const offsetDays = useStore((s) => s.settings.offsetDays);
  const fastForward = useStore((s) => s.fastForward);

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex h-8 items-center gap-2 rounded-lg border border-border bg-surface-2 px-2.5 font-mono text-xs tabular"
        aria-label="Virtual date"
      >
        <CalendarDays className="size-3.5 text-muted-foreground" aria-hidden />
        {at === null ? (
          <span className="inline-block h-3 w-24 animate-pulse rounded bg-white/5" />
        ) : (
          <>
            <span className="text-foreground">{formatVirtualDate(at)}</span>
            <span className="hidden text-muted-foreground sm:inline">·</span>
            <span className={offsetDays > 0 ? "hidden text-developing sm:inline" : "hidden text-muted-foreground sm:inline"}>
              Day +{offsetDays}
            </span>
          </>
        )}
      </div>
      <Tooltip>
        <TooltipTrigger
          onClick={() => fastForward(3)}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-2.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none active:translate-y-px"
        >
          <FastForward className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">+3 days</span>
        </TooltipTrigger>
        <TooltipContent side="bottom">Fast-forward the virtual clock 3 days (reviews come due)</TooltipContent>
      </Tooltip>
    </div>
  );
}
