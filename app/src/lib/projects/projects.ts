import type { SupabaseClient } from "@supabase/supabase-js";

export type Project = {
  id: number;
  title: string | null;
  createdAt: string;
  editedAt: string;
};

type ProjectRow = {
  id: number;
  Title: string | null;
  created_at: string;
  edited_at: string;
};

type ProjectRoleRow = {
  projects: ProjectRow | ProjectRow[] | null;
};

export async function getProjectsForUser(
  userId: number,
  supabase: SupabaseClient,
): Promise<Project[]> {
  const { data, error } = await supabase
    .from("project_roles")
    .select(
      "projects!project_roles_project_fkey(id, Title, created_at, edited_at)",
    )
    .eq("user", userId);

  if (error) {
    throw new Error(error.message);
  }

  const projects = new Map<number, Project>();

  for (const row of (data ?? []) as unknown as ProjectRoleRow[]) {
    const nested = row.projects;
    const record = Array.isArray(nested) ? (nested[0] ?? null) : nested;
    if (!record) {
      continue;
    }

    projects.set(record.id, {
      id: record.id,
      title: record.Title,
      createdAt: record.created_at,
      editedAt: record.edited_at,
    });
  }

  return [...projects.values()].sort((a, b) => a.id - b.id);
}
