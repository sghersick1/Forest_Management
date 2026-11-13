CREATE TABLE public.actions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id bigint NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  edited_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT actions_id_project_id_key UNIQUE (id, project_id),
  CONSTRAINT actions_name_not_blank CHECK (char_length(btrim(name)) > 0),
  CONSTRAINT actions_status_not_blank CHECK (char_length(btrim(status)) > 0)
);

CREATE INDEX actions_project_id_idx ON public.actions (project_id);

ALTER TABLE public.map_features
  ADD CONSTRAINT map_features_id_map_id_key UNIQUE (id, map_id);

CREATE TABLE public.action_stands (
  action_id bigint NOT NULL,
  project_id bigint NOT NULL,
  map_feature_id uuid NOT NULL,
  PRIMARY KEY (action_id, map_feature_id),
  CONSTRAINT action_stands_action_project_fkey
    FOREIGN KEY (action_id, project_id)
    REFERENCES public.actions (id, project_id)
    ON DELETE CASCADE,
  CONSTRAINT action_stands_feature_project_fkey
    FOREIGN KEY (map_feature_id, project_id)
    REFERENCES public.map_features (id, map_id)
    ON DELETE CASCADE
);

CREATE INDEX action_stands_map_feature_id_idx
  ON public.action_stands (map_feature_id);

CREATE INDEX action_stands_project_id_idx
  ON public.action_stands (project_id);

ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_stands ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.actions FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.action_stands FROM PUBLIC, anon;
REVOKE ALL ON SEQUENCE public.actions_id_seq FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.actions TO authenticated, service_role;
GRANT SELECT, INSERT, DELETE ON TABLE public.action_stands TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.actions_id_seq TO authenticated, service_role;

CREATE POLICY "Members can view actions"
  ON public.actions
  FOR SELECT
  TO authenticated
  USING ((SELECT private.is_project_member(project_id)));

CREATE POLICY "Members can insert actions"
  ON public.actions
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT private.is_project_member(project_id)));

CREATE POLICY "Members can update actions"
  ON public.actions
  FOR UPDATE
  TO authenticated
  USING ((SELECT private.is_project_member(project_id)))
  WITH CHECK ((SELECT private.is_project_member(project_id)));

CREATE POLICY "Members can delete actions"
  ON public.actions
  FOR DELETE
  TO authenticated
  USING ((SELECT private.is_project_member(project_id)));

CREATE POLICY "Members can view action stands"
  ON public.action_stands
  FOR SELECT
  TO authenticated
  USING ((SELECT private.is_project_member(project_id)));

CREATE POLICY "Members can insert action stands"
  ON public.action_stands
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT private.is_project_member(project_id)));

CREATE POLICY "Members can delete action stands"
  ON public.action_stands
  FOR DELETE
  TO authenticated
  USING ((SELECT private.is_project_member(project_id)));
