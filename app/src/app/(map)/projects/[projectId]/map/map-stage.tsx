"use client";

import { useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { Map } from "@/app/components/map/map";
import { PolygonSketch } from "./polygon/polygon-sketch";

export function MapStage({
  mapX,
  mapY,
  mapZoom,
}: {
  mapX: number;
  mapY: number;
  mapZoom: number;
}) {
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const beforeRemove = useRef<(() => void) | null>(null);

  return (
    <>
      <Map
        interactive
        mapX={mapX}
        mapY={mapY}
        mapZoom={mapZoom}
        onReady={setMap}
        beforeRemove={beforeRemove}
      />
      <PolygonSketch map={map} beforeRemove={beforeRemove} />
    </>
  );
}
