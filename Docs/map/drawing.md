# Drawing

Sketching is client-only. `MapStage` mounts `PolygonSketch` beside `Map` on the project map page. Landing maps do not. The code lives in `app/src/app/(map)/projects/[projectId]/map/polygon/`. It is not in `app/src/lib`. Polygons stay in the browser. A refresh or leaving the page clears them.

The toolbar is a radiogroup labeled "Map tools". Pointer selects and edits. Polygon draws. Point is render-only: finished polygons stay on the map, and the tool creates nothing. Switching off Polygon cancels an open ring and keeps finished polygons.

Drawing uses Terra Draw (`terra-draw` and `terra-draw-maplibre-gl-adapter`) on the MapLibre instance from `Map`'s `onReady`. Polygon mode draws, select mode edits, and render mode displays. Terra Draw's own toolbar is not used.

Fill is `#007ac2` at opacity 0.25. The outline is the same blue at 2px. Self-intersections are allowed.

### Polygon tool

The cursor is a crosshair. Map panning and double-click zoom are off. A left-drag does not add a vertex and does not pan.

A left-click commits a vertex. The segment from the last committed vertex follows the cursor. The first vertex is a white close handle with a blue outline, 8px wide.

Closing needs at least three committed vertices. Double-click commits the vertex under the cursor and closes. Clicking the first vertex, within 15px, closes. Enter closes from the committed vertices and ignores the rubber-band vertex. Fewer than three committed vertices does not close. Escape cancels the open ring. After a close, Polygon stays active.

### Snapping

While drawing, the cursor snaps to vertices and edges of other sketch polygons within 15px. A blue snap point with a white outline marks the hit. Hold Ctrl to suspend vertex, edge, and angle snapping. Releasing Ctrl restores them. A repeated Ctrl key does not toggle again.

Angle snap starts once two vertices exist. It is measured on screen from the previous segment. The new segment keeps its length and locks its angle when the turn is within 3° of straight ahead (0°) or a right angle either way (90° or -90°). A wider turn stays on the cursor. Reversing back along the previous segment does not lock. Within 15px of the first vertex, or of another polygon's vertex or edge, the angle lock yields so the close handle and the other polygon win.

Reshape does not use the 3° window. Dragged vertices and edges still snap to other sketch polygons.

### Tooltip

A label follows the cursor, 16px down and right. It shows geodesic length in feet, direction in degrees clockwise from north, and area in acres. Feet use one decimal under 100 and none otherwise. Direction uses one decimal. Acres use two.

While drawing, length and direction are the rubber-band segment. Area includes the committed vertices plus that segment. While reshaping, the label appears only while the primary button is down and the cursor is within 24px of a vertex. Length and direction are the segment into that vertex. Area is the ring.

Tab does not type a distance or a direction.

### Pointer tool

A single click on a polygon does nothing. Double-click a finished polygon to edit its vertices. The double-click that closes an open ring is unchanged. Map pan and double-click zoom stay on. Dragging the body does not move the polygon.

Vertices are orange (`#f89927`) with a white outline. Each edge has a white midpoint with a `#9a9a9a` outline. Delete removes the polygon. Escape or a click on empty ground leaves vertex editing.

Press a midpoint and drag it: a vertex is inserted and follows the cursor until release. A click without a drag leaves the new vertex on the edge where the midpoint was. Each new edge gets its own midpoint. Orange vertices move the same way: press, drag, and release. Right-click a vertex within 15px deletes it and keeps the browser menu closed. A ring with only three vertices does not lose one. Right-click does not delete a midpoint.

### Shortcuts

Keys are ignored while an input, textarea, or contenteditable element is focused. These are Control shortcuts, not Command.

| Shortcut | Purpose |
| --- | --- |
| Ctrl | Hold while drawing to suspend vertex, edge, and angle snapping. Release to restore them. |
| Enter | Close the open ring from the committed vertices. Polygon tool only, and only with at least three committed vertices. |
| Escape | Cancel the open ring. In the Pointer tool, clear the selection. |
| Delete | Remove the polygon that is in vertex editing. Pointer tool only. |
| Arrow keys | Move between Pointer, Polygon, and Point while the map tools bar is focused. |
