-- Local development users. Runs after migrations on the first
-- `supabase start` and on every `supabase db reset`.
-- https://supabase.com/docs/guides/local-development/seeding-your-database

insert into auth.users (
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
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-4111-8111-111111111111',
    'authenticated',
    'authenticated',
    'admin@forest.test',
    extensions.crypt('admin-local', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"],"roles":["admin"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-4222-8222-222222222222',
    'authenticated',
    'authenticated',
    'forester@forest.test',
    extensions.crypt('forester-local', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"],"roles":["forester"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-4333-8333-333333333333',
    'authenticated',
    'authenticated',
    'user@forest.test',
    extensions.crypt('user-local', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"],"roles":["user"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into auth.identities (
  user_id,
  provider_id,
  provider,
  identity_data,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  id,
  id::text,
  'email',
  jsonb_build_object('sub', id::text, 'email', email),
  now(),
  now(),
  now()
from auth.users
where email in (
  'admin@forest.test',
  'forester@forest.test',
  'user@forest.test'
);

insert into public.projects ("Title", created_by)
values (
  'Oakdale Sustainability',
  '22222222-2222-4222-8222-222222222222'
);

insert into public.project_members (project_id, user_id, role)
select
  projects.id,
  '22222222-2222-4222-8222-222222222222',
  'editor'::public.project_permissions
from public.projects
where projects."Title" = 'Oakdale Sustainability';

insert into public.project_members (project_id, user_id, role)
select
  projects.id,
  '33333333-3333-4333-8333-333333333333',
  'viewer'::public.project_permissions
from public.projects
where projects."Title" = 'Oakdale Sustainability';
