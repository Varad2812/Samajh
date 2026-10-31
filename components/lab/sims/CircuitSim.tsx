"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { glowTexture } from "@/components/fx/glowTexture";
import { bulbBrightness, seriesReadings } from "@/lib/lab/physics";
import { TOKENS } from "@/lib/utils";
import { TextSprite } from "../TextSprite";
import type { LabSim, LabSimProps } from "../types";

// Loop: battery on the left edge, bulb 1 on the top wire, bulb 2 on the right edge. Current flows + → up → right → down → left.
const W = 2.4;
const H = 1.3;
const CORNERS: [number, number][] = [[-W, 0], [-W, H], [W, H], [W, -H], [-W, -H], [-W, 0]];
const SEG = CORNERS.slice(1).map((p, i) => Math.hypot(p[0] - CORNERS[i][0], p[1] - CORNERS[i][1]));
const LENGTH = SEG.reduce((a, b) => a + b, 0);

function pointAt(s: number): [number, number] {
  let d = ((s % LENGTH) + LENGTH) % LENGTH;
  for (let i = 0; i < SEG.length; i++) {
    if (d <= SEG[i]) {
      const [x0, y0] = CORNERS[i];
      const [x1, y1] = CORNERS[i + 1];
      const t = d / SEG[i];
      return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
    }
    d -= SEG[i];
  }
  return CORNERS[0];
}

// Positions along the loop (arc length from the + terminal).
const S_BULB1 = H + (W - 0.6);
const S_BULB2 = H + 2 * W + H;
const AMMETERS: { s: number; label: string }[] = [
  { s: H + 0.7, label: "A1" },
  { s: H + 2 * W + 0.45, label: "A2" },
  { s: H + 2 * W + 2 * H + W, label: "A3" },
];

const N = 120;
const SPEED = 0.9;
const WIRE_POINTS = CORNERS.map(([x, y]) => new THREE.Vector3(x, y, 0));
/** Deterministic per-particle "survival" draw for the used-up picture. */
const KEEP = Array.from({ length: N }, (_, i) => ((i * 0.618034) % 1));

function Charges({ variant, reducedMotion }: LabSimProps) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    return g;
  }, []);
  const [, a2, a3] = seriesReadings(variant);
  const keep2 = a2 / seriesReadings(variant)[0];
  const keep3 = a3 / seriesReadings(variant)[0];
  const points = useRef<THREE.Points>(null);
  useFrame(({ clock }) => {
    if (!points.current) return;
    const t = reducedMotion ? 0 : clock.elapsedTime;
    const pos = points.current.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < N; i++) {
      const s = ((i / N) * LENGTH + t * SPEED) % LENGTH;
      // Misconception: charges vanish after each bulb ("used up") and the battery makes new ones.
      const visible = s < S_BULB1 ? true : s < S_BULB2 ? KEEP[i] < keep2 : KEEP[i] < keep3;
      const [x, y] = pointAt(s);
      pos.setXYZ(i, x, y, visible ? 0.02 : 1000);
    }
    pos.needsUpdate = true;
  });
  return (
    <points ref={points} geometry={geom} frustumCulled={false}>
      <pointsMaterial map={glowTexture()} color={TOKENS.accent} size={0.2} sizeAttenuation transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  );
}

/** Energy leaving a bulb as light/heat: sparks streaming outward, fading (vertex colours under additive blending). */
function EnergyGlow({ at, reducedMotion }: { at: [number, number]; reducedMotion: boolean }) {
  const M = 36;
  const { geom, dirs } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(M * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(M * 3), 3));
    const d = Array.from({ length: M }, (_, i) => {
      const a = i * 2.39996;
      const z = ((i * 0.37) % 1) * 2 - 1;
      const r = Math.sqrt(1 - z * z);
      return new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, z);
    });
    return { geom: g, dirs: d };
  }, []);
  const warm = useMemo(() => new THREE.Color(TOKENS.developing), []);
  const points = useRef<THREE.Points>(null);
  useFrame(({ clock }) => {
    if (!points.current) return;
    const t = reducedMotion ? 0.5 : clock.elapsedTime;
    const pos = points.current.geometry.attributes.position as THREE.BufferAttribute;
    const col = points.current.geometry.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < M; i++) {
      const life = (t * 0.55 + i / M) % 1;
      const r = 0.35 + life * 1.1;
      pos.setXYZ(i, at[0] + dirs[i].x * r, at[1] + dirs[i].y * r, dirs[i].z * r);
      const f = (1 - life) * 0.9;
      col.setXYZ(i, warm.r * f, warm.g * f, warm.b * f);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
  });
  return (
    <points ref={points} geometry={geom} frustumCulled={false}>
      <pointsMaterial map={glowTexture()} vertexColors size={0.14} sizeAttenuation transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  );
}

