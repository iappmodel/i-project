-- Step 9.21 — real TOTP MFA factor enrollment and verification.
-- Runs after 135_admin_mfa_requirement_stubs.sql.

create table if not exists admin_mfa_factors (
  id uuid primary key default gen_random_uuid(),
  admin_auth_user_id uuid not null,
  admin_user_id uuid references admin_users(id),
  factor_type text not null,
  provider text not null default 'totp',
  status text not null default 'pending',
  label text,
  secret_ciphertext text not null,
  secret_key_version text not null default 'v1',
  last_verified_at timestamptz,
  last_used_time_step bigint,
  confirmed_at timestamptz,
  disabled_at timestamptz,
  failure_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_mfa_factors_type_check
  check (factor_type in ('totp', 'webauthn', 'recovery_code')),
  constraint admin_mfa_factors_status_check
  check (status in ('pending', 'active', 'disabled', 'revoked'))
);

create index if not exists admin_mfa_factors_admin_idx
on admin_mfa_factors (admin_auth_user_id, status, created_at desc);

create index if not exists admin_mfa_factors_type_idx
on admin_mfa_factors (factor_type, status);

drop trigger if exists admin_mfa_factors_set_updated_at
on admin_mfa_factors;

create trigger admin_mfa_factors_set_updated_at
before update on admin_mfa_factors
for each row
execute function set_updated_at();

create table if not exists admin_mfa_totp_used_steps (
  id uuid primary key default gen_random_uuid(),
  admin_mfa_factor_id uuid not null references admin_mfa_factors(id) on delete cascade,
  admin_auth_user_id uuid not null,
  time_step bigint not null,
  challenge_id uuid references admin_mfa_challenges(id),
  used_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (admin_mfa_factor_id, time_step)
);

create index if not exists admin_mfa_totp_used_steps_admin_idx
on admin_mfa_totp_used_steps (admin_auth_user_id, used_at desc);

create or replace view admin_mfa_factor_dashboard as
select
  f.id as admin_mfa_factor_id,
  f.admin_auth_user_id,
  au.email,
  au.display_name,
  f.factor_type,
  f.provider,
  f.status,
  f.label,
  f.secret_key_version,
  f.last_verified_at,
  f.confirmed_at,
  f.disabled_at,
  f.failure_count,
  f.created_at,
  f.updated_at,
  f.metadata
from admin_mfa_factors f
left join admin_users au
  on au.id = f.admin_user_id
order by f.created_at desc;

grant select on admin_mfa_factor_dashboard to admin_api_role;

alter table admin_mfa_factors enable row level security;
alter table admin_mfa_totp_used_steps enable row level security;

create policy admin_mfa_factors_no_user_direct_access
on admin_mfa_factors
for all
to authenticated
using (false)
with check (false);

create policy admin_mfa_totp_used_steps_no_user_direct_access
on admin_mfa_totp_used_steps
for all
to authenticated
using (false)
with check (false);

create policy admin_api_all_admin_mfa_factors
on admin_mfa_factors
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_admin_mfa_totp_used_steps
on admin_mfa_totp_used_steps
for all
to admin_api_role
using (true)
with check (true);

