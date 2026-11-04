import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Map } from "@/app/components/map/map";
import { getProject } from "@/lib/projects/projects";
import { createClient } from "@/lib/supabase/server";
import { MapNav } from "./map-nav";
import { MapSidebar } from "./map-sidebar";

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
    <main className="relative min-h-0 flex-1">
      <Map
        interactive
        mapX={project.mapX}
        mapY={project.mapY}
        mapZoom={project.mapZoom}
      />
      <MapNav />
      <MapSidebar />
    </main>
  );
}
