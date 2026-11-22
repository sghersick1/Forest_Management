"use client";

/*
 * One TerraDraw session on the map.
 * Pointer and key events run commands. Finished create, edit, and delete each write one feature.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
  type SnappableContext,
  type GeoJSONStoreFeatures,
  type TerraDraw as TerraDrawInstance,
  type TerraDrawMouseEvent,
} from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import { useMap, type MapTool } from "../state/map-context";
import type { LngLat, ScreenPoint } from "./kinds/polygon/constraints";
import {
  createdFeature,
  otherPolygonRings,
  rightAngleCoordinate,
  roundStoredPolygon,
  suspendedSnapping,
  type SketchFeature,
} from "./kinds/polygon/create";
import { beginReshape, ringWithoutVertex, vertexAtPointer } from "./kinds/polygon/edit";
import {
  clickSlop,
  pointerDistance,
  selectedSnapshotId,
  selectionFromHits,
  selectionFromVertices,
  topFinishedPolygonId,
  topVertexPolygonId,
} from "./kinds/polygon/hit";
import { polygonFlags } from "./kinds/polygon/flags";
import {
  createDrawModes,
  drawModeName,
  type MapPaint,
} from "./kinds/polygon/mode";
import { SketchTooltip, sketchLabel } from "./kinds/polygon/tooltip";
import { commitCommand } from "./commands/commit";
import { deleteCommand, storedIdsToDelete } from "./commands/delete";
import { deselectCommand } from "./commands/deselect";
import { hoverCommand } from "./commands/hover";
import { selectCommand } from "./commands/select";
import { isTypingTarget, keyGesture } from "./events/keyboard";
import { pointerGesture } from "./events/pointer";
import {
  hatchColor,
  hatchLineWidth,
  hatchOpacity,
  lineWidth,
  selectedHatchLayerId,
  selectedLineLayerId,
  selectionDraw,
  selectionHatchData,
  selectionLineData,
} from "./sync-selection";
import { hoverLineCollection, hoverLineLayerId } from "./sync-hover";
import {
  actionLinkCollections,
  actionLinkFillLayerId,
  actionLinkFillOpacity,
  actionLinkLineLayerId,
  emptyActionLinks,
} from "./sync-action-links";

// UUID ids for features TerraDraw creates.
const featureIds = {
  getId: () => crypto.randomUUID(),
  isValidId: (id: string | number) => typeof id === "string" && id.length === 36,
};

// Mounts TerraDraw, paints the hover line, selection outline, and selection hatch.
export function SketchSession({
  map,
  beforeRemove,
}: {
  map: MapLibreMap | null;
  beforeRemove?: { current: (() => void) | null };
}) {
  const {
    tool,
    features,
    insertFeature,
    updateFeature,
    deleteFeature,
    selectedFeature,
    setSelectedFeature,
    hoverFeature,
    setHoverFeature,
    linking,
    highlightedFeatureIds,
    toggleLinkedFeature,
    setContextMenu,
  } = useMap();
  const toolRef = useRef<MapTool>(tool);
  const insertRef = useRef(insertFeature);
  const updateRef = useRef(updateFeature);
  const deleteRef = useRef(deleteFeature);
  const setSelectedRef = useRef(setSelectedFeature);
  const setHoverRef = useRef(setHoverFeature);
  const hoverRef = useRef<string | null>(null);
  const selectedRef = useRef(selectedFeature);
  const linkingRef = useRef(linking);
  const linkedRef = useRef(highlightedFeatureIds);
  const contextMenuRef = useRef(setContextMenu);
  useEffect(() => { contextMenuRef.current = setContextMenu; }, [setContextMenu]);
  const toggleLinkedRef = useRef(toggleLinkedFeature);
  const featuresRef = useRef(features);
  featuresRef.current = features;
  const storedIdsRef = useRef<string[]>([]);
  const [draw, setDraw] = useState<TerraDrawInstance | null>(null);
  const reshapeRef = useRef(false);
  const suppressRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [label, setLabel] = useState<ReturnType<typeof sketchLabel>>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  useEffect(() => {
    insertRef.current = insertFeature;
  }, [insertFeature]);

  useEffect(() => {
    updateRef.current = updateFeature;
  }, [updateFeature]);

  useEffect(() => {
    deleteRef.current = deleteFeature;
  }, [deleteFeature]);

  useEffect(() => {
    setSelectedRef.current = setSelectedFeature;
  }, [setSelectedFeature]);

  useEffect(() => {
    setHoverRef.current = setHoverFeature;
  }, [setHoverFeature]);

  useEffect(() => {
    hoverRef.current = hoverFeature;
  }, [hoverFeature]);

  useEffect(() => {
    selectedRef.current = selectedFeature;
  }, [selectedFeature]);

  useEffect(() => {
    linkingRef.current = linking;
  }, [linking]);

  useEffect(() => {
    linkedRef.current = highlightedFeatureIds;
  }, [highlightedFeatureIds]);

  useEffect(() => {
    toggleLinkedRef.current = toggleLinkedFeature;
  }, [toggleLinkedFeature]);

  useEffect(() => {
    if (!map) return;
    const paint = mapPaint();
    let started = false;
    const reshape = reshapeRef;
    const holder: { draw: TerraDrawInstance | null } = { draw: null };
    const enabledSnapping = {
      toLine: true,
      toCoordinate: true,
      showSnappingPoint: true,
      toCustom: (event: TerraDrawMouseEvent, context: SnappableContext) =>
        snapCoordinate(holder.draw, event, context),
    };
    const draw = new TerraDraw({
      adapter: new TerraDrawMapLibreGLAdapter({ map }),
      idStrategy: featureIds,
      modes: createDrawModes(paint, {
        reshaping: () => reshape.current,
        toCustom: enabledSnapping.toCustom,
      }),
    });
    holder.draw = draw;

    const canvas = map.getCanvas();
    const host = map.getContainer();

    // Stores the TerraDraw selection and leaves reshape.
    const onSelect = (id: string | number) => {
      if (suppressRef.current) return;
      reshape.current = false;
      setSelectedRef.current(String(id));
    };
    // Clears the selection and saves a reshape when its geometry changed.
    const onDeselect = (id?: string | number) => {
      if (suppressRef.current) return;
      const wasReshape = reshape.current;
      const selectedId = id ?? selectedRef.current;
      reshape.current = false;
      draw.updateModeOptions<typeof TerraDrawSelectMode>("select", {
        flags: polygonFlags(false),
      });
      if (wasReshape && selectedId !== null) {
        const feature = draw.getSnapshotFeature(selectedId);
        const stored = storedFeature(featuresRef.current, selectedId);
        const result = deselectCommand({
          reshaping: true,
          selected: asSketch(feature ?? undefined),
          stored,
        });
        if (result.write?.type === "update" && feature) updateRef.current(feature);
      }
      setSelectedRef.current(null);
    };

    // Starts TerraDraw after the map style is loaded.
    const boot = () => {
      if (started) return;
      draw.start();
      started = true;
      if (featuresRef.current.length > 0) {
        const loaded = draw.addFeatures(featuresRef.current.map((feature) => roundStoredPolygon(feature)));
        for (const item of loaded) {
          if (!item.valid) console.error("Skipped loading a polygon.", item.reason);
        }
      }
      setDraw(draw);
      applyTool(draw, map, toolRef.current);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerUp);
      setContainer(host);
      setReady(true);
    };

    // Inserts the polygon that just finished.
    const onFinish = (id?: string | number) => {
      const named = id !== undefined ? draw.getSnapshotFeature(id) : undefined;
      const feature = createdFeature(asSketch(named ?? undefined))
        ? named
        : draw.getSnapshot().find((item) => {
            return (
              item.geometry.type === "Polygon" &&
              item.properties.currentlyDrawing !== true &&
              !featuresRef.current.some((stored) => stored.id === item.id)
            );
          });
      if (feature && createdFeature(asSketch(feature))) insertRef.current(feature);
    };
    // Deletes stored polygons that TerraDraw removed.
    const onChange = (ids: (string | number)[], type: string) => {
      const removed = storedIdsToDelete(
        type,
        ids,
        featuresRef.current.map((feature) => String(feature.id)),
      );
      for (const removedId of removed) deleteRef.current(removedId);
    };

    draw.on("select", onSelect);
    draw.on("deselect", onDeselect);
    draw.on("finish", onFinish);
    draw.on("change", onChange);

    // Updates the tooltip and the polygon under the pointer.
    const onPointerMove = (event: PointerEvent) => {
      const point = containerPoint(host, event);
      setLabel(readLabel(draw, map, point, event.buttons === 1, reshape.current));
      if (!started || pointerGesture({
        kind: "move",
        tool: toolRef.current,
        reshaping: reshape.current,
        started,
      }) !== "hover") {
        return;
      }
      const lngLat = map.unproject([point.x, point.y]);
      const hit = hoverTarget(draw, map, point, [lngLat.lng, lngLat.lat]);
      const next = hoverCommand(hit === null ? null : String(hit), selectedRef.current);
      if (next === hoverRef.current) return;
      hoverRef.current = next;
      setHoverRef.current(next);
    };
    // Clears the tooltip and the hover when the pointer leaves the map.
    const onPointerLeave = () => {
      setLabel(null);
      if (pointerGesture({
        kind: "leave",
        tool: toolRef.current,
        reshaping: reshape.current,
        started,
      }) !== "clear-hover") {
        return;
      }
      if (hoverRef.current === null) return;
      hoverRef.current = null;
      setHoverRef.current(null);
    };
    // Keeps map pan off while a polygon is being drawn.
    const onPointerUp = () => {
      if (toolRef.current !== "polygon") return;
      map.dragPan.disable();
      map.doubleClickZoom.disable();
    };
    // Closes an open ring or starts reshape on the polygon under the pointer.
    const onDoubleClick = (event: MouseEvent) => {
      if (linkingRef.current) return;
      const gesture = pointerGesture({
        kind: "double-click",
        tool: toolRef.current,
        reshaping: reshape.current,
        started,
      });
      if (gesture === "ignore") return;
      const point = containerPoint(host, event);
      const lngLat = map.unproject([point.x, point.y]);
      if (gesture === "close") {
        event.preventDefault();
        event.stopPropagation();
        const drawing = drawingFeature(draw);
        const decision = commitCommand({
          tool: "polygon",
          reshaping: false,
          committedVertices: committedCount(draw),
          drawing: asSketch(drawing),
          selected: null,
          stored: null,
        });
        if (decision.closeRing) dispatchKey(canvas, "Enter");
        return;
      }
      const id = polygonAt(draw, map, point, [lngLat.lng, lngLat.lat]);
      const nextReshape = beginReshape(id);
      if (!nextReshape) return;
      setSelectedRef.current(String(nextReshape.id));
      enterReshape(draw, nextReshape.id, reshapeRef, suppressRef);
    };
    let pointerDown: ScreenPoint | null = null;
    // Records the press point so a drag is not treated as a click.
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      pointerDown = containerPoint(host, event);
    };
    // Selects the polygon under a settled pointer click.
    const onClick = (event: MouseEvent) => {
      const gesture = pointerGesture({
        kind: "click",
        tool: toolRef.current,
        reshaping: reshape.current,
        started,
      });
      if (gesture !== "select") return;
      const point = containerPoint(host, event);
      const lngLat = map.unproject([point.x, point.y]);
      const hit = polygonAt(draw, map, point, [lngLat.lng, lngLat.lat]);
      if (linkingRef.current) {
        if (event.detail > 1) return;
        const dragged = pointerDown ? Math.hypot(point.x - pointerDown.x, point.y - pointerDown.y) : 0;
        if (event.button !== 0 || dragged > clickSlop) return;
        if (hit === null) return;
        toggleLinkedRef.current(String(hit));
        return;
      }
      const decision = selectCommand({
        tool: toolRef.current,
        button: event.button,
        dragged: pointerDown ? Math.hypot(point.x - pointerDown.x, point.y - pointerDown.y) : 0,
        reshaping: reshape.current,
        currentId: selectionId(draw),
        hit,
      });
      if (!decision) return;
      setSelectedRef.current(String(decision.selectedId));
      draw.selectFeature(decision.selectedId);
    };
    // Right-click opens feature actions; a vertex hit during reshaping still deletes that vertex.
    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (toolRef.current !== "pointer" || !started) return;
      const point = containerPoint(host, event);
      const gesture = pointerGesture({
        kind: "context-menu",
        tool: toolRef.current,
        reshaping: reshape.current,
        started,
      });
      if (gesture === "delete-vertex") {
        const selected = selectionId(draw);
        const feature = selected === null ? null : draw.getSnapshotFeature(selected);
        if (feature?.geometry.type === "Polygon") {
          const ring = feature.geometry.coordinates[0] as number[][];
          const vertex = vertexAtPointer(ring, point, projectPoint(map));
          if (vertex && selected !== null) {
            draw.updateFeatureGeometry(selected, {
              type: "Polygon",
              coordinates: [ringWithoutVertex(ring, vertex.index)],
            });
            return;
          }
        }
      }
      const lngLat = map.unproject([point.x, point.y]);
      const hit = polygonAt(draw, map, point, [lngLat.lng, lngLat.lat]);
      if (hit !== null) contextMenuRef.current({ kind: "feature", id: String(hit), x: event.clientX, y: event.clientY });
    };
    // Turns right-angle snap off while Control is held.
    const onKeyDown = (event: KeyboardEvent) => {
      if (!started) return;
      const gesture = keyGesture({
        phase: "down",
        key: event.key,
        repeat: event.repeat,
        typing: isTypingTarget(event.target),
        tool: toolRef.current,
        reshaping: reshape.current,
        selected: selectedRef.current !== null || selectionId(draw) !== null,
      });
      if (gesture !== "suspend-snap") return;
      draw.updateModeOptions<typeof TerraDrawPolygonMode>("polygon", {
        snapping: suspendedSnapping,
      });
    };
    // Restores snap, or cancels, deletes, or commits from the key that was released.
    const onKeyUp = (event: KeyboardEvent) => {
      if (!started) return;
      const gesture = keyGesture({
        phase: "up",
        key: event.key,
        repeat: event.repeat,
        typing: isTypingTarget(event.target),
        tool: toolRef.current,
        reshaping: reshape.current,
        selected: selectedRef.current !== null || selectionId(draw) !== null,
      });
      if (gesture === "restore-snap") {
        draw.updateModeOptions<typeof TerraDrawPolygonMode>("polygon", {
          snapping: enabledSnapping,
        });
        return;
      }
      if (gesture === "escape") {
        dispatchKey(canvas, "Escape");
        return;
      }
      if (gesture === "delete") {
        const current = selectionId(draw);
        const selectedId = selectedRef.current ?? (current === null ? null : String(current));
        const decision = deleteCommand({ selectedId });
        if (!decision || decision.type !== "delete" || !draw.hasFeature(decision.id)) return;
        event.preventDefault();
        if (current === null || String(current) !== decision.id) draw.selectFeature(decision.id);
        dispatchKey(canvas, "Delete");
        return;
      }
      if (gesture !== "commit") return;
      const selected = selectionId(draw);
      const selectedFeature = selected === null ? undefined : draw.getSnapshotFeature(selected);
      const decision = commitCommand({
        tool: toolRef.current,
        reshaping: reshape.current,
        committedVertices: committedCount(draw),
        drawing: asSketch(drawingFeature(draw)),
        selected: asSketch(selectedFeature),
        stored: selected === null ? null : storedFeature(featuresRef.current, selected),
      });
      if (decision.closeRing) {
        event.preventDefault();
        dispatchKey(canvas, "Enter");
        return;
      }
      if (decision.leaveReshape && selected !== null) {
        event.preventDefault();
        draw.deselectFeature(selected);
      }
    };

    host.addEventListener("pointerleave", onPointerLeave);
    host.addEventListener("pointerdown", onPointerDown);
    host.addEventListener("click", onClick);
    host.addEventListener("dblclick", onDoubleClick, true);
    canvas.addEventListener("contextmenu", onContextMenu, true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // Stops TerraDraw before the map is removed.
    const stopDraw = () => {
      if (!started) return;
      draw.stop();
      started = false;
    };
    if (beforeRemove) beforeRemove.current = stopDraw;

    // `load` fires once. A restored style fires `style.load` again.
    map.on("style.load", boot);
    if (map.style?._loaded) boot();

    return () => {
      if (beforeRemove?.current === stopDraw) beforeRemove.current = null;
      map.off("style.load", boot);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      host.removeEventListener("pointerleave", onPointerLeave);
      host.removeEventListener("pointerdown", onPointerDown);
      host.removeEventListener("click", onClick);
      host.removeEventListener("dblclick", onDoubleClick, true);
      canvas.removeEventListener("contextmenu", onContextMenu, true);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      draw.off("select", onSelect);
      draw.off("deselect", onDeselect);
      draw.off("finish", onFinish);
      draw.off("change", onChange);
      if (started) draw.stop();
      setDraw(null);
      setReady(false);
      setContainer(null);
      setLabel(null);
    };
  }, [map]);

  useEffect(() => {
    if (!map || !ready || !draw || !draw.enabled) return;
    applyTool(draw, map, tool);
    if (tool !== "pointer") {
      setSelectedFeature(null);
      hoverRef.current = null;
      setHoverFeature(null);
    }
  }, [draw, map, ready, tool, setSelectedFeature, setHoverFeature]);

  useEffect(() => {
    if (!map || !ready || !draw || !draw.enabled) return;
    return installOutline(map, draw, hoverLineLayerId, () =>
      hoverLineCollection(snapshotFeature(draw, hoverRef.current)),
    );
  }, [map, ready, draw]);

  useEffect(() => {
    if (!map || !ready || !draw || !draw.enabled || !map.style?._loaded) return;
    const source = lineSource(map, hoverLineLayerId);
    if (!source) return;
    source.setData(hoverLineCollection(snapshotFeature(draw, hoverFeature)));
    if (map.getLayer(hoverLineLayerId)) map.moveLayer(hoverLineLayerId);
  }, [map, ready, draw, hoverFeature]);

  useEffect(() => {
    if (!map || !ready || !draw || !draw.enabled) return;
    return installOutline(map, draw, selectedLineLayerId, () =>
      selectionLineData(snapshotFeature(draw, selectedRef.current)),
    );
  }, [map, ready, draw]);

  useEffect(() => {
    if (!map || !ready || !draw || !draw.enabled) return;
    return installSelectionHatch(map, draw, () =>
      currentHatch(map, draw, selectedRef.current, linkingRef.current),
    );
  }, [map, ready, draw]);

  useEffect(() => {
    if (!map || !ready || !draw || !draw.enabled || !map.style?._loaded) return;
    const feature = snapshotFeature(draw, selectedFeature);
    const source = lineSource(map, selectedLineLayerId);
    if (source) {
      source.setData(selectionLineData(feature));
      if (map.getLayer(selectedLineLayerId)) map.moveLayer(selectedLineLayerId);
    }
    const hatch = lineSource(map, selectedHatchLayerId);
    if (!hatch) return;
    hatch.setData(currentHatch(map, draw, selectedFeature, linkingRef.current));
    raiseSketchLines(map);
  }, [map, ready, draw, selectedFeature]);

  useEffect(() => {
    if (!ready || !draw || !draw.enabled) return;
    const paint = mapPaint();
    const linkedColor = mapColor(getComputedStyle(document.documentElement), "--map-action-linked", "#eab308");
    const activeColor = linking ? linkedColor : paint.polygon;
    draw.updateModeOptions<typeof TerraDrawSelectMode>("select", {
      styles: {
        selectedPolygonColor: linking ? activeColor : paint.muted,
        selectedPolygonFillOpacity: 0.25,
        selectedPolygonOutlineColor: activeColor,
      },
    });
    draw.updateModeOptions<typeof TerraDrawPolygonMode>("polygon", {
      styles: {
        fillColor: (feature) => feature.properties.currentlyDrawing === true ? activeColor : paint.muted,
        outlineColor: (feature) => feature.properties.currentlyDrawing === true ? activeColor : paint.muted,
        closingPointOutlineColor: activeColor,
        snappingPointColor: activeColor,
      },
    });
    if (map?.style?._loaded) {
      for (const layerId of [hoverLineLayerId, selectedLineLayerId]) {
        if (map.getLayer(layerId)) map.setPaintProperty(layerId, "line-color", activeColor);
      }
      if (map.getLayer(actionLinkFillLayerId)) {
        map.setPaintProperty(actionLinkFillLayerId, "fill-color", linkedColor);
      }
      if (map.getLayer(actionLinkLineLayerId)) {
        map.setPaintProperty(
          actionLinkLineLayerId,
          "line-color",
          linking ? ["case", ["==", ["get", "hovered"], true], activeColor, linkedColor] : linkedColor,
        );
      }
      const hatch = lineSource(map, selectedHatchLayerId);
      if (hatch) {
        hatch.setData(currentHatch(map, draw, selectedRef.current, linking));
        raiseSketchLines(map);
      }
    }
  }, [map, draw, ready, linking]);

  // A sidebar delete drops the id from the list. TerraDraw still has that polygon until this removes it.
  useEffect(() => {
    if (!ready || !draw || !draw.enabled) return;
    const current = features.map((feature) => String(feature.id));
    const currentIds = new Set(current);
    const removed = storedIdsRef.current.filter((id) => !currentIds.has(id) && draw.hasFeature(id));
    storedIdsRef.current = current;
    if (removed.length > 0) draw.removeFeatures(removed);
  }, [features, draw, ready]);

  useEffect(() => {
    if (!ready || !draw || !draw.enabled || tool !== "pointer") return;
    const current = selectionId(draw);
    const action = selectionDraw(
      selectedFeature,
      current,
      selectedFeature !== null && draw.hasFeature(selectedFeature),
    );
    if (action === "deselect" && current !== null) draw.deselectFeature(current);
    if (action === "select" && selectedFeature !== null) draw.selectFeature(selectedFeature);
  }, [draw, ready, selectedFeature, tool]);

  useEffect(() => {
    if (!ready || !draw || !draw.enabled) return;
    draw.updateModeOptions<typeof TerraDrawSelectMode>("select", {
      allowManualDeselection: !linking,
    });
  }, [draw, ready, linking]);

  useEffect(() => {
    if (!map || !ready || !draw || !draw.enabled) return;
    return installActionLinks(map, draw, () =>
      actionLinkCollections(
        draw.getSnapshot(),
        linkedRef.current,
        linkingRef.current ? selectedRef.current : null,
        hoverRef.current,
      ),
    );
  }, [map, ready, draw]);

  useEffect(() => {
    if (!map || !ready || !draw || !draw.enabled || !map.style?._loaded) return;
    const data = actionLinkCollections(
      draw.getSnapshot(),
      highlightedFeatureIds,
      linking ? selectedFeature : null,
      hoverFeature,
    );
    const fill = lineSource(map, actionLinkFillLayerId);
    const line = lineSource(map, actionLinkLineLayerId);
    if (fill) fill.setData(data.fill);
    if (line) line.setData(data.line);
    raiseActionLinks(map);
  }, [map, ready, draw, highlightedFeatureIds, selectedFeature, hoverFeature, linking, features]);

  if (!map || !container || !ready || !draw) return null;

  return createPortal(<SketchTooltip label={label} />, container);
}

// Adds a top line layer and keeps its geometry in sync with TerraDraw changes.
// A background tab can drop the WebGL context. MapLibre then rebuilds the style
// and `addSource` throws until the next `style.load`.
function installOutline(
  map: MapLibreMap,
  draw: TerraDrawInstance,
  layerId: string,
  readData: () => ReturnType<typeof selectionLineData>,
) {
  let stopped = false;
  const paint = mapPaint();
  // Copies the current line geometry and moves that layer to the top.
  const sync = () => {
    if (!draw.enabled || !map.style?._loaded) return;
    const source = lineSource(map, layerId);
    if (!source) return;
    source.setData(readData());
    if (map.getLayer(layerId)) map.moveLayer(layerId);
  };
  // Re-adds the layer when this style has none. A restored style already includes it.
  const mount = () => {
    if (stopped || !map.style?._loaded) return;
    if (!map.getSource(layerId)) {
      map.addSource(layerId, { type: "geojson", data: selectionLineData(null) });
    }
    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: "line",
        source: layerId,
        paint: {
          "line-color": paint.polygon,
          "line-width": lineWidth,
        },
      });
    }
    sync();
  };
  map.on("style.load", mount);
  mount();
  draw.on("change", sync);
  draw.on("finish", sync);
  return () => {
    stopped = true;
    map.off("style.load", mount);
    draw.off("change", sync);
    draw.off("finish", sync);
    if (!map.style?._loaded) return;
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(layerId)) map.removeSource(layerId);
  };
}

// The live TerraDraw feature for an id, or null when it is missing.
function snapshotFeature(draw: TerraDrawInstance, id: string | null) {
  if (!draw.enabled || id === null || !draw.hasFeature(id)) return null;
  return draw.getSnapshotFeature(id) ?? null;
}

// Map colors read from the document CSS variables.
function mapPaint(): MapPaint {
  const style = getComputedStyle(document.documentElement);
  return {
    polygon: mapColor(style, "--map-polygon"),
    muted: mapColor(style, "--map-polygon-muted"),
    handle: mapColor(style, "--map-handle"),
    vertex: mapColor(style, "--map-vertex"),
    midpointOutline: mapColor(style, "--map-midpoint-outline"),
  };
}

// One hex color from a CSS variable, or an error when it is missing.
function mapColor(style: CSSStyleDeclaration, name: string, fallback?: `#${string}`) {
  const value = style.getPropertyValue(name).trim() || fallback || "";
  if (!value.startsWith("#")) {
    throw new Error(`Missing map color ${name}.`);
  }
  return value as `#${string}`;
}

// The stored polygon with this id, as a sketch feature.
function storedFeature(features: readonly GeoJSONStoreFeatures[], id: string | number) {
  return asSketch(features.find((feature) => String(feature.id) === String(id)));
}

// A TerraDraw polygon narrowed to the sketch feature shape.
function asSketch(feature: GeoJSONStoreFeatures | undefined): SketchFeature | null {
  if (!feature || feature.geometry.type !== "Polygon") return null;
  return {
    id: feature.id,
    geometry: {
      type: feature.geometry.type,
      coordinates: feature.geometry.coordinates as number[][][],
    },
    properties: feature.properties,
  };
}

// Switches TerraDraw mode and map gestures for the current tool.
function applyTool(draw: TerraDrawInstance, map: MapLibreMap, tool: MapTool) {
  if (!draw.enabled) return;
  const mode = drawModeName(tool);
  if (draw.getMode() !== mode) draw.setMode(mode);
  if (tool === "polygon") {
    map.doubleClickZoom.disable();
    map.dragPan.disable();
  } else {
    map.doubleClickZoom.enable();
    map.dragPan.enable();
  }
}

// Sends a keyup to the map canvas so TerraDraw handles it.
function dispatchKey(canvas: HTMLCanvasElement, key: string) {
  canvas.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: false }));
}

// Pointer position relative to the map container.
function containerPoint(container: HTMLElement, event: MouseEvent) {
  const rect = container.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

// The polygon ring that is still being drawn.
function drawingFeature(draw: TerraDrawInstance) {
  return draw.getSnapshot().find((feature) => {
    return feature.geometry.type === "Polygon" && feature.properties.currentlyDrawing === true;
  });
}

// How many vertices of the open ring are committed.
function committedCount(draw: TerraDrawInstance) {
  const count = drawingFeature(draw)?.properties.committedCoordinateCount;
  return typeof count === "number" ? count : 0;
}

// The GeoJSON source for a hover, selection, or action-link layer.
function lineSource(map: MapLibreMap, id: string) {
  const source = map.getSource(id);
  if (!source || source.type !== "geojson") return null;
  return source as GeoJSONSource;
}

// Adds the linked-feature fill and line, and keeps them under the hover and selection strokes.
function installActionLinks(
  map: MapLibreMap,
  draw: TerraDrawInstance,
  readData: () => ReturnType<typeof actionLinkCollections>,
) {
  let stopped = false;
  const linkedColor = mapColor(getComputedStyle(document.documentElement), "--map-action-linked", "#eab308");
  const sync = () => {
    if (!draw.enabled || !map.style?._loaded) return;
    const data = readData();
    const fill = lineSource(map, actionLinkFillLayerId);
    const line = lineSource(map, actionLinkLineLayerId);
    if (fill) fill.setData(data.fill);
    if (line) line.setData(data.line);
    raiseActionLinks(map);
  };
  const mount = () => {
    if (stopped || !map.style?._loaded) return;
    const empty = emptyActionLinks();
    if (!map.getSource(actionLinkFillLayerId)) {
      map.addSource(actionLinkFillLayerId, { type: "geojson", data: empty.fill });
    }
    if (!map.getSource(actionLinkLineLayerId)) {
      map.addSource(actionLinkLineLayerId, { type: "geojson", data: empty.line });
    }
    if (!map.getLayer(actionLinkFillLayerId)) {
      map.addLayer({
        id: actionLinkFillLayerId,
        type: "fill",
        source: actionLinkFillLayerId,
        paint: {
          "fill-color": linkedColor,
          "fill-opacity": actionLinkFillOpacity,
        },
      });
    }
    if (!map.getLayer(actionLinkLineLayerId)) {
      map.addLayer({
        id: actionLinkLineLayerId,
        type: "line",
        source: actionLinkLineLayerId,
        paint: {
          "line-color": linkedColor,
          "line-width": lineWidth,
        },
      });
    }
    sync();
  };
  map.on("style.load", mount);
  mount();
  draw.on("change", sync);
  draw.on("finish", sync);
  return () => {
    stopped = true;
    map.off("style.load", mount);
    draw.off("change", sync);
    draw.off("finish", sync);
    if (!map.style?._loaded) return;
    if (map.getLayer(actionLinkFillLayerId)) map.removeLayer(actionLinkFillLayerId);
    if (map.getLayer(actionLinkLineLayerId)) map.removeLayer(actionLinkLineLayerId);
    if (map.getSource(actionLinkFillLayerId)) map.removeSource(actionLinkFillLayerId);
    if (map.getSource(actionLinkLineLayerId)) map.removeSource(actionLinkLineLayerId);
  };
}

// Puts the link paint above polygons and under the hatch, hover, and selection lines.
function raiseActionLinks(map: MapLibreMap) {
  if (map.getLayer(actionLinkFillLayerId)) map.moveLayer(actionLinkFillLayerId);
  if (map.getLayer(actionLinkLineLayerId)) map.moveLayer(actionLinkLineLayerId);
  raiseSketchLines(map);
}

// Keeps the blue outline and the hover stroke above the white hatch.
function raiseSketchLines(map: MapLibreMap) {
  if (map.getLayer(selectedHatchLayerId)) map.moveLayer(selectedHatchLayerId);
  if (map.getLayer(hoverLineLayerId)) map.moveLayer(hoverLineLayerId);
  if (map.getLayer(selectedLineLayerId)) map.moveLayer(selectedLineLayerId);
}

// The selected polygon's hatch for the current camera. Empty while linking.
function currentHatch(
  map: MapLibreMap,
  draw: TerraDrawInstance,
  selectedId: string | null,
  linking: boolean,
) {
  return selectionHatchData(
    snapshotFeature(draw, selectedId),
    projectPoint(map),
    unprojectPoint(map),
    linking,
  );
}

// Projects a longitude and latitude to map pixels.
function projectPoint(map: MapLibreMap) {
  return (lng: number, lat: number) => {
    const pixel = map.project([lng, lat]);
    return { x: pixel.x, y: pixel.y };
  };
}

// The longitude and latitude under a map pixel.
function unprojectPoint(map: MapLibreMap) {
  return (x: number, y: number) => {
    const lngLat = map.unproject([x, y]);
    return [lngLat.lng, lngLat.lat] as [number, number];
  };
}

// Adds the selected hatch and rebuilds it when the camera or the polygon changes.
// A pure pan keeps the same lines. Zoom, rotate, and edits rebuild them.
function installSelectionHatch(
  map: MapLibreMap,
  draw: TerraDrawInstance,
  readData: () => ReturnType<typeof selectionHatchData>,
) {
  let stopped = false;
  let camera = "";
  let payload = "";
  // Pan keeps the stamp. Zoom, resize, and feature edits rebuild the lines.
  const sync = (force: boolean) => {
    if (stopped || !draw.enabled || !map.style?._loaded) return;
    const source = lineSource(map, selectedHatchLayerId);
    if (!source) return;
    const nextCamera = cameraStamp(map);
    if (!force && nextCamera === camera) return;
    const data = readData();
    const nextPayload = JSON.stringify(data.features);
    const changed = nextCamera !== camera || nextPayload !== payload;
    camera = nextCamera;
    payload = nextPayload;
    if (changed) source.setData(data);
    if (changed || force) raiseSketchLines(map);
  };
  const mount = () => {
    if (stopped || !map.style?._loaded) return;
    camera = "";
    payload = "";
    if (!map.getSource(selectedHatchLayerId)) {
      map.addSource(selectedHatchLayerId, {
        type: "geojson",
        data: emptyHatchCollection(),
      });
    }
    if (!map.getLayer(selectedHatchLayerId)) {
      map.addLayer({
        id: selectedHatchLayerId,
        type: "line",
        source: selectedHatchLayerId,
        paint: {
          "line-color": hatchColor,
          "line-opacity": hatchOpacity,
          "line-width": hatchLineWidth,
        },
      });
    }
    sync(true);
  };
  const onMove = () => sync(false);
  const onEdit = () => sync(true);
  map.on("style.load", mount);
  map.on("move", onMove);
  map.on("resize", onEdit);
  mount();
  draw.on("change", onEdit);
  draw.on("finish", onEdit);
  return () => {
    stopped = true;
    map.off("style.load", mount);
    map.off("move", onMove);
    map.off("resize", onEdit);
    draw.off("change", onEdit);
    draw.off("finish", onEdit);
    if (!map.style?._loaded) return;
    if (map.getLayer(selectedHatchLayerId)) map.removeLayer(selectedHatchLayerId);
    if (map.getSource(selectedHatchLayerId)) map.removeSource(selectedHatchLayerId);
  };
}

// Zoom, bearing, pitch, and canvas size. A pan leaves this stamp unchanged.
function cameraStamp(map: MapLibreMap) {
  return [
    map.getZoom(),
    map.getBearing(),
    map.getPitch(),
    map.getCanvas().clientWidth,
    map.getCanvas().clientHeight,
  ].join("|");
}

function emptyHatchCollection() {
  return selectionHatchData(null, () => ({ x: 0, y: 0 }), () => [0, 0], false);
}

// The finished polygon under the pointer, by fill or by vertex.
function hoverTarget(
  draw: TerraDrawInstance,
  map: MapLibreMap,
  point: ScreenPoint,
  lngLat: LngLat,
) {
  const paintOrder = draw.getSnapshot();
  const hits = draw.getFeaturesAtLngLat(
    { lng: lngLat[0], lat: lngLat[1] },
    { ignoreSelectFeatures: true },
  );
  const inside = topFinishedPolygonId(paintOrder, hits);
  if (inside !== null) return inside;
  return topVertexPolygonId(paintOrder, point, projectPoint(map), pointerDistance);
}

// The polygon a click should select, by hit or by nearby vertex.
function polygonAt(
  draw: TerraDrawInstance,
  map: MapLibreMap,
  point: ScreenPoint,
  lngLat: LngLat,
) {
  const hits = draw.getFeaturesAtLngLat(
    { lng: lngLat[0], lat: lngLat[1] },
    { ignoreSelectFeatures: true },
  );
  const hit = selectionFromHits(hits);
  if (hit !== null) return hit;
  return selectionFromVertices(draw.getSnapshot(), point, projectPoint(map), pointerDistance);
}

// The id TerraDraw currently has selected.
function selectionId(draw: TerraDrawInstance) {
  return selectedSnapshotId(draw.getSnapshot());
}

// Tooltip contents for the open ring or the vertex being dragged.
function readLabel(
  draw: TerraDrawInstance,
  map: MapLibreMap,
  point: ScreenPoint,
  primaryDown: boolean,
  reshape: boolean,
) {
  const drawing = drawingFeature(draw);
  const selected = selectionId(draw);
  const selectedFeature = selected === null ? undefined : draw.getSnapshotFeature(selected);
  return sketchLabel({
    drawingRing: polygonRing(drawing),
    committed: committedCount(draw),
    reshaping: reshape,
    primaryDown,
    reshapeRing: polygonRing(selectedFeature),
    point,
    project: projectPoint(map),
  });
}

// The outer ring of a polygon feature.
function polygonRing(feature: GeoJSONStoreFeatures | undefined) {
  if (!feature || feature.geometry.type !== "Polygon") return null;
  return feature.geometry.coordinates[0] as number[][];
}

// Turns reshape handles on without letting select events clear the selection.
function enterReshape(
  draw: TerraDrawInstance,
  id: string | number,
  reshapeRef: { current: boolean },
  suppressRef: { current: boolean },
) {
  reshapeRef.current = true;
  suppressRef.current = true;
  draw.updateModeOptions<typeof TerraDrawSelectMode>("select", {
    flags: polygonFlags(true),
  });
  draw.deselectFeature(id);
  draw.selectFeature(id);
  suppressRef.current = false;
}

// Right-angle snap for the vertex currently being placed.
function snapCoordinate(
  draw: TerraDrawInstance | null,
  event: TerraDrawMouseEvent,
  context: SnappableContext,
): [number, number] | undefined {
  const geometry = context.getCurrentGeometrySnapshot();
  const ring = geometry?.type === "Polygon" ? (geometry.coordinates[0] as number[][]) : undefined;
  const cursor = context.project(event.lng, event.lat);
  const snapped = rightAngleCoordinate({
    coordinate: context.currentCoordinate,
    ring,
    cursor,
    otherRings: draw ? otherPolygonRings(draw.getSnapshot(), context.currentId) : [],
    project: (lng, lat) => context.project(lng, lat),
    unproject: (point) => {
      const lngLat = context.unproject(point.x, point.y);
      return [lngLat.lng, lngLat.lat];
    },
  });
  return snapped;
}
