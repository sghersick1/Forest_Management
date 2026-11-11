/*
 * Which geometry kind a map tool draws.
 * Pointer and point are not polygon sketch kinds.
 */

import type { DrawTool } from "./polygon/hit";

export type SketchKindId = "polygon";

// Polygon for the polygon tool, otherwise no sketch kind.
export function sketchKind(tool: DrawTool): SketchKindId | null {
  if (tool === "polygon") return "polygon";
  return null;
}
