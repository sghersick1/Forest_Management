"use client";

/*
 * Polygon list for one project map.
 * A new server id list replaces the stored list without writing it back.
 * A finished edit updates the list and is queued for the database.
 */

import { useCallback, useRef, useState } from "react";
import type { GeoJSONStoreFeatures } from "terra-draw";
import type { MapFeature } from "@/lib/maps/map-features";
import { syncMapFeatures } from "@/lib/maps/map-actions";

// Stores the polygon list and queues a save after each finished edit.
export function useMapFeatures(
  projectId: number,
  initialFeatures: GeoJSONStoreFeatures[],
) {
  const [features, setStoredFeatures] = useState(initialFeatures);
  const [appliedIds, setAppliedIds] = useState(() => featureIds(initialFeatures));
  const incomingIds = featureIds(initialFeatures);
  if (incomingIds !== appliedIds) {
    setAppliedIds(incomingIds);
    setStoredFeatures(initialFeatures);
  }
  const saveQueue = useRef(Promise.resolve());
  const setFeatures = useCallback((next: GeoJSONStoreFeatures[]) => {
    setStoredFeatures((current) => {
      return featureSignature(next) === featureSignature(current) ? current : next;
    });
    const payload = finishedPolygons(next);
    if (!payload) {
      console.error("Skipped saving features. A finished polygon has no UUID.");
      return;
    }
    saveQueue.current = saveQueue.current
      .catch(() => undefined)
      .then(() => syncMapFeatures(projectId, payload))
      .catch((error: unknown) => {
        console.error(error);
      });
  }, [projectId]);

  return { features, setFeatures };
}

// Polygons with string ids, or null when one feature cannot be saved.
function finishedPolygons(features: GeoJSONStoreFeatures[]): MapFeature[] | null {
  const polygons: MapFeature[] = [];
  for (const feature of features) {
    if (feature.geometry.type !== "Polygon" || typeof feature.id !== "string") {
      return null;
    }
    polygons.push({ id: feature.id, geometry: feature.geometry });
  }
  return polygons;
}

// Joined ids, so a different server list replaces the stored one.
function featureIds(features: GeoJSONStoreFeatures[]) {
  return features.map((feature) => String(feature.id)).join(",");
}

// Id and geometry, so an unchanged edit does not rerender.
function featureSignature(features: GeoJSONStoreFeatures[]) {
  return JSON.stringify(
    features.map((feature) => ({
      id: feature.id,
      geometry: feature.geometry,
    })),
  );
}
