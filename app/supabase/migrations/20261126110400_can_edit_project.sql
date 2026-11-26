CREATE FUNCTION private.can_edit_project(target_project bigint)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  SELECT private.caller_project_role(target_project) IN (
    'owner'::public.project_permissions,
    'editor'::public.project_permissions
  );
$function$;

REVOKE ALL ON FUNCTION private.can_edit_project(bigint) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.can_edit_project(bigint) TO authenticated;

DROP POLICY "Users can update projects they belong to" ON public.projects;

CREATE POLICY "Editors can update projects"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING ((SELECT private.can_edit_project(projects.id)))
  WITH CHECK ((SELECT private.can_edit_project(projects.id)));

DROP POLICY "Members can insert their map" ON public.maps;
DROP POLICY "Members can update their map" ON public.maps;
DROP POLICY "Members can delete their map" ON public.maps;

CREATE POLICY "Editors can insert their map"
  ON public.maps
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT private.can_edit_project(project_id)));

CREATE POLICY "Editors can update their map"
  ON public.maps
  FOR UPDATE
  TO authenticated
  USING ((SELECT private.can_edit_project(project_id)))
  WITH CHECK ((SELECT private.can_edit_project(project_id)));

CREATE POLICY "Editors can delete their map"
  ON public.maps
  FOR DELETE
  TO authenticated
  USING ((SELECT private.can_edit_project(project_id)));

DROP POLICY "Members can insert map features" ON public.map_features;
DROP POLICY "Members can update map features" ON public.map_features;
DROP POLICY "Members can delete map features" ON public.map_features;

CREATE POLICY "Editors can insert map features"
  ON public.map_features
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT private.can_edit_project(map_id)));

CREATE POLICY "Editors can update map features"
  ON public.map_features
  FOR UPDATE
  TO authenticated
  USING ((SELECT private.can_edit_project(map_id)))
  WITH CHECK ((SELECT private.can_edit_project(map_id)));

CREATE POLICY "Editors can delete map features"
  ON public.map_features
  FOR DELETE
  TO authenticated
  USING ((SELECT private.can_edit_project(map_id)));

DROP POLICY "Members can insert actions" ON public.actions;
DROP POLICY "Members can update actions" ON public.actions;
DROP POLICY "Members can delete actions" ON public.actions;

CREATE POLICY "Editors can insert actions"
  ON public.actions
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT private.can_edit_project(project_id)));

CREATE POLICY "Editors can update actions"
  ON public.actions
  FOR UPDATE
  TO authenticated
  USING ((SELECT private.can_edit_project(project_id)))
  WITH CHECK ((SELECT private.can_edit_project(project_id)));

CREATE POLICY "Editors can delete actions"
  ON public.actions
  FOR DELETE
  TO authenticated
  USING ((SELECT private.can_edit_project(project_id)));

DROP POLICY "Members can insert action features" ON public.action_features;
DROP POLICY "Members can delete action features" ON public.action_features;

CREATE POLICY "Editors can insert action features"
  ON public.action_features
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT private.can_edit_project(project_id)));

CREATE POLICY "Editors can delete action features"
  ON public.action_features
  FOR DELETE
  TO authenticated
  USING ((SELECT private.can_edit_project(project_id)));
