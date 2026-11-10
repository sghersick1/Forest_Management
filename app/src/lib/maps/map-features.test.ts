import { describe, expect, it } from "vitest";
import { diffMapFeatures, type MapFeature, type MapPolygon } from "@/lib/maps/map-features";

const id = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";

const ring: MapPolygon = {
  type: "Polygon",
  coordinates: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 0],
    ],
  ],
};

const moved: MapPolygon = {
  type: "Polygon",
  coordinates: [
    [
      [2, 0],
      [3, 0],
      [3, 1],
      [2, 0],
    ],
  ],
};

function feature(featureId: string, geometry: MapPolygon = ring): MapFeature {
  return { id: featureId, geometry };
}

describe("diffMapFeatures", () => {
  it("inserts a feature that is not stored yet", () => {
    expect(diffMapFeatures([], [feature(id)])).toEqual({
      inserts: [feature(id)],
      updates: [],
      deletes: [],
    });
  });

  it("updates a feature when its geometry changes", () => {
    expect(diffMapFeatures([feature(id)], [feature(id, moved)])).toEqual({
      inserts: [],
      updates: [feature(id, moved)],
      deletes: [],
    });
  });

  it("deletes a stored feature missing from the snapshot", () => {
    expect(diffMapFeatures([feature(id), feature(otherId)], [feature(id)])).toEqual({
      inserts: [],
      updates: [],
      deletes: [otherId],
    });
  });

  it("deletes every stored feature when the snapshot is empty", () => {
    expect(diffMapFeatures([feature(id), feature(otherId)], [])).toEqual({
      inserts: [],
      updates: [],
      deletes: [id, otherId],
    });
  });
});
