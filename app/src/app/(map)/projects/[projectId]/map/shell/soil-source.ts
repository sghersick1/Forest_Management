import type { Map as MapLibreMap, RequestParameters } from "maplibre-gl";

export const soilSourceId = "ssurgo";
const soilSourceUrl = "/api/soils";

// Registers the Soil Data Access GeoJSON source.
// MapLibre loads a source URL with GET, so this rewrites that request into a POST
// whose body is the current map bounds. No layer uses the source, so nothing is drawn.
// A restored style drops custom sources, so style.load adds this one again.
export function installSoilSource(map: MapLibreMap) {
  let stopped = false;

  const mount = () => {
    if (stopped || !map.style?._loaded) return;
    map.setTransformRequest((url) => soilRequest(url, map));
    if (map.getSource(soilSourceId)) return;
    map.addSource(soilSourceId, { type: "geojson", data: soilSourceUrl });
  };

  map.on("style.load", mount);
  mount();

  return () => {
    stopped = true;
    map.off("style.load", mount);
    if (!map.style?._loaded) return;
    map.setTransformRequest(null);
    if (map.getSource(soilSourceId)) map.removeSource(soilSourceId);
  };
}

function soilRequest(url: string, map: MapLibreMap): RequestParameters {
  let pathname = "";
  try {
    pathname = new URL(url, "http://localhost").pathname;
  } catch {
    return { url };
  }
  if (pathname !== soilSourceUrl) return { url };

  const bounds = map.getBounds();
  return {
    url,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      bounds: {
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
      },
    }),
  };
}
