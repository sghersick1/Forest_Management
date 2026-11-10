"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { Map } from "@/app/components/map/map";
import { updateMapCamera } from "@/lib/maps/map-actions";
import { PolygonSketch } from "./polygon/polygon-sketch";

const cameraDelayMs = 500;

export function MapStage({
  projectId,
  mapX,
  mapY,
  mapZoom,
}: {
  projectId: number;
  mapX: number;
  mapY: number;
  mapZoom: number;
}) {
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const beforeRemove = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!map) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const onMoveEnd = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const center = map.getCenter();
        void updateMapCamera(projectId, {
          x: center.lng,
          y: center.lat,
          zoom: map.getZoom(),
        }).catch((error: unknown) => {
          console.error(error);
        });
      }, cameraDelayMs);
    };

    map.on("moveend", onMoveEnd);
    return () => {
      if (timer) clearTimeout(timer);
      map.off("moveend", onMoveEnd);
    };
  }, [map, projectId]);

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