function Bulb({ at, brightness, label, labelAt = [0, 0.62] }: { at: [number, number]; brightness: number; label: string; labelAt?: [number, number] }) {
  const glass = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (glass.current) glass.current.emissiveIntensity = 0.25 + 2.4 * brightness * (1 + 0.03 * Math.sin(clock.elapsedTime * 9));
  });
  return (
    <group position={[at[0], at[1], 0]}>
      <mesh>
        <sphereGeometry args={[0.3, 32, 24]} />
        <meshStandardMaterial ref={glass} color="#2a2416" emissive="#FFD27A" emissiveIntensity={0.25 + 2.4 * brightness} toneMapped={false} />
      </mesh>
      <sprite scale={[0.6 + 1.7 * brightness, 0.6 + 1.7 * brightness, 1]}>
        <spriteMaterial map={glowTexture()} color="#FFD27A" transparent opacity={0.15 + 0.6 * brightness} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <TextSprite text={`${label} · ${Math.round(brightness * 100)}%`} position={[labelAt[0], labelAt[1], 0]} height={0.17} />
    </group>
  );
}

function Battery() {
  return (
    <group position={[-W, 0, 0]}>
      <mesh position={[0, 0.09, 0]}>
        <boxGeometry args={[0.7, 0.05, 0.3]} />
        <meshStandardMaterial color="#d8dbe6" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.09, 0]}>
        <boxGeometry args={[0.38, 0.11, 0.3]} />
        <meshStandardMaterial color="#5a6074" metalness={0.5} roughness={0.4} />
      </mesh>
      <TextSprite text="+" position={[-0.55, 0.12, 0]} height={0.2} color={TOKENS.weak} background={null} />
      <TextSprite text="−" position={[-0.55, -0.12, 0]} height={0.2} color={TOKENS.accent} background={null} />
      <TextSprite text="Battery" position={[-0.95, -0.42, 0]} height={0.14} color={TOKENS.muted} background={null} />
    </group>
  );
}

function CircuitScene(props: LabSimProps) {
  const { variant, reducedMotion } = props;
  const readings = seriesReadings(variant);
  const [b1, b2] = bulbBrightness(variant);
  const bulb1: [number, number] = pointAt(S_BULB1);
  const bulb2: [number, number] = pointAt(S_BULB2);
  return (
    <group>
      <Line points={WIRE_POINTS} color="#7d849b" lineWidth={2.5} />
      <Battery />
      <Bulb at={bulb1} brightness={b1} label="Bulb 1" />
      <Bulb at={bulb2} brightness={b2} label="Bulb 2" labelAt={[-1.05, 0]} />
      <Charges {...props} />
      {variant === "real" && (
        <>
          <EnergyGlow at={bulb1} reducedMotion={reducedMotion} />
          <EnergyGlow at={bulb2} reducedMotion={reducedMotion} />
        </>
      )}
      {AMMETERS.map((m, i) => {
        const [x, y] = pointAt(m.s);
        const off: [number, number] = Math.abs(y) > H - 0.01 ? [0, y > 0 ? 0.42 : -0.42] : [x > 0 ? 0.62 : -0.62, 0];
        return (
          <group key={m.label}>
            <mesh position={[x, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.17, 0.17, 0.1, 24]} />
              <meshStandardMaterial color="#151826" emissive={variant === "real" ? TOKENS.mastered : i === 0 ? TOKENS.mastered : TOKENS.weak} emissiveIntensity={0.5} />
            </mesh>
            <TextSprite text={`${m.label} ${readings[i].toFixed(2)} A`} position={[x + off[0], y + off[1], 0]} height={0.17} color={variant === "real" || i === 0 ? TOKENS.mastered : TOKENS.weak} />
          </group>
        );
      })}
    </group>
  );
}

export const circuitSim: LabSim = {
  mcId: "MC01",
  title: "Current in a series circuit",
  camera: [0.2, 0.5, 9.4],
  said: "Bulb 1 uses up some current, so less reaches bulb 2 and it glows dimmer. The ammeters would read less and less.",
  real: "The same current flows everywhere in the loop: every ammeter reads 0.50 A. Energy, not charge, leaves each bulb as light and heat, so identical bulbs glow equally.",
  Scene: CircuitScene,
};
