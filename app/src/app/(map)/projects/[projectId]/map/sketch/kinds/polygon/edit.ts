/*
 * Reshape for an existing polygon.
 * A right-click removes one vertex. Leaving reshape can update that polygon.
 */

import { pointerDistance } from "./hit";
import type { FeatureChange, SketchFeature } from "./create";
import type { ScreenPoint } from "./constraints";

// Starts reshape for a double-clicked polygon.
export function beginReshape(id: string | number | null): { type: "reshape"; id: string | number } | null {
  if (id === null) return null;
  return { type: "reshape", id };
}

// The vertex under the pointer, or null when the ring would drop below three vertices.
export function vertexAtPointer(
  ring: number[][],
  point: ScreenPoint,
  project: (lng: number, lat: number) => ScreenPoint,
  distance = pointerDistance,
): { type: "delete-vertex"; index: number } | null {
  const unique = ring.slice(0, -1);
  if (unique.length <= 3) return null;
  let nearest = -1;
  let best = Number.POSITIVE_INFINITY;
  unique.forEach((coord, index) => {
    const pixel = project(coord[0], coord[1]);
    const gap = Math.hypot(pixel.x - point.x, pixel.y - point.y);
    if (gap < best) {
      best = gap;
      nearest = index;
    }
  });
  if (nearest < 0 || best > distance) return null;
  return { type: "delete-vertex", index: nearest };
}

// The ring with one vertex removed and closed again.
export function ringWithoutVertex(ring: number[][], index: number): number[][] {
  const unique = ring.slice(0, -1).filter((_, vertex) => vertex !== index);
  unique.push(unique[0]);
  return unique;
}

// An update when the reshaped geometry differs from the stored polygon.
export function finishedEdit(
  selected: SketchFeature | null,
  stored: SketchFeature | null,
): FeatureChange | null {
  if (!selected || !stored) return null;
  if (String(selected.id) !== String(stored.id)) return null;
  if (JSON.stringify(selected.geometry) === JSON.stringify(stored.geometry)) return null;
  return { type: "update", feature: selected };
}
