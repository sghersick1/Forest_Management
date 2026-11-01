ALTER TABLE public.projects
  ADD COLUMN created_by bigint REFERENCES public.public_users (id);

ALTER TABLE public.projects
  ALTER COLUMN created_by SET DEFAULT private.current_public_user_id();

CREATE INDEX projects_created_by_idx ON public.projects (created_by);

CREATE UNIQUE INDEX project_roles_one_owner
  ON public.project_roles (project)
  WHERE role = 'owner';

CREATE OR REPLACE FUNCTION private.is_project_owner(target_project bigint)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1
    from public.project_roles
    where project = target_project
      and "user" = private.current_public_user_id()
      and role = 'owner'
  );
$function$;

CREATE OR REPLACE FUNCTION private.project_has_no_roles(target_project bigint)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select not exists (
    select 1
    from public.project_roles
    where project = target_project
  );
$function$;

CREATE OR REPLACE FUNCTION private.project_has_owner(target_project bigint)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1
    from public.project_roles
    where project = target_project
      and role = 'owner'
  );
$function$;

CREATE OR REPLACE FUNCTION private.user_has_project_role(
  target_project bigint,
  target_user bigint
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1
    from public.project_roles
    where project = target_project
      and "user" = target_user
  );
$function$;

REVOKE ALL ON FUNCTION private.is_project_owner(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_project_owner(bigint) TO authenticated;

REVOKE ALL ON FUNCTION private.project_has_no_roles(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.project_has_no_roles(bigint) TO authenticated;

REVOKE ALL ON FUNCTION private.project_has_owner(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.project_has_owner(bigint) TO authenticated;

REVOKE ALL ON FUNCTION private.user_has_project_role(bigint, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.user_has_project_role(bigint, bigint) TO authenticated;

CREATE POLICY "Users can create their own projects" ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (SELECT private.current_public_user_id()));

DROP POLICY "Users can view projects they belong to" ON public.projects;

CREATE POLICY "Users can view projects they belong to" ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    (SELECT private.is_project_member(projects.id))
    OR created_by = (SELECT private.current_public_user_id())
  );

CREATE POLICY "Users can insert roles they are allowed to grant" ON public.project_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      "user" = (SELECT private.current_public_user_id())
      AND role = 'owner'::public.project_permissions
      AND EXISTS (
        SELECT 1
        FROM public.projects
        WHERE projects.id = project
          AND projects.created_by = (SELECT private.current_public_user_id())
      )
      AND NOT (SELECT private.project_has_owner(project))
      AND NOT (SELECT private.user_has_project_role(project, "user"))
    )
    OR (
      (SELECT private.is_project_owner(project))
      AND "user" <> (SELECT private.current_public_user_id())
      AND role IN (
        'editor'::public.project_permissions,
        'viewer'::public.project_permissions
      )
      AND NOT (SELECT private.user_has_project_role(project, "user"))
    )
    OR (
      (SELECT private.is_project_member(project))
      AND NOT (SELECT private.is_project_owner(project))
      AND "user" <> (SELECT private.current_public_user_id())
      AND role = 'viewer'::public.project_permissions
      AND NOT (SELECT private.user_has_project_role(project, "user"))
    )
  );

CREATE POLICY "Owners can delete roles on their projects" ON public.project_roles
  FOR DELETE
  TO authenticated
  USING ((SELECT private.is_project_owner(project)));

CREATE POLICY "Creators can delete their projects" ON public.projects
  FOR DELETE
  TO authenticated
  USING (
    created_by = (SELECT private.current_public_user_id())
    AND (
      (SELECT private.is_project_owner(projects.id))
      OR (SELECT private.project_has_no_roles(projects.id))
    )
  );
