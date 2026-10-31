CREATE FUNCTION private.delete_project(target_project bigint)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  caller uuid;
  caller_role public.project_permissions;
  successor uuid;
BEGIN
  caller := auth.uid();
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not signed in.' USING ERRCODE = '42501';
  END IF;

  PERFORM projects.id
  FROM public.projects AS projects
  WHERE projects.id = target_project
  FOR UPDATE;

  SELECT members.role
  INTO caller_role
  FROM public.project_members AS members
  WHERE members.project_id = target_project
    AND members.user_id = caller;

  IF caller_role IS NULL THEN
    RAISE EXCEPTION 'You are not a member of this project.' USING ERRCODE = '42501';
  END IF;

  IF caller_role <> 'owner' THEN
    DELETE FROM public.project_members
    WHERE project_id = target_project
      AND user_id = caller;

    RETURN 'left';
  END IF;

  SELECT members.user_id
  INTO successor
  FROM public.project_members AS members
  WHERE members.project_id = target_project
    AND members.role = 'editor'
  ORDER BY members.created_at ASC, members.user_id ASC
  LIMIT 1;

  IF successor IS NOT NULL THEN
    DELETE FROM public.project_members
    WHERE project_id = target_project
      AND user_id = caller;

    UPDATE public.project_members
    SET role = 'owner', updated_at = pg_catalog.now()
    WHERE project_id = target_project
      AND user_id = successor;

    UPDATE public.projects
    SET created_by = successor
    WHERE id = target_project;

    RETURN 'transferred';
  END IF;

  DELETE FROM public.projects
  WHERE id = target_project;

  RETURN 'deleted';
END;
$function$;

REVOKE ALL ON FUNCTION private.delete_project(bigint) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.delete_project(bigint) TO authenticated;

CREATE FUNCTION public.delete_project(target_project bigint)
  RETURNS text
  LANGUAGE sql
  VOLATILE
  SECURITY INVOKER
  SET search_path TO ''
  AS $function$
  SELECT private.delete_project(target_project);
$function$;

REVOKE ALL ON FUNCTION public.delete_project(bigint) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.delete_project(bigint) TO authenticated;

DROP POLICY "Creators can delete their projects" ON public.projects;
