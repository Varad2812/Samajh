"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useQuality, useSignals } from "@/components/fx/SceneSignals";
import { DUST_COUNT, generateDust } from "@/lib/galaxy/dust";
import { IGNITION, smoothstep } from "@/lib/galaxy/ignition";
import { RING_TILT } from "@/lib/galaxy/layout";
import { DUST_FRAGMENT, DUST_VERTEX } from "@/lib/shaders/dust.glsl";

/** ~7k twinkling spiral-arm points with a warm core, gently swaying; forms out of the bang during Ignition. */
export function Dust({ reducedMotion, sizeScale = 1 }: { reducedMotion: boolean; sizeScale?: number }) {
  const { low } = useQuality();
  const signals = useSignals();
  const dpr = useThree((s) => s.viewport.dpr);
  const spin = useRef<THREE.Group>(null);
  const material = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const d = generateDust();
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(d.positions, 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(d.colors, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(d.sizes, 1));
    g.setAttribute("aSeed", new THREE.BufferAttribute(d.seeds, 1));
    return g;
  }, []);
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);
  // Performance fallback: draw half the dust.
  useLayoutEffect(() => geometry.setDrawRange(0, low ? DUST_COUNT / 2 : DUST_COUNT), [geometry, low]);

  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uForm: { value: 1 }, uPixelRatio: { value: 1 }, uSizeScale: { value: sizeScale } }), [sizeScale]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const el = signals.ignitionElapsed(t);
    if (material.current) {
      material.current.uniforms.uTime.value = reducedMotion ? 0 : t;
      material.current.uniforms.uForm.value = el === Infinity ? 1 : smoothstep(IGNITION.dustStart, IGNITION.dustEnd, el);
      material.current.uniforms.uPixelRatio.value = dpr;
    }
    // Slow sway rather than a full spin, so the arms stay under their constellations.
    if (spin.current && !reducedMotion) spin.current.rotation.y = 0.12 * Math.sin(t * 0.05);
  });

  return (
    <group rotation={[RING_TILT, 0, 0]}>
      <group ref={spin}>
        <points geometry={geometry} frustumCulled={false}>
          <shaderMaterial
            ref={material}
            vertexShader={DUST_VERTEX}
            fragmentShader={DUST_FRAGMENT}
            uniforms={uniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
      </group>
    </group>
  );
}
