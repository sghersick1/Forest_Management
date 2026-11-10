import type { SupabaseClient } from "@supabase/supabase-js";
import {
  diffMapFeatures,
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
  map_features: { id: string; geometry: MapPolygon }[] | null;
};

const mapColumns = "camera_x, camera_y, map_zoom, map_features(id, geometry)";

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

export async function syncMapFeatures(
  projectId: number,
  features: unknown,
  supabase: SupabaseClient,
): Promise<void> {
  const next = parseMapFeatures(features);
  const { data, error } = await supabase
    .from("map_features")
    .select("id, geometry")
    .eq("map_id", projectId);

  if (error) {
    throw new Error(error.message);
  }

  const diff = diffMapFeatures((data ?? []) as MapFeature[], next);
  const changed = [...diff.inserts, ...diff.updates];
  if (changed.length > 0) {
    const { error: upsertError } = await supabase.from("map_features").upsert(
      changed.map((feature) => ({
        id: feature.id,
        map_id: projectId,
        geometry: feature.geometry,
        edited_at: new Date().toISOString(),
      })),
    );

    if (upsertError) {
      throw new Error(upsertError.message);
    }
  }

  if (diff.deletes.length > 0) {
    const { error: deleteError } = await supabase
      .from("map_features")
      .delete()
      .eq("map_id", projectId)
      .in("id", diff.deletes);

    if (deleteError) {
      throw new Error(deleteError.message);
    }
  }
}
