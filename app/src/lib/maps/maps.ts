/*
 * Database reads and writes for one project map.
 * Feature writes touch a single map_features row.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parseFeatureId,
  parseMapFeatures,
  type MapFeature,
  type MapPolygon,
} from "@/lib/maps/map-features";

export type MapCamera = {
  x: number;
  y: number;
  zoom: number;
};

export type ProjectMap = {
  projectId: number;
  cameraX: number;
  cameraY: number;
  mapZoom: number;
  features: MapFeature[];
};

type MapRow = {
  camera_x: number;
  camera_y: number;
  map_zoom: number;
  map_features: { id: string; name: string; geometry: MapPolygon }[] | null;
};

const mapColumns = "camera_x, camera_y, map_zoom, map_features(id, name, geometry)";

// The project map and its features, or null when the map row is missing.
export async function getMap(
  projectId: number,
  supabase: SupabaseClient,
): Promise<ProjectMap | null> {
  const { data, error } = await supabase
    .from("maps")
    .select(mapColumns)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const row = data as MapRow;
  return {
    projectId,
    cameraX: row.camera_x,
    cameraY: row.camera_y,
    mapZoom: row.map_zoom,
    features: parseMapFeatures(row.map_features ?? []),
  };
}

// Saves the camera center and zoom on the maps row.
export async function updateMapCamera(
  projectId: number,
  camera: MapCamera,
  supabase: SupabaseClient,
): Promise<void> {
  if (
    !Number.isFinite(camera.x) ||
    !Number.isFinite(camera.y) ||
    !Number.isFinite(camera.zoom)
  ) {
    throw new Error("Camera is not a number.");
  }

  const { error } = await supabase
    .from("maps")
    .update({
      camera_x: camera.x,
      camera_y: camera.y,
      map_zoom: camera.zoom,
      edited_at: new Date().toISOString(),
    })
    .eq("project_id", projectId);

  if (error) {
    throw new Error(error.message);
  }
}

// Inserts one polygon row.
export async function insertMapFeature(
  projectId: number,
  feature: unknown,
  supabase: SupabaseClient,
): Promise<void> {
  const [parsed] = parseMapFeatures([feature]);
  const { error } = await supabase.from("map_features").insert({
    id: parsed.id,
    map_id: projectId,
    name: parsed.name,
    geometry: parsed.geometry,
    edited_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }
}

// Updates the geometry and edited time of one polygon row.
export async function updateMapFeature(
  projectId: number,
  feature: unknown,
  supabase: SupabaseClient,
): Promise<void> {
  const [parsed] = parseMapFeatures([feature]);
  const { error } = await supabase
    .from("map_features")
    .update({
      geometry: parsed.geometry,
      edited_at: new Date().toISOString(),
    })
    .eq("id", parsed.id)
    .eq("map_id", projectId);

  if (error) {
    throw new Error(error.message);
  }
}

// Updates the name of one feature row. Geometry stays as it is.
export async function renameMapFeature(
  projectId: number,
  id: unknown,
  name: string,
  supabase: SupabaseClient,
): Promise<void> {
  const featureId = parseFeatureId(id);
  const nextName = name.trim();
  if (nextName === "") {
    throw new Error("Feature name must be a non-empty string.");
  }

  const { error } = await supabase
    .from("map_features")
    .update({
      name: nextName,
      edited_at: new Date().toISOString(),
    })
    .eq("id", featureId)
    .eq("map_id", projectId);

  if (error) {
    throw new Error(error.message);
  }
}

// Deletes one polygon row for this map.
export async function deleteMapFeature(
  projectId: number,
  id: unknown,
  supabase: SupabaseClient,
): Promise<void> {
  const featureId = parseFeatureId(id);
  const { error } = await supabase
    .from("map_features")
    .delete()
    .eq("id", featureId)
    .eq("map_id", projectId);

  if (error) {
    throw new Error(error.message);
  }
}
