CREATE TABLE public.project_document_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id bigint NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled section',
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  edited_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT project_document_sections_title_not_blank CHECK (char_length(btrim(title)) > 0)
);
CREATE INDEX project_document_sections_order_idx
  ON public.project_document_sections (project_id, sort_order, created_at);
ALTER TABLE public.project_document_sections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.project_document_sections FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_document_sections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_document_sections TO service_role;
CREATE POLICY "Members can view project document sections"
  ON public.project_document_sections
  FOR SELECT
  TO authenticated
  USING ((SELECT private.is_project_member(project_id)));
CREATE POLICY "Editors can insert project document sections"
  ON public.project_document_sections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT private.is_project_member(project_id))
    AND (SELECT private.role_rank(private.caller_project_role(project_id))) >= 2
  );
CREATE POLICY "Editors can update project document sections"
  ON public.project_document_sections
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
CREATE POLICY "Editors can delete project document sections"
  ON public.project_document_sections
  FOR DELETE
  TO authenticated
  USING (
    (SELECT private.is_project_member(project_id))
    AND (SELECT private.role_rank(private.caller_project_role(project_id))) >= 2
  );
