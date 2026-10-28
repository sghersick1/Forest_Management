"use client";

import { useEffect, useRef } from "react";
import { Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Turbopack rewrites the library chunk URL, so the default worker path 404s.
setWorkerUrl(
  new URL(
    "../../../../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs",
    import.meta.url,
  ).href,
);

export type MapProps = {
  styleUrl: string;
  longitude?: number;
  latitude?: number;
  zoom?: number;
  className?: string;
};

export function Map({
  styleUrl,
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
      style: styleUrl,
      center: [longitude, latitude],
      zoom,
      maplibreLogo: false,
    });

    return () => {
      map.remove();
    };
  }, [styleUrl, longitude, latitude, zoom]);

  return (
    <div
      ref={containerRef}
      className={["h-full w-full", className].filter(Boolean).join(" ")}
      role="region"
      aria-label="Satellite map"
    />
  );
}
