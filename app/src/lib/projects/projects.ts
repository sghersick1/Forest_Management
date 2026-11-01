import type { SupabaseClient } from "@supabase/supabase-js";

export type ProjectRole = "owner" | "editor" | "viewer";

export type Project = {
  id: number;
  title: string | null;
  createdAt: string;
  editedAt: string;
};

export type ProjectContact = {
  address: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
};

export type ProjectRecord = Project & ProjectContact;

export type NewProjectInput = {
  address: string;
  name: string;
  phone: string;
  email: string;
  company: string;
};

const projectColumns =
  "id, Title, address, contact_name, phone, email, company, created_at, edited_at";

function blankToNull(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Card title from the optional contact fields. Address wins. */
export function projectTitle(input: NewProjectInput) {
  const address = input.address.trim();
  const name = input.name.trim();
  const company = input.company.trim();
  if (address) {
    const street = address.split(",")[0]?.trim();
    return street && street.length > 0 ? street : address;
  }
  if (name) {
    return name;
  }
  if (company) {
    return company;
  }
  return "Untitled";
}

export type ProjectMembership = Project & {
  role: ProjectRole;
};

type ProjectRow = {
  id: number;
  Title: string | null;
  address: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
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
      `role, projects!project_members_project_id_fkey(${projectColumns})`,
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
      ...toProject(record),
      role: row.role,
    });
  }

  return [...projects.values()].sort((a, b) => a.id - b.id);
}

function toProject(record: ProjectRow): ProjectRecord {
  return {
    id: record.id,
    title: record.Title,
    address: record.address,
    contactName: record.contact_name,
    phone: record.phone,
    email: record.email,
    company: record.company,
    createdAt: record.created_at,
    editedAt: record.edited_at,
  };
}

/** Returns one project, or null when that id does not exist. */
export async function getProject(
  projectId: number,
  supabase: SupabaseClient,
): Promise<ProjectRecord | null> {
  const { data, error } = await supabase
    .from("projects")
    .select(projectColumns)
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return toProject(data as ProjectRow);
}

/** Inserts a project and assigns the user as its owner. */
export async function createProject(
  userId: string,
  input: NewProjectInput,
  supabase: SupabaseClient,
): Promise<ProjectRecord> {
  const { data, error } = await supabase
    .from("projects")
    .insert({
      Title: projectTitle(input),
      address: blankToNull(input.address),
      contact_name: blankToNull(input.name),
      phone: blankToNull(input.phone),
      email: blankToNull(input.email),
      company: blankToNull(input.company),
    })
    .select(projectColumns)
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

  return toProject(record);
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
