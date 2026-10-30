import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { getProject, getProjectsForUser } from "@/lib/projects/projects";

function localEnv(name: string) {
  const fromProcess = process.env[name];
  if (fromProcess) {
    return fromProcess;
  }

  const line = readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8")
    .split("\n")
    .find((entry) => entry.startsWith(`${name}=`));
  if (!line) {
    throw new Error(`Missing ${name}`);
  }

  return line.slice(name.length + 1).trim().replace(/^['"]|['"]$/g, "");
}

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
      { role: "editor", projects: oakdale },
      { role: "editor", projects: [oakdale] },
      { role: "owner", projects: pineRidge },
    ]);

    const projects = await getProjectsForUser(7, client);

    expect(from).toHaveBeenCalledWith("project_roles");
    expect(select).toHaveBeenCalledWith(
      "role, projects!project_roles_project_fkey(id, Title, created_at, edited_at)",
    );
    expect(eq).toHaveBeenCalledWith("user", 7);
    expect(projects).toEqual([
      {
        id: 1,
        title: "Pine Ridge",
        createdAt: "2026-10-27T00:00:00.000Z",
        editedAt: "2026-10-27T01:00:00.000Z",
        role: "owner",
      },
      {
        id: 2,
        title: "Oakdale Sustainability",
        createdAt: "2026-10-28T00:00:00.000Z",
        editedAt: "2026-10-28T01:00:00.000Z",
        role: "editor",
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

  it("returns one project for public user 3", async () => {
    const supabase = createClient(
      localEnv("NEXT_PUBLIC_SUPABASE_URL"),
      localEnv("SUPABASE_SECRET_KEY"),
    );

    const projects = await getProjectsForUser(3, supabase);

    expect(projects).toHaveLength(1);
  });
});

function singleClient(
  data: unknown,
  error: { message: string } | null = null,
) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  const client = { from } as unknown as SupabaseClient;

  return { client, from, select, eq };
}

describe("getProject", () => {
  it("returns the project row", async () => {
    const { client, from, select, eq } = singleClient(oakdale);

    await expect(getProject(2, client)).resolves.toEqual({
      id: 2,
      title: "Oakdale Sustainability",
      createdAt: "2026-10-28T00:00:00.000Z",
      editedAt: "2026-10-28T01:00:00.000Z",
    });
    expect(from).toHaveBeenCalledWith("projects");
    expect(select).toHaveBeenCalledWith("id, Title, created_at, edited_at");
    expect(eq).toHaveBeenCalledWith("id", 2);
  });

  it("returns null when the project is missing", async () => {
    const { client } = singleClient(null);

    await expect(getProject(9, client)).resolves.toBeNull();
  });

  it("throws when the query fails", async () => {
    const { client } = singleClient(null, { message: "permission denied" });

    await expect(getProject(2, client)).rejects.toThrow("permission denied");
  });
});
