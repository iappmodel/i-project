-- Step 9.27 — Build admin session revocation + forced reauthentication.
-- Runs after 141_admin_device_trust_workflow.sql.

create table if not exists admin_session_controls (
  id uuid primary key default gen_random_uuid(),

  admin_auth_user_id uuid not null,
  admin_user_id uuid references admin_users(id),

  session_id text not null,

  status text not null default 'active',

  forced_reauth_required boolean not null default false,
  forced_reauth_reason text,

  revoked_at timestamptz,
  revoked_by_auth_user_id uuid,
  revoked_by_admin_user_id uuid references admin_users(id),
  revoked_reason text,

  last_seen_at timestamptz not null default now(),

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz,

  unique (admin_auth_user_id, session_id),

  constraint admin_session_controls_status_check
  check (
    status in (
      'active',
      'reauth_required',
      'revoked',
      'expired'
    )
  )
);

create index if not exists admin_session_controls_admin_idx
on admin_session_controls (admin_auth_user_id, status, last_seen_at desc);

create index if not exists admin_session_controls_session_idx
on admin_session_controls (session_id);

drop trigger if exists admin_session_controls_set_updated_at
on admin_session_controls;

create trigger admin_session_controls_set_updated_at
before update on admin_session_controls
for each row
execute function set_updated_at();

create or replace function touch_admin_session_control(
  p_admin_auth_user_id uuid,
  p_session_id text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_control_id uuid;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_session_id is null or length(trim(p_session_id)) = 0 then
    raise exception 'admin session id is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  insert into admin_session_controls (
    admin_auth_user_id,
    admin_user_id,
    session_id,
    status,
    last_seen_at,
    metadata
  )
  values (
    p_admin_auth_user_id,
    v_admin.id,
    p_session_id,
    'active',
    now(),
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'request_id',
      p_request_id
    )
  )
  on conflict (admin_auth_user_id, session_id)
  do update set
    last_seen_at = now(),
    metadata = admin_session_controls.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_control_id;

  return v_control_id;
end;
$$;

