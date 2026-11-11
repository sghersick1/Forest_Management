/*
 * Measurement tooltip for an open ring and for a vertex drag.
 * Feet, bearing, and acres are formatted for the label.
 */

import {
  bearingDegrees,
  formatAcres,
  formatDirection,
  formatFeet,
  ringAcres,
  segmentFeet,
  type LngLat,
  type ScreenPoint,
} from "./constraints";

export type SketchTooltipLabel = {
  x: number;
  y: number;
  feet: number;
  acres: number;
  direction: number;
};

export type Measurement = {
  feet: number;
  acres: number;
  direction: number;
};

// Formatted feet, bearing, and acres, or null when there is no measurement.
export function tooltipText(label: Measurement | null) {
  if (!label) return null;
  return {
    feet: formatFeet(label.feet),
    direction: formatDirection(label.direction),
    acres: formatAcres(label.acres),
  };
}

// Segment, area, and bearing for the open ring. Null before the first vertex.
export function drawingLabel(ring: number[][], committed: number): Measurement | null {
  if (committed < 1 || ring.length < 4) return null;
  const from = pair(ring[committed - 1]);
  const to = pair(ring[ring.length - 2]);
  if (!from || !to) return null;
  const preview = ring
    .slice(0, committed)
    .map(pair)
    .filter((coord) => coord !== null);
  preview.push(to);
  return {
    feet: segmentFeet(from, to),
    acres: ringAcres(preview),
    direction: from[0] === to[0] && from[1] === to[1] ? 0 : bearingDegrees(from, to),
  };
}

// Segment into the vertex under the pointer while that vertex is dragged.
export function reshapeLabel(
  ring: number[][],
  point: ScreenPoint,
  project: (lng: number, lat: number) => ScreenPoint,
): Measurement | null {
  const unique = ring
    .slice(0, -1)
    .map(pair)
    .filter((coord) => coord !== null);
  if (unique.length < 3) return null;
  let nearest = 0;
  let best = Number.POSITIVE_INFINITY;
  unique.forEach((coord, index) => {
    const pixel = project(coord[0], coord[1]);
    const distance = Math.hypot(pixel.x - point.x, pixel.y - point.y);
    if (distance < best) {
      best = distance;
      nearest = index;
    }
  });
  if (best > 24) return null;
  const current = unique[nearest];
  const previous = unique[(nearest - 1 + unique.length) % unique.length];
  return {
    feet: segmentFeet(previous, current),
    acres: ringAcres(unique),
    direction:
      previous[0] === current[0] && previous[1] === current[1]
        ? 0
        : bearingDegrees(previous, current),
  };
}

// Tooltip position and measurement for the current draw or reshape.
export function sketchLabel(input: {
  drawingRing: number[][] | null;
  committed: number;
  reshaping: boolean;
  primaryDown: boolean;
  reshapeRing: number[][] | null;
  point: ScreenPoint;
  project: (lng: number, lat: number) => ScreenPoint;
}): SketchTooltipLabel | null {
  if (input.drawingRing) {
    const measurement = drawingLabel(input.drawingRing, input.committed);
    return measurement ? { ...measurement, ...input.point } : null;
  }
  if (!input.reshaping || !input.primaryDown || !input.reshapeRing) return null;
  const measurement = reshapeLabel(input.reshapeRing, input.point, input.project);
  return measurement ? { ...measurement, ...input.point } : null;
}

// A longitude and latitude pair, or null when the coordinate is incomplete.
function pair(coord: number[] | null): LngLat | null {
  if (!coord || coord.length < 2) return null;
  return [coord[0], coord[1]];
}

// The label that follows the pointer. Nothing is rendered without a measurement.
export function SketchTooltip({ label }: { label: SketchTooltipLabel | null }) {
  if (!label) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-30 rounded-md bg-white px-2 py-1 text-xs leading-4 text-black shadow-[0_1px_4px_rgb(0_0_0/0.35)]"
      style={{ left: label.x + 16, top: label.y + 16 }}
    >
      <div>{formatFeet(label.feet)}</div>
      <div>{formatDirection(label.direction)}</div>
      <div>{formatAcres(label.acres)}</div>
    </div>
  );
}
