/*
 * Keyboard gestures for the sketch session.
 * Typing in a field does not reach the map.
 */

import type { DrawTool } from "../kinds/polygon/hit";

export type KeyGesture = "suspend-snap" | "restore-snap" | "escape" | "delete" | "commit" | "ignore";

// True when the event target is an input, textarea, or contenteditable element.
export function isTypingTarget(target: EventTarget | null) {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

// Snap toggle, cancel, delete, commit, or ignore for this key.
export function keyGesture(input: {
  phase: "down" | "up";
  key: string;
  repeat: boolean;
  typing: boolean;
  tool: DrawTool;
  reshaping: boolean;
  selected: boolean;
}): KeyGesture {
  if (input.typing) return "ignore";
  if (input.phase === "down") {
    if (input.key === "Control" && !input.repeat) return "suspend-snap";
    return "ignore";
  }
  if (input.key === "Control") return "restore-snap";
  if (input.key === "Escape") return "escape";
  if (input.key === "Delete" && input.tool === "pointer" && input.selected) return "delete";
  if (input.key === "Enter") return "commit";
  return "ignore";
}
