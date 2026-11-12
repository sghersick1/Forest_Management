"use client";

/*
 * The MapLibre map and the sketch session for one project.
 * Camera changes are saved after the map stops moving.
 */

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { Map } from "@/app/components/map/map";
import { updateMapCamera } from "@/lib/maps/map-actions";
import { SketchSession } from "../sketch/sketch-session";

const cameraDelayMs = 500;

// Renders the map and starts the sketch session when the map is ready.
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
    // Saves the camera after the map has been still for a short delay.
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
      <SketchSession map={map} beforeRemove={beforeRemove} />
    </>
  );
}
