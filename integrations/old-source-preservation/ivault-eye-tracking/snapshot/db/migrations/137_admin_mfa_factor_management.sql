-- Step 9.22 — Build MFA factor management + super-admin active-factor enforcement.
-- Runs after 136_admin_totp_mfa.sql.

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
      and f.factor_type in ('totp', 'webauthn', 'recovery_code')
  );
end;
$$;

create or replace function require_super_admin_active_mfa_factor(
  p_admin_auth_user_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
as $$
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if is_active_super_admin(p_admin_auth_user_id) is true
    and admin_has_active_mfa_factor(p_admin_auth_user_id) is not true then

    perform record_admin_action(
      p_admin_auth_user_id,
      'super_admin_active_mfa_factor_required',
      null,
      'admin_user',
      null,
      p_request_id,
      null,
      null,
      'denied',
      'active MFA factor required for super_admin',
      p_metadata
    );

    raise exception 'active MFA factor required for super_admin';
  end if;

  return true;
end;
$$;

create or replace function require_admin_mfa(
  p_admin_auth_user_id uuid,
  p_purpose text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
as $$
declare
  v_policy admin_mfa_policies%rowtype;
  v_required boolean := true;
  v_max_age_seconds integer;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  v_policy := get_active_admin_mfa_policy();

  perform require_super_admin_active_mfa_factor(
    p_admin_auth_user_id,
    p_request_id,
    p_metadata || jsonb_build_object(
      'source',
      'require_admin_mfa',
      'purpose',
      p_purpose
    )
  );

  if p_purpose = 'privileged_action' then
    v_required := v_policy.require_mfa_for_privileged_actions;
    v_max_age_seconds := v_policy.privileged_action_max_age_seconds;
  elsif p_purpose = 'admin_write' then
    v_required := v_policy.require_mfa_for_admin_write;
    v_max_age_seconds := v_policy.sensitive_write_max_age_seconds;
  else
    v_required := true;
    v_max_age_seconds := v_policy.privileged_action_max_age_seconds;
  end if;

  if v_required is not true then
    return true;
  end if;

  if admin_has_recent_mfa_verification(
    p_admin_auth_user_id,
    p_purpose,
    v_max_age_seconds
  ) is true then
    return true;
  end if;

  perform record_admin_action(
    p_admin_auth_user_id,
    'admin_mfa_required',
    null,
    null,
    null,
    p_request_id,
    null,
    null,
    'denied',
    'recent MFA verification required',
    p_metadata || jsonb_build_object(
      'purpose',
      p_purpose,
      'max_age_seconds',
      v_max_age_seconds
    )
  );

  raise exception 'recent MFA verification required for admin action: %', p_purpose;
end;
$$;

create or replace function disable_admin_mfa_factor(
  p_admin_auth_user_id uuid,
  p_factor_id uuid,
  p_reason text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_factor admin_mfa_factors%rowtype;
  v_active_factor_count integer;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_factor_id is null then
    raise exception 'MFA factor id is required';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'reason is required';
  end if;

  select *
  into v_factor
  from admin_mfa_factors
  where id = p_factor_id
    and admin_auth_user_id = p_admin_auth_user_id
  for update;

  if v_factor.id is null then
    raise exception 'admin MFA factor not found: %', p_factor_id;
  end if;

  if v_factor.status <> 'active' then
    raise exception 'admin MFA factor is not active';
  end if;

  if is_active_super_admin(p_admin_auth_user_id) is true then
    select count(*)
    into v_active_factor_count
    from admin_mfa_factors
    where admin_auth_user_id = p_admin_auth_user_id
      and status = 'active'
      and id <> p_factor_id;

    if v_active_factor_count <= 0 then
      perform record_admin_action(
        p_admin_auth_user_id,
        'disable_admin_mfa_factor',
        null,
        'admin_mfa_factor',
        p_factor_id,
        p_request_id,
        null,
        null,
        'denied',
        'cannot disable last active MFA factor for super_admin',
        p_metadata
      );

      raise exception 'cannot disable last active MFA factor for super_admin';
    end if;
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'admin_write',
    p_request_id,
    p_metadata || jsonb_build_object(
      'action_key',
      'disable_admin_mfa_factor',
      'factor_id',
      p_factor_id
    )
  );

  update admin_mfa_factors
  set
    status = 'disabled',
    disabled_at = now(),
    metadata = metadata || p_metadata || jsonb_build_object(
      'disabled_reason',
      p_reason,
      'disabled_request_id',
      p_request_id
    ),
    updated_at = now()
  where id = p_factor_id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'disable_admin_mfa_factor',
    null,
    'admin_mfa_factor',
    p_factor_id,
    p_request_id,
    null,
    null,
    'allowed',
    p_reason,
    p_metadata
  );

  return p_factor_id;
end;
$$;

create or replace function revoke_admin_mfa_factor(
  p_admin_auth_user_id uuid,
  p_factor_id uuid,
  p_reason text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_factor admin_mfa_factors%rowtype;
  v_active_factor_count integer;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_factor_id is null then
    raise exception 'MFA factor id is required';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'reason is required';
  end if;

  select *
  into v_factor
  from admin_mfa_factors
  where id = p_factor_id
    and admin_auth_user_id = p_admin_auth_user_id
  for update;

  if v_factor.id is null then
    raise exception 'admin MFA factor not found: %', p_factor_id;
  end if;

  if v_factor.status not in ('pending', 'active', 'disabled') then
    raise exception 'admin MFA factor cannot be revoked from status: %', v_factor.status;
  end if;

  if is_active_super_admin(p_admin_auth_user_id) is true
    and v_factor.status = 'active' then

    select count(*)
    into v_active_factor_count
    from admin_mfa_factors
    where admin_auth_user_id = p_admin_auth_user_id
      and status = 'active'
      and id <> p_factor_id;

    if v_active_factor_count <= 0 then
      perform record_admin_action(
        p_admin_auth_user_id,
        'revoke_admin_mfa_factor',
        null,
        'admin_mfa_factor',
        p_factor_id,
        p_request_id,
        null,
        null,
        'denied',
        'cannot revoke last active MFA factor for super_admin',
        p_metadata
      );

      raise exception 'cannot revoke last active MFA factor for super_admin';
    end if;
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'admin_write',
    p_request_id,
    p_metadata || jsonb_build_object(
      'action_key',
      'revoke_admin_mfa_factor',
      'factor_id',
      p_factor_id
    )
  );

  update admin_mfa_factors
  set
    status = 'revoked',
    disabled_at = coalesce(disabled_at, now()),
    metadata = metadata || p_metadata || jsonb_build_object(
      'revoked_reason',
      p_reason,
      'revoked_request_id',
      p_request_id
    ),
    updated_at = now()
  where id = p_factor_id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'revoke_admin_mfa_factor',
    null,
    'admin_mfa_factor',
    p_factor_id,
    p_request_id,
    null,
    null,
    'allowed',
    p_reason,
    p_metadata
  );

  return p_factor_id;
