-- Step 9.20 — Build admin MFA requirement stubs for privileged actions and sensitive admin writes.
-- Runs after 134_admin_security_alert_escalation.sql.

create table if not exists admin_mfa_policies (
  id uuid primary key default gen_random_uuid(),

  policy_key text not null unique,
  status text not null default 'active',

  sensitive_write_max_age_seconds integer not null default 900,
  privileged_action_max_age_seconds integer not null default 300,

  require_mfa_for_admin_write boolean not null default true,
  require_mfa_for_privileged_actions boolean not null default true,

  allowed_methods text[] not null default array['totp', 'webauthn', 'recovery_code'],

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_mfa_policies_status_check
  check (status in ('active', 'paused', 'archived')),

  constraint admin_mfa_policies_age_check
  check (
    sensitive_write_max_age_seconds > 0
    and privileged_action_max_age_seconds > 0
    and privileged_action_max_age_seconds <= sensitive_write_max_age_seconds
  )
);

create index if not exists admin_mfa_policies_status_idx
on admin_mfa_policies (status);

drop trigger if exists admin_mfa_policies_set_updated_at
on admin_mfa_policies;

create trigger admin_mfa_policies_set_updated_at
before update on admin_mfa_policies
for each row
execute function set_updated_at();

insert into admin_mfa_policies (
  policy_key,
  status,
  sensitive_write_max_age_seconds,
  privileged_action_max_age_seconds,
  require_mfa_for_admin_write,
  require_mfa_for_privileged_actions,
  allowed_methods,
  metadata
)
values (
  'default_admin_mfa_policy_v1',
  'active',
  900,
  300,
  true,
  true,
  array['totp', 'webauthn', 'recovery_code'],
  '{"meaning": "default MFA freshness policy for admin security"}'::jsonb
)
on conflict (policy_key)
do update set
  status = excluded.status,
  sensitive_write_max_age_seconds = excluded.sensitive_write_max_age_seconds,
  privileged_action_max_age_seconds = excluded.privileged_action_max_age_seconds,
  require_mfa_for_admin_write = excluded.require_mfa_for_admin_write,
  require_mfa_for_privileged_actions = excluded.require_mfa_for_privileged_actions,
  allowed_methods = excluded.allowed_methods,
  metadata = admin_mfa_policies.metadata || excluded.metadata,
  updated_at = now();

create table if not exists admin_mfa_challenges (
  id uuid primary key default gen_random_uuid(),

  admin_auth_user_id uuid not null,
  admin_user_id uuid references admin_users(id),

  challenge_type text not null,
  challenge_provider text not null default 'stub',

  status text not null default 'pending',

  purpose text not null,

  expires_at timestamptz not null default (now() + interval '5 minutes'),

  verified_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,

  failure_reason text,

  request_id text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_mfa_challenges_type_check
  check (
    challenge_type in (
      'totp',
      'webauthn',
      'recovery_code',
      'stub'
    )
  ),

  constraint admin_mfa_challenges_status_check
  check (
    status in (
      'pending',
      'verified',
      'failed',
      'expired',
      'cancelled'
    )
  ),

  constraint admin_mfa_challenges_purpose_check
  check (
    purpose in (
      'admin_write',
      'privileged_action',
      'admin_login',
      'session_reauth'
    )
  )
);

create index if not exists admin_mfa_challenges_admin_idx
on admin_mfa_challenges (admin_auth_user_id, created_at desc);

create index if not exists admin_mfa_challenges_status_idx
on admin_mfa_challenges (status, expires_at asc);

drop trigger if exists admin_mfa_challenges_set_updated_at
on admin_mfa_challenges;

create trigger admin_mfa_challenges_set_updated_at
before update on admin_mfa_challenges
for each row
execute function set_updated_at();

create table if not exists admin_mfa_verifications (
  id uuid primary key default gen_random_uuid(),

  admin_auth_user_id uuid not null,
  admin_user_id uuid references admin_users(id),

  challenge_id uuid references admin_mfa_challenges(id),

  method text not null,
  provider text not null default 'stub',

  purpose text not null,

  verified_at timestamptz not null default now(),
  expires_at timestamptz not null,

  request_id text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint admin_mfa_verifications_method_check
  check (
    method in (
      'totp',
      'webauthn',
      'recovery_code',
      'stub'
    )
  ),

  constraint admin_mfa_verifications_purpose_check
  check (
    purpose in (
      'admin_write',
      'privileged_action',
      'admin_login',
      'session_reauth'
    )
  ),

  constraint admin_mfa_verifications_expiry_check
  check (expires_at > verified_at)
);

create index if not exists admin_mfa_verifications_admin_idx
on admin_mfa_verifications (admin_auth_user_id, verified_at desc);

create index if not exists admin_mfa_verifications_valid_idx
on admin_mfa_verifications (admin_auth_user_id, purpose, expires_at desc);

create or replace function get_active_admin_mfa_policy()
returns admin_mfa_policies
language plpgsql
stable
as $$
declare
  v_policy admin_mfa_policies%rowtype;
begin
  select *
  into v_policy
  from admin_mfa_policies
  where status = 'active'
  order by updated_at desc
  limit 1;

  if v_policy.id is null then
    raise exception 'no active admin MFA policy found';
  end if;

  return v_policy;
end;
$$;

create or replace function admin_has_recent_mfa_verification(
  p_admin_auth_user_id uuid,
  p_purpose text,
  p_max_age_seconds integer
)
returns boolean
language plpgsql
stable
as $$
begin
  if p_admin_auth_user_id is null then
    return false;
  end if;

  if p_purpose is null then
    return false;
  end if;

  return exists (
    select 1
    from admin_mfa_verifications v
    where v.admin_auth_user_id = p_admin_auth_user_id
      and v.purpose in (p_purpose, 'session_reauth')
      and v.verified_at >= now() - make_interval(secs => p_max_age_seconds)
      and v.expires_at > now()
  );
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

