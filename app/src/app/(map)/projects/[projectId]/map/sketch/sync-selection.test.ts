/*
 * Tests the selection line against the hover line and the select action.
 */

import { describe, expect, it } from "vitest";
import { hoverLineData, type PolygonHit } from "./kinds/polygon/hit";
import {
  lineColorVariable,
  lineWidth,
  selectedLineLayerId,
  selectionDraw,
  selectionLineData,
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

  it("selects a new id and deselects when the selection is cleared", () => {
    expect(selectionDraw(id, null, true)).toBe("select");
    expect(selectionDraw(id, id, true)).toBe("none");
    expect(selectionDraw(id, null, false)).toBe("none");
    expect(selectionDraw(null, id, true)).toBe("deselect");
    expect(selectionDraw(null, null, false)).toBe("none");
  });
});
