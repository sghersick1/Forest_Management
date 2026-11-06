"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Map as MapLibreMap } from "maplibre-gl";
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawRenderMode,
  TerraDrawSelectMode,
  type SnappableContext,
  type TerraDraw as TerraDrawInstance,
  type TerraDrawMouseEvent,
} from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import { useMap, type MapTool } from "../map-context";
import { SelectionFrame } from "./selection-frame";
import {
  bearingDegrees,
  canClosePolygon,
  ringAcres,
  segmentFeet,
  snapRightAngle,
  type LngLat,
  type ScreenPoint,
} from "./sketch-constraints";
import { SketchTooltip, type SketchTooltipLabel } from "./sketch-tooltip";

const fill = "#007ac2";
const fillOpacity = 0.25;
const pointerDistance = 15;

const suspendedSnapping = {
  toLine: false,
  toCoordinate: false,
  showSnappingPoint: false,
};

type Selection = {
  id: string | number;
  reshape: boolean;
};

export function PolygonSketch({ map }: { map: MapLibreMap | null }) {
  const { tool } = useMap();
  const toolRef = useRef<MapTool>(tool);
  const [draw, setDraw] = useState<TerraDrawInstance | null>(null);
  const reshapeRef = useRef(false);
  const armRef = useRef(false);
  const suppressRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [label, setLabel] = useState<SketchTooltipLabel | null>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  useEffect(() => {
    if (!map) return;
    let started = false;
    const reshape = reshapeRef;
    const holder: { draw: TerraDrawInstance | null } = { draw: null };
    const enabledSnapping = {
      toLine: true,
      toCoordinate: true,
      showSnappingPoint: true,
      toCustom: (event: TerraDrawMouseEvent, context: SnappableContext) =>
        rightAngleCoordinate(holder.draw, event, context),
    };
    const draw = new TerraDraw({
      adapter: new TerraDrawMapLibreGLAdapter({ map }),
      modes: [
        new TerraDrawPolygonMode({
          pointerDistance,
          snapping: enabledSnapping,
          cursors: { start: "crosshair", close: "pointer" },
          styles: {
            fillColor: fill,
            fillOpacity,
            outlineColor: fill,
            outlineWidth: 2,
            closingPointColor: "#ffffff",
            closingPointWidth: 8,
            closingPointOutlineColor: fill,
            closingPointOutlineWidth: 2,
            snappingPointColor: fill,
            snappingPointWidth: 8,
            snappingPointOutlineColor: "#ffffff",
            snappingPointOutlineWidth: 2,
          },
        }),
        new TerraDrawSelectMode({
          pointerDistance,
          allowManualSelection: true,
          allowManualDeselection: true,
          flags: polygonFlags(false),
          keyEvents: {
            deselect: "Escape",
            delete: "Delete",
            rotate: null,
            scale: null,
          },
          styles: {
            selectedPolygonColor: fill,
            selectedPolygonFillOpacity: fillOpacity,
            selectedPolygonOutlineColor: fill,
            selectedPolygonOutlineWidth: 2,
            selectionPointColor: "#f89927",
            selectionPointOutlineColor: "#ffffff",
            selectionPointOutlineWidth: 2,
            selectionPointWidth: () => (reshape.current ? 8 : 0),
            selectionPointOpacity: () => (reshape.current ? 1 : 0),
            midPointColor: "#ffffff",
            midPointOutlineColor: "#9a9a9a",
            midPointWidth: () => (reshape.current ? 6 : 0),
            midPointOpacity: () => (reshape.current ? 1 : 0),
          },
        }),
        new TerraDrawRenderMode({
          modeName: "render",
          styles: {
            polygonFillColor: fill,
            polygonFillOpacity: fillOpacity,
            polygonOutlineColor: fill,
            polygonOutlineWidth: 2,
          },
        }),
      ],
    });
    holder.draw = draw;

    const canvas = map.getCanvas();
    const host = map.getContainer();
    let pointerStart = { x: 0, y: 0 };
    let pointerMoved = false;

    const onSelect = (id: string | number) => {
      if (suppressRef.current) return;
      reshape.current = false;
      armRef.current = true;
      setSelection({ id, reshape: false });
    };
    const onDeselect = () => {
      if (suppressRef.current) return;
      reshape.current = false;
      armRef.current = false;
      draw.updateModeOptions<typeof TerraDrawSelectMode>("select", {
        flags: polygonFlags(false),
      });
      setSelection(null);
    };

    const boot = () => {
      if (started) return;
      draw.start();
      started = true;
      setDraw(draw);
      applyTool(draw, map, toolRef.current);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerUp);
      setContainer(host);
      setReady(true);
    };

    draw.on("select", onSelect);
    draw.on("deselect", onDeselect);

    const onPointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      const point = containerPoint(host, event);
      pointerStart = point;
      pointerMoved = false;
    };
    const onPointerMove = (event: PointerEvent) => {
      const point = containerPoint(host, event);
      if (Math.hypot(point.x - pointerStart.x, point.y - pointerStart.y) > 5) {
        pointerMoved = true;
      }
      setLabel(readLabel(draw, map, point, event.buttons === 1, reshape.current));
    };
    const onPointerLeave = () => setLabel(null);
    const onPointerUp = (event: PointerEvent) => {
      if (toolRef.current === "polygon") {
        map.dragPan.disable();
        map.doubleClickZoom.disable();
      }
      if (!event.isPrimary || event.button !== 0) return;
      if (toolRef.current !== "pointer" || pointerMoved) return;
      if (armRef.current) {
        armRef.current = false;
        return;
      }
      const selected = selectionId(draw);
      if (!selected || reshape.current) return;
      const point = containerPoint(host, event);
      const lngLat = map.unproject([point.x, point.y]);
      if (!hitsFeature(draw, map, selected, point, [lngLat.lng, lngLat.lat])) return;
      enterReshape(draw, selected, reshapeRef, suppressRef, setSelection);
    };
    const onDoubleClick = (event: MouseEvent) => {
      if (toolRef.current !== "polygon") return;
      event.preventDefault();
      event.stopPropagation();
      const committed = committedVertices(draw);
      if (!canClosePolygon(committed)) return;
      dispatchKey(canvas, "Enter");
    };
    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (!started || toolRef.current !== "pointer" || !reshape.current) return;
      const selected = selectionId(draw);
      if (selected === null) return;
      const point = containerPoint(host, event);
      deleteVertex(draw, map, selected, point);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!started || isTypingTarget(event.target)) return;
      if (event.key === "Control" && !event.repeat) {
        draw.updateModeOptions<typeof TerraDrawPolygonMode>("polygon", {
          snapping: suspendedSnapping,
        });
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (!started || isTypingTarget(event.target)) return;
      if (event.key === "Control") {
        draw.updateModeOptions<typeof TerraDrawPolygonMode>("polygon", {
          snapping: enabledSnapping,
        });
        return;
      }
      if (event.key === "Escape") {
        dispatchKey(canvas, "Escape");
        return;
      }
      if (event.key === "Delete" && toolRef.current === "pointer") {
        event.preventDefault();
        dispatchKey(canvas, "Delete");
        return;
      }
      if (event.key === "Enter" && toolRef.current === "polygon") {
        if (!canClosePolygon(committedVertices(draw))) return;
        event.preventDefault();
        dispatchKey(canvas, "Enter");
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    host.addEventListener("pointerleave", onPointerLeave);
    host.addEventListener("dblclick", onDoubleClick, true);
    canvas.addEventListener("contextmenu", onContextMenu, true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    if (map.isStyleLoaded()) boot();
    else map.once("load", boot);

    return () => {
      map.off("load", boot);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      host.removeEventListener("pointerleave", onPointerLeave);
      host.removeEventListener("dblclick", onDoubleClick, true);
      canvas.removeEventListener("contextmenu", onContextMenu, true);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      draw.off("select", onSelect);
      draw.off("deselect", onDeselect);
      if (started) draw.stop();
      setDraw(null);
      setReady(false);
      setContainer(null);
      setSelection(null);
      setLabel(null);
    };
  }, [map]);

  useEffect(() => {
    if (!map || !ready || !draw) return;
    applyTool(draw, map, tool);
  }, [draw, map, ready, tool]);

  if (!map || !container || !ready || !draw) return null;

  return createPortal(
    <>
      {tool === "pointer" && selection && !selection.reshape ? (
        <SelectionFrame map={map} draw={draw} featureId={selection.id} />
      ) : null}
      <SketchTooltip label={label} />
    </>,
    container,
  );
}

