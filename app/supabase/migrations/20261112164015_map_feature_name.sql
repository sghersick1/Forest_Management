ALTER TABLE public.map_features ADD COLUMN name text;

WITH numbered AS (
  SELECT
    id,
    geometry->>'type' AS feature_type,
    row_number() OVER (
      PARTITION BY map_id, geometry->>'type'
      ORDER BY edited_at, id
    ) AS feature_number
  FROM public.map_features
)
UPDATE public.map_features AS feature
SET name = numbered.feature_type || ' ' || numbered.feature_number
FROM numbered
WHERE feature.id = numbered.id;

ALTER TABLE public.map_features
  ALTER COLUMN name SET NOT NULL;

ALTER TABLE public.map_features
  ADD CONSTRAINT map_features_map_id_name_key UNIQUE (map_id, name);
