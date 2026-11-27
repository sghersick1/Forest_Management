ALTER TABLE public.action_stands RENAME TO action_features;
ALTER TABLE public.action_features
  RENAME CONSTRAINT action_stands_pkey TO action_features_pkey;
ALTER TABLE public.action_features
  RENAME CONSTRAINT action_stands_action_project_fkey TO action_features_action_project_fkey;
ALTER TABLE public.action_features
  RENAME CONSTRAINT action_stands_feature_project_fkey TO action_features_feature_project_fkey;
ALTER INDEX public.action_stands_map_feature_id_idx
  RENAME TO action_features_map_feature_id_idx;
ALTER INDEX public.action_stands_project_id_idx
  RENAME TO action_features_project_id_idx;
ALTER POLICY "Members can view action stands"
  ON public.action_features
  RENAME TO "Members can view action features";
ALTER POLICY "Members can insert action stands"
  ON public.action_features
  RENAME TO "Members can insert action features";
ALTER POLICY "Members can delete action stands"
  ON public.action_features
  RENAME TO "Members can delete action features";
