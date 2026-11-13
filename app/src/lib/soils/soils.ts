const SOIL_URL = "https://SDMDataAccess.sc.egov.usda.gov/Tabular/post.rest";
const MAX_SPAN_DEGREES = 1;

export class SoilBoundsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SoilBoundsError";
  }
}

export class SoilQueryError extends Error {
  constructor(message = "Soil Data Access query failed.") {
    super(message);
    this.name = "SoilQueryError";
  }
}

export type SoilBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

type SoilRow = {
  mupolygonkey: string;
  mukey: string;
  muname: string | null;
  musym: string | null;
  wkt: string;
};

// Loads map-unit polygons that intersect the bounds and returns GeoJSON features.
export async function soilFeatures(bounds: unknown): Promise<GeoJSON.Feature[]> {
  const box = readBounds(bounds);
  const response = await requestSoils(soilQuery(box));
  return featuresFromTable(await readTable(response));
}

function readBounds(value: unknown): SoilBounds {
  if (!value || typeof value !== "object") {
    throw new SoilBoundsError("bounds is required.");
  }
  const record = value as Record<string, unknown>;
  const west = coordinate(record.west);
  const south = coordinate(record.south);
  const east = coordinate(record.east);
  const north = coordinate(record.north);
  if (west === null || south === null || east === null || north === null) {
    throw new SoilBoundsError("bounds must include west, south, east, and north.");
  }
  if (west < -180 || east > 180 || south < -90 || north > 90) {
    throw new SoilBoundsError("bounds are outside longitude and latitude range.");
  }
  if (west >= east || south >= north) {
    throw new SoilBoundsError("bounds must have west < east and south < north.");
  }
  if (east - west > MAX_SPAN_DEGREES || north - south > MAX_SPAN_DEGREES) {
    throw new SoilBoundsError("bounds must span at most 1 degree.");
  }
  return { west, south, east, north };
}

function coordinate(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function soilQuery(bounds: SoilBounds): string {
  const wkt = boundsWkt(bounds);
  return `
    SELECT mp.mupolygonkey, mu.mukey, mu.muname, mu.musym, mp.mupolygongeo.STAsText() AS wkt
    FROM mupolygon AS mp
    JOIN mapunit AS mu ON mu.mukey = mp.mukey
    WHERE mp.mupolygonkey IN (
      SELECT mupolygonkey
      FROM SDA_Get_Mupolygonkey_from_intersection_with_WktWgs84('${wkt}')
    )
  `;
}

function boundsWkt(bounds: SoilBounds): string {
  const west = bounds.west.toFixed(6);
  const south = bounds.south.toFixed(6);
  const east = bounds.east.toFixed(6);
  const north = bounds.north.toFixed(6);
  return `polygon((${west} ${south}, ${east} ${south}, ${east} ${north}, ${west} ${north}, ${west} ${south}))`;
}

async function requestSoils(query: string): Promise<Response> {
  try {
    return await fetch(SOIL_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ query, format: "JSON+COLUMNNAME" }),
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
  } catch {
    throw new SoilQueryError();
  }
}

async function readTable(response: Response): Promise<unknown[][]> {
  if (!response.ok) throw new SoilQueryError();
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new SoilQueryError();
  }
  if (!body || typeof body !== "object" || !("Table" in body)) {
    throw new SoilQueryError();
  }
  const table = (body as { Table: unknown }).Table;
  if (!Array.isArray(table) || table.some((row) => !Array.isArray(row))) {
    throw new SoilQueryError();
  }
  return table as unknown[][];
}

function featuresFromTable(table: unknown[][]): GeoJSON.Feature[] {
  const [header, ...rows] = table;
  if (!header) return [];
  const columns = header.map((name) => String(name));
  const features: GeoJSON.Feature[] = [];
  for (const row of rows) {
    const record = soilRow(columns, row);
    if (!record) continue;
    const geometry = geometryFromWkt(record.wkt);
    if (!geometry) continue;
    features.push({
      type: "Feature",
      id: record.mupolygonkey,
      properties: {
        mupolygonkey: record.mupolygonkey,
        mukey: record.mukey,
        muname: record.muname,
        musym: record.musym,
      },
      geometry,
    });
  }
  return features;
}

function soilRow(columns: string[], row: unknown[]): SoilRow | null {
  const value = (name: string) => {
    const index = columns.indexOf(name);
    if (index < 0) return undefined;
    return row[index];
  };
  const mupolygonkey = text(value("mupolygonkey"));
  const mukey = text(value("mukey"));
  const wkt = text(value("wkt"));
  if (!mupolygonkey || !mukey || !wkt) return null;
  return {
    mupolygonkey,
    mukey,
    muname: text(value("muname")),
    musym: text(value("musym")),
    wkt,
  };
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function geometryFromWkt(wkt: string): GeoJSON.Polygon | GeoJSON.MultiPolygon | null {
  const kind = wkt.slice(0, wkt.indexOf("(")).trim().toUpperCase();
  const ringDepth = kind === "MULTIPOLYGON" ? 3 : kind === "POLYGON" ? 2 : 0;
  if (ringDepth === 0) return null;
  const polygons = polygonsFromWkt(wkt, ringDepth);
  if (polygons.length === 0) return null;
  if (polygons.length === 1) {
    return { type: "Polygon", coordinates: polygons[0] };
  }
  return { type: "MultiPolygon", coordinates: polygons };
}

function polygonsFromWkt(wkt: string, ringDepth: number): GeoJSON.Position[][][] {
  const polygonDepth = ringDepth - 1;
  const polygons: GeoJSON.Position[][][] = [];
  let polygon: GeoJSON.Position[][] = [];
  let ring: GeoJSON.Position[] = [];
  let pair: number[] = [];
  let token = "";
  let depth = 0;

  const pushToken = () => {
    if (token.length === 0) return;
    const value = Number(token);
    token = "";
    if (!Number.isFinite(value)) return;
    pair.push(value);
    if (pair.length === 2) {
      ring.push(pair);
      pair = [];
    }
  };

  for (const char of wkt) {
    if (char === "(") {
      depth += 1;
      if (depth === ringDepth) ring = [];
      if (depth === polygonDepth) polygon = [];
      continue;
    }
    if (char === ")") {
      pushToken();
      if (depth === ringDepth && ring.length >= 4) polygon.push(ring);
      if (depth === polygonDepth && polygon.length > 0) polygons.push(polygon);
      depth -= 1;
      continue;
    }
    if (char === "," || char === " " || char === "\n" || char === "\t") {
      pushToken();
      continue;
    }
    token += char;
  }
  return polygons;
}
