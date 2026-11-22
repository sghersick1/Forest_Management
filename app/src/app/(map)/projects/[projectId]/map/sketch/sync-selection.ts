/*
 * Selection outline, hatch, and TerraDraw select sync.
 * The outline matches the hover stroke. The hatch is separate, and only in non-linking mode.
 * Lines are clipped in screen space because fill-pattern scales between integer zooms.
 */

import { hoverLineData, type PolygonHit } from "./kinds/polygon/hit";

export const selectedLineLayerId = "feature-selected-line";
export const selectedHatchLayerId = "feature-selected-hatch";
export const lineColorVariable = "--map-polygon";
export const lineWidth = 2;
export const hatchSpacing = 12;
export const hatchLineWidth = 1;
export const hatchColor = "#ffffff";
export const hatchOpacity = 0.5;

// The same MultiLineString used for hover, or an empty collection when nothing is selected.
export function selectionLineData(feature: PolygonHit | null) {
  return hoverLineData(feature);
}

export type PlanePoint = { x: number; y: number };

const emptyHatch = { type: "FeatureCollection" as const, features: [] };

// White diagonals at 50% opacity. Empty while linking, or when nothing is selected.
export function selectionHatchData(
  feature: PolygonHit | null,
  project: (lng: number, lat: number) => PlanePoint,
  unproject: (x: number, y: number) => [number, number],
  linking: boolean,
) {
  if (linking || feature === null) return emptyHatch;
  const rings = planeRings(feature, project);
  if (!rings) return emptyHatch;
  const segments = hatchSegments(rings);
  if (segments.length === 0) return emptyHatch;
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "MultiLineString" as const,
          coordinates: segments.map(([start, end]) => [
            unproject(start.x, start.y),
            unproject(end.x, end.y),
          ]),
        },
      },
    ],
  };
}

// Top-left to bottom-right segments, 12px apart, clipped to the rings. Holes stay empty.
export function hatchSegments(rings: readonly (readonly PlanePoint[])[], spacing = hatchSpacing) {
  const outer = rings[0];
  if (!outer || outer.length < 3) return [];
  const gap = spacing * Math.SQRT2;
  const box = bounds(rings);
  const origin = outer[0];
  const originC = origin.x - origin.y;
  const minC = box.minX - box.maxY;
  const maxC = box.maxX - box.minY;
  const start = Math.ceil((minC - originC) / gap - 1e-9);
  const end = Math.floor((maxC - originC) / gap + 1e-9);
  const segments: Array<[PlanePoint, PlanePoint]> = [];
  for (let step = start; step <= end; step += 1) {
    const across = lineAcrossBox(originC + step * gap, box);
    if (!across) continue;
    segments.push(...clipSegment(across[0], across[1], rings));
  }
  return segments;
}

function planeRings(
  feature: PolygonHit,
  project: (lng: number, lat: number) => PlanePoint,
) {
  const coordinates = feature.geometry.coordinates;
  if (feature.geometry.type !== "Polygon" || !Array.isArray(coordinates)) return null;
  return (coordinates as number[][][]).map((ring) =>
    ring.map((coord) => project(coord[0], coord[1])),
  );
}

function bounds(rings: readonly (readonly PlanePoint[])[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const ring of rings) {
    for (const point of ring) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }
  return { minX, minY, maxX, maxY };
}

// The 45-degree line x - y = c, from the top of the box to the bottom.
function lineAcrossBox(
  constant: number,
  box: { minX: number; minY: number; maxX: number; maxY: number },
) {
  const hits: PlanePoint[] = [];
  const add = (point: PlanePoint) => {
    if (point.x < box.minX - 1e-6 || point.x > box.maxX + 1e-6) return;
    if (point.y < box.minY - 1e-6 || point.y > box.maxY + 1e-6) return;
    if (hits.some((hit) => samePoint(hit, point))) return;
    hits.push(point);
  };
  add({ x: box.minX, y: box.minX - constant });
  add({ x: box.maxX, y: box.maxX - constant });
  add({ x: box.minY + constant, y: box.minY });
  add({ x: box.maxY + constant, y: box.maxY });
  if (hits.length < 2) return null;
  hits.sort((a, b) => a.y - b.y || a.x - b.x);
  return [hits[0], hits[hits.length - 1]] as [PlanePoint, PlanePoint];
}

function clipSegment(
  start: PlanePoint,
  end: PlanePoint,
  rings: readonly (readonly PlanePoint[])[],
) {
  const times = [0, 1];
  for (const ring of rings) {
    forEachEdge(ring, (a, b) => {
      const time = segmentTime(start, end, a, b);
      if (time !== null && time > 1e-8 && time < 1 - 1e-8) times.push(time);
    });
  }
  times.sort((a, b) => a - b);
  const unique: number[] = [];
  for (const time of times) {
    if (unique.length === 0 || time - unique[unique.length - 1] > 1e-6) unique.push(time);
  }
  const segments: Array<[PlanePoint, PlanePoint]> = [];
  for (let index = 0; index < unique.length - 1; index += 1) {
    const from = unique[index];
    const to = unique[index + 1];
    if (to - from < 1e-4) continue;
    const mid = lerp(start, end, (from + to) / 2);
    if (!evenOdd(mid, rings)) continue;
    segments.push([lerp(start, end, from), lerp(start, end, to)]);
  }
  return segments;
}

function forEachEdge(
  ring: readonly PlanePoint[],
  visit: (start: PlanePoint, end: PlanePoint) => void,
) {
  if (ring.length < 2) return;
  const closed = samePoint(ring[0], ring[ring.length - 1]);
  const limit = closed ? ring.length - 1 : ring.length;
  for (let index = 0; index < limit; index += 1) {
    const start = ring[index];
    const end = closed ? ring[index + 1] : ring[(index + 1) % ring.length];
    if (!samePoint(start, end)) visit(start, end);
  }
}

function segmentTime(start: PlanePoint, end: PlanePoint, c: PlanePoint, d: PlanePoint) {
  const rx = end.x - start.x;
  const ry = end.y - start.y;
  const sx = d.x - c.x;
  const sy = d.y - c.y;
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-12) return null;
  const qx = c.x - start.x;
  const qy = c.y - start.y;
  const time = (qx * sy - qy * sx) / den;
  const edge = (qx * ry - qy * rx) / den;
  if (time < -1e-8 || time > 1 + 1e-8 || edge < -1e-8 || edge > 1 + 1e-8) return null;
  return Math.min(1, Math.max(0, time));
}

function evenOdd(point: PlanePoint, rings: readonly (readonly PlanePoint[])[]) {
  let inside = false;
  for (const ring of rings) {
    forEachEdge(ring, (start, end) => {
      const crosses = start.y > point.y !== end.y > point.y;
      if (!crosses) return;
      const x = start.x + ((point.y - start.y) / (end.y - start.y)) * (end.x - start.x);
      if (x > point.x) inside = !inside;
    });
  }
  return inside;
}

function lerp(start: PlanePoint, end: PlanePoint, time: number): PlanePoint {
  return {
    x: start.x + (end.x - start.x) * time,
    y: start.y + (end.y - start.y) * time,
  };
}

function samePoint(a: PlanePoint, b: PlanePoint) {
  return Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;
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
