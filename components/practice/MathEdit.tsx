"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Keyboard, X } from "lucide-react";
import type { MathfieldElement } from "mathlive";
import { Tex } from "@/components/shared/Tex";
import { evaluateReading, latexToMathjs } from "@/lib/engine/mathEval";

interface Props {
  latex: string;
  onSave: (latex: string) => void;
  onCancel: () => void;
}

/** Inline MathLive `<math-field>` (with the virtual math keyboard) and a live KaTeX + math.js preview. */
export function MathEdit({ latex, onSave, onCancel }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const field = useRef<MathfieldElement | null>(null);
  const [value, setValue] = useState(latex);

  useEffect(() => {
    let cancelled = false;
    void import("mathlive").then(({ MathfieldElement }) => {
      if (cancelled || !host.current) return;
      MathfieldElement.fontsDirectory = "/mathlive/fonts";
      MathfieldElement.soundsDirectory = null;
      const mf = new MathfieldElement();
      mf.value = latex;
      mf.smartFence = true;
      mf.style.cssText =
        "display:block;width:100%;min-height:40px;padding:6px 8px;border-radius:8px;background:var(--surface-2);color:var(--text);border:1px solid var(--border);font-size:18px;--caret-color:var(--accent);--selection-background-color:rgba(79,209,255,.25);--contains-highlight-background-color:transparent";
      mf.addEventListener("input", () => setValue(mf.value));
      mf.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onSave(mf.value);
        } else if (e.key === "Escape") onCancel();
      });
      host.current.appendChild(mf);
      field.current = mf;
      requestAnimationFrame(() => mf.focus());
    });
    return () => {
      cancelled = true;
      window.mathVirtualKeyboard?.hide();
      field.current?.remove();
      field.current = null;
    };
    // Created once per edit session; later prop changes are irrelevant while editing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mathjs = latexToMathjs(value);
  const v = evaluateReading(mathjs);

  return (
    <div className="flex w-full flex-col gap-2 rounded-lg border border-accent/30 bg-surface p-2.5">
      <div ref={host} aria-label="Edit equation" />
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Preview</span>
        <Tex latex={value} />
        {v !== null && <span className="font-mono text-accent tabular">= {Number(v.toPrecision(4))}</span>}
        <span className="ml-auto flex gap-1.5">
          <button
            type="button"
            onClick={() => (window.mathVirtualKeyboard?.visible ? window.mathVirtualKeyboard.hide() : window.mathVirtualKeyboard?.show())}
            className="flex h-7 items-center gap-1 rounded-md border border-border bg-surface-2 px-2 hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            <Keyboard className="size-3.5" aria-hidden /> Keyboard
          </button>
          <button type="button" onClick={onCancel} aria-label="Cancel edit" className="flex size-7 items-center justify-center rounded-md border border-border bg-surface-2 hover:border-weak/40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
            <X className="size-3.5" aria-hidden />
          </button>
          <button type="button" onClick={() => onSave(value)} aria-label="Save edit" className="flex size-7 items-center justify-center rounded-md bg-accent text-bg hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
            <Check className="size-3.5" aria-hidden />
          </button>
        </span>
      </div>
    </div>
  );
}