create or replace function create_admin_mfa_challenge(
  p_admin_auth_user_id uuid,
  p_challenge_type text,
  p_purpose text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_challenge_id uuid;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_challenge_type not in ('totp', 'webauthn', 'recovery_code', 'stub') then
    raise exception 'invalid MFA challenge type: %', p_challenge_type;
  end if;

  if p_purpose not in ('admin_write', 'privileged_action', 'admin_login', 'session_reauth') then
    raise exception 'invalid MFA purpose: %', p_purpose;
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  if v_admin.id is null then
    raise exception 'admin user not found or inactive';
  end if;

  insert into admin_mfa_challenges (
    admin_auth_user_id,
    admin_user_id,
    challenge_type,
    challenge_provider,
    status,
    purpose,
    request_id,
    metadata
  )
  values (
    p_admin_auth_user_id,
    v_admin.id,
    p_challenge_type,
    'stub',
    'pending',
    p_purpose,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_challenge_id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'create_admin_mfa_challenge',
    null,
    'admin_mfa_challenge',
    v_challenge_id,
    p_request_id,
    null,
    null,
    'allowed',
    'admin MFA challenge created',
    p_metadata || jsonb_build_object(
      'purpose',
      p_purpose,
      'challenge_type',
      p_challenge_type
    )
  );

  return v_challenge_id;
end;
$$;

create or replace function verify_admin_mfa_challenge_stub(
  p_admin_auth_user_id uuid,
  p_challenge_id uuid,
  p_code text,
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

  if p_code is null or length(trim(p_code)) = 0 then
    raise exception 'MFA code is required';
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
    set
      status = 'expired',
      updated_at = now()
    where id = v_challenge.id;

    raise exception 'MFA challenge expired';
  end if;

  /*
    Dev-only stub.
    The API must additionally block this unless ADMIN_MFA_STUB_ENABLED=true.
  */
  if p_code <> '000000' then
    update admin_mfa_challenges
    set
      status = 'failed',
      failed_at = now(),
      failure_reason = 'invalid stub MFA code',
      updated_at = now()
    where id = v_challenge.id;

    perform record_admin_action(
      p_admin_auth_user_id,
      'verify_admin_mfa_challenge_stub',
      null,
      'admin_mfa_challenge',
      v_challenge.id,
      p_request_id,
      null,
      null,
      'denied',
      'invalid MFA code',
      p_metadata
    );

    raise exception 'invalid MFA code';
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
  set
    status = 'verified',
    verified_at = now(),
    updated_at = now()
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
    'stub',
    'stub',
    v_challenge.purpose,
    now(),
    v_expires_at,
    p_request_id,
    p_metadata
  )
  returning id into v_verification_id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'verify_admin_mfa_challenge_stub',
    null,
    'admin_mfa_challenge',
    v_challenge.id,
    p_request_id,
    null,
    null,
    'allowed',
    'admin MFA challenge verified',
    p_metadata || jsonb_build_object(
      'verification_id',
      v_verification_id,
      'purpose',
      v_challenge.purpose
    )
  );

  return v_verification_id;
end;
$$;

create or replace function admin_update_device_status(
  p_admin_auth_user_id uuid,
  p_device_id uuid,
  p_status text,
  p_reviewed_by text,
  p_reason_code text,
  p_reason_message text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_device user_devices%rowtype;
  v_permission boolean;
  v_score_delta numeric := 0;
  v_risk_delta numeric := 0;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_device_id is null then
    raise exception 'device id is required';
  end if;

  if p_status not in ('active', 'trusted', 'suspicious', 'blocked') then
    raise exception 'invalid device status: %', p_status;
  end if;

  if p_reviewed_by is null or length(trim(p_reviewed_by)) = 0 then
    raise exception 'reviewed_by is required';
  end if;

  if p_reason_code is null or length(trim(p_reason_code)) = 0 then
    raise exception 'reason code is required';
  end if;

  if p_reason_message is null or length(trim(p_reason_message)) = 0 then
    raise exception 'reason message is required';
  end if;

  v_permission := admin_has_permission(
    p_admin_auth_user_id,
    'device.write'
  );

  if v_permission is not true then
    perform record_admin_action(
      p_admin_auth_user_id,
      'admin_update_device_status',
      'device.write',
      'user_device',
      p_device_id,
      p_request_id,
      null,
      null,
      'denied',
      'missing device.write permission',
      p_metadata
    );

    raise exception 'missing required permission: device.write';
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'admin_write',
    p_request_id,
    p_metadata || jsonb_build_object(
      'action_key',
      'admin_update_device_status'
    )
  );

  select *
  into v_device
  from user_devices
  where id = p_device_id
  for update;

  if v_device.id is null then
    raise exception 'device not found: %', p_device_id;
  end if;

  update user_devices
  set
    status = p_status,
    risk_score =
      case
        when p_status = 'trusted' then least(risk_score, 0.1000)
        when p_status = 'active' then risk_score
        when p_status = 'suspicious' then greatest(risk_score, 0.6500)
        when p_status = 'blocked' then 1.0000
        else risk_score
      end,
    metadata = metadata || p_metadata || jsonb_build_object(
      'last_admin_status_update',
      jsonb_build_object(
        'admin_auth_user_id', p_admin_auth_user_id,
        'reviewed_by', p_reviewed_by,
        'reason_code', p_reason_code,
        'reason_message', p_reason_message,
        'request_id', p_request_id,
        'status', p_status,
        'updated_at', now()
      )
    ),
    updated_at = now()
  where id = p_device_id;

  v_score_delta :=
    case
      when p_status = 'trusted' then 0.0500
      when p_status = 'suspicious' then -0.0500
      when p_status = 'blocked' then -0.2500
      else 0.0000
    end;

  v_risk_delta :=
    case
      when p_status = 'trusted' then -0.0500
      when p_status = 'suspicious' then 0.1000
      when p_status = 'blocked' then 0.3500
      else 0.0000
    end;

  if v_device.first_seen_user_id is not null
    and (v_score_delta <> 0 or v_risk_delta <> 0) then
    perform add_user_trust_score_component(
      v_device.first_seen_user_id,
      case
        when p_status = 'trusted' then 'admin_device_trusted'
        when p_status = 'suspicious' then 'admin_device_suspicious'
        when p_status = 'blocked' then 'admin_device_blocked'
        else 'admin_device_status_updated'
      end,
      'device',
      v_score_delta,
      v_risk_delta,
      1.0000,
      'user_device',
      p_device_id,
      p_reason_code,
      p_reason_message,
      p_metadata || jsonb_build_object(
        'admin_auth_user_id', p_admin_auth_user_id,
        'reviewed_by', p_reviewed_by,
        'request_id', p_request_id
      )
    );
  end if;

  perform record_admin_action(
    p_admin_auth_user_id,
    'admin_update_device_status',
    'device.write',
    'user_device',
    p_device_id,
    p_request_id,
    null,
    null,
    'allowed',
    p_reason_code,
    p_metadata || jsonb_build_object(
      'status', p_status,
      'reviewed_by', p_reviewed_by,
      'reason_message', p_reason_message
    )
  );

  return p_device_id;
