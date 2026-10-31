"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CornerDownRight, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { MiniGalaxy } from "@/components/galaxy";
import { AnalysisPanel, AnalysisProgress } from "@/components/practice/AnalysisPanel";
import { BeforeYouAnswer } from "@/components/practice/BeforeYouAnswer";
import { ConfirmBar } from "@/components/practice/ConfirmBar";
import { MasteryDelta } from "@/components/practice/MasteryDelta";
import { QuestionCard } from "@/components/practice/QuestionCard";
import { usePracticeSession, type Target } from "@/components/practice/usePracticeSession";
import { ReasoningInput } from "@/components/voice/ReasoningInput";
import { CONCEPT_BY_ID, CONCEPTS } from "@/lib/data/concepts";
import type { SelectionReason } from "@/lib/engine/selector";
import { buildGalaxyNodes } from "@/lib/galaxy/nodes";
import { useHydrated, useStore, useVirtualNow } from "@/lib/store";
import { cn, fmt2 } from "@/lib/utils";

export default function PracticePage() {
  return (
    <Suspense fallback={<PracticeSkeleton />}>
      <PracticeGate />
    </Suspense>
  );
}

function PracticeSkeleton() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="panel h-[420px] animate-pulse" />
      <div className="flex flex-col gap-4">
        <div className="panel starfield-loading h-60" />
        <div className="panel h-40 animate-pulse" />
      </div>
    </div>
  );
}

/** Wait for the persisted learner model before choosing the first question. */
function PracticeGate() {
  const params = useSearchParams();
  const hydrated = useHydrated();
  const concept = params.get("concept");
  const valid = concept && CONCEPT_BY_ID[concept] ? concept : undefined;
  const mode: Target["mode"] = params.get("mode") === "review" ? "review" : valid ? "concept" : "auto";
  if (!hydrated) return <PracticeSkeleton />;
  return <PracticeSession key={`${mode}:${valid ?? ""}`} initial={{ mode, conceptId: valid }} />;
}

const REASON: Record<SelectionReason, string> = {
  review: "Due for review (SM-2)",
  root_cause: "Root-cause probe",
  weakest: "Your weakest concept",
  unexplored: "New concept to explore",
  requested: "Chosen concept",
};

