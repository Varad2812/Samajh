"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Bloom, ChromaticAberration, EffectComposer, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, type ChromaticAberrationEffect, ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import { useQuality, useSignals } from "./SceneSignals";

const CA_BASE = 0.0004;
const CA_FLY = 0.0024;
const CA_START = new THREE.Vector2(CA_BASE, CA_BASE);

/** Very subtle chromatic aberration that swells briefly during camera fly-tos. */
function FlyAberration() {
  const ref = useRef<ChromaticAberrationEffect>(null);
  const signals = useSignals();
  useFrame(() => {
    const v = CA_BASE + CA_FLY * signals.fly;
    ref.current?.offset.set(v, v * 0.6);
  });
  return <ChromaticAberration ref={ref} offset={CA_START} radialModulation={false} modulationOffset={0} />;
}

/** DESIGN.md §4.1 post stack: Bloom (mipmap) → ACES → chromatic aberration → film grain → vignette. */
export function PostStack() {
  const { low } = useQuality();
  // Separate composers so the effect list is static per quality level.
  return low ? (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur luminanceThreshold={0.2} intensity={0.9} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Noise opacity={0.03} blendFunction={BlendFunction.SCREEN} />
      <Vignette offset={0.3} darkness={0.75} />
    </EffectComposer>
  ) : (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur luminanceThreshold={0.2} intensity={0.9} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <FlyAberration />
      <Noise opacity={0.03} blendFunction={BlendFunction.SCREEN} />
      <Vignette offset={0.3} darkness={0.75} />
    </EffectComposer>
  );
}