end;
$$;

create or replace function admin_add_trust_score_component(
  p_admin_auth_user_id uuid,
  p_target_user_id uuid,
  p_component_key text,
  p_component_category text,
  p_score_delta numeric default 0,
  p_risk_delta numeric default 0,
  p_weight numeric default 1,
  p_reason_code text default 'admin_manual_adjustment',
  p_reason_message text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_permission boolean;
  v_component_id uuid;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_target_user_id is null then
    raise exception 'target user id is required';
  end if;

  if p_component_key is null or length(trim(p_component_key)) = 0 then
    raise exception 'component key is required';
  end if;

  if p_reason_code is null or length(trim(p_reason_code)) = 0 then
    raise exception 'reason code is required';
  end if;

  v_permission := admin_has_permission(
    p_admin_auth_user_id,
    'trust.write'
  );

  if v_permission is not true then
    perform record_admin_action(
      p_admin_auth_user_id,
      'admin_add_trust_score_component',
      'trust.write',
      'user',
      p_target_user_id,
      p_request_id,
      null,
      null,
      'denied',
      'missing trust.write permission',
      p_metadata
    );

    raise exception 'missing required permission: trust.write';
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'admin_write',
    p_request_id,
    p_metadata || jsonb_build_object(
      'action_key',
      'admin_add_trust_score_component'
    )
  );

  v_component_id := add_user_trust_score_component(
    p_target_user_id,
    p_component_key,
    p_component_category,
    p_score_delta,
    p_risk_delta,
    p_weight,
    'admin_action',
    null,
    p_reason_code,
    p_reason_message,
    p_metadata || jsonb_build_object(
      'admin_auth_user_id', p_admin_auth_user_id,
      'request_id', p_request_id
    )
  );

  perform record_admin_action(
    p_admin_auth_user_id,
    'admin_add_trust_score_component',
    'trust.write',
    'user',
    p_target_user_id,
    p_request_id,
    null,
    null,
    'allowed',
    p_reason_code,
    p_metadata || jsonb_build_object(
      'component_id', v_component_id,
      'component_key', p_component_key,
      'component_category', p_component_category,
      'score_delta', p_score_delta,
      'risk_delta', p_risk_delta,
      'weight', p_weight
    )
  );

  return v_component_id;
end;
$$;

create or replace function admin_approve_withdrawal_review(
  p_admin_auth_user_id uuid,
  p_withdrawal_request_id uuid,
  p_review_note text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_permission boolean;
  v_withdrawal_id uuid;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_withdrawal_request_id is null then
    raise exception 'withdrawal request id is required';
  end if;

  if p_review_note is null or length(trim(p_review_note)) = 0 then
    raise exception 'review note is required';
  end if;

  v_permission := admin_has_permission(
    p_admin_auth_user_id,
    'withdrawal.review'
  );

  if v_permission is not true then
    perform record_admin_action(
      p_admin_auth_user_id,
      'admin_approve_withdrawal_review',
      'withdrawal.review',
      'withdrawal_request',
      p_withdrawal_request_id,
      p_request_id,
      null,
      null,
      'denied',
      'missing withdrawal.review permission',
      p_metadata
    );

    raise exception 'missing required permission: withdrawal.review';
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'admin_write',
    p_request_id,
    p_metadata || jsonb_build_object(
      'action_key',
      'admin_approve_withdrawal_review'
    )
  );

  v_withdrawal_id := approve_withdrawal_review(
    p_withdrawal_request_id,
    p_admin_auth_user_id::text,
    p_review_note,
    p_metadata || jsonb_build_object(
      'admin_auth_user_id', p_admin_auth_user_id,
      'request_id', p_request_id
    )
  );

  perform record_admin_action(
    p_admin_auth_user_id,
    'admin_approve_withdrawal_review',
    'withdrawal.review',
    'withdrawal_request',
    p_withdrawal_request_id,
    p_request_id,
    null,
    null,
    'allowed',
    p_review_note,
    p_metadata
  );

  return v_withdrawal_id;
