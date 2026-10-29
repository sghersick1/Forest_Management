SET local check_function_bodies = off;

CREATE SCHEMA "private";

CREATE OR REPLACE FUNCTION private.current_public_user_id()
  RETURNS bigint
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select id
  from public.public_users
  where auth_id = (select auth.uid());
$function$;

CREATE OR REPLACE FUNCTION private.is_project_member (
  target_project bigint
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
      and "user" = private.current_public_user_id()
  );
$function$;

CREATE OR REPLACE FUNCTION private.project_role_keeps_grant (
  role_id      bigint,
  next_project bigint,
  next_user    bigint,
  next_role    public.project_permissions
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
    where id = role_id
      and project = next_project
      and "user" = next_user
      and role = next_role
      and "user" = private.current_public_user_id()
  );
$function$;

CREATE POLICY "Users can update their own role rows" ON "public"."project_roles"
  FOR UPDATE
  TO "authenticated"
  USING (("user" = ( SELECT private.current_public_user_id() AS current_public_user_id)))
  WITH CHECK (( SELECT private.project_role_keeps_grant(project_roles.id, project_roles.project, project_roles."user", project_roles.role) AS project_role_keeps_grant));

CREATE POLICY "Users can view roles on their projects" ON "public"."project_roles"
  FOR SELECT
  TO "authenticated"
  USING (( SELECT private.is_project_member(project_roles.project) AS is_project_member));

CREATE POLICY "Users can update projects they belong to" ON "public"."projects"
  FOR UPDATE
  TO "authenticated"
  USING (( SELECT private.is_project_member(projects.id) AS is_project_member))
  WITH CHECK (( SELECT private.is_project_member(projects.id) AS is_project_member));

CREATE POLICY "Users can view projects they belong to" ON "public"."projects"
  FOR SELECT
  TO "authenticated"
  USING (( SELECT private.is_project_member(projects.id) AS is_project_member));

CREATE POLICY "Users can update their own row" ON "public"."public_users"
  FOR UPDATE
  TO "authenticated"
  USING ((auth_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((auth_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "Users can view their own row" ON "public"."public_users"
  FOR SELECT
  TO "authenticated"
  USING ((auth_id = ( SELECT auth.uid() AS uid)));

REVOKE ALL ON FUNCTION "private"."current_public_user_id"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."current_public_user_id"() TO "authenticated";

REVOKE ALL ON FUNCTION "private"."is_project_member"(bigint) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."is_project_member"(bigint) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."project_role_keeps_grant"(bigint, bigint, bigint, public.project_permissions) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."project_role_keeps_grant"(bigint, bigint, bigint, public.project_permissions) TO "authenticated";

GRANT USAGE ON SCHEMA "private" TO "authenticated";

