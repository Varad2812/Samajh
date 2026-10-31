"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { CameraRig, HOME_POSITION } from "./CameraRig";
import { GalaxyScene } from "./GalaxyScene";
import type { GalaxyProps } from "./types";
import { useReducedMotion } from "./useReducedMotion";

const NONE: ReadonlySet<string> = new Set();

export default function KnowledgeGalaxyCanvas({ nodes, selectedId, onSelect, highlightIds = null, resetKey = 0 }: GalaxyProps) {
  const reducedMotion = useReducedMotion();
  const activeIds = useMemo(() => (selectedId ? new Set([selectedId]) : NONE), [selectedId]);
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: HOME_POSITION.toArray(), fov: 45, near: 0.1, far: 200 }}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      onPointerMissed={() => onSelect?.(null)}
      aria-label="Knowledge Galaxy: 3D map of concepts coloured by mastery"
    >
      <GalaxyScene
        nodes={nodes}
        selectedId={selectedId}
        visibleIds={highlightIds}
        activeIds={activeIds}
        reducedMotion={reducedMotion}
        onSelect={(id) => onSelect?.(id)}
      />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} enablePan={false} minDistance={2.5} maxDistance={34} rotateSpeed={0.6} autoRotateSpeed={0.35} />
      <CameraRig selectedId={selectedId} resetKey={resetKey} reducedMotion={reducedMotion} />
    </Canvas>
  );
}