function enterReshape(
  draw: TerraDrawInstance,
  id: string | number,
  reshapeRef: { current: boolean },
  suppressRef: { current: boolean },
  setSelection: (selection: Selection) => void,
) {
  reshapeRef.current = true;
  suppressRef.current = true;
  draw.updateModeOptions<typeof TerraDrawSelectMode>("select", {
    flags: polygonFlags(true),
  });
  draw.deselectFeature(id);
  draw.selectFeature(id);
  suppressRef.current = false;
  setSelection({ id, reshape: true });
}

function rightAngleCoordinate(
  draw: TerraDrawInstance | null,
  event: TerraDrawMouseEvent,
  context: SnappableContext,
): [number, number] | undefined {
  const coordinate = context.currentCoordinate;
  if (coordinate === undefined || coordinate < 2) return undefined;
  const geometry = context.getCurrentGeometrySnapshot();
  if (!geometry || geometry.type !== "Polygon") return undefined;
  const ring = geometry.coordinates[0];
  const previous = ring?.[coordinate - 2];
  const origin = ring?.[coordinate - 1];
  const first = ring?.[0];
  if (!previous || !origin || !first) return undefined;

  const cursor = context.project(event.lng, event.lat);
  const firstPoint = context.project(first[0], first[1]);
  if (Math.hypot(cursor.x - firstPoint.x, cursor.y - firstPoint.y) <= pointerDistance) {
    return undefined;
  }
  if (draw && cursorNearSketch(draw, context, cursor)) return undefined;

  const snapped = snapRightAngle(
    context.project(previous[0], previous[1]),
    context.project(origin[0], origin[1]),
    cursor,
  );
  if (!snapped) return undefined;
  const lngLat = context.unproject(snapped.x, snapped.y);
  return [lngLat.lng, lngLat.lat];
}

