"use client";

import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerformanceMonitor } from "@react-three/drei";
import { SkipForward } from "lucide-react";
import { IgnitionDirector } from "@/components/fx/IgnitionDirector";
import { QualityContext, SceneSignals, SignalsContext } from "@/components/fx/SceneSignals";
import { IGNITION } from "@/lib/galaxy/ignition";
import { useStore } from "@/lib/store";
import { BASE_FOV, CameraRig, HOME_POSITION } from "./CameraRig";
import { GalaxyScene } from "./GalaxyScene";
import { StudyPath } from "./StudyPath";
import type { GalaxyProps } from "./types";
import { usePerformanceFallback } from "./usePerformanceFallback";
import { useReducedMotion } from "./useReducedMotion";

const NONE: ReadonlySet<string> = new Set();

/** Plays Ignition for ignition events that arrive while mounted; exposes skip. */
function useIgnition(signals: SceneSignals, reducedMotion: boolean) {
  const [ignitionId, setIgnitionId] = useState<number | null>(null);
  const [igniting, setIgniting] = useState(false);
  useEffect(() => {
    let lastId = useStore.getState().fxSeq - 1;
    let timer: number | undefined;
    const unsub = useStore.subscribe((s) => {
      const fresh = s.fx.filter((e) => e.id > lastId);
      if (fresh.length === 0) return;
      lastId = fresh[fresh.length - 1].id;
      const ig = fresh.findLast((e) => e.kind === "ignition");
      if (!ig || reducedMotion) return;
      signals.requestIgnition();
      setIgnitionId(ig.id);
      setIgniting(true);
      clearTimeout(timer);
      timer = window.setTimeout(() => setIgniting(false), IGNITION.duration * 1000);
    });
    return () => {
      unsub();
      clearTimeout(timer);
    };
  }, [signals, reducedMotion]);
  const skip = () => {
    signals.requestSkip();
    setIgniting(false);
  };
  return { ignitionId, igniting, skip };
}

export default function KnowledgeGalaxyCanvas({ nodes, selectedId, onSelect, highlightIds = null, pathIds = null, resetKey = 0, igniteOnMount = false, children }: GalaxyProps) {
  const reducedMotion = useReducedMotion();
  const [signals] = useState(() => new SceneSignals());
  const perf = usePerformanceFallback();
  const { ignitionId, igniting, skip } = useIgnition(signals, reducedMotion);
  const activeIds = useMemo(() => (selectedId ? new Set([selectedId]) : NONE), [selectedId]);

  return (
    <>
      <Canvas
        dpr={perf.quality.low ? 1 : [1, 2]}
        camera={{ position: HOME_POSITION.toArray(), fov: BASE_FOV, near: 0.1, far: 200 }}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        onPointerDown={() => igniting && skip()}
        onPointerMissed={() => onSelect?.(null)}
        // The diagnostic reveal mounts this canvas and wants Ignition once the renderer exists.
        onCreated={() => igniteOnMount && window.setTimeout(() => useStore.getState().triggerFx({ kind: "ignition" }), 0)}
        aria-label="Knowledge Galaxy: 3D map of concepts coloured by mastery"
        data-quality={perf.quality.low ? "low" : "high"}
      >
        <SignalsContext.Provider value={signals}>
          <QualityContext.Provider value={perf.quality}>
            <PerformanceMonitor bounds={perf.bounds} flipflops={3} onDecline={perf.onDecline} onIncline={perf.onIncline} onFallback={perf.onFallback} />
            <GalaxyScene
              nodes={nodes}
              selectedId={selectedId}
              visibleIds={highlightIds}
              activeIds={activeIds}
              reducedMotion={reducedMotion}
              igniting={igniting}
              onSelect={(id) => onSelect?.(id)}
            />
            {pathIds && pathIds.length > 0 && <StudyPath ids={pathIds} reducedMotion={reducedMotion} />}
            {children}
            <IgnitionDirector ignitionId={ignitionId} />
            <OrbitControls makeDefault enableDamping dampingFactor={0.08} enablePan={false} minDistance={2.5} maxDistance={34} rotateSpeed={0.6} autoRotateSpeed={0.35} />
            <CameraRig selectedId={selectedId} resetKey={resetKey} reducedMotion={reducedMotion} />
          </QualityContext.Provider>
        </SignalsContext.Provider>
      </Canvas>
      {igniting && (
        <button
          onClick={skip}
          className="absolute right-3 bottom-3 z-20 flex items-center gap-1.5 rounded-lg border border-border bg-surface-2/80 px-2.5 py-1.5 text-xs text-muted-foreground backdrop-blur transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          Skip intro <SkipForward className="size-3.5" aria-hidden />
        </button>
      )}
    </>
  );
}
