"use server";

import { createClient } from "@/lib/supabase/server";
import type { MapCamera } from "@/lib/maps/maps";
import {
  syncMapFeatures as writeMapFeatures,
  updateMapCamera as writeMapCamera,
} from "@/lib/maps/maps";

export async function syncMapFeatures(projectId: number, features: unknown) {
  const supabase = await createClient();
  await writeMapFeatures(projectId, features, supabase);
}

export async function updateMapCamera(projectId: number, camera: MapCamera) {
  const supabase = await createClient();
  await writeMapCamera(projectId, camera, supabase);
}
