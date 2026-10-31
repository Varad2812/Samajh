"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges, Line } from "@react-three/drei";
import * as THREE from "three";
import { glowTexture } from "@/components/fx/glowTexture";
import { N_GLASS, refractionAngle, wrongRefractionAngle } from "@/lib/lab/physics";
import { TOKENS } from "@/lib/utils";
import { TextSprite } from "../TextSprite";
import type { LabSim, LabSimProps } from "../types";

const DEG = Math.PI / 180;
const IN_LEN = 2.8;
const DEPTH = 2.2;
const BEAM = "#FFE08A";

/** Points on an arc of radius r from the normal (angle 0) to `deg`, on the side given by sx (−1 left) and sy (+1 up). */
function arc(deg: number, r: number, sx: number, sy: number): THREE.Vector3[] {
  const n = Math.max(2, Math.ceil(deg / 3));
  return Array.from({ length: n + 1 }, (_, k) => {
    const a = (deg * DEG * k) / n;
    return new THREE.Vector3(sx * Math.sin(a) * r, sy * Math.cos(a) * r, 0.01);
  });
}

/** Light pulses travelling along the incident then refracted ray. */
function Photons({ start, end, reducedMotion }: { start: THREE.Vector3; end: THREE.Vector3; reducedMotion: boolean }) {
  const M = 14;
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(M * 3), 3));
    return g;
  }, []);
  const points = useRef<THREE.Points>(null);
  useFrame(({ clock }) => {
    if (!points.current) return;
    const pos = points.current.geometry.attributes.position as THREE.BufferAttribute;
    const lenA = start.length();
    const lenB = end.length();
    for (let i = 0; i < M; i++) {
      const u = ((reducedMotion ? 0 : clock.elapsedTime * 0.35) + i / M) % 1;
      // Light is slower in glass (v = c/n): the glass leg takes n times longer, so pulses bunch up there.
      const tt = u * (lenA + lenB * N_GLASS);
      const p = tt < lenA ? start.clone().multiplyScalar(1 - tt / lenA) : end.clone().multiplyScalar((tt - lenA) / (lenB * N_GLASS));
      pos.setXYZ(i, p.x, p.y, 0.02);
    }
    pos.needsUpdate = true;
  });
  return (
    <points ref={points} geometry={geom} frustumCulled={false}>
      <pointsMaterial map={glowTexture()} color={BEAM} size={0.22} sizeAttenuation transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  );
}

function RefractionScene({ variant, param, reducedMotion }: LabSimProps) {
  const i = param;
  const r = variant === "real" ? refractionAngle(i) : wrongRefractionAngle(i);
  const start = new THREE.Vector3(-Math.sin(i * DEG) * IN_LEN, Math.cos(i * DEG) * IN_LEN, 0);
  const outLen = Math.min(2.8, DEPTH / Math.max(Math.cos(r * DEG), 0.05));
  const end = new THREE.Vector3(Math.sin(r * DEG) * outLen, -Math.cos(r * DEG) * outLen, 0);
  const good = variant === "real";
  const tone = good ? TOKENS.mastered : TOKENS.weak;

  return (
    <group position={[0, 0.3, 0]}>
      {/* Glass block, top face at y = 0 */}
      <mesh position={[0, -DEPTH / 2, 0]}>
        <boxGeometry args={[6.4, DEPTH, 2]} />
        <meshStandardMaterial color={TOKENS.accent} transparent opacity={0.1} roughness={0.1} depthWrite={false} />
        <Edges color="#5fb7d6" />
      </mesh>
      <TextSprite text="Air · n = 1.00" position={[2.3, 0.45, 0]} height={0.17} color={TOKENS.muted} background={null} />
      <TextSprite text={`Glass · n = ${N_GLASS.toFixed(2)}`} position={[2.2, -0.45, 0]} height={0.17} color={TOKENS.accent} background={null} />

      {/* Normal */}
      <Line points={[[0, 2.2, 0], [0, -DEPTH, 0]]} color="#8A90A6" lineWidth={1.2} dashed dashSize={0.12} gapSize={0.09} />
      <TextSprite text="normal" position={[0.38, 2.05, 0]} height={0.13} color={TOKENS.muted} background={null} />

      {/* Rays */}
      <Line points={[start, new THREE.Vector3(0, 0, 0)]} color={BEAM} lineWidth={4} />
      <Line points={[new THREE.Vector3(0, 0, 0), end]} color={good ? BEAM : "#ff9aa9"} lineWidth={4} />
      <Photons start={start} end={end} reducedMotion={reducedMotion} />

      {/* Angles */}
      <Line points={arc(i, 0.75, -1, 1)} color={BEAM} lineWidth={1.5} />
      <Line points={arc(r, 0.75, 1, -1)} color={tone} lineWidth={1.5} />
      <TextSprite text={`i = ${i.toFixed(0)}°`} position={[-Math.sin((i / 2) * DEG) * 1.15 - 0.15, Math.cos((i / 2) * DEG) * 1.15, 0]} height={0.17} color={BEAM} />
      <TextSprite text={`r = ${r.toFixed(1)}°`} position={[Math.sin((r / 2) * DEG) * 1.2 + 0.2, -Math.cos((r / 2) * DEG) * 1.2, 0]} height={0.17} color={tone} />
      <TextSprite
        text={good ? "Bends towards the normal  ✓  (sin i = 1.5 sin r)" : "Bends away from the normal  ✗"}
        position={[0, -DEPTH - 0.45, 0]}
        height={0.17}
        color={tone}
      />
    </group>
  );
}

export const refractionSim: LabSim = {
  mcId: "MC11",
  title: "Light entering a glass block",
  camera: [0, 0.2, 8.6],
  control: { kind: "slider", label: "Angle of incidence", min: 0, max: 80, step: 1, initial: 40, format: (v) => `${v.toFixed(0)}°` },
  said: "Entering the denser glass, the ray bends away from the normal, so r would be bigger than i.",
  real: "Light slows down in glass (v = c/n), so it bends towards the normal: n₁ sin i = n₂ sin r gives r < i. At 0° it goes straight through.",
  Scene: RefractionScene,
};
