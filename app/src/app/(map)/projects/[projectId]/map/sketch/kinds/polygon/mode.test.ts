/*
 * Tests tool-to-mode mapping and open versus finished polygon colors.
 */

import { describe, expect, it } from "vitest";
import { drawModeName, polygonFillColor } from "./mode";

const paint = { polygon: "#112233" as const, muted: "#445566" as const };

describe("polygon mode", () => {
  it("maps each tool to a TerraDraw mode", () => {
    expect(drawModeName("polygon")).toBe("polygon");
    expect(drawModeName("pointer")).toBe("select");
    expect(drawModeName("point")).toBe("render");
  });

  it("paints an open ring in the polygon color and a finished polygon muted", () => {
    expect(polygonFillColor(true, paint)).toBe(paint.polygon);
    expect(polygonFillColor(false, paint)).toBe(paint.muted);
  });
});
