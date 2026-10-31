"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { glowTexture } from "@/components/fx/glowTexture";
import { airMass, rayleighTransmission, sunlightColor, WAVELENGTHS } from "@/lib/lab/physics";
import { TOKENS } from "@/lib/utils";
import { TextSprite } from "../TextSprite";
import type { LabSim, LabSimProps } from "../types";

const DEG = Math.PI / 180;
const OBSERVER = new THREE.Vector3(2.2, -1.35, 0);
const GROUND_Y = -1.5;
const SUN_DIST = 4.6;
const N = 90;
const LAMBDA = [WAVELENGTHS.red, WAVELENGTHS.green, WAVELENGTHS.blue];
const RGB = [new THREE.Color("#ff5a4a"), new THREE.Color("#7dff6a"), new THREE.Color("#4f8dff")];
/** Deterministic pseudo-random in [0, 1). */
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const sunPosition = (elev: number) => OBSERVER.clone().add(new THREE.Vector3(-Math.cos(elev * DEG), Math.sin(elev * DEG), 0).multiplyScalar(SUN_DIST));

/**
 * Photons from the sun to the observer, coloured red/green/blue. Real: each one may Rayleigh-scatter (∝ 1/λ⁴) at a
 * random point and fly off in a random direction; the longer the path (low sun), the more blue is lost. Misconception:
 * nothing scatters; all colours arrive and the "blue" comes from the sea.
 */
function Photons({ variant, elev, reducedMotion }: { variant: LabSimProps["variant"]; elev: number; reducedMotion: boolean }) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    return g;
  }, []);
  const points = useRef<THREE.Points>(null);
  const mass = airMass(elev);
  const sun = sunPosition(elev);
  useFrame(({ clock }) => {
    if (!points.current) return;
    const t = reducedMotion ? 0.3 : clock.elapsedTime * 0.32;
    const pos = points.current.geometry.attributes.position as THREE.BufferAttribute;
    const col = points.current.geometry.attributes.color as THREE.BufferAttribute;
    const p = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      const c = i % 3;
      const phase = t + i / N;
      const cycle = Math.floor(phase);
      const u = phase - cycle;
      const seed = i * 13 + cycle * 7;
      // Survives the whole path with probability T(λ, air mass); otherwise scatters at a random point along it.
      const scatters = variant === "real" && hash(seed) > rayleighTransmission(LAMBDA[c], mass, 0.3);
      const at = 0.15 + 0.7 * hash(seed + 1);
      if (!scatters || u < at) {
        p.lerpVectors(sun, OBSERVER, u);
      } else {
        const base = new THREE.Vector3().lerpVectors(sun, OBSERVER, at);
        const theta = hash(seed + 2) * Math.PI * 2;
        const phi = (hash(seed + 3) - 0.5) * Math.PI;
        const dir = new THREE.Vector3(Math.cos(theta) * Math.cos(phi), Math.sin(phi) * 0.8 + 0.15, Math.sin(theta) * Math.cos(phi));
        p.copy(base).addScaledVector(dir, (u - at) * SUN_DIST * 0.9);
      }
      pos.setXYZ(i, p.x, Math.max(GROUND_Y + 0.02, p.y), p.z);
      const fade = scatters && u > at ? 0.75 : 1;
      col.setXYZ(i, RGB[c].r * fade, RGB[c].g * fade, RGB[c].b * fade);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
  });
  return (
    <points ref={points} geometry={geom} frustumCulled={false}>
      <pointsMaterial map={glowTexture()} vertexColors size={0.17} sizeAttenuation transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  );
}