end;
$$;

create or replace function admin_block_withdrawal_review(
  p_admin_auth_user_id uuid,
  p_withdrawal_request_id uuid,
  p_review_note text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_permission boolean;
  v_withdrawal_id uuid;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_withdrawal_request_id is null then
    raise exception 'withdrawal request id is required';
  end if;

  if p_review_note is null or length(trim(p_review_note)) = 0 then
    raise exception 'review note is required';
  end if;

  v_permission := admin_has_permission(
    p_admin_auth_user_id,
    'withdrawal.review'
  );

  if v_permission is not true then
    perform record_admin_action(
      p_admin_auth_user_id,
      'admin_block_withdrawal_review',
      'withdrawal.review',
      'withdrawal_request',
      p_withdrawal_request_id,
      p_request_id,
      null,
      null,
      'denied',
      'missing withdrawal.review permission',
      p_metadata
    );

    raise exception 'missing required permission: withdrawal.review';
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'admin_write',
    p_request_id,
    p_metadata || jsonb_build_object(
      'action_key',
      'admin_block_withdrawal_review'
    )
  );

  v_withdrawal_id := block_withdrawal_review(
    p_withdrawal_request_id,
    p_admin_auth_user_id::text,
    p_review_note,
    p_metadata || jsonb_build_object(
      'admin_auth_user_id', p_admin_auth_user_id,
      'request_id', p_request_id
    )
  );

  perform record_admin_action(
    p_admin_auth_user_id,
    'admin_block_withdrawal_review',
    'withdrawal.review',
    'withdrawal_request',
    p_withdrawal_request_id,
    p_request_id,
    null,
    null,
    'allowed',
    p_review_note,
    p_metadata
  );

  return v_withdrawal_id;
end;
$$;

create or replace function request_admin_privileged_action(
  p_admin_auth_user_id uuid,
  p_action_key text,
  p_target_auth_user_id uuid,
  p_target_role_key text default null,
  p_target_permission_key text default null,
  p_reason text default null,
  p_requested_payload jsonb default '{}'::jsonb,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_permission boolean;
  v_requester admin_users%rowtype;
  v_target_admin admin_users%rowtype;
  v_request_id uuid;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_action_key is null then
    raise exception 'action key is required';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'reason is required';
  end if;

  v_permission := admin_has_permission(
    p_admin_auth_user_id,
    'admin.write'
  );

  if v_permission is not true then
    perform record_admin_action(
      p_admin_auth_user_id,
      'request_admin_privileged_action',
      'admin.write',
      'admin_user',
      null,
      p_request_id,
      null,
      null,
      'denied',
      'missing admin.write permission',
      p_metadata
    );

    raise exception 'missing required permission: admin.write';
  end if;

  if is_active_super_admin(p_admin_auth_user_id) is not true then
    perform record_admin_action(
      p_admin_auth_user_id,
      'request_admin_privileged_action',
      'admin.write',
      'admin_user',
      null,
      p_request_id,
      null,
      null,
      'denied',
      'only super_admin can request privileged admin action',
      p_metadata
    );

    raise exception 'only super_admin can request privileged admin action';
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'privileged_action',
    p_request_id,
    p_metadata || jsonb_build_object(
      'action_key',
      p_action_key
    )
  );

  v_requester := get_active_admin_user(p_admin_auth_user_id);

  select *
  into v_target_admin
  from admin_users
  where user_id = p_target_auth_user_id
  order by created_at desc
  limit 1;

  insert into admin_privileged_action_requests (
    requested_by_auth_user_id,
    requested_by_admin_user_id,
    action_key,
    target_auth_user_id,
    target_admin_user_id,
    target_role_key,
    target_permission_key,
    status,
    reason,
    requested_payload,
    metadata
  )
  values (
    p_admin_auth_user_id,
    v_requester.id,
    p_action_key,
    p_target_auth_user_id,
    v_target_admin.id,
    p_target_role_key,
    p_target_permission_key,
    'pending',
    p_reason,
    coalesce(p_requested_payload, '{}'::jsonb),
    p_metadata || jsonb_build_object(
      'request_id',
      p_request_id
    )
  )
  returning id into v_request_id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'request_admin_privileged_action',
    'admin.write',
    'admin_privileged_action_request',
    v_request_id,
    p_request_id,
    null,
    null,
    'allowed',
    p_reason,
    p_metadata || jsonb_build_object(
      'action_key',
      p_action_key,
      'target_auth_user_id',
      p_target_auth_user_id,
      'target_role_key',
      p_target_role_key
    )
  );

  perform create_admin_security_alert(
    'privileged_admin_action_requested',
    case
      when p_action_key in ('assign_super_admin', 'revoke_super_admin', 'suspend_super_admin')
      then 'critical'
      else 'high'
    end,
    p_admin_auth_user_id,
    p_target_auth_user_id,
    p_action_key,
    v_request_id,
    'Privileged admin action requested: ' || p_action_key,
    p_metadata
  );

  return v_request_id;
end;
$$;

