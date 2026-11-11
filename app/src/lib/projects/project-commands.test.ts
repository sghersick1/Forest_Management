import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  createProject,
  deleteProject,
  projectTitle,
  type NewProjectInput,
} from "@/lib/projects/projects";

const userId = "00000000-0000-4000-8000-000000000007";

const input: NewProjectInput = {
  address: "1840 County Road 12, Ely, MN",
  name: "Mara Lind",
  phone: "(218) 555-0148",
  email: "mara@northlineforestry.com",
  company: "Northline Forestry",
};

const createdRow = {
  id: 9,
  Title: "1840 County Road 12",
  address: "1840 County Road 12, Ely, MN",
  contact_name: "Mara Lind",
  phone: "(218) 555-0148",
  email: "mara@northlineforestry.com",
  company: "Northline Forestry",
  created_at: "2026-10-30T00:00:00.000Z",
  edited_at: "2026-10-30T00:00:00.000Z",
};

const createdProject = {
  id: 9,
  title: "1840 County Road 12",
  address: "1840 County Road 12, Ely, MN",
  contactName: "Mara Lind",
  phone: "(218) 555-0148",
  email: "mara@northlineforestry.com",
  company: "Northline Forestry",
  mapX: -81.3011053204884,
  mapY: 41.61200295314762,
  mapZoom: 15,
  createdAt: "2026-10-30T00:00:00.000Z",
  editedAt: "2026-10-30T00:00:00.000Z",
};

const defaultCamera = {
  camera_x: -81.3011053204884,
  camera_y: 41.61200295314762,
  map_zoom: 15,
};

function createClient(results: {
  project: { data: unknown; error: { message: string } | null };
  role?: { error: { message: string } | null };
  camera?: { data: unknown; error: { message: string } | null };
  mapUpdate?: { error: { message: string } | null };
}) {
  const projectSingle = vi.fn().mockResolvedValue(results.project);
  const projectSelect = vi.fn().mockReturnValue({ single: projectSingle });
  const projectInsert = vi.fn().mockReturnValue({ select: projectSelect });
  const roleInsert = vi.fn().mockResolvedValue({
    error: results.role?.error ?? null,
  });
  const cameraMaybeSingle = vi.fn().mockResolvedValue(
    results.camera ?? { data: defaultCamera, error: null },
  );
  const cameraEq = vi.fn().mockReturnValue({ maybeSingle: cameraMaybeSingle });
  const cameraSelect = vi.fn().mockReturnValue({ eq: cameraEq });
  const mapUpdateEq = vi.fn().mockResolvedValue({
    error: results.mapUpdate?.error ?? null,
  });
  const mapUpdate = vi.fn().mockReturnValue({ eq: mapUpdateEq });
  const from = vi.fn((table: string) => {
    if (table === "projects") {
      return { insert: projectInsert };
    }
    if (table === "project_members") {
      return { insert: roleInsert };
    }
    if (table === "maps") {
      return { select: cameraSelect, update: mapUpdate };
    }
    throw new Error(`unexpected table ${table}`);
  });

  return {
    client: { from } as unknown as SupabaseClient,
    from,
    projectInsert,
    projectSelect,
    roleInsert,
    cameraSelect,
    mapUpdate,
    mapUpdateEq,
  };
}

describe("createProject", () => {
  it("inserts the project and an owner role for the current user", async () => {
    const { client, from, projectInsert, projectSelect, roleInsert } =
      createClient({
        project: { data: createdRow, error: null },
      });

    await expect(createProject(userId, input, client)).resolves.toEqual(
      createdProject,
    );

    expect(from).toHaveBeenNthCalledWith(1, "projects");
    expect(projectInsert).toHaveBeenCalledWith({
      Title: "1840 County Road 12",
      address: "1840 County Road 12, Ely, MN",
      contact_name: "Mara Lind",
      phone: "(218) 555-0148",
      email: "mara@northlineforestry.com",
      company: "Northline Forestry",
    });
    expect(projectSelect).toHaveBeenCalledWith(
      "id, Title, address, contact_name, phone, email, company, created_at, edited_at",
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

    await expect(createProject(userId, input, client)).rejects.toThrow(
      "permission denied",
    );
    expect(roleInsert).not.toHaveBeenCalled();
  });

  it("stores a geocoded point on the map and leaves zoom at the default", async () => {
    const { client, projectInsert, mapUpdate, mapUpdateEq } = createClient({
      project: { data: createdRow, error: null },
    });

    await expect(
      createProject(userId, input, client, { x: -91.8, y: 47.9 }),
    ).resolves.toMatchObject({
      mapX: -91.8,
      mapY: 47.9,
      mapZoom: 15,
    });

    expect(projectInsert).toHaveBeenCalledWith({
      Title: "1840 County Road 12",
      address: "1840 County Road 12, Ely, MN",
      contact_name: "Mara Lind",
      phone: "(218) 555-0148",
      email: "mara@northlineforestry.com",
      company: "Northline Forestry",
    });
    expect(mapUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ camera_x: -91.8, camera_y: 47.9 }),
    );
    expect(mapUpdateEq).toHaveBeenCalledWith("project_id", 9);
  });

  it("throws when the owner role insert fails", async () => {
    const { client } = createClient({
      project: { data: createdRow, error: null },
      role: { error: { message: "role insert failed" } },
    });

    await expect(createProject(userId, input, client)).rejects.toThrow(
      "role insert failed",
    );
  });
});

describe("projectTitle", () => {
  it("uses the street, then the name, then the company", () => {
    expect(projectTitle(input)).toBe("1840 County Road 12");
    expect(projectTitle({ ...input, address: "  " })).toBe("Mara Lind");
    expect(
      projectTitle({ ...input, address: "", name: " ", company: "Northline" }),
    ).toBe("Northline");
    expect(
      projectTitle({
        address: "",
        name: "",
        phone: "",
        email: "",
        company: "",
      }),
    ).toBe("Untitled");
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
