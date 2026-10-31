"use client";

import { createContext, useContext } from "react";
import { IGNITION } from "@/lib/galaxy/ignition";

/**
 * Per-canvas mutable signals read inside useFrame (no React re-renders):
 * ignition timing (in canvas-clock seconds) and fly-to intensity for the post stack.
 */
export class SceneSignals {
  private igStart: number | null = null;
  private igPending = false;
  private skipPending = false;
  private flyAmount = 0;

  requestIgnition(): void {
    this.igPending = true;
  }

  requestSkip(): void {
    this.skipPending = true;
  }

  /** Called once per frame by the IgnitionDirector. */
  tick(t: number): void {
    if (this.igPending) {
      this.igStart = t;
      this.igPending = false;
      this.skipPending = false;
    }
    if (this.skipPending && this.igStart !== null) this.igStart = Math.min(this.igStart, t - IGNITION.duration);
    this.skipPending = false;
  }

  /** Seconds since ignition started; Infinity when no ignition is running (everything fully revealed). */
  ignitionElapsed(t: number): number {
    if (this.igPending) return 0;
    if (this.igStart === null) return Infinity;
    const el = t - this.igStart;
    return el >= IGNITION.duration ? Infinity : el;
  }

  setFly(v: number): void {
    this.flyAmount = v;
  }

  get fly(): number {
    return this.flyAmount;
  }
}

const IDLE = new SceneSignals();
export const SignalsContext = createContext<SceneSignals>(IDLE);
export const useSignals = (): SceneSignals => useContext(SignalsContext);

export interface Quality {
  /** Set by PerformanceMonitor below ~45fps: half the dust, no chromatic aberration, DPR 1. */
  low: boolean;
}
export const QualityContext = createContext<Quality>({ low: false });
export const useQuality = (): Quality => useContext(QualityContext);
