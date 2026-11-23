/*
 * Tests the selection line against the hover line and the select action.
 */

import { describe, expect, it } from "vitest";
import { hoverLineData, type PolygonHit } from "./kinds/polygon/hit";
import {
  hatchColor,
  hatchLineWidth,
  hatchOpacity,
  hatchSegments,
  hatchSpacing,
  lineColorVariable,
  lineWidth,
  selectedHatchLayerId,
  selectedLineLayerId,
  selectionDraw,
  selectionHatchData,
  selectionLineData,
  type PlanePoint,
} from "./sync-selection";

const id = "22222222-2222-4222-8222-222222222222";
const square = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 0],
];

// A polygon fixture at the given origin.
function polygon(): PolygonHit {
  return {
    id,
    geometry: {
      type: "Polygon",
      coordinates: [square, [[1, 1], [2, 1], [2, 2], [1, 1]]],
    },
    properties: {},
  };
}

function ring(points: readonly (readonly [number, number])[]): PlanePoint[] {
  return points.map(([x, y]) => ({ x, y }));
}

function squareRings(hole: boolean) {
  const outer = ring([
    [0, 0],
    [100, 0],
    [100, 100],
    [0, 100],
    [0, 0],
  ]);
  if (!hole) return [outer];
  return [outer, ring([
    [40, 40],
    [60, 40],
    [60, 60],
    [40, 60],
    [40, 40],
  ])];
}

function midpoint(start: PlanePoint, end: PlanePoint) {
  return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
}

describe("selection hatch", () => {
  it("draws top-left to bottom-right lines 12px apart inside the polygon", () => {
    const segments = hatchSegments(squareRings(false));
    expect(segments.length).toBeGreaterThan(1);
    const constants: number[] = [];
    for (const [start, end] of segments) {
      const mid = midpoint(start, end);
      expect(mid.x).toBeGreaterThanOrEqual(-1e-6);
      expect(mid.y).toBeGreaterThanOrEqual(-1e-6);
      expect(mid.x).toBeLessThanOrEqual(100 + 1e-6);
      expect(mid.y).toBeLessThanOrEqual(100 + 1e-6);
      expect(end.x - start.x).toBeGreaterThan(0);
      expect(end.y - start.y).toBeCloseTo(end.x - start.x, 6);
      constants.push(start.x - start.y);
    }
    const unique = [...new Set(constants.map((value) => value.toFixed(4)))].map(Number).sort((a, b) => a - b);
    expect(unique.length).toBeGreaterThan(1);
    for (let index = 1; index < unique.length; index += 1) {
      expect((unique[index] - unique[index - 1]) / Math.SQRT2).toBeCloseTo(12, 3);
    }
  });

  it("leaves holes empty and stays fixed when the polygon shifts", () => {
    const open = hatchSegments(squareRings(false));
    const holed = hatchSegments(squareRings(true));
    expect(holed.length).toBeGreaterThan(open.length);
    for (const [start, end] of holed) {
      const mid = midpoint(start, end);
      const inHole = mid.x > 40 && mid.x < 60 && mid.y > 40 && mid.y < 60;
      expect(inHole).toBe(false);
    }
    const shifted = hatchSegments(squareRings(false).map((path) =>
      path.map((point) => ({ x: point.x + 12, y: point.y - 4 })),
    ));
    expect(shifted.length).toBe(open.length);
    for (let index = 0; index < open.length; index += 1) {
      expect(shifted[index][0].x).toBeCloseTo(open[index][0].x + 12, 5);
      expect(shifted[index][0].y).toBeCloseTo(open[index][0].y - 4, 5);
    }
  });
});

describe("selection outline", () => {
  it("uses the same line as hover, including holes", () => {
    const feature = polygon();
    expect(selectionLineData(feature)).toEqual(hoverLineData(feature));
    expect(selectionLineData(null).features).toEqual([]);
  });

  it("names the top line layer and paints it like the polygon stroke", () => {
    expect(selectedLineLayerId).toBe("feature-selected-line");
    expect(lineColorVariable).toBe("--map-polygon");
    expect(lineWidth).toBe(2);
  });

  it("keeps the blue outline and adds a 1px white hatch only when not linking", () => {
    expect(selectedHatchLayerId).toBe("feature-selected-hatch");
    expect(hatchSpacing).toBe(12);
    expect(hatchLineWidth).toBe(1);
    expect(hatchColor).toBe("#ffffff");
    expect(hatchOpacity).toBe(0.5);
    const feature = polygon();
    const project = (lng: number, lat: number) => ({ x: lng, y: lat });
    const unproject = (x: number, y: number) => [x, y] as [number, number];
    const hatched = selectionHatchData(feature, project, unproject, false);
    expect(hatched.features.length).toBeGreaterThan(0);
    expect(selectionHatchData(feature, project, unproject, true).features).toEqual([]);
    expect(selectionHatchData(null, project, unproject, false).features).toEqual([]);
    expect(selectionHatchData(
      { ...feature, geometry: { type: "Point", coordinates: [0, 0] } },
      project,
      unproject,
      false,
    ).features).toEqual([]);
  });

  it("selects a new id and deselects when the selection is cleared", () => {
    expect(selectionDraw(id, null, true)).toBe("select");
    expect(selectionDraw(id, id, true)).toBe("none");
    expect(selectionDraw(id, null, false)).toBe("none");
    expect(selectionDraw(null, id, true)).toBe("deselect");
    expect(selectionDraw(null, null, false)).toBe("none");
  });
});