end;
$$;

create or replace view admin_my_mfa_factors as
select
  f.id as admin_mfa_factor_id,
  f.admin_auth_user_id,
  f.factor_type,
  f.provider,
  f.status,
  f.label,
  f.last_verified_at,
  f.confirmed_at,
  f.disabled_at,
  f.failure_count,
  f.created_at,
  f.updated_at,
  f.metadata
from admin_mfa_factors f;

grant select on admin_my_mfa_factors to admin_api_role;

grant execute on function admin_has_active_mfa_factor(uuid)
to admin_api_role;

grant execute on function require_super_admin_active_mfa_factor(uuid, text, jsonb)
to admin_api_role;

grant execute on function disable_admin_mfa_factor(uuid, uuid, text, text, jsonb)
to admin_api_role;

grant execute on function revoke_admin_mfa_factor(uuid, uuid, text, text, jsonb)
to admin_api_role;

alter function admin_has_active_mfa_factor(uuid) security definer;
alter function admin_has_active_mfa_factor(uuid) set search_path = public;

alter function require_super_admin_active_mfa_factor(uuid, text, jsonb) security definer;
alter function require_super_admin_active_mfa_factor(uuid, text, jsonb) set search_path = public;

alter function disable_admin_mfa_factor(uuid, uuid, text, text, jsonb) security definer;
alter function disable_admin_mfa_factor(uuid, uuid, text, text, jsonb) set search_path = public;

alter function revoke_admin_mfa_factor(uuid, uuid, text, text, jsonb) security definer;
alter function revoke_admin_mfa_factor(uuid, uuid, text, text, jsonb) set search_path = public;

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
    'ADMIN_MFA_FACTOR_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'MFA factor not found.',
    'Admin MFA factor not found.',
    'platform'
  ),
  (
    'ADMIN_MFA_FACTOR_INVALID_STATE',
    'validation',
    'medium',
    409,
    false,
    true,
    'MFA factor cannot be changed from its current state.',
    'Admin MFA factor invalid state.',
    'platform'
  ),
  (
    'ADMIN_SUPER_ADMIN_LAST_MFA_FACTOR_PROTECTED',
    'permission',
    'critical',
    409,
    false,
    true,
    'Cannot remove the last active MFA factor for a super admin.',
    'Last active MFA factor protection triggered for super_admin.',
    'platform'
  ),
  (
    'ADMIN_SUPER_ADMIN_ACTIVE_MFA_REQUIRED',
    'permission',
    'critical',
    403,
    false,
    true,
    'Super admin requires an active MFA factor.',
    'Super admin attempted protected action without active MFA factor.',
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
  ('admin MFA factor not found', 'ADMIN_MFA_FACTOR_NOT_FOUND', 5, '{}'),
  ('admin MFA factor is not active', 'ADMIN_MFA_FACTOR_INVALID_STATE', 5, '{}'),
  ('admin MFA factor cannot be revoked from status', 'ADMIN_MFA_FACTOR_INVALID_STATE', 5, '{}'),
  ('cannot disable last active MFA factor for super_admin', 'ADMIN_SUPER_ADMIN_LAST_MFA_FACTOR_PROTECTED', 5, '{}'),
  ('cannot revoke last active MFA factor for super_admin', 'ADMIN_SUPER_ADMIN_LAST_MFA_FACTOR_PROTECTED', 5, '{}'),
  ('active MFA factor required for super_admin', 'ADMIN_SUPER_ADMIN_ACTIVE_MFA_REQUIRED', 5, '{}')
on conflict do nothing;
