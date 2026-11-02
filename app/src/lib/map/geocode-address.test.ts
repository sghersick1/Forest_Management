import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { geocodeAddress } from "@/lib/map/geocode-address";

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
    json: async () => body,
  } as Response;
}

function candidate(score: number, x = -91.8, y = 47.9) {
  return {
    location: { x, y },
    score,
    extent: {
      xmin: x - 0.01,
      ymin: y - 0.01,
      xmax: x + 0.01,
      ymax: y + 0.01,
    },
  };
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

describe("geocodeAddress", () => {
  it("throws for an empty address", async () => {
    await expect(geocodeAddress("   ")).rejects.toThrow("Address is required.");
    expect(fetch).not.toHaveBeenCalled();
    expect(getClaims).not.toHaveBeenCalled();
  });

  it("throws when the address is longer than Esri allows", async () => {
    await expect(geocodeAddress("a".repeat(201))).rejects.toThrow(
      "Address must be 200 characters or fewer.",
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns null when the caller is signed out", async () => {
    getClaims.mockResolvedValue({ data: { claims: {} }, error: null });

    await expect(geocodeAddress("1840 County Road 12")).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("throws when the Esri key is missing", async () => {
    delete process.env.ESRI_API_KEY;

    await expect(geocodeAddress("1840 County Road 12")).rejects.toThrow(
      "ESRI_API_KEY is required for geocoding.",
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns the highest-scoring candidate in WGS84", async () => {
    const weaker = candidate(72, -90, 46);
    const best = candidate(98, -91.867, 47.903);
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ candidates: [weaker, best] }),
    );

    await expect(
      geocodeAddress("  1840 County Road 12, Ely, MN  ", "  magic-1  "),
    ).resolves.toEqual({
      x: best.location.x,
      y: best.location.y,
      score: 98,
      extent_xmin: best.extent.xmin,
      extent_ymin: best.extent.ymin,
      extent_xmax: best.extent.xmax,
      extent_ymax: best.extent.ymax,
    });

    const url = new URL(String(vi.mocked(fetch).mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe(
      "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates",
    );
    expect(url.searchParams.get("SingleLine")).toBe(
      "1840 County Road 12, Ely, MN",
    );
    expect(url.searchParams.get("magicKey")).toBe("magic-1");
    expect(url.searchParams.get("f")).toBe("json");
    expect(url.searchParams.get("outSR")).toBe("4326");
    expect(url.searchParams.get("maxLocations")).toBe("1");
    expect(url.searchParams.get("token")).toBe("test-key");
  });

  it("omits magicKey when it is blank", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ candidates: [candidate(100)] }),
    );

    await geocodeAddress("1840 County Road 12", "  ");

    const url = new URL(String(vi.mocked(fetch).mock.calls[0][0]));
    expect(url.searchParams.has("magicKey")).toBe(false);
  });

  it("returns null for no match, a bad response, or a candidate with no extent", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ candidates: [] }));
    await expect(geocodeAddress("1840 County Road 12")).resolves.toBeNull();

    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        error: { code: 400, message: "Unable to complete operation." },
      }),
    );
    await expect(geocodeAddress("1840 County Road 12")).resolves.toBeNull();

    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, false));
    await expect(geocodeAddress("1840 County Road 12")).resolves.toBeNull();

    vi.mocked(fetch).mockRejectedValueOnce(new Error("network"));
    await expect(geocodeAddress("1840 County Road 12")).resolves.toBeNull();

    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        candidates: [{ location: { x: 1, y: 2 }, score: 100 }],
      }),
    );
    await expect(geocodeAddress("1840 County Road 12")).resolves.toBeNull();

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error("bad json");
      },
    } as unknown as Response);
    await expect(geocodeAddress("1840 County Road 12")).resolves.toBeNull();
  });
});
