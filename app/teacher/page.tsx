"use client";

import { useMemo, useState } from "react";
import { KpiStrip } from "@/components/teacher/KpiStrip";
import { MasteryHeatmap } from "@/components/teacher/MasteryHeatmap";
import { MisconceptionChart } from "@/components/teacher/MisconceptionChart";
import { StudentDrawer } from "@/components/teacher/StudentDrawer";
import { WeakestConcepts } from "@/components/teacher/WeakestConcepts";
import { WorksheetDialog } from "@/components/teacher/WorksheetDialog";
import { ChapterMasteryBars } from "@/components/teacher/ChapterMasteryBars";
import type { WorksheetRequest } from "@/lib/ai/schemas";
import { TEACHER_NAME } from "@/lib/data/students";
import { classTrend, kpis as computeKpis, misconceptionStats, studentMean, weakestConcepts, type WeakConcept } from "@/lib/teacher/stats";
import { useClassRoster, useHydrated, useStore, useVirtualNow } from "@/lib/store";
import type { StudentRecord } from "@/lib/types";

export default function TeacherPage() {
  const hydrated = useHydrated();
  const classRoster = useClassRoster();
  const at = useVirtualNow();
  if (!hydrated || !classRoster || at === null) return <TeacherSkeleton />;
  return <ClassXray classRoster={classRoster} at={at} />;
}

function TeacherSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="panel h-24 animate-pulse" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="panel h-[560px] animate-pulse" />
        <div className="flex flex-col gap-4">
          <div className="panel h-64 animate-pulse" />
          <div className="panel h-80 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function ClassXray({ classRoster, at }: { classRoster: StudentRecord[]; at: number }) {
  // The live student (their practice shows up here) joins the 30 synthetic classmates: 31 rows.
  const student = useStore((s) => s.student);
  const mastery = useStore((s) => s.mastery);
  const schedule = useStore((s) => s.schedule);
  const attempts = useStore((s) => s.attempts);
  const roster = useMemo<StudentRecord[]>(
    () => [...classRoster, { id: student.id, name: student.name, profile: "average", theta: student.theta, mastery, misconceptions: student.misconceptions, attempts, schedule }],
    [classRoster, student, mastery, schedule, attempts],
  );

  const [mcFilter, setMcFilter] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [worksheet, setWorksheet] = useState<WorksheetRequest | null>(null);

  const kpis = useMemo(() => computeKpis(roster, at), [roster, at]);
  const trend = useMemo(() => classTrend(roster, at), [roster, at]);
  const mcStats = useMemo(() => misconceptionStats(roster), [roster]);
  const weakest = useMemo(() => weakestConcepts(roster, 8), [roster]);

  const openWorksheet = (w: WeakConcept) =>
    setWorksheet({
      conceptId: w.conceptId,
      misconceptionIds: w.misconceptions.map((m) => m.id),
      classStats: {
        classSize: roster.length,
        affectedPct: Object.fromEntries(w.misconceptions.map((m) => [m.id, Math.round((m.count / roster.length) * 100)])),
        avgMastery: Math.round(w.mean * 100) / 100,
        weakCount: w.weakCount,
      },
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="font-display text-xl font-semibold">Class X-ray</h1>
        <span className="text-sm text-muted-foreground">Class 10 Physics · {TEACHER_NAME} · {roster.length} students · mean θ {Math.round(roster.reduce((s, r) => s + r.theta, 0) / roster.length)}</span>
        <span className="ml-auto font-mono text-xs text-muted-foreground tabular">
          lowest student {Math.min(...roster.map(studentMean)).toFixed(2)} · highest {Math.max(...roster.map(studentMean)).toFixed(2)}
        </span>
      </div>

      <KpiStrip kpis={kpis} trend={trend} onTopMisconception={setMcFilter} />

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <MasteryHeatmap roster={roster} at={at} mcFilter={mcFilter} onMcFilter={setMcFilter} onOpenStudent={setOpenId} highlightConcept={highlight} />
        <div className="flex min-w-0 flex-col gap-4">
          <MisconceptionChart stats={mcStats} size={roster.length} active={mcFilter} onSelect={setMcFilter} />
          <WeakestConcepts weakest={weakest} size={roster.length} highlighted={highlight} onHighlight={setHighlight} onWorksheet={openWorksheet} onMcFilter={setMcFilter} />
          <ChapterMasteryBars roster={roster} />
        </div>
      </div>

      <StudentDrawer student={roster.find((s) => s.id === openId) ?? null} at={at} onClose={() => setOpenId(null)} />
      <WorksheetDialog request={worksheet} onClose={() => setWorksheet(null)} />
    </div>
  );
}
