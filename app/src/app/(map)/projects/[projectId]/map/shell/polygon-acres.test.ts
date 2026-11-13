/*
 * Tests geodesic acreage against the sketch ring measurement.
 */

import { describe, expect, it } from "vitest";
import type { GeoJSONStoreFeatures } from "terra-draw";
import { ringAcres } from "../sketch/kinds/polygon/constraints";
import { polygonAcres } from "./polygon-acres";

const ring: [number, number][] = [
  [-81.3, 41.6],
  [-81.29, 41.6],
  [-81.29, 41.61],
  [-81.3, 41.61],
];

describe("polygon acres", () => {
  it("matches the geodesic area of the same ring", () => {
    expect(polygonAcres(polygon(ring))).toBeCloseTo(ringAcres(ring), 5);
    expect(polygonAcres(polygon(ring)) ?? 0).toBeGreaterThan(200);
  });

  it("subtracts a hole from the outer ring", () => {
    const outer = polygonAcres(polygon(ring)) ?? 0;
    const withHole = polygonAcres(polygon(ring, hole(ring)));
    expect(withHole).toBeLessThan(outer);
    expect(withHole).toBeGreaterThan(0);
  });

  it("has no acreage for a point", () => {
    const point: GeoJSONStoreFeatures = {
      type: "Feature",
      id: "point",
      geometry: { type: "Point", coordinates: ring[0] },
      properties: {},
    };
    expect(polygonAcres(point)).toBeNull();
    expect(polygonAcres(undefined)).toBeNull();
  });
});

// A polygon feature. Extra rings are holes.
function polygon(...rings: [number, number][][]): GeoJSONStoreFeatures {
  return {
    type: "Feature",
    id: "polygon",
    geometry: {
      type: "Polygon",
      coordinates: rings.map((ring) => [...ring, ring[0]]),
    },
    properties: {},
  };
}

// A ring inset from the outer ring. Later rings are subtracted.
function hole(outer: [number, number][]): [number, number][] {
  const west = Math.min(...outer.map((point) => point[0]));
  const east = Math.max(...outer.map((point) => point[0]));
  const south = Math.min(...outer.map((point) => point[1]));
  const north = Math.max(...outer.map((point) => point[1]));
  const lngPad = (east - west) * 0.25;
  const latPad = (north - south) * 0.25;
  return [
    [west + lngPad, south + latPad],
    [east - lngPad, south + latPad],
    [east - lngPad, north - latPad],
    [west + lngPad, north - latPad],
  ];
}
