BEGIN;
SELECT plan(28);

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
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '44444444-4444-4444-8444-444444444444',
  'authenticated',
  'authenticated',
  'guest@forest.test',
  extensions.crypt('guest-local', extensions.gen_salt('bf')),
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

SET LOCAL ROLE anon;

SELECT throws_ok(
  $$insert into public.projects ("Title") values ('Nope')$$,
  '42501',
  NULL,
  'anon cannot insert a project'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';

SELECT results_eq(
  $$insert into public.projects ("Title") values ('Cedar Plot') returning "Title"$$,
  $$select 'Cedar Plot'::text$$,
  'the creator reads the new project row back'
);

SELECT set_config(
  'test.project_id',
  (SELECT id::text FROM public.projects WHERE "Title" = 'Cedar Plot'),
  true
);

SELECT is(
  (SELECT created_by FROM public.projects WHERE "Title" = 'Cedar Plot'),
  '22222222-2222-4222-8222-222222222222'::uuid,
  'created_by is the signed-in user'
);

SELECT lives_ok(
  $$
    insert into public.project_members (project_id, user_id, role)
    values (
      current_setting('test.project_id')::bigint,
      '22222222-2222-4222-8222-222222222222',
      'owner'
    )
  $$,
  'the creator claims the owner role'
);

SELECT throws_ok(
  $$
    insert into public.project_members (project_id, user_id, role)
    values (
      current_setting('test.project_id')::bigint,
      '22222222-2222-4222-8222-222222222222',
      'owner'
    )
  $$,
  '42501',
  NULL,
  'a second owner insert fails'
);

SELECT throws_ok(
  $$
    insert into public.projects ("Title", created_by)
    values ('Stolen', '33333333-3333-4333-8333-333333333333')
  $$,
  '42501',
  NULL,
  'a client cannot set created_by to someone else'
);

SELECT throws_ok(
  $$
    insert into public.project_members (project_id, user_id, role)
    values (
      current_setting('test.project_id')::bigint,
      '11111111-1111-4111-8111-111111111111',
      'editor'
    )
  $$,
  '42501',
  NULL,
  'a client cannot insert another member directly'
);

SELECT is(
  public.invite_to_project(
    current_setting('test.project_id')::bigint,
    'admin@forest.test',
    'editor'
  ),
  'member',
  'the owner adds an editor'
);

SELECT is(
  public.invite_to_project(
    current_setting('test.project_id')::bigint,
    'user@forest.test',
    'viewer'
  ),
  'member',
  'the owner adds a viewer'
);

SELECT throws_ok(
  $$
    select public.invite_to_project(
      current_setting('test.project_id')::bigint,
      'forester@forest.test',
      'editor'
    )
  $$,
  '42501',
  NULL,
  'a member cannot invite themselves'
);

SET LOCAL request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

SELECT is(
  public.invite_to_project(
    current_setting('test.project_id')::bigint,
    'guest@forest.test',
    'editor'
  ),
  'member',
  'an editor adds an editor'
);

SELECT throws_ok(
  $$
    select public.invite_to_project(
      current_setting('test.project_id')::bigint,
      'guest@forest.test',
      'owner'
    )
  $$,
  '42501',
  NULL,
  'an editor cannot grant owner'
);

SET LOCAL request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';

SELECT throws_ok(
  $$
    select public.invite_to_project(
      current_setting('test.project_id')::bigint,
      'guest@forest.test',
      'editor'
    )
  $$,
  '42501',
  NULL,
  'a viewer cannot add an editor'
);

SELECT is(
  public.invite_to_project(
    current_setting('test.project_id')::bigint,
    'pending@forest.test',
    'viewer'
  ),
  'invited',
  'an unknown email is stored as an invitation'
);

SELECT is(
  (
    SELECT count(*)::int
    FROM public.project_invitations
    WHERE email = 'pending@forest.test'
  ),
  1,
  'the invitation row exists'
);

SELECT throws_ok(
  $$
    select public.invite_to_project(
      current_setting('test.project_id')::bigint,
      'admin@forest.test',
      'viewer'
    )
  $$,
  '42501',
  NULL,
  'a viewer cannot change an editor'
);

RESET ROLE;

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
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '55555555-5555-4555-8555-555555555555',
  'authenticated',
  'authenticated',
  'pending@forest.test',
  extensions.crypt('pending-local', extensions.gen_salt('bf')),
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

SELECT is(
  (
    SELECT count(*)::int
    FROM public.project_members
    WHERE project_id = current_setting('test.project_id')::bigint
      AND user_id = '55555555-5555-4555-8555-555555555555'
      AND role = 'viewer'
  ),
  1,
  'signup claims the invitation'
);

SELECT is(
  (
    SELECT count(*)::int
    FROM public.project_invitations
    WHERE email = 'pending@forest.test'
  ),
  0,
  'the claimed invitation is removed'
);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';

SELECT lives_ok(
  $$delete from public.project_members where project_id = current_setting('test.project_id')::bigint$$,
  'a viewer delete of members does not raise'
);

SELECT is(
  (
    SELECT count(*)::int
    FROM public.project_members
    WHERE project_id = current_setting('test.project_id')::bigint
  ),
  5,
  'a viewer does not delete members'
);

SELECT lives_ok(
  $$delete from public.projects where id = current_setting('test.project_id')::bigint$$,
  'a viewer delete of the project does not raise'
);

SELECT is(
  (
    SELECT count(*)::int
    FROM public.projects
    WHERE id = current_setting('test.project_id')::bigint
  ),
  1,
  'a viewer does not delete the project'
);

SET LOCAL request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

SELECT lives_ok(
  $$delete from public.project_members where project_id = current_setting('test.project_id')::bigint$$,
  'an editor deletes members below their rank'
);

SELECT is(
  (
    SELECT count(*)::int
    FROM public.project_members
    WHERE project_id = current_setting('test.project_id')::bigint
  ),
  3,
  'an editor removes viewers and leaves editors'
);

SET LOCAL request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';

SELECT lives_ok(
  $$delete from public.project_members where project_id = current_setting('test.project_id')::bigint$$,
  'the owner deletes members below their rank'
);

SELECT is(
  (
    SELECT count(*)::int
    FROM public.project_members
    WHERE project_id = current_setting('test.project_id')::bigint
  ),
  1,
  'the owner row remains'
);

SELECT is(
  public.delete_project(current_setting('test.project_id')::bigint),
  'deleted',
  'the creator deletes the project'
);

SELECT is(
  (
    SELECT count(*)::int
    FROM public.projects
    WHERE id = current_setting('test.project_id')::bigint
  ),
  0,
  'the project row is gone'
);

SELECT * FROM finish();
ROLLBACK;