create or replace function require_admin_session_allowed(
  p_admin_auth_user_id uuid,
  p_session_id text,
  p_action_key text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
as $$
declare
  v_control admin_session_controls%rowtype;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_session_id is null or length(trim(p_session_id)) = 0 then
    perform record_admin_action(
      p_admin_auth_user_id,
      'admin_session_id_missing',
      null,
      null,
      null,
      p_request_id,
      null,
      null,
      'denied',
      'admin session id missing',
      p_metadata || jsonb_build_object(
        'action_key',
        p_action_key
      )
    );

    raise exception 'admin session id required';
  end if;

  select *
  into v_control
  from admin_session_controls
  where admin_auth_user_id = p_admin_auth_user_id
    and session_id = p_session_id
  order by updated_at desc
  limit 1;

  if v_control.id is null then
    perform touch_admin_session_control(
      p_admin_auth_user_id,
      p_session_id,
      p_request_id,
      p_metadata || jsonb_build_object(
        'source',
        'require_admin_session_allowed'
      )
    );

    return true;
  end if;

  if v_control.status = 'revoked' then
    perform record_admin_action(
      p_admin_auth_user_id,
      'admin_session_revoked_blocked',
      null,
      'admin_session_control',
      v_control.id,
      p_request_id,
      null,
      null,
      'denied',
      coalesce(v_control.revoked_reason, 'admin session revoked'),
      p_metadata || jsonb_build_object(
        'action_key',
        p_action_key,
        'session_id',
        p_session_id
      )
    );

    raise exception 'admin session has been revoked';
  end if;

  if v_control.status = 'expired' then
    raise exception 'admin session has expired';
  end if;

  if v_control.status = 'reauth_required'
    or v_control.forced_reauth_required is true then

    perform record_admin_action(
      p_admin_auth_user_id,
      'admin_session_reauth_required',
      null,
      'admin_session_control',
      v_control.id,
      p_request_id,
      null,
      null,
      'denied',
      coalesce(v_control.forced_reauth_reason, 'admin session requires reauthentication'),
      p_metadata || jsonb_build_object(
        'action_key',
        p_action_key,
        'session_id',
        p_session_id
      )
    );

    raise exception 'admin session requires reauthentication';
  end if;

  update admin_session_controls
  set
    last_seen_at = now(),
    updated_at = now()
  where id = v_control.id;

  return true;
end;
$$;

create or replace function admin_force_session_reauth(
  p_admin_auth_user_id uuid,
  p_target_admin_auth_user_id uuid,
  p_session_id text,
  p_reason text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_permission boolean;
  v_actor_admin admin_users%rowtype;
  v_target_admin admin_users%rowtype;
  v_control_id uuid;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_target_admin_auth_user_id is null then
    raise exception 'target admin auth user id is required';
  end if;

  if p_session_id is null or length(trim(p_session_id)) = 0 then
    raise exception 'admin session id is required';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'reason is required';
  end if;

  v_permission := admin_has_permission(p_admin_auth_user_id, 'admin.write');

  if v_permission is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'admin_write',
    p_request_id,
    p_metadata || jsonb_build_object(
      'action_key',
      'admin_force_session_reauth'
    )
  );

  perform require_admin_action_risk_allowed(
    p_admin_auth_user_id,
    'admin_force_session_reauth',
    'admin.write',
    null,
    'admin_session_control',
    null,
    p_request_id,
    p_metadata || jsonb_build_object(
      'target_admin_auth_user_id',
      p_target_admin_auth_user_id,
      'session_id',
      p_session_id
    )
  );

  v_actor_admin := get_active_admin_user(p_admin_auth_user_id);

  select *
  into v_target_admin
  from admin_users
  where user_id = p_target_admin_auth_user_id
    and status = 'active'
  order by created_at desc
  limit 1;

  if v_target_admin.id is null then
    raise exception 'target admin user not found or inactive';
  end if;

  insert into admin_session_controls (
    admin_auth_user_id,
    admin_user_id,
    session_id,
    status,
    forced_reauth_required,
    forced_reauth_reason,
    last_seen_at,
    metadata
  )
  values (
    p_target_admin_auth_user_id,
    v_target_admin.id,
    p_session_id,
    'reauth_required',
    true,
    p_reason,
    now(),
    p_metadata || jsonb_build_object(
      'forced_by_auth_user_id',
      p_admin_auth_user_id,
      'forced_by_admin_user_id',
      v_actor_admin.id,
      'request_id',
      p_request_id
    )
  )
  on conflict (admin_auth_user_id, session_id)
  do update set
    status = 'reauth_required',
    forced_reauth_required = true,
    forced_reauth_reason = excluded.forced_reauth_reason,
    metadata = admin_session_controls.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_control_id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'admin_force_session_reauth',
    'admin.write',
    'admin_session_control',
    v_control_id,
    p_request_id,
    null,
    null,
    'allowed',
    p_reason,
    p_metadata || jsonb_build_object(
      'target_admin_auth_user_id',
      p_target_admin_auth_user_id,
      'session_id',
      p_session_id
    )
  );

  perform create_admin_security_alert(
    'admin_session_reauth_forced',
    'high',
    p_admin_auth_user_id,
    p_target_admin_auth_user_id,
    'admin_force_session_reauth',
    null,
    'Admin session was marked for forced reauthentication.',
    p_metadata || jsonb_build_object(
      'request_id',
      p_request_id,
      'admin_session_control_id',
      v_control_id,
      'session_id',
      p_session_id,
      'reason',
      p_reason
    )
  );

  return v_control_id;
end;
$$;

