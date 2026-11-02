import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/basemap/route";
import {
  basemapTarget,
  clearBasemapCache,
  sanitizeBasemapStyle,
  toProxyUrl,
} from "@/lib/map/basemap-proxy";

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
}));

const { getClaims } = vi.hoisted(() => ({
  getClaims: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getClaims },
  })),
}));

const originalKey = process.env.ESRI_API_KEY;

const imageryTile =
  "https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=test-key";
const glyphTemplate =
  "https://basemaps-api.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer/resources/fonts/{fontstack}/{range}.pbf?token=test-key";

function styleFixture() {
  return {
    version: 8,
    sprite:
      "https://cdn.arcgis.com/sharing/rest/content/items/abc/resources/styles/../sprites/sprite",
    glyphs: glyphTemplate,
    sources: {
      esri: {
        type: "vector",
        url: "https://basemaps-api.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer",
        tiles: [
          "https://basemaps-api.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer/tile/{z}/{y}/{x}.pbf?token=test-key",
        ],
      },
      imagery: {
        type: "raster",
        tiles: [imageryTile],
      },
    },
    layers: [],
  };
}

function proxyTarget(proxyUrl: string): string {
  const target = new URL(proxyUrl, "http://localhost").searchParams.get("url");
  if (!target) {
    throw new Error("missing proxy target");
  }
  return target;
}

