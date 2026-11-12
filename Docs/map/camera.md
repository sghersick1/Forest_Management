# Camera

Columns on `public.maps`, one row per project. `project_id` is the primary key and references `projects`. A trigger inserts the row when a project is created. The old `projects.map_x`, `map_y`, and `map_zoom` columns are gone.

| Column | Meaning | Default |
| --- | --- | --- |
| `camera_x` | Longitude, WGS 84 | `-81.3011053204884` |
| `camera_y` | Latitude, WGS 84 | `41.61200295314762` |
| `map_zoom` | MapLibre zoom | `15` |

`getProject` reads the map row and still exposes `mapX`, `mapY`, and `mapZoom`. `Map` uses the same numbers when a caller omits them.

Creating a project with an address geocodes that address and stores the match as `camera_x` and `camera_y`. Zoom stays at the default. A blank address, a failed lookup, or no match still creates the project at the default camera.

On the project map, panning or zooming saves the camera about 500ms after the move ends. Landing previews read that camera and do not write it. The save does not pass the new center back into `Map`, because `Map` builds a new MapLibre map when `interactive`, `mapX`, `mapY`, or `mapZoom` changes.

The style URL is `/api/basemap/style?v=2`.
