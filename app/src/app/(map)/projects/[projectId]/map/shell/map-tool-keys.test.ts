/*
 * Tests the lowercase map tool shortcuts.
 */

import { describe, expect, it } from "vitest";
import { toolForKey } from "./map-tool-keys";

describe("map tool keys", () => {
  it("selects pointer, polygon, and point from lowercase keys", () => {
    expect(toolForKey("v")).toBe("pointer");
    expect(toolForKey("p")).toBe("polygon");
    expect(toolForKey("j")).toBe("point");
  });

  it("ignores uppercase and every other key", () => {
    expect(toolForKey("V")).toBeNull();
    expect(toolForKey("P")).toBeNull();
    expect(toolForKey("J")).toBeNull();
    expect(toolForKey("a")).toBeNull();
  });
});
