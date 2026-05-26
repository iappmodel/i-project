-- Demo user for local ledger settle (matches DEFAULT_DEMO_USER_ID in app).
-- Runs on `supabase db reset` after migrations.

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'demo-user-001@i.local',
  crypt('demo-local-password', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"username":"demo-user-001","display_name":"Demo User"}',
  now(),
  now(),
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;

-- handle_new_user trigger creates profile + role; ensure username if trigger skipped:
INSERT INTO public.profiles (user_id, username, display_name)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'demo-user-001',
  'Demo User'
)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
VALUES ('00000000-0000-4000-8000-000000000001', 'user')
ON CONFLICT (user_id, role) DO NOTHING;

-- Baseline wallet balances for repeatable demos (matches app WALLET_INITIAL mock when live sync off)
UPDATE public.profiles
SET
  icoin_balance = 847,
  vicoin_balance = 0
WHERE user_id = '00000000-0000-4000-8000-000000000001';
