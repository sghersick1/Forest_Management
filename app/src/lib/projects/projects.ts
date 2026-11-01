import type { SupabaseClient } from "@supabase/supabase-js";

export type ProjectRole = "owner" | "editor" | "viewer";

export type Project = {
  id: number;
  title: string | null;
  createdAt: string;
  editedAt: string;
};

export type ProjectMembership = Project & {
  role: ProjectRole;
};

type ProjectRow = {
  id: number;
  Title: string | null;
  created_at: string;
  edited_at: string;
};

type ProjectRoleRow = {
  role: ProjectRole;
  projects: ProjectRow | ProjectRow[] | null;
};

/** Returns each project the user belongs to, once, ordered by id. */
export async function getProjectsForUser(
  userId: string,
  supabase: SupabaseClient,
): Promise<ProjectMembership[]> {
  const { data, error } = await supabase
    .from("project_members")
    .select(
      "role, projects!project_members_project_id_fkey(id, Title, created_at, edited_at)",
    )
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  const projects = new Map<number, ProjectMembership>();

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
      role: row.role,
    });
  }

  return [...projects.values()].sort((a, b) => a.id - b.id);
}

/** Returns one project, or null when that id does not exist. */
export async function getProject(
  projectId: number,
  supabase: SupabaseClient,
): Promise<Project | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, Title, created_at, edited_at")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const record = data as ProjectRow;

  return {
    id: record.id,
    title: record.Title,
    createdAt: record.created_at,
    editedAt: record.edited_at,
  };
}

/** Inserts a project and assigns the user as its owner. */
export async function createProject(
  userId: string,
  title: string,
  supabase: SupabaseClient,
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .insert({ Title: title })
    .select("id, Title, created_at, edited_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const record = data as ProjectRow;
  const { error: roleError } = await supabase.from("project_members").insert({
    project_id: record.id,
    user_id: userId,
    role: "owner",
  });

  if (roleError) {
    throw new Error(roleError.message);
  }

  return {
    id: record.id,
    title: record.Title,
    createdAt: record.created_at,
    editedAt: record.edited_at,
  };
}

/** Leaves, hands the project to an editor, or deletes it when no editor remains. */
export async function deleteProject(
  projectId: number,
  supabase: SupabaseClient,
): Promise<void> {
  const { error } = await supabase.rpc("delete_project", {
    target_project: projectId,
  });

  if (error) {
    throw new Error(error.message);
  }
}
