"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";

interface Props {
  text: string;
  position?: [number, number, number];
  /** World-space height of the text line. */
  height?: number;
  color?: string;
  background?: string | null;
  weight?: number;
  opacity?: number;
  /** Constant on-screen size: `height` is then a fraction of the viewport height (galaxy labels at any zoom). */
  screenSpace?: boolean;
}

/**
 * Billboarded text drawn to a canvas texture. No DOM (drei Html) and no font download (drei Text),
 * so it works offline and never throws on unmount.
 */
export function TextSprite({ text, position = [0, 0, 0], height = 0.22, color = "#E7E9F0", background = "rgba(14,16,24,0.82)", weight = 600, opacity = 1, screenSpace = false }: Props) {
  const { texture, aspect } = useMemo(() => {
    const scale = 4;
    const font = `${weight} ${32 * scale}px Inter, ui-sans-serif, system-ui, sans-serif`;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    ctx.font = font;
    const padX = 14 * scale;
    const w = Math.ceil(ctx.measureText(text).width + padX * 2);
    const h = 52 * scale;
    canvas.width = w;
    canvas.height = h;
    if (background) {
      ctx.fillStyle = background;
      const r = 12 * scale;
      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, r);
      ctx.fill();
    }
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textBaseline = "middle";
    ctx.fillText(text, padX, h / 2 + scale);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return { texture: t, aspect: w / h };
  }, [text, color, background, weight]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <sprite position={position} scale={[height * aspect * 1.3, height * 1.3, 1]} renderOrder={10}>
      <spriteMaterial map={texture} transparent opacity={opacity} sizeAttenuation={!screenSpace} depthWrite={false} depthTest={false} toneMapped={false} />
    </sprite>
  );
}
