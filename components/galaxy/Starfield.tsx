"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Stars } from "@react-three/drei";
import type * as THREE from "three";
import { useSignals } from "@/components/fx/SceneSignals";
import { CHAPTERS } from "@/lib/data/concepts";
import { IGNITION } from "@/lib/galaxy/ignition";
import { CHAPTER_COLOR, galaxyLayout } from "@/lib/galaxy/layout";

/** Distant drei stars; hidden until the big bang during Ignition. */
export function Starfield({ reducedMotion, count = 3500 }: { reducedMotion: boolean; count?: number }) {
  const group = useRef<THREE.Group>(null);
  const signals = useSignals();
  useFrame((state) => {
    if (group.current) group.current.visible = signals.ignitionElapsed(state.clock.elapsedTime) >= IGNITION.starsAt;
  });
  return (
    <group ref={group}>
      <Stars radius={70} depth={40} count={count} factor={3} saturation={0} fade speed={reducedMotion ? 0 : 0.6} />
    </group>
  );
}

/** Chapter names floating above each cluster. Kept mounted (fading) to avoid Html portal churn. */
export function ClusterLabels({ hidden = false }: { hidden?: boolean }) {
  const { clusterCenters } = galaxyLayout();
  return (
    <>
      {CHAPTERS.map((ch) => {
        const [x, y, z] = clusterCenters[ch.id];
        return (
          <Html key={ch.id} position={[x, y + 2.6, z]} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
            <div
              className="label-caps whitespace-nowrap transition-opacity duration-500"
              style={{ color: CHAPTER_COLOR[ch.id], opacity: hidden ? 0 : 0.85 }}
            >
              {ch.short === "Elec" ? "Electricity" : ch.short === "Mag" ? "Magnetism" : ch.short}
            </div>
          </Html>
        );
      })}
    </>
  );
}
