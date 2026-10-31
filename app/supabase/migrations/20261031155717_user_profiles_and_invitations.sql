CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text,
  address text,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon;

GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO service_role;

CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

INSERT INTO public.profiles (id, address, display_name)
SELECT
  auth_users.id,
  users.address,
  nullif(
    btrim(
      coalesce(
        auth_users.raw_user_meta_data ->> 'full_name',
        auth_users.raw_user_meta_data ->> 'name',
        ''
      )
    ),
    ''
  )
FROM auth.users AS auth_users
LEFT JOIN public.public_users AS users
  ON users.auth_id = auth_users.id;

CREATE TABLE public.project_members (
  project_id bigint NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role public.project_permissions NOT NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  PRIMARY KEY (project_id, user_id)
);

CREATE UNIQUE INDEX project_members_one_owner
  ON public.project_members (project_id)
  WHERE role = 'owner';

CREATE INDEX project_members_user_id_idx
  ON public.project_members (user_id);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.project_members FROM PUBLIC, anon;

GRANT SELECT, INSERT, DELETE ON TABLE public.project_members TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_members TO service_role;

INSERT INTO public.project_members (project_id, user_id, role, created_at, updated_at)
SELECT
  roles.project,
  users.auth_id,
  roles.role,
  roles.created_at,
  roles.edited_at
FROM public.project_roles AS roles
JOIN public.public_users AS users
  ON users.id = roles."user"
JOIN public.profiles AS profiles
  ON profiles.id = users.auth_id;

CREATE TABLE public.project_invitations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id bigint NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.project_permissions NOT NULL,
  invited_by uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT project_invitations_email_normalized CHECK (email = lower(btrim(email))),
  CONSTRAINT project_invitations_role_grantable CHECK (role IN ('editor', 'viewer')),
  UNIQUE (project_id, email)
);

CREATE INDEX project_invitations_email_idx
  ON public.project_invitations (email);

CREATE INDEX project_invitations_invited_by_idx
  ON public.project_invitations (invited_by);

ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.project_invitations FROM PUBLIC, anon;

GRANT SELECT, DELETE ON TABLE public.project_invitations TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_invitations TO service_role;

REVOKE ALL ON SEQUENCE public.project_invitations_id_seq FROM PUBLIC, anon;

GRANT USAGE, SELECT ON SEQUENCE public.project_invitations_id_seq TO service_role;

DROP POLICY "Users can update their own role rows" ON public.project_roles;

DROP POLICY "Users can view roles on their projects" ON public.project_roles;

DROP POLICY "Users can insert roles they are allowed to grant" ON public.project_roles;

DROP POLICY "Owners can delete roles on their projects" ON public.project_roles;

DROP POLICY "Users can update projects they belong to" ON public.projects;

DROP POLICY "Users can view projects they belong to" ON public.projects;

DROP POLICY "Users can create their own projects" ON public.projects;

DROP POLICY "Creators can delete their projects" ON public.projects;

DROP POLICY "Users can update their own row" ON public.public_users;

DROP POLICY "Users can view their own row" ON public.public_users;

ALTER TABLE public.projects
  ALTER COLUMN created_by DROP DEFAULT;

ALTER TABLE public.projects
  ADD COLUMN created_by_user uuid;

UPDATE public.projects AS projects
SET created_by_user = users.auth_id
FROM public.public_users AS users
WHERE users.id = projects.created_by
  AND users.auth_id IS NOT NULL;

ALTER TABLE public.projects
  DROP CONSTRAINT projects_created_by_fkey;

DROP INDEX public.projects_created_by_idx;

ALTER TABLE public.projects
  DROP COLUMN created_by;

ALTER TABLE public.projects
  RENAME COLUMN created_by_user TO created_by;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles (id) ON DELETE SET NULL;

CREATE INDEX projects_created_by_idx ON public.projects (created_by);

ALTER TABLE public.projects
  ALTER COLUMN created_by SET DEFAULT auth.uid();

DROP FUNCTION public.project_members(bigint);

DROP FUNCTION private.project_members(bigint);

DROP FUNCTION private.project_role_keeps_grant(bigint, bigint, bigint, public.project_permissions);

DROP FUNCTION private.user_has_project_role(bigint, bigint);

DROP FUNCTION private.project_has_no_roles(bigint);

DROP FUNCTION private.project_has_owner(bigint);

DROP FUNCTION private.is_project_owner(bigint);

DROP FUNCTION private.is_project_member(bigint);

DROP FUNCTION private.current_public_user_id();

DROP TABLE public.project_roles;

DROP TABLE public.public_users;

CREATE FUNCTION private.role_rank(target_role public.project_permissions)
  RETURNS integer
  LANGUAGE sql
  IMMUTABLE
  SET search_path TO ''
  AS $function$
  SELECT CASE target_role
    WHEN 'owner' THEN 3
    WHEN 'editor' THEN 2
    ELSE 1
  END;
$function$;

CREATE FUNCTION private.caller_project_role(target_project bigint)
  RETURNS public.project_permissions
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  SELECT role
  FROM public.project_members
  WHERE project_id = target_project
    AND user_id = (SELECT auth.uid());
