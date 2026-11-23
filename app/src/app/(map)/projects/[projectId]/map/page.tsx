/*
 * Project map page.
 * Loads the saved camera and features, then renders the map tools.
 */

import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getProjectActions } from "@/lib/actions/actions";
import { getActionFeatures } from "@/lib/actions/action-features";
import { getMap } from "@/lib/maps/maps";
import type { MapFeature } from "@/lib/maps/map-features";
import { getProject } from "@/lib/projects/projects";
import { createClient } from "@/lib/supabase/server";
import { MapProvider } from "./state/map-context";
import { MapTopBar } from "./ui/map-top-bar";
import { MapStage } from "./ui/map-stage";
import { CommandSidebar } from "./ui/command-sidebar";
import { MapContextMenu } from "./ui/map-context-menu";
import { FeatureDetailsPanel } from "./ui/feature-details-panel";
import { DetailsSidebar } from "./ui/details-sidebar";
import { MapToolbar } from "./ui/map-toolbar";
import { MapToolKeys } from "./state/map-tool-keys";

// The map route, with a fallback while the project map loads.
export default function ProjectMapPage({
  params,
  searchParams,
}: PageProps<"/projects/[projectId]/map">) {
  return (
    <Suspense fallback={<main className="min-h-0 min-w-0 flex-1 overflow-hidden" />}>
      <ProjectMap params={params} searchParams={searchParams} />
    </Suspense>
  );
}

// Turns saved polygon rows into TerraDraw features.
function sketchFeatures(features: MapFeature[]) {
  return features.map((feature) => ({
    type: "Feature" as const,
    id: feature.id,
    geometry: feature.geometry,
    properties: { mode: "polygon", name: feature.name, description: feature.description },
  }));
}

// Loads one project map or sends the request to not found.
async function ProjectMap({
  params,
  searchParams,
}: {
  params: PageProps<"/projects/[projectId]/map">["params"];
  searchParams: PageProps<"/projects/[projectId]/map">["searchParams"];
}) {
  await connection();
  const { projectId } = await params;
  const query = await searchParams;
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
  const [actions, actionFeatures] = await Promise.all([
    getProjectActions(id, supabase),
    getActionFeatures(id, supabase),
  ]);

  return (
    <MapProvider
      key={projectId}
      projectId={id}
      initialFeatures={sketchFeatures(map.features)}
      initialActions={actions}
      initialActionFeatures={actionFeatures}
      initialSelectedFeature={typeof query.stand === "string" && map.features.some((feature) => feature.id === query.stand) ? query.stand : null}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <MapTopBar title={project.title ?? "Untitled"} projectId={id} />
      <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        <MapStage
          projectId={id}
          mapX={map.cameraX}
          mapY={map.cameraY}
          mapZoom={map.mapZoom}
        />
        <CommandSidebar />
        <DetailsSidebar />
        <FeatureDetailsPanel />
        <MapToolbar />
        <MapToolKeys />
        <MapContextMenu />
      </main>
      </div>
    </MapProvider>
  );
}
