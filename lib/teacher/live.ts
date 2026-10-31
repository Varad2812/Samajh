"use client";

/** Teacher dashboard: poll the real class from the database every few seconds. */
import { useEffect, useState } from "react";
import { DEFAULT_THETA, freshMastery } from "@/lib/store";
import type { Attempt, ConceptMastery, ReviewItem, StudentRecord } from "@/lib/types";

export const POLL_MS = 5000;

export interface LiveTest {
  id: string;
  title: string;
  subject: string;
  standard: string;
  correct: number;
  total: number;
  finishedAt: number;
}

interface ApiStudent {
  id: string;
  name: string;
  email: string;
  updatedAt: number | null;
  theta: number | null;
  misconceptions: string[];
  diagnosticDone: boolean;
  mastery: Record<string, ConceptMastery>;
  schedule: Record<string, ReviewItem>;
  attempts: Attempt[];
  tests: LiveTest[];
}

export interface LiveStudent {
  record: StudentRecord;
  email: string;
  updatedAt: number | null;
  tests: LiveTest[];
}

export interface LiveClass {
  students: LiveStudent[] | null;
  /** Server time of the last successful poll. */
  at: number | null;
  error: string | null;
}

function toLive(s: ApiStudent): LiveStudent {
  const mastery = { ...freshMastery(), ...s.mastery };
  const measured = Object.values(mastery).filter((m) => !m.estimated);
  const mean = measured.length ? measured.reduce((a, m) => a + m.p, 0) / measured.length : 0.5;
  return {
    record: {
      id: s.id,
      name: s.name,
      profile: mean > 0.65 ? "strong" : mean < 0.4 ? "struggling" : "average",
      theta: s.theta ?? DEFAULT_THETA,
      mastery,
      misconceptions: s.misconceptions,
      attempts: s.attempts,
      schedule: s.schedule,
    },
    email: s.email,
    updatedAt: s.updatedAt,
    tests: s.tests,
  };
}

export function useLiveClass(enabled: boolean): LiveClass {
  const [state, setState] = useState<LiveClass>({ students: null, at: null, error: null });
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let timer: number | undefined;
    const poll = async () => {
      if (document.visibilityState === "visible") {
        try {
          const res = await fetch("/api/teacher/class", { cache: "no-store" });
          if (!res.ok) throw new Error(res.status === 403 ? "Teachers only" : `HTTP ${res.status}`);
          const body = (await res.json()) as { students: ApiStudent[]; at: number };
          if (!stopped) setState({ students: body.students.map(toLive), at: body.at, error: null });
        } catch (err) {
          if (!stopped) setState((s) => ({ ...s, error: err instanceof Error ? err.message : "unreachable" }));
        }
      }
      if (!stopped) timer = window.setTimeout(poll, POLL_MS);
    };
    void poll();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [enabled]);
  return state;
}