create or replace function admin_assign_admin_role(
  p_admin_auth_user_id uuid,
  p_target_auth_user_id uuid,
  p_role_key text,
  p_reason text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_permission boolean;
  v_assignment_id uuid;
  v_target_admin admin_users%rowtype;
  v_role admin_roles%rowtype;
  v_privileged_request_id uuid;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_target_auth_user_id is null then
    raise exception 'target auth user id is required';
  end if;

  if p_role_key is null or length(trim(p_role_key)) = 0 then
    raise exception 'role key is required';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'reason is required';
  end if;

  v_permission := admin_has_permission(
    p_admin_auth_user_id,
    'admin.write'
  );

  if v_permission is not true then
    perform record_admin_action(
      p_admin_auth_user_id,
      'admin_assign_admin_role',
      'admin.write',
      'admin_user',
      null,
      p_request_id,
      null,
      null,
      'denied',
      'missing admin.write permission',
      p_metadata
    );

    raise exception 'missing required permission: admin.write';
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    case
      when p_role_key = 'super_admin' then 'privileged_action'
      else 'admin_write'
    end,
    p_request_id,
    p_metadata || jsonb_build_object(
      'action_key',
      'admin_assign_admin_role',
      'role_key',
      p_role_key
    )
  );

  select *
  into v_target_admin
  from admin_users
  where user_id = p_target_auth_user_id
    and status = 'active';

  if v_target_admin.id is null then
    raise exception 'target admin user not found or inactive';
  end if;

  select *
  into v_role
  from admin_roles
  where role_key = p_role_key
    and status = 'active';

  if v_role.id is null then
    raise exception 'admin role not found: %', p_role_key;
  end if;

  if p_role_key = 'super_admin' then
    v_privileged_request_id := request_admin_privileged_action(
      p_admin_auth_user_id,
      'assign_super_admin',
      p_target_auth_user_id,
      'super_admin',
      null,
      p_reason,
      jsonb_build_object(
        'target_auth_user_id',
        p_target_auth_user_id,
        'role_key',
        p_role_key
      ),
      p_request_id,
      p_metadata
    );

    return v_privileged_request_id;
  end if;

  v_assignment_id := assign_admin_role(
    p_target_auth_user_id,
    p_role_key,
    p_admin_auth_user_id,
    p_reason
  );

  perform record_admin_action(
    p_admin_auth_user_id,
    'admin_assign_admin_role',
    'admin.write',
    'admin_user',
    v_target_admin.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_reason,
    p_metadata || jsonb_build_object(
      'target_auth_user_id', p_target_auth_user_id,
      'role_key', p_role_key,
      'assignment_id', v_assignment_id
    )
  );

  return v_assignment_id;
end;
$$;

create or replace function admin_revoke_admin_role(
  p_admin_auth_user_id uuid,
  p_target_auth_user_id uuid,
  p_role_key text,
  p_reason text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_permission boolean;
  v_target_admin admin_users%rowtype;
  v_role admin_roles%rowtype;
  v_assignment admin_user_roles%rowtype;
  v_super_admin_count integer;
  v_privileged_request_id uuid;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_target_auth_user_id is null then
    raise exception 'target auth user id is required';
  end if;

  if p_role_key is null or length(trim(p_role_key)) = 0 then
    raise exception 'role key is required';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'reason is required';
  end if;

  v_permission := admin_has_permission(
    p_admin_auth_user_id,
    'admin.write'
  );

  if v_permission is not true then
    perform record_admin_action(
      p_admin_auth_user_id,
      'admin_revoke_admin_role',
      'admin.write',
      'admin_user',
      null,
      p_request_id,
      null,
      null,
      'denied',
      'missing admin.write permission',
      p_metadata
    );

    raise exception 'missing required permission: admin.write';
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    case
      when p_role_key = 'super_admin' then 'privileged_action'
      else 'admin_write'
    end,
    p_request_id,
    p_metadata || jsonb_build_object(
      'action_key',
      'admin_revoke_admin_role',
      'role_key',
      p_role_key
    )
  );

  select *
  into v_target_admin
  from admin_users
  where user_id = p_target_auth_user_id;

  if v_target_admin.id is null then
    raise exception 'target admin user not found';
  end if;

  select *
  into v_role
  from admin_roles
  where role_key = p_role_key;

  if v_role.id is null then
    raise exception 'admin role not found: %', p_role_key;
  end if;

  select *
  into v_assignment
  from admin_user_roles
  where admin_user_id = v_target_admin.id
    and admin_role_id = v_role.id
    and status = 'active'
  for update;

  if v_assignment.id is null then
    raise exception 'admin role assignment not found';
  end if;

  if p_role_key = 'super_admin' then
    v_super_admin_count := count_active_super_admins();

    if v_super_admin_count <= 1 then
      perform record_admin_action(
        p_admin_auth_user_id,
        'admin_revoke_admin_role',
        'admin.write',
        'admin_user',
        v_target_admin.id,
        p_request_id,
        null,
        null,
        'denied',
        'cannot revoke last active super_admin',
        p_metadata
      );

      raise exception 'cannot revoke last active super_admin';
    end if;

    if p_admin_auth_user_id = p_target_auth_user_id then
      perform record_admin_action(
        p_admin_auth_user_id,
        'admin_revoke_admin_role',
        'admin.write',
        'admin_user',
        v_target_admin.id,
        p_request_id,
        null,
        null,
        'denied',
        'cannot self-revoke super_admin role',
        p_metadata
      );

      raise exception 'cannot self-revoke super_admin role';
    end if;

    v_privileged_request_id := request_admin_privileged_action(
      p_admin_auth_user_id,
      'revoke_super_admin',
      p_target_auth_user_id,
      'super_admin',
      null,
      p_reason,
      jsonb_build_object(
        'target_auth_user_id',
        p_target_auth_user_id,
        'role_key',
        p_role_key,
        'assignment_id',
        v_assignment.id
      ),
      p_request_id,
      p_metadata
    );

    return v_privileged_request_id;
  end if;

  update admin_user_roles
  set
    status = 'revoked',
    assigned_by = p_admin_auth_user_id,
    assigned_reason = p_reason,
    updated_at = now()
  where id = v_assignment.id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'admin_revoke_admin_role',
    'admin.write',
    'admin_user',
    v_target_admin.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_reason,
    p_metadata || jsonb_build_object(
      'target_auth_user_id', p_target_auth_user_id,
      'role_key', p_role_key,
      'assignment_id', v_assignment.id
    )
  );

  return v_assignment.id;
