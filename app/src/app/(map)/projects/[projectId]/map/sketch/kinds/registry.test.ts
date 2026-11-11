/*
 * Tests which map tool resolves to the polygon sketch kind.
 */

import { describe, expect, it } from "vitest";
import { sketchKind } from "./registry";

describe("sketch registry", () => {
  it("resolves the polygon tool to the polygon kind", () => {
    expect(sketchKind("polygon")).toBe("polygon");
  });

  it("does not assign a kind to the pointer or point tool", () => {
    expect(sketchKind("pointer")).toBeNull();
    expect(sketchKind("point")).toBeNull();
  });
});
