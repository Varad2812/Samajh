"use client";

import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";

/** Inline KaTeX. Invalid LaTeX renders as red source text instead of throwing. */
export function Tex({ latex, className, display = false }: { latex: string; className?: string; display?: boolean }) {
  const html = useMemo(
    () => katex.renderToString(latex || "\\;", { throwOnError: false, displayMode: display, errorColor: "#FF4D6D", strict: "ignore" }),
    [latex, display],
  );
  return <span className={cn("text-foreground", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
