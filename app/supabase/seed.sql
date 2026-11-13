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

insert into public.actions (project_id, name, status, description)
select
  projects.id,
  action.name,
  'planned',
  action.description
from public.projects
cross join (
  values
    (
      'Cut-stump herbicide treatment of invasive woody shrubs',
      'During fall and winter 2025, cut invasive woody shrubs on all stands, about 36 acres, and treat the stumps with herbicide. The work is timed for the dormant season so treated shrubs are less likely to resprout.'
    ),
    (
      'Postponement of commercial timber harvesting',
      'Hold commercial timber harvests from 2025 through 2045 on all stands, about 36 acres. The postponement gives planted and released trees time to gain diameter before a harvest is prescribed.'
    ),
    (
      'Red oak planting in canopy gaps',
      'In 2025, plant red oak in canopy gaps on stands 1, 2, and 3, about 27 acres. The planting fills openings with the preferred crop species.'
    ),
    (
      'Develop trail repair, maintenance, and reroute strategy',
      'From 2025 through 2030, prepare a trail repair, maintenance, and reroute strategy for stands 1, 2, 3, and 4, about 31 acres. The strategy keeps access usable without widening the disturbed footprint.'
    ),
    (
      'Marking and monitoring of hickory for Phomopsis',
      'From 2025 through 2030, mark hickory on stands 1, 2, and 3, about 27 acres, and watch those trees for widespread Phomopsis infection. Marking makes later checks refer to the same stems.'
    ),
    (
      'Foliar herbicide treatment of invasive regrowth',
      'In spring and summer 2026, treat invasive regrowth with foliar herbicide on all stands, about 36 acres. This follows the dormant-season cut-stump treatment.'
    ),
    (
      'Continued monitoring and treatment of invasive species',
      'From 2026 through 2045, keep monitoring and treating invasive plants on all stands, about 36 acres. Repeat visits are meant to stop new patches from replacing the shrubs already cut.'
    ),
    (
      'Assessment of canopy closure and pre-commercial thinning',
      'In 2030, assess canopy closure on stands 1, 2, 3, and 4, about 31 acres, and prescribe pre-commercial thinning where crowns have closed. The prescription names stems to remove before they reach merchantable size.'
    ),
    (
      'Crop tree release of red oak',
      'In 2030, release small-sawtimber red oak on stands 1, 2, and 3, about 27 acres, so the selected trees can grow into the mature size class. Crowns competing with those crop trees are removed.'
    ),
    (
      'Management plan assessment',
      'In 2035, assess this management plan on all stands, about 36 acres. The review checks whether the schedule still fits the condition of the woods.'
    ),
    (
      'Repeat timber inventory',
      'Repeat the timber inventory in 2030, 2035, 2040, and 2045 on all stands, about 36 acres. Each cruise measures growth against the previous inventory.'
    ),
    (
      'Assessment and prescription for timber harvest',
      'In 2045, assess stands 1, 2, 3, and 4, about 31 acres, and prescribe a timber harvest where the postponement has run its course. The prescription names the trees and volume to remove.'
    )
) as action(name, description)
where projects."Title" = 'Oakdale Sustainability';
