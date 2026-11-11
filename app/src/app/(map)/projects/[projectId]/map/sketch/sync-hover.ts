/*
 * Hover outline above other polygons.
 * The stroke matches the selection line: polygon color, width 2.
 */

import { hoverLineData, type PolygonHit } from "./kinds/polygon/hit";
import { lineColorVariable, lineWidth } from "./sync-selection";

export const hoverLineLayerId = "feature-hover-line";
export { lineColorVariable, lineWidth };

// Hover line for one polygon, or an empty collection when nothing is hovered.
export function hoverLineCollection(feature: PolygonHit | null) {
  return hoverLineData(feature);
}
