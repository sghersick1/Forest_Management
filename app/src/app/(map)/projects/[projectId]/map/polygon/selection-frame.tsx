import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { TerraDraw } from "terra-draw";
import type { LngLat } from "./sketch-constraints";

type Frame = {
  minX: number;
  minY: number;
  width: number;
  height: number;
  maxX: number;
  maxY: number;
};

type ScaleAxes = "both" | "x" | "y";

type HandleDrag = {
  kind: "scale";
  axes: ScaleAxes;
  start: { x: number; y: number };
  opposite: { x: number; y: number };
  center: { x: number; y: number };
  geometry: GeoJSON.Polygon;
};

type RotateDrag = {
  kind: "rotate";
  startAngle: number;
  center: LngLat;
  geometry: GeoJSON.Polygon;
};

const handleClass =
  "pointer-events-auto absolute size-2.5 rounded-[1px] border border-neutral-500 bg-white p-0";

export function SelectionFrame({
  map,
  draw,
  featureId,
}: {
  map: MapLibreMap;
  draw: TerraDraw;
  featureId: string | number;
}) {
  const [frame, setFrame] = useState<Frame | null>(null);
  const frameRef = useRef<Frame | null>(null);
  const dragRef = useRef<HandleDrag | RotateDrag | null>(null);

  useEffect(() => {
    const update = () => {
      const next = measureFrame(map, draw, featureId);
      frameRef.current = next;
      setFrame(next);
    };
    update();
    map.on("move", update);
    map.on("resize", update);
    draw.on("change", update);
    return () => {
      map.off("move", update);
      map.off("resize", update);
      draw.off("change", update);
    };
  }, [draw, featureId, map]);

  if (!frame) return null;

  const midX = frame.minX + frame.width / 2;
  const midY = frame.minY + frame.height / 2;
  const handles: Array<{
    id: string;
    x: number;
    y: number;
    axes: ScaleAxes;
    opposite: { x: number; y: number };
    cursor: string;
  }> = [
    {
      id: "nw",
      x: frame.minX,
      y: frame.minY,
      axes: "both",
      opposite: { x: frame.maxX, y: frame.maxY },
      cursor: "nwse-resize",
    },
    {
      id: "n",
      x: midX,
      y: frame.minY,
      axes: "y",
      opposite: { x: midX, y: frame.maxY },
      cursor: "ns-resize",
    },
    {
      id: "ne",
      x: frame.maxX,
      y: frame.minY,
      axes: "both",
      opposite: { x: frame.minX, y: frame.maxY },
      cursor: "nesw-resize",
    },
    {
      id: "e",
      x: frame.maxX,
      y: midY,
      axes: "x",
      opposite: { x: frame.minX, y: midY },
      cursor: "ew-resize",
    },
    {
      id: "se",
      x: frame.maxX,
      y: frame.maxY,
      axes: "both",
      opposite: { x: frame.minX, y: frame.minY },
      cursor: "nwse-resize",
    },
    {
      id: "s",
      x: midX,
      y: frame.maxY,
      axes: "y",
      opposite: { x: midX, y: frame.minY },
      cursor: "ns-resize",
    },
    {
      id: "sw",
      x: frame.minX,
      y: frame.maxY,
      axes: "both",
      opposite: { x: frame.maxX, y: frame.minY },
      cursor: "nesw-resize",
    },
    {
      id: "w",
      x: frame.minX,
      y: midY,
      axes: "x",
      opposite: { x: frame.maxX, y: midY },
      cursor: "ew-resize",
    },
  ];

  function polygonGeometry(): GeoJSON.Polygon | null {
    const feature = draw.getSnapshotFeature(featureId);
    if (!feature || feature.geometry.type !== "Polygon") return null;
    return structuredClone(feature.geometry);
  }

  function onScaleDown(
    event: React.PointerEvent<HTMLButtonElement>,
    handle: (typeof handles)[number],
  ) {
    const geometry = polygonGeometry();
    const box = frameRef.current;
    if (!geometry || !box) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = containerPoint(map, event.nativeEvent);
    dragRef.current = {
      kind: "scale",
      axes: handle.axes,
      start: point,
      opposite: handle.opposite,
      center: {
        x: box.minX + box.width / 2,
        y: box.minY + box.height / 2,
      },
      geometry,
    };
  }

  function onRotateDown(event: React.PointerEvent<HTMLButtonElement>) {
    const geometry = polygonGeometry();
    const box = frameRef.current;
    if (!geometry || !box) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const center = {
      x: box.minX + box.width / 2,
      y: box.minY + box.height / 2,
    };
    const point = containerPoint(map, event.nativeEvent);
    dragRef.current = {
      kind: "rotate",
      startAngle: screenAngle(center, point),
      center: unproject(map, center),
      geometry,
    };
  }

  function onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const point = containerPoint(map, event.nativeEvent);
    draw.updateFeatureGeometry(featureId, drag.geometry);
    if (drag.kind === "rotate") {
      const center = map.project(drag.center);
      const angle = screenAngle(center, point) - drag.startAngle;
      draw.transformFeatureGeometry(featureId, {
        projection: "web-mercator",
        origin: drag.center,
        type: "rotate",
        options: { angle },
      });
      return;
    }

    const originPx = event.shiftKey ? drag.center : drag.opposite;
    const origin = unproject(map, originPx);
    const xScale =
      drag.axes === "y" ? 1 : axisScale(point.x, originPx.x, drag.start.x);
    const yScale =
      drag.axes === "x" ? 1 : axisScale(point.y, originPx.y, drag.start.y);
    draw.transformFeatureGeometry(featureId, {
      projection: "web-mercator",
      origin,
      type: "scale",
      options: { xScale, yScale },
    });
  }

  function onPointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    if (!dragRef.current) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div
        className="absolute border border-dashed border-neutral-600"
        style={{
          left: frame.minX,
          top: frame.minY,
          width: frame.width,
          height: frame.height,
        }}
      />
      {handles.map((handle) => (
        <button
          key={handle.id}
          type="button"
          aria-label={`Scale ${handle.id}`}
          className={handleClass}
          style={{
            left: handle.x - 5,
            top: handle.y - 5,
            cursor: handle.cursor,
          }}
          onPointerDown={(event) => onScaleDown(event, handle)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      ))}
      <button
        type="button"
        aria-label="Rotate"
        className="pointer-events-auto absolute size-4 rounded-full border border-neutral-500 bg-white p-0"
        style={{ left: midX - 8, top: frame.minY - 36, cursor: "grab" }}
        onPointerDown={onRotateDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
      <span
        aria-hidden
        className="absolute w-px bg-neutral-600"
        style={{ left: midX, top: frame.minY - 20, height: 20 }}
      />
    </div>
  );
}

