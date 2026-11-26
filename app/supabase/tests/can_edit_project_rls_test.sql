BEGIN;
SELECT plan(23);

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'a1111111-1111-4111-8111-111111111111',
    'authenticated',
    'authenticated',
    'edit-owner@forest.test',
    extensions.crypt('edit-owner', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a2222222-2222-4222-8222-222222222222',
    'authenticated',
    'authenticated',
    'edit-editor@forest.test',
    extensions.crypt('edit-editor', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a3333333-3333-4333-8333-333333333333',
    'authenticated',
    'authenticated',
    'edit-viewer@forest.test',
    extensions.crypt('edit-viewer', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

INSERT INTO public.projects ("Title", created_by)
VALUES ('Edit Plot', 'a1111111-1111-4111-8111-111111111111');

INSERT INTO public.projects ("Title", created_by)
VALUES ('Empty Plot', 'a1111111-1111-4111-8111-111111111111');

SELECT set_config(
  'test.project_id',
  (SELECT id::text FROM public.projects WHERE "Title" = 'Edit Plot'),
  true
);

SELECT set_config(
  'test.empty_project_id',
  (SELECT id::text FROM public.projects WHERE "Title" = 'Empty Plot'),
  true
);

INSERT INTO public.project_members (project_id, user_id, role)
VALUES
  (current_setting('test.project_id')::bigint, 'a1111111-1111-4111-8111-111111111111', 'owner'),
  (current_setting('test.project_id')::bigint, 'a2222222-2222-4222-8222-222222222222', 'editor'),
  (current_setting('test.project_id')::bigint, 'a3333333-3333-4333-8333-333333333333', 'viewer'),
  (current_setting('test.empty_project_id')::bigint, 'a1111111-1111-4111-8111-111111111111', 'owner'),
  (current_setting('test.empty_project_id')::bigint, 'a2222222-2222-4222-8222-222222222222', 'editor'),
  (current_setting('test.empty_project_id')::bigint, 'a3333333-3333-4333-8333-333333333333', 'viewer');

DELETE FROM public.maps
WHERE project_id = current_setting('test.empty_project_id')::bigint;

INSERT INTO public.map_features (id, map_id, geometry, name, description)
VALUES
  (
    'f1111111-1111-4111-8111-111111111111',
    current_setting('test.project_id')::bigint,
    '{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,0]]]}'::jsonb,
    'Stand',
    ''
  ),
  (
    'f2222222-2222-4222-8222-222222222222',
    current_setting('test.project_id')::bigint,
    '{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,0]]]}'::jsonb,
    'Other',
    ''
  );

INSERT INTO public.actions (project_id, name, status, description)
VALUES (
  current_setting('test.project_id')::bigint,
  'Thin',
  'planned',
  'notes'
);

SELECT set_config(
  'test.action_id',
  (
    SELECT id::text
    FROM public.actions
    WHERE project_id = current_setting('test.project_id')::bigint
      AND name = 'Thin'
  ),
  true
);

INSERT INTO public.action_features (action_id, project_id, map_feature_id)
VALUES (
  current_setting('test.action_id')::bigint,
  current_setting('test.project_id')::bigint,
  'f1111111-1111-4111-8111-111111111111'
);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'a3333333-3333-4333-8333-333333333333';

UPDATE public.projects
SET "Title" = 'Hacked'
WHERE id = current_setting('test.project_id')::bigint;

SELECT is(
  (SELECT "Title" FROM public.projects WHERE id = current_setting('test.project_id')::bigint),
  'Edit Plot',
  'a viewer cannot rename the project'
);

UPDATE public.maps
SET map_zoom = 3
WHERE project_id = current_setting('test.project_id')::bigint;

SELECT is(
  (SELECT map_zoom FROM public.maps WHERE project_id = current_setting('test.project_id')::bigint),
  15::double precision,
  'a viewer cannot move the camera'
);

DELETE FROM public.maps
WHERE project_id = current_setting('test.project_id')::bigint;

SELECT is(
  (SELECT count(*)::int FROM public.maps WHERE project_id = current_setting('test.project_id')::bigint),
  1,
  'a viewer cannot delete the map'
);

SELECT throws_ok(
  $$
    INSERT INTO public.maps (project_id)
    VALUES (current_setting('test.empty_project_id')::bigint)
  $$,
  '42501',
  NULL,
  'a viewer cannot insert a map'
);

SELECT throws_ok(
  $$
    INSERT INTO public.map_features (id, map_id, geometry, name)
    VALUES (
      'f3333333-3333-4333-8333-333333333333',
      current_setting('test.project_id')::bigint,
      '{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,0]]]}'::jsonb,
      'Viewer stand'
    )
  $$,
  '42501',
  NULL,
  'a viewer cannot insert a feature'
);

UPDATE public.map_features
SET name = 'Hacked'
WHERE id = 'f1111111-1111-4111-8111-111111111111';

SELECT is(
  (SELECT name FROM public.map_features WHERE id = 'f1111111-1111-4111-8111-111111111111'),
  'Stand',
  'a viewer cannot rename a feature'
);

DELETE FROM public.map_features
WHERE id = 'f1111111-1111-4111-8111-111111111111';

SELECT is(
  (SELECT count(*)::int FROM public.map_features WHERE id = 'f1111111-1111-4111-8111-111111111111'),
  1,
  'a viewer cannot delete a feature'
);

SELECT throws_ok(
  $$
    INSERT INTO public.actions (project_id, name, status, description)
    VALUES (
      current_setting('test.project_id')::bigint,
      'Viewer action',
      'planned',
      'no'
    )
  $$,
  '42501',
  NULL,
  'a viewer cannot insert an action'
);

UPDATE public.actions
SET name = 'Hacked'
WHERE id = current_setting('test.action_id')::bigint;

SELECT is(
  (SELECT name FROM public.actions WHERE id = current_setting('test.action_id')::bigint),
  'Thin',
  'a viewer cannot rename an action'
);

DELETE FROM public.actions
WHERE id = current_setting('test.action_id')::bigint;

SELECT is(
  (SELECT count(*)::int FROM public.actions WHERE id = current_setting('test.action_id')::bigint),
  1,
  'a viewer cannot delete an action'
);

SELECT throws_ok(
  $$
    INSERT INTO public.action_features (action_id, project_id, map_feature_id)
    VALUES (
      current_setting('test.action_id')::bigint,
      current_setting('test.project_id')::bigint,
      'f2222222-2222-4222-8222-222222222222'
    )
  $$,
  '42501',
  NULL,
  'a viewer cannot link an action'
);

DELETE FROM public.action_features
WHERE action_id = current_setting('test.action_id')::bigint;

SELECT is(
  (
    SELECT count(*)::int
    FROM public.action_features
    WHERE action_id = current_setting('test.action_id')::bigint
  ),
  1,
  'a viewer cannot unlink an action'
);

SET LOCAL request.jwt.claim.sub = 'a2222222-2222-4222-8222-222222222222';

UPDATE public.projects
SET "Title" = 'Edit Plot Renamed'
WHERE id = current_setting('test.project_id')::bigint;

SELECT is(
  (SELECT "Title" FROM public.projects WHERE id = current_setting('test.project_id')::bigint),
  'Edit Plot Renamed',
  'an editor can rename the project'
);

UPDATE public.maps
SET map_zoom = 12
WHERE project_id = current_setting('test.project_id')::bigint;

SELECT is(
  (SELECT map_zoom FROM public.maps WHERE project_id = current_setting('test.project_id')::bigint),
  12::double precision,
  'an editor can move the camera'
);

UPDATE public.map_features
SET name = 'Stand renamed'
WHERE id = 'f1111111-1111-4111-8111-111111111111';

SELECT is(
  (SELECT name FROM public.map_features WHERE id = 'f1111111-1111-4111-8111-111111111111'),
  'Stand renamed',
  'an editor can rename a feature'
);

SELECT lives_ok(
  $$
    INSERT INTO public.map_features (id, map_id, geometry, name)
    VALUES (
      'f3333333-3333-4333-8333-333333333333',
      current_setting('test.project_id')::bigint,
      '{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,0]]]}'::jsonb,
      'Editor stand'
    )
  $$,
  'an editor can insert a feature'
);

UPDATE public.actions
SET name = 'Thin renamed'
WHERE id = current_setting('test.action_id')::bigint;

SELECT is(
  (SELECT name FROM public.actions WHERE id = current_setting('test.action_id')::bigint),
  'Thin renamed',
  'an editor can rename an action'
);

SELECT lives_ok(
  $$
    INSERT INTO public.actions (project_id, name, status, description)
    VALUES (
      current_setting('test.project_id')::bigint,
      'Editor action',
      'planned',
      'yes'
    )
  $$,
  'an editor can insert an action'
);

SELECT set_config(
  'test.editor_action_id',
  (
    SELECT id::text
    FROM public.actions
    WHERE project_id = current_setting('test.project_id')::bigint
      AND name = 'Editor action'
  ),
  true
);

SELECT lives_ok(
  $$
    INSERT INTO public.action_features (action_id, project_id, map_feature_id)
    VALUES (
      current_setting('test.editor_action_id')::bigint,
      current_setting('test.project_id')::bigint,
      'f1111111-1111-4111-8111-111111111111'
    )
  $$,
  'an editor can link an action'
);

DELETE FROM public.action_features
WHERE action_id = current_setting('test.editor_action_id')::bigint;

SELECT is(
  (
    SELECT count(*)::int
    FROM public.action_features
    WHERE action_id = current_setting('test.editor_action_id')::bigint
  ),
  0,
  'an editor can unlink an action'
);

DELETE FROM public.map_features
WHERE id = 'f3333333-3333-4333-8333-333333333333';

SELECT is(
  (SELECT count(*)::int FROM public.map_features WHERE id = 'f3333333-3333-4333-8333-333333333333'),
  0,
  'an editor can delete a feature'
);

DELETE FROM public.actions
WHERE id = current_setting('test.editor_action_id')::bigint;

SELECT is(
  (SELECT count(*)::int FROM public.actions WHERE id = current_setting('test.editor_action_id')::bigint),
  0,
  'an editor can delete an action'
);

SELECT lives_ok(
  $$
    INSERT INTO public.maps (project_id)
    VALUES (current_setting('test.empty_project_id')::bigint)
  $$,
  'an editor can insert a map'
);

SELECT * FROM finish();
ROLLBACK;
