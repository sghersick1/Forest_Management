import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { createProject, deleteProject } from "@/lib/projects/projects";

const userId = "00000000-0000-4000-8000-000000000007";

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
    if (table === "project_members") {
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

describe("createProject", () => {
  it("inserts the project and an owner role for the current user", async () => {
    const { client, from, projectInsert, projectSelect, roleInsert } =
      createClient({
        project: { data: createdRow, error: null },
      });

    await expect(createProject(userId, "New stand", client)).resolves.toEqual(
      createdProject,
    );

    expect(from).toHaveBeenNthCalledWith(1, "projects");
    expect(projectInsert).toHaveBeenCalledWith({ Title: "New stand" });
    expect(projectSelect).toHaveBeenCalledWith(
      "id, Title, created_at, edited_at",
    );
    expect(from).toHaveBeenNthCalledWith(2, "project_members");
    expect(roleInsert).toHaveBeenCalledWith({
      project_id: 9,
      user_id: userId,
      role: "owner",
    });
  });

  it("throws when the project insert fails and does not write a role", async () => {
    const { client, roleInsert } = createClient({
      project: { data: null, error: { message: "permission denied" } },
    });

    await expect(createProject(userId, "New stand", client)).rejects.toThrow(
      "permission denied",
    );
    expect(roleInsert).not.toHaveBeenCalled();
  });

  it("throws when the owner role insert fails", async () => {
    const { client } = createClient({
      project: { data: createdRow, error: null },
      role: { error: { message: "role insert failed" } },
    });

    await expect(createProject(userId, "New stand", client)).rejects.toThrow(
      "role insert failed",
    );
  });
});

describe("deleteProject", () => {
  it("calls delete_project for the signed-in member", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "left", error: null });
    const projectEq = vi.fn().mockResolvedValue({ error: null });
    const projectDelete = vi.fn().mockReturnValue({ eq: projectEq });
    const from = vi.fn().mockReturnValue({ delete: projectDelete });
    const client = { rpc, from } as unknown as SupabaseClient;

    await deleteProject(9, client);

    expect(rpc).toHaveBeenCalledWith("delete_project", { target_project: 9 });
    expect(from).not.toHaveBeenCalled();
  });

  it("throws when delete_project fails", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "project delete failed" },
    });
    const client = { rpc } as unknown as SupabaseClient;

    await expect(deleteProject(9, client)).rejects.toThrow(
      "project delete failed",
    );
  });
});
