/*
 * Selection outline and TerraDraw select sync.
 * The line matches the hover stroke and sits above other polygons.
 */

import { hoverLineData, type PolygonHit } from "./kinds/polygon/hit";

export const selectedLineLayerId = "feature-selected-line";
export const lineColorVariable = "--map-polygon";
export const lineWidth = 2;

// The same MultiLineString used for hover, or an empty collection when nothing is selected.
export function selectionLineData(feature: PolygonHit | null) {
  return hoverLineData(feature);
}

// Whether TerraDraw should select, deselect, or leave the current feature alone.
export function selectionDraw(
  selected: string | null,
  current: string | number | null,
  hasFeature: boolean,
): "select" | "deselect" | "none" {
  if (selected === null) return current !== null ? "deselect" : "none";
  if (current !== null && String(current) === selected) return "none";
  if (!hasFeature) return "none";
  return "select";
}
