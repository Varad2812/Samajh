"use client";

import { useMemo, useRef, type ComponentRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { TextSprite } from "@/components/lab/TextSprite";
import { galaxyLayout } from "@/lib/galaxy/layout";
import { TOKENS } from "@/lib/utils";

const SEGMENTS = 32;
const COMET_SPEED = 0.12; // path fractions per second

interface Props {
  /** Concept ids in watch order. */
  ids: string[];
  reducedMotion: boolean;
}

/**
 * The 45-minute video plan drawn through the galaxy: an arcing dashed route that flows in watch order,
 * a comet travelling along it, and a numbered marker above each stop.
 */
export function StudyPath({ ids, reducedMotion }: Props) {
  const { positions } = galaxyLayout();
  const line = useRef<ComponentRef<typeof Line>>(null);
  const comet = useRef<THREE.Mesh>(null);

  const { points, path } = useMemo(() => {
    const stops = ids.filter((id) => positions[id]).map((id) => new THREE.Vector3(...positions[id]));
    const curve = new THREE.CurvePath<THREE.Vector3>();
    for (let i = 1; i < stops.length; i++) {
      const a = stops[i - 1];
      const b = stops[i];
      const mid = a.clone().lerp(b, 0.5);
      mid.y += 0.6 + 0.18 * a.distanceTo(b);
      curve.add(new THREE.QuadraticBezierCurve3(a, mid, b));
    }
    return { points: stops.length > 1 ? curve.getPoints(SEGMENTS) : [], path: stops.length > 1 ? curve : null };
  }, [ids, positions]);

  useFrame((state, delta) => {
    if (reducedMotion) return;
    const mat = line.current?.material as { dashOffset: number } | undefined;
    if (mat) mat.dashOffset -= delta * 0.8;
    if (comet.current && path) {
      const t = (state.clock.elapsedTime * COMET_SPEED) % 1;
      comet.current.position.copy(path.getPointAt(t));
    }
  });

  if (!ids.length) return null;
  return (
    <group>
      {points.length > 1 && (
        <Line
          ref={line}
          points={points}
          color={TOKENS.accent}
          lineWidth={2.2}
          dashed
          dashSize={0.35}
          gapSize={0.18}
          transparent
          opacity={0.9}
          toneMapped={false}
        />
      )}
      {path && (
        <mesh ref={comet}>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshBasicMaterial color={TOKENS.accent} toneMapped={false} />
        </mesh>
      )}
      {ids.map((id, i) => {
        const p = positions[id];
        if (!p) return null;
        return (
          <TextSprite
            key={id}
            text={String(i + 1)}
            position={[p[0], p[1] + 0.85, p[2]]}
            height={0.032}
            screenSpace
            color={TOKENS.bg}
            background={TOKENS.accent}
            weight={700}
          />
        );
      })}
    </group>
  );
}
