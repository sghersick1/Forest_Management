/*
 * Finishes the active polygon action.
 * Closing a ring inserts it. Leaving a reshape updates it only when the geometry changed.
 */

import { finishedCreate, type FeatureChange, type SketchFeature } from "../kinds/polygon/create";
import { finishedEdit } from "../kinds/polygon/edit";
import type { DrawTool } from "../kinds/polygon/hit";

// Insert, update, or no write for Enter, plus whether to close the ring or leave reshape.
export function commitCommand(input: {
  tool: DrawTool;
  reshaping: boolean;
  committedVertices: number;
  drawing: SketchFeature | null;
  selected: SketchFeature | null;
  stored: SketchFeature | null;
}): { write: FeatureChange | null; closeRing: boolean; leaveReshape: boolean } {
  if (input.tool === "polygon") {
    const write = finishedCreate(input.drawing, input.committedVertices);
    return { write, closeRing: write !== null, leaveReshape: false };
  }
  if (!input.reshaping) return { write: null, closeRing: false, leaveReshape: false };
  return {
    write: finishedEdit(input.selected, input.stored),
    closeRing: false,
    leaveReshape: true,
  };
}