end;
$$;

create or replace function admin_upsert_admin_user(
  p_admin_auth_user_id uuid,
  p_target_auth_user_id uuid,
  p_email text default null,
  p_display_name text default null,
  p_status text default 'active',
  p_reason text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_permission boolean;
  v_admin_user_id uuid;
  v_target_admin admin_users%rowtype;
  v_target_is_super boolean;
  v_super_admin_count integer;
  v_privileged_request_id uuid;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_target_auth_user_id is null then
    raise exception 'target auth user id is required';
  end if;

  if p_status not in ('active', 'suspended', 'revoked') then
    raise exception 'invalid admin user status: %', p_status;
  end if;

  v_permission := admin_has_permission(
    p_admin_auth_user_id,
    'admin.write'
  );

  if v_permission is not true then
    perform record_admin_action(
      p_admin_auth_user_id,
      'admin_upsert_admin_user',
      'admin.write',
      'admin_user',
      null,
      p_request_id,
      null,
      null,
      'denied',
      'missing admin.write permission',
      p_metadata
    );

    raise exception 'missing required permission: admin.write';
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'admin_write',
    p_request_id,
    p_metadata || jsonb_build_object(
      'action_key',
      'admin_upsert_admin_user'
    )
  );

  select *
  into v_target_admin
  from admin_users
  where user_id = p_target_auth_user_id
  order by created_at desc
  limit 1;

  v_target_is_super := is_active_super_admin(p_target_auth_user_id);

  if p_status in ('suspended', 'revoked')
    and v_target_is_super is true then
    v_super_admin_count := count_active_super_admins();

    if v_super_admin_count <= 1 then
      perform record_admin_action(
        p_admin_auth_user_id,
        'admin_upsert_admin_user',
        'admin.write',
        'admin_user',
        v_target_admin.id,
        p_request_id,
        null,
        null,
        'denied',
        'cannot suspend or revoke last active super_admin',
        p_metadata
      );

      raise exception 'cannot suspend or revoke last active super_admin';
    end if;

    if p_admin_auth_user_id = p_target_auth_user_id then
      perform record_admin_action(
        p_admin_auth_user_id,
        'admin_upsert_admin_user',
        'admin.write',
        'admin_user',
        v_target_admin.id,
        p_request_id,
        null,
        null,
        'denied',
        'cannot suspend or revoke own super_admin account',
        p_metadata
      );

      raise exception 'cannot suspend or revoke own super_admin account';
    end if;

    v_privileged_request_id := request_admin_privileged_action(
      p_admin_auth_user_id,
      case
        when p_status = 'suspended' then 'suspend_super_admin'
        else 'revoke_admin_user'
      end,
      p_target_auth_user_id,
      'super_admin',
      null,
      coalesce(p_reason, 'Privileged admin user status change requested'),
      jsonb_build_object(
        'target_auth_user_id',
        p_target_auth_user_id,
        'status',
        p_status,
        'email',
        p_email,
        'display_name',
        p_display_name
      ),
      p_request_id,
      p_metadata
    );

    return v_privileged_request_id;
  end if;

  v_admin_user_id := upsert_admin_user(
    p_target_auth_user_id,
    p_email,
    p_display_name,
    p_status,
    p_metadata || jsonb_build_object(
      'managed_by_admin_auth_user_id', p_admin_auth_user_id,
      'reason', p_reason,
      'request_id', p_request_id
    )
  );

  perform record_admin_action(
    p_admin_auth_user_id,
    'admin_upsert_admin_user',
    'admin.write',
    'admin_user',
    v_admin_user_id,
    p_request_id,
    null,
    null,
    'allowed',
    coalesce(p_reason, 'admin user upserted'),
    p_metadata || jsonb_build_object(
      'target_auth_user_id', p_target_auth_user_id,
      'status', p_status,
      'email', p_email
    )
  );

  return v_admin_user_id;
end;
$$;

