/*
 * Tests closing a ring and cancelling it without an insert.
 */

import { describe, expect, it } from "vitest";
import { cancelCreate, finishedCreate, type SketchFeature } from "./create";

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
});
