"use client";

import { useEffect, useRef } from "react";
import { Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { basemapStyleUrl } from "@/lib/map/basemap-style";

// Turbopack rewrites the library chunk URL, so the default worker path 404s.
setWorkerUrl(
  new URL(
    "../../../../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs",
    import.meta.url,
  ).href,
);

type MapProps = {
  interactive?: boolean;
};

export function Map({ interactive = true }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let map: MapLibreMap | undefined;
    let removed = false;

    /* 1. Wait to load the basemap style
       2. Create the map */
    basemapStyleUrl().then((style) => {
      if (removed) return;

      map = new MapLibreMap({
        container,
        style,
        center: [-98.5, 39.8],
        zoom: 4,
        maplibreLogo: false,
        interactive,
        attributionControl: false,
      });
    });

    return () => {
      removed = true;
      map?.remove();
    };
  }, [interactive]);

  return <div ref={containerRef} className="h-full w-full" />;
}
