import { describe, expect, it } from "vitest";
import { appendFx, crossesMastered, misconceptionFx, shockwaveFor } from "../fx";

describe("fx event helpers", () => {
  it("a mastery change fires a shockwave; tiny changes don't", () => {
    expect(shockwaveFor("C6", 0.28, 0.41)).toEqual({ kind: "shockwave", conceptId: "C6", from: 0.28, to: 0.41 });
    expect(shockwaveFor("C6", 0.41, 0.412)).toBeNull();
  });

  it("new misconceptions strike their concept; cleared ones shatter", () => {
    expect(misconceptionFx(["MC02"], ["MC02", "MC01"])).toEqual([{ kind: "strike", conceptId: "C1", misconceptionId: "MC01" }]);
    expect(misconceptionFx(["MC01", "MC02"], ["MC02"])).toEqual([{ kind: "shatter", conceptId: "C1", misconceptionId: "MC01" }]);
    expect(misconceptionFx(["MC01"], ["MC01"])).toEqual([]);
  });

  it("supernova only when crossing into mastered (0.85)", () => {
    expect(crossesMastered(0.8, 0.86)).toBe(true);
    expect(crossesMastered(0.86, 0.9)).toBe(false);
    expect(crossesMastered(0.5, 0.84)).toBe(false);
  });

  it("appendFx assigns sequential ids and caps the queue", () => {
    const first = appendFx([], [{ kind: "ignition" }, { kind: "ignition" }], 1, 100);
    expect(first.fx.map((e) => e.id)).toEqual([1, 2]);
    expect(first.fxSeq).toBe(3);
    let q = first;
    for (let i = 0; i < 40; i++) q = appendFx(q.fx, [{ kind: "ignition" }], q.fxSeq, 200 + i);
    expect(q.fx).toHaveLength(24);
    expect(q.fx.at(-1)?.id).toBe(42);
  });
});
