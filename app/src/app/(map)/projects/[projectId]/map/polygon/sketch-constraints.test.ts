import { describe, expect, it } from "vitest";
import {
  bearingDegrees,
  canClosePolygon,
  deflectionDegrees,
  destinationFeet,
  normalizeBearing,
  segmentFeet,
  snapRightAngle,
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

  it("snaps a new segment only within 3 degrees of straight or a right angle", () => {
    const previous = { x: 0, y: 0 };
    const origin = { x: 100, y: 0 };

    const right = snapRightAngle(previous, origin, pointAt(88));
    expect(right?.x).toBeCloseTo(100, 6);
    expect(right?.y).toBeCloseTo(100, 6);
    expect(snapRightAngle(previous, origin, pointAt(2))).toEqual({ x: 200, y: 0 });
    expect(snapRightAngle(previous, origin, pointAt(-88))?.x).toBeCloseTo(100, 6);
    expect(snapRightAngle(previous, origin, pointAt(-88))?.y).toBeCloseTo(-100, 6);
    expect(snapRightAngle(previous, origin, pointAt(80))).toBeNull();
    expect(snapRightAngle(previous, origin, pointAt(10))).toBeNull();
    expect(snapRightAngle(previous, origin, pointAt(178))).toBeNull();
    expect(snapRightAngle(previous, origin, origin)).toBeNull();
  });
});

function pointAt(degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  return { x: 100 + Math.cos(radians) * 100, y: Math.sin(radians) * 100 };
}
