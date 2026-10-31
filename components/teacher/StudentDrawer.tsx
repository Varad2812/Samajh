"use client";

import { useMemo, useState } from "react";
import { MiniGalaxy } from "@/components/galaxy";
import { MasteryBar } from "@/components/shared/MasteryBar";
import { RecentAttempts } from "@/components/student/RecentAttempts";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { CHAPTERS, CONCEPT_BY_ID, CONCEPTS } from "@/lib/data/concepts";
import { MISCONCEPTION_BY_ID } from "@/lib/data/misconceptions";
import { dueConceptIds } from "@/lib/engine/sm2";
import { rootCauseOf } from "@/lib/engine/rootCause";
import { buildGalaxyNodes } from "@/lib/galaxy/nodes";
import { chapterMean, studentMean } from "@/lib/teacher/stats";
import type { StudentRecord } from "@/lib/types";
import { fmt2, masteryColor, pct } from "@/lib/utils";

interface Props {
  student: StudentRecord | null;
  at: number;
  onClose: () => void;
}

export function StudentDrawer({ student, at, onClose }: Props) {
  return (
    <Dialog open={student !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent placement="right" className="bg-bg">
        {student && <DrawerBody key={student.id} student={student} at={at} />}
      </DialogContent>
    </Dialog>
  );
}

function DrawerBody({ student, at }: { student: StudentRecord; at: number }) {
  const weakest = useMemo(() => [...CONCEPTS].sort((a, b) => student.mastery[a.id].p - student.mastery[b.id].p).slice(0, 5), [student]);
  const [focus, setFocus] = useState(weakest[0].id);
  const nodes = useMemo(() => buildGalaxyNodes(student.mastery, student.schedule, student.misconceptions, at), [student, at]);
  const mean = studentMean(student);
  const due = dueConceptIds(student.schedule, at);
  const root = rootCauseOf(student.mastery, focus);
  const accuracy = student.attempts.length ? student.attempts.filter((a) => a.correct).length / student.attempts.length : 0;
  const avgConf = student.attempts.length ? student.attempts.reduce((s, a) => s + a.confidence, 0) / student.attempts.length : 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <header className="pr-10">
        <DialogTitle className="font-display text-xl font-semibold">{student.name}</DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          {student.profile} profile · θ {Math.round(student.theta)} · {student.attempts.length} attempts
        </DialogDescription>
      </header>

      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          ["Mean", fmt2(mean), masteryColor(mean)],
          ["Accuracy", pct(accuracy), "var(--text)"],
          ["Avg conf", fmt2(avgConf), "var(--text)"],
          ["Due", String(due.length), due.length ? "var(--developing)" : "var(--text)"],
        ].map(([k, v, c]) => (
          <div key={k} className="panel py-2">
            <div className="font-mono text-base tabular" style={{ color: c }}>{v}</div>
            <div className="text-[11px] text-muted-foreground">{k}</div>
          </div>
        ))}
      </div>

      <section className="panel relative h-60 shrink-0 overflow-hidden" aria-label={`Mini galaxy focused on ${focus}`}>
        <MiniGalaxy nodes={nodes} focusId={focus} onSelect={setFocus} />
        <span className="label-caps pointer-events-none absolute top-3 left-3">Mini galaxy · {focus}</span>
        <span className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-surface/80 px-2 py-0.5 font-mono text-xs tabular" style={{ color: masteryColor(student.mastery[focus].p) }}>
          {CONCEPT_BY_ID[focus].name} {fmt2(student.mastery[focus].p)}
        </span>
      </section>

      <section className="panel p-4">
        <h3 className="label-caps mb-2">Weakest concepts</h3>
        <div className="flex flex-wrap gap-1.5">
          {weakest.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFocus(c.id)}
              aria-pressed={focus === c.id}
              className="flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-xs transition-colors hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none aria-pressed:border-accent/60 aria-pressed:bg-accent/10"
            >
              <span className="font-mono">{c.id}</span>
              <span className="font-mono tabular" style={{ color: masteryColor(student.mastery[c.id].p) }}>{fmt2(student.mastery[c.id].p)}</span>
            </button>
          ))}
        </div>
        {root && (
          <p className="mt-2 text-xs text-developing">
            Root cause of {focus}: likely <span className="font-mono">{root}</span> {CONCEPT_BY_ID[root].name}
          </p>
        )}
      </section>

      <section className="panel flex flex-col gap-2.5 p-4">
        <h3 className="label-caps">Chapter mastery</h3>
        {CHAPTERS.map((ch) => (
          <MasteryBar key={ch.id} label={ch.short} value={chapterMean(student, ch.id)} />
        ))}
      </section>

      <section className="panel flex flex-col gap-2 p-4">
        <h3 className="label-caps">Active misconceptions</h3>
        {student.misconceptions.length === 0 ? (
          <p className="text-xs text-muted-foreground">None detected for this student.</p>
        ) : (
          student.misconceptions.map((id) => {
            const m = MISCONCEPTION_BY_ID[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFocus(m.conceptId)}
                className="rounded-lg border border-misconception/20 bg-misconception/5 p-2.5 text-left text-xs transition-colors hover:border-misconception/50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
              >
                <span className="font-mono text-misconception">{id}</span> {m.label}
                <span className="block text-muted-foreground">{m.wrongBelief}</span>
              </button>
            );
          })
        )}
      </section>

      <RecentAttempts attempts={student.attempts} at={at} onFocus={setFocus} />
    </div>
  );
}
