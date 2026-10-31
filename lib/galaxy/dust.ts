/**
 * Galactic core + spiral-arm dust (DESIGN.md §4.1). Untilted coordinates: the scene applies the ring tilt.
 * Four logarithmic arms each pass through one chapter cluster, so constellations sit on the arms.
 */
import { CHAPTERS } from "@/lib/data/concepts";
import { gaussian, mulberry32 } from "@/lib/rng";
import { CHAPTER_ANGLE, CHAPTER_COLOR, RING_RADIUS } from "./layout";

export const DUST_COUNT = 7000;
const ARM_TWIST = 1.15;
const CORE_FRACTION = 0.15;
const MAX_R = 15;

export interface DustData {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  seeds: Float32Array;
}

const hex = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/** Arm angle at radius r for the arm through angle `through` at the cluster ring. */
export const armAngle = (through: number, r: number): number => through + ARM_TWIST * Math.log(Math.max(r, 0.3) / RING_RADIUS);

export function generateDust(count = DUST_COUNT, seed = 7): DustData {
  const rng = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const seeds = new Float32Array(count);
  const core = hex("#FFE2B0");
  const arm = hex("#8FA6FF");
  const arms = CHAPTERS.map((ch) => ({ angle: CHAPTER_ANGLE[ch.id], tint: hex(CHAPTER_COLOR[ch.id]) }));

  for (let i = 0; i < count; i++) {
    let x: number, y: number, z: number, r: number;
    let tint: [number, number, number] = core;
    if (rng() < CORE_FRACTION) {
      r = Math.abs(gaussian(rng, 1.1));
      const a = rng() * Math.PI * 2;
      x = Math.cos(a) * r;
      z = Math.sin(a) * r;
      y = gaussian(rng, 0.45) * Math.exp(-r / 2);
    } else {
      const a0 = arms[i % arms.length];
      r = 0.6 + (MAX_R - 0.6) * Math.pow(rng(), 1.25);
      const a = armAngle(a0.angle, r) + gaussian(rng, 0.22 * (1 + r / MAX_R));
      const jitter = gaussian(rng, 0.35);
      x = Math.cos(a) * (r + jitter);
      z = Math.sin(a) * (r + jitter);
      y = gaussian(rng, 0.1 + 0.25 * Math.exp(-r / 4));
      tint = a0.tint;
    }
    positions.set([x, y, z], i * 3);
    // Warm core fading into cool arms, lightly tinted by the arm's chapter.
    const coreMix = Math.exp(-r / 2.2);
    const brightness = 0.35 + 0.65 * Math.exp(-r / 9);
    for (let k = 0; k < 3; k++) {
      const base = core[k] * coreMix + (arm[k] * 0.7 + tint[k] * 0.3) * (1 - coreMix);
      colors[i * 3 + k] = base * brightness;
    }
    sizes[i] = (0.6 + rng() * 1.4) * (1 + coreMix * 0.8);
    seeds[i] = rng();
  }
  return { positions, colors, sizes, seeds };
}
