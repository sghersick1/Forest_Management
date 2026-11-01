"use server";

import { getProjectMembers, type ProjectMember } from "@/lib/projects/project-members";
import { createClient } from "@/lib/supabase/server";

export async function loadProjectMembers(
  projectId: number,
): Promise<{ members: ProjectMember[]; error: string | null }> {
  const supabase = await createClient();

  try {
    const members = await getProjectMembers(projectId, supabase);
    return { members, error: null };
  } catch (caught) {
    return {
      members: [],
      error: caught instanceof Error ? caught.message : "Could not load members.",
    };
  }
}
