ALTER TABLE public.projects
  ADD COLUMN map_x double precision NOT NULL DEFAULT -81.3011053204884,
  ADD COLUMN map_y double precision NOT NULL DEFAULT 41.61200295314762,
  ADD COLUMN map_zoom double precision NOT NULL DEFAULT 15;
