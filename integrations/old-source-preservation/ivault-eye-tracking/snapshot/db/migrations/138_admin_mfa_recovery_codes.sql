-- Step 9.23 — Build admin MFA recovery codes.
-- Runs after 137_admin_mfa_factor_management.sql.

create table if not exists admin_mfa_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  admin_auth_user_id uuid not null,
  admin_user_id uuid references admin_users(id),
  code_hash text not null,
  hash_version text not null default 'sha256_v1',
  status text not null default 'active',
  used_at timestamptz,
  used_challenge_id uuid references admin_mfa_challenges(id),
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_mfa_recovery_codes_status_check
  check (status in ('active', 'used', 'revoked')),
  unique (admin_auth_user_id, code_hash)
);

create index if not exists admin_mfa_recovery_codes_admin_idx
on admin_mfa_recovery_codes (admin_auth_user_id, status, created_at desc);

create or replace function admin_has_active_mfa_factor(
  p_admin_auth_user_id uuid
)
returns boolean
language plpgsql
stable
as $$
begin
  if p_admin_auth_user_id is null then
    return false;
  end if;

  return exists (
    select 1
    from admin_mfa_factors f
    where f.admin_auth_user_id = p_admin_auth_user_id
      and f.status = 'active'
      and f.factor_type in ('totp', 'webauthn')
  )
  or exists (
    select 1
    from admin_mfa_recovery_codes rc
    where rc.admin_auth_user_id = p_admin_auth_user_id
      and rc.status = 'active'
  );
end;
$$;

create or replace view admin_mfa_recovery_code_dashboard as
select
  rc.admin_auth_user_id,
  au.email,
  au.display_name,
  count(*) filter (where rc.status = 'active') as active_recovery_code_count,
  count(*) filter (where rc.status = 'used') as used_recovery_code_count,
  count(*) filter (where rc.status = 'revoked') as revoked_recovery_code_count,
  max(rc.created_at) as last_generated_at,
  max(rc.used_at) as last_used_at
from admin_mfa_recovery_codes rc
left join admin_users au
  on au.id = rc.admin_user_id
group by
  rc.admin_auth_user_id,
  au.email,
  au.display_name;

grant select on admin_mfa_recovery_code_dashboard to admin_api_role;

alter table admin_mfa_recovery_codes enable row level security;

create policy admin_mfa_recovery_codes_no_user_direct_access
on admin_mfa_recovery_codes
for all
to authenticated
using (false)
with check (false);

create policy admin_api_all_admin_mfa_recovery_codes
on admin_mfa_recovery_codes
for all
to admin_api_role
using (true)
with check (true);

insert into error_catalog (
  error_code,
  category,
  severity,
  http_status,
  retryable,
  user_visible,
  user_message,
  internal_message,
  owner_team
)
values
  (
    'ADMIN_RECOVERY_CODE_INVALID',
    'permission',
    'high',
    403,
    false,
    true,
    'Invalid recovery code.',
    'Invalid admin MFA recovery code.',
    'platform'
  ),
  (
    'ADMIN_RECOVERY_CODE_USED',
    'permission',
    'high',
    409,
    false,
    true,
    'Recovery code has already been used.',
    'Admin MFA recovery code replay detected.',
    'platform'
  ),
  (
    'ADMIN_RECOVERY_CODE_PEPPER_MISSING',
    'system',
    'critical',
    500,
    false,
    false,
    'Recovery code security is not configured.',
    'ADMIN_MFA_RECOVERY_CODE_PEPPER missing.',
    'platform'
  )
on conflict (error_code)
do update set
  category = excluded.category,
  severity = excluded.severity,
  http_status = excluded.http_status,
  retryable = excluded.retryable,
  user_visible = excluded.user_visible,
  user_message = excluded.user_message,
  internal_message = excluded.internal_message,
  owner_team = excluded.owner_team,
  updated_at = now();

insert into error_mapping_rules (
  match_pattern,
  error_code,
  priority,
  metadata
)
values
  ('invalid recovery code', 'ADMIN_RECOVERY_CODE_INVALID', 5, '{}'),
  ('Recovery code has already been used', 'ADMIN_RECOVERY_CODE_USED', 5, '{}'),
  ('ADMIN_MFA_RECOVERY_CODE_PEPPER is not configured', 'ADMIN_RECOVERY_CODE_PEPPER_MISSING', 5, '{}')
on conflict do nothing;
