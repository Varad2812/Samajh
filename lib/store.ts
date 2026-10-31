"use client";

import { useMemo, useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { addDays, now as virtualNow, startOfDay } from "@/lib/clock";
import { CONCEPTS } from "@/lib/data/concepts";
import { BKT_DEFAULTS } from "@/lib/engine/bkt";
import { INITIAL_THETA } from "@/lib/engine/elo";
import { DEMO_STUDENT_ID, generateClass, generateDemoStudent } from "@/lib/data/students";
import { appendFx, misconceptionFx, shockwaveFor, type FxEvent, type FxInput } from "@/lib/fx";
import type { StudyPlan } from "@/lib/ai/studyPlan";
import type { CustomTrack, TrackResult } from "@/lib/tracks/types";
import type { Question } from "@/lib/data/questions";
import type { AttemptOutcome } from "@/lib/engine/attempt";
import type { DiagnosticOutcome } from "@/lib/engine/diagnostic";
import type { Attempt, ConceptMastery, ReviewItem, StudentRecord } from "@/lib/types";

export const DEFAULT_P_INIT = BKT_DEFAULTS.pInit;
export const DEFAULT_THETA = INITIAL_THETA;

export type Role = "student" | "teacher";

interface StudentSlice {
  id: string;
  name: string;
  theta: number;
  misconceptions: string[];
  diagnosticDone: boolean;
}

interface SettingsSlice {
  role: Role;
  /** Virtual clock offset, in days. */
  offsetDays: number;
  /** True once an AI call has fallen back to the offline analyzer. */
  offline: boolean;
}

interface SamajhState {
  student: StudentSlice;
  attempts: Attempt[];
  mastery: Record<string, ConceptMastery>;
  schedule: Record<string, ReviewItem>;
  settings: SettingsSlice;
  /** AI-generated questions kept for reuse by the selector. */
  generated: Question[];
  /** Calibrated question difficulty (question id → Elo). */
  questionElo: Record<string, number>;
  /** Latest 45-minute YouTube plan for the weakest concepts. */
  studyPlan: StudyPlan | null;
  /** Custom tests the student built (newest first). */
  tracks: CustomTrack[];
  /** Latest result per custom test. */
  trackResults: Record<string, TrackResult>;
  /** 45-minute video plan per custom test. */
  trackPlans: Record<string, StudyPlan>;
  activeTrackId: string | null;
  /** Transient 3D effect events (not persisted). */
  fx: FxEvent[];
  fxSeq: number;

  triggerFx: (...events: FxInput[]) => void;
  recordAttempt: (attempt: Attempt) => void;
  setMastery: (conceptId: string, value: ConceptMastery) => void;
  setReview: (conceptId: string, item: ReviewItem) => void;
  setTheta: (theta: number) => void;
  setStudentMisconceptions: (ids: string[]) => void;
  /**
   * Commit one graded attempt. Misconception changes are applied separately (setStudentMisconceptions)
   * so the page can time the Misconception Strike after the camera arrives.
   */
  applyOutcome: (o: AttemptOutcome) => void;
  applyDiagnostic: (o: DiagnosticOutcome) => void;
  addGeneratedQuestion: (q: Question) => void;
  completeDiagnostic: () => void;
  fastForward: (days?: number) => void;
  setRole: (role: Role) => void;
  setOffline: (offline: boolean) => void;
  loadDemoProfile: () => void;
  resetDemo: () => void;
  setStudyPlan: (plan: StudyPlan | null) => void;
  toggleStudyItem: (itemId: string) => void;
  addTrack: (track: CustomTrack) => void;
  removeTrack: (trackId: string) => void;
  setActiveTrack: (trackId: string | null) => void;
  saveTrackResult: (result: TrackResult) => void;
  setTrackPlan: (trackId: string, plan: StudyPlan) => void;
  toggleTrackPlanItem: (trackId: string, itemId: string) => void;
  /** Replace progress with an account's saved snapshot (or a fresh profile for a new account). */
  loadAccount: (account: { name: string; role: Role }, saved: Partial<PersistedState> | null) => void;
}

/** The slices saved to localStorage and to the account database. */
export type PersistedState = Pick<
  SamajhState,
  | "student"
  | "attempts"
  | "mastery"
  | "schedule"
  | "settings"
  | "generated"
  | "questionElo"
  | "studyPlan"
  | "tracks"
  | "trackResults"
  | "trackPlans"
  | "activeTrackId"
>;

export const persistedSlice = (s: SamajhState): PersistedState => ({
  student: s.student,
  attempts: s.attempts,
  mastery: s.mastery,
  schedule: s.schedule,
  settings: s.settings,
  generated: s.generated,
  questionElo: s.questionElo,
  studyPlan: s.studyPlan,
  tracks: s.tracks,
  trackResults: s.trackResults,
  trackPlans: s.trackPlans,
  activeTrackId: s.activeTrackId,
});

export const freshMastery = (): Record<string, ConceptMastery> =>
  Object.fromEntries(
    CONCEPTS.map((c) => [c.id, { p: DEFAULT_P_INIT, estimated: true, suspect: false, history: [] }]),
  );

const initialData = () => ({
  student: { id: DEMO_STUDENT_ID, name: "Aarav", theta: DEFAULT_THETA, misconceptions: [], diagnosticDone: false },
  attempts: [] as Attempt[],
  mastery: freshMastery(),
  schedule: {} as Record<string, ReviewItem>,
  settings: { role: "student" as Role, offsetDays: 0, offline: false },
  generated: [] as Question[],
  questionElo: {} as Record<string, number>,
  studyPlan: null as StudyPlan | null,
  tracks: [] as CustomTrack[],
  trackResults: {} as Record<string, TrackResult>,
  trackPlans: {} as Record<string, StudyPlan>,
  activeTrackId: null as string | null,
});

const MAX_TRACKS = 12;

export const useStore = create<SamajhState>()(
  persist(
    (set) => ({
      ...initialData(),
      fx: [],
      fxSeq: 1,

      triggerFx: (...events) => set((s) => appendFx(s.fx, events, s.fxSeq, Date.now())),
      recordAttempt: (attempt) => set((s) => ({ attempts: [...s.attempts, attempt] })),
      setMastery: (conceptId, value) =>
        set((s) => {
          const wave = shockwaveFor(conceptId, s.mastery[conceptId]?.p ?? value.p, value.p);
          return { mastery: { ...s.mastery, [conceptId]: value }, ...(wave ? appendFx(s.fx, [wave], s.fxSeq, Date.now()) : {}) };
        }),
      setReview: (conceptId, item) => set((s) => ({ schedule: { ...s.schedule, [conceptId]: item } })),
      setTheta: (theta) => set((s) => ({ student: { ...s.student, theta } })),
      setStudentMisconceptions: (ids) =>
        set((s) => ({
          student: { ...s.student, misconceptions: ids },
          ...appendFx(s.fx, misconceptionFx(s.student.misconceptions, ids), s.fxSeq, Date.now()),
        })),
      applyOutcome: (o) =>
        set((s) => {
          const wave = shockwaveFor(o.conceptId, o.before, o.after);
          return {
            mastery: o.mastery,
            schedule: o.schedule,
            attempts: [...s.attempts, o.attempt],
            student: { ...s.student, theta: o.theta },
            questionElo: { ...s.questionElo, [o.attempt.questionId]: o.questionElo },
            ...(wave ? appendFx(s.fx, [wave], s.fxSeq, Date.now()) : {}),
          };
        }),
      applyDiagnostic: (o) =>
        set((s) => ({
          mastery: o.mastery,
          schedule: { ...s.schedule, ...o.schedule },
          attempts: [...s.attempts, ...o.attempts],
          // No fx here: the reveal canvas fires Ignition itself once it has mounted (see igniteOnMount).
          student: { ...s.student, theta: o.theta, misconceptions: o.misconceptions, diagnosticDone: true },
        })),
      addGeneratedQuestion: (q) => set((s) => ({ generated: [...s.generated.filter((g) => g.id !== q.id), q].slice(-40) })),
      completeDiagnostic: () =>
        set((s) => ({ student: { ...s.student, diagnosticDone: true }, ...appendFx(s.fx, [{ kind: "ignition" }], s.fxSeq, Date.now()) })),
      fastForward: (days = 3) => set((s) => ({ settings: { ...s.settings, offsetDays: s.settings.offsetDays + days } })),
      setRole: (role) => set((s) => ({ settings: { ...s.settings, role } })),
      setOffline: (offline) => set((s) => ({ settings: { ...s.settings, offline } })),

      loadDemoProfile: () =>
        set((s) => {
          const demo = generateDemoStudent(virtualNow(s.settings.offsetDays));
          return {
            student: { id: demo.id, name: demo.name, theta: demo.theta, misconceptions: demo.misconceptions, diagnosticDone: true },
            attempts: demo.attempts,
            mastery: demo.mastery,
            schedule: demo.schedule,
            questionElo: {},
            // The whole galaxy changes at once: reveal it with Ignition rather than 34 shockwaves.
            ...appendFx(s.fx, [{ kind: "ignition" }], s.fxSeq, Date.now()),
          };
        }),
      // Clears progress and the clock; the student's own custom tests stay (their results go).
      resetDemo: () => set((s) => ({ ...initialData(), student: { ...initialData().student, name: s.student.name }, tracks: s.tracks })),
      setStudyPlan: (plan) => set({ studyPlan: plan }),
      toggleStudyItem: (itemId) =>
        set((s) =>
          s.studyPlan
            ? { studyPlan: { ...s.studyPlan, items: s.studyPlan.items.map((v) => (v.id === itemId ? { ...v, done: !v.done } : v)) } }
            : {},
        ),
      addTrack: (track) => set((s) => ({ tracks: [track, ...s.tracks.filter((t) => t.id !== track.id)].slice(0, MAX_TRACKS), activeTrackId: track.id })),
      removeTrack: (trackId) =>
        set((s) => {
          const { [trackId]: _r, ...trackResults } = s.trackResults;
          const { [trackId]: _p, ...trackPlans } = s.trackPlans;
          void _r;
          void _p;
          return { tracks: s.tracks.filter((t) => t.id !== trackId), trackResults, trackPlans, activeTrackId: s.activeTrackId === trackId ? null : s.activeTrackId };
        }),
      setActiveTrack: (trackId) => set({ activeTrackId: trackId }),
      saveTrackResult: (result) => set((s) => ({ trackResults: { ...s.trackResults, [result.trackId]: result } })),
      setTrackPlan: (trackId, plan) => set((s) => ({ trackPlans: { ...s.trackPlans, [trackId]: plan } })),
      toggleTrackPlanItem: (trackId, itemId) =>
        set((s) => {
          const plan = s.trackPlans[trackId];
          if (!plan) return {};
          return { trackPlans: { ...s.trackPlans, [trackId]: { ...plan, items: plan.items.map((v) => (v.id === itemId ? { ...v, done: !v.done } : v)) } } };
        }),
      loadAccount: (account, saved) =>
        set((s) => {
          const base = initialData();
          const settings = { ...base.settings, ...saved?.settings, role: saved?.settings?.role ?? account.role, offline: false };
          return {
            ...base,
            ...saved,
            // Stored mastery may predate a concept added to the seed data.
            mastery: { ...base.mastery, ...saved?.mastery },
            student: { ...base.student, ...saved?.student, name: account.name },
            settings,
            ...appendFx(s.fx, [{ kind: "ignition" }], s.fxSeq, Date.now()),
          };
        }),
    }),
    {
      name: "samajh-v1",
      storage: createJSONStorage(() => localStorage),
      // Rehydrated explicitly on the client (StoreHydrator) to avoid SSR mismatches.
      skipHydration: true,
      partialize: persistedSlice,
    },
  ),
);

/** Explicit triggers for the signature 3D moments (they also fire automatically from state changes). */
export const fx = {
  ignite: () => useStore.getState().triggerFx({ kind: "ignition" }),
  strike: (conceptId: string, misconceptionId: string) => useStore.getState().triggerFx({ kind: "strike", conceptId, misconceptionId }),
  shatter: (conceptId: string, misconceptionId: string) => useStore.getState().triggerFx({ kind: "shatter", conceptId, misconceptionId }),
  shockwave: (conceptId: string, from: number, to: number) => useStore.getState().triggerFx({ kind: "shockwave", conceptId, from, to }),
};

const serverNull = () => null;

/** True after the persisted store has been rehydrated on the client (always false during SSR). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => useStore.persist.onFinishHydration(cb),
    () => useStore.persist.hasHydrated(),
    () => false,
  );
}

const MINUTE_MS = 60_000;
const subscribeMinute = (cb: () => void) => {
  const id = setInterval(cb, MINUTE_MS);
  return () => clearInterval(id);
};
/** Real time floored to the minute: a stable snapshot between ticks. */
const getMinute = () => Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS;

/** Real "now" floored to the minute; null on the server and before hydration. */
function useRealMinute(): number | null {
  const minute = useSyncExternalStore(subscribeMinute, getMinute, serverNull);
  return useHydrated() ? minute : null;
}

/** Virtual "now" in ms (null until hydrated). Updates on fast-forward and once a minute. */
export function useVirtualNow(): number | null {
  const offsetDays = useStore((s) => s.settings.offsetDays);
  const real = useRealMinute();
  return real === null ? null : addDays(real, offsetDays);
}

/** The synthetic class (seeded), anchored to the real today so fast-forward makes reviews overdue. */
export function useClassRoster(): StudentRecord[] | null {
  const real = useRealMinute();
  const day = real === null ? null : startOfDay(real);
  return useMemo(() => (day === null ? null : generateClass(day)), [day]);
}

export { dueConceptIds } from "@/lib/engine/sm2";
