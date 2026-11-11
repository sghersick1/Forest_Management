/*
 * Hover id for the polygon under the pointer.
 * Hover does not write a feature, and it never hovers the selected polygon.
 */

import { pointerHoverId } from "../kinds/polygon/hit";

// The hovered id, or null when the pointer misses or rests on the selection.
export function hoverCommand(hit: string | null, selectedId: string | null) {
  return pointerHoverId(hit, selectedId);
}
