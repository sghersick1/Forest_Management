/*
 * Pointer gestures for the sketch session.
 * The session turns each gesture into a command.
 */

import type { DrawTool } from "../kinds/polygon/hit";

export type PointerGesture = "hover" | "clear-hover" | "select" | "close" | "reshape" | "delete-vertex" | "ignore";

// Hover only for the pointer tool. Also select, close, reshape, vertex delete, or ignore.
export function pointerGesture(input: {
  kind: "move" | "leave" | "click" | "double-click" | "context-menu";
  tool: DrawTool;
  reshaping: boolean;
  started: boolean;
}): PointerGesture {
  if (input.kind === "move") return input.tool === "pointer" ? "hover" : "ignore";
  if (input.kind === "leave") return "clear-hover";
  if (!input.started) return "ignore";
  if (input.kind === "click") return input.tool === "pointer" ? "select" : "ignore";
  if (input.kind === "double-click") {
    if (input.tool === "polygon") return "close";
    if (input.tool === "pointer") return "reshape";
    return "ignore";
  }
  if (input.kind === "context-menu") {
    if (input.tool === "pointer" && input.reshaping) return "delete-vertex";
    return "ignore";
  }
  return "ignore";
}
