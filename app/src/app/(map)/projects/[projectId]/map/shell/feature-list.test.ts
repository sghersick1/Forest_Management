/*
 * Tests one-feature list changes. An unchanged geometry and a matching server id list do not write.
 */

import { describe, expect, it } from "vitest";
import type { GeoJSONStoreFeatures } from "terra-draw";
import { listAfter, replaceFromServer, savedFeature } from "./feature-list";

const id = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";

// A stored polygon fixture.
function feature(featureId: string, x = 0): GeoJSONStoreFeatures {
  return {
    type: "Feature",
    id: featureId,
    geometry: {
      type: "Polygon",
      coordinates: [[[x, 0], [x + 1, 0], [x + 1, 1], [x, 0]]],
    },
    properties: { mode: "polygon" },
  };
}

// A stored point fixture.
function point(featureId: string): GeoJSONStoreFeatures {
  return {
    type: "Feature",
    id: featureId,
    geometry: { type: "Point", coordinates: [0, 0] },
    properties: {},
  };
}

// The same feature with a display name.
function named(feature: GeoJSONStoreFeatures, name: string): GeoJSONStoreFeatures {
  return { ...feature, properties: { ...feature.properties, name } };
}

describe("feature list", () => {
  it("inserts, updates, and deletes one feature", () => {
    const first = feature(id);
    const second = feature(otherId, 5);
    const inserted = listAfter([], { type: "insert", feature: first });
    expect(inserted).toEqual([named(first, "Polygon 1")]);
    const updated = listAfter(inserted ?? [], { type: "update", feature: feature(id, 2) });
    expect(updated).toEqual([named(feature(id, 2), "Polygon 1")]);
    const withSecond = listAfter(updated ?? [], { type: "insert", feature: second });
    expect(withSecond).toEqual([
      named(feature(id, 2), "Polygon 1"),
      named(second, "Polygon 2"),
    ]);
    expect(listAfter(withSecond ?? [], { type: "delete", id })).toEqual([
      named(second, "Polygon 2"),
    ]);
  });

  it("skips a polygon number that differs only by letter case", () => {
    const inserted = listAfter([named(feature(id), "polygon 1")], {
      type: "insert",
      feature: feature(otherId),
    });
    expect(inserted?.[1].properties.name).toBe("Polygon 2");
  });

  it("skips a polygon number that is already used", () => {
    const inserted = listAfter([named(feature(id), "Polygon 2")], {
      type: "insert",
      feature: feature(otherId),
    });
    expect(inserted?.[1].properties.name).toBe("Polygon 1");
  });

  it("numbers a point separately from polygons", () => {
    const inserted = listAfter([named(feature(id), "Polygon 1")], {
      type: "insert",
      feature: point(otherId),
    });
    expect(inserted?.[1].properties.name).toBe("Point 1");
  });

  it("skips an update when the geometry is unchanged", () => {
    const current = feature(id);
    expect(listAfter([current], { type: "update", feature: feature(id) })).toBeNull();
  });

  it("replaces the list when the server ids change and does not describe a write", () => {
    const incoming = [feature(otherId)];
    expect(replaceFromServer(`${id}`, incoming)).toEqual({
      ids: otherId,
      features: incoming,
    });
    expect(replaceFromServer(otherId, incoming)).toBeNull();
    expect(savedFeature(feature("not-a-uuid"))).toBeNull();
    expect(savedFeature(named(feature(id), "Polygon 1"))?.name).toBe("Polygon 1");
  });

  it("renames one feature and leaves the geometry alone", () => {
    const current = named(feature(id), "Polygon 1");
    const renamed = listAfter([current], { type: "rename", id, name: "North stand" });
    expect(renamed).toEqual([named(feature(id), "North stand")]);
    expect(listAfter(renamed ?? [], { type: "rename", id, name: "North stand" })).toBeNull();
  });
});
