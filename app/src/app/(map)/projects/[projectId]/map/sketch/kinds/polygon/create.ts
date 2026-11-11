/*
 * Closing a polygon and right-angle snap while the ring is open.
 * Escape cancels the ring and does not insert it.
 */

import { pointerDistance, type PolygonHit } from "./hit";
import { canClosePolygon, snapRightAngle, type LngLat, type ScreenPoint } from "./constraints";

export type SketchFeature = {
  id?: string | number;
  geometry: {
    type: string;
    coordinates?: number[][][];
  };
  properties?: Record<string, unknown>;
};

export type FeatureChange =
  | { type: "insert"; feature: SketchFeature }
  | { type: "update"; feature: SketchFeature }
  | { type: "delete"; id: string };

export const suspendedSnapping = {
  toLine: false,
  toCoordinate: false,
  showSnappingPoint: false,
};

// An insert for a ring with at least three vertices, with the open-ring flag cleared.
export function finishedCreate(
  feature: SketchFeature | null,
  committedVertices: number,
): FeatureChange | null {
  if (!feature || feature.geometry.type !== "Polygon") return null;
  if (!canClosePolygon(committedVertices)) return null;
  if (feature.properties?.currentlyDrawing === true) {
    return {
      type: "insert",
      feature: {
        ...feature,
        properties: { ...feature.properties, currentlyDrawing: false },
      },
    };
  }
  return { type: "insert", feature };
}

// An insert for a finished polygon, or null while the ring is still open.
export function createdFeature(feature: SketchFeature | null): FeatureChange | null {
  if (!feature || feature.geometry.type !== "Polygon") return null;
  if (feature.properties?.currentlyDrawing === true) return null;
  if (typeof feature.id !== "string") return null;
  return { type: "insert", feature };
}

// Escape cancels the open ring and writes nothing.
export function cancelCreate(): FeatureChange | null {
  return null;
}

// A snapped coordinate near a right angle, or undefined when snap should stay off.
export function rightAngleCoordinate(input: {
  coordinate: number | undefined;
  ring: number[][] | undefined;
  cursor: ScreenPoint;
  otherRings: readonly number[][][];
  project: (lng: number, lat: number) => ScreenPoint;
  unproject: (point: ScreenPoint) => LngLat;
}): LngLat | undefined {
  const coordinate = input.coordinate;
  if (coordinate === undefined || coordinate < 2) return undefined;
  const ring = input.ring;
  const previous = ring?.[coordinate - 2];
  const origin = ring?.[coordinate - 1];
  const first = ring?.[0];
  if (!previous || !origin || !first) return undefined;

  const firstPoint = input.project(first[0], first[1]);
  if (Math.hypot(input.cursor.x - firstPoint.x, input.cursor.y - firstPoint.y) <= pointerDistance) {
    return undefined;
  }
  if (cursorNearRings(input.otherRings, input.cursor, input.project)) return undefined;

  const snapped = snapRightAngle(
    input.project(previous[0], previous[1]),
    input.project(origin[0], origin[1]),
    input.cursor,
  );
  if (!snapped) return undefined;
  return input.unproject(snapped);
}

// True when the cursor is within the pointer distance of another polygon.
function cursorNearRings(
  rings: readonly number[][][],
  cursor: ScreenPoint,
  project: (lng: number, lat: number) => ScreenPoint,
) {
  for (const ring of rings) {
    if (ring.length < 2) continue;
    const points = ring.slice(0, -1).map((coordinate) => project(coordinate[0], coordinate[1]));
    for (const point of points) {
      if (Math.hypot(point.x - cursor.x, point.y - cursor.y) <= pointerDistance) return true;
    }
    for (let index = 0; index < points.length; index += 1) {
      const start = points[index];
      const end = points[(index + 1) % points.length];
      if (distanceToSegment(cursor, start, end) <= pointerDistance) return true;
    }
  }
  return false;
}

// Pixel distance from a point to a segment.
function distanceToSegment(point: ScreenPoint, start: ScreenPoint, end: ScreenPoint) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared),
  );
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

// Outer rings of polygons other than the one being drawn.
export function otherPolygonRings(
  features: readonly PolygonHit[],
  currentId: string | number | undefined,
) {
  const rings: number[][][] = [];
  for (const feature of features) {
    if (feature.id === currentId || feature.geometry.type !== "Polygon") continue;
    const coordinates = feature.geometry.coordinates;
    const ring = Array.isArray(coordinates) ? coordinates[0] : undefined;
    if (Array.isArray(ring)) rings.push(ring as number[][]);
  }
  return rings;
}
