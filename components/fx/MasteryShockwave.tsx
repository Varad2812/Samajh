"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { crossesMastered } from "@/lib/fx";
import { RING_TILT, type Vec3 } from "@/lib/galaxy/layout";
import { masteryColor, TOKENS } from "@/lib/utils";
import { Burst } from "./Burst";
import { glowTexture } from "./glowTexture";

const DURATION = 1.1;
/** Ring geometry lies in XY; rotate its normal onto the tilted galaxy plane. */
const PLANE_ROTATION: [number, number, number] = [RING_TILT - Math.PI / 2, 0, 0];

/**
 * Mastery Shockwave (DESIGN.md §4.2-3): two expanding rings in the galaxy plane in the new mastery colour.
 * Crossing into "mastered" adds a supernova sparkle + flash. (Colour lerp and dependent brightening live in ConceptNode.)
 */
export function MasteryShockwave({ position, nodeRadius, from, to, seed = 1 }: { position: Vec3; nodeRadius: number; from: number; to: number; seed?: number }) {
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const flash = useRef<THREE.Sprite>(null);
  const start = useRef<number | null>(null);
  const color = new THREE.Color(masteryColor(to)).multiplyScalar(2.5);
  const supernova = crossesMastered(from, to);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (start.current === null) start.current = t;
    const age = t - start.current;
    rings.current.forEach((ring, i) => {
      if (!ring) return;
      const k = (age - i * 0.15) / DURATION;
      ring.visible = k > 0 && k < 1;
      if (!ring.visible) return;
      const eased = 1 - Math.pow(1 - k, 2);
      ring.scale.setScalar(nodeRadius * (1.3 + eased * (i === 0 ? 6 : 4.5)));
      (ring.material as THREE.MeshBasicMaterial).opacity = (i === 0 ? 0.9 : 0.6) * (1 - k);
    });
    if (flash.current) {
      const k = age / 0.5;
      flash.current.visible = supernova && k < 1;
      flash.current.scale.setScalar(nodeRadius * 12 * Math.sin(Math.min(1, k) * Math.PI));
    }
  });

  return (
    <group position={position}>
      {[0, 1].map((i) => (
        <mesh key={i} ref={(m) => void (rings.current[i] = m)} rotation={PLANE_ROTATION} visible={false}>
          <ringGeometry args={[i === 0 ? 0.93 : 0.97, 1, 96]} />
          <meshBasicMaterial color={color} transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {supernova && (
        <>
          <sprite ref={flash} visible={false}>
            <spriteMaterial map={glowTexture()} color={TOKENS.mastered} transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </sprite>
          <Burst origin={[0, 0, 0]} color={TOKENS.mastered} color2="#FFF6D8" count={160} speed={1.9} life={1.3} size={1.6} startRadius={nodeRadius} seed={seed + 7} />
        </>
      )}
    </group>
  );
}
