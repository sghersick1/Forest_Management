ALTER TABLE public.map_features
  DROP CONSTRAINT map_features_map_id_name_key;

CREATE UNIQUE INDEX map_features_map_id_name_lower_idx
  ON public.map_features (map_id, lower(name));
