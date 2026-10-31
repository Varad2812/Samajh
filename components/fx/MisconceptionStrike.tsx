"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import { STRIKE_IMPACT_MS } from "@/lib/fx";
import { RING_TILT, type Vec3 } from "@/lib/galaxy/layout";
import { TOKENS } from "@/lib/utils";
import { Burst } from "./Burst";
import { glowTexture } from "./glowTexture";

const TRAIL = 40;
const IMPACT = STRIKE_IMPACT_MS / 1000;
const VIOLET = new THREE.Color(TOKENS.misconception);

/**
 * Misconception Strike (DESIGN.md §4.2-2): a violet comet streaks in on a curve and impacts the node,
 * followed by an impact ring + burst. The node's new satellite appears at impact (ConceptNode).
 */
export function MisconceptionStrike({ target, nodeRadius, seed = 1 }: { target: Vec3; nodeRadius: number; seed?: number }) {
  const head = useRef<THREE.Group>(null);
  const trail = useRef<THREE.Points>(null);
  const ring = useRef<THREE.Mesh>(null);
  const start = useRef<number | null>(null);
  const history = useRef<THREE.Vector3[]>([]);

  const path = useMemo(() => {
    const end = new THREE.Vector3(...target);
    const side = seed % 2 === 0 ? 1 : -1;
    const from = end.clone().add(new THREE.Vector3(5.5 * side, 4, 3.5));
    const ctrl = from.clone().lerp(end, 0.5).add(new THREE.Vector3(0, 2.2, 0));
    return new THREE.QuadraticBezierCurve3(from, ctrl, end);
  }, [target, seed]);

  const trailGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3));
    const colors = new Float32Array(TRAIL * 3);
    for (let i = 0; i < TRAIL; i++) {
      const f = Math.pow(1 - i / TRAIL, 1.8) * 2.2; // HDR head fading to nothing (additive)
      colors.set([VIOLET.r * f, VIOLET.g * f, VIOLET.b * f], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (start.current === null) start.current = t;
    const age = t - start.current;
    const k = Math.min(1, age / IMPACT);
    const p = path.getPoint(Math.pow(k, 1.6)); // accelerate into the node
    const flying = k < 1;

    if (head.current) {
      head.current.visible = flying;
      head.current.position.copy(p);
    }
    if (trail.current) {
      history.current.unshift(p.clone());
      history.current.length = Math.min(history.current.length, TRAIL);
      const attr = trail.current.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < TRAIL; i++) {
        const h = history.current[Math.min(i, history.current.length - 1)];
        attr.setXYZ(i, h.x, h.y, h.z);
      }
      attr.needsUpdate = true;
      // The trail lingers briefly after impact, then fades.
      const m = trail.current.material as THREE.PointsMaterial;
      m.opacity = flying ? 1 : Math.max(0, 1 - (age - IMPACT) * 4);
    }
    if (ring.current) {
      const r = Math.max(0, age - IMPACT) / 0.6;
      ring.current.visible = !flying && r < 1;
      ring.current.scale.setScalar(nodeRadius * (1.2 + r * 4));
      (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - r);
    }
  });

  return (
    <group>
      <group ref={head}>
        <mesh>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshBasicMaterial color={VIOLET.clone().multiplyScalar(4)} toneMapped={false} />
        </mesh>
        <sprite scale={[0.9, 0.9, 1]}>
          <spriteMaterial map={glowTexture()} color={TOKENS.misconception} transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>
      </group>
      <points ref={trail} geometry={trailGeometry} frustumCulled={false}>
        <pointsMaterial size={0.16} map={glowTexture()} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} sizeAttenuation />
      </points>
      <group position={target}>
        <Billboard>
          <mesh ref={ring} visible={false}>
            <ringGeometry args={[0.9, 1, 64]} />
            <meshBasicMaterial color={VIOLET.clone().multiplyScalar(3)} transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </Billboard>
      </group>
      <Burst origin={target} color={TOKENS.misconception} count={80} speed={1.3} life={0.9} size={1.3} delay={IMPACT} startRadius={nodeRadius} ring tilt={RING_TILT} seed={seed + 3} />
    </group>
  );
}
