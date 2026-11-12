/*
 * Tests clearing a selection and saving a reshape only when geometry changed.
 */

import { describe, expect, it } from "vitest";
import type { SketchFeature } from "../kinds/polygon/create";
import { deselectCommand } from "./deselect";

const id = "11111111-1111-4111-8111-111111111111";

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

describe("deselect command", () => {
  it("clears the selection and reshape without a write when the geometry is unchanged", () => {
    const feature = polygon(0);
    expect(deselectCommand({ reshaping: true, selected: feature, stored: feature })).toEqual({
      selectedId: null,
      reshaping: false,
      write: null,
    });
  });

  it("updates that one polygon when reshape changed its geometry", () => {
    const stored = polygon(0);
    const selected = polygon(2);
    expect(deselectCommand({ reshaping: true, selected, stored })).toEqual({
      selectedId: null,
      reshaping: false,
      write: { type: "update", feature: selected },
    });
  });

  it("clears a selection that was not reshaping", () => {
    expect(deselectCommand({ reshaping: false, selected: polygon(0), stored: polygon(2) })).toEqual({
      selectedId: null,
      reshaping: false,
      write: null,
    });
  });
});
