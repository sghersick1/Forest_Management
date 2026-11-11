/*
 * Tests snap, cancel, delete, commit, and typing keys.
 */

import { describe, expect, it } from "vitest";
import { keyGesture } from "./keyboard";

const base = {
  repeat: false,
  typing: false,
  tool: "pointer" as const,
  reshaping: false,
};

describe("keyboard gestures", () => {
  it("toggles right-angle snap while Control is held", () => {
    expect(keyGesture({ ...base, phase: "down", key: "Control" })).toBe("suspend-snap");
    expect(keyGesture({ ...base, phase: "down", key: "Control", repeat: true })).toBe("ignore");
    expect(keyGesture({ ...base, phase: "up", key: "Control" })).toBe("restore-snap");
  });

  it("cancels on Escape, deletes only while reshaping, and commits on Enter", () => {
    expect(keyGesture({ ...base, phase: "up", key: "Escape" })).toBe("escape");
    expect(keyGesture({ ...base, phase: "up", key: "Delete", reshaping: true })).toBe("delete");
    expect(keyGesture({ ...base, phase: "up", key: "Delete" })).toBe("ignore");
    expect(keyGesture({ ...base, phase: "up", key: "Delete", tool: "polygon", reshaping: true })).toBe(
      "ignore",
    );
    expect(keyGesture({ ...base, phase: "up", key: "Enter" })).toBe("commit");
  });

  it("ignores keys while typing in a field", () => {
    expect(keyGesture({ ...base, phase: "up", key: "Enter", typing: true })).toBe("ignore");
    expect(keyGesture({ ...base, phase: "up", key: "Escape", typing: true })).toBe("ignore");
    expect(keyGesture({ ...base, phase: "down", key: "Control", typing: true })).toBe("ignore");
  });
});
