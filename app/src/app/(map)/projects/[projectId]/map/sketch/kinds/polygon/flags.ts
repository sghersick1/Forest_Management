/*
 * TerraDraw select flags for one polygon.
 * Reshape is the only time vertex and midpoint handles are on.
 */

// Handles for a selected polygon. Dragging is on only while reshaping.
export function polygonFlags(reshape: boolean, editable = true) {
  const handles = reshape && editable;
  return {
    polygon: {
      feature: {
        draggable: false,
        selfIntersectable: true,
        coordinates: {
          midpoints: handles ? { draggable: true } : false,
          draggable: handles,
          deletable: editable,
          snappable: {
            toCoordinate: true,
            toLine: true,
          },
        },
      },
    },
  };
}
