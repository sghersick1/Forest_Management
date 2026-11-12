/*
 * One-feature changes to the in-memory polygon list.
 * A null result means the list and the database stay as they are.
 */

import type { GeoJSONStoreFeatures } from "terra-draw";
import { parseMapFeatures, type MapFeature } from "@/lib/maps/map-features";

export type FeatureChange =
  | { type: "insert"; feature: GeoJSONStoreFeatures }
  | { type: "update"; feature: GeoJSONStoreFeatures }
  | { type: "rename"; id: string; name: string }
  | { type: "delete"; id: string };

// The label used in a feature name. Each geometry type keeps its own number series.
export function featureTypeLabel(geometryType: string) {
  return geometryType;
}

// The next "[Feature Type] N" that this list does not already use.
export function nextFeatureName(
  features: GeoJSONStoreFeatures[],
  geometryType: string,
) {
  const label = featureTypeLabel(geometryType);
  const prefix = `${label} `.toLowerCase();
  const used = new Set<number>();
  for (const feature of features) {
    const name = feature.properties.name;
    if (typeof name !== "string") continue;
    const lowerName = name.toLowerCase();
    if (!lowerName.startsWith(prefix)) continue;
    const suffix = lowerName.slice(prefix.length);
    if (!/^[1-9]\d*$/.test(suffix)) continue;
    used.add(Number(suffix));
  }
  let number = 1;
  while (used.has(number)) number += 1;
  return `${label} ${number}`;
}

// The list after one insert, update, or delete. Null when that id does not change the list.
export function listAfter(
  features: GeoJSONStoreFeatures[],
  change: FeatureChange,
): GeoJSONStoreFeatures[] | null {
  if (change.type === "insert") {
    if (features.some((feature) => String(feature.id) === String(change.feature.id))) return null;
    const name = nextFeatureName(features, change.feature.geometry.type);
    return [...features, withName(change.feature, name)];
  }
  if (change.type === "update") {
    const index = features.findIndex((feature) => String(feature.id) === String(change.feature.id));
    if (index < 0) return null;
    if (JSON.stringify(features[index].geometry) === JSON.stringify(change.feature.geometry)) {
      return null;
    }
    const next = features.slice();
    const previousName = features[index].properties.name;
    next[index] = typeof previousName === "string"
      ? withName(change.feature, previousName)
      : change.feature;
    return next;
  }
  if (change.type === "rename") {
    const index = features.findIndex((feature) => String(feature.id) === change.id);
    if (index < 0) return null;
    if (features[index].properties.name === change.name) return null;
    const next = features.slice();
    next[index] = withName(features[index], change.name);
    return next;
  }
  if (!features.some((feature) => String(feature.id) === change.id)) return null;
  return features.filter((feature) => String(feature.id) !== change.id);
}

// The row payload for one polygon, or null when the id is not a UUID.
export function savedFeature(feature: GeoJSONStoreFeatures): MapFeature | null {
  try {
    const [parsed] = parseMapFeatures([
      { id: feature.id, name: feature.properties.name, geometry: feature.geometry },
    ]);
    return parsed ?? null;
  } catch {
    return null;
  }
}

// A copy of the feature whose display name is set.
function withName(feature: GeoJSONStoreFeatures, name: string): GeoJSONStoreFeatures {
  return {
    ...feature,
    properties: { ...feature.properties, name },
  };
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
