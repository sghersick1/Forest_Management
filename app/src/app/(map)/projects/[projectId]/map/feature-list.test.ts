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

describe("feature list", () => {
  it("inserts, updates, and deletes one feature", () => {
    const first = feature(id);
    const second = feature(otherId, 5);
    const inserted = listAfter([], { type: "insert", feature: first });
    expect(inserted).toEqual([first]);
    const updated = listAfter(inserted ?? [], { type: "update", feature: feature(id, 2) });
    expect(updated).toEqual([feature(id, 2)]);
    const withSecond = listAfter(updated ?? [], { type: "insert", feature: second });
    expect(listAfter(withSecond ?? [], { type: "delete", id })).toEqual([second]);
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
  });
});
