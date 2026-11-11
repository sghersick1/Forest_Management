/*
 * Tests tooltip formatting and the empty label before the first vertex.
 */

import { describe, expect, it } from "vitest";
import { drawingLabel, tooltipText } from "./tooltip";

describe("sketch tooltip", () => {
  it("formats feet, bearing, and acres", () => {
    expect(
      tooltipText({
        feet: 12.34,
        direction: 12.34,
        acres: 1.2,
      }),
    ).toEqual({
      feet: "12.3 ft",
      direction: "12.3°",
      acres: "1.20 ac",
    });
    expect(tooltipText({ feet: 120.4, direction: 0, acres: 0 })?.feet).toBe("120 ft");
  });

  it("shows no label before the first vertex", () => {
    expect(drawingLabel([[0, 0], [1, 0], [1, 1], [0, 0]], 0)).toBeNull();
    expect(tooltipText(null)).toBeNull();
  });
});
