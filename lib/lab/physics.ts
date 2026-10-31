/**
 * Physics behind the Misconception Lab sims (DESIGN.md §4.2 item 4). Pure and tested: the 3D scenes only draw
 * what these functions say, so "what really happens" is always physically right.
 */

/** Misconceptions that have a 3D lab ("See it in 3D"). */
export const LAB_MISCONCEPTIONS = ["MC01", "MC11", "MC16", "MC14"] as const;
export type LabMisconception = (typeof LAB_MISCONCEPTIONS)[number];
export const hasLab = (mcId: string): mcId is LabMisconception => (LAB_MISCONCEPTIONS as readonly string[]).includes(mcId);

export type Variant = "said" | "real";

const DEG = Math.PI / 180;

// ───────────── MC01: series circuit ─────────────

/** Ammeter readings A1 (before bulb 1), A2 (between bulbs), A3 (after bulb 2), in amperes. */
export function seriesReadings(variant: Variant, current = 0.5): [number, number, number] {
  // The misconception: each bulb "uses up" some of the current.
  return variant === "real" ? [current, current, current] : [current, current * 0.6, current * 0.2];
}

/** Relative bulb brightness ∝ P = I²R with identical bulbs. */
export function bulbBrightness(variant: Variant): [number, number] {
  // Bulb 1 carries the current arriving at it (A1), bulb 2 the current arriving at it (A2).
  const [a1, a2] = seriesReadings(variant);
  return [1, (a2 / a1) ** 2];
}

// ───────────── MC11: refraction ─────────────

export const N_AIR = 1;
export const N_GLASS = 1.5;

/** Angle of refraction from Snell's law n₁ sin i = n₂ sin r (degrees). Entering glass it bends towards the normal. */
export function refractionAngle(incidenceDeg: number, n1 = N_AIR, n2 = N_GLASS): number {
  const s = (n1 / n2) * Math.sin(incidenceDeg * DEG);
  return Math.asin(Math.min(1, Math.max(-1, s))) / DEG;
}

/** The misconception: bends *away* from the normal by the same deviation (capped below grazing). */
export function wrongRefractionAngle(incidenceDeg: number): number {
  const r = refractionAngle(incidenceDeg);
  return Math.min(88, incidenceDeg + (incidenceDeg - r));
}

/** Unit direction (x, y) of a ray at `angleDeg` from the downward normal, travelling down and to the right. */
export function rayDirection(angleDeg: number): [number, number] {
  return [Math.sin(angleDeg * DEG), -Math.cos(angleDeg * DEG)];
}

// ───────────── MC16: field around a straight wire ─────────────

/**
 * Field direction (x, z) at a point around a vertical wire at the origin.
 * Real: B ∝ I ŷ × r̂ (right-hand thumb rule) → tangential circles. Misconception: radially outward.
 */
export function fieldDirection(x: number, z: number, currentUp: boolean, variant: Variant): [number, number] {
  const r = Math.hypot(x, z) || 1;
  if (variant === "said") return [x / r, z / r];
  // ŷ × (x, 0, z)/r = (z, 0, −x)/r ; reversing the current flips it.
  const s = currentUp ? 1 : -1;
  return [(s * z) / r, (-s * x) / r];
}

// ───────────── MC14: blue sky ─────────────

export const WAVELENGTHS = { red: 650, green: 550, blue: 450 } as const;

/** Relative air mass for the sun at `elevationDeg` above the horizon (1 overhead, ~12 near sunset). */
export function airMass(elevationDeg: number): number {
  return Math.min(12, 1 / Math.max(Math.sin(Math.max(elevationDeg, 0.5) * DEG), 1 / 12));
}

/** Fraction of light of wavelength λ that survives a path, with Rayleigh scattering ∝ 1/λ⁴. */
export function rayleighTransmission(lambdaNm: number, mass: number, k = 0.12): number {
  return Math.exp(-k * mass * (WAVELENGTHS.green / lambdaNm) ** 4);
}

/** Colour (0..1 RGB) of direct sunlight after the atmosphere. Low sun → long path → blue scattered out → orange/red. */
export function sunlightColor(elevationDeg: number): [number, number, number] {
  const m = airMass(elevationDeg);
  const rgb = [WAVELENGTHS.red, WAVELENGTHS.green, WAVELENGTHS.blue].map((l) => rayleighTransmission(l, m));
  const max = Math.max(...rgb);
  return [rgb[0] / max, rgb[1] / max, rgb[2] / max];
}

/** Probability that a photon of wavelength λ scatters off an air molecule on a short hop (∝ 1/λ⁴). */
export function scatterProbability(lambdaNm: number, base = 0.03): number {
  return Math.min(1, base * (WAVELENGTHS.blue / lambdaNm) ** 4);
}
