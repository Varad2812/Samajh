"use client";

import { useMemo, useState } from "react";
import type { Quality } from "@/components/fx/SceneSignals";

/** Average FPS below this → low quality (DESIGN.md §4.3). */
const LOW_FPS = 45;

/**
 * drei PerformanceMonitor wiring: below ~45fps drop to low quality (half dust, no chromatic aberration, DPR 1);
 * recover when comfortably fast; give up flip-flopping after 3 changes. `?lowfx` forces low quality.
 */
export function usePerformanceFallback() {
  const [forced] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("lowfx"));
  const [low, setLow] = useState(forced);
  const [locked, setLocked] = useState(forced);
  const quality: Quality = useMemo(() => ({ low }), [low]);
  return {
    quality,
    bounds: (refreshRate: number): [number, number] => [LOW_FPS, Math.max(LOW_FPS + 5, refreshRate * 0.9)],
    onDecline: () => !locked && setLow(true),
    onIncline: () => !locked && setLow(false),
    onFallback: () => {
      setLocked(true);
      setLow(true);
    },
  };
}
