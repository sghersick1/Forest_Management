/*
 * Tests insert on close and update when a reshape changes geometry.
 */

import { describe, expect, it } from "vitest";
import type { SketchFeature } from "../kinds/polygon/create";
import { commitCommand } from "./commit";

const id = "11111111-1111-4111-8111-111111111111";

// A polygon fixture at the given origin.
function polygon(x: number, drawing = false): SketchFeature {
  return {
    id,
    geometry: {
      type: "Polygon",
      coordinates: [[[x, 0], [x + 1, 0], [x + 1, 1], [x, 0]]],
    },
    properties: { currentlyDrawing: drawing },
  };
}

describe("commit command", () => {
  it("inserts a ring once it has three vertices", () => {
    const drawing = polygon(0, true);
    const result = commitCommand({
      tool: "polygon",
      reshaping: false,
      committedVertices: 3,
      drawing,
      selected: null,
      stored: null,
    });
    expect(result.closeRing).toBe(true);
    expect(result.write).toEqual({
      type: "insert",
      feature: { ...drawing, properties: { currentlyDrawing: false } },
    });
  });

  it("does not insert a ring with fewer than three vertices", () => {
    expect(
      commitCommand({
        tool: "polygon",
        reshaping: false,
        committedVertices: 2,
        drawing: polygon(0, true),
        selected: null,
        stored: null,
      }).write,
    ).toBeNull();
  });

  it("updates a reshaped polygon only when its geometry changed", () => {
    const stored = polygon(0);
    const selected = polygon(3);
    expect(
      commitCommand({
        tool: "pointer",
        reshaping: true,
        committedVertices: 0,
        drawing: null,
        selected,
        stored,
      }).write,
    ).toEqual({ type: "update", feature: selected });
    expect(
      commitCommand({
        tool: "pointer",
        reshaping: true,
        committedVertices: 0,
        drawing: null,
        selected: stored,
        stored,
      }).write,
    ).toBeNull();
  });

  it("does nothing when no ring is open and no reshape is active", () => {
    expect(
      commitCommand({
        tool: "pointer",
        reshaping: false,
        committedVertices: 0,
        drawing: null,
        selected: null,
        stored: null,
      }),
    ).toEqual({ write: null, closeRing: false, leaveReshape: false });
  });
});
