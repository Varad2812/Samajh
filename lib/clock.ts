/** Virtual clock: real time shifted by a day offset, so "Fast-forward 3 days" works everywhere. */
export const DAY_MS = 86_400_000;

export function now(offsetDays: number): number {
  return Date.now() + offsetDays * DAY_MS;
}

export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function addDays(ms: number, days: number): number {
  return ms + days * DAY_MS;
}

/** Whole calendar days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: number, to: number): number {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);
}

export function formatVirtualDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}
