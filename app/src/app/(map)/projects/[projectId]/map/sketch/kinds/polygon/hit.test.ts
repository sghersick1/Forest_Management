/*
 * Tests polygon hit order, hover, and click selection.
 */

import { describe, expect, it } from "vitest";
import {
  clickSlop,
  finishedPolygonId,
  hoverLineData,
  keptHoverId,
  keptSelectedId,
  pointerDistance,
  pointerHoverId,
  selectedForTool,
  selectedSnapshotId,
  selectionFromClick,
  selectionFromHits,
  selectionFromVertices,
  topFinishedPolygonId,
  topVertexPolygonId,
  type PolygonHit,
} from "./hit";

const bottomId = "11111111-1111-4111-8111-111111111111";
const topId = "22222222-2222-4222-8222-222222222222";

const square = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 0],
];

// A polygon hit fixture.
function polygon(
  id: string | number | undefined,
  properties: PolygonHit["properties"] = {},
  ring: number[][] = square,
): PolygonHit {
  return {
    id,
    geometry: { type: "Polygon", coordinates: [ring] },
    properties,
  };
}

// Projects a coordinate to itself so tests can measure pixel distance.
const identity = (lng: number, lat: number) => ({ x: lng, y: lat });

describe("hover paint order", () => {
  const bottom = polygon(bottomId);
  const top = polygon(topId);
  const paintOrder = [bottom, top];

  it("hovers the polygon painted on top when both contain the pointer", () => {
    expect(topFinishedPolygonId(paintOrder, [bottom, top])).toBe(topId);
    expect(topFinishedPolygonId(paintOrder, [top, bottom])).toBe(topId);
  });

  it("ignores an open ring painted above a finished polygon", () => {
    const drawing = polygon("33333333-3333-4333-8333-333333333333", {
      currentlyDrawing: true,
    });
    expect(topFinishedPolygonId([bottom, drawing], [drawing, bottom])).toBe(bottomId);
  });

  it("ignores a polygon whose id is not a string", () => {
    expect(finishedPolygonId(polygon(4))).toBeNull();
    expect(topFinishedPolygonId([polygon(4), bottom], [polygon(4), bottom])).toBe(bottomId);
  });

  it("hovers the top polygon whose vertex is within the pointer distance", () => {
    const lower = polygon(bottomId, {}, [[0, 0], [1, 0], [1, 1], [0, 0]]);
    const upper = polygon(topId, {}, [[8, 0], [9, 0], [9, 1], [8, 0]]);
    expect(topVertexPolygonId([lower, upper], { x: 8.5, y: 0 }, identity, pointerDistance)).toBe(
      topId,
    );
  });

  it("keeps a lower polygon when the polygon above is farther than the pointer distance", () => {
    const lower = polygon(bottomId, {}, [[0, 0], [1, 0], [1, 1], [0, 0]]);
    const upper = polygon(topId, {}, [[40, 0], [41, 0], [41, 1], [40, 0]]);
    expect(topVertexPolygonId([lower, upper], { x: 0, y: 0 }, identity, pointerDistance)).toBe(
      bottomId,
    );
  });

  it("does not hover the selected polygon", () => {
    expect(pointerHoverId(topId, topId)).toBeNull();
    expect(pointerHoverId(topId, bottomId)).toBe(topId);
    expect(pointerHoverId(null, null)).toBeNull();
  });

  it("drops a hover id that is selected or no longer stored", () => {
    expect(keptHoverId(topId, topId, [bottomId, topId])).toBeNull();
    expect(keptHoverId(topId, bottomId, [bottomId])).toBeNull();
    expect(keptHoverId(topId, null, [bottomId, topId])).toBe(topId);
    expect(keptHoverId(null, null, [topId])).toBeNull();
  });

  it("builds a line for every ring of the hovered polygon", () => {
    const hole = polygon(topId);
    hole.geometry.coordinates = [square, [[1, 1], [2, 1], [2, 2], [1, 1]]];
    expect(hoverLineData(hole)).toEqual({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "MultiLineString",
            coordinates: hole.geometry.coordinates,
          },
        },
      ],
    });
    expect(hoverLineData(null).features).toEqual([]);
  });
});

describe("polygon selection", () => {
  const bottom = polygon(bottomId);
  const top = polygon(topId);

  it("selects the first polygon returned by the hit query", () => {
    expect(selectionFromHits([bottom, top])).toBe(bottomId);
    expect(selectionFromHits([top, bottom])).toBe(topId);
  });

  it("selects an open ring when that ring is the first polygon hit", () => {
    const drawing = polygon("33333333-3333-4333-8333-333333333333", {
      currentlyDrawing: true,
    });
    expect(selectionFromHits([drawing, bottom])).toBe(drawing.id);
  });

  it("selects the first stored polygon with a vertex inside the pointer distance", () => {
    const lower = polygon(bottomId, {}, [[0, 0], [1, 0], [1, 1], [0, 0]]);
    const upper = polygon(topId, {}, [[8, 0], [9, 0], [9, 1], [8, 0]]);
    expect(
      selectionFromVertices([lower, upper], { x: 8.5, y: 0 }, identity, pointerDistance),
    ).toBe(bottomId);
  });

  it("skips an open ring while searching vertices", () => {
    const drawing = polygon(bottomId, { currentlyDrawing: true }, [[0, 0], [1, 0], [1, 1], [0, 0]]);
    const finished = polygon(topId, {}, [[0, 0], [1, 0], [1, 1], [0, 0]]);
    expect(selectionFromVertices([drawing, finished], { x: 0, y: 0 }, identity, pointerDistance)).toBe(
      topId,
    );
  });

  it("selects nothing when the pointer misses every polygon", () => {
    expect(selectionFromHits([])).toBeNull();
    expect(
      selectionFromVertices([bottom], { x: 100, y: 100 }, identity, pointerDistance),
    ).toBeNull();
  });

  it("ignores a click that is not a settled pointer click on a new polygon", () => {
    const hit = {
      tool: "pointer" as const,
      button: 0,
      dragged: 0,
      reshaping: false,
      currentId: null,
      hit: topId,
    };
    expect(selectionFromClick(hit)).toBe(topId);
    expect(selectionFromClick({ ...hit, tool: "polygon" })).toBeNull();
    expect(selectionFromClick({ ...hit, button: 2 })).toBeNull();
    expect(selectionFromClick({ ...hit, dragged: clickSlop + 1 })).toBeNull();
    expect(selectionFromClick({ ...hit, hit: null })).toBeNull();
    expect(selectionFromClick({ ...hit, reshaping: true, currentId: topId })).toBeNull();
  });

  it("reads the selected polygon from the snapshot", () => {
    expect(selectedSnapshotId([bottom, { ...top, properties: { selected: true } }])).toBe(topId);
    expect(selectedSnapshotId([bottom])).toBeNull();
  });

  it("clears a selection that left the feature list or left the pointer tool", () => {
    expect(keptSelectedId(topId, [bottomId])).toBeNull();
    expect(keptSelectedId(topId, [bottomId, topId])).toBe(topId);
    expect(selectedForTool("polygon", topId)).toBeNull();
    expect(selectedForTool("point", topId)).toBeNull();
    expect(selectedForTool("pointer", topId)).toBe(topId);
  });
});
