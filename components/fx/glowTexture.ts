import * as THREE from "three";

let texture: THREE.Texture | null = null;

/** Shared soft radial-gradient sprite texture (coronas, flashes, comet heads). */
export function glowTexture(): THREE.Texture {
  if (texture) return texture;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  texture = new THREE.CanvasTexture(canvas);
  return texture;
}
