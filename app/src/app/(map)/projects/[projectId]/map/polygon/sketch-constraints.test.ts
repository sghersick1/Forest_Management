import { describe, expect, it } from "vitest";
import {
  bearingDegrees,
  canClosePolygon,
  deflectionDegrees,
  destinationFeet,
  normalizeBearing,
  segmentFeet,
} from "./sketch-constraints";

describe("sketch constraints", () => {
  it("moves a point north by the requested feet", () => {
    const origin: [number, number] = [-81.3, 41.6];
    const point = destinationFeet(origin, 0, 1000);

    expect(point[1]).toBeGreaterThan(origin[1]);
    expect(point[0]).toBeCloseTo(origin[0], 4);
    expect(bearingDegrees(origin, point)).toBeCloseTo(0, 1);
    expect(segmentFeet(origin, point)).toBeCloseTo(1000, 0);
  });

  it("turns a deflection off the previous bearing", () => {
    expect(normalizeBearing(-90)).toBe(270);
    expect(deflectionDegrees(0, 90)).toBe(90);
    expect(deflectionDegrees(10, 350)).toBeCloseTo(-20, 5);
  });

  it("closes a polygon only after three vertices", () => {
    expect(canClosePolygon(2)).toBe(false);
    expect(canClosePolygon(3)).toBe(true);
  });
});
