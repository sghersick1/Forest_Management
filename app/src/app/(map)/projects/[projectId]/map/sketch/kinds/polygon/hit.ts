/*
 * Hit tests and selection rules for polygons.
 * Later features paint above earlier ones. Hover never uses the selected id.
 */

export const pointerDistance = 15;
export const clickSlop = 5;

export type DrawTool = "pointer" | "polygon" | "point";

export type PolygonHit = {
  id?: string | number;
  geometry: {
    type: string;
    coordinates?: unknown;
  };
  properties?: Record<string, unknown>;
};

const emptyHoverLine = { type: "FeatureCollection" as const, features: [] };

// The top finished polygon among the hits, ignoring an open ring.
export function topFinishedPolygonId(
  paintOrder: readonly PolygonHit[],
  hits: readonly PolygonHit[],
) {
  const candidates = new Set<string>();
  for (const hit of hits) {
    const id = finishedPolygonId(hit);
    if (id !== null) candidates.add(id);
  }
  for (let index = paintOrder.length - 1; index >= 0; index -= 1) {
    const id = finishedPolygonId(paintOrder[index]);
    if (id !== null && candidates.has(id)) return id;
  }
  return null;
}

// Polygon rings, or null when the feature is not a polygon.
function polygonRings(feature: PolygonHit) {
  const coordinates = feature.geometry.coordinates;
  if (feature.geometry.type !== "Polygon" || !Array.isArray(coordinates)) return null;
  return coordinates as number[][][];
}

// The top finished polygon with a vertex inside the pointer distance.
export function topVertexPolygonId(
  paintOrder: readonly PolygonHit[],
  point: { x: number; y: number },
  project: (lng: number, lat: number) => { x: number; y: number },
  distance: number,
) {
  for (let index = paintOrder.length - 1; index >= 0; index -= 1) {
    const feature = paintOrder[index];
    const id = finishedPolygonId(feature);
    const ring = polygonRings(feature)?.[0];
    if (id === null || !ring) continue;
    const near = ring.some((coord) => {
      const pixel = project(coord[0], coord[1]);
      return Math.hypot(pixel.x - point.x, pixel.y - point.y) <= distance;
    });
    if (near) return id;
  }
  return null;
}

// The string id of a finished polygon, or null for an open ring or a non-string id.
export function finishedPolygonId(feature: PolygonHit) {
  if (feature.geometry.type !== "Polygon") return null;
  if (feature.properties?.currentlyDrawing === true) return null;
  if (typeof feature.id !== "string") return null;
  return feature.id;
}

// The hit id, unless it is the selected polygon.
export function pointerHoverId(hit: string | null, selectedId: string | null) {
  if (hit !== null && hit === selectedId) return null;
  return hit;
}

// A MultiLineString of every ring, including holes, or an empty collection.
export function hoverLineData(feature: PolygonHit | null) {
  const rings = feature ? polygonRings(feature) : null;
  if (!rings) return emptyHoverLine;
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "MultiLineString" as const,
          coordinates: rings,
        },
      },
    ],
  };
}

// The first polygon id in the hit list.
export function selectionFromHits(hits: readonly PolygonHit[]) {
  const hit = hits.find(
    (feature) => feature.geometry.type === "Polygon" && feature.id !== undefined,
  );
  return hit?.id ?? null;
}

// The first stored polygon with a vertex inside the pointer distance.
export function selectionFromVertices(
  features: readonly PolygonHit[],
  point: { x: number; y: number },
  project: (lng: number, lat: number) => { x: number; y: number },
  distance: number,
) {
  const nearest = features.find((feature) => {
    if (feature.geometry.type !== "Polygon" || feature.properties?.currentlyDrawing === true) {
      return false;
    }
    const ring = polygonRings(feature)?.[0];
    if (!ring) return false;
    return ring.some((coord) => {
      const pixel = project(coord[0], coord[1]);
      return Math.hypot(pixel.x - point.x, pixel.y - point.y) <= distance;
    });
  });
  return nearest?.id ?? null;
}

// The hit id for a settled left click, or null when the click should not select.
export function selectionFromClick(input: {
  tool: DrawTool;
  button: number;
  dragged: number;
  reshaping: boolean;
  currentId: string | number | null;
  hit: string | number | null;
}) {
  if (input.tool !== "pointer" || input.button !== 0) return null;
  if (input.dragged > clickSlop) return null;
  if (input.hit === null) return null;
  if (input.reshaping && input.currentId === input.hit) return null;
  return input.hit;
}

// The polygon TerraDraw currently marks selected.
export function selectedSnapshotId(features: readonly PolygonHit[]) {
  const selected = features.find(
    (feature) => feature.properties?.selected === true && feature.geometry.type === "Polygon",
  );
  return selected?.id ?? null;
}

// The selection, or null when that id is no longer stored.
export function keptSelectedId(selected: string | null, ids: readonly string[]) {
  if (selected !== null && !ids.includes(selected)) return null;
  return selected;
}

// The hover id, or null when it is selected or no longer stored.
export function keptHoverId(
  hover: string | null,
  selected: string | null,
  ids: readonly string[],
) {
  if (hover === null) return null;
  if (hover === selected || !ids.includes(hover)) return null;
  return hover;
}

// Keeps the selection on the pointer tool and clears it for every other tool.
export function selectedForTool(tool: DrawTool, selected: string | null) {
  return tool === "pointer" ? selected : null;
}
