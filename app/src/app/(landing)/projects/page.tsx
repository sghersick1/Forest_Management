import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getProjectsForUser } from "@/lib/projects/projects";
import { createClient } from "@/lib/supabase/server";
import { ProjectBrowser } from "./project-browser";

export default function ProjectsPage() {
  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-surface-canvas">
      <Suspense fallback={<ProjectBrowser projects={[]} />}>
        <ProjectCatalog />
      </Suspense>
    </main>
  );
}

async function ProjectCatalog() {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const authId = data?.claims.sub;

  if (error || typeof authId !== "string") {
    return (
      <p className="template-body-medium px-8 pt-8">
        Not signed in.{" "}
        <Link href="/auth/login" className="template-body-medium-link">
          Sign in
        </Link>
      </p>
    );
  }

  const projects = await getProjectsForUser(authId, supabase);

  return <ProjectBrowser projects={projects} />;
}
