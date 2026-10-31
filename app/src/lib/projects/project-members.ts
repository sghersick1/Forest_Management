import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProjectRole } from "@/lib/projects/projects";

export type ProjectMember = {
  userId: string;
  role: ProjectRole;
  email: string;
  name: string | null;
};

const roles = new Set<ProjectRole>(["owner", "editor", "viewer"]);

const roleRank: Record<ProjectRole, number> = {
  owner: 3,
  editor: 2,
  viewer: 1,
};

/** True when the caller may change this member's role. */
export function canChangeMemberRole(
  caller: ProjectRole | undefined,
  target: ProjectRole,
  yours: boolean,
) {
  if (!caller || yours || target === "owner") {
    return false;
  }

  return roleRank[caller] > roleRank[target];
}

type MemberRow = {
  user_id: string;
  role: string;
  email: string | null;
  name: string | null;
};

/** Name when the account has one, otherwise the email. */
export function memberLabel(name: string | null, email: string) {
  const trimmed = name?.trim();
  return trimmed ? trimmed : email;
}

/** People on the project, for a caller who belongs to it. */
export async function getProjectMembers(
  projectId: number,
  supabase: SupabaseClient,
): Promise<ProjectMember[]> {
  const { data, error } = await supabase.rpc("project_members", {
    target_project: projectId,
  });

  if (error) {
    throw new Error(error.message);
  }

  const members: ProjectMember[] = [];

  for (const row of (data ?? []) as MemberRow[]) {
    if (!roles.has(row.role as ProjectRole) || !row.email) {
      continue;
    }

    members.push({
      userId: row.user_id,
      role: row.role as ProjectRole,
      email: row.email,
      name: row.name,
    });
  }

  return members;
}
