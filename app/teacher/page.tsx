"use client";

import { useMemo, useState } from "react";
import { KpiStrip } from "@/components/teacher/KpiStrip";
import { MasteryHeatmap } from "@/components/teacher/MasteryHeatmap";
import { MisconceptionChart } from "@/components/teacher/MisconceptionChart";
import { StudentDrawer } from "@/components/teacher/StudentDrawer";
import { WeakestConcepts } from "@/components/teacher/WeakestConcepts";
import { WorksheetDialog } from "@/components/teacher/WorksheetDialog";
import { ChapterMasteryBars } from "@/components/teacher/ChapterMasteryBars";
import { ConstellationPanel } from "@/components/teacher/ConstellationPanel";
import { CustomTestsPanel } from "@/components/teacher/CustomTestsPanel";
import { LiveClassBar } from "@/components/teacher/LiveClassBar";
import { Grid3x3, Orbit, UserPlus } from "lucide-react";
import { useAccount } from "@/lib/account";
import { useLiveClass } from "@/lib/teacher/live";
import { MISCONCEPTION_BY_ID } from "@/lib/data/misconceptions";
import { cn } from "@/lib/utils";
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
  const account = useAccount((s) => s.user);
  const isTeacher = account?.role === "teacher";
  // Teachers see every real student account, polled from the database every few seconds.
  const live = useLiveClass(isTeacher);
  const [demoChoice, setDemoChoice] = useState<boolean | null>(null);
  const realStudents = useMemo(() => live.students ?? [], [live.students]);
  const withDemo = demoChoice ?? realStudents.length < 3;
  const liveIds = useMemo(() => new Set(realStudents.map((s) => s.record.id)), [realStudents]);

  // A student previewing this page sees the demo class plus themselves (their practice shows up live).
  const student = useStore((s) => s.student);
  const mastery = useStore((s) => s.mastery);
  const schedule = useStore((s) => s.schedule);
  const attempts = useStore((s) => s.attempts);
  const roster = useMemo<StudentRecord[]>(() => {
    if (isTeacher) return [...realStudents.map((s) => s.record), ...(withDemo ? classRoster : [])];
    return [...classRoster, { id: student.id, name: student.name, profile: "average", theta: student.theta, mastery, misconceptions: student.misconceptions, attempts, schedule }];
  }, [isTeacher, realStudents, withDemo, classRoster, student, mastery, schedule, attempts]);

  const [mcFilter, setMcFilter] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [worksheet, setWorksheet] = useState<WorksheetRequest | null>(null);
  const [view, setView] = useState<"2d" | "3d">("2d");

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

  const header = (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="font-display text-xl font-semibold">Class X-ray</h1>
        <span className="text-sm text-muted-foreground">
          Class 10 Physics · {isTeacher ? account.name : TEACHER_NAME} · {roster.length} students
          {roster.length > 0 && ` · mean θ ${Math.round(roster.reduce((s, r) => s + r.theta, 0) / roster.length)}`}
        </span>
        {roster.length > 0 && (
          <span className="ml-auto font-mono text-xs text-muted-foreground tabular">
            lowest student {Math.min(...roster.map(studentMean)).toFixed(2)} · highest {Math.max(...roster.map(studentMean)).toFixed(2)}
          </span>
        )}
      </div>
      {isTeacher ? (
        <LiveClassBar realCount={realStudents.length} at={live.at} error={live.error} withDemo={withDemo} onWithDemo={setDemoChoice} />
      ) : (
        <p className="text-xs text-muted-foreground">Demo class plus you. Sign in with a teacher account to see your real students update live.</p>
      )}
    </div>
  );

  if (roster.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <section className="panel flex flex-col items-center gap-3 p-10 text-center">
          <UserPlus className="size-6 text-accent" aria-hidden />
          <h2 className="font-display text-lg font-semibold">No students yet</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            When students create accounts on Samajh and practise or take a test, they appear here within seconds. Turn on the demo classmates to explore the dashboard meanwhile.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {header}

      <KpiStrip kpis={kpis} trend={trend} onTopMisconception={setMcFilter} />

      <div className="flex items-center gap-2">
        <div className="flex rounded-lg border border-border bg-surface p-0.5" role="radiogroup" aria-label="Class view">
          {([
            ["2d", "2D Heatmap", Grid3x3],
            ["3d", "3D Constellation", Orbit],
          ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={view === key}
              onClick={() => setView(key)}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
                view === key && "bg-surface-2 text-foreground shadow-highlight",
              )}
            >
              <Icon className="size-4" aria-hidden /> {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{view === "3d" ? "Same galaxy, coloured by class average; violet pillars and storms mark misconceptions." : "Students × concepts, coloured by mastery."}</span>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        {view === "2d" ? (
          <MasteryHeatmap roster={roster} at={at} mcFilter={mcFilter} onMcFilter={setMcFilter} onOpenStudent={setOpenId} highlightConcept={highlight} liveIds={liveIds} />
        ) : (
          <ConstellationPanel roster={roster} focusConcept={highlight ?? (mcFilter ? MISCONCEPTION_BY_ID[mcFilter].conceptId : null)} />
        )}
        <div className="flex min-w-0 flex-col gap-4">
          {isTeacher && <CustomTestsPanel students={realStudents} now={live.at ?? at} onOpenStudent={setOpenId} />}
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
