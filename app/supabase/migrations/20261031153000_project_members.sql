CREATE OR REPLACE FUNCTION private.project_members(target_project bigint)
  RETURNS TABLE (
    user_id bigint,
    role public.project_permissions,
    email text,
    name text
  )
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select
    roles."user",
    roles.role,
    users.email,
    nullif(
      btrim(
        coalesce(
          users.raw_user_meta_data ->> 'full_name',
          users.raw_user_meta_data ->> 'name',
          ''
        )
      ),
      ''
    )
  from public.project_roles as roles
  join public.public_users as members
    on members.id = roles."user"
  join auth.users as users
    on users.id = members.auth_id
  where roles.project = target_project
    and private.is_project_member(target_project)
  order by
    case roles.role
      when 'owner' then 0
      when 'editor' then 1
      else 2
    end,
    lower(users.email);
$function$;

REVOKE ALL ON FUNCTION private.project_members(bigint) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.project_members(bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.project_members(target_project bigint)
  RETURNS TABLE (
    user_id bigint,
    role public.project_permissions,
    email text,
    name text
  )
  LANGUAGE sql
  STABLE
  SECURITY INVOKER
  SET search_path TO ''
  AS $function$
  select
    user_id,
    role,
    email,
    name
  from private.project_members(target_project);
$function$;

REVOKE ALL ON FUNCTION public.project_members(bigint) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.project_members(bigint) TO authenticated;
