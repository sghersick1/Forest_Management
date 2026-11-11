/*
 * TerraDraw modes for polygon draw, select, and render.
 * Open rings use the polygon color. Finished polygons use the muted color.
 */

import {
  TerraDrawPolygonMode,
  TerraDrawRenderMode,
  TerraDrawSelectMode,
  type TerraDrawMouseEvent,
  type SnappableContext,
} from "terra-draw";
import { pointerDistance, type DrawTool } from "./hit";
import { sketchKind } from "../registry";
import { polygonFlags } from "./flags";

export type MapPaint = {
  polygon: `#${string}`;
  muted: `#${string}`;
  handle: `#${string}`;
  vertex: `#${string}`;
  midpointOutline: `#${string}`;
};

const fillOpacity = 0.25;

// TerraDraw mode name for the current tool.
export function drawModeName(tool: DrawTool): "polygon" | "select" | "render" {
  if (sketchKind(tool) === "polygon") return "polygon";
  if (tool === "pointer") return "select";
  return "render";
}

// Polygon color while drawing, muted color once the ring is finished.
export function polygonFillColor(
  drawing: boolean,
  paint: Pick<MapPaint, "polygon" | "muted">,
) {
  return drawing ? paint.polygon : paint.muted;
}

// Selected fill, muted when this polygon is also the hover target.
export function selectedFillColor(
  paint: Pick<MapPaint, "polygon" | "muted">,
  featureId: string | number | undefined,
  hoverId: string | null,
) {
  return hoverId !== null && String(featureId) === hoverId ? paint.muted : paint.polygon;
}

// Polygon, select, and render modes with the current paint and reshape state.
export function createDrawModes(
  paint: MapPaint,
  live: {
    reshaping: () => boolean;
    hoverId: () => string | null;
    toCustom: (event: TerraDrawMouseEvent, context: SnappableContext) => [number, number] | undefined;
  },
) {
  return [
    new TerraDrawPolygonMode({
      pointerDistance,
      snapping: {
        toLine: true,
        toCoordinate: true,
        showSnappingPoint: true,
        toCustom: live.toCustom,
      },
      cursors: { start: "crosshair", close: "pointer" },
      styles: {
        fillColor: (feature) =>
          polygonFillColor(feature.properties.currentlyDrawing === true, paint),
        fillOpacity,
        outlineColor: (feature) =>
          polygonFillColor(feature.properties.currentlyDrawing === true, paint),
        outlineWidth: 2,
        closingPointColor: paint.handle,
        closingPointWidth: 8,
        closingPointOutlineColor: paint.polygon,
        closingPointOutlineWidth: 2,
        snappingPointColor: paint.polygon,
        snappingPointWidth: 8,
        snappingPointOutlineColor: paint.handle,
        snappingPointOutlineWidth: 2,
      },
    }),
    new TerraDrawSelectMode({
      pointerDistance,
      allowManualSelection: false,
      allowManualDeselection: true,
      flags: polygonFlags(false),
      keyEvents: {
        deselect: "Escape",
        delete: "Delete",
        rotate: null,
        scale: null,
      },
      styles: {
        selectedPolygonColor: (feature) =>
          selectedFillColor(paint, feature.id, live.hoverId()),
        selectedPolygonFillOpacity: fillOpacity,
        selectedPolygonOutlineColor: paint.polygon,
        selectedPolygonOutlineWidth: 2,
        selectionPointColor: paint.vertex,
        selectionPointOutlineColor: paint.handle,
        selectionPointOutlineWidth: () => (live.reshaping() ? 2 : 0),
        selectionPointOutlineOpacity: () => (live.reshaping() ? 1 : 0),
        selectionPointWidth: () => (live.reshaping() ? 8 : 0),
        selectionPointOpacity: () => (live.reshaping() ? 1 : 0),
        midPointColor: paint.handle,
        midPointOutlineColor: paint.midpointOutline,
        midPointOutlineWidth: () => (live.reshaping() ? 2 : 0),
        midPointOutlineOpacity: () => (live.reshaping() ? 1 : 0),
        midPointWidth: () => (live.reshaping() ? 6 : 0),
        midPointOpacity: () => (live.reshaping() ? 1 : 0),
      },
    }),
    new TerraDrawRenderMode({
      modeName: "render",
      styles: {
        polygonFillColor: paint.muted,
        polygonFillOpacity: fillOpacity,
        polygonOutlineColor: paint.muted,
        polygonOutlineWidth: 2,
      },
    }),
  ];
}
