"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Box } from "lucide-react";
import { hasLab } from "@/lib/lab/physics";
import { cn } from "@/lib/utils";

// three.js only loads when a lab is first opened.
const LabDialog = dynamic(() => import("./LabDialog"), { ssr: false });

/** "See it in 3D" button for misconception cards that have a Misconception Lab sim. Renders nothing otherwise. */
export function SeeIn3D({ mcId, className, compact = false }: { mcId: string | null | undefined; className?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  if (!mcId || !hasLab(mcId)) return null;
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setMounted(true);
          setOpen(true);
        }}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-misconception/40 bg-misconception/10 font-medium text-misconception transition-colors hover:bg-misconception/20 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
          compact ? "h-6 px-2 text-[11px]" : "h-8 px-3 text-xs",
          className,
        )}
      >
        <Box className={compact ? "size-3" : "size-3.5"} aria-hidden /> See it in 3D
      </button>
      {mounted && <LabDialog mcId={mcId} open={open} onClose={() => setOpen(false)} />}
    </>
  );
}