function PracticeSession({ initial }: { initial: Target }) {
  const s = usePracticeSession(initial);
  const mastery = useStore((st) => st.mastery);
  const schedule = useStore((st) => st.schedule);
  const activeMcs = useStore((st) => st.student.misconceptions);
  const theta = useStore((st) => st.student.theta);
  const at = useVirtualNow();
  const nodes = useMemo(() => buildGalaxyNodes(mastery, schedule, activeMcs, at), [mastery, schedule, activeMcs, at]);

  const q = s.question;
  const conceptId = q?.conceptId ?? s.selection.conceptId;
  const locked = s.phase !== "answer";
  const upcoming = s.phase === "result" ? s.nextTarget() : null;
  const nextLabel = upcoming?.probe ? `Probe ${upcoming.probe.conceptId}` : upcoming?.mode === "review" ? "Next review" : "Next question";
  const probe = s.target.probe;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-4">
        <section className="panel flex min-w-0 flex-col gap-4 p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {probe ? (
              <span className="flex items-center gap-1.5 rounded-full border border-developing/30 bg-developing/10 px-2.5 py-1 text-developing">
                <CornerDownRight className="size-3.5" aria-hidden />
                Probing root cause {probe.conceptId}
                {probe.misconceptionId && <> · targeting {probe.misconceptionId}</>} (from {probe.from})
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-muted-foreground">
                {s.target.mode === "review" ? <RotateCcw className="size-3.5" aria-hidden /> : <Sparkles className="size-3.5" aria-hidden />}
                {s.target.mode === "review" ? "Review mode" : REASON[s.selection.reason]}
              </span>
            )}
            <span className="font-mono text-muted-foreground tabular">
              target Elo {Math.round(s.selection.targetElo)}
              {s.selection.misconceptionId && ` · watching ${s.selection.misconceptionId}`}
            </span>
            {s.generating && (
              <span className="flex items-center gap-1 text-accent">
                <Loader2 className="size-3.5 animate-spin" aria-hidden /> generating a targeted question…
              </span>
            )}
            {q?.source === "ai" && <span className="rounded-full bg-accent-2/15 px-2 py-0.5 text-accent-2">AI-generated</span>}
          </div>

          {q ? (
            <QuestionCard key={q.id} question={q} selected={s.selected} onSelect={(i) => !locked && s.setSelected(i)} revealed={s.phase === "result"} />
          ) : (
            <p className="text-sm text-muted-foreground">No question available for {conceptId}.</p>
          )}

          <div className="border-t border-border pt-4">
            <ReasoningInput
              value={s.reasoning}
              onChange={s.setReasoning}
              onSubmit={() => void s.submit()}
              canSubmit={s.selected !== null && !locked}
              disabled={locked}
            />
            {s.selected === null && !locked && <p className="mt-1 text-xs text-muted-foreground">Tap an answer first; reasoning is what we grade, the tap is what we check.</p>}
          </div>
        </section>

        {s.phase === "answer" && q && <BeforeYouAnswer question={q} mastery={mastery} />}
        {s.phase === "analyzing" && <AnalysisProgress />}
        {s.phase === "confirm" && s.pending && <ConfirmBar analysis={s.pending.analysis} onConfirm={s.confirm} />}
        {s.phase === "result" && s.result && q && s.selected !== null && (
          <AnalysisPanel
            raw={s.result.raw}
            analysis={s.result.analysis}
            source={s.result.source}
            question={q}
            selectedIndex={s.selected}
            outcome={s.result.outcome}
            onNext={s.next}
            nextLabel={nextLabel}
          />
        )}
      </div>

      {/* Sticky so the MiniGalaxy (Strike, Shockwave) and the mastery delta stay in view while reading the analysis. */}
      <aside className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-[72px] xl:max-h-[calc(100dvh-88px)] xl:overflow-y-auto">
          <section className="panel relative h-60 overflow-hidden" aria-label={`Mini galaxy focused on ${s.focusId}`}>
            <MiniGalaxy nodes={nodes} focusId={s.focusId} />
            <span className="label-caps pointer-events-none absolute top-3 left-3">Mini galaxy · {s.focusId}</span>
            {s.focusId !== conceptId && (
              <span className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-developing/15 px-2 py-0.5 text-xs text-developing">Root cause: {s.focusId}</span>
            )}
          </section>
          <MasteryDelta
            conceptId={conceptId}
            mastery={mastery[conceptId]}
            theta={theta}
            review={schedule[conceptId]}
            at={at}
            outcome={s.result?.outcome ?? null}
            onProbe={() => s.next()}
          />
          <SessionPanel stats={s.stats} conceptId={conceptId} />
      </aside>
    </div>
  );
}

function SessionPanel({ stats, conceptId }: { stats: { attempts: number; correct: number; confidenceSum: number }; conceptId: string }) {
  const all = useStore((st) => st.attempts);
  const onConcept = all.filter((a) => a.conceptId === conceptId);
  return (
    <section className="panel flex flex-col gap-3 p-4" aria-label="Session">
      <h3 className="label-caps">Session</h3>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ["Attempts", String(stats.attempts)],
          ["Correct", `${stats.correct}`],
          ["Avg conf", stats.attempts ? fmt2(stats.confidenceSum / stats.attempts) : "—"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-surface-2 py-2">
            <div className="font-mono text-base tabular">{v}</div>
            <div className="text-[11px] text-muted-foreground">{k}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1" aria-label={`Last attempts on ${conceptId}`}>
        <span className="mr-1 text-xs text-muted-foreground">{conceptId} history</span>
        {onConcept.slice(-12).map((a) => (
          <span
            key={a.id}
            title={`${a.verdict} · conf ${fmt2(a.confidence)}`}
            className={cn("size-2.5 rounded-sm", a.verdict === "correct_sound" ? "bg-mastered" : a.verdict === "correct_flawed" ? "bg-developing" : "bg-weak")}
          />
        ))}
        {onConcept.length === 0 && <span className="text-xs text-muted-foreground">first attempt</span>}
      </div>
      <div className="flex flex-wrap gap-1 border-t border-border pt-2">
        {CONCEPTS.map((c) => (
          <Link
            key={c.id}
            href={`/student/practice?concept=${c.id}`}
            className={cn("rounded-md px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none", c.id === conceptId && "bg-accent/15 text-accent")}
          >
            {c.id}
          </Link>
        ))}
      </div>
    </section>
  );
}
