"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Crosshair, X } from "lucide-react";
import { Sparkline } from "@/components/shared/Sparkline";
import { daysBetween, formatVirtualDate } from "@/lib/clock";
import { CHAPTERS, CONCEPT_BY_ID, dependentsOf } from "@/lib/data/concepts";
import { misconceptionsFor } from "@/lib/data/misconceptions";
import { rootCauseOf } from "@/lib/engine/rootCause";
import { CHAPTER_COLOR } from "@/lib/galaxy/layout";
import type { ConceptMastery, ReviewItem } from "@/lib/types";
import { cn, fmt2, masteryBand, masteryColor } from "@/lib/utils";

interface Props {
  conceptId: string;
  mastery: Record<string, ConceptMastery>;
  review: ReviewItem | undefined;
  activeMisconceptions: string[];
  at: number | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function NodeSheet({ conceptId, mastery, review, activeMisconceptions, at, onSelect, onClose }: Props) {
  const c = CONCEPT_BY_ID[conceptId];
  const m = mastery[conceptId];
  const color = m.estimated ? "var(--muted)" : masteryColor(m.p);
  const chapter = CHAPTERS.find((ch) => ch.id === c.chapter);
  const root = rootCauseOf(mastery, conceptId);
  const dueIn = review && at !== null ? daysBetween(at, review.due) : null;

  return (
    <motion.aside
      key={conceptId}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="absolute top-14 right-3 bottom-3 z-20 flex w-[min(330px,calc(100%-24px))] flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-surface/92 p-4 shadow-highlight backdrop-blur-md"
      aria-label={`${c.name} details`}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-accent">{c.id}</span>
            <span className="truncate" style={{ color: CHAPTER_COLOR[c.chapter] }}>{chapter?.name}</span>
          </div>
          <h3 className="mt-1.5 text-base leading-snug font-semibold">{c.name}</h3>
        </div>
        <button
          onClick={onClose}
          aria-label="Close details"
          className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex items-end gap-3">
        <div>
          <div className="font-mono text-title leading-none tabular" style={{ color }}>{fmt2(m.p)}</div>
          <div className="mt-1 text-xs" style={{ color }}>
            {m.estimated ? "estimated · not yet tested" : masteryBand(m.p)}
            {m.suspect && <span className="ml-1.5 text-developing">· suspect prereq</span>}
          </div>
        </div>
        <div className="ml-auto text-right">
          <Sparkline values={m.history.map((h) => h.p)} width={140} height={36} color={masteryColor(m.p)} label={`${c.id} mastery history`} />
          <div className="text-[11px] text-muted-foreground">{m.history.length} measurements</div>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">{c.summary}</p>

      {root && (
        <button
          onClick={() => onSelect(root)}
          className="flex items-center gap-2 rounded-lg border border-developing/30 bg-developing/10 px-3 py-2 text-left text-xs text-developing hover:bg-developing/15"
        >
          <Crosshair className="size-3.5 shrink-0" aria-hidden />
          <span>
            Root cause: likely <span className="font-mono">{root}</span> {CONCEPT_BY_ID[root].name}
          </span>
        </button>
      )}

      <ChipRow title="Prerequisites" ids={c.prereqs} mastery={mastery} onSelect={onSelect} empty="Foundational concept" />
      <ChipRow title="Unlocks" ids={dependentsOf(c.id).map((d) => d.id)} mastery={mastery} onSelect={onSelect} empty="End of this branch" />

      <div>
        <div className="label-caps mb-1.5">Misconceptions</div>
        {misconceptionsFor(c.id).length === 0 ? (
          <p className="text-xs text-muted-foreground">None catalogued; novel ones are detected from your reasoning.</p>
        ) : (
          misconceptionsFor(c.id).map((mc) => {
            const active = activeMisconceptions.includes(mc.id);
            return (
              <div key={mc.id} className={cn("rounded-lg border p-2.5 text-xs", active ? "border-misconception/40 bg-misconception/10" : "border-border bg-surface-2")}>
                <span className="font-mono text-misconception">{mc.id}</span> {active ? "active: " : ""}
                <span className={active ? "" : "text-muted-foreground"}>{mc.wrongBelief}</span>
              </div>
            );
          })
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <Fact label="Next review" value={review ? formatVirtualDate(review.due) : "—"} tone={dueIn !== null && dueIn <= 0 ? "text-weak" : undefined} />
        <Fact label="Interval" value={review ? `${review.interval}d` : "—"} />
        <Fact label="EF" value={review ? review.ef.toFixed(2) : "—"} />
      </div>
      {dueIn !== null && dueIn <= 0 && <p className="-mt-2 text-xs text-weak">{dueIn === 0 ? "Due today" : `${-dueIn}d overdue`}</p>}

      <Link
        href={`/student/practice?concept=${c.id}`}
        className="mt-auto flex items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-bg transition-colors hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none"
      >
        Practice this <ArrowRight className="size-4" aria-hidden />
      </Link>
    </motion.aside>
  );
}

function ChipRow({ title, ids, mastery, onSelect, empty }: { title: string; ids: string[]; mastery: Record<string, ConceptMastery>; onSelect: (id: string) => void; empty: string }) {
  return (
    <div>
      <div className="label-caps mb-1.5">{title}</div>
      {ids.length === 0 ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {ids.map((id) => (
            <button
              key={id}
              onClick={() => onSelect(id)}
              title={CONCEPT_BY_ID[id].name}
              className="flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-xs transition-colors hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            >
              <span className="size-1.5 rounded-full" style={{ background: masteryColor(mastery[id].estimated ? null : mastery[id].p) }} />
              <span className="font-mono">{id}</span>
              <span className="font-mono text-muted-foreground tabular">{fmt2(mastery[id].p)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-2 py-1.5">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={cn("font-mono tabular", tone)}>{value}</div>
    </div>
  );
}
