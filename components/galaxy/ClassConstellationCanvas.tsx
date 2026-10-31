"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { glowTexture } from "@/components/fx/glowTexture";
import { TextSprite } from "@/components/lab/TextSprite";
import { CONCEPTS } from "@/lib/data/concepts";
import { galaxyLayout } from "@/lib/galaxy/layout";
import type { GalaxyNodes } from "@/lib/galaxy/nodes";
import { conceptMeans, misconceptionShareByConcept, stormConcepts } from "@/lib/teacher/stats";
import type { StudentRecord } from "@/lib/types";
import { TOKENS } from "@/lib/utils";
import KnowledgeGalaxyCanvas from "./KnowledgeGalaxyCanvas";

const pillarHeight = (share: number) => 0.25 + share * 4.5;

/** Violet light pillar rising from a node; height = share of students holding a misconception there. */
function Pillar({ at, share }: { at: [number, number, number]; share: number }) {
  const h = pillarHeight(share);
  return (
    <group position={at}>
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[0.07, 0.11, h, 16, 1, true]} />
        <meshBasicMaterial color={TOKENS.misconception} transparent opacity={0.28 + share * 0.5} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <sprite position={[0, h, 0]} scale={[0.45, 0.45, 1]}>
        <spriteMaterial map={glowTexture()} color={TOKENS.misconception} transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      {share >= 0.1 && <TextSprite text={`${Math.round(share * 100)}%`} position={[0, h + 0.32, 0]} height={0.022} screenSpace color={TOKENS.misconception} />}
    </group>
  );
}

const CLOUD_POINTS = 260;

/** Swirling violet particle cluster with occasional lightning flickers, hovering over a pillar. */
function StormCloud({ at, seed }: { at: [number, number, number]; seed: number }) {
  const spin = useRef<THREE.Group>(null);
  const flash = useRef<THREE.SpriteMaterial>(null);
  const geom = useMemo(() => {
    const pts = new Float32Array(CLOUD_POINTS * 3);
    for (let i = 0; i < CLOUD_POINTS; i++) {
      const a = (i * 2.399 + seed) % (Math.PI * 2);
      const r = Math.sqrt(((i * 0.618 + seed * 0.1) % 1)) * 1.1;
      pts[i * 3] = Math.cos(a) * r;
      pts[i * 3 + 1] = (((i * 0.377) % 1) - 0.5) * 0.45 * (1.2 - r * 0.6);
      pts[i * 3 + 2] = Math.sin(a) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    return g;
  }, [seed]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (spin.current) {
      spin.current.rotation.y = t * 0.35 + seed;
      spin.current.position.y = Math.sin(t * 0.8 + seed) * 0.08;
    }
    if (flash.current) {
      const tick = Math.floor(t * 7 + seed * 13);
      const strike = Math.abs(Math.sin(tick * 12.9898 + seed) * 43758.5453) % 1 > 0.93;
      flash.current.opacity = strike ? 0.9 : Math.max(0, flash.current.opacity - 0.08);
    }
  });
  return (
    <group position={at}>
      <group ref={spin}>
        <points geometry={geom}>
          <pointsMaterial map={glowTexture()} color={TOKENS.misconception} size={0.22} sizeAttenuation transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </points>
      </group>
      <sprite scale={[2.2, 1.1, 1]}>
        <spriteMaterial ref={flash} map={glowTexture()} color="#d9ccff" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
    </group>
  );
}

interface Props {
  roster: StudentRecord[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

/** Teacher "Class Constellation" (DESIGN.md §4.2 item 6): node colour = class mean, pillars = misconception share. */
export default function ClassConstellationCanvas({ roster, selectedId, onSelect }: Props) {
  const means = useMemo(() => conceptMeans(roster), [roster]);
  const share = useMemo(() => misconceptionShareByConcept(roster), [roster]);
  const storms = useMemo(() => stormConcepts(roster), [roster]);
  const nodes = useMemo<GalaxyNodes>(
    () => Object.fromEntries(CONCEPTS.map((c) => [c.id, { p: means[c.id], estimated: false, due: false, misconceptions: 0 }])),
    [means],
  );
  const { positions } = galaxyLayout();

  return (
    <KnowledgeGalaxyCanvas nodes={nodes} selectedId={selectedId} onSelect={onSelect}>
      {CONCEPTS.filter((c) => share[c.id] > 0).map((c) => (
        <Pillar key={c.id} at={positions[c.id]} share={share[c.id]} />
      ))}
      {storms.map((id, i) => {
        const [x, y, z] = positions[id];
        return <StormCloud key={id} at={[x, y + pillarHeight(share[id]) + 0.85, z]} seed={i * 1.7 + 0.4} />;
      })}
    </KnowledgeGalaxyCanvas>
  );
}
