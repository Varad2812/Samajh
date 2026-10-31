import type { MasteryBand } from "@/lib/types";

export { cn } from "cn";

export const clamp = (x: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, x));

/** Token hexes, mirrored from app/globals.css for use in canvas / three.js. */
export const TOKENS = {
  bg: "#07080D",
  surface: "#0E1018",
  surface2: "#151826",
  text: "#E7E9F0",
  muted: "#8A90A6",
  accent: "#4FD1FF",
  accent2: "#7C5CFF",
  weak: "#FF4D6D",
  developing: "#FFB547",
  proficient: "#9BE15D",
  mastered: "#2EE6A6",
  unknown: "#3A3F55",
  misconception: "#A78BFA",
} as const;

/** Colour stops placed inside each band so band colours read clearly. */
const STOPS: [number, string][] = [
  [0.15, TOKENS.weak],
  [0.45, TOKENS.developing],
  [0.72, TOKENS.proficient],
  [0.9, TOKENS.mastered],
];

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const toHex = (rgb: number[]): string =>
  "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();

/**
 * Continuous mastery colour, weak → developing → proficient → mastered.
 * The single source of mastery colour for both 2D UI and the 3D galaxy.
 */
export function masteryColor(m: number | null | undefined): string {
  if (m === null || m === undefined || Number.isNaN(m)) return TOKENS.unknown;
  const x = clamp(m);
  if (x <= STOPS[0][0]) return STOPS[0][1];
  for (let i = 1; i < STOPS.length; i++) {
    const [p1, c1] = STOPS[i];
    if (x <= p1) {
      const [p0, c0] = STOPS[i - 1];
      const t = (x - p0) / (p1 - p0);
      const a = hexToRgb(c0);
      const b = hexToRgb(c1);
      return toHex(a.map((v, k) => v + (b[k] - v) * t));
    }
  }
  return STOPS[STOPS.length - 1][1];
}

export function masteryBand(m: number): MasteryBand {
  if (m < 0.3) return "weak";
  if (m < 0.6) return "developing";
  if (m < 0.85) return "proficient";
  return "mastered";
}

export const fmt2 = (x: number): string => x.toFixed(2).replace(/^0\./, ".");
export const pct = (x: number): string => `${Math.round(x * 100)}%`;
