"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Stars } from "@react-three/drei";
import type * as THREE from "three";
import { useSignals } from "@/components/fx/SceneSignals";
import { CHAPTERS, CONCEPT_BY_ID } from "@/lib/data/concepts";
import { IGNITION } from "@/lib/galaxy/ignition";
import { CHAPTER_COLOR, galaxyLayout, nodeRadius } from "@/lib/galaxy/layout";
import { fmt2, masteryColor, TOKENS } from "@/lib/utils";
import type { GalaxyNodeData } from "./types";

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

/**
 * Label of the selected node. One Html, always mounted, that moves between nodes: unmounting drei Html while
 * the selection changes mid-render throws removeChild errors.
 */
export function SelectedLabel({ id, data }: { id: string | null; data: GalaxyNodeData | null }) {
  const { positions } = galaxyLayout();
  const concept = id ? CONCEPT_BY_ID[id] : null;
  const [x, y, z] = id ? positions[id] : [0, 0, 0];
  const r = concept ? nodeRadius(concept.weight) : 0;
  return (
    <Html position={[x, y + r + 0.32, z]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
      <div
        className="flex items-center gap-1.5 rounded-md border border-border bg-surface/90 px-2 py-1 text-xs whitespace-nowrap shadow-highlight backdrop-blur transition-opacity duration-200"
        style={{ opacity: concept && data ? 1 : 0 }}
      >
        {concept && data && (
          <>
            <span className="font-mono text-muted-foreground">{concept.id}</span>
            <span>{concept.name}</span>
            <span className="font-mono tabular" style={{ color: data.estimated ? TOKENS.muted : masteryColor(data.p) }}>
              {data.estimated ? "est." : ""} {fmt2(data.p)}
            </span>
          </>
        )}
      </div>
    </Html>
  );
}
