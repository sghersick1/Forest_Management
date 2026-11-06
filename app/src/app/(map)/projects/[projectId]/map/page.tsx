import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getProject } from "@/lib/projects/projects";
import { createClient } from "@/lib/supabase/server";
import { MapProvider } from "./map-context";
import { MapStage } from "./map-stage";
import { PanelBar } from "./panel-bar";
import { MapSidebar } from "./map-sidebar";
import { MapToolbar } from "./map-toolbar";

export default function ProjectMapPage({
  params,
}: PageProps<"/projects/[projectId]/map">) {
  return (
    <Suspense fallback={<main className="min-h-0 flex-1" />}>
      <ProjectMap params={params} />
    </Suspense>
  );
}

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

  return (
    <MapProvider key={projectId}>
      <main className="relative min-h-0 flex-1">
        <MapStage
          mapX={project.mapX}
          mapY={project.mapY}
          mapZoom={project.mapZoom}
        />
        <PanelBar />
        <MapSidebar />
        <MapToolbar />
      </main>
    </MapProvider>
  );
}
