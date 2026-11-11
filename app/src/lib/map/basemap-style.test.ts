import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/basemap/style/route";
import { clearBasemapStyleCache, basemapStyle } from "@/lib/map/basemap-style";

const { getClaims } = vi.hoisted(() => ({
  getClaims: vi.fn(),
}));

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
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

const styleBody = {
  version: 8,
  sprite:
    "https://cdn.arcgis.com/sharing/rest/content/items/abc/resources/sprites/sprite",
  glyphs:
    "https://basemaps-api.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer/resources/fonts/{fontstack}/{range}.pbf",
  sources: {
    imagery: {
      type: "raster",
      tiles: [
        "https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
    },
  },
  layers: [],
};

beforeEach(() => {
  clearBasemapStyleCache();
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
  it("does not check the session", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(styleBody));

    await basemapStyle();

    expect(getClaims).not.toHaveBeenCalled();
  });

  it("throws when the Esri key is missing", async () => {
    delete process.env.ESRI_API_KEY;

    await expect(basemapStyle()).rejects.toThrow(
      "ESRI_API_KEY is required for the ArcGIS imagery style.",
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetches the style with echoToken=false and returns a style without the key", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(styleBody));

    const style = await basemapStyle();

    const upstream = new URL(String(vi.mocked(fetch).mock.calls[0][0]));
    expect(upstream.origin + upstream.pathname).toBe(
      "https://basemapstyles-api.arcgis.com/arcgis/rest/services/styles/v2/styles/arcgis/imagery",
    );
    expect(upstream.searchParams.get("token")).toBe("test-key");
    expect(upstream.searchParams.get("echoToken")).toBe("false");
    expect(JSON.stringify(style)).not.toContain("test-key");
    expect(style?.glyphs?.startsWith("/api/basemap?url=")).toBe(true);
  });

  it("fetches the imagery style once", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(styleBody));

    await basemapStyle();
    await basemapStyle();

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("returns null when the style response fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, false));
    await expect(basemapStyle()).resolves.toBeNull();

    vi.mocked(fetch).mockRejectedValueOnce(new Error("network"));
    await expect(basemapStyle()).resolves.toBeNull();
  });
});

describe("basemap style route", () => {
  it("returns the style without a session check", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(styleBody));

    const response = await GET();

    expect(getClaims).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=86400, s-maxage=86400",
    );
    const style = await response.json();
    expect(style.glyphs.startsWith("/api/basemap?url=")).toBe(true);
    expect(style.sprite).toBe(styleBody.sprite);
  });
});
