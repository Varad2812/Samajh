"use client";

import { useEffect, useState } from "react";
import { Loader2, Printer, WifiOff } from "lucide-react";
import { remedialWorksheet } from "@/lib/ai/api";
import type { AiEnvelope, Worksheet, WorksheetRequest } from "@/lib/ai/schemas";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

interface Props {
  request: WorksheetRequest | null;
  onClose: () => void;
}

export function WorksheetDialog({ request, onClose }: Props) {
  return (
    <Dialog open={request !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="print-area border-neutral-300 bg-white text-neutral-900" closeLabel="Close worksheet">
        {request && <WorksheetBody key={JSON.stringify(request)} request={request} />}
      </DialogContent>
    </Dialog>
  );
}

const STEPS = ["Reading class stats", "Writing items", "Checking answers"];

function WorksheetBody({ request }: { request: WorksheetRequest }) {
  const [env, setEnv] = useState<AiEnvelope<Worksheet> | null>(null);
  const [answers, setAnswers] = useState(true);

  useEffect(() => {
    let live = true;
    void remedialWorksheet(request).then((e) => live && setEnv(e));
    return () => {
      live = false;
    };
  }, [request]);

  if (!env) {
    return (
      <div className="flex flex-col gap-4 p-6" aria-live="polite">
        <DialogTitle className="font-display text-lg font-semibold">Generating remedial worksheet…</DialogTitle>
        <DialogDescription className="flex items-center gap-2 text-sm text-neutral-600">
          <Loader2 className="size-4 animate-spin" aria-hidden /> {STEPS.join(" → ")}
        </DialogDescription>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-neutral-100" />
        ))}
      </div>
    );
  }

  const ws = env.data;
  return (
    <>
      <div className="no-print flex flex-wrap items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 pr-14 text-xs text-neutral-600">
        {env.source === "offline" ? (
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
            <WifiOff className="size-3" aria-hidden /> Assembled from the seeded question bank
          </span>
        ) : (
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-800">Written by Claude</span>
        )}
        <label className="ml-auto flex items-center gap-1.5">
          <input type="checkbox" checked={answers} onChange={(e) => setAnswers(e.target.checked)} className="accent-sky-600" /> Include answer key
        </label>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-neutral-900 px-3 text-sm font-medium text-white transition-colors hover:bg-neutral-700 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none"
        >
          <Printer className="size-4" aria-hidden /> Print
        </button>
      </div>
      <article className="flex-1 overflow-y-auto p-6 print:p-0">
        <header className="mb-4 border-b-2 border-neutral-900 pb-3">
          <DialogTitle className="font-display text-2xl font-semibold">{ws.title}</DialogTitle>
          <div className="mt-1 flex justify-between text-xs text-neutral-500">
            <span>Class 10 Physics · Remedial worksheet</span>
            <span>Name: ______________________ &nbsp; Date: ____________</span>
          </div>
          <DialogDescription className="mt-3 text-sm text-neutral-700">{ws.intro}</DialogDescription>
        </header>
        {ws.sections.map((sec, si) => (
          <section key={si} className="print-sheet mb-5">
            <h3 className="mb-2 font-display text-base font-semibold">
              {String.fromCharCode(65 + si)}. {sec.heading}
            </h3>
            <ol className="flex flex-col gap-3">
              {sec.items.map((it, i) => (
                <li key={i} className="print-sheet ml-5 list-decimal pl-1 text-sm">
                  <div className="whitespace-pre-line">{it.q}</div>
                  {answers ? (
                    <div className="mt-1 rounded border-l-2 border-sky-500 bg-sky-50 px-2 py-1 text-xs text-neutral-700">
                      <span className="font-semibold">Answer:</span> {it.answer}
                    </div>
                  ) : (
                    <div className="mt-2 h-10 border-b border-dashed border-neutral-300" />
                  )}
                </li>
              ))}
            </ol>
          </section>
        ))}
        <footer className="print-sheet mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-700">
          <div className="mb-0.5 font-semibold uppercase tracking-wide text-neutral-500">Teacher notes</div>
          {ws.teacherNotes}
        </footer>
      </article>
    </>
  );
}
