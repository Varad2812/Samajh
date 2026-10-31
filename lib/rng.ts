/** mulberry32: tiny seeded PRNG so synthetic data is identical on every run. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = () => number;

export const randInt = (rng: Rng, min: number, max: number): number =>
  min + Math.floor(rng() * (max - min + 1));

export const pick = <T>(rng: Rng, items: readonly T[]): T =>
  items[Math.floor(rng() * items.length)];

/** Approximately normal noise (sum of uniforms), mean 0, sd ≈ `sd`. */
export const gaussian = (rng: Rng, sd = 1): number =>
  (rng() + rng() + rng() + rng() + rng() + rng() - 3) * sd * Math.SQRT2;
