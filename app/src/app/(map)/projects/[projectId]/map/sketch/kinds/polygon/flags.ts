/*
 * TerraDraw select flags for one polygon.
 * Reshape is the only time vertex and midpoint handles are on.
 */

// Handles for a selected polygon. Dragging is on only while reshaping.
export function polygonFlags(reshape: boolean) {
  return {
    polygon: {
      feature: {
        draggable: false,
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
