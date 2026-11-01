import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getProjectsForUser } from "@/lib/projects/projects";
import { createClient } from "@/lib/supabase/server";
import { NewProjectButton } from "./new-project-button";
import { ProjectBrowser } from "./project-browser";

export default function ProjectsPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 bg-surface-canvas py-4">
      <div className="flex items-center justify-between px-8 py-4">
        <h1 className="template-headline-medium">Forest Management Plans</h1>
        <NewProjectButton />
      </div>
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
      <p className="template-body-medium px-8">
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
