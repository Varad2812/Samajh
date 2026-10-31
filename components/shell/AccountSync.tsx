"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { beaconState, bootstrapAccount, logEvents, scheduleSave, useAccount, type LogEvent } from "@/lib/account";
import { persistedSlice, useStore } from "@/lib/store";
import type { Attempt } from "@/lib/types";

const PROTECTED = ["/student", "/teacher"];

const attemptLog = (a: Attempt): LogEvent => ({
  kind: "attempt",
  at: a.at,
  payload: {
    questionId: a.questionId,
    conceptId: a.conceptId,
    mode: a.mode ?? "practice",
    correct: a.correct,
    verdict: a.verdict,
    confidence: a.confidence,
    misconceptionId: a.misconceptionId,
    masteryBefore: a.masteryBefore,
    masteryAfter: a.masteryAfter,
    transcript: a.rawTranscript?.slice(0, 600),
  },
});

/** Changes worth a log row, derived by diffing the store (so no page has to remember to log). */
function diffEvents(next: ReturnType<typeof useStore.getState>, prev: ReturnType<typeof useStore.getState>): LogEvent[] {
  const out: LogEvent[] = [];
  if (next.attempts !== prev.attempts) {
    if (next.attempts.length >= prev.attempts.length) {
      const known = new Set(prev.attempts.map((a) => a.id));
      const added = next.attempts.filter((a) => !known.has(a.id));
      // Loading the demo profile adds dozens of synthetic attempts at once: one summary row, not 80.
      if (added.length > 12) out.push({ kind: "bulk_load", payload: { attempts: added.length } });
      else out.push(...added.map(attemptLog));
    } else if (next.attempts.length === 0) {
      out.push({ kind: "reset", payload: { cleared: prev.attempts.length } });
    }
  }
  if (next.student.diagnosticDone && !prev.student.diagnosticDone) out.push({ kind: "diagnostic", payload: { theta: Math.round(next.student.theta) } });
  if (next.settings.offsetDays > prev.settings.offsetDays) out.push({ kind: "fast_forward", payload: { days: next.settings.offsetDays - prev.settings.offsetDays } });
  if (next.trackResults !== prev.trackResults) {
    for (const [id, r] of Object.entries(next.trackResults)) {
      if (prev.trackResults[id]?.finishedAt === r.finishedAt) continue;
      const track = next.tracks.find((t) => t.id === id);
      const correct = r.answers.filter((a) => a.correct).length;
      out.push({
        kind: "custom_test_done",
        at: r.finishedAt,
        payload: { trackId: id, title: track?.title, subject: track?.subject, standard: track?.standard, correct, total: r.answers.length, wrongTopics: [...new Set(r.answers.filter((a) => !a.correct).map((a) => track?.questions.find((q) => q.id === a.questionId)?.topicId))].filter(Boolean) },
      });
    }
  }
  if (next.studyPlan && prev.studyPlan && next.studyPlan.createdAt === prev.studyPlan.createdAt) {
    const before = new Map(prev.studyPlan.items.map((v) => [v.id, v.done]));
    for (const v of next.studyPlan.items) {
      if (v.done && !before.get(v.id)) out.push({ kind: "video_done", payload: { conceptId: v.conceptId, title: v.title, minutes: v.minutes } });
    }
  }
  return out;
}

/** Loads the signed-in account, saves every change back to the database and logs activity. */
export function AccountSync() {
  const router = useRouter();
  const pathname = usePathname();
  const status = useAccount((s) => s.status);

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      if (!useStore.persist.hasHydrated()) {
        await new Promise<void>((resolve) => {
          const off = useStore.persist.onFinishHydration(() => {
            off();
            resolve();
          });
        });
      }
      if (!cancelled) await bootstrapAccount();
    };
    void start();

    const unsub = useStore.subscribe((next, prev) => {
      const { status: st, syncing } = useAccount.getState();
      if (st !== "authed" || syncing) return;
      const a = persistedSlice(next);
      const b = persistedSlice(prev);
      if ((Object.keys(a) as (keyof typeof a)[]).some((k) => a[k] !== b[k])) scheduleSave();
      void logEvents(diffEvents(next, prev));
    });
    const onHide = () => document.visibilityState === "hidden" && beaconState();
    document.addEventListener("visibilitychange", onHide);
    return () => {
      cancelled = true;
      unsub();
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);

  useEffect(() => {
    if (status === "guest" && PROTECTED.some((p) => pathname.startsWith(p))) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [status, pathname, router]);

  return null;
}
