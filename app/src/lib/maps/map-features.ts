const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type MapPolygon = {
  type: "Polygon";
  coordinates: number[][][];
};

export type MapFeature = {
  id: string;
  geometry: MapPolygon;
};

export type FeatureDiff = {
  inserts: MapFeature[];
  updates: MapFeature[];
  deletes: string[];
};

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

export function diffMapFeatures(
  current: MapFeature[],
  next: MapFeature[],
): FeatureDiff {
  const currentById = new Map(current.map((feature) => [feature.id, feature]));
  const nextIds = new Set(next.map((feature) => feature.id));

  return {
    inserts: next.filter((feature) => !currentById.has(feature.id)),
    updates: next.filter((feature) => {
      const previous = currentById.get(feature.id);
      return (
        previous !== undefined &&
        JSON.stringify(previous.geometry) !== JSON.stringify(feature.geometry)
      );
    }),
    deletes: current
      .filter((feature) => !nextIds.has(feature.id))
      .map((feature) => feature.id),
  };
}

function parseMapFeature(feature: unknown): MapFeature {
  if (!feature || typeof feature !== "object") {
    throw new Error("Feature must be an object.");
  }

  const record = feature as { id?: unknown; geometry?: unknown };
  if (typeof record.id !== "string" || !uuidPattern.test(record.id)) {
    throw new Error("Feature id must be a UUID.");
  }

  return { id: record.id, geometry: parsePolygon(record.geometry) };
}

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
