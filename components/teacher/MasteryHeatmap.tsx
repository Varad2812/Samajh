"use client";

import { memo, useMemo, useState } from "react";
import { ArrowDownUp, X } from "lucide-react";
import { daysBetween } from "@/lib/clock";
import { CHAPTERS, CONCEPT_BY_ID, CONCEPTS } from "@/lib/data/concepts";
import { MISCONCEPTION_BY_ID } from "@/lib/data/misconceptions";
import { CHAPTER_COLOR } from "@/lib/galaxy/layout";
import { filterByMisconception, sortRoster, studentMean, type SortKey } from "@/lib/teacher/stats";
import type { StudentRecord } from "@/lib/types";
import { cn, fmt2, masteryBand, masteryColor } from "@/lib/utils";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "mean", label: "Weakest first" },
  { key: "name", label: "Name" },
  { key: "misconceptions", label: "Most misconceptions" },
  ...CHAPTERS.map((ch) => ({ key: `chapter:${ch.id}` as SortKey, label: `${ch.short === "Elec" ? "Electricity" : ch.short === "Mag" ? "Magnetism" : ch.short} weakest` })),
];

interface Hover {
  x: number;
  y: number;
  student: StudentRecord;
  conceptId: string;
}

interface Props {
  roster: StudentRecord[];
  at: number;
  mcFilter: string | null;
  onMcFilter: (id: string | null) => void;
  onOpenStudent: (id: string) => void;
  /** Highlight a concept column (e.g. from the weakest-concepts list). */
  highlightConcept?: string | null;
}

/** One student row: memoised so hovering (tooltip state) never re-renders 1,000 cells. */
const Row = memo(function Row({
  student, dim, activeMc, onOpen, onHover,
}: {
  student: StudentRecord;
  dim: boolean;
  activeMc: string | null;
  onOpen: (id: string) => void;
  onHover: (h: Hover | null, e?: React.PointerEvent) => void;
}) {
  const mean = studentMean(student);
  return (
    <tr className={cn("group/row", dim && "opacity-40")}>
      <th scope="row" className="sticky left-0 z-10 bg-surface pr-2 text-left font-normal">
        <button
          type="button"
          onClick={() => onOpen(student.id)}
          className="flex h-5 w-[124px] items-center gap-1.5 truncate rounded px-1 text-left text-xs transition-colors group-hover/row:bg-surface-2 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          <span className="size-1.5 shrink-0 rounded-full" style={{ background: masteryColor(mean) }} />
          <span className="truncate">{student.name}</span>
        </button>
      </th>
      {CHAPTERS.flatMap((ch) =>
        CONCEPTS.filter((c) => c.chapter === ch.id).map((c, i) => {
          const m = student.mastery[c.id];
          return (
            <td
              key={c.id}
              onPointerEnter={(e) => onHover({ x: e.clientX, y: e.clientY, student, conceptId: c.id }, e)}
              onPointerMove={(e) => onHover({ x: e.clientX, y: e.clientY, student, conceptId: c.id }, e)}
              onPointerLeave={() => onHover(null)}
              onClick={() => onOpen(student.id)}
              className={cn("h-5 min-w-[18px] cursor-pointer p-0", i === 0 && "border-l-2 border-bg")}
            >
              <span
                className={cn("block size-full rounded-[3px]", activeMc && MISCONCEPTION_BY_ID[activeMc]?.conceptId === c.id && "ring-1 ring-misconception ring-inset")}
                style={{ background: masteryColor(m.estimated ? null : m.p), opacity: m.estimated ? 0.5 : 0.35 + 0.65 * Math.min(1, m.p + 0.3) }}
              />
            </td>
          );
        }),
      )}
      <td className="pl-2 text-right font-mono text-xs tabular" style={{ color: masteryColor(mean) }}>{fmt2(mean)}</td>
      <td className="pl-2">
        <span className="flex gap-1">
          {student.misconceptions.slice(0, 2).map((id) => (
            <span key={id} className={cn("rounded-full px-1.5 font-mono text-[10px]", id === activeMc ? "bg-misconception text-bg" : "bg-misconception/15 text-misconception")}>{id}</span>
          ))}
          {student.misconceptions.length > 2 && <span className="font-mono text-[10px] text-muted-foreground">+{student.misconceptions.length - 2}</span>}
        </span>
      </td>
    </tr>
  );
});