create or replace function admin_revoke_session(
  p_admin_auth_user_id uuid,
  p_target_admin_auth_user_id uuid,
  p_session_id text,
  p_reason text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_permission boolean;
  v_actor_admin admin_users%rowtype;
  v_target_admin admin_users%rowtype;
  v_control_id uuid;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_target_admin_auth_user_id is null then
    raise exception 'target admin auth user id is required';
  end if;

  if p_session_id is null or length(trim(p_session_id)) = 0 then
    raise exception 'admin session id is required';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'reason is required';
  end if;

  v_permission := admin_has_permission(p_admin_auth_user_id, 'admin.write');

  if v_permission is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'privileged_action',
    p_request_id,
    p_metadata || jsonb_build_object(
      'action_key',
      'admin_revoke_session'
    )
  );

  perform require_admin_action_risk_allowed(
    p_admin_auth_user_id,
    'admin_revoke_session',
    'admin.write',
    null,
    'admin_session_control',
    null,
    p_request_id,
    p_metadata || jsonb_build_object(
      'target_admin_auth_user_id',
      p_target_admin_auth_user_id,
      'session_id',
      p_session_id
    )
  );

  v_actor_admin := get_active_admin_user(p_admin_auth_user_id);

  select *
  into v_target_admin
  from admin_users
  where user_id = p_target_admin_auth_user_id
    and status = 'active'
  order by created_at desc
  limit 1;

  if v_target_admin.id is null then
    raise exception 'target admin user not found or inactive';
  end if;

  insert into admin_session_controls (
    admin_auth_user_id,
    admin_user_id,
    session_id,
    status,
    forced_reauth_required,
    revoked_at,
    revoked_by_auth_user_id,
    revoked_by_admin_user_id,
    revoked_reason,
    last_seen_at,
    metadata
  )
  values (
    p_target_admin_auth_user_id,
    v_target_admin.id,
    p_session_id,
    'revoked',
    true,
    now(),
    p_admin_auth_user_id,
    v_actor_admin.id,
    p_reason,
    now(),
    p_metadata || jsonb_build_object(
      'request_id',
      p_request_id
    )
  )
  on conflict (admin_auth_user_id, session_id)
  do update set
    status = 'revoked',
    forced_reauth_required = true,
    revoked_at = now(),
    revoked_by_auth_user_id = p_admin_auth_user_id,
    revoked_by_admin_user_id = v_actor_admin.id,
    revoked_reason = p_reason,
    metadata = admin_session_controls.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_control_id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'admin_revoke_session',
    'admin.write',
    'admin_session_control',
    v_control_id,
    p_request_id,
    null,
    null,
    'allowed',
    p_reason,
    p_metadata || jsonb_build_object(
      'target_admin_auth_user_id',
      p_target_admin_auth_user_id,
      'session_id',
      p_session_id
    )
  );

  perform create_admin_security_alert(
    'admin_session_revoked',
    'critical',
    p_admin_auth_user_id,
    p_target_admin_auth_user_id,
    'admin_revoke_session',
    null,
    'Admin session was revoked.',
    p_metadata || jsonb_build_object(
      'request_id',
      p_request_id,
      'admin_session_control_id',
      v_control_id,
      'session_id',
      p_session_id,
      'reason',
      p_reason
    )
  );

  return v_control_id;
end;
$$;

create or replace function complete_admin_session_reauth(
  p_admin_auth_user_id uuid,
  p_session_id text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_control admin_session_controls%rowtype;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_session_id is null or length(trim(p_session_id)) = 0 then
    raise exception 'admin session id is required';
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'session_reauth',
    p_request_id,
    p_metadata || jsonb_build_object(
      'action_key',
      'complete_admin_session_reauth'
    )
  );

  select *
  into v_control
  from admin_session_controls
  where admin_auth_user_id = p_admin_auth_user_id
    and session_id = p_session_id
  for update;

  if v_control.id is null then
    raise exception 'admin session control not found';
  end if;

  if v_control.status = 'revoked' then
    raise exception 'admin session has been revoked';
  end if;

  update admin_session_controls
  set
    status = 'active',
    forced_reauth_required = false,
    forced_reauth_reason = null,
    last_seen_at = now(),
    metadata = metadata || p_metadata || jsonb_build_object(
      'reauth_completed_at',
      now(),
      'reauth_request_id',
      p_request_id
    ),
    updated_at = now()
  where id = v_control.id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'complete_admin_session_reauth',
    null,
    'admin_session_control',
    v_control.id,
    p_request_id,
    null,
    null,
    'allowed',
    'admin session reauthentication completed',
    p_metadata
  );

  return v_control.id;
end;
$$;

