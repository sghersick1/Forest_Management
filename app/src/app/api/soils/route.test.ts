/*
 * Tests the soils route: session, bounds, and the GeoJSON response.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { getClaims } = vi.hoisted(() => ({
  getClaims: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getClaims },
  })),
}));

const bounds = { west: -81.302, south: 41.611, east: -81.3, north: 41.613 };

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/soils", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  getClaims.mockResolvedValue({
    data: { claims: { sub: "user-1" } },
    error: null,
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({
        Table: [
          ["mupolygonkey", "mukey", "muname", "musym", "wkt"],
          ["366043339", "286839", "Platea silt loam", "PsB", "POLYGON ((-81.31 41.6, -81.29 41.6, -81.29 41.62, -81.31 41.6))"],
        ],
      }),
    })),
  );
});

describe("POST /api/soils", () => {
  it("returns the map-unit polygons as GeoJSON", async () => {
    const response = await post({ bounds });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/geo+json");
    const collection = (await response.json()) as GeoJSON.FeatureCollection;
    expect(collection.type).toBe("FeatureCollection");
    expect(collection.features[0]?.id).toBe("366043339");
    expect(collection.features[0]?.properties).toMatchObject({
      mukey: "286839",
      muname: "Platea silt loam",
      musym: "PsB",
    });
  });

  it("rejects a missing session and bad bounds", async () => {
    getClaims.mockResolvedValue({ data: null, error: new Error("no session") });
    expect((await post({ bounds })).status).toBe(401);

    getClaims.mockResolvedValue({
      data: { claims: { sub: "user-1" } },
      error: null,
    });
    const response = await post({});
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "bounds is required." });
  });

  it("returns 502 when Soil Data Access fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, json: async () => ({}) })));
    const response = await post({ bounds });
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "Soil data is unavailable." });
  });
});