function measureFrame(
  map: MapLibreMap,
  draw: TerraDraw,
  featureId: string | number,
): Frame | null {
  const feature = draw.getSnapshotFeature(featureId);
  if (!feature || feature.geometry.type !== "Polygon") return null;
  const ring = feature.geometry.coordinates[0];
  if (!ring || ring.length < 4) return null;
  const pixels = ring.slice(0, -1).map((coord) => map.project([coord[0], coord[1]]));
  const xs = pixels.map((pixel) => pixel.x);
  const ys = pixels.map((pixel) => pixel.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

function containerPoint(map: MapLibreMap, event: PointerEvent) {
  const rect = map.getContainer().getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function unproject(map: MapLibreMap, point: { x: number; y: number }): LngLat {
  const lngLat = map.unproject([point.x, point.y]);
  return [lngLat.lng, lngLat.lat];
}

function screenAngle(
  origin: { x: number; y: number },
  point: { x: number; y: number },
) {
  return (Math.atan2(point.x - origin.x, origin.y - point.y) * 180) / Math.PI;
}

function axisScale(pointer: number, origin: number, start: number) {
  const span = start - origin;
  if (Math.abs(span) < 1) return 1;
  const scale = (pointer - origin) / span;
  if (!Number.isFinite(scale) || Math.abs(scale) < 0.0001) {
    return scale < 0 ? -0.0001 : 0.0001;
  }
  return scale;
}