/** students × 34 concepts, grouped by chapter. Hover = tooltip, header click = sort by that concept. */
export function MasteryHeatmap({ roster, at, mcFilter, onMcFilter, onOpenStudent, highlightConcept = null }: Props) {
  const [sort, setSort] = useState<SortKey>("mean");
  const [hover, setHover] = useState<Hover | null>(null);
  const matching = useMemo(() => new Set(filterByMisconception(roster, mcFilter).map((s) => s.id)), [roster, mcFilter]);
  const rows = useMemo(() => {
    const sorted = sortRoster(roster, sort);
    // Filtering by a misconception puts its holders on top; the rest stay visible but dimmed.
    return mcFilter ? [...sorted.filter((s) => matching.has(s.id)), ...sorted.filter((s) => !matching.has(s.id))] : sorted;
  }, [roster, sort, mcFilter, matching]);
  const mc = mcFilter ? MISCONCEPTION_BY_ID[mcFilter] : null;
  const onHover = useMemo(() => (h: Hover | null) => setHover(h), []);

  return (
    <section className="panel flex min-w-0 flex-col gap-3 p-4" aria-label="Mastery heatmap">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="label-caps">Mastery heatmap</h2>
        <span className="font-mono text-xs text-muted-foreground tabular">{roster.length} students × {CONCEPTS.length} concepts</span>
        <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <ArrowDownUp className="size-3.5" aria-hidden />
          <span className="sr-only md:not-sr-only">Sort</span>
          <select
            value={SORTS.some((s) => s.key === sort) ? sort : ""}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-7 rounded-md border border-border bg-surface-2 px-2 text-xs text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            {!SORTS.some((s) => s.key === sort) && <option value="">By {sort.slice(8)}</option>}
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </label>
      </div>

      {mc && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-misconception/30 bg-misconception/5 px-3 py-1.5 text-xs">
          <span className="font-mono text-misconception">{mc.id}</span> {mc.label}
          <span className="text-muted-foreground">· {matching.size} of {roster.length} students (shown first); outlined column = {mc.conceptId}</span>
          <button type="button" onClick={() => onMcFilter(null)} className="ml-auto flex items-center gap-1 rounded text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
            Clear <X className="size-3" aria-hidden />
          </button>
        </div>
      )}

      <div className="max-h-[720px] overflow-auto rounded-lg" onPointerLeave={() => setHover(null)}>
        <table className="border-separate [border-spacing:1px] text-left" style={{ minWidth: 124 + CONCEPTS.length * 19 + 130 }}>
          <thead className="sticky top-0 z-20 bg-surface">
            <tr>
              <th className="sticky left-0 z-30 bg-surface" />
              {CHAPTERS.map((ch) => {
                const n = CONCEPTS.filter((c) => c.chapter === ch.id).length;
                return (
                  <th key={ch.id} colSpan={n} className="border-l-2 border-bg pb-1 text-[11px] font-medium" style={{ color: CHAPTER_COLOR[ch.id] }}>
                    <button type="button" onClick={() => setSort(`chapter:${ch.id}`)} className="w-full truncate rounded text-left hover:underline focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none" title={`${ch.name}: sort by weakest`}>
                      {ch.short === "Elec" ? "Electricity" : ch.short === "Mag" ? "Magnetism" : ch.short}
                    </button>
                  </th>
                );
              })}
              <th className="pl-2 text-right text-[11px] font-medium text-muted-foreground">Mean</th>
              <th className="pl-2 text-[11px] font-medium text-muted-foreground">MCs</th>
            </tr>
            <tr>
              <th className="sticky left-0 z-30 bg-surface" />
              {CHAPTERS.flatMap((ch) =>
                CONCEPTS.filter((c) => c.chapter === ch.id).map((c, i) => (
                  <th key={c.id} className={cn("h-6 p-0 font-normal", i === 0 && "border-l-2 border-bg")}>
                    <button
                      type="button"
                      onClick={() => setSort(`concept:${c.id}`)}
                      title={`${c.id} ${c.name}: sort by weakest`}
                      aria-label={`Sort by ${c.id} ${c.name}`}
                      className={cn(
                        "h-6 w-full rounded font-mono text-[9px] text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
                        (sort === `concept:${c.id}` || highlightConcept === c.id || (mc && mc.conceptId === c.id)) && "bg-accent/15 text-accent",
                      )}
                    >
                      {c.id}
                    </button>
                  </th>
                )),
              )}
              <th />
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <Row key={s.id} student={s} dim={mcFilter !== null && !matching.has(s.id)} activeMc={mcFilter} onOpen={onOpenStudent} onHover={onHover} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          weak
          <span className="h-2 w-28 rounded-full" style={{ background: "linear-gradient(90deg, var(--weak), var(--developing), var(--proficient), var(--mastered))" }} />
          mastered
        </span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] opacity-50" style={{ background: "var(--unknown)" }} /> estimated</span>
        <span>Click a concept ID to sort · click a row to open the student</span>
      </div>

      {hover && <CellTip hover={hover} at={at} />}
    </section>
  );
}

function CellTip({ hover, at }: { hover: Hover; at: number }) {
  const { student, conceptId } = hover;
  const m = student.mastery[conceptId];
  const c = CONCEPT_BY_ID[conceptId];
  const last = student.attempts.filter((a) => a.conceptId === conceptId).at(-1);
  const mcs = student.misconceptions.filter((id) => MISCONCEPTION_BY_ID[id]?.conceptId === conceptId);
  const left = typeof window !== "undefined" && hover.x > window.innerWidth - 270;
  const top = typeof window !== "undefined" && hover.y > window.innerHeight - 170;
  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 w-[250px] rounded-lg border border-border bg-surface-2 p-2.5 text-xs shadow-xl"
      style={{ left: left ? hover.x - 262 : hover.x + 14, top: top ? hover.y - 118 : hover.y + 14 }}
    >
      <div className="font-medium">{student.name}</div>
      <div className="text-muted-foreground"><span className="font-mono">{c.id}</span> {c.name}</div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="font-mono text-lg tabular" style={{ color: masteryColor(m.estimated ? null : m.p) }}>{fmt2(m.p)}</span>
        <span style={{ color: masteryColor(m.estimated ? null : m.p) }}>{m.estimated ? "estimated" : masteryBand(m.p)}</span>
      </div>
      <div className="text-muted-foreground">
        {last ? `last attempt ${daysBetween(last.at, at) <= 0 ? "today" : `${daysBetween(last.at, at)}d ago`} · ${last.verdict.replace("_", " ")}` : "no attempts on this concept"}
      </div>
      {mcs.length > 0 && <div className="mt-1 font-mono text-misconception">{mcs.join(" ")} active</div>}
    </div>
  );
}
