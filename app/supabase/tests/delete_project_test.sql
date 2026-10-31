BEGIN;
SELECT plan(29);

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
    'a1000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'owner-delete@forest.test',
    extensions.crypt('owner-delete', extensions.gen_salt('bf')),
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
    'a1000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'editor-late@forest.test',
    extensions.crypt('editor-late', extensions.gen_salt('bf')),
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
    'a1000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'editor-early@forest.test',
    extensions.crypt('editor-early', extensions.gen_salt('bf')),
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
    'a1000000-0000-4000-8000-000000000004',
    'authenticated',
    'authenticated',
    'viewer-delete@forest.test',
    extensions.crypt('viewer-delete', extensions.gen_salt('bf')),
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
    'a1000000-0000-4000-8000-000000000005',
    'authenticated',
    'authenticated',
    'outsider-delete@forest.test',
    extensions.crypt('outsider-delete', extensions.gen_salt('bf')),
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
    'a1000000-0000-4000-8000-000000000006',
    'authenticated',
    'authenticated',
    'viewer-extra@forest.test',
    extensions.crypt('viewer-extra', extensions.gen_salt('bf')),
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
    'b1000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'editor-low@forest.test',
    extensions.crypt('editor-low', extensions.gen_salt('bf')),
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
    'b1000000-0000-4000-8000-000000000009',
    'authenticated',
    'authenticated',
    'editor-high@forest.test',
    extensions.crypt('editor-high', extensions.gen_salt('bf')),
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

WITH inserted AS (
  INSERT INTO public.projects ("Title", created_by)
  VALUES (
    'Direct delete',
    'a1000000-0000-4000-8000-000000000001'
  )
  RETURNING id
)
SELECT set_config('test.direct_id', (SELECT id::text FROM inserted), true);

INSERT INTO public.project_members (project_id, user_id, role)
VALUES
  (
    current_setting('test.direct_id')::bigint,
    'a1000000-0000-4000-8000-000000000001',
    'owner'
  ),
  (
    current_setting('test.direct_id')::bigint,
    'a1000000-0000-4000-8000-000000000003',
    'editor'
  );

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'a1000000-0000-4000-8000-000000000001';

SELECT lives_ok(
  $$delete from public.projects where id = current_setting('test.direct_id')::bigint$$,
  'a creator delete while an editor remains does not raise'
);

RESET ROLE;

SELECT is(
  (
    SELECT count(*)::int
    FROM public.projects
    WHERE id = current_setting('test.direct_id')::bigint
  ),
  1,
  'a creator delete leaves the project while an editor remains'
);

WITH inserted AS (
  INSERT INTO public.projects ("Title", created_by)
  VALUES (
    'Viewer leaves',
    'a1000000-0000-4000-8000-000000000001'
  )
  RETURNING id
)
SELECT set_config('test.viewer_id', (SELECT id::text FROM inserted), true);

INSERT INTO public.project_members (project_id, user_id, role)
VALUES
  (
    current_setting('test.viewer_id')::bigint,
    'a1000000-0000-4000-8000-000000000001',
    'owner'
  ),
  (
    current_setting('test.viewer_id')::bigint,
    'a1000000-0000-4000-8000-000000000003',
    'editor'
  ),
  (
    current_setting('test.viewer_id')::bigint,
    'a1000000-0000-4000-8000-000000000004',
    'viewer'
  );

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'a1000000-0000-4000-8000-000000000004';

SELECT is(
  public.delete_project(current_setting('test.viewer_id')::bigint),
  'left',
  'a viewer leaves the project'
);

RESET ROLE;

SELECT is(
  (
    SELECT count(*)::int
    FROM public.project_members
    WHERE project_id = current_setting('test.viewer_id')::bigint
      AND user_id = 'a1000000-0000-4000-8000-000000000004'
  ),
  0,
  'the viewer membership is gone'
);

SELECT is(
  (
    SELECT count(*)::int
    FROM public.projects
    WHERE id = current_setting('test.viewer_id')::bigint
  ),
  1,
  'a viewer leave keeps the project'
);

SELECT is(
  (
    SELECT role::text
    FROM public.project_members
    WHERE project_id = current_setting('test.viewer_id')::bigint
      AND user_id = 'a1000000-0000-4000-8000-000000000001'
  ),
  'owner',
  'a viewer leave keeps the owner'
);

SELECT is(
  (
    SELECT role::text
    FROM public.project_members
    WHERE project_id = current_setting('test.viewer_id')::bigint
      AND user_id = 'a1000000-0000-4000-8000-000000000003'
  ),
  'editor',
  'a viewer leave keeps the editor'
);

WITH inserted AS (
  INSERT INTO public.projects ("Title", created_by)
  VALUES (
    'Editor leaves',
    'a1000000-0000-4000-8000-000000000001'
  )
  RETURNING id
)
SELECT set_config('test.editor_id', (SELECT id::text FROM inserted), true);

