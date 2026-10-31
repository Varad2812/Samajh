"use client";

import { AudioLines, Eye, GitBranch } from "lucide-react";
import { CONCEPT_BY_ID } from "@/lib/data/concepts";
import { MISCONCEPTION_BY_ID } from "@/lib/data/misconceptions";
import type { Question } from "@/lib/data/questions";
import { candidateMisconceptionIds } from "@/lib/engine/attempt";
import type { ConceptMastery } from "@/lib/types";
import { fmt2, masteryColor } from "@/lib/utils";

const EXAMPLES = [
  "“Same current everywhere in series, so… P = I²R, both glow the same.”",
  "“I used V equals I R, so twelve by three, four amps.”",
  "“Umm it bends towards the normal because light slows down in glass… I think.”",
];

/**
 * Context shown under the question while answering: what the analyzer will watch for, the prerequisites it rests on,
 * and how to speak the "why". Keeps the practice page full before the analysis appears.
 */
export function BeforeYouAnswer({ question, mastery }: { question: Question; mastery: Record<string, ConceptMastery> }) {
  const concept = CONCEPT_BY_ID[question.conceptId];
  const watch = candidateMisconceptionIds(question).slice(0, 3);
  return (
    <section className="grid gap-3 md:grid-cols-3" aria-label="Before you answer">
      <div className="panel flex flex-col gap-2 p-4">
        <h3 className="label-caps flex items-center gap-1.5">
          <Eye className="size-3.5 text-misconception" aria-hidden /> We&apos;ll listen for
        </h3>
        {watch.length ? (
          watch.map((id) => (
            <div key={id} className="text-xs">
              <span className="font-mono text-misconception">{id}</span> <span className="text-muted-foreground">{MISCONCEPTION_BY_ID[id].label}</span>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">No catalogued misconception here; novel ones are still detected from what you say.</p>
        )}
      </div>
      <div className="panel flex flex-col gap-2 p-4">
        <h3 className="label-caps flex items-center gap-1.5">
          <GitBranch className="size-3.5 text-accent" aria-hidden /> Builds on
        </h3>
        {concept.prereqs.length ? (
          <div className="flex flex-wrap gap-1.5">
            {concept.prereqs.map((p) => (
              <span key={p} className="flex items-center gap-1.5 rounded-full bg-surface-2 px-2 py-0.5 text-xs" title={CONCEPT_BY_ID[p].name}>
                <span className="font-mono">{p}</span>
                <span className="font-mono tabular" style={{ color: masteryColor(mastery[p].estimated ? null : mastery[p].p) }}>
                  {fmt2(mastery[p].p)}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{concept.id} is a foundation concept with no prerequisites.</p>
        )}
        {concept.prereqs.length > 0 && <p className="text-xs text-muted-foreground">A wrong answer here makes these prerequisites suspects for the root cause.</p>}
      </div>
      <div className="panel flex flex-col gap-2 p-4">
        <h3 className="label-caps flex items-center gap-1.5">
          <AudioLines className="size-3.5 text-developing" aria-hidden /> Say it like this
        </h3>
        {EXAMPLES.slice(0, 2).map((e) => (
          <p key={e} className="font-mono text-[11px] leading-relaxed text-muted-foreground">{e}</p>
        ))}
        <p className="text-xs text-muted-foreground">Hesitations are fine: they tell us how sure you are.</p>
      </div>
    </section>
  );
}