create or replace function approve_admin_privileged_action(
  p_admin_auth_user_id uuid,
  p_privileged_action_request_id uuid,
  p_approval_note text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request admin_privileged_action_requests%rowtype;
  v_admin admin_users%rowtype;
  v_executed_id uuid;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_privileged_action_request_id is null then
    raise exception 'privileged action request id is required';
  end if;

  if p_approval_note is null or length(trim(p_approval_note)) = 0 then
    raise exception 'approval note is required';
  end if;

  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    perform record_admin_action(
      p_admin_auth_user_id,
      'approve_admin_privileged_action',
      'admin.write',
      'admin_privileged_action_request',
      p_privileged_action_request_id,
      p_request_id,
      null,
      null,
      'denied',
      'missing admin.write permission',
      p_metadata
    );

    raise exception 'missing required permission: admin.write';
  end if;

  if is_active_super_admin(p_admin_auth_user_id) is not true then
    raise exception 'only super_admin can approve privileged admin action';
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'privileged_action',
    p_request_id,
    p_metadata || jsonb_build_object(
      'action_key',
      'approve_admin_privileged_action',
      'privileged_action_request_id',
      p_privileged_action_request_id
    )
  );

  select *
  into v_request
  from admin_privileged_action_requests
  where id = p_privileged_action_request_id
  for update;

  if v_request.id is null then
    raise exception 'privileged action request not found: %', p_privileged_action_request_id;
  end if;

  if v_request.status <> 'pending' then
    raise exception 'privileged action request is not pending';
  end if;

  if v_request.expires_at <= now() then
    update admin_privileged_action_requests
    set
      status = 'expired',
      updated_at = now()
    where id = v_request.id;

    raise exception 'privileged action request expired';
  end if;

  if v_request.requested_by_auth_user_id = p_admin_auth_user_id then
    perform record_admin_action(
      p_admin_auth_user_id,
      'approve_admin_privileged_action',
      'admin.write',
      'admin_privileged_action_request',
      v_request.id,
      p_request_id,
      null,
      null,
      'denied',
      'requester cannot approve own privileged action',
      p_metadata
    );

    raise exception 'requester cannot approve own privileged action';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  update admin_privileged_action_requests
  set
    status = 'approved',
    approved_by_auth_user_id = p_admin_auth_user_id,
    approved_by_admin_user_id = v_admin.id,
    approved_at = now(),
    metadata = metadata || p_metadata || jsonb_build_object(
      'approval_note',
      p_approval_note
    ),
    updated_at = now()
  where id = v_request.id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'approve_admin_privileged_action',
    'admin.write',
    'admin_privileged_action_request',
    v_request.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_approval_note,
    p_metadata || jsonb_build_object(
      'action_key',
      v_request.action_key,
      'target_auth_user_id',
      v_request.target_auth_user_id
    )
  );

  perform create_admin_security_alert(
    'privileged_admin_action_approved',
    case
      when v_request.action_key in ('assign_super_admin', 'revoke_super_admin', 'suspend_super_admin')
      then 'critical'
      else 'high'
    end,
    p_admin_auth_user_id,
    v_request.target_auth_user_id,
    v_request.action_key,
    v_request.id,
    'Privileged admin action approved: ' || v_request.action_key,
    p_metadata
  );

  v_executed_id := execute_admin_privileged_action_internal(
    v_request.id,
    p_admin_auth_user_id,
    p_request_id,
    p_metadata || jsonb_build_object(
      'approval_note',
      p_approval_note
    )
  );

  return v_executed_id;
end;
$$;

create or replace function reject_admin_privileged_action(
  p_admin_auth_user_id uuid,
  p_privileged_action_request_id uuid,
  p_rejection_reason text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request admin_privileged_action_requests%rowtype;
  v_admin admin_users%rowtype;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_privileged_action_request_id is null then
    raise exception 'privileged action request id is required';
  end if;

  if p_rejection_reason is null or length(trim(p_rejection_reason)) = 0 then
    raise exception 'rejection reason is required';
  end if;

  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    perform record_admin_action(
      p_admin_auth_user_id,
      'reject_admin_privileged_action',
      'admin.write',
      'admin_privileged_action_request',
      p_privileged_action_request_id,
      p_request_id,
      null,
      null,
      'denied',
      'missing admin.write permission',
      p_metadata
    );

    raise exception 'missing required permission: admin.write';
  end if;

  if is_active_super_admin(p_admin_auth_user_id) is not true then
    raise exception 'only super_admin can reject privileged admin action';
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'privileged_action',
    p_request_id,
    p_metadata || jsonb_build_object(
      'action_key',
      'reject_admin_privileged_action',
      'privileged_action_request_id',
      p_privileged_action_request_id
    )
  );

  select *
  into v_request
  from admin_privileged_action_requests
  where id = p_privileged_action_request_id
  for update;

  if v_request.id is null then
    raise exception 'privileged action request not found: %', p_privileged_action_request_id;
  end if;

  if v_request.status <> 'pending' then
    raise exception 'privileged action request is not pending';
  end if;

  if v_request.expires_at <= now() then
    update admin_privileged_action_requests
    set
      status = 'expired',
      updated_at = now()
    where id = v_request.id;

    raise exception 'privileged action request expired';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  update admin_privileged_action_requests
  set
    status = 'rejected',
    rejected_by_auth_user_id = p_admin_auth_user_id,
    rejected_by_admin_user_id = v_admin.id,
    rejected_at = now(),
    rejection_reason = p_rejection_reason,
    metadata = metadata || p_metadata,
    updated_at = now()
  where id = v_request.id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'reject_admin_privileged_action',
    'admin.write',
    'admin_privileged_action_request',
    v_request.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_rejection_reason,
    p_metadata || jsonb_build_object(
      'action_key',
      v_request.action_key,
      'target_auth_user_id',
      v_request.target_auth_user_id
    )
  );

  perform create_admin_security_alert(
    'privileged_admin_action_rejected',
    'high',
    p_admin_auth_user_id,
    v_request.target_auth_user_id,
    v_request.action_key,
    v_request.id,
    'Privileged admin action rejected: ' || v_request.action_key,
    p_metadata || jsonb_build_object(
      'rejection_reason',
      p_rejection_reason
    )
  );

  return v_request.id;
end;
$$;

create or replace view admin_mfa_challenge_dashboard as
select
  c.id as admin_mfa_challenge_id,
  c.admin_auth_user_id,
  au.email,
  au.display_name,
  c.challenge_type,
  c.challenge_provider,
  c.status,
  c.purpose,
  c.expires_at,
  c.verified_at,
  c.failed_at,
  c.cancelled_at,
  c.failure_reason,
  c.request_id,
  c.created_at,
  c.updated_at,
  c.metadata
from admin_mfa_challenges c
left join admin_users au
  on au.id = c.admin_user_id
order by c.created_at desc;

create or replace view admin_mfa_verification_dashboard as
select
  v.id as admin_mfa_verification_id,
  v.admin_auth_user_id,
  au.email,
  au.display_name,
  v.challenge_id,
  v.method,
  v.provider,
  v.purpose,
  v.verified_at,
  v.expires_at,
  v.request_id,
  v.created_at,
  v.metadata
from admin_mfa_verifications v
left join admin_users au
  on au.id = v.admin_user_id
order by v.verified_at desc;

