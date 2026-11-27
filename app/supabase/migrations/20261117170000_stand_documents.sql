CREATE TABLE public.stand_documents (
  project_id bigint NOT NULL,
  map_feature_id uuid NOT NULL,
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  edited_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  PRIMARY KEY (project_id, map_feature_id),
  CONSTRAINT stand_documents_feature_project_fkey
    FOREIGN KEY (map_feature_id, project_id)
    REFERENCES public.map_features (id, map_id)
    ON DELETE CASCADE
);
CREATE INDEX stand_documents_map_feature_id_idx
  ON public.stand_documents (map_feature_id);
ALTER TABLE public.stand_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.stand_documents FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.stand_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.stand_documents TO service_role;
CREATE POLICY "Members can view stand documents"
  ON public.stand_documents
  FOR SELECT
  TO authenticated
  USING ((SELECT private.is_project_member(project_id)));
CREATE POLICY "Editors can insert stand documents"
  ON public.stand_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT private.is_project_member(project_id))
    AND (SELECT private.role_rank(private.caller_project_role(project_id))) >= 2
  );
CREATE POLICY "Editors can update stand documents"
  ON public.stand_documents
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT private.is_project_member(project_id))
    AND (SELECT private.role_rank(private.caller_project_role(project_id))) >= 2
  )
  WITH CHECK (
    (SELECT private.is_project_member(project_id))
    AND (SELECT private.role_rank(private.caller_project_role(project_id))) >= 2
  );
CREATE POLICY "Editors can delete stand documents"
  ON public.stand_documents
  FOR DELETE
  TO authenticated
  USING (
    (SELECT private.is_project_member(project_id))
    AND (SELECT private.role_rank(private.caller_project_role(project_id))) >= 2
  );