/** The misconception's mechanism: blue "reflections" rising from the sea to paint the sky. */
function SeaReflections({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    group.current?.children.forEach((c, i) => {
      c.position.y = GROUND_Y + (((reducedMotion ? 0 : clock.elapsedTime) * 0.6 + i * 0.37) % 1) * 3.4;
    });
  });
  return (
    <group ref={group}>
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={i} position={[-3.4 + i * 0.6, GROUND_Y, (i % 3) - 1]}>
          <coneGeometry args={[0.07, 0.24, 8]} />
          <meshBasicMaterial color="#4f8dff" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

const AIR = Array.from({ length: 260 }, (_, i) => new THREE.Vector3((hash(i) - 0.5) * 9, GROUND_Y + hash(i + 500) * 3.8, (hash(i + 900) - 0.5) * 3));

function SkyScene({ variant, param, reducedMotion }: LabSimProps) {
  const elev = param;
  const real = variant === "real";
  const sun = sunPosition(elev);
  const [r, g, b] = sunlightColor(elev);
  const arriving = real ? new THREE.Color(r, g, b) : new THREE.Color(1, 1, 1);
  // Sky tint: real follows scattering (blue by day, orange near the horizon at sunset); the misconception is always sea-blue.
  const dusk = THREE.MathUtils.clamp((22 - elev) / 18, 0, 1);
  const sky = real ? new THREE.Color("#1b3f7a").lerp(new THREE.Color("#7a3a1c"), dusk) : new THREE.Color("#1b3f7a");
  const air = useMemo(() => new THREE.BufferGeometry().setFromPoints(AIR), []);

  return (
    <group>
      <mesh position={[0, 1.3, -2.2]}>
        <planeGeometry args={[18, 9]} />
        <meshBasicMaterial color={sky} toneMapped={false} />
      </mesh>
      <points geometry={air}>
        <pointsMaterial color="#c9d2ea" size={0.035} sizeAttenuation transparent opacity={0.55} depthWrite={false} />
      </points>
      {/* Ground and sea */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.8, GROUND_Y, 0]}>
        <planeGeometry args={[4.4, 3]} />
        <meshStandardMaterial color="#1d2a1f" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-3.1, GROUND_Y + 0.001, 0]}>
        <planeGeometry args={[4.2, 3]} />
        <meshStandardMaterial color="#1f4f9a" emissive="#1f4f9a" emissiveIntensity={0.35} />
      </mesh>
      {!real && <SeaReflections reducedMotion={reducedMotion} />}

      {/* Sun, beam and observer */}
      <mesh position={sun}>
        <sphereGeometry args={[0.32, 24, 24]} />
        <meshBasicMaterial color="#fff4d6" toneMapped={false} />
      </mesh>
      <sprite position={sun} scale={[1.6, 1.6, 1]}>
        <spriteMaterial map={glowTexture()} color="#ffe2a0" transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <Line points={[sun, OBSERVER]} color={arriving} lineWidth={2} transparent opacity={0.6} />
      <Photons variant={variant} elev={elev} reducedMotion={reducedMotion} />
      <mesh position={OBSERVER}>
        <capsuleGeometry args={[0.09, 0.22, 6, 12]} />
        <meshStandardMaterial color="#d8dbe6" />
      </mesh>
      <sprite position={[OBSERVER.x - 0.35, OBSERVER.y + 0.25, 0.01]} scale={[0.5, 0.5, 1]}>
        <spriteMaterial map={glowTexture()} color={arriving} transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <TextSprite text={real ? `Sunlight arriving: ${dusk > 0.5 ? "orange-red" : dusk > 0 ? "yellow-orange" : "white"}` : "Sunlight arriving: white (always)"} position={[OBSERVER.x - 0.4, OBSERVER.y + 0.75, 0]} height={0.15} color={`#${arriving.getHexString()}`} />
      <TextSprite text={`Path through air ×${airMass(elev).toFixed(1)}`} position={[-2.6, 2.15, 0]} height={0.15} color={TOKENS.muted} />
      <TextSprite
        text={real ? "Blue scatters ~4.4× more than red (∝ 1/λ⁴) ✓" : "Sky = reflection of the sea ✗ (no red sunsets)"}
        position={[0, -2.05, 1.2]}
        height={0.16}
        color={real ? TOKENS.mastered : TOKENS.weak}
      />
    </group>
  );
}

export const skySim: LabSim = {
  mcId: "MC14",
  title: "Why the sky is blue (and sunsets red)",
  camera: [0, 1.1, 10.2],
  target: [0, 0.9, 0],
  control: { kind: "slider", label: "Sun height (← sunset)", min: 3, max: 80, step: 1, initial: 55, format: (v) => `${v.toFixed(0)}°` },
  said: "The sky is blue because it reflects the ocean. But then the sky over a desert would not be blue, and sunsets could never be red.",
  real: "Air molecules scatter short (blue) wavelengths far more than long (red) ones, so blue reaches you from every part of the sky. At sunset sunlight crosses much more air, the blue is scattered away, and the light that arrives is orange-red.",
  Scene: SkyScene,
};
