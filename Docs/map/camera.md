# Camera

Columns on `public.projects`, from `app/supabase/migrations/20261102011736_project_map_view.sql`:

| Column | Meaning | Default |
| --- | --- | --- |
| `map_x` | Longitude, WGS 84 | `-81.3011053204884` |
| `map_y` | Latitude, WGS 84 | `41.61200295314762` |
| `map_zoom` | MapLibre zoom | `15` |

`getProject` maps those columns to `mapX`, `mapY`, and `mapZoom`. `Map` uses the same numbers when a caller omits them.

Creating a project with an address geocodes that address and stores the match as `map_x` and `map_y`. Zoom stays at the default. A blank address, a failed lookup, or no match still creates the project at the default camera. Nothing writes the camera after that. Panning or zooming the map page does not update the project.

`Map` builds a new MapLibre map when `interactive`, `mapX`, `mapY`, or `mapZoom` changes, and removes it on cleanup. The style URL is `/api/basemap/style?v=2`.
