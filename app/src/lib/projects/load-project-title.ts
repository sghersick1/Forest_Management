"use server";

import { getProject } from "@/lib/projects/projects";
import { createClient } from "@/lib/supabase/server";

/** Title of a project the caller can view, or null when it is missing. */
export async function loadProjectTitle(projectId: number): Promise<string | null> {
  const supabase = await createClient();

  try {
    const project = await getProject(projectId, supabase);
    const title = project?.title?.trim();
    return title ? title : null;
  } catch {
    return null;
  }
}