beforeEach(() => {
  clearBasemapCache();
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

describe("toProxyUrl", () => {
  it("keeps MapLibre placeholders and drops the Esri token", () => {
    const proxied = toProxyUrl(imageryTile);
    expect(proxied).toBeTruthy();
    const requested = proxied!
      .replaceAll("{z}", "12")
      .replaceAll("{y}", "1540")
      .replaceAll("{x}", "1122");
    const target = new URL(proxyTarget(requested));

    expect(target.origin + target.pathname).toBe(
      "https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/12/1540/1122",
    );
    expect(target.searchParams.has("token")).toBe(false);
  });

  it("keeps a font name with spaces inside the proxied glyph URL", () => {
    const proxied = toProxyUrl(glyphTemplate);
    const requested = proxied!
      .replaceAll("{fontstack}", "Arial Unicode MS Regular")
      .replaceAll("{range}", "0-255");
    const target = new URL(proxyTarget(requested));

    expect(target.pathname).toBe(
      "/arcgis/rest/services/World_Basemap_v2/VectorTileServer/resources/fonts/Arial%20Unicode%20MS%20Regular/0-255.pbf",
    );
    expect(target.searchParams.has("token")).toBe(false);
  });

  it("rewrites basemap URLs that do not carry a token", () => {
    const proxied = toProxyUrl(
      "https://basemaps-api.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer",
    );

    expect(proxied?.startsWith("/api/basemap?url=")).toBe(true);
    expect(proxyTarget(proxied!)).toBe(
      "https://basemaps-api.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer",
    );
  });

  it("leaves sprite, geocode, and other CDN URLs on their original hosts", () => {
    expect(
      toProxyUrl(
        "https://cdn.arcgis.com/sharing/rest/content/items/abc/resources/sprites/sprite",
      ),
    ).toBeNull();
    expect(
      toProxyUrl(
        "https://basemaps-api.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer/resources/sprites/sprite@2x.json",
      ),
    ).toBeNull();
    expect(
      toProxyUrl(
        "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?token=test-key",
      ),
    ).toBeNull();
    expect(
      toProxyUrl("https://cdn.arcgis.com/sharing/rest/content/items/abc/info/thumbnail.png"),
    ).toBeNull();
  });
});

describe("sanitizeBasemapStyle", () => {
  it("rewrites tokenized tiles and glyphs and leaves the key out of the style", () => {
    const style = sanitizeBasemapStyle(styleFixture(), "test-key");

    expect(style).toBeTruthy();
    expect(JSON.stringify(style)).not.toContain("test-key");
    expect(style?.glyphs?.startsWith("/api/basemap?url=")).toBe(true);
    expect(style?.sprite).toBe(styleFixture().sprite);
    expect(style?.sources.esri).toMatchObject({
      url: expect.stringContaining("/api/basemap?url="),
    });
    const tiles = style?.sources.imagery;
    expect(tiles && "tiles" in tiles ? tiles.tiles?.[0] : "").toContain(
      "/api/basemap?url=",
    );
  });

  it("returns null when the token survives only in percent-encoded form", () => {
    const style = styleFixture();
    style.glyphs =
      "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer?token=a%2Bb";

    expect(sanitizeBasemapStyle(style, "a+b")).toBeNull();
  });

  it("returns null when a tokenized URL is outside the basemap hosts", () => {
    const style = styleFixture();
    style.glyphs =
      "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer?token=test-key";

    expect(sanitizeBasemapStyle(style, "test-key")).toBeNull();
  });
});

describe("basemap proxy route", () => {
  it("rejects a signed-out caller before fetching", async () => {
    getClaims.mockResolvedValue({ data: { claims: {} }, error: null });
    const target = basemapTarget(
      "https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/12/1540/1122",
    );

    const response = await GET(
      new Request(`http://localhost/api/basemap?url=${encodeURIComponent(target!.href)}`),
    );

    expect(response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects geocode, http, and credentialed targets", async () => {
    const rejected = [
      "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates",
      "http://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/1/0/0",
      "https://user:pass@ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/1/0/0",
      "https://ibasemaps-api.arcgis.com/sharing/rest/generateToken",
    ];

    for (const url of rejected) {
      const response = await GET(
        new Request(
          `http://localhost/api/basemap?url=${encodeURIComponent(url)}`,
        ),
      );
      expect(response.status).toBe(400);
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rewrites tokenized tile URLs inside JSON and drops the key", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          tiles: [
            "https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=test-key",
          ],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );
    const response = await GET(
      new Request(
        "http://localhost/api/basemap?url=" +
          encodeURIComponent(
            "https://basemaps-api.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer",
          ),
      ),
    );

    const upstream = new URL(String(vi.mocked(fetch).mock.calls[0][0]));
    expect(upstream.searchParams.get("token")).toBe("test-key");
    const body = await response.json();
    expect(JSON.stringify(body)).not.toContain("test-key");
    expect(body.tiles[0]).toContain("/api/basemap?url=");
    expect(response.headers.get("cache-control")).toBe("private, max-age=86400");
  });

  it("returns 502 when a text body still contains the key", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('{"message":"bad token=test-key"}', {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const response = await GET(
      new Request(
        "http://localhost/api/basemap?url=" +
          encodeURIComponent(
            "https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/12/1540/1122",
          ),
      ),
    );

    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("test-key");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("fetches each public tile URL from ArcGIS once", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    vi.mocked(fetch).mockResolvedValue(
      new Response(bytes, {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      }),
    );
    const request = new Request(
      "http://localhost/api/basemap?url=" +
        encodeURIComponent(
          "https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/12/1540/1122",
        ),
    );

    const first = await GET(request);
    const second = await GET(request);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(new Uint8Array(await first.arrayBuffer())).toEqual(bytes);
    expect(new Uint8Array(await second.arrayBuffer())).toEqual(bytes);
  });

  it("drops a cached tile after one day", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const bytes = new Uint8Array([9, 8, 7]);
      vi.mocked(fetch).mockImplementation(
        async () =>
          new Response(bytes, {
            status: 200,
            headers: { "content-type": "image/jpeg" },
          }),
      );
      const request = new Request(
        "http://localhost/api/basemap?url=" +
          encodeURIComponent(
            "https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/12/1540/1123",
          ),
      );

      await GET(request);
      vi.setSystemTime(Date.now() + 86_400_000 + 1);
      await GET(request);

      expect(fetch).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("passes tile bytes through with the key only on the upstream request", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    vi.mocked(fetch).mockResolvedValue(
      new Response(bytes, {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      }),
    );

    const response = await GET(
      new Request(
        "http://localhost/api/basemap?url=" +
          encodeURIComponent(
            "https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/12/1540/1122",
          ),
      ),
    );

    const upstream = new URL(String(vi.mocked(fetch).mock.calls[0][0]));
    expect(upstream.searchParams.get("token")).toBe("test-key");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
    expect(response.headers.get("cache-control")).toBe("private, max-age=86400");
  });

  it("does not follow redirects", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "https://example.com/?token=test-key" },
      }),
    );

    const response = await GET(
      new Request(
        "http://localhost/api/basemap?url=" +
          encodeURIComponent(
            "https://basemaps-api.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer/tile/1/0/0.pbf",
          ),
      ),
    );

    expect(response.status).toBe(502);
    expect(response.headers.get("location")).toBeNull();
  });

  it("returns 500 when the key is missing", async () => {
    delete process.env.ESRI_API_KEY;

    const response = await GET(
      new Request(
        "http://localhost/api/basemap?url=" +
          encodeURIComponent(
            "https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/1/0/0",
          ),
      ),
    );

    expect(response.status).toBe(500);
    expect(fetch).not.toHaveBeenCalled();
  });
});
