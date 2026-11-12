/*
 * Clears the current selection.
 * A reshape that changed geometry updates that one polygon.
 */

import { finishedEdit } from "../kinds/polygon/edit";
import type { FeatureChange, SketchFeature } from "../kinds/polygon/create";

// Drops the selection and reshape. Writes an update only when the ring changed.
export function deselectCommand(input: {
  reshaping: boolean;
  selected: SketchFeature | null;
  stored: SketchFeature | null;
}): { selectedId: null; reshaping: false; write: FeatureChange | null } {
  const write = input.reshaping ? finishedEdit(input.selected, input.stored) : null;
  return { selectedId: null, reshaping: false, write };
}