function cursorNearSketch(
  draw: TerraDrawInstance,
  context: SnappableContext,
  cursor: ScreenPoint,
): boolean {
  for (const feature of draw.getSnapshot()) {
    if (feature.id === context.currentId || feature.geometry.type !== "Polygon") continue;
    const ring = feature.geometry.coordinates[0];
    if (!ring || ring.length < 2) continue;
    const points = ring
      .slice(0, -1)
      .map((coordinate) => context.project(coordinate[0], coordinate[1]));
    for (const point of points) {
      if (Math.hypot(point.x - cursor.x, point.y - cursor.y) <= pointerDistance) return true;
    }
    for (let index = 0; index < points.length; index += 1) {
      const start = points[index];
      const end = points[(index + 1) % points.length];
      if (distanceToSegment(cursor, start, end) <= pointerDistance) return true;
    }
  }
  return false;
}

function distanceToSegment(point: ScreenPoint, start: ScreenPoint, end: ScreenPoint): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared),
  );
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

function polygonFlags(reshape: boolean) {
  return {
    polygon: {
      feature: {
        draggable: true,
        selfIntersectable: true,
        coordinates: {
          midpoints: reshape ? { draggable: true } : false,
          draggable: reshape,
          deletable: true,
          snappable: {
            toCoordinate: true,
            toLine: true,
          },
        },
      },
    },
  };
}

function applyTool(draw: TerraDrawInstance, map: MapLibreMap, tool: MapTool) {
  const mode = tool === "polygon" ? "polygon" : tool === "pointer" ? "select" : "render";
  if (draw.getMode() !== mode) draw.setMode(mode);
  if (tool === "polygon") {
    map.doubleClickZoom.disable();
    map.dragPan.disable();
  } else {
    map.doubleClickZoom.enable();
    map.dragPan.enable();
  }
}

function dispatchKey(canvas: HTMLCanvasElement, key: string) {
  canvas.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: false }));
}

