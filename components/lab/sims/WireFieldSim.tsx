"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { glowTexture } from "@/components/fx/glowTexture";
import { fieldDirection } from "@/lib/lab/physics";
import { TOKENS } from "@/lib/utils";
import { TextSprite } from "../TextSprite";
import type { LabSim, LabSimProps } from "../types";

const RINGS = [{ r: 1.1, n: 8 }, { r: 1.9, n: 12 }, { r: 2.7, n: 16 }];
const NEEDLES = RINGS.flatMap(({ r, n }) => Array.from({ length: n }, (_, k) => {
  const a = (k / n) * Math.PI * 2 + r;
  return [Math.cos(a) * r, Math.sin(a) * r] as [number, number];
}));

/** Rotation about y that points local +x along the horizontal direction (dx, dz). */
const yaw = (dx: number, dz: number) => Math.atan2(-dz, dx);

/** Compass needles: red north end points along the field. They swing to the new field (lerp) when it changes. */
function Needles({ variant, currentUp }: { variant: LabSimProps["variant"]; currentUp: boolean }) {
  const group = useRef<THREE.Group>(null);
  const targets = useMemo(() => NEEDLES.map(([x, z]) => yaw(...fieldDirection(x, z, currentUp, variant))), [variant, currentUp]);
  useFrame((_, dt) => {
    group.current?.children.forEach((child, i) => {
      let d = targets[i] - child.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      child.rotation.y += d * (1 - Math.exp(-dt / 0.12));
    });
  });
  return (
    <group ref={group}>
      {NEEDLES.map(([x, z], i) => (
        <group key={i} position={[x, 0.02, z]} rotation={[0, 0, 0]}>
          <mesh position={[0.11, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.055, 0.22, 10]} />
            <meshStandardMaterial color={TOKENS.weak} emissive={TOKENS.weak} emissiveIntensity={0.4} />
          </mesh>
          <mesh position={[-0.11, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.055, 0.22, 10]} />
            <meshStandardMaterial color="#d8dbe6" />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, 0]}>
            <ringGeometry args={[0.2, 0.23, 24]} />
            <meshBasicMaterial color="#3a3f55" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Field-line markers flowing around the rings (real) or out along radial spokes (misconception). */
function FieldFlow({ variant, currentUp, reducedMotion }: { variant: LabSimProps["variant"]; currentUp: boolean; reducedMotion: boolean }) {
  const M = 48;
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(M * 3), 3));
    return g;
  }, []);
  const points = useRef<THREE.Points>(null);
  useFrame(({ clock }) => {
    if (!points.current) return;
    const t = reducedMotion ? 0 : clock.elapsedTime;
    const pos = points.current.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < M; i++) {
      const ring = RINGS[i % 3];
      if (variant === "real") {
        // Position (cos a, −sin a): increasing a moves along ŷ × r̂, the field direction for current up (see fieldDirection).
        const a = (i / M) * Math.PI * 2 * 3 + (currentUp ? 1 : -1) * t * 0.6;
        pos.setXYZ(i, Math.cos(a) * ring.r, 0.05, -Math.sin(a) * ring.r);
      } else {
        const a = (Math.floor(i / 3) / (M / 3)) * Math.PI * 2;
        const r = 0.3 + ((t * 0.5 + (i % 3) / 3) % 1) * 2.8;
        pos.setXYZ(i, Math.cos(a) * r, 0.05, Math.sin(a) * r);
      }
    }
    pos.needsUpdate = true;
  });
  return (
    <points ref={points} geometry={geom} frustumCulled={false}>
      <pointsMaterial map={glowTexture()} color={TOKENS.accent} size={0.16} sizeAttenuation transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  );
}

const ringPoints = (r: number) => Array.from({ length: 97 }, (_, k) => new THREE.Vector3(Math.cos((k / 96) * Math.PI * 2) * r, 0.03, Math.sin((k / 96) * Math.PI * 2) * r));
const RING_LINES = RINGS.map((g) => ringPoints(g.r));
const SPOKES = Array.from({ length: 16 }, (_, k) => {
  const a = (k / 16) * Math.PI * 2;
  return [new THREE.Vector3(Math.cos(a) * 0.3, 0.03, Math.sin(a) * 0.3), new THREE.Vector3(Math.cos(a) * 3.1, 0.03, Math.sin(a) * 3.1)];
});

function WireScene({ variant, param, reducedMotion }: LabSimProps) {
  const currentUp = param === 0;
  const charges = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    charges.current?.children.forEach((c, i) => {
      const y = (((reducedMotion ? 0 : clock.elapsedTime) * 1.2 + i * 0.5) % 4) - 2;
      c.position.y = currentUp ? y : -y;
    });
  });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.3, 64]} />
        <meshStandardMaterial color="#10131d" transparent opacity={0.9} />
      </mesh>
      {variant === "real"
        ? RING_LINES.map((pts, i) => <Line key={i} points={pts} color={TOKENS.accent} lineWidth={1.4} transparent opacity={0.55} />)
        : SPOKES.map((pts, i) => <Line key={i} points={pts} color={TOKENS.weak} lineWidth={1.2} transparent opacity={0.45} />)}
      <FieldFlow variant={variant} currentUp={currentUp} reducedMotion={reducedMotion} />
      <Needles variant={variant} currentUp={currentUp} />

      {/* The wire, with charge carriers showing the current direction */}
      <mesh>
        <cylinderGeometry args={[0.08, 0.08, 4.2, 20]} />
        <meshStandardMaterial color="#c98b4a" metalness={0.7} roughness={0.3} />
      </mesh>
      <group ref={charges}>
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.06, 10, 10]} />
            <meshBasicMaterial color={TOKENS.developing} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, currentUp ? 2.25 : -2.25, 0]} rotation={[currentUp ? 0 : Math.PI, 0, 0]}>
        <coneGeometry args={[0.18, 0.4, 20]} />
        <meshStandardMaterial color={TOKENS.developing} emissive={TOKENS.developing} emissiveIntensity={0.5} />
      </mesh>
      <TextSprite text={`Current I ${currentUp ? "↑" : "↓"}`} position={[0.75, 1.9, 0]} height={0.18} color={TOKENS.developing} />
      <TextSprite
        text={variant === "real" ? "Concentric circles · right-hand thumb rule ✓" : "Field points straight out ✗"}
        position={[0, -1.15, 2.9]}
        height={0.17}
        color={variant === "real" ? TOKENS.mastered : TOKENS.weak}
      />
    </group>
  );
}

export const wireFieldSim: LabSim = {
  mcId: "MC16",
  title: "Magnetic field around a straight wire",
  camera: [0, 5.2, 6.4],
  target: [0, 0, 0],
  control: { kind: "toggle", label: "Current direction", options: ["Up ↑", "Down ↓"], initial: 0 },
  said: "The field spreads straight out from the wire, so compass needles would point away from it.",
  real: "The field lines are concentric circles around the wire. Compass needles line up along the circles; reverse the current and every needle flips (right-hand thumb rule).",
  Scene: WireScene,
};
