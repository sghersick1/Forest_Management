/*
 * Tests the Soil Data Access query and the GeoJSON features it returns.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { SoilBoundsError, soilFeatures } from "./soils";

const bounds = { west: -81.302, south: 41.611, east: -81.3, north: 41.613 };
const polygon = "POLYGON ((-81.31 41.6, -81.29 41.6, -81.29 41.62, -81.31 41.6))";
const polygonWithHole =
  "POLYGON ((-81.31 41.6, -81.29 41.6, -81.29 41.62, -81.31 41.6), (-81.305 41.605, -81.295 41.605, -81.295 41.615, -81.305 41.605))";
const multi =
  "MULTIPOLYGON (((-81.31 41.6, -81.29 41.6, -81.29 41.62, -81.31 41.6)), ((-81.28 41.6, -81.27 41.6, -81.27 41.62, -81.28 41.6)))";

function table(rows: unknown[][]) {
  return {
    ok: true,
    json: async () => ({
      Table: [["mupolygonkey", "mukey", "muname", "musym", "wkt"], ...rows],
    }),
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("soil features", () => {
  it("queries polygons that intersect the bounds", async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => table([]));
    vi.stubGlobal("fetch", fetchMock);

    await expect(soilFeatures(bounds)).resolves.toEqual([]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://SDMDataAccess.sc.egov.usda.gov/Tabular/post.rest");
    expect(init.method).toBe("POST");
    const body = JSON.parse(String(init.body)) as { query: string; format: string };
    expect(body.format).toBe("JSON+COLUMNNAME");
    expect(body.query).toContain(
      "SDA_Get_Mupolygonkey_from_intersection_with_WktWgs84('polygon((-81.302000 41.611000, -81.300000 41.611000, -81.300000 41.613000, -81.302000 41.613000, -81.302000 41.611000))')",
    );
  });

  it("returns a polygon feature with map-unit properties", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        table([["366043339", "286839", "Platea silt loam, 2 to 6 percent slopes", "PsB", polygon]]),
      ),
    );

    const features = await soilFeatures(bounds);
    expect(features).toEqual([
      {
        type: "Feature",
        id: "366043339",
        properties: {
          mupolygonkey: "366043339",
          mukey: "286839",
          muname: "Platea silt loam, 2 to 6 percent slopes",
          musym: "PsB",
        },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-81.31, 41.6],
              [-81.29, 41.6],
              [-81.29, 41.62],
              [-81.31, 41.6],
            ],
          ],
        },
      },
    ]);
  });

  it("keeps holes and splits multipolygons", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        table([
          ["1", "10", "Holed", "H", polygonWithHole],
          ["2", "11", "Multi", "M", multi],
        ]),
      ),
    );

    const features = await soilFeatures(bounds);
    expect(features[0].geometry).toEqual({
      type: "Polygon",
      coordinates: [
        [
          [-81.31, 41.6],
          [-81.29, 41.6],
          [-81.29, 41.62],
          [-81.31, 41.6],
        ],
        [
          [-81.305, 41.605],
          [-81.295, 41.605],
          [-81.295, 41.615],
          [-81.305, 41.605],
        ],
      ],
    });
    expect(features[1].geometry.type).toBe("MultiPolygon");
    expect(features[1].geometry.type === "MultiPolygon" && features[1].geometry.coordinates).toHaveLength(2);
  });

  it("rejects bounds that are missing, reversed, or too large", async () => {
    await expect(soilFeatures(undefined)).rejects.toBeInstanceOf(SoilBoundsError);
    await expect(
      soilFeatures({ west: -81, south: 42, east: -82, north: 43 }),
    ).rejects.toThrow("west < east");
    await expect(
      soilFeatures({ west: -83, south: 41, east: -81, north: 42 }),
    ).rejects.toThrow("at most 1 degree");
  });
});