function containerPoint(container: HTMLElement, event: MouseEvent) {
  const rect = container.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

function drawingFeature(draw: TerraDrawInstance) {
  return draw.getSnapshot().find((feature) => {
    return (
      feature.geometry.type === "Polygon" && feature.properties.currentlyDrawing === true
    );
  });
}

function committedVertices(draw: TerraDrawInstance) {
  const feature = drawingFeature(draw);
  const count = feature?.properties.committedCoordinateCount;
  return typeof count === "number" ? count : 0;
}

function selectionId(draw: TerraDrawInstance) {
  const selected = draw
    .getSnapshot()
    .find((feature) => feature.properties.selected === true && feature.geometry.type === "Polygon");
  return selected?.id ?? null;
}

function hitsFeature(
  draw: TerraDrawInstance,
  map: MapLibreMap,
  id: string | number,
  point: { x: number; y: number },
  lngLat: LngLat,
) {
  const hits = draw.getFeaturesAtLngLat(
    { lng: lngLat[0], lat: lngLat[1] },
    { ignoreSelectFeatures: true },
  );
  if (hits.some((feature) => feature.id === id)) return true;
  const feature = draw.getSnapshotFeature(id);
  if (!feature || feature.geometry.type !== "Polygon") return false;
  return feature.geometry.coordinates[0].some((coord) => {
    const pixel = map.project([coord[0], coord[1]]);
    return Math.hypot(pixel.x - point.x, pixel.y - point.y) <= pointerDistance;
  });
}

function readLabel(
  draw: TerraDrawInstance,
  map: MapLibreMap,
  point: { x: number; y: number },
  primaryDown: boolean,
  reshape: boolean,
): SketchTooltipLabel | null {
  const drawing = drawingFeature(draw);
  if (drawing && drawing.geometry.type === "Polygon") {
    const measurement = measureDrawing(drawing.geometry.coordinates[0], committedVertices(draw));
    return measurement ? { ...measurement, ...point } : null;
  }
  if (!reshape || !primaryDown) return null;
  const selected = selectionId(draw);
  if (selected === null) return null;
  const feature = draw.getSnapshotFeature(selected);
  if (!feature || feature.geometry.type !== "Polygon") return null;
  const measurement = measureReshape(map, feature.geometry.coordinates[0], point);
  return measurement ? { ...measurement, ...point } : null;
}

function measureDrawing(ring: GeoJSON.Position[], committed: number) {
  if (committed < 1 || ring.length < 4) return null;
  const from = pair(ring[committed - 1]);
  const to = pair(ring[ring.length - 2]);
  if (!from || !to) return null;
  const preview = ring.slice(0, committed).map(pair).filter((coord) => coord !== null);
  preview.push(to);
  return {
    feet: segmentFeet(from, to),
    acres: ringAcres(preview),
    direction: from[0] === to[0] && from[1] === to[1] ? 0 : bearingDegrees(from, to),
  };
}

function measureReshape(
  map: MapLibreMap,
  ring: GeoJSON.Position[],
  point: { x: number; y: number },
) {
  const unique = ring.slice(0, -1).map(pair).filter((coord) => coord !== null);
  if (unique.length < 3) return null;
  let nearest = 0;
  let best = Number.POSITIVE_INFINITY;
  unique.forEach((coord, index) => {
    const pixel = map.project(coord);
    const distance = Math.hypot(pixel.x - point.x, pixel.y - point.y);
    if (distance < best) {
      best = distance;
      nearest = index;
    }
  });
  if (best > 24) return null;
  const current = unique[nearest];
  const previous = unique[(nearest - 1 + unique.length) % unique.length];
  return {
    feet: segmentFeet(previous, current),
    acres: ringAcres(unique),
    direction:
      previous[0] === current[0] && previous[1] === current[1]
        ? 0
        : bearingDegrees(previous, current),
  };
}

function pair(coord: GeoJSON.Position | null): LngLat | null {
  if (!coord || coord.length < 2) return null;
  return [coord[0], coord[1]];
}

function deleteVertex(
  draw: TerraDrawInstance,
  map: MapLibreMap,
  id: string | number,
  point: { x: number; y: number },
) {
  const feature = draw.getSnapshotFeature(id);
  if (!feature || feature.geometry.type !== "Polygon") return;
  const ring = feature.geometry.coordinates[0].map(pair).filter((coord) => coord !== null);
  const unique = ring.slice(0, -1);
  if (unique.length <= 3) return;
  let nearest = -1;
  let best = Number.POSITIVE_INFINITY;
  unique.forEach((coord, index) => {
    const pixel = map.project(coord);
    const distance = Math.hypot(pixel.x - point.x, pixel.y - point.y);
    if (distance < best) {
      best = distance;
      nearest = index;
    }
  });
  if (nearest < 0 || best > pointerDistance) return;
  const next = unique.filter((_, index) => index !== nearest);
  next.push(next[0]);
  draw.updateFeatureGeometry(id, { type: "Polygon", coordinates: [next] });
}
