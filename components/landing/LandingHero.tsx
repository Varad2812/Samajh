"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, GraduationCap, School, Sparkles } from "lucide-react";
import { KnowledgeGalaxy } from "@/components/galaxy";
import { startOfDay } from "@/lib/clock";
import { CONCEPTS } from "@/lib/data/concepts";
import { MISCONCEPTION_BY_ID } from "@/lib/data/misconceptions";
import { QUESTIONS } from "@/lib/data/questions";
import { generateDemoStudent, TEACHER_NAME } from "@/lib/data/students";
import { dueConceptIds } from "@/lib/engine/sm2";
import { buildGalaxyNodes } from "@/lib/galaxy/nodes";
import { kpis } from "@/lib/teacher/stats";
import { useClassRoster, useHydrated, useStore, useVirtualNow } from "@/lib/store";
import { fmt2, masteryColor, pct } from "@/lib/utils";

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

function Stat({ label, value, color }: { label: string; value: string | null; color?: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-surface-2/80 px-2.5 py-2">
      <div className="truncate text-[11px] text-muted-foreground">{label}</div>
      {value === null ? (
        <div className="mt-1 h-4 w-10 animate-pulse rounded bg-white/5" />
      ) : (
        <div className="font-mono text-sm tabular" style={color ? { color } : undefined}>{value}</div>
      )}
    </div>
  );
}

/** Full-bleed auto-rotating galaxy (demo mastery) behind the hero and the two live role cards (DESIGN.md §3.1). */
export function LandingHero() {
  const router = useRouter();
  const at = useVirtualNow();
  const hydrated = useHydrated();
  const roster = useClassRoster();
  const student = useStore((s) => s.student);
  const mastery = useStore((s) => s.mastery);
  const schedule = useStore((s) => s.schedule);
  const attempts = useStore((s) => s.attempts);
  const loadDemoProfile = useStore((s) => s.loadDemoProfile);

  const day = at === null ? null : startOfDay(at);
  const demo = useMemo(() => (day === null ? null : generateDemoStudent(day)), [day]);
  // The hero always shows a lived-in galaxy: the student's own once they have data, else Aarav's demo profile.
  const live = hydrated && (student.diagnosticDone || attempts.length > 0);
  const nodes = useMemo(() => {
    if (live) return buildGalaxyNodes(mastery, schedule, student.misconceptions, at);
    return demo ? buildGalaxyNodes(demo.mastery, demo.schedule, demo.misconceptions, at) : null;
  }, [live, mastery, schedule, student.misconceptions, demo, at]);

  const s = live
    ? { mean: mean(CONCEPTS.map((c) => mastery[c.id].p)), attempts: attempts.length, mcs: student.misconceptions, due: at === null ? 0 : dueConceptIds(schedule, at).length }
    : demo && at !== null
      ? { mean: mean(CONCEPTS.map((c) => demo.mastery[c.id].p)), attempts: demo.attempts.length, mcs: demo.misconceptions, due: dueConceptIds(demo.schedule, at).length }
      : null;
  const k = roster && at !== null ? kpis(roster, at) : null;

  return (
    <section className="relative -mx-4 -mt-4 flex min-h-[calc(100dvh-56px)] overflow-hidden border-b border-border lg:min-h-[640px]">
      <div className="absolute inset-0" aria-hidden={false}>
        {nodes ? <KnowledgeGalaxy nodes={nodes} selectedId={null} /> : <div className="starfield-loading size-full" />}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-bg/90 via-bg/80 to-bg/95 lg:bg-gradient-to-r lg:from-bg lg:via-bg/75 lg:to-transparent" />

      <div className="pointer-events-none relative z-10 flex w-full max-w-[640px] min-w-0 flex-col justify-center gap-6 px-4 py-10 sm:px-8 lg:py-16">
        <span className="label-caps text-accent">CBSE Class 10 Physics · {CONCEPTS.length} concepts · {QUESTIONS.length} questions</span>
        <h1 className="text-[34px] leading-[1.08] font-semibold tracking-tight sm:text-hero">
          The tutor that listens to <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">how you think.</span>
        </h1>
        <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
          Tap an answer, then say <em className="text-foreground">why</em> out loud with Wispr Flow. Samajh cleans your messy speech, reads hesitation as
          confidence, finds the misconception behind a wrong (or luckily right) answer, and your Knowledge Galaxy adapts.
        </p>

        <div className="pointer-events-auto grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
          <Link href="/student" className="panel group flex min-w-0 flex-col gap-3 bg-surface/85 p-4 backdrop-blur transition-colors hover:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
            <div className="flex items-center gap-2">
              <GraduationCap className="size-5 text-accent" aria-hidden />
              <span className="font-display text-lg font-semibold">Student · {student.name}</span>
              <ArrowRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <Stat label="Mastery" value={s ? fmt2(s.mean) : null} color={s ? masteryColor(s.mean) : undefined} />
              <Stat label="Attempts" value={s ? String(s.attempts) : null} />
              <Stat label="Reviews due" value={s ? String(s.due) : null} color="var(--developing)" />
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {s?.mcs.length ? (
                <>
                  <span className="font-mono text-misconception">{s.mcs.join(" ")}</span> · {MISCONCEPTION_BY_ID[s.mcs[0]].label}
                </>
              ) : (
                "Adaptive diagnostic, then practice aimed at weak prerequisites."
              )}
              {!live && s && " (demo)"}
            </p>
          </Link>
          <Link href="/teacher" className="panel group flex min-w-0 flex-col gap-3 bg-surface/85 p-4 backdrop-blur transition-colors hover:border-accent-2/50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
            <div className="flex items-center gap-2">
              <School className="size-5 text-accent-2" aria-hidden />
              <span className="font-display text-lg font-semibold">Teacher · {TEACHER_NAME}</span>
              <ArrowRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <Stat label="Class mean" value={k ? fmt2(k.classMean) : null} color={k ? masteryColor(k.classMean) : undefined} />
              <Stat label="At risk" value={k ? `${k.atRisk}/${k.size}` : null} color="var(--weak)" />
              <Stat label="Top MC" value={k?.topMisconception ? `${k.topMisconception.id} ${pct(k.topMisconception.rate)}` : k ? "–" : null} color="var(--misconception)" />
            </div>
            <p className="truncate text-xs text-muted-foreground">Class X-ray: heatmap, misconception leaders, remedial worksheets.</p>
          </Link>
        </div>

        <div className="pointer-events-auto flex flex-wrap items-center gap-3 text-sm">
          <Link
            href="/student/diagnostic"
            className="flex h-10 items-center gap-2 rounded-lg bg-accent px-4 font-medium text-bg transition-colors hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none active:translate-y-px"
          >
            Take the 4-minute diagnostic <ArrowRight className="size-4" aria-hidden />
          </Link>
          <button
            type="button"
            onClick={() => {
              router.push("/student");
              // Load once the home galaxy has mounted so it plays the Ignition reveal.
              window.setTimeout(loadDemoProfile, 400);
            }}
            className="flex h-10 items-center gap-2 rounded-lg border border-border bg-surface/80 px-4 backdrop-blur transition-colors hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            <Sparkles className="size-4 text-accent" aria-hidden /> Load demo profile <kbd className="font-mono text-xs text-muted-foreground">⇧D</kbd>
          </button>
        </div>
      </div>
    </section>
  );
}
