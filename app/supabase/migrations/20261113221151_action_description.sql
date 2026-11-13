ALTER TABLE public.actions
  ADD COLUMN description text NOT NULL;

ALTER TABLE public.actions
  ADD CONSTRAINT actions_description_not_blank CHECK (char_length(btrim(description)) > 0);
