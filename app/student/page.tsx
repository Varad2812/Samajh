"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Maximize2, Pause, Route } from "lucide-react";
import { KnowledgeGalaxy } from "@/components/galaxy";
import { ActiveMisconceptions } from "@/components/student/ActiveMisconceptions";
import { ChapterMasteryPanel } from "@/components/student/ChapterMasteryPanel";
import { GalaxyToolbar } from "@/components/student/GalaxyToolbar";
import { NodeSheet } from "@/components/student/NodeSheet";
import { RecentAttempts } from "@/components/student/RecentAttempts";
import { StatsRow } from "@/components/student/StatsRow";
import { StudyPlanPanel } from "@/components/student/StudyPlanPanel";
import { TodayPlan } from "@/components/student/TodayPlan";
import { CONCEPTS } from "@/lib/data/concepts";
import { LENSES, lensIds, type Lens } from "@/lib/galaxy/lenses";
import { buildGalaxyNodes } from "@/lib/galaxy/nodes";
import { useStore, useVirtualNow } from "@/lib/store";

export default function StudentHome() {
  const at = useVirtualNow();
  const mastery = useStore((s) => s.mastery);
  const schedule = useStore((s) => s.schedule);
  const attempts = useStore((s) => s.attempts);
  const student = useStore((s) => s.student);
  const loadDemoProfile = useStore((s) => s.loadDemoProfile);
  const plan = useStore((s) => s.studyPlan);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [lens, setLens] = useState<Lens>("all");
  /** Index into the plan path while the guided tour plays. */
  const [tour, setTour] = useState<number | null>(null);

  const nodes = useMemo(() => buildGalaxyNodes(mastery, schedule, student.misconceptions, at), [mastery, schedule, student.misconceptions, at]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return new Set(CONCEPTS.filter((c) => c.id.toLowerCase().startsWith(q) || c.name.toLowerCase().includes(q)).map((c) => c.id));
  }, [query]);

  const lensSets = useMemo(() => Object.fromEntries(LENSES.map((l) => [l.id, lensIds(l.id, nodes, plan)])) as Record<Lens, Set<string> | null>, [nodes, plan]);
  const lensCounts = useMemo(
    () => Object.fromEntries(LENSES.map((l) => [l.id, lensSets[l.id]?.size ?? null])) as Record<Lens, number | null>,
    [lensSets],
  );
  const path = useMemo(() => plan?.topics.map((t) => t.conceptId) ?? [], [plan]);
  const showPath = lens === "plan" || tour !== null;

  // Guided tour: fly the camera through the plan, one stop every few seconds.
  useEffect(() => {
    if (tour === null) return;
    const id = window.setTimeout(() => {
      const next = tour + 1;
      if (next < path.length) {
        setTour(next);
        setSelectedId(path[next]);
        return;
      }
      setTour(null);
      setSelectedId(null);
      setResetKey((k) => k + 1);
    }, 3800);
    return () => window.clearTimeout(id);
  }, [tour, path]);

  const select = (id: string | null) => {
    setTour(null);
    setSelectedId(id);
  };
  const focusPlanConcept = (id: string) => {
    setLens("plan");
    select(id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setTour(null);
      setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:h-[calc(100dvh-5.5rem)] xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,1fr)]">
      <div className="flex min-h-0 flex-col gap-4">
        <section className="panel relative min-h-[480px] flex-1 overflow-hidden" aria-label="Knowledge galaxy">
          <KnowledgeGalaxy
            nodes={nodes}
            selectedId={selectedId}
            onSelect={select}
            highlightIds={matches ?? (showPath ? lensSets.plan : lensSets[lens])}
            pathIds={showPath ? path : null}
            resetKey={resetKey}
          />
          <GalaxyToolbar
            query={query}
            matches={matches?.size ?? 0}
            onQuery={setQuery}
            onSubmit={() => {
              const first = matches && [...matches][0];
              if (first) select(first);
            }}
            lens={lens}
            lensCounts={lensCounts}
            onLens={(l) => {
              setTour(null);
              setLens(l);
            }}
          />
          <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex items-center gap-3 text-[11px] text-muted-foreground">
            <button
              onClick={() => {
                select(null);
                setResetKey((k) => k + 1);
              }}
              className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-border bg-surface-2/90 px-2.5 py-1.5 text-xs text-foreground backdrop-blur hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            >
              <Maximize2 className="size-3.5" aria-hidden /> Overview
            </button>
            {path.length > 1 && (
              <button
                onClick={() => {
                  if (tour !== null) return select(null);
                  setLens("plan");
                  setTour(0);
                  setSelectedId(path[0]);
                }}
                aria-pressed={tour !== null}
                className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-xs text-foreground backdrop-blur hover:bg-accent/20 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
              >
                {tour === null ? <Route className="size-3.5" aria-hidden /> : <Pause className="size-3.5" aria-hidden />}
                {tour === null ? "Play plan tour" : `Stop · ${tour + 1}/${path.length}`}
              </button>
            )}
            <span className="hidden sm:inline">Drag to orbit · scroll to zoom · click a star for details</span>
          </div>
          <AnimatePresence>
            {selectedId && (
              <NodeSheet
                key={selectedId}
                conceptId={selectedId}
                mastery={mastery}
                review={schedule[selectedId]}
                activeMisconceptions={student.misconceptions}
                at={at}
                onSelect={select}
                onClose={() => select(null)}
              />
            )}
          </AnimatePresence>
        </section>
        {at !== null && <StatsRow attempts={attempts} misconceptions={student.misconceptions.length} at={at} />}
      </div>

      <aside className="flex min-h-0 flex-col gap-4 xl:overflow-y-auto xl:pr-1">
        {at === null ? (
          <div className="panel h-64 animate-pulse" />
        ) : (
          <>
            <TodayPlan
              mastery={mastery}
              schedule={schedule}
              attempts={attempts}
              theta={student.theta}
              misconceptions={student.misconceptions}
              at={at}
              diagnosticDone={student.diagnosticDone}
              onFocus={select}
              onLoadDemo={loadDemoProfile}
            />
            <StudyPlanPanel mastery={mastery} misconceptions={student.misconceptions} onFocus={focusPlanConcept} onBuilt={() => setLens("plan")} />
            <ChapterMasteryPanel mastery={mastery} at={at} />
            <ActiveMisconceptions active={student.misconceptions} attempts={attempts} onFocus={setSelectedId} />
            <RecentAttempts attempts={attempts} at={at} onFocus={setSelectedId} />
          </>
        )}
      </aside>
    </div>
  );
}
