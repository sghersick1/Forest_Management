/*
 * Tests closing a ring and cancelling it without an insert.
 */

import { describe, expect, it } from "vitest";
import { cancelCreate, finishedCreate, rightAngleCoordinate, roundStoredPolygon, type SketchFeature } from "./create";

const id = "11111111-1111-4111-8111-111111111111";

const open: SketchFeature = {
  id,
  geometry: {
    type: "Polygon",
    coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]],
  },
  properties: { currentlyDrawing: true },
};

describe("create polygon", () => {
  it("returns one finished polygon and not the open ring", () => {
    expect(finishedCreate(open, 3)).toEqual({
      type: "insert",
      feature: { ...open, properties: { currentlyDrawing: false } },
    });
    expect(finishedCreate(open, 2)).toBeNull();
  });

  it("returns no insert when the drawing is cancelled", () => {
    expect(cancelCreate()).toBeNull();
  });

  it("rounds a snapped vertex and a stored ring to nine decimal places", () => {
    const snapped = rightAngleCoordinate({
      coordinate: 2,
      ring: [[0, 0], [100, 0], [100, 0]],
      cursor: { x: 100, y: 100 },
      otherRings: [],
      project: (lng, lat) => ({ x: lng, y: lat }),
      unproject: (point) => [point.x + 1.2345678912345e-11, point.y + 4.5678912345678e-12],
    });
    expect(snapped).toEqual([100, 100]);

    const stored = roundStoredPolygon({
      id,
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-80.14622665, 40.779555499],
          [-80.15022761999333, 40.776366187790444],
          [-80.145506731, 40.776421767],
          [-80.14622665, 40.779555499],
        ]],
      },
    });
    expect(stored.geometry.coordinates?.[0][1]).toEqual([-80.15022762, 40.776366188]);
    const ring = stored.geometry.coordinates?.[0] ?? [];
    expect(ring[0]).toEqual(ring[ring.length - 1]);
  });
});
