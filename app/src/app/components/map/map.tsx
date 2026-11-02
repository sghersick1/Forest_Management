"use client";

import { useEffect, useRef } from "react";
import { Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { basemapStyle } from "@/lib/map/basemap-style";

// Turbopack rewrites the library chunk URL, so the default worker path 404s.
setWorkerUrl(
  new URL(
    "../../../../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs",
    import.meta.url,
  ).href,
);

const defaultMapX = -81.3011053204884;
const defaultMapY = 41.61200295314762;
const defaultMapZoom = 15;

type MapProps = {
  interactive?: boolean;
  mapX?: number;
  mapY?: number;
  mapZoom?: number;
};

export function Map({
  interactive = true,
  mapX = defaultMapX,
  mapY = defaultMapY,
  mapZoom = defaultMapZoom,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let map: MapLibreMap | undefined;
    let removed = false;

    /* 1. Wait to load the basemap style
       2. Create the map */
    basemapStyle().then((style) => {
      if (removed || !style) return;

      map = new MapLibreMap({
        container,
        style,
        center: [mapX, mapY],
        zoom: mapZoom,
        maplibreLogo: false,
        interactive,
        attributionControl: false,
      });
    });

    return () => {
      removed = true;
      map?.remove();
    };
  }, [interactive, mapX, mapY, mapZoom]);

  return <div ref={containerRef} className="h-full w-full" />;
}
