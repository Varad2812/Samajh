"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { TextSprite } from "@/components/lab/TextSprite";
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

/** Chapter names floating above each cluster (canvas-texture sprites, faded out during Ignition). */
export function ClusterLabels({ hidden = false }: { hidden?: boolean }) {
  const { clusterCenters } = galaxyLayout();
  return (
    <>
      {CHAPTERS.map((ch) => {
        const [x, y, z] = clusterCenters[ch.id];
        return (
          <TextSprite
            key={ch.id}
            text={(ch.short === "Elec" ? "Electricity" : ch.short === "Mag" ? "Magnetism" : ch.short).toUpperCase()}
            position={[x, y + 2.6, z]}
            height={0.026}
            screenSpace
            color={CHAPTER_COLOR[ch.id]}
            background={null}
            weight={500}
            opacity={hidden ? 0 : 0.85}
          />
        );
      })}
    </>
  );
}

/** Label of the selected node, as a canvas-texture sprite (no DOM). */
export function SelectedLabel({ id, data }: { id: string | null; data: GalaxyNodeData | null }) {
  const { positions } = galaxyLayout();
  if (!id || !data) return null;
  const concept = CONCEPT_BY_ID[id];
  const [x, y, z] = positions[id];
  return (
    <TextSprite
      text={`${concept.id}  ${concept.name}  ${data.estimated ? "est. " : ""}${fmt2(data.p)}`}
      position={[x, y + nodeRadius(concept.weight) + 0.42, z]}
      height={0.024}
      screenSpace
      color={data.estimated ? TOKENS.text : masteryColor(data.p)}
    />
  );
}
