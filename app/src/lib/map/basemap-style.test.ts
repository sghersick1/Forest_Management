import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { basemapStyle } from "@/lib/map/basemap-style";

const { getClaims } = vi.hoisted(() => ({
  getClaims: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getClaims },
  })),
}));

const originalKey = process.env.ESRI_API_KEY;

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  } as Response;
}

beforeEach(() => {
  process.env.ESRI_API_KEY = "test-key";
  getClaims.mockResolvedValue({
    data: { claims: { sub: "user-1" } },
    error: null,
  });
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  if (originalKey === undefined) {
    delete process.env.ESRI_API_KEY;
  } else {
    process.env.ESRI_API_KEY = originalKey;
  }
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("basemapStyle", () => {
  it("returns null when the caller is signed out", async () => {
    getClaims.mockResolvedValue({ data: { claims: {} }, error: null });

    await expect(basemapStyle()).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("throws when the Esri key is missing", async () => {
    delete process.env.ESRI_API_KEY;

    await expect(basemapStyle()).rejects.toThrow(
      "ESRI_API_KEY is required for the ArcGIS imagery style.",
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetches the style with the key and returns a style without it", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        version: 8,
        glyphs:
          "https://basemaps-api.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer/resources/fonts/{fontstack}/{range}.pbf?token=test-key",
        sources: {
          imagery: {
            type: "raster",
            tiles: [
              "https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=test-key",
            ],
          },
        },
        layers: [],
      }),
    );

    const style = await basemapStyle();

    const upstream = new URL(String(vi.mocked(fetch).mock.calls[0][0]));
    expect(upstream.origin + upstream.pathname).toBe(
      "https://basemapstyles-api.arcgis.com/arcgis/rest/services/styles/v2/styles/arcgis/imagery",
    );
    expect(upstream.searchParams.get("token")).toBe("test-key");
    expect(JSON.stringify(style)).not.toContain("test-key");
    expect(style?.glyphs?.startsWith("/api/basemap?url=")).toBe(true);
  });

  it("returns null when the style response fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, false));
    await expect(basemapStyle()).resolves.toBeNull();

    vi.mocked(fetch).mockRejectedValueOnce(new Error("network"));
    await expect(basemapStyle()).resolves.toBeNull();
  });
});
