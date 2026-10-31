"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Billboard, Line } from "@react-three/drei";
import { TextSprite } from "@/components/lab/TextSprite";
import * as THREE from "three";
import { glowTexture } from "@/components/fx/glowTexture";
import { useSignals } from "@/components/fx/SceneSignals";
import type { Concept } from "@/lib/data/concepts";
import { MASTERED } from "@/lib/fx";
import { igniteAt, smoothstep } from "@/lib/galaxy/ignition";
import { nodeRadius, type Vec3 } from "@/lib/galaxy/layout";
import { NODE_FRAGMENT, NODE_VERTEX } from "@/lib/shaders/node.glsl";
import { fmt2, masteryColor, TOKENS } from "@/lib/utils";
import type { GalaxyNodeData } from "./types";

interface Props {
  concept: Concept;
  position: Vec3;
  data: GalaxyNodeData;
  selected: boolean;
  dimmed: boolean;
  reducedMotion: boolean;
  /** MiniGalaxy: no hover labels (the canvas is too small for them). */
  compact?: boolean;
  /** Date.now() of a nearby shockwave → brief brightening (prerequisite "unlock" feel). */
  boostAt?: number;
  /** Date.now() at which the newest satellite appears (Misconception Strike impact). */
  satelliteAt?: number;
  onSelect?: (id: string) => void;
}

const PULSE_PERIOD = 1.6;
const DASHED_RING = Array.from({ length: 65 }, (_, i) => {
  const a = (i / 64) * Math.PI * 2;
  return new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
});

export function ConceptNode({ concept, position, data, selected, dimmed, reducedMotion, compact = false, boostAt, satelliteAt, onSelect }: Props) {
  const r = nodeRadius(concept.weight);
  const signals = useSignals();
  const reveal = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const halo = useRef<THREE.Mesh>(null);
  const satellites = useRef<THREE.Group>(null);
  const corona = useRef<THREE.Sprite>(null);
  const [hovered, setHovered] = useState(false);

  const target = useMemo(() => new THREE.Color(data.estimated ? TOKENS.unknown : masteryColor(data.p)), [data.estimated, data.p]);
  // Created once with the initial colour; later changes lerp in useFrame.
  const [uniforms] = useState(() => ({
    uColor: { value: target.clone() },
    uIntensity: { value: 1 },
    uTime: { value: 0 },
    uPlasma: { value: 1 },
    uRim: { value: 1.5 },
  }));
  const scaleTarget = useMemo(() => new THREE.Vector3(1, 1, 1), []);
  const igniteTime = igniteAt(concept.id);
  const seed = concept.id.charCodeAt(1) * 1.37 + concept.id.length;

  useEffect(() => () => void (document.body.style.cursor = "auto"), []);

  const weak = !data.estimated && data.p < 0.4;
  const mastered = !data.estimated && data.p >= MASTERED;
  // Kept moderate so mastery hues survive bloom + ACES tone mapping.
  const baseIntensity = data.estimated ? 0.4 : 0.55 + 0.7 * data.p;

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const el = signals.ignitionElapsed(t);
    const shown = el === Infinity ? 1 : smoothstep(igniteTime, igniteTime + 0.35, el);
    const flash = el !== Infinity && el > igniteTime ? Math.exp(-(el - igniteTime) * 3.5) * 2.5 : 0;
    const now = Date.now();
    const boost = boostAt ? Math.max(0, 1 - Math.abs(now - boostAt - 450) / 600) : 0;
    const pulse = weak && !reducedMotion ? Math.sin((t / PULSE_PERIOD) * Math.PI * 2) : 0;
    const flicker = weak && !reducedMotion ? 1 - 0.14 * (0.5 + 0.5 * Math.sin(t * 13.7 + seed)) * (0.5 + 0.5 * Math.sin(t * 7.3 + seed * 2)) : 1;

    const m = material.current;
    if (m) {
      (m.uniforms.uColor.value as THREE.Color).lerp(target, 1 - Math.exp(-dt / 0.15)); // ≈ 600ms colour lerp
      m.uniforms.uTime.value = reducedMotion ? 0 : t + seed;
      m.uniforms.uPlasma.value = data.estimated ? 0.3 : 1;
      m.uniforms.uRim.value = (data.estimated ? 0.6 : 1.2 + 0.8 * data.p) * (dimmed ? 0.3 : 1);
      m.uniforms.uIntensity.value =
        ((baseIntensity + pulse * 0.4) * flicker * (dimmed ? 0.22 : 1) * (selected ? 1.25 : 1) + flash) * (1 + 1.3 * boost);
    }
    if (reveal.current) reveal.current.scale.setScalar(Math.max(shown, 0.0001));
    if (body.current) {
      const s = (hovered || selected ? 1.15 : 1) * (dimmed ? 0.85 : 1) * (1 + pulse * 0.07) * (1 + boost * 0.12);
      body.current.scale.lerp(scaleTarget.setScalar(s), 1 - Math.exp(-dt / 0.08));
    }
    if (halo.current) {
      halo.current.rotation.z = reducedMotion ? 0 : t * 0.8;
      halo.current.rotation.x = Math.PI / 2 + (reducedMotion ? 0.35 : 0.35 * Math.sin(t * 0.7));
    }
    if (satellites.current) {
      satellites.current.rotation.y = reducedMotion ? 0 : t * 1.2;
      const newest = satellites.current.children[satellites.current.children.length - 1];
      if (newest) newest.scale.setScalar(satelliteAt ? Math.min(1, Math.max(0, (now - satelliteAt) / 250)) : 1);
    }
    if (corona.current) corona.current.scale.setScalar(r * 5.5 * (1 + (reducedMotion ? 0 : 0.06 * Math.sin(t * 1.3 + seed))));
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
      <group ref={reveal}>
        <group ref={body}>
          <mesh onPointerOver={over} onPointerOut={out} onClick={click}>
            <sphereGeometry args={[r, 32, 24]} />
            <shaderMaterial ref={material} vertexShader={NODE_VERTEX} fragmentShader={NODE_FRAGMENT} uniforms={uniforms} toneMapped={false} />
          </mesh>
          {/* Slightly larger invisible hit area for small nodes. */}
          <mesh onPointerOver={over} onPointerOut={out} onClick={click} visible={false}>
            <sphereGeometry args={[r * 1.35, 8, 8]} />
          </mesh>
        </group>

        {mastered && (
          <sprite ref={corona} scale={[r * 5.5, r * 5.5, 1]}>
            <spriteMaterial map={glowTexture()} color={TOKENS.mastered} transparent opacity={dimmed ? 0.1 : 0.35} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </sprite>
        )}

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
                  <meshBasicMaterial color={new THREE.Color(TOKENS.misconception).multiplyScalar(1.6)} toneMapped={false} />
                </mesh>
              );
            })}
          </group>
        )}
      </group>

      {/* Canvas-texture label (no DOM: drei Html threw removeChild when a galaxy canvas unmounted). Selected → SelectedLabel. */}
      {hovered && !selected && !compact && (
        <TextSprite
          text={`${concept.id}  ${concept.name}  ${data.estimated ? "est. " : ""}${fmt2(data.p)}`}
          position={[0, r + 0.42, 0]}
          height={0.022}
          screenSpace
          color={data.estimated ? TOKENS.text : masteryColor(data.p)}
        />
      )}
    </group>
  );
}
