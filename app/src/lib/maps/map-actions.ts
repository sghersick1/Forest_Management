"use server";

/*
 * Server actions for one map.
 * Feature actions write a single map_features row.
 */

import { createClient } from "@/lib/supabase/server";
import type { MapCamera } from "@/lib/maps/maps";
import type { MapFeature } from "@/lib/maps/map-features";
import {
  deleteMapFeature as removeMapFeature,
  insertMapFeature as addMapFeature,
  updateMapFeature as writeMapFeature,
  updateMapCamera as writeMapCamera,
} from "@/lib/maps/maps";

// Inserts one map_features row for a finished polygon.
export async function insertMapFeature(projectId: number, feature: MapFeature) {
  const supabase = await createClient();
  await addMapFeature(projectId, feature, supabase);
}

// Updates the geometry of one map_features row.
export async function updateMapFeature(projectId: number, feature: MapFeature) {
  const supabase = await createClient();
  await writeMapFeature(projectId, feature, supabase);
}

// Deletes one map_features row.
export async function deleteMapFeature(projectId: number, id: string) {
  const supabase = await createClient();
  await removeMapFeature(projectId, id, supabase);
}

// Saves the map camera for this project.
export async function updateMapCamera(projectId: number, camera: MapCamera) {
  const supabase = await createClient();
  await writeMapCamera(projectId, camera, supabase);
}
