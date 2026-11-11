/*
 * Tests which pointer event becomes hover, select, close, reshape, or vertex delete.
 */

import { describe, expect, it } from "vitest";
import { pointerGesture } from "./pointer";

const base = { reshaping: false, started: true };

describe("pointer gestures", () => {
  it("moves to hover and leaves to clear hover", () => {
    expect(pointerGesture({ ...base, kind: "move", tool: "pointer" })).toBe("hover");
    expect(pointerGesture({ ...base, kind: "leave", tool: "polygon" })).toBe("clear-hover");
  });

  it("clicks to select only with the pointer", () => {
    expect(pointerGesture({ ...base, kind: "click", tool: "pointer" })).toBe("select");
    expect(pointerGesture({ ...base, kind: "click", tool: "polygon" })).toBe("ignore");
    expect(pointerGesture({ ...base, kind: "click", tool: "point" })).toBe("ignore");
  });

  it("double-clicks to close a polygon or reshape with the pointer", () => {
    expect(pointerGesture({ ...base, kind: "double-click", tool: "polygon" })).toBe("close");
    expect(pointerGesture({ ...base, kind: "double-click", tool: "pointer" })).toBe("reshape");
    expect(pointerGesture({ ...base, kind: "double-click", tool: "point" })).toBe("ignore");
  });

  it("right-clicks to delete a vertex only while reshaping", () => {
    expect(
      pointerGesture({ ...base, kind: "context-menu", tool: "pointer", reshaping: true }),
    ).toBe("delete-vertex");
    expect(pointerGesture({ ...base, kind: "context-menu", tool: "pointer" })).toBe("ignore");
    expect(
      pointerGesture({ ...base, kind: "context-menu", tool: "polygon", reshaping: true }),
    ).toBe("ignore");
  });

  it("ignores clicks before the draw session has started", () => {
    expect(pointerGesture({ kind: "click", tool: "pointer", reshaping: false, started: false })).toBe(
      "ignore",
    );
  });
});
