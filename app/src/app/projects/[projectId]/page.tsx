import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getProject } from "@/lib/projects/projects";
import { createClient } from "@/lib/supabase/server";
import { ProjectEditor } from "./project-editor";

export default function ProjectPage({
  params,
}: PageProps<"/projects/[projectId]">) {
  return (
    <Suspense fallback={<ProjectEditor title="" />}>
      <ProjectEditorView params={params} />
    </Suspense>
  );
}

async function ProjectEditorView({
  params,
}: {
  params: PageProps<"/projects/[projectId]">["params"];
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

  return <ProjectEditor title={project.title ?? ""} />;
}