$function$;

CREATE FUNCTION private.is_project_member(target_project bigint)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE project_id = target_project
      AND user_id = (SELECT auth.uid())
  );
$function$;

CREATE FUNCTION private.is_project_owner(target_project bigint)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE project_id = target_project
      AND user_id = (SELECT auth.uid())
      AND role = 'owner'
  );
$function$;

CREATE FUNCTION private.project_has_owner(target_project bigint)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE project_id = target_project
      AND role = 'owner'
  );
$function$;

CREATE FUNCTION private.project_has_no_members(target_project bigint)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE project_id = target_project
  );
$function$;

CREATE FUNCTION private.user_has_project_member(
  target_project bigint,
  target_user uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE project_id = target_project
      AND user_id = target_user
  );
$function$;

REVOKE ALL ON FUNCTION private.role_rank(public.project_permissions) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.role_rank(public.project_permissions) TO authenticated;

REVOKE ALL ON FUNCTION private.caller_project_role(bigint) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.caller_project_role(bigint) TO authenticated;

REVOKE ALL ON FUNCTION private.is_project_member(bigint) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.is_project_member(bigint) TO authenticated;

REVOKE ALL ON FUNCTION private.is_project_owner(bigint) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.is_project_owner(bigint) TO authenticated;

REVOKE ALL ON FUNCTION private.project_has_owner(bigint) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.project_has_owner(bigint) TO authenticated;

REVOKE ALL ON FUNCTION private.project_has_no_members(bigint) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.project_has_no_members(bigint) TO authenticated;

REVOKE ALL ON FUNCTION private.user_has_project_member(bigint, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.user_has_project_member(bigint, uuid) TO authenticated;

CREATE POLICY "Creators claim the owner role"
  ON public.project_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND role = 'owner'::public.project_permissions
    AND EXISTS (
      SELECT 1
      FROM public.projects
      WHERE projects.id = project_id
        AND projects.created_by = (SELECT auth.uid())
    )
    AND NOT (SELECT private.project_has_owner(project_id))
    AND NOT (SELECT private.user_has_project_member(project_id, user_id))
  );

CREATE POLICY "Members can view project members"
  ON public.project_members
  FOR SELECT
  TO authenticated
  USING ((SELECT private.is_project_member(project_id)));

CREATE POLICY "Members remove people below their rank"
  ON public.project_members
  FOR DELETE
  TO authenticated
  USING (
    (SELECT private.role_rank(private.caller_project_role(project_id)))
    > (SELECT private.role_rank(role))
  );

CREATE POLICY "Members can view invitations"
  ON public.project_invitations
  FOR SELECT
  TO authenticated
  USING ((SELECT private.is_project_member(project_id)));

CREATE POLICY "Members revoke invitations below their rank"
  ON public.project_invitations
  FOR DELETE
  TO authenticated
  USING (
    (SELECT private.role_rank(private.caller_project_role(project_id)))
    > (SELECT private.role_rank(role))
  );

CREATE POLICY "Users can create their own projects"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Users can view projects they belong to"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    (SELECT private.is_project_member(projects.id))
    OR (
      created_by = (SELECT auth.uid())
      AND (SELECT private.project_has_no_members(projects.id))
    )
  );

CREATE POLICY "Users can update projects they belong to"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING ((SELECT private.is_project_member(projects.id)))
  WITH CHECK ((SELECT private.is_project_member(projects.id)));

CREATE POLICY "Creators can delete their projects"
  ON public.projects
  FOR DELETE
  TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    AND (
      (SELECT private.is_project_owner(projects.id))
      OR (SELECT private.project_has_no_members(projects.id))
    )
  );

CREATE FUNCTION private.handle_auth_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    nullif(
      btrim(
        coalesce(
          NEW.raw_user_meta_data ->> 'full_name',
          NEW.raw_user_meta_data ->> 'name',
          ''
        )
      ),
      ''
    )
  )
  ON CONFLICT (id) DO NOTHING;

  IF NEW.email IS NOT NULL THEN
    INSERT INTO public.project_members (project_id, user_id, role)
    SELECT invitations.project_id, NEW.id, invitations.role
    FROM public.project_invitations AS invitations
    WHERE invitations.email = lower(NEW.email)
    ON CONFLICT (project_id, user_id) DO UPDATE
    SET
      role = CASE
        WHEN private.role_rank(EXCLUDED.role) > private.role_rank(public.project_members.role)
          THEN EXCLUDED.role
        ELSE public.project_members.role
      END,
      updated_at = pg_catalog.now();

    DELETE FROM public.project_invitations
    WHERE email = lower(NEW.email);
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.handle_auth_user() FROM PUBLIC;

GRANT USAGE ON SCHEMA private TO supabase_auth_admin;

GRANT EXECUTE ON FUNCTION private.handle_auth_user() TO supabase_auth_admin;

CREATE TRIGGER on_auth_user_profile
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION private.handle_auth_user();

