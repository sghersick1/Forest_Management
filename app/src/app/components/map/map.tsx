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

const defaultMapX = -81.3011053204884;
const defaultMapY = 41.61200295314762;
const defaultMapZoom = 15;
const styleUrl = "/api/basemap/style?v=2";

type MapProps = {
  interactive?: boolean;
  mapX?: number;
  mapY?: number;
  mapZoom?: number;
  onReady?: (map: MapLibreMap | null) => void;
  beforeRemove?: { current: (() => void) | null };
};

export function Map({
  interactive = true,
  mapX = defaultMapX,
  mapY = defaultMapY,
  mapZoom = defaultMapZoom,
  onReady,
  beforeRemove,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  const beforeRemoveRef = useRef(beforeRemove);
  beforeRemoveRef.current = beforeRemove;

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = new MapLibreMap({
      container,
      style: styleUrl,
      center: [mapX, mapY],
      zoom: mapZoom,
      maplibreLogo: false,
      interactive,
      attributionControl: false,
    });
    onReadyRef.current?.(map);

    return () => {
      beforeRemoveRef.current?.current?.();
      onReadyRef.current?.(null);
      map.remove();
    };
  }, [interactive, mapX, mapY, mapZoom]);

  return <div ref={containerRef} className="h-full w-full" />;
}
