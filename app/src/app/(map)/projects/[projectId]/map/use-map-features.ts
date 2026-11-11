"use client";

/*
 * Polygon list for one project map.
 * A new server id list replaces the stored list without writing it back.
 * A finished create, edit, or delete updates that one feature and queues its row.
 */

import { useCallback, useRef, useState } from "react";
import type { GeoJSONStoreFeatures } from "terra-draw";
import {
  deleteMapFeature,
  insertMapFeature,
  updateMapFeature,
} from "@/lib/maps/map-actions";
import {
  featureIdList,
  listAfter,
  replaceFromServer,
  savedFeature,
  type FeatureChange,
} from "./feature-list";

// Holds the polygon list and queues one row write after each finished change.
export function useMapFeatures(
  projectId: number,
  initialFeatures: GeoJSONStoreFeatures[],
) {
  const [features, setStoredFeatures] = useState(initialFeatures);
  const [appliedIds, setAppliedIds] = useState(() => featureIdList(initialFeatures));
  const replacement = replaceFromServer(appliedIds, initialFeatures);
  if (replacement) {
    setAppliedIds(replacement.ids);
    setStoredFeatures(replacement.features);
  }
  const featuresRef = useRef(features);
  featuresRef.current = replacement ? replacement.features : features;
  const saveQueue = useRef(Promise.resolve());

  // Applies one feature change to state, then queues that same row.
  const applyChange = useCallback((change: FeatureChange) => {
    const next = listAfter(featuresRef.current, change);
    if (!next) return;
    featuresRef.current = next;
    setStoredFeatures(next);
    if (change.type === "delete") {
      enqueue(saveQueue, () => deleteMapFeature(projectId, change.id));
      return;
    }
    const payload = savedFeature(change.feature);
    if (!payload) {
      console.error("Skipped saving features. A finished polygon has no UUID.");
      return;
    }
    const write =
      change.type === "insert"
        ? () => insertMapFeature(projectId, payload)
        : () => updateMapFeature(projectId, payload);
    enqueue(saveQueue, write);
  }, [projectId]);

  // Appends one finished polygon and inserts its row.
  const insertFeature = useCallback((feature: GeoJSONStoreFeatures) => {
    applyChange({ type: "insert", feature });
  }, [applyChange]);

  // Replaces one polygon and updates its row when the geometry changed.
  const updateFeature = useCallback((feature: GeoJSONStoreFeatures) => {
    applyChange({ type: "update", feature });
  }, [applyChange]);

  // Removes one polygon and deletes its row.
  const deleteFeature = useCallback((id: string) => {
    applyChange({ type: "delete", id });
  }, [applyChange]);

  return { features, insertFeature, updateFeature, deleteFeature };
}

// Runs feature writes one after another so a later delete waits for an earlier insert.
function enqueue(
  saveQueue: { current: Promise<void> },
  write: () => Promise<void>,
) {
  saveQueue.current = saveQueue.current
    .catch(() => undefined)
    .then(write)
    .catch((error: unknown) => {
      console.error(error);
    });
}