CREATE FUNCTION private.invite_to_project(
  target_project bigint,
  target_email text,
  target_role public.project_permissions
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  caller uuid;
  normalized text;
  caller_role public.project_permissions;
  existing_user uuid;
  existing_role public.project_permissions;
  pending_role public.project_permissions;
BEGIN
  caller := auth.uid();
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not signed in.' USING ERRCODE = '42501';
  END IF;

  normalized := lower(btrim(coalesce(target_email, '')));
  IF normalized = '' OR position('@' IN normalized) = 0 THEN
    RAISE EXCEPTION 'Enter an email address.' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = caller
      AND lower(email) = normalized
  ) THEN
    RAISE EXCEPTION 'You cannot invite yourself.' USING ERRCODE = '42501';
  END IF;

  caller_role := private.caller_project_role(target_project);

  IF target_role NOT IN ('editor', 'viewer')
    OR caller_role IS NULL
    OR private.role_rank(caller_role) < private.role_rank(target_role)
  THEN
    RAISE EXCEPTION 'You cannot grant that role.' USING ERRCODE = '42501';
  END IF;

  SELECT id
  INTO existing_user
  FROM auth.users
  WHERE lower(email) = normalized
  LIMIT 1;

  IF existing_user IS NOT NULL THEN
    SELECT members.role
    INTO existing_role
    FROM public.project_members AS members
    WHERE members.project_id = target_project
      AND members.user_id = existing_user;

    IF existing_role IS NULL THEN
      INSERT INTO public.project_members (project_id, user_id, role)
      VALUES (target_project, existing_user, target_role);
      RETURN 'member';
    END IF;

    IF existing_role = target_role THEN
      RETURN 'member';
    END IF;

    IF private.role_rank(caller_role) > private.role_rank(existing_role) THEN
      UPDATE public.project_members
      SET role = target_role, updated_at = pg_catalog.now()
      WHERE project_id = target_project
        AND user_id = existing_user;
      RETURN 'member';
    END IF;

    RAISE EXCEPTION 'You cannot change that member.' USING ERRCODE = '42501';
  END IF;

  SELECT invitations.role
  INTO pending_role
  FROM public.project_invitations AS invitations
  WHERE invitations.project_id = target_project
    AND invitations.email = normalized;

  IF pending_role IS NULL THEN
    INSERT INTO public.project_invitations (project_id, email, role, invited_by)
    VALUES (target_project, normalized, target_role, caller);
    RETURN 'invited';
  END IF;

  IF pending_role = target_role THEN
    RETURN 'invited';
  END IF;

  IF private.role_rank(caller_role) >= private.role_rank(pending_role) THEN
    UPDATE public.project_invitations
    SET
      role = target_role,
      invited_by = caller,
      updated_at = pg_catalog.now()
    WHERE project_id = target_project
      AND email = normalized;
    RETURN 'invited';
  END IF;

  RAISE EXCEPTION 'You cannot change that invitation.' USING ERRCODE = '42501';
END;
$function$;

REVOKE ALL ON FUNCTION private.invite_to_project(bigint, text, public.project_permissions) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.invite_to_project(bigint, text, public.project_permissions) TO authenticated;

CREATE FUNCTION public.invite_to_project(
  target_project bigint,
  target_email text,
  target_role public.project_permissions
)
  RETURNS text
  LANGUAGE sql
  VOLATILE
  SECURITY INVOKER
  SET search_path TO ''
  AS $function$
  SELECT private.invite_to_project(target_project, target_email, target_role);
$function$;

REVOKE ALL ON FUNCTION public.invite_to_project(bigint, text, public.project_permissions) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.invite_to_project(bigint, text, public.project_permissions) TO authenticated;

CREATE FUNCTION private.project_members(target_project bigint)
  RETURNS TABLE (
    user_id uuid,
    role public.project_permissions,
    email text,
    name text
  )
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  SELECT
    members.user_id,
    members.role,
    users.email,
    nullif(
      btrim(
        coalesce(
          profiles.display_name,
          users.raw_user_meta_data ->> 'full_name',
          users.raw_user_meta_data ->> 'name',
          ''
        )
      ),
      ''
    )
  FROM public.project_members AS members
  JOIN public.profiles AS profiles
    ON profiles.id = members.user_id
  JOIN auth.users AS users
    ON users.id = members.user_id
  WHERE members.project_id = target_project
    AND private.is_project_member(target_project)
  ORDER BY
    private.role_rank(members.role) DESC,
    lower(users.email);
$function$;

REVOKE ALL ON FUNCTION private.project_members(bigint) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.project_members(bigint) TO authenticated;

CREATE FUNCTION public.project_members(target_project bigint)
  RETURNS TABLE (
    user_id uuid,
    role public.project_permissions,
    email text,
    name text
  )
  LANGUAGE sql
  STABLE
  SECURITY INVOKER
  SET search_path TO ''
  AS $function$
  SELECT
    user_id,
    role,
    email,
    name
  FROM private.project_members(target_project);
$function$;

REVOKE ALL ON FUNCTION public.project_members(bigint) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.project_members(bigint) TO authenticated;
