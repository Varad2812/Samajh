"use client";

import { useLayoutEffect, useMemo } from "react";
import { Html, Stars } from "@react-three/drei";
import * as THREE from "three";
import { CHAPTERS } from "@/lib/data/concepts";
import { CHAPTER_COLOR, galaxyLayout } from "@/lib/galaxy/layout";

/** Soft radial-gradient texture for nebula sprites. */
function useGlowTexture(): THREE.Texture {
  const texture = useMemo(() => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.35, "rgba(255,255,255,0.35)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);
  useLayoutEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** drei Stars + a faint nebula glow behind each chapter cluster. */
export function Starfield({ reducedMotion, nebulaScale = 9 }: { reducedMotion: boolean; nebulaScale?: number }) {
  const glow = useGlowTexture();
  const { clusterCenters } = galaxyLayout();
  return (
    <>
      <Stars radius={70} depth={40} count={3500} factor={3} saturation={0} fade speed={reducedMotion ? 0 : 0.6} />
      {CHAPTERS.map((ch) => (
        <sprite key={ch.id} position={clusterCenters[ch.id]} scale={[nebulaScale, nebulaScale, 1]} renderOrder={-1}>
          <spriteMaterial map={glow} color={CHAPTER_COLOR[ch.id]} transparent opacity={0.13} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>
      ))}
    </>
  );
}

/** Chapter names floating above each cluster. */
export function ClusterLabels() {
  const { clusterCenters } = galaxyLayout();
  return (
    <>
      {CHAPTERS.map((ch) => {
        const [x, y, z] = clusterCenters[ch.id];
        return (
          <Html key={ch.id} position={[x, y + 2.6, z]} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
            <div className="label-caps whitespace-nowrap" style={{ color: CHAPTER_COLOR[ch.id], opacity: 0.85 }}>
              {ch.short === "Elec" ? "Electricity" : ch.short === "Mag" ? "Magnetism" : ch.short}
            </div>
          </Html>
        );
      })}
    </>
  );
}
