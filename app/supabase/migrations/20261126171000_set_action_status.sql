-- Members may set action status. Editors keep full row updates via RLS.
-- Viewers call this RPC so status changes without opening rename/delete.

CREATE FUNCTION private.set_action_status(
  target_project bigint,
  target_action bigint,
  next_status text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in.' USING ERRCODE = '42501';
  END IF;

  IF next_status NOT IN ('planned', 'in-progress', 'done', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid status.' USING ERRCODE = '22023';
  END IF;

  IF NOT (SELECT private.is_project_member(target_project)) THEN
    RAISE EXCEPTION 'You are not a member of this project.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.actions
  SET
    status = next_status,
    edited_at = pg_catalog.now()
  WHERE id = target_action
    AND project_id = target_project;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Action not found.' USING ERRCODE = 'P0002';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION private.set_action_status(bigint, bigint, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.set_action_status(bigint, bigint, text) TO authenticated;

CREATE FUNCTION public.set_action_status(
  target_project bigint,
  target_action bigint,
  next_status text
)
  RETURNS void
  LANGUAGE sql
  VOLATILE
  SECURITY INVOKER
  SET search_path TO ''
  AS $function$
  SELECT private.set_action_status(target_project, target_action, next_status);
$function$;

REVOKE ALL ON FUNCTION public.set_action_status(bigint, bigint, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.set_action_status(bigint, bigint, text) TO authenticated;
