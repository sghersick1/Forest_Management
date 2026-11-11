/*
 * Tests which polygon handles are on during reshape.
 */

import { describe, expect, it } from "vitest";
import { polygonFlags } from "./flags";

describe("polygon flags", () => {
  it("shows draggable vertices and midpoints while reshaping", () => {
    expect(polygonFlags(true).polygon.feature.coordinates).toEqual({
      midpoints: { draggable: true },
      draggable: true,
      deletable: true,
      snappable: { toCoordinate: true, toLine: true },
    });
  });

  it("hides those handles when reshape ends and keeps coordinates deletable", () => {
    const coordinates = polygonFlags(false).polygon.feature.coordinates;
    expect(coordinates.midpoints).toBe(false);
    expect(coordinates.draggable).toBe(false);
    expect(coordinates.deletable).toBe(true);
  });
});
