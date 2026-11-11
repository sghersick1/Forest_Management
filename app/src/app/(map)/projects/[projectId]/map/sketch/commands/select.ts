/*
 * Pointer click selection.
 * A select does not write a feature.
 */

import { selectionFromClick, type DrawTool } from "../kinds/polygon/hit";

// The hit id for a settled pointer click, or null when the click should not select.
export function selectCommand(input: {
  tool: DrawTool;
  button: number;
  dragged: number;
  reshaping: boolean;
  currentId: string | number | null;
  hit: string | number | null;
}) {
  const id = selectionFromClick(input);
  if (id === null) return null;
  return { selectedId: id };
}