create or replace view admin_mfa_status_detail as
select
  au.id as admin_user_id,
  au.user_id as admin_auth_user_id,
  au.email,
  au.display_name,
  au.status,
  exists (
    select 1
    from admin_mfa_verifications v
    join admin_mfa_policies p
      on p.status = 'active'
    where v.admin_auth_user_id = au.user_id
      and v.purpose in ('admin_write', 'session_reauth')
      and v.verified_at >= now() - make_interval(secs => p.sensitive_write_max_age_seconds)
      and v.expires_at > now()
  ) as has_recent_admin_write_mfa,
  exists (
    select 1
    from admin_mfa_verifications v
    join admin_mfa_policies p
      on p.status = 'active'
    where v.admin_auth_user_id = au.user_id
      and v.purpose in ('privileged_action', 'session_reauth')
      and v.verified_at >= now() - make_interval(secs => p.privileged_action_max_age_seconds)
      and v.expires_at > now()
  ) as has_recent_privileged_action_mfa,
  (
    select max(verified_at)
    from admin_mfa_verifications v
    where v.admin_auth_user_id = au.user_id
  ) as last_mfa_verified_at
from admin_users au;

grant select on admin_mfa_challenge_dashboard to admin_api_role;
grant select on admin_mfa_verification_dashboard to admin_api_role;
grant select on admin_mfa_status_detail to admin_api_role;

alter table admin_mfa_policies enable row level security;
alter table admin_mfa_challenges enable row level security;
alter table admin_mfa_verifications enable row level security;

create policy admin_mfa_policies_no_user_direct_access
on admin_mfa_policies
for all
to authenticated
using (false)
with check (false);

create policy admin_mfa_challenges_no_user_direct_access
on admin_mfa_challenges
for all
to authenticated
using (false)
with check (false);

create policy admin_mfa_verifications_no_user_direct_access
on admin_mfa_verifications
for all
to authenticated
using (false)
with check (false);

create policy admin_api_read_admin_mfa_policies
on admin_mfa_policies
for select
to admin_api_role
using (true);

create policy admin_api_all_admin_mfa_challenges
on admin_mfa_challenges
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_admin_mfa_verifications
on admin_mfa_verifications
for all
to admin_api_role
using (true)
with check (true);

grant execute on function get_active_admin_mfa_policy()
to admin_api_role;

grant execute on function admin_has_recent_mfa_verification(uuid, text, integer)
to admin_api_role;

grant execute on function require_admin_mfa(uuid, text, text, jsonb)
to admin_api_role;

grant execute on function create_admin_mfa_challenge(uuid, text, text, text, jsonb)
to admin_api_role;

grant execute on function verify_admin_mfa_challenge_stub(uuid, uuid, text, text, jsonb)
to admin_api_role;

alter function get_active_admin_mfa_policy() security definer;
alter function get_active_admin_mfa_policy() set search_path = public;

alter function admin_has_recent_mfa_verification(uuid, text, integer) security definer;
alter function admin_has_recent_mfa_verification(uuid, text, integer) set search_path = public;

alter function require_admin_mfa(uuid, text, text, jsonb) security definer;
alter function require_admin_mfa(uuid, text, text, jsonb) set search_path = public;

alter function create_admin_mfa_challenge(uuid, text, text, text, jsonb) security definer;
alter function create_admin_mfa_challenge(uuid, text, text, text, jsonb) set search_path = public;

alter function verify_admin_mfa_challenge_stub(uuid, uuid, text, text, jsonb) security definer;
alter function verify_admin_mfa_challenge_stub(uuid, uuid, text, text, jsonb) set search_path = public;

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
    'ADMIN_MFA_REQUIRED',
    'permission',
    'high',
    403,
    false,
    true,
    'Recent MFA verification required.',
    'Recent MFA verification required for admin action.',
    'platform'
  ),
  (
    'ADMIN_MFA_CHALLENGE_INVALID',
    'validation',
    'medium',
    400,
    false,
    true,
    'MFA challenge is invalid.',
    'Admin MFA challenge invalid.',
    'platform'
  ),
  (
    'ADMIN_MFA_CHALLENGE_EXPIRED',
    'validation',
    'medium',
    409,
    false,
    true,
    'MFA challenge expired.',
    'Admin MFA challenge expired.',
    'platform'
  ),
  (
    'ADMIN_MFA_VERIFICATION_FAILED',
    'permission',
    'high',
    403,
    false,
    true,
    'MFA verification failed.',
    'Admin MFA verification failed.',
    'platform'
  ),
  (
    'ADMIN_MFA_POLICY_MISSING',
    'system',
    'critical',
    500,
    false,
    false,
    'MFA policy unavailable.',
    'No active admin MFA policy found.',
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
  ('recent MFA verification required', 'ADMIN_MFA_REQUIRED', 5, '{}'),
  ('admin MFA challenge not found', 'ADMIN_MFA_CHALLENGE_INVALID', 5, '{}'),
  ('MFA challenge does not belong to admin', 'ADMIN_MFA_CHALLENGE_INVALID', 5, '{}'),
  ('MFA challenge is not pending', 'ADMIN_MFA_CHALLENGE_INVALID', 5, '{}'),
  ('MFA challenge expired', 'ADMIN_MFA_CHALLENGE_EXPIRED', 5, '{}'),
  ('invalid MFA code', 'ADMIN_MFA_VERIFICATION_FAILED', 5, '{}'),
  ('stub admin MFA verification is disabled', 'ADMIN_MFA_VERIFICATION_FAILED', 5, '{}'),
  ('no active admin MFA policy found', 'ADMIN_MFA_POLICY_MISSING', 5, '{}')
on conflict do nothing;
