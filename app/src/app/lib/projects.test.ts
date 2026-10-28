import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { getProjectsForUser } from "@/app/lib/projects";

const oakdale = {
  id: 2,
  Title: "Oakdale Sustainability",
  created_at: "2026-10-28T00:00:00.000Z",
  edited_at: "2026-10-28T01:00:00.000Z",
};

const pineRidge = {
  id: 1,
  Title: "Pine Ridge",
  created_at: "2026-10-27T00:00:00.000Z",
  edited_at: "2026-10-27T01:00:00.000Z",
};

function clientReturning(
  data: unknown,
  error: { message: string } | null = null,
) {
  const eq = vi.fn().mockResolvedValue({ data, error });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  const client = { from } as unknown as SupabaseClient;

  return { client, from, select, eq };
}

describe("getProjectsForUser", () => {
  it("returns each project the user is involved in, once, ordered by id", async () => {
    const { client, from, select, eq } = clientReturning([
      { projects: oakdale },
      { projects: [oakdale] },
      { projects: pineRidge },
    ]);

    const projects = await getProjectsForUser(7, client);

    expect(from).toHaveBeenCalledWith("project_roles");
    expect(select).toHaveBeenCalledWith(
      "projects!project_roles_project_fkey(id, Title, created_at, edited_at)",
    );
    expect(eq).toHaveBeenCalledWith("user", 7);
    expect(projects).toEqual([
      {
        id: 1,
        title: "Pine Ridge",
        createdAt: "2026-10-27T00:00:00.000Z",
        editedAt: "2026-10-27T01:00:00.000Z",
      },
      {
        id: 2,
        title: "Oakdale Sustainability",
        createdAt: "2026-10-28T00:00:00.000Z",
        editedAt: "2026-10-28T01:00:00.000Z",
      },
    ]);
  });

  it("returns an empty list when the user has no project roles", async () => {
    const { client } = clientReturning([]);

    await expect(getProjectsForUser(7, client)).resolves.toEqual([]);
  });

  it("throws when the query fails", async () => {
    const { client } = clientReturning(null, { message: "permission denied" });

    await expect(getProjectsForUser(7, client)).rejects.toThrow(
      "permission denied",
    );
  });
});