INSERT INTO public.project_members (project_id, user_id, role)
VALUES
  (
    current_setting('test.editor_id')::bigint,
    'a1000000-0000-4000-8000-000000000001',
    'owner'
  ),
  (
    current_setting('test.editor_id')::bigint,
    'a1000000-0000-4000-8000-000000000003',
    'editor'
  ),
  (
    current_setting('test.editor_id')::bigint,
    'a1000000-0000-4000-8000-000000000004',
    'viewer'
  );

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'a1000000-0000-4000-8000-000000000003';

SELECT is(
  public.delete_project(current_setting('test.editor_id')::bigint),
  'left',
  'an editor leaves the project'
);

RESET ROLE;

SELECT is(
  (
    SELECT count(*)::int
    FROM public.project_members
    WHERE project_id = current_setting('test.editor_id')::bigint
      AND user_id = 'a1000000-0000-4000-8000-000000000003'
  ),
  0,
  'the editor membership is gone'
);

SELECT is(
  (
    SELECT count(*)::int
    FROM public.projects
    WHERE id = current_setting('test.editor_id')::bigint
  ),
  1,
  'an editor leave keeps the project'
);

SELECT is(
  (
    SELECT role::text
    FROM public.project_members
    WHERE project_id = current_setting('test.editor_id')::bigint
      AND user_id = 'a1000000-0000-4000-8000-000000000001'
  ),
  'owner',
  'an editor leave keeps the owner'
);

SELECT is(
  (
    SELECT role::text
    FROM public.project_members
    WHERE project_id = current_setting('test.editor_id')::bigint
      AND user_id = 'a1000000-0000-4000-8000-000000000004'
  ),
  'viewer',
  'an editor leave keeps the viewer'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '', true);

SELECT throws_ok(
  $$select public.delete_project(0)$$,
  '42501',
  'Not signed in.',
  'a caller who is not signed in cannot delete'
);

RESET ROLE;

WITH inserted AS (
  INSERT INTO public.projects ("Title", created_by)
  VALUES (
    'Outsider delete',
    'a1000000-0000-4000-8000-000000000001'
  )
  RETURNING id
)
SELECT set_config('test.outsider_id', (SELECT id::text FROM inserted), true);

INSERT INTO public.project_members (project_id, user_id, role)
VALUES (
  current_setting('test.outsider_id')::bigint,
  'a1000000-0000-4000-8000-000000000001',
  'owner'
);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'a1000000-0000-4000-8000-000000000005';

SELECT throws_ok(
  $$select public.delete_project(current_setting('test.outsider_id')::bigint)$$,
  '42501',
  'You are not a member of this project.',
  'a non-member cannot delete'
);

RESET ROLE;

WITH inserted AS (
  INSERT INTO public.projects ("Title", created_by)
  VALUES (
    'Sole owner',
    'a1000000-0000-4000-8000-000000000001'
  )
  RETURNING id
)
SELECT set_config('test.sole_id', (SELECT id::text FROM inserted), true);

INSERT INTO public.project_members (project_id, user_id, role)
VALUES (
  current_setting('test.sole_id')::bigint,
  'a1000000-0000-4000-8000-000000000001',
  'owner'
);

INSERT INTO public.project_invitations (project_id, email, role, invited_by)
VALUES (
  current_setting('test.sole_id')::bigint,
  'pending-delete@forest.test',
  'viewer',
  'a1000000-0000-4000-8000-000000000001'
);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'a1000000-0000-4000-8000-000000000001';

SELECT is(
  public.delete_project(current_setting('test.sole_id')::bigint),
  'deleted',
  'a sole owner deletes the project'
);

RESET ROLE;

SELECT is(
  (
    SELECT count(*)::int
    FROM public.projects
    WHERE id = current_setting('test.sole_id')::bigint
  ),
  0,
  'a sole owner removes the project'
);

SELECT is(
  (
    SELECT count(*)::int
    FROM public.project_invitations
    WHERE email = 'pending-delete@forest.test'
  ),
  0,
  'a sole owner delete removes the invitation'
);

WITH inserted AS (
  INSERT INTO public.projects ("Title", created_by)
  VALUES (
    'Viewers only',
    'a1000000-0000-4000-8000-000000000001'
  )
  RETURNING id
)
SELECT set_config('test.viewers_id', (SELECT id::text FROM inserted), true);

INSERT INTO public.project_members (project_id, user_id, role)
VALUES
  (
    current_setting('test.viewers_id')::bigint,
    'a1000000-0000-4000-8000-000000000001',
    'owner'
  ),
  (
    current_setting('test.viewers_id')::bigint,
    'a1000000-0000-4000-8000-000000000004',
    'viewer'
  ),
  (
    current_setting('test.viewers_id')::bigint,
    'a1000000-0000-4000-8000-000000000006',
    'viewer'
  );

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'a1000000-0000-4000-8000-000000000001';

SELECT is(
  public.delete_project(current_setting('test.viewers_id')::bigint),
  'deleted',
  'an owner with only viewers deletes the project'
);

