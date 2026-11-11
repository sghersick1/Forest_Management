/*
 * Tests the hover line data and its stroke.
 */

import { describe, expect, it } from "vitest";
import { hoverLineData, type PolygonHit } from "./kinds/polygon/hit";
import { hoverLineCollection, hoverLineLayerId, lineColorVariable, lineWidth } from "./sync-hover";

const feature: PolygonHit = {
  id: "22222222-2222-4222-8222-222222222222",
  geometry: {
    type: "Polygon",
    coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]],
  },
  properties: {},
};

describe("hover outline", () => {
  it("builds the hover line from the hovered polygon", () => {
    expect(hoverLineCollection(feature)).toEqual(hoverLineData(feature));
    expect(hoverLineCollection(null).features).toEqual([]);
  });

  it("uses the same stroke as the selection line", () => {
    expect(hoverLineLayerId).toBe("feature-hover-line");
    expect(lineColorVariable).toBe("--map-polygon");
    expect(lineWidth).toBe(2);
  });
});
