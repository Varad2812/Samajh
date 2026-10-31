"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { IGNITION } from "@/lib/galaxy/ignition";
import { TOKENS } from "@/lib/utils";
import { Burst } from "./Burst";
import { glowTexture } from "./glowTexture";
import { useSignals } from "./SceneSignals";

/**
 * Galaxy Ignition (DESIGN.md §4.2-1): advances the shared ignition clock, shows the single starting point
 * and fires the big-bang burst. Dust, nebulae, nodes, edges and camera read the same clock.
 */
export function IgnitionDirector({ ignitionId }: { ignitionId: number | null }) {
  const signals = useSignals();
  const point = useRef<THREE.Group>(null);

  useFrame((state) => {
    signals.tick(state.clock.elapsedTime);
    const el = signals.ignitionElapsed(state.clock.elapsedTime);
    if (!point.current) return;
    const visible = el < IGNITION.pointEnd + 0.1;
    point.current.visible = visible;
    if (visible) {
      // A lone star swells, then collapses into the bang.
      const k = el / IGNITION.pointEnd;
      point.current.scale.setScalar(k < 1 ? 0.4 + k * 1.2 : Math.max(0, 1.6 - (k - 1) * 8));
    }
  });

  return (
    <>
      <group ref={point} visible={false}>
        <mesh>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshBasicMaterial color={new THREE.Color("#FFF3DC").multiplyScalar(6)} toneMapped={false} />
        </mesh>
        <sprite scale={[1.4, 1.4, 1]}>
          <spriteMaterial map={glowTexture()} color="#FFE7C2" transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>
      </group>
      {ignitionId !== null && (
        <Burst
          key={ignitionId}
          origin={[0, 0, 0]}
          color="#FFE7C2"
          color2={TOKENS.accent}
          count={1800}
          speed={12}
          life={IGNITION.bangLife}
          size={2.4}
          delay={IGNITION.bangAt}
          seed={ignitionId}
        />
      )}
    </>
  );
}
