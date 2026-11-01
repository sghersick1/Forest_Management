import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { getProject } from "@/lib/projects/projects";
import { createClient } from "@/lib/supabase/server";

export default function ProjectLayout({
  children,
  params,
}: LayoutProps<"/projects/[projectId]">) {
  return (
    <Suspense fallback={null}>
      <ProjectAccess params={params}>{children}</ProjectAccess>
    </Suspense>
  );
}

async function ProjectAccess({
  children,
  params,
}: {
  children: ReactNode;
  params: LayoutProps<"/projects/[projectId]">["params"];
}) {
  await connection();
  const { projectId } = await params;
  const id = Number(projectId);
  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const authId = data?.claims.sub;
  if (error || typeof authId !== "string") {
    redirect(`/auth/login?next=/projects/${id}`);
  }

  const project = await getProject(id, supabase);
  if (!project) {
    notFound();
  }

  return children;
}
