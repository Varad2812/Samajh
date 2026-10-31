"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Billboard, Html, Line } from "@react-three/drei";
import * as THREE from "three";
import type { Concept } from "@/lib/data/concepts";
import { nodeRadius, type Vec3 } from "@/lib/galaxy/layout";
import { fmt2, masteryColor, TOKENS } from "@/lib/utils";
import type { GalaxyNodeData } from "./types";

interface Props {
  concept: Concept;
  position: Vec3;
  data: GalaxyNodeData;
  selected: boolean;
  dimmed: boolean;
  reducedMotion: boolean;
  showLabel?: boolean;
  onSelect?: (id: string) => void;
}

const PULSE_PERIOD = 1.6;
const SHOCK_DURATION = 0.9;
const DASHED_RING = Array.from({ length: 65 }, (_, i) => {
  const a = (i / 64) * Math.PI * 2;
  return new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
});

export function ConceptNode({ concept, position, data, selected, dimmed, reducedMotion, showLabel = true, onSelect }: Props) {
  const r = nodeRadius(concept.weight);
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const halo = useRef<THREE.Mesh>(null);
  const shock = useRef<THREE.Mesh>(null);
  const satellites = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const target = useMemo(() => new THREE.Color(data.estimated ? TOKENS.unknown : masteryColor(data.p)), [data.estimated, data.p]);
  const current = useRef(target.clone());
  const shockStart = useRef<number | null>(null);
  const prevP = useRef(data.p);
  const elapsed = useRef(0);
  const scaleTarget = useMemo(() => new THREE.Vector3(1, 1, 1), []);

  // Mastery change → shockwave ring (colour lerps in useFrame).
  useEffect(() => {
    if (prevP.current !== data.p) shockStart.current = elapsed.current;
    prevP.current = data.p;
  }, [data.p]);

  useEffect(() => () => void (document.body.style.cursor = "auto"), []);

  const weak = !data.estimated && data.p < 0.4;
  const baseIntensity = data.estimated ? 0.45 : 1.2 + 1.3 * data.p;

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    elapsed.current = t;
    current.current.lerp(target, 1 - Math.exp(-dt / 0.15)); // ≈ 600ms to settle
    const pulse = weak && !reducedMotion ? Math.sin((t / PULSE_PERIOD) * Math.PI * 2) : 0;
    if (material.current) {
      material.current.emissive.copy(current.current);
      material.current.color.copy(current.current).multiplyScalar(0.25);
      material.current.emissiveIntensity = (baseIntensity + pulse * 0.45) * (dimmed ? 0.22 : 1) * (selected ? 1.25 : 1);
    }
    if (group.current) {
      const s = (hovered || selected ? 1.15 : 1) * (dimmed ? 0.85 : 1) * (1 + pulse * 0.07);
      group.current.scale.lerp(scaleTarget.setScalar(s), 1 - Math.exp(-dt / 0.08));
    }
    if (halo.current) {
      halo.current.rotation.z = reducedMotion ? 0 : t * 0.8;
      halo.current.rotation.x = Math.PI / 2 + (reducedMotion ? 0.35 : 0.35 * Math.sin(t * 0.7));
    }
    if (satellites.current) satellites.current.rotation.y = reducedMotion ? 0 : t * 1.2;
    if (shock.current) {
      const s0 = shockStart.current;
      const k = s0 === null ? 1 : (t - s0) / SHOCK_DURATION;
      shock.current.visible = k < 1;
      if (k < 1) {
        const scale = r * (1.2 + k * 3.2);
        shock.current.scale.set(scale, scale, scale);
        const m = shock.current.material as THREE.MeshBasicMaterial;
        m.opacity = 0.8 * (1 - k);
        m.color.copy(current.current);
      } else shockStart.current = null;
    }
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    if (onSelect) document.body.style.cursor = "pointer";
  };
  const out = () => {
    setHovered(false);
    document.body.style.cursor = "auto";
  };
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect?.(concept.id);
  };

  return (
    <group position={position}>
      <group ref={group}>
        <mesh onPointerOver={over} onPointerOut={out} onClick={click}>
          <sphereGeometry args={[r, 32, 24]} />
          <meshStandardMaterial ref={material} roughness={0.35} metalness={0.1} toneMapped={false} />
        </mesh>
        {/* Larger invisible hit area for small nodes. */}
        <mesh onPointerOver={over} onPointerOut={out} onClick={click} visible={false}>
          <sphereGeometry args={[r * 1.35, 8, 8]} />
        </mesh>
      </group>

      {data.estimated && (
        <Billboard>
          <Line points={DASHED_RING} scale={r * 1.55} color={TOKENS.muted} lineWidth={1} dashed dashSize={0.18} gapSize={0.12} transparent opacity={dimmed ? 0.2 : 0.6} />
        </Billboard>
      )}

      {data.due && (
        <mesh ref={halo}>
          <torusGeometry args={[r * 1.85, 0.012, 8, 96]} />
          <meshBasicMaterial color={TOKENS.accent} toneMapped={false} transparent opacity={dimmed ? 0.25 : 0.9} />
        </mesh>
      )}

      {data.misconceptions > 0 && (
        <group ref={satellites} rotation={[0.5, 0, 0.3]}>
          {Array.from({ length: data.misconceptions }, (_, i) => {
            const a = (i / data.misconceptions) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * r * 2.3, 0, Math.sin(a) * r * 2.3]}>
                <sphereGeometry args={[0.055, 12, 12]} />
                <meshBasicMaterial color={TOKENS.misconception} toneMapped={false} />
              </mesh>
            );
          })}
        </group>
      )}

      <Billboard>
        <mesh ref={shock} visible={false}>
          <ringGeometry args={[0.92, 1, 64]} />
          <meshBasicMaterial transparent toneMapped={false} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </Billboard>

      {showLabel && (hovered || selected) && (
        <Html position={[0, r + 0.32, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-surface/90 px-2 py-1 text-xs whitespace-nowrap shadow-highlight backdrop-blur">
            <span className="font-mono text-muted-foreground">{concept.id}</span>
            <span>{concept.name}</span>
            <span className="font-mono tabular" style={{ color: data.estimated ? TOKENS.muted : masteryColor(data.p) }}>
              {data.estimated ? "est." : ""} {fmt2(data.p)}
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}