create or replace function create_admin_mfa_verification(
  p_admin_auth_user_id uuid,
  p_challenge_id uuid,
  p_method text,
  p_provider text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_challenge admin_mfa_challenges%rowtype;
  v_admin admin_users%rowtype;
  v_policy admin_mfa_policies%rowtype;
  v_expires_at timestamptz;
  v_verification_id uuid;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_challenge_id is null then
    raise exception 'MFA challenge id is required';
  end if;

  if p_method not in ('totp', 'webauthn', 'recovery_code', 'stub') then
    raise exception 'invalid MFA method: %', p_method;
  end if;

  select *
  into v_challenge
  from admin_mfa_challenges
  where id = p_challenge_id
  for update;

  if v_challenge.id is null then
    raise exception 'admin MFA challenge not found: %', p_challenge_id;
  end if;

  if v_challenge.admin_auth_user_id <> p_admin_auth_user_id then
    raise exception 'MFA challenge does not belong to admin';
  end if;

  if v_challenge.status <> 'pending' then
    raise exception 'MFA challenge is not pending';
  end if;

  if v_challenge.expires_at <= now() then
    update admin_mfa_challenges
    set status = 'expired', updated_at = now()
    where id = v_challenge.id;

    raise exception 'MFA challenge expired';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);
  v_policy := get_active_admin_mfa_policy();

  v_expires_at :=
    case
      when v_challenge.purpose = 'privileged_action'
      then now() + make_interval(secs => v_policy.privileged_action_max_age_seconds)
      else now() + make_interval(secs => v_policy.sensitive_write_max_age_seconds)
    end;

  update admin_mfa_challenges
  set status = 'verified', verified_at = now(), updated_at = now()
  where id = v_challenge.id;

  insert into admin_mfa_verifications (
    admin_auth_user_id,
    admin_user_id,
    challenge_id,
    method,
    provider,
    purpose,
    verified_at,
    expires_at,
    request_id,
    metadata
  )
  values (
    p_admin_auth_user_id,
    v_admin.id,
    v_challenge.id,
    p_method,
    coalesce(p_provider, p_method),
    v_challenge.purpose,
    now(),
    v_expires_at,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_verification_id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'create_admin_mfa_verification',
    null,
    'admin_mfa_challenge',
    v_challenge.id,
    p_request_id,
    null,
    null,
    'allowed',
    'admin MFA challenge verified',
    p_metadata || jsonb_build_object(
      'verification_id', v_verification_id,
      'method', p_method,
      'purpose', v_challenge.purpose
    )
  );

  return v_verification_id;
end;
$$;

grant execute on function create_admin_mfa_verification(
  uuid,
  uuid,
  text,
  text,
  text,
  jsonb
) to admin_api_role;

alter function create_admin_mfa_verification(
  uuid,
  uuid,
  text,
  text,
  text,
  jsonb
) security definer;

alter function create_admin_mfa_verification(
  uuid,
  uuid,
  text,
  text,
  text,
  jsonb
) set search_path = public;

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
    'ADMIN_TOTP_FACTOR_INVALID',
    'validation',
    'medium',
    400,
    false,
    true,
    'TOTP factor is invalid.',
    'Admin TOTP factor invalid.',
    'platform'
  ),
  (
    'ADMIN_TOTP_CODE_INVALID',
    'permission',
    'high',
    403,
    false,
    true,
    'Invalid authenticator code.',
    'Invalid admin TOTP code.',
    'platform'
  ),
  (
    'ADMIN_TOTP_CODE_REUSED',
    'permission',
    'high',
    409,
    false,
    true,
    'Authenticator code was already used.',
    'Admin TOTP timestep replay detected.',
    'platform'
  ),
  (
    'ADMIN_MFA_ENCRYPTION_NOT_CONFIGURED',
    'system',
    'critical',
    500,
    false,
    false,
    'MFA encryption is not configured.',
    'Admin MFA encryption key missing or invalid.',
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
  ('admin TOTP factor not found', 'ADMIN_TOTP_FACTOR_INVALID', 5, '{}'),
  ('admin TOTP factor is not pending', 'ADMIN_TOTP_FACTOR_INVALID', 5, '{}'),
  ('no active TOTP factor found', 'ADMIN_TOTP_FACTOR_INVALID', 5, '{}'),
  ('invalid TOTP code', 'ADMIN_TOTP_CODE_INVALID', 5, '{}'),
  ('TOTP code was already used', 'ADMIN_TOTP_CODE_REUSED', 5, '{}'),
  ('ADMIN_MFA_ENCRYPTION_KEY_BASE64 is not configured', 'ADMIN_MFA_ENCRYPTION_NOT_CONFIGURED', 5, '{}'),
  ('ADMIN_MFA_ENCRYPTION_KEY_BASE64 must decode to 32 bytes', 'ADMIN_MFA_ENCRYPTION_NOT_CONFIGURED', 5, '{}')
on conflict do nothing;
