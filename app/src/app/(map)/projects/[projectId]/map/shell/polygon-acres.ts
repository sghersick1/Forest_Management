/*
 * Geodesic acreage of a stored polygon.
 */

import area from "@turf/area";
import { convertArea } from "@turf/helpers";
import type { GeoJSONStoreFeatures } from "terra-draw";

// Acres of a polygon. A point or a line has no area.
export function polygonAcres(feature: GeoJSONStoreFeatures | undefined): number | null {
  const geometry = feature?.geometry;
  if (!geometry || geometry.type !== "Polygon") return null;
  return convertArea(area(geometry), "meters", "acres");
}
