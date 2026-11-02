import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, getClaims, createProject, geocodeAddress, redirect } =
  vi.hoisted(() => ({
    createClient: vi.fn(),
    getClaims: vi.fn(),
    createProject: vi.fn(),
    geocodeAddress: vi.fn(),
    redirect: vi.fn(),
  }));

vi.mock("@/lib/supabase/server", () => ({
  createClient,
}));

vi.mock("@/lib/projects/projects", () => ({
  createProject,
}));

vi.mock("@/lib/map/geocode-address", () => ({
  geocodeAddress,
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

import { submitNewProject } from "@/lib/projects/create-project";

const userId = "00000000-0000-4000-8000-000000000007";

function form(address: string) {
  const data = new FormData();
  data.set("address", address);
  data.set("name", "Mara Lind");
  data.set("phone", "");
  data.set("email", "");
  data.set("company", "");
  return data;
}

beforeEach(() => {
  createClient.mockReset();
  createProject.mockReset();
  createClient.mockResolvedValue({ auth: { getClaims } });
  getClaims.mockResolvedValue({
    data: { claims: { sub: userId } },
    error: null,
  });
  createProject.mockResolvedValue({ id: 9 });
  geocodeAddress.mockReset();
  redirect.mockImplementation((path: string) => {
    throw new Error(`redirect:${path}`);
  });
});

describe("submitNewProject", () => {
  it("saves the geocoded point", async () => {
    geocodeAddress.mockResolvedValue({
      x: -91.8,
      y: 47.9,
      score: 100,
      extent_xmin: -91.81,
      extent_ymin: 47.89,
      extent_xmax: -91.79,
      extent_ymax: 47.91,
    });

    await expect(
      submitNewProject({ error: null }, form("1840 County Road 12, Ely, MN")),
    ).rejects.toThrow("redirect:/projects/9");

    expect(geocodeAddress).toHaveBeenCalledWith("1840 County Road 12, Ely, MN");
    expect(createProject).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        address: "1840 County Road 12, Ely, MN",
      }),
      expect.anything(),
      { x: -91.8, y: 47.9 },
    );
  });

  it("leaves coordinates to the database default when geocoding finds nothing", async () => {
    geocodeAddress.mockResolvedValue(null);

    await expect(
      submitNewProject({ error: null }, form("1840 County Road 12")),
    ).rejects.toThrow("redirect:/projects/9");

    expect(createProject).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({ address: "1840 County Road 12" }),
      expect.anything(),
      undefined,
    );
  });

  it("leaves coordinates to the database default when geocoding fails", async () => {
    geocodeAddress.mockRejectedValue(new Error("ESRI_API_KEY is required."));

    await expect(
      submitNewProject({ error: null }, form("1840 County Road 12")),
    ).rejects.toThrow("redirect:/projects/9");

    expect(createProject).toHaveBeenCalledWith(
      userId,
      expect.any(Object),
      expect.anything(),
      undefined,
    );
  });

  it("skips geocoding when the address is blank", async () => {
    await expect(
      submitNewProject({ error: null }, form("   ")),
    ).rejects.toThrow("redirect:/projects/9");

    expect(geocodeAddress).not.toHaveBeenCalled();
    expect(createProject).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({ address: "   " }),
      expect.anything(),
      undefined,
    );
  });
});
