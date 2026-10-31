"use server";

import { createClient } from "@/lib/supabase/server";
import type { ProjectRole } from "@/lib/projects/projects";

const grantRoles = new Set<ProjectRole>(["editor", "viewer"]);

export async function inviteToProject(
  projectId: number,
  email: string,
  role: ProjectRole,
): Promise<{ status: "member" | "invited" | null; error: string | null }> {
  if (!grantRoles.has(role)) {
    return { status: null, error: "You cannot grant that role." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("invite_to_project", {
    target_project: projectId,
    target_email: email,
    target_role: role,
  });

  if (error) {
    return { status: null, error: error.message };
  }

  if (data === "member" || data === "invited") {
    return { status: data, error: null };
  }

  return { status: null, error: "Could not send the invite." };
}
