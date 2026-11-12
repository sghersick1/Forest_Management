/*
 * One-feature changes to the in-memory polygon list.
 * A null result means the list and the database stay as they are.
 */

import type { GeoJSONStoreFeatures } from "terra-draw";
import { parseMapFeatures, type MapFeature } from "@/lib/maps/map-features";

export type FeatureChange =
  | { type: "insert"; feature: GeoJSONStoreFeatures }
  | { type: "update"; feature: GeoJSONStoreFeatures }
  | { type: "delete"; id: string };

// The list after one insert, update, or delete. Null when that id does not change the list.
export function listAfter(
  features: GeoJSONStoreFeatures[],
  change: FeatureChange,
): GeoJSONStoreFeatures[] | null {
  if (change.type === "insert") {
    if (features.some((feature) => String(feature.id) === String(change.feature.id))) return null;
    return [...features, change.feature];
  }
  if (change.type === "update") {
    const index = features.findIndex((feature) => String(feature.id) === String(change.feature.id));
    if (index < 0) return null;
    if (JSON.stringify(features[index].geometry) === JSON.stringify(change.feature.geometry)) {
      return null;
    }
    const next = features.slice();
    next[index] = change.feature;
    return next;
  }
  if (!features.some((feature) => String(feature.id) === change.id)) return null;
  return features.filter((feature) => String(feature.id) !== change.id);
}

// The row payload for one polygon, or null when the id is not a UUID.
export function savedFeature(feature: GeoJSONStoreFeatures): MapFeature | null {
  try {
    const [parsed] = parseMapFeatures([
      { id: feature.id, geometry: feature.geometry },
    ]);
    return parsed ?? null;
  } catch {
    return null;
  }
}

// Joined ids, so a different server list can replace the stored one.
export function featureIdList(features: GeoJSONStoreFeatures[]) {
  return features.map((feature) => String(feature.id)).join(",");
}

// The incoming server list when its ids differ. This result is not a database write.
export function replaceFromServer(appliedIds: string, incoming: GeoJSONStoreFeatures[]) {
  const ids = featureIdList(incoming);
  if (ids === appliedIds) return null;
  return { ids, features: incoming };
}
