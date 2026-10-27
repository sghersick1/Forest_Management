"use client";

import { useEffect, useRef } from "react";
import {
  Map as MapLibreMap,
  type StyleSpecification,
  setWorkerUrl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const satelliteStyle = {
  version: 8,
  sources: {
    satellite: {
      type: "raster",
      tiles: [
        "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 16,
    },
  },
  layers: [
    {
      id: "satellite",
      type: "raster",
      source: "satellite",
    },
  ],
} satisfies StyleSpecification;

// Turbopack rewrites the library chunk URL, so the default worker path 404s.
setWorkerUrl(
  new URL(
    "../../../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs",
    import.meta.url,
  ).href,
);

export type MapProps = {
  longitude?: number;
  latitude?: number;
  zoom?: number;
  className?: string;
};

export function Map({
  longitude = -98.5,
  latitude = 39.8,
  zoom = 4,
  className,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = new MapLibreMap({
      container,
      style: satelliteStyle,
      center: [longitude, latitude],
      zoom,
      attributionControl: false,
      maplibreLogo: false,
    });

    return () => {
      map.remove();
    };
  }, [longitude, latitude, zoom]);

  return (
    <div
      ref={containerRef}
      className={["h-full w-full", className].filter(Boolean).join(" ")}
      role="region"
      aria-label="Satellite map"
    />
  );
}