RESET ROLE;

SELECT is(
  (
    SELECT count(*)::int
    FROM public.projects
    WHERE id = current_setting('test.viewers_id')::bigint
  ),
  0,
  'an owner with only viewers removes the project'
);

SELECT is(
  (
    SELECT count(*)::int
    FROM public.project_members
    WHERE project_id = current_setting('test.viewers_id')::bigint
  ),
  0,
  'an owner with only viewers removes those members'
);

WITH inserted AS (
  INSERT INTO public.projects ("Title", created_by)
  VALUES (
    'Transfer owner',
    'a1000000-0000-4000-8000-000000000001'
  )
  RETURNING id
)
SELECT set_config('test.transfer_id', (SELECT id::text FROM inserted), true);

INSERT INTO public.project_members (project_id, user_id, role, created_at)
VALUES
  (
    current_setting('test.transfer_id')::bigint,
    'a1000000-0000-4000-8000-000000000004',
    'viewer',
    '2026-01-01T00:00:00Z'
  ),
  (
    current_setting('test.transfer_id')::bigint,
    'a1000000-0000-4000-8000-000000000003',
    'editor',
    '2026-01-02T00:00:00Z'
  ),
  (
    current_setting('test.transfer_id')::bigint,
    'a1000000-0000-4000-8000-000000000002',
    'editor',
    '2026-01-03T00:00:00Z'
  ),
  (
    current_setting('test.transfer_id')::bigint,
    'a1000000-0000-4000-8000-000000000001',
    'owner',
    '2026-01-04T00:00:00Z'
  );

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'a1000000-0000-4000-8000-000000000001';

SELECT is(
  public.delete_project(current_setting('test.transfer_id')::bigint),
  'transferred',
  'an owner with editors transfers the project'
);

RESET ROLE;

SELECT is(
  (
    SELECT role::text
    FROM public.project_members
    WHERE project_id = current_setting('test.transfer_id')::bigint
      AND user_id = 'a1000000-0000-4000-8000-000000000003'
  ),
  'owner',
  'the earlier editor becomes owner'
);

SELECT is(
  (
    SELECT role::text
    FROM public.project_members
    WHERE project_id = current_setting('test.transfer_id')::bigint
      AND user_id = 'a1000000-0000-4000-8000-000000000002'
  ),
  'editor',
  'the later editor stays an editor'
);

SELECT is(
  (
    SELECT role::text
    FROM public.project_members
    WHERE project_id = current_setting('test.transfer_id')::bigint
      AND user_id = 'a1000000-0000-4000-8000-000000000004'
  ),
  'viewer',
  'a viewer stays a viewer when an editor can take ownership'
);

SELECT is(
  (
    SELECT count(*)::int
    FROM public.project_members
    WHERE project_id = current_setting('test.transfer_id')::bigint
      AND user_id = 'a1000000-0000-4000-8000-000000000001'
  ),
  0,
  'the old owner membership is gone'
);

SELECT is(
  (
    SELECT count(*)::int
    FROM public.projects
    WHERE id = current_setting('test.transfer_id')::bigint
  ),
  1,
  'a transfer keeps the project'
);

WITH inserted AS (
  INSERT INTO public.projects ("Title", created_by)
  VALUES (
    'Owner tie',
    'a1000000-0000-4000-8000-000000000001'
  )
  RETURNING id
)
SELECT set_config('test.tie_id', (SELECT id::text FROM inserted), true);

INSERT INTO public.project_members (project_id, user_id, role, created_at)
VALUES
  (
    current_setting('test.tie_id')::bigint,
    'b1000000-0000-4000-8000-000000000009',
    'editor',
    '2026-02-01T00:00:00Z'
  ),
  (
    current_setting('test.tie_id')::bigint,
    'b1000000-0000-4000-8000-000000000002',
    'editor',
    '2026-02-01T00:00:00Z'
  ),
  (
    current_setting('test.tie_id')::bigint,
    'a1000000-0000-4000-8000-000000000001',
    'owner',
    '2026-02-02T00:00:00Z'
  );

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'a1000000-0000-4000-8000-000000000001';

SELECT is(
  public.delete_project(current_setting('test.tie_id')::bigint),
  'transferred',
  'an owner tie transfers the project'
);

RESET ROLE;

SELECT is(
  (
    SELECT role::text
    FROM public.project_members
    WHERE project_id = current_setting('test.tie_id')::bigint
      AND user_id = 'b1000000-0000-4000-8000-000000000002'
  ),
  'owner',
  'the lower user id becomes owner when editors were added together'
);

SELECT is(
  (
    SELECT role::text
    FROM public.project_members
    WHERE project_id = current_setting('test.tie_id')::bigint
      AND user_id = 'b1000000-0000-4000-8000-000000000009'
  ),
  'editor',
  'the higher user id stays an editor when editors were added together'
);

SELECT * FROM finish();
ROLLBACK;
