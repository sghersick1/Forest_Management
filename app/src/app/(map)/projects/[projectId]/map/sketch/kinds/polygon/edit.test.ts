/*
 * Tests reshape, vertex delete, and the update returned when an edit ends.
 */

import { describe, expect, it } from "vitest";
import type { SketchFeature } from "./create";
import { beginReshape, finishedEdit, vertexAtPointer } from "./edit";

const id = "11111111-1111-4111-8111-111111111111";
const ring = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
  [0, 0],
];

// A polygon fixture at the given origin.
function polygon(x: number): SketchFeature {
  return {
    id,
    geometry: {
      type: "Polygon",
      coordinates: [[[x, 0], [x + 1, 0], [x + 1, 1], [x, 0]]],
    },
    properties: {},
  };
}

describe("edit polygon", () => {
  it("starts reshape for the double-clicked polygon", () => {
    expect(beginReshape(id)).toEqual({ type: "reshape", id });
    expect(beginReshape(null)).toBeNull();
  });

  it("names the vertex under the pointer and does not delete the polygon", () => {
    const vertex = vertexAtPointer(ring, { x: 0, y: 0 }, (lng, lat) => ({ x: lng, y: lat }));
    expect(vertex).toEqual({ type: "delete-vertex", index: 0 });
    expect(vertex?.type).not.toBe("delete");
  });

  it("returns the reshaped polygon when the edit ends", () => {
    const stored = polygon(0);
    const selected = polygon(4);
    expect(finishedEdit(selected, stored)).toEqual({ type: "update", feature: selected });
  });
});