create or replace function create_admin_session_context(
  p_admin_auth_user_id uuid,
  p_admin_device_id uuid default null,
  p_admin_network_observation_id uuid default null,
  p_request_id text default null,
  p_session_id text default null,
  p_user_agent_hash text default null,
  p_ip_hash text default null,
  p_device_fingerprint_hash text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_device admin_devices%rowtype;
  v_network admin_network_observations%rowtype;
  v_risk_score numeric := 0;
  v_trust_score numeric := 0.5000;
  v_decision text := 'allow';
  v_reason_code text := 'admin_session_allowed';
  v_reason_message text := 'Admin session context allowed.';
  v_id uuid;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  if p_admin_device_id is not null then
    select * into v_device from admin_devices where id = p_admin_device_id;
  end if;

  if p_admin_network_observation_id is not null then
    select * into v_network from admin_network_observations where id = p_admin_network_observation_id;
  end if;

  v_risk_score := least(
    1.0000,
    coalesce(v_device.risk_score, 0.0000)
      + coalesce(v_network.risk_score, 0.0000)
      + case when v_device.status = 'unknown' then 0.1500 else 0 end
      + case when v_device.status = 'suspicious' then 0.5000 else 0 end
      + case when v_device.status = 'blocked' then 1.0000 else 0 end
  );

  v_trust_score := greatest(
    0.0000,
    least(1.0000, coalesce(v_device.trust_score, 0.5000) - coalesce(v_network.risk_score, 0.0000))
  );

  if v_device.status = 'blocked' then
    v_decision := 'block';
    v_reason_code := 'admin_device_blocked';
    v_reason_message := 'Admin device is blocked.';
  elsif v_risk_score >= 0.8000 then
    v_decision := 'block';
    v_reason_code := 'admin_session_high_risk';
    v_reason_message := 'Admin session risk is too high.';
  elsif v_risk_score >= 0.4000 then
    v_decision := 'challenge';
    v_reason_code := 'admin_session_requires_challenge';
    v_reason_message := 'Admin session requires additional verification.';
  end if;

  insert into admin_session_contexts (
    admin_auth_user_id,
    admin_user_id,
    admin_device_id,
    admin_network_observation_id,
    request_id,
    session_id,
    user_agent_hash,
    ip_hash,
    device_fingerprint_hash,
    risk_score,
    trust_score,
    decision,
    reason_code,
    reason_message,
    metadata
  )
  values (
    p_admin_auth_user_id,
    v_admin.id,
    p_admin_device_id,
    p_admin_network_observation_id,
    p_request_id,
    p_session_id,
    p_user_agent_hash,
    p_ip_hash,
    p_device_fingerprint_hash,
    v_risk_score,
    v_trust_score,
    v_decision,
    v_reason_code,
    v_reason_message,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  if p_session_id is not null and length(trim(p_session_id)) > 0 then
    perform touch_admin_session_control(
      p_admin_auth_user_id,
      p_session_id,
      p_request_id,
      p_metadata || jsonb_build_object(
        'source',
        'create_admin_session_context'
      )
    );
  end if;

  return v_id;
end;
$$;

create or replace function require_admin_action_risk_allowed(
  p_admin_auth_user_id uuid,
  p_action_key text,
  p_permission_key text default null,
  p_admin_session_context_id uuid default null,
  p_target_type text default null,
  p_target_id uuid default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
as $$
declare
  v_evaluation_id uuid;
  v_eval admin_action_risk_evaluations%rowtype;
  v_session admin_session_contexts%rowtype;
begin
  if p_admin_session_context_id is not null then
    select *
    into v_session
    from admin_session_contexts
    where id = p_admin_session_context_id;
  else
    select *
    into v_session
    from admin_session_contexts
    where admin_auth_user_id = p_admin_auth_user_id
    order by created_at desc
    limit 1;
  end if;

  if v_session.session_id is not null then
    perform require_admin_session_allowed(
      p_admin_auth_user_id,
      v_session.session_id,
      p_action_key,
      p_request_id,
      p_metadata
    );
  end if;

  v_evaluation_id := evaluate_admin_action_risk(
    p_admin_auth_user_id,
    p_action_key,
    p_permission_key,
    p_admin_session_context_id,
    p_target_type,
    p_target_id,
    p_request_id,
    p_metadata
  );

  select * into v_eval from admin_action_risk_evaluations where id = v_evaluation_id;

  if v_eval.decision = 'block' then
    perform record_admin_action(
      p_admin_auth_user_id,
      'admin_action_risk_blocked',
      p_permission_key,
      p_target_type,
      p_target_id,
      p_request_id,
      null,
      null,
      'denied',
      v_eval.reason_code,
      p_metadata || jsonb_build_object(
        'evaluation_id', v_eval.id,
        'risk_score', v_eval.risk_score
      )
    );
    raise exception 'admin action blocked by risk engine: %', v_eval.reason_code;
  end if;

  if v_eval.decision = 'challenge' then
    perform require_admin_mfa(
      p_admin_auth_user_id,
      'privileged_action',
      p_request_id,
      p_metadata || jsonb_build_object(
        'source', 'admin_action_risk_challenge',
        'evaluation_id', v_eval.id,
        'reason_code', v_eval.reason_code
      )
    );
  end if;

  return true;
end;
$$;

create or replace view admin_session_control_dashboard as
select
  c.id as admin_session_control_id,
  c.admin_auth_user_id,
  au.email,
  au.display_name,
  c.session_id,
  c.status,
  c.forced_reauth_required,
  c.forced_reauth_reason,
  c.revoked_at,
  c.revoked_by_auth_user_id,
  revoker.email as revoked_by_email,
  c.revoked_reason,
  c.last_seen_at,
  (
    select count(*)
    from admin_session_contexts s
    where s.admin_auth_user_id = c.admin_auth_user_id
      and s.session_id = c.session_id
  ) as context_count,
  (
    select max(s.created_at)
    from admin_session_contexts s
    where s.admin_auth_user_id = c.admin_auth_user_id
      and s.session_id = c.session_id
  ) as last_context_at,
  c.created_at,
  c.updated_at,
  c.metadata
from admin_session_controls c
left join admin_users au
  on au.id = c.admin_user_id
left join admin_users revoker
  on revoker.id = c.revoked_by_admin_user_id
order by c.last_seen_at desc;

grant select on admin_session_control_dashboard to admin_api_role;

alter table admin_session_controls enable row level security;

drop policy if exists admin_session_controls_no_user_direct_access
on admin_session_controls;

create policy admin_session_controls_no_user_direct_access
on admin_session_controls
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_api_all_admin_session_controls
on admin_session_controls;

create policy admin_api_all_admin_session_controls
on admin_session_controls
for all
to admin_api_role
using (true)
with check (true);

grant execute on function touch_admin_session_control(uuid, text, text, jsonb)
to admin_api_role;

grant execute on function require_admin_session_allowed(uuid, text, text, text, jsonb)
to admin_api_role;

grant execute on function admin_force_session_reauth(uuid, uuid, text, text, text, jsonb)
to admin_api_role;

grant execute on function admin_revoke_session(uuid, uuid, text, text, text, jsonb)
to admin_api_role;

grant execute on function complete_admin_session_reauth(uuid, text, text, jsonb)
to admin_api_role;

alter function touch_admin_session_control(uuid, text, text, jsonb) security definer;
alter function touch_admin_session_control(uuid, text, text, jsonb) set search_path = public;

alter function require_admin_session_allowed(uuid, text, text, text, jsonb) security definer;
alter function require_admin_session_allowed(uuid, text, text, text, jsonb) set search_path = public;

alter function admin_force_session_reauth(uuid, uuid, text, text, text, jsonb) security definer;
alter function admin_force_session_reauth(uuid, uuid, text, text, text, jsonb) set search_path = public;

alter function admin_revoke_session(uuid, uuid, text, text, text, jsonb) security definer;
alter function admin_revoke_session(uuid, uuid, text, text, text, jsonb) set search_path = public;

alter function complete_admin_session_reauth(uuid, text, text, jsonb) security definer;
alter function complete_admin_session_reauth(uuid, text, text, jsonb) set search_path = public;

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
    'ADMIN_SESSION_ID_REQUIRED',
    'permission',
    'high',
    403,
    false,
    true,
    'Admin session identifier is required.',
    'Admin session id missing.',
    'platform'
  ),
  (
    'ADMIN_SESSION_REAUTH_REQUIRED',
    'permission',
    'high',
    403,
    false,
    true,
    'Admin session requires reauthentication.',
    'Admin session marked for forced reauthentication.',
    'platform'
  ),
  (
    'ADMIN_SESSION_REVOKED',
    'permission',
    'critical',
    403,
    false,
    true,
    'Admin session has been revoked.',
    'Revoked admin session attempted access.',
    'platform'
  ),
  (
    'ADMIN_SESSION_EXPIRED',
    'permission',
    'high',
    403,
    false,
    true,
    'Admin session has expired.',
    'Expired admin session attempted access.',
    'platform'
  ),
  (
    'ADMIN_SESSION_CONTROL_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Admin session control not found.',
    'Admin session control not found.',
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
  ('admin session id required', 'ADMIN_SESSION_ID_REQUIRED', 5, '{}'),
  ('admin session requires reauthentication', 'ADMIN_SESSION_REAUTH_REQUIRED', 5, '{}'),
  ('admin session has been revoked', 'ADMIN_SESSION_REVOKED', 5, '{}'),
  ('admin session has expired', 'ADMIN_SESSION_EXPIRED', 5, '{}'),
  ('admin session control not found', 'ADMIN_SESSION_CONTROL_NOT_FOUND', 5, '{}')
on conflict do nothing;
