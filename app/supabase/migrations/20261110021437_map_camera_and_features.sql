CREATE TABLE public.maps (
  project_id bigint PRIMARY KEY REFERENCES public.projects (id) ON DELETE CASCADE,
  camera_x double precision NOT NULL DEFAULT -81.3011053204884,
  camera_y double precision NOT NULL DEFAULT 41.61200295314762,
  map_zoom double precision NOT NULL DEFAULT 15,
  edited_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

CREATE TABLE public.map_features (
  id uuid PRIMARY KEY,
  map_id bigint NOT NULL REFERENCES public.maps (project_id) ON DELETE CASCADE,
  geometry jsonb NOT NULL,
  edited_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

CREATE INDEX map_features_map_id_idx ON public.map_features (map_id);

INSERT INTO public.maps (project_id, camera_x, camera_y, map_zoom)
SELECT id, map_x, map_y, map_zoom
FROM public.projects;

ALTER TABLE public.projects
  DROP COLUMN map_x,
  DROP COLUMN map_y,
  DROP COLUMN map_zoom;

CREATE FUNCTION private.create_project_map()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
BEGIN
  INSERT INTO public.maps (project_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.create_project_map() FROM PUBLIC;

CREATE TRIGGER create_project_map
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION private.create_project_map();

ALTER TABLE public.maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_features ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.maps FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.map_features FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.maps TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.map_features TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.maps TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.map_features TO service_role;

CREATE POLICY "Members can view their map"
  ON public.maps
  FOR SELECT
  TO authenticated
  USING ((SELECT private.is_project_member(project_id)));

CREATE POLICY "Members can insert their map"
  ON public.maps
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT private.is_project_member(project_id)));

CREATE POLICY "Members can update their map"
  ON public.maps
  FOR UPDATE
  TO authenticated
  USING ((SELECT private.is_project_member(project_id)))
  WITH CHECK ((SELECT private.is_project_member(project_id)));

CREATE POLICY "Members can delete their map"
  ON public.maps
  FOR DELETE
  TO authenticated
  USING ((SELECT private.is_project_member(project_id)));

CREATE POLICY "Members can view map features"
  ON public.map_features
  FOR SELECT
  TO authenticated
  USING ((SELECT private.is_project_member(map_id)));

CREATE POLICY "Members can insert map features"
  ON public.map_features
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT private.is_project_member(map_id)));

CREATE POLICY "Members can update map features"
  ON public.map_features
  FOR UPDATE
  TO authenticated
  USING ((SELECT private.is_project_member(map_id)))
  WITH CHECK ((SELECT private.is_project_member(map_id)));

CREATE POLICY "Members can delete map features"
  ON public.map_features
  FOR DELETE
  TO authenticated
  USING ((SELECT private.is_project_member(map_id)));
