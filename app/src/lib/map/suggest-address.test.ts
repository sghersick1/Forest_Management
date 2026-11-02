import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { suggestAddresses } from "@/lib/map/suggest-address";

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

describe("suggestAddresses", () => {
  it("skips the network for fewer than 3 characters", async () => {
    await expect(suggestAddresses("  ab ")).resolves.toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
    expect(getClaims).not.toHaveBeenCalled();
  });

  it("returns an empty list when the caller is signed out", async () => {
    getClaims.mockResolvedValue({ data: { claims: {} }, error: null });

    await expect(suggestAddresses("1840 County")).resolves.toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("throws when the Esri key is missing", async () => {
    delete process.env.ESRI_API_KEY;

    await expect(suggestAddresses("1840 County")).rejects.toThrow(
      "ESRI_API_KEY is required for address suggestions.",
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("asks Esri for address matches and returns the text only", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        suggestions: [
          {
            text: "1840 County Road 12, Ely, MN, 55731, USA",
            magicKey: "secret-key",
            isCollection: false,
          },
          {
            text: "1840 County Highway J, Eagle River, WI, 54521, USA",
            magicKey: "other-key",
            isCollection: false,
          },
        ],
      }),
    );

    await expect(suggestAddresses("  1840 County  ")).resolves.toEqual([
      "1840 County Road 12, Ely, MN, 55731, USA",
      "1840 County Highway J, Eagle River, WI, 54521, USA",
    ]);

    const url = new URL(String(vi.mocked(fetch).mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe(
      "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest",
    );
    expect(url.searchParams.get("text")).toBe("1840 County");
    expect(url.searchParams.get("category")).toBe("Address");
    expect(url.searchParams.get("f")).toBe("json");
    expect(url.searchParams.get("token")).toBe("test-key");
    expect(url.searchParams.has("location")).toBe(false);
    expect(url.searchParams.has("countryCode")).toBe(false);
    expect(url.searchParams.has("maxSuggestions")).toBe(false);
  });

  it("returns an empty list for no matches, an Esri error, or a failed response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ suggestions: [] }));
    await expect(suggestAddresses("1840 County")).resolves.toEqual([]);

    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        error: { code: 400, message: "Unable to complete operation." },
      }),
    );
    await expect(suggestAddresses("1840 County")).resolves.toEqual([]);

    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, false));
    await expect(suggestAddresses("1840 County")).resolves.toEqual([]);

    vi.mocked(fetch).mockRejectedValueOnce(new Error("network"));
    await expect(suggestAddresses("1840 County")).resolves.toEqual([]);
  });
});
