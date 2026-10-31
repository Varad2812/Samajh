"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PerformanceMonitor } from "@react-three/drei";
import { QualityContext, SceneSignals, SignalsContext } from "@/components/fx/SceneSignals";
import { galaxyLayout, oneHop } from "@/lib/galaxy/layout";
import { GalaxyScene } from "./GalaxyScene";
import { usePerformanceFallback } from "./usePerformanceFallback";
import type { MiniGalaxyProps } from "./types";
import { useReducedMotion } from "./useReducedMotion";

const IDLE_AFTER_MS = 4000;

/** Frame the focus node and its 1-hop neighbours, viewed from outside the ring. */
function framing(ids: string[]): { position: THREE.Vector3; target: THREE.Vector3 } {
  const { positions } = galaxyLayout();
  const pts = ids.map((id) => new THREE.Vector3(...positions[id]));
  const target = pts.reduce((a, p) => a.add(p), new THREE.Vector3()).divideScalar(pts.length);
  const radius = Math.max(0.8, ...pts.map((p) => p.distanceTo(target)));
  const outward = new THREE.Vector3(target.x, 0, target.z).normalize();
  const dir = outward.multiplyScalar(0.8).add(new THREE.Vector3(0, 0.75, 0)).normalize();
  return { position: target.clone().add(dir.multiplyScalar(Math.max(8, radius * 3.6 + 3))), target };
}

/** Camera locked on the focus; eases to a new focus over ~800ms. No user controls. */
function MiniRig({ focusId, reducedMotion }: { focusId: string; reducedMotion: boolean }) {
  const camera = useThree((s) => s.camera);
  const goal = useMemo(() => framing(oneHop(focusId)), [focusId]);
  const look = useRef<THREE.Vector3 | null>(null);
  useFrame((_, dt) => {
    if (!look.current || reducedMotion) {
      camera.position.copy(goal.position);
      look.current = goal.target.clone();
    }
    const k = 1 - Math.exp(-dt / 0.2);
    camera.position.lerp(goal.position, k);
    look.current.lerp(goal.target, k);
    camera.lookAt(look.current);
  });
  return null;
}

export default function MiniGalaxyCanvas({ nodes, focusId, onSelect }: MiniGalaxyProps) {
  const reducedMotion = useReducedMotion();
  const hop = useMemo(() => new Set(oneHop(focusId)), [focusId]);
  const focusSet = useMemo(() => new Set([focusId]), [focusId]);

  // Render continuously after a change or while hovered; otherwise on demand (static frame).
  // Effects (shockwave, strike, shatter) always coincide with one of these changing, which wakes the render loop.
  const changeKey =
    focusId + "|" + [...hop].map((id) => `${nodes[id].p.toFixed(3)}${nodes[id].due ? "d" : ""}m${nodes[id].misconceptions}`).join(",");
  const [signals] = useState(() => new SceneSignals());
  const perf = usePerformanceFallback();
  const [idleKey, setIdleKey] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setIdleKey(changeKey), IDLE_AFTER_MS);
    return () => clearTimeout(id);
  }, [changeKey]);
  const idle = idleKey === changeKey && !hovered;

  return (
    <Canvas
      frameloop={idle ? "demand" : "always"}
      dpr={perf.quality.low ? 1 : [1, 2]}
      camera={{ fov: 42, near: 0.1, far: 120 }}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      aria-label={`Mini galaxy focused on ${focusId} and its neighbours`}
      data-quality={perf.quality.low ? "low" : "high"}
    >
      <SignalsContext.Provider value={signals}>
        <QualityContext.Provider value={perf.quality}>
          {!idle && <PerformanceMonitor bounds={perf.bounds} flipflops={3} onDecline={perf.onDecline} onIncline={perf.onIncline} onFallback={perf.onFallback} />}
          <GalaxyScene
            nodes={nodes}
            selectedId={focusId}
            visibleIds={hop}
            activeIds={focusSet}
            reducedMotion={reducedMotion}
            compact
            onSelect={onSelect}
          />
          <MiniRig focusId={focusId} reducedMotion={reducedMotion} />
        </QualityContext.Provider>
      </SignalsContext.Provider>
    </Canvas>
  );
}
