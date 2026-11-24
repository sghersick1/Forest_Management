import { connection } from "next/server";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getProjectActions } from "@/lib/actions/actions";
import { getMap } from "@/lib/maps/maps";
import { getProjectDocumentSections } from "@/lib/projects/project-document-sections";
import { getStandDocuments, getStandRole } from "@/lib/maps/stand-documents";
import { getProject } from "@/lib/projects/projects";
import { createClient } from "@/lib/supabase/server";
import { PlanWorkspace } from "./plan-workspace";

export default function PlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ stand?: string }>;
}) {
  return (
    <Suspense fallback={<main className="min-h-0 min-w-0 flex-1 bg-surface-canvas" />}>
      <PlanLoader params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function PlanLoader({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ stand?: string }>;
}) {
  await connection();
  const { projectId } = await params;
  const id = Number(projectId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const supabase = await createClient();
  const [project, map, role, documents, actions, sections] = await Promise.all([
    getProject(id, supabase),
    getMap(id, supabase),
    getStandRole(id, supabase),
    getStandDocuments(id, supabase),
    getProjectActions(id, supabase),
    getProjectDocumentSections(id),
  ]);
  if (!project || !map || !role) notFound();

  const query = await searchParams;
  const requestedStand = typeof query.stand === "string" ? query.stand : null;
  const selectedId = requestedStand && map.features.some((feature) => feature.id === requestedStand)
    ? requestedStand
    : map.features[0]?.id ?? null;

  return (
    <PlanWorkspace
      projectId={id}
      projectTitle={project.title ?? "Untitled"}
      overviewFields={[
        { key: "title", label: "Property name", value: project.title },
        { key: "address", label: "Address", value: project.address },
        { key: "contact_name", label: "Contact", value: project.contactName },
        { key: "phone", label: "Phone", value: project.phone },
        { key: "email", label: "Email", value: project.email },
        { key: "company", label: "Company", value: project.company },
      ]}
      features={map.features}
      documents={documents}
      actions={actions}
      sections={sections}
      selectedId={selectedId}
      canEdit={role === "owner" || role === "editor"}
    />
  );
}
