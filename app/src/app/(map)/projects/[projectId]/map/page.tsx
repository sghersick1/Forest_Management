/*
 * Project map page.
 * Loads the saved camera and features, then renders the map tools.
 */

import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getMap } from "@/lib/maps/maps";
import type { MapFeature } from "@/lib/maps/map-features";
import { getProject } from "@/lib/projects/projects";
import { createClient } from "@/lib/supabase/server";
import { MapProvider } from "./map-context";
import { MapStage } from "./shell/map-stage";
import { PanelBar } from "./shell/panel-bar";
import { CommandSidebar } from "./shell/command-sidebar";
import { DetailsSidebar } from "./shell/details-sidebar";
import { MapToolbar } from "./shell/map-toolbar";
import { MapToolKeys } from "./shell/map-tool-keys";

// The map route, with a fallback while the project map loads.
export default function ProjectMapPage({
  params,
}: PageProps<"/projects/[projectId]/map">) {
  return (
    <Suspense fallback={<main className="min-h-0 flex-1" />}>
      <ProjectMap params={params} />
    </Suspense>
  );
}

// Turns saved polygon rows into TerraDraw features.
function sketchFeatures(features: MapFeature[]) {
  return features.map((feature) => ({
    type: "Feature" as const,
    id: feature.id,
    geometry: feature.geometry,
    properties: { mode: "polygon", name: feature.name },
  }));
}

// Loads one project map or sends the request to not found.
async function ProjectMap({
  params,
}: {
  params: PageProps<"/projects/[projectId]/map">["params"];
}) {
  await connection();
  const { projectId } = await params;
  const id = Number(projectId);
  if (!Number.isInteger(id)) {
    notFound();
  }

  const supabase = await createClient();
  const project = await getProject(id, supabase);
  if (!project) {
    notFound();
  }
  const map = await getMap(id, supabase);
  if (!map) {
    notFound();
  }

  return (
    <MapProvider key={projectId} projectId={id} initialFeatures={sketchFeatures(map.features)}>
      <main className="relative min-h-0 flex-1">
        <MapStage
          projectId={id}
          mapX={map.cameraX}
          mapY={map.cameraY}
          mapZoom={map.mapZoom}
        />
        <PanelBar />
        <CommandSidebar />
        <DetailsSidebar />
        <MapToolbar />
        <MapToolKeys />
      </main>
    </MapProvider>
  );
}
