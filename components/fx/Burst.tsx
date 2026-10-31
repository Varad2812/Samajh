"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Vec3 } from "@/lib/galaxy/layout";
import { mulberry32 } from "@/lib/rng";
import { BURST_FRAGMENT, BURST_VERTEX } from "@/lib/shaders/burst.glsl";

export interface BurstProps {
  origin: Vec3;
  color: string;
  color2?: string;
  count?: number;
  /** World units travelled at the end of life. */
  speed?: number;
  /** Seconds. */
  life?: number;
  size?: number;
  /** Seconds after mount before the burst starts. */
  delay?: number;
  /** Particles start on a sphere/ring of this radius. */
  startRadius?: number;
  /** Emit in the galaxy plane (a ring) instead of a sphere. */
  ring?: boolean;
  /** Rotation applied to the emitter (e.g. the galaxy tilt for rings). */
  tilt?: number;
  seed?: number;
}

/** Reusable GPU particle burst (big bang, shatter, supernova, impacts). */
export function Burst({ origin, color, color2 = "#FFFFFF", count = 120, speed = 1.5, life = 1, size = 1.4, delay = 0, startRadius = 0, ring = false, tilt = 0, seed = 1 }: BurstProps) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const start = useRef<number | null>(null);
  const dpr = useThree((s) => s.viewport.dpr);

  const geometry = useMemo(() => {
    const rng = mulberry32(seed);
    const dirs = new Float32Array(count * 3);
    const starts = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      let d: THREE.Vector3;
      if (ring) {
        const a = rng() * Math.PI * 2;
        d = new THREE.Vector3(Math.cos(a), (rng() - 0.5) * 0.25, Math.sin(a));
      } else {
        const u = rng() * 2 - 1;
        const a = rng() * Math.PI * 2;
        const s = Math.sqrt(1 - u * u);
        d = new THREE.Vector3(s * Math.cos(a), u, s * Math.sin(a));
      }
      dirs.set([d.x, d.y, d.z], i * 3);
      starts.set([d.x * startRadius, d.y * startRadius, d.z * startRadius], i * 3);
      seeds[i] = rng();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute("aDir", new THREE.BufferAttribute(dirs, 3));
    g.setAttribute("aStart", new THREE.BufferAttribute(starts, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    return g;
  }, [count, ring, seed, startRadius]);
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uAge: { value: -1 },
      uLife: { value: life },
      uSpeed: { value: speed },
      uSize: { value: size },
      uPixelRatio: { value: 1 },
      uColor: { value: new THREE.Color(color) },
      uColor2: { value: new THREE.Color(color2) },
    }),
    [color, color2, life, size, speed],
  );

  useFrame((state) => {
    if (!material.current) return;
    if (start.current === null) start.current = state.clock.elapsedTime + delay;
    material.current.uniforms.uAge.value = state.clock.elapsedTime - start.current;
    material.current.uniforms.uPixelRatio.value = dpr;
  });

  return (
    <points geometry={geometry} position={origin} rotation={[tilt, 0, 0]} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        vertexShader={BURST_VERTEX}
        fragmentShader={BURST_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
