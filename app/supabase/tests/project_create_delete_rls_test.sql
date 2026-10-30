BEGIN;
SELECT plan(22);

INSERT INTO public.public_users (auth_id)
VALUES
  ('44444444-4444-4444-8444-444444444444'),
  ('55555555-5555-4555-8555-555555555555'),
  ('66666666-6666-4666-8666-666666666666');

SELECT set_config('test.forester_id', id::text, true)
FROM public.public_users
WHERE auth_id = '22222222-2222-4222-8222-222222222222';

SELECT set_config('test.admin_id', id::text, true)
FROM public.public_users
WHERE auth_id = '11111111-1111-4111-8111-111111111111';

SELECT set_config('test.member_id', id::text, true)
FROM public.public_users
WHERE auth_id = '33333333-3333-4333-8333-333333333333';

SELECT set_config('test.guest_id', id::text, true)
FROM public.public_users
WHERE auth_id = '44444444-4444-4444-8444-444444444444';

SELECT set_config('test.extra_id', id::text, true)
FROM public.public_users
WHERE auth_id = '55555555-5555-4555-8555-555555555555';

SELECT set_config('test.prospect_id', id::text, true)
FROM public.public_users
WHERE auth_id = '66666666-6666-4666-8666-666666666666';

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
  current_setting('test.forester_id')::bigint,
  'created_by is the signed-in user'
);

SELECT lives_ok(
  $$
    insert into public.project_roles (project, "user", role)
    values (
      current_setting('test.project_id')::bigint,
      current_setting('test.forester_id')::bigint,
      'owner'
    )
  $$,
  'the creator claims the owner role'
);

SELECT throws_ok(
  $$
    insert into public.project_roles (project, "user", role)
    values (
      current_setting('test.project_id')::bigint,
      current_setting('test.forester_id')::bigint,
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
    values ('Stolen', current_setting('test.member_id')::bigint)
  $$,
  '42501',
  NULL,
  'a client cannot set created_by to someone else'
);

SELECT lives_ok(
  $$
    insert into public.project_roles (project, "user", role)
    values (
      current_setting('test.project_id')::bigint,
      current_setting('test.admin_id')::bigint,
      'editor'
    )
  $$,
  'the owner adds an editor'
);

SELECT lives_ok(
  $$
    insert into public.project_roles (project, "user", role)
    values (
      current_setting('test.project_id')::bigint,
      current_setting('test.member_id')::bigint,
      'viewer'
    )
  $$,
  'the owner adds a viewer'
);

SET LOCAL request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

SELECT throws_ok(
  $$
    insert into public.project_roles (project, "user", role)
    values (
      current_setting('test.project_id')::bigint,
      current_setting('test.prospect_id')::bigint,
      'editor'
    )
  $$,
  '42501',
  NULL,
  'an editor cannot add an editor'
);

SELECT lives_ok(
  $$
    insert into public.project_roles (project, "user", role)
    values (
      current_setting('test.project_id')::bigint,
      current_setting('test.guest_id')::bigint,
      'viewer'
    )
  $$,
  'an editor adds a viewer'
);

SET LOCAL request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';

SELECT lives_ok(
  $$
    insert into public.project_roles (project, "user", role)
    values (
      current_setting('test.project_id')::bigint,
      current_setting('test.extra_id')::bigint,
      'viewer'
    )
  $$,
  'a viewer adds a viewer'
);

SELECT throws_ok(
  $$
    insert into public.project_roles (project, "user", role)
    values (
      current_setting('test.project_id')::bigint,
      current_setting('test.prospect_id')::bigint,
      'editor'
    )
  $$,
  '42501',
  NULL,
  'a viewer cannot add an editor'
);

SELECT throws_ok(
  $$
    insert into public.project_roles (project, "user", role)
    values (
      current_setting('test.project_id')::bigint,
      current_setting('test.member_id')::bigint,
      'viewer'
    )
  $$,
  '42501',
  NULL,
  'a member cannot insert a role for themselves'
);

SET LOCAL request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';

SELECT throws_ok(
  $$
    insert into public.project_roles (project, "user", role)
    values (
      current_setting('test.project_id')::bigint,
      current_setting('test.admin_id')::bigint,
      'viewer'
    )
  $$,
  '42501',
  NULL,
  'a member cannot insert a role for someone who already has one'
);

SET LOCAL request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';

SELECT lives_ok(
  $$delete from public.project_roles where project = current_setting('test.project_id')::bigint$$,
  'a viewer delete of roles does not raise'
);

SELECT is(
  (
    SELECT count(*)::int
    FROM public.project_roles
    WHERE project = current_setting('test.project_id')::bigint
  ),
  5,
  'a viewer does not delete roles'
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

SET LOCAL request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';

SELECT lives_ok(
  $$delete from public.project_roles where project = current_setting('test.project_id')::bigint$$,
  'the owner deletes every role'
);

SELECT is(
  (
    SELECT count(*)::int
    FROM public.project_roles
    WHERE project = current_setting('test.project_id')::bigint
  ),
  0,
  'the project has no roles'
);

SELECT lives_ok(
  $$delete from public.projects where id = current_setting('test.project_id')::bigint$$,
  'the creator deletes the empty project'
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
