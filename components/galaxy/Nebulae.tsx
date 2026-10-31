"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import { useSignals } from "@/components/fx/SceneSignals";
import { CHAPTERS } from "@/lib/data/concepts";
import { IGNITION, smoothstep } from "@/lib/galaxy/ignition";
import { CHAPTER_COLOR, galaxyLayout } from "@/lib/galaxy/layout";
import { NEBULA_FRAGMENT, NEBULA_VERTEX } from "@/lib/shaders/nebula.glsl";

const OPACITY = 0.5;

/** One drifting fbm nebula per chapter cluster, additive and faint (DESIGN.md §4.1). */
export function Nebulae({ size = 11, reducedMotion }: { size?: number; reducedMotion: boolean }) {
  const { clusterCenters } = galaxyLayout();
  const signals = useSignals();
  const materials = useRef<(THREE.ShaderMaterial | null)[]>([]);
  const uniforms = useMemo(
    () =>
      CHAPTERS.map((ch, i) => ({
        uColor: { value: new THREE.Color(CHAPTER_COLOR[ch.id]) },
        uTime: { value: 0 },
        uOpacity: { value: OPACITY },
        uSeed: { value: i * 3.7 },
      })),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const el = signals.ignitionElapsed(t);
    const fade = el === Infinity ? 1 : smoothstep(IGNITION.nebulaStart, IGNITION.nebulaEnd, el);
    for (const m of materials.current) {
      if (!m) continue;
      m.uniforms.uTime.value = reducedMotion ? 0 : t;
      m.uniforms.uOpacity.value = OPACITY * fade;
    }
  });

  return (
    <>
      {CHAPTERS.map((ch, i) => (
        <Billboard key={ch.id} position={clusterCenters[ch.id]}>
          <mesh renderOrder={-1}>
            <planeGeometry args={[size, size]} />
            <shaderMaterial
              ref={(m) => void (materials.current[i] = m)}
              vertexShader={NEBULA_VERTEX}
              fragmentShader={NEBULA_FRAGMENT}
              uniforms={uniforms[i]}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </Billboard>
      ))}
    </>
  );
}
