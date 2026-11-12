/*
 * Parses polygon rows stored in map_features.
 * Ids are UUIDs and geometry must be a polygon.
 */

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type MapPolygon = {
  type: "Polygon";
  coordinates: number[][][];
};

export type MapFeature = {
  id: string;
  name: string;
  geometry: MapPolygon;
};

// Parses a list of polygon features and rejects duplicate ids.
export function parseMapFeatures(features: unknown): MapFeature[] {
  if (!Array.isArray(features)) {
    throw new Error("Features must be a list.");
  }

  const seen = new Set<string>();
  return features.map((feature) => {
    const parsed = parseMapFeature(feature);
    if (seen.has(parsed.id)) {
      throw new Error("Feature ids must be unique.");
    }
    seen.add(parsed.id);
    return parsed;
  });
}

// A UUID feature id, or an error when the value is not one.
export function parseFeatureId(id: unknown): string {
  if (typeof id !== "string" || !uuidPattern.test(id)) {
    throw new Error("Feature id must be a UUID.");
  }
  return id;
}

// One polygon feature with a UUID id.
function parseMapFeature(feature: unknown): MapFeature {
  if (!feature || typeof feature !== "object") {
    throw new Error("Feature must be an object.");
  }

  const record = feature as { id?: unknown; name?: unknown; geometry?: unknown };
  return {
    id: parseFeatureId(record.id),
    name: parseFeatureName(record.name),
    geometry: parsePolygon(record.geometry),
  };
}

// A display name, or an error when the value is blank.
function parseFeatureName(name: unknown): string {
  if (typeof name !== "string" || name.trim() === "") {
    throw new Error("Feature name must be a non-empty string.");
  }
  return name;
}

// Polygon geometry with finite coordinates and closed rings.
function parsePolygon(geometry: unknown): MapPolygon {
  if (!geometry || typeof geometry !== "object") {
    throw new Error("Feature geometry must be a polygon.");
  }

  const polygon = geometry as { type?: unknown; coordinates?: unknown };
  if (polygon.type !== "Polygon" || !Array.isArray(polygon.coordinates)) {
    throw new Error("Feature geometry must be a polygon.");
  }

  if (polygon.coordinates.length === 0) {
    throw new Error("Feature geometry must be a polygon.");
  }

  const coordinates = polygon.coordinates.map((ring) => {
    if (!Array.isArray(ring) || ring.length < 4) {
      throw new Error("Feature geometry must be a polygon.");
    }

    return ring.map((position) => {
      if (
        !Array.isArray(position) ||
        position.length < 2 ||
        typeof position[0] !== "number" ||
        typeof position[1] !== "number" ||
        !Number.isFinite(position[0]) ||
        !Number.isFinite(position[1])
      ) {
        throw new Error("Feature geometry must be a polygon.");
      }

      return position.map((value) => {
        if (typeof value !== "number" || !Number.isFinite(value)) {
          throw new Error("Feature geometry must be a polygon.");
        }
        return value;
      });
    });
  });

  return { type: "Polygon", coordinates };
}
