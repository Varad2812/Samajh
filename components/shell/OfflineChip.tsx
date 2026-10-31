"use client";

import { WifiOff } from "lucide-react";
import { useStore } from "@/lib/store";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Shown only after an AI route has fallen back to the built-in analyzer. */
export function OfflineChip() {
  const offline = useStore((s) => s.settings.offline);
  if (!offline) return null;
  return (
    <Tooltip>
      <TooltipTrigger className="flex h-6 items-center gap-1.5 rounded-full border border-developing/30 bg-developing/10 px-2.5 text-xs font-medium text-developing focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
        <WifiOff className="size-3" aria-hidden />
        offline
      </TooltipTrigger>
      <TooltipContent side="bottom">Offline mode: using the built-in analyzer</TooltipContent>
    </Tooltip>
  );
}
