/*
 * Tests which pointer clicks select a polygon.
 */

import { describe, expect, it } from "vitest";
import { clickSlop } from "../kinds/polygon/hit";
import { selectCommand } from "./select";

const id = "22222222-2222-4222-8222-222222222222";

// A select command input, with optional overrides.
function click(overrides: Partial<Parameters<typeof selectCommand>[0]> = {}) {
  return selectCommand({
    tool: "pointer",
    button: 0,
    dragged: 0,
    reshaping: false,
    currentId: null,
    hit: id,
    ...overrides,
  });
}

describe("select command", () => {
  it("selects the polygon under a settled pointer click", () => {
    expect(click()).toEqual({ selectedId: id });
  });

  it("ignores a drag, another tool, and a reshape click on the current polygon", () => {
    expect(click({ dragged: clickSlop + 1 })).toBeNull();
    expect(click({ tool: "polygon" })).toBeNull();
    expect(click({ tool: "point" })).toBeNull();
    expect(click({ reshaping: true, currentId: id })).toBeNull();
  });
});
