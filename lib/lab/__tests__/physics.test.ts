import { describe, expect, it } from "vitest";
import {
  airMass, bulbBrightness, fieldDirection, hasLab, rayDirection, rayleighTransmission, refractionAngle,
  scatterProbability, seriesReadings, sunlightColor, wrongRefractionAngle,
} from "../physics";

describe("MC01 series circuit", () => {
  it("really: the same current at every ammeter, identical bulbs equally bright", () => {
    expect(seriesReadings("real")).toEqual([0.5, 0.5, 0.5]);
    expect(bulbBrightness("real")).toEqual([1, 1]);
  });
  it("the misconception: current drops after each bulb, so bulb 2 is dimmer", () => {
    const [a1, a2, a3] = seriesReadings("said");
    expect(a1).toBeGreaterThan(a2);
    expect(a2).toBeGreaterThan(a3);
    expect(bulbBrightness("said")[1]).toBeLessThan(1);
  });
});

describe("MC11 refraction (n = 1.5)", () => {
  it("Snell's law: 30° → 19.47°, 60° → 35.26°, normal incidence undeviated", () => {
    expect(refractionAngle(30)).toBeCloseTo(19.47, 2);
    expect(refractionAngle(60)).toBeCloseTo(35.26, 2);
    expect(refractionAngle(0)).toBe(0);
  });
  it("entering glass the ray bends towards the normal; the misconception bends away", () => {
    for (const i of [10, 30, 50, 70]) {
      expect(refractionAngle(i)).toBeLessThan(i);
      expect(wrongRefractionAngle(i)).toBeGreaterThan(i);
    }
    expect(wrongRefractionAngle(85)).toBeLessThanOrEqual(88);
  });
  it("ray directions are unit vectors going down", () => {
    const [x, y] = rayDirection(40);
    expect(Math.hypot(x, y)).toBeCloseTo(1, 12);
    expect(y).toBeLessThan(0);
  });
});

describe("MC16 field around a wire", () => {
  it("really: tangential (perpendicular to the radius), following the right-hand thumb rule", () => {
    const [bx, bz] = fieldDirection(1, 0, true, "real");
    expect(bx * 1 + bz * 0).toBeCloseTo(0, 12); // ⟂ radius
    // Current +y, point +x: ŷ × x̂ = −ẑ.
    expect(bz).toBeCloseTo(-1, 12);
    expect(fieldDirection(1, 0, false, "real")[1]).toBeCloseTo(1, 12); // reversing current reverses B
  });
  it("the misconception: radially outward, independent of current direction", () => {
    expect(fieldDirection(0, 2, true, "said")).toEqual([0, 1]);
    expect(fieldDirection(0, 2, false, "said")).toEqual([0, 1]);
  });
});

describe("MC14 blue sky / red sunset", () => {
  it("blue scatters far more than red (Rayleigh ∝ 1/λ⁴, ≈ 4.4×)", () => {
    expect(scatterProbability(450) / scatterProbability(650)).toBeCloseTo((650 / 450) ** 4, 6);
  });
  it("air mass grows towards the horizon", () => {
    expect(airMass(90)).toBeCloseTo(1, 6);
    expect(airMass(10)).toBeGreaterThan(5);
    expect(airMass(0)).toBe(12);
  });
  it("direct sunlight goes from near-white overhead to orange-red near sunset", () => {
    const noon = sunlightColor(80);
    const dusk = sunlightColor(3);
    expect(noon[2]).toBeGreaterThan(0.7);
    expect(dusk[2]).toBeLessThan(noon[2]);
    expect(dusk[0]).toBe(1);
    expect(rayleighTransmission(450, 12)).toBeLessThan(rayleighTransmission(650, 12));
  });
  it("only the four planned misconceptions have labs", () => {
    expect(["MC01", "MC11", "MC16", "MC14"].every(hasLab)).toBe(true);
    expect(hasLab("MC02")).toBe(false);
  });
});
