import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { createProject, deleteProject } from "@/lib/projects/projects";

const createdRow = {
  id: 9,
  Title: "New stand",
  created_at: "2026-10-30T00:00:00.000Z",
  edited_at: "2026-10-30T00:00:00.000Z",
};

const createdProject = {
  id: 9,
  title: "New stand",
  createdAt: "2026-10-30T00:00:00.000Z",
  editedAt: "2026-10-30T00:00:00.000Z",
};

function createClient(results: {
  project: { data: unknown; error: { message: string } | null };
  role?: { error: { message: string } | null };
}) {
  const projectSingle = vi.fn().mockResolvedValue(results.project);
  const projectSelect = vi.fn().mockReturnValue({ single: projectSingle });
  const projectInsert = vi.fn().mockReturnValue({ select: projectSelect });
  const roleInsert = vi.fn().mockResolvedValue({
    error: results.role?.error ?? null,
  });
  const from = vi.fn((table: string) => {
    if (table === "projects") {
      return { insert: projectInsert };
    }
    if (table === "project_roles") {
      return { insert: roleInsert };
    }
    throw new Error(`unexpected table ${table}`);
  });

  return {
    client: { from } as unknown as SupabaseClient,
    from,
    projectInsert,
    projectSelect,
    roleInsert,
  };
}

function deleteClient(results: {
  roles: { error: { message: string } | null };
  project?: { error: { message: string } | null };
}) {
  const roleEq = vi.fn().mockResolvedValue({ error: results.roles.error });
  const roleDelete = vi.fn().mockReturnValue({ eq: roleEq });
  const projectEq = vi.fn().mockResolvedValue({
    error: results.project?.error ?? null,
  });
  const projectDelete = vi.fn().mockReturnValue({ eq: projectEq });
  const from = vi.fn((table: string) => {
    if (table === "project_roles") {
      return { delete: roleDelete };
    }
    if (table === "projects") {
      return { delete: projectDelete };
    }
    throw new Error(`unexpected table ${table}`);
  });

  return {
    client: { from } as unknown as SupabaseClient,
    from,
    roleEq,
    roleDelete,
    projectEq,
    projectDelete,
  };
}

describe("createProject", () => {
  it("inserts the project and an owner role for the current user", async () => {
    const { client, from, projectInsert, projectSelect, roleInsert } =
      createClient({
        project: { data: createdRow, error: null },
      });

    await expect(createProject(7, "New stand", client)).resolves.toEqual(
      createdProject,
    );

    expect(from).toHaveBeenNthCalledWith(1, "projects");
    expect(projectInsert).toHaveBeenCalledWith({ Title: "New stand" });
    expect(projectSelect).toHaveBeenCalledWith(
      "id, Title, created_at, edited_at",
    );
    expect(from).toHaveBeenNthCalledWith(2, "project_roles");
    expect(roleInsert).toHaveBeenCalledWith({
      project: 9,
      user: 7,
      role: "owner",
    });
  });

  it("throws when the project insert fails and does not write a role", async () => {
    const { client, roleInsert } = createClient({
      project: { data: null, error: { message: "permission denied" } },
    });

    await expect(createProject(7, "New stand", client)).rejects.toThrow(
      "permission denied",
    );
    expect(roleInsert).not.toHaveBeenCalled();
  });

  it("throws when the owner role insert fails", async () => {
    const { client } = createClient({
      project: { data: createdRow, error: null },
      role: { error: { message: "role insert failed" } },
    });

    await expect(createProject(7, "New stand", client)).rejects.toThrow(
      "role insert failed",
    );
  });
});

describe("deleteProject", () => {
  it("deletes every role on the project, then the project", async () => {
    const { client, from, roleDelete, roleEq, projectDelete, projectEq } =
      deleteClient({
        roles: { error: null },
      });

    await expect(deleteProject(9, client)).resolves.toBeUndefined();

    expect(from).toHaveBeenNthCalledWith(1, "project_roles");
    expect(roleDelete).toHaveBeenCalledOnce();
    expect(roleEq).toHaveBeenCalledWith("project", 9);
    expect(from).toHaveBeenNthCalledWith(2, "projects");
    expect(projectDelete).toHaveBeenCalledOnce();
    expect(projectEq).toHaveBeenCalledWith("id", 9);
  });

  it("throws when the role delete fails and does not delete the project", async () => {
    const { client, projectDelete } = deleteClient({
      roles: { error: { message: "permission denied" } },
    });

    await expect(deleteProject(9, client)).rejects.toThrow(
      "permission denied",
    );
    expect(projectDelete).not.toHaveBeenCalled();
  });

  it("throws when the project delete fails", async () => {
    const { client } = deleteClient({
      roles: { error: null },
      project: { error: { message: "project delete failed" } },
    });

    await expect(deleteProject(9, client)).rejects.toThrow(
      "project delete failed",
    );
  });
});
