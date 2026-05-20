-- Step 9.25 — Build admin session / device / IP risk checks for admin actions.
-- Runs after 139_admin_mfa_recovery_code_security_alerts.sql.

create table if not exists admin_devices (
  id uuid primary key default gen_random_uuid(),
  admin_auth_user_id uuid not null,
  admin_user_id uuid references admin_users(id),
  device_fingerprint_hash text not null,
  platform text,
  browser_name text,
  browser_version text,
  os_name text,
  os_version text,
  device_label text,
  status text not null default 'unknown',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  trust_score numeric(6,4) not null default 0.5000,
  risk_score numeric(6,4) not null default 0.5000,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (admin_auth_user_id, device_fingerprint_hash),
  constraint admin_devices_status_check
    check (status in ('unknown', 'trusted', 'suspicious', 'blocked', 'revoked')),
  constraint admin_devices_score_check
    check (
      trust_score >= 0 and trust_score <= 1
      and risk_score >= 0 and risk_score <= 1
    )
);

create index if not exists admin_devices_admin_idx
  on admin_devices (admin_auth_user_id, status, last_seen_at desc);
create index if not exists admin_devices_fingerprint_idx
  on admin_devices (device_fingerprint_hash);

drop trigger if exists admin_devices_set_updated_at on admin_devices;
create trigger admin_devices_set_updated_at
before update on admin_devices
for each row
execute function set_updated_at();

create table if not exists admin_network_observations (
  id uuid primary key default gen_random_uuid(),
  admin_auth_user_id uuid not null,
  admin_user_id uuid references admin_users(id),
  admin_device_id uuid references admin_devices(id),
  ip_hash text not null,
  ip_country text,
  ip_region text,
  ip_city text,
  asn text,
  network_type text,
  is_vpn boolean,
  is_proxy boolean,
  is_tor boolean,
  is_hosting boolean,
  risk_score numeric(6,4) not null default 0.0000,
  source text not null default 'request_context',
  metadata jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint admin_network_observations_risk_check
    check (risk_score >= 0 and risk_score <= 1)
);

create index if not exists admin_network_observations_admin_idx
  on admin_network_observations (admin_auth_user_id, observed_at desc);
create index if not exists admin_network_observations_ip_hash_idx
  on admin_network_observations (ip_hash, observed_at desc);

create table if not exists admin_session_contexts (
  id uuid primary key default gen_random_uuid(),
  admin_auth_user_id uuid not null,
  admin_user_id uuid references admin_users(id),
  admin_device_id uuid references admin_devices(id),
  admin_network_observation_id uuid references admin_network_observations(id),
  request_id text,
  session_id text,
  user_agent_hash text,
  ip_hash text,
  device_fingerprint_hash text,
  risk_score numeric(6,4) not null default 0.0000,
  trust_score numeric(6,4) not null default 0.5000,
  decision text not null default 'allow',
  reason_code text,
  reason_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_session_contexts_decision_check
    check (decision in ('allow', 'challenge', 'block')),
  constraint admin_session_contexts_score_check
    check (
      risk_score >= 0 and risk_score <= 1
      and trust_score >= 0 and trust_score <= 1
    )
);

create index if not exists admin_session_contexts_admin_idx
  on admin_session_contexts (admin_auth_user_id, created_at desc);
create index if not exists admin_session_contexts_request_idx
  on admin_session_contexts (request_id);
create index if not exists admin_session_contexts_decision_idx
  on admin_session_contexts (decision, created_at desc);

create table if not exists admin_action_risk_evaluations (
  id uuid primary key default gen_random_uuid(),
  admin_auth_user_id uuid not null,
  admin_user_id uuid references admin_users(id),
  admin_session_context_id uuid references admin_session_contexts(id),
  admin_device_id uuid references admin_devices(id),
  admin_network_observation_id uuid references admin_network_observations(id),
  action_key text not null,
  permission_key text,
  target_type text,
  target_id uuid,
  risk_score numeric(6,4) not null default 0.0000,
  trust_score numeric(6,4) not null default 0.5000,
  decision text not null,
  reason_code text not null,
  reason_message text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_action_risk_evaluations_decision_check
    check (decision in ('allow', 'challenge', 'block')),
  constraint admin_action_risk_evaluations_score_check
    check (
      risk_score >= 0 and risk_score <= 1
      and trust_score >= 0 and trust_score <= 1
    )
);

create index if not exists admin_action_risk_evaluations_admin_idx
  on admin_action_risk_evaluations (admin_auth_user_id, created_at desc);
create index if not exists admin_action_risk_evaluations_action_idx
  on admin_action_risk_evaluations (action_key, decision, created_at desc);
create index if not exists admin_action_risk_evaluations_request_idx
  on admin_action_risk_evaluations (request_id);

create or replace function register_admin_device_observation(
  p_admin_auth_user_id uuid,
  p_device_fingerprint_hash text,
  p_platform text default null,
  p_browser_name text default null,
  p_browser_version text default null,
  p_os_name text default null,
  p_os_version text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_device_id uuid;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_device_fingerprint_hash is null or length(trim(p_device_fingerprint_hash)) = 0 then
    raise exception 'device fingerprint hash is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  insert into admin_devices (
    admin_auth_user_id,
    admin_user_id,
    device_fingerprint_hash,
    platform,
    browser_name,
    browser_version,
    os_name,
    os_version,
    status,
    first_seen_at,
    last_seen_at,
    metadata
  )
  values (
    p_admin_auth_user_id,
    v_admin.id,
    p_device_fingerprint_hash,
    p_platform,
    p_browser_name,
    p_browser_version,
    p_os_name,
    p_os_version,
    'unknown',
    now(),
    now(),
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('request_id', p_request_id)
  )
  on conflict (admin_auth_user_id, device_fingerprint_hash)
  do update set
    last_seen_at = now(),
    platform = coalesce(excluded.platform, admin_devices.platform),
    browser_name = coalesce(excluded.browser_name, admin_devices.browser_name),
    browser_version = coalesce(excluded.browser_version, admin_devices.browser_version),
    os_name = coalesce(excluded.os_name, admin_devices.os_name),
    os_version = coalesce(excluded.os_version, admin_devices.os_version),
    metadata = admin_devices.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_device_id;

  return v_device_id;
end;
$$;

create or replace function record_admin_network_observation(
  p_admin_auth_user_id uuid,
  p_admin_device_id uuid,
  p_ip_hash text,
  p_ip_country text default null,
  p_ip_region text default null,
  p_ip_city text default null,
  p_asn text default null,
  p_network_type text default null,
  p_is_vpn boolean default null,
  p_is_proxy boolean default null,
  p_is_tor boolean default null,
  p_is_hosting boolean default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_risk_score numeric := 0;
  v_id uuid;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_ip_hash is null or length(trim(p_ip_hash)) = 0 then
    raise exception 'ip hash is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  v_risk_score := least(
    1.0000,
    case when p_is_tor is true then 0.9000 else 0 end
      + case when p_is_proxy is true then 0.3500 else 0 end
      + case when p_is_vpn is true then 0.2500 else 0 end
      + case when p_is_hosting is true then 0.3000 else 0 end
  );

  insert into admin_network_observations (
    admin_auth_user_id,
    admin_user_id,
    admin_device_id,
    ip_hash,
    ip_country,
    ip_region,
    ip_city,
    asn,
    network_type,
    is_vpn,
    is_proxy,
    is_tor,
    is_hosting,
    risk_score,
    source,
    metadata
  )
  values (
    p_admin_auth_user_id,
    v_admin.id,
    p_admin_device_id,
    p_ip_hash,
    p_ip_country,
    p_ip_region,
    p_ip_city,
    p_asn,
    p_network_type,
    p_is_vpn,
    p_is_proxy,
    p_is_tor,
    p_is_hosting,
    v_risk_score,
    'request_context',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('request_id', p_request_id)
  )
  returning id into v_id;

  return v_id;
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

  return v_id;
end;
$$;

create or replace function evaluate_admin_action_risk(
  p_admin_auth_user_id uuid,
  p_action_key text,
  p_permission_key text default null,
  p_admin_session_context_id uuid default null,
  p_target_type text default null,
  p_target_id uuid default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_session admin_session_contexts%rowtype;
  v_device admin_devices%rowtype;
  v_risk_score numeric := 0;
  v_trust_score numeric := 0.5000;
  v_decision text := 'allow';
  v_reason_code text := 'admin_action_risk_allowed';
  v_reason_message text := 'Admin action risk allowed.';
  v_evaluation_id uuid;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;
  if p_action_key is null or length(trim(p_action_key)) = 0 then
    raise exception 'action key is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  if p_admin_session_context_id is not null then
    select * into v_session from admin_session_contexts where id = p_admin_session_context_id;
  else
    select *
    into v_session
    from admin_session_contexts
    where admin_auth_user_id = p_admin_auth_user_id
    order by created_at desc
    limit 1;
  end if;

  if v_session.id is not null and v_session.admin_device_id is not null then
    select * into v_device from admin_devices where id = v_session.admin_device_id;
  end if;

  v_risk_score := least(
    1.0000,
    coalesce(v_session.risk_score, 0.0000)
      + case
          when p_action_key like '%privileged%' then 0.1500
          when p_action_key like '%admin_role%' then 0.1500
          when p_action_key like '%withdrawal%' then 0.1000
          when p_action_key like '%mfa%' then 0.1000
          else 0.0000
        end
  );
  v_trust_score := coalesce(v_session.trust_score, 0.5000);

  if coalesce(v_device.status, 'unknown') = 'blocked' then
    v_decision := 'block';
    v_reason_code := 'admin_device_blocked';
    v_reason_message := 'Admin action blocked because device is blocked.';
  elsif coalesce(v_session.decision, 'allow') = 'block' then
    v_decision := 'block';
    v_reason_code := 'admin_session_blocked';
    v_reason_message := 'Admin action blocked because session is blocked.';
  elsif v_risk_score >= 0.8500 then
    v_decision := 'block';
    v_reason_code := 'admin_action_high_risk_blocked';
    v_reason_message := 'Admin action blocked due to high contextual risk.';
  elsif v_risk_score >= 0.4500 then
    v_decision := 'challenge';
    v_reason_code := 'admin_action_risk_challenge';
    v_reason_message := 'Admin action requires additional verification due to contextual risk.';
  end if;

  insert into admin_action_risk_evaluations (
    admin_auth_user_id,
    admin_user_id,
    admin_session_context_id,
    admin_device_id,
    admin_network_observation_id,
    action_key,
    permission_key,
    target_type,
    target_id,
    risk_score,
    trust_score,
    decision,
    reason_code,
    reason_message,
    request_id,
    metadata
  )
  values (
    p_admin_auth_user_id,
    v_admin.id,
    v_session.id,
    v_session.admin_device_id,
    v_session.admin_network_observation_id,
    p_action_key,
    p_permission_key,
    p_target_type,
    p_target_id,
    v_risk_score,
    v_trust_score,
    v_decision,
    v_reason_code,
    v_reason_message,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_evaluation_id;

  if v_decision in ('challenge', 'block') then
    perform create_admin_security_alert(
      case when v_decision = 'block' then 'admin_action_risk_blocked' else 'admin_action_risk_challenge' end,
      case when v_decision = 'block' then 'critical' else 'high' end,
      p_admin_auth_user_id,
      p_admin_auth_user_id,
      p_action_key,
      null,
      v_reason_message,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'request_id', p_request_id,
        'evaluation_id', v_evaluation_id,
        'risk_score', v_risk_score,
        'trust_score', v_trust_score,
        'reason_code', v_reason_code
      )
    );
  end if;

  return v_evaluation_id;
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
begin
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

  v_permission := admin_has_permission(p_admin_auth_user_id, 'device.write');
  if v_permission is not true then
    perform record_admin_action(
      p_admin_auth_user_id, 'admin_update_device_status', 'device.write', 'user_device', p_device_id,
      p_request_id, null, null, 'denied', 'missing device.write permission', p_metadata
    );
    raise exception 'missing required permission: device.write';
  end if;

  perform require_admin_action_risk_allowed(
    p_admin_auth_user_id, 'admin_update_device_status', 'device.write', null, 'admin_device',
    p_device_id, p_request_id, p_metadata
  );

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'admin_write',
    p_request_id,
    p_metadata || jsonb_build_object('action_key', 'admin_update_device_status')
  );

  select * into v_device from user_devices where id = p_device_id for update;
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

  v_score_delta := case
    when p_status = 'trusted' then 0.0500
    when p_status = 'suspicious' then -0.0500
    when p_status = 'blocked' then -0.2500
    else 0.0000
  end;

  v_risk_delta := case
    when p_status = 'trusted' then -0.0500
    when p_status = 'suspicious' then 0.1000
    when p_status = 'blocked' then 0.3500
    else 0.0000
  end;

  if v_device.first_seen_user_id is not null and (v_score_delta <> 0 or v_risk_delta <> 0) then
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
    p_admin_auth_user_id, 'admin_update_device_status', 'device.write', 'user_device', p_device_id,
    p_request_id, null, null, 'allowed', p_reason_code,
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

  v_permission := admin_has_permission(p_admin_auth_user_id, 'trust.write');
  if v_permission is not true then
    perform record_admin_action(
      p_admin_auth_user_id, 'admin_add_trust_score_component', 'trust.write', 'user', p_target_user_id,
      p_request_id, null, null, 'denied', 'missing trust.write permission', p_metadata
    );
    raise exception 'missing required permission: trust.write';
  end if;

  perform require_admin_action_risk_allowed(
    p_admin_auth_user_id, 'admin_add_trust_score_component', 'trust.write', null, 'user',
    p_target_user_id, p_request_id, p_metadata
  );

  perform require_admin_mfa(
    p_admin_auth_user_id, 'admin_write', p_request_id,
    p_metadata || jsonb_build_object('action_key', 'admin_add_trust_score_component')
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
    p_metadata || jsonb_build_object('admin_auth_user_id', p_admin_auth_user_id, 'request_id', p_request_id)
  );

  perform record_admin_action(
    p_admin_auth_user_id, 'admin_add_trust_score_component', 'trust.write', 'user', p_target_user_id,
    p_request_id, null, null, 'allowed', p_reason_code,
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

  v_permission := admin_has_permission(p_admin_auth_user_id, 'withdrawal.review');
  if v_permission is not true then
    perform record_admin_action(
      p_admin_auth_user_id, 'admin_approve_withdrawal_review', 'withdrawal.review',
      'withdrawal_request', p_withdrawal_request_id, p_request_id, null, null,
      'denied', 'missing withdrawal.review permission', p_metadata
    );
    raise exception 'missing required permission: withdrawal.review';
  end if;

  perform require_admin_action_risk_allowed(
    p_admin_auth_user_id, 'admin_approve_withdrawal_review', 'withdrawal.review', null,
    'withdrawal_request', p_withdrawal_request_id, p_request_id, p_metadata
  );

  perform require_admin_mfa(
    p_admin_auth_user_id, 'admin_write', p_request_id,
    p_metadata || jsonb_build_object('action_key', 'admin_approve_withdrawal_review')
  );

  v_withdrawal_id := approve_withdrawal_review(
    p_withdrawal_request_id,
    p_admin_auth_user_id::text,
    p_review_note,
    p_metadata || jsonb_build_object('admin_auth_user_id', p_admin_auth_user_id, 'request_id', p_request_id)
  );

  perform record_admin_action(
    p_admin_auth_user_id, 'admin_approve_withdrawal_review', 'withdrawal.review', 'withdrawal_request',
    p_withdrawal_request_id, p_request_id, null, null, 'allowed', p_review_note, p_metadata
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

  v_permission := admin_has_permission(p_admin_auth_user_id, 'withdrawal.review');
  if v_permission is not true then
    perform record_admin_action(
      p_admin_auth_user_id, 'admin_block_withdrawal_review', 'withdrawal.review',
      'withdrawal_request', p_withdrawal_request_id, p_request_id, null, null,
      'denied', 'missing withdrawal.review permission', p_metadata
    );
    raise exception 'missing required permission: withdrawal.review';
  end if;

  perform require_admin_action_risk_allowed(
    p_admin_auth_user_id, 'admin_block_withdrawal_review', 'withdrawal.review', null,
    'withdrawal_request', p_withdrawal_request_id, p_request_id, p_metadata
  );

  perform require_admin_mfa(
    p_admin_auth_user_id, 'admin_write', p_request_id,
    p_metadata || jsonb_build_object('action_key', 'admin_block_withdrawal_review')
  );

  v_withdrawal_id := block_withdrawal_review(
    p_withdrawal_request_id,
    p_admin_auth_user_id::text,
    p_review_note,
    p_metadata || jsonb_build_object('admin_auth_user_id', p_admin_auth_user_id, 'request_id', p_request_id)
  );

  perform record_admin_action(
    p_admin_auth_user_id, 'admin_block_withdrawal_review', 'withdrawal.review', 'withdrawal_request',
    p_withdrawal_request_id, p_request_id, null, null, 'allowed', p_review_note, p_metadata
  );

  return v_withdrawal_id;
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

  v_permission := admin_has_permission(p_admin_auth_user_id, 'admin.write');
  if v_permission is not true then
    perform record_admin_action(
      p_admin_auth_user_id, 'admin_upsert_admin_user', 'admin.write', 'admin_user',
      null, p_request_id, null, null, 'denied', 'missing admin.write permission', p_metadata
    );
    raise exception 'missing required permission: admin.write';
  end if;

  perform require_admin_action_risk_allowed(
    p_admin_auth_user_id, 'admin_upsert_admin_user', 'admin.write', null, 'admin_user', null,
    p_request_id, p_metadata || jsonb_build_object('target_auth_user_id', p_target_auth_user_id)
  );

  perform require_admin_mfa(
    p_admin_auth_user_id, 'admin_write', p_request_id,
    p_metadata || jsonb_build_object('action_key', 'admin_upsert_admin_user')
  );

  select * into v_target_admin
  from admin_users
  where user_id = p_target_auth_user_id
  order by created_at desc
  limit 1;

  v_target_is_super := is_active_super_admin(p_target_auth_user_id);
  if p_status in ('suspended', 'revoked') and v_target_is_super is true then
    v_super_admin_count := count_active_super_admins();
    if v_super_admin_count <= 1 then
      perform record_admin_action(
        p_admin_auth_user_id, 'admin_upsert_admin_user', 'admin.write', 'admin_user', v_target_admin.id,
        p_request_id, null, null, 'denied', 'cannot suspend or revoke last active super_admin', p_metadata
      );
      raise exception 'cannot suspend or revoke last active super_admin';
    end if;
    if p_admin_auth_user_id = p_target_auth_user_id then
      perform record_admin_action(
        p_admin_auth_user_id, 'admin_upsert_admin_user', 'admin.write', 'admin_user', v_target_admin.id,
        p_request_id, null, null, 'denied', 'cannot suspend or revoke own super_admin account', p_metadata
      );
      raise exception 'cannot suspend or revoke own super_admin account';
    end if;

    v_privileged_request_id := request_admin_privileged_action(
      p_admin_auth_user_id,
      case when p_status = 'suspended' then 'suspend_super_admin' else 'revoke_admin_user' end,
      p_target_auth_user_id,
      'super_admin',
      null,
      coalesce(p_reason, 'Privileged admin user status change requested'),
      jsonb_build_object(
        'target_auth_user_id', p_target_auth_user_id,
        'status', p_status,
        'email', p_email,
        'display_name', p_display_name
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
    p_admin_auth_user_id, 'admin_upsert_admin_user', 'admin.write', 'admin_user', v_admin_user_id,
    p_request_id, null, null, 'allowed', coalesce(p_reason, 'admin user upserted'),
    p_metadata || jsonb_build_object(
      'target_auth_user_id', p_target_auth_user_id,
      'status', p_status,
      'email', p_email
    )
  );

  return v_admin_user_id;
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

  v_permission := admin_has_permission(p_admin_auth_user_id, 'admin.write');
  if v_permission is not true then
    perform record_admin_action(
      p_admin_auth_user_id, 'admin_assign_admin_role', 'admin.write', 'admin_user',
      null, p_request_id, null, null, 'denied', 'missing admin.write permission', p_metadata
    );
    raise exception 'missing required permission: admin.write';
  end if;

  perform require_admin_action_risk_allowed(
    p_admin_auth_user_id, 'admin_assign_admin_role', 'admin.write', null, 'admin_user', null,
    p_request_id, p_metadata || jsonb_build_object(
      'target_auth_user_id', p_target_auth_user_id,
      'role_key', p_role_key
    )
  );

  perform require_admin_mfa(
    p_admin_auth_user_id,
    case when p_role_key = 'super_admin' then 'privileged_action' else 'admin_write' end,
    p_request_id,
    p_metadata || jsonb_build_object('action_key', 'admin_assign_admin_role', 'role_key', p_role_key)
  );

  select * into v_target_admin
  from admin_users
  where user_id = p_target_auth_user_id
    and status = 'active';
  if v_target_admin.id is null then
    raise exception 'target admin user not found or inactive';
  end if;

  select * into v_role
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
      jsonb_build_object('target_auth_user_id', p_target_auth_user_id, 'role_key', p_role_key),
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
    p_admin_auth_user_id, 'admin_assign_admin_role', 'admin.write', 'admin_user', v_target_admin.id,
    p_request_id, null, null, 'allowed', p_reason,
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

  v_permission := admin_has_permission(p_admin_auth_user_id, 'admin.write');
  if v_permission is not true then
    perform record_admin_action(
      p_admin_auth_user_id, 'admin_revoke_admin_role', 'admin.write', 'admin_user',
      null, p_request_id, null, null, 'denied', 'missing admin.write permission', p_metadata
    );
    raise exception 'missing required permission: admin.write';
  end if;

  perform require_admin_action_risk_allowed(
    p_admin_auth_user_id, 'admin_revoke_admin_role', 'admin.write', null, 'admin_user', null,
    p_request_id, p_metadata || jsonb_build_object(
      'target_auth_user_id', p_target_auth_user_id,
      'role_key', p_role_key
    )
  );

  perform require_admin_mfa(
    p_admin_auth_user_id,
    case when p_role_key = 'super_admin' then 'privileged_action' else 'admin_write' end,
    p_request_id,
    p_metadata || jsonb_build_object('action_key', 'admin_revoke_admin_role', 'role_key', p_role_key)
  );

  select * into v_target_admin from admin_users where user_id = p_target_auth_user_id;
  if v_target_admin.id is null then
    raise exception 'target admin user not found';
  end if;

  select * into v_role from admin_roles where role_key = p_role_key;
  if v_role.id is null then
    raise exception 'admin role not found: %', p_role_key;
  end if;

  select * into v_assignment
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
        p_admin_auth_user_id, 'admin_revoke_admin_role', 'admin.write', 'admin_user',
        v_target_admin.id, p_request_id, null, null, 'denied',
        'cannot revoke last active super_admin', p_metadata
      );
      raise exception 'cannot revoke last active super_admin';
    end if;

    if p_admin_auth_user_id = p_target_auth_user_id then
      perform record_admin_action(
        p_admin_auth_user_id, 'admin_revoke_admin_role', 'admin.write', 'admin_user',
        v_target_admin.id, p_request_id, null, null, 'denied',
        'cannot self-revoke super_admin role', p_metadata
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
        'target_auth_user_id', p_target_auth_user_id,
        'role_key', p_role_key,
        'assignment_id', v_assignment.id
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
    p_admin_auth_user_id, 'admin_revoke_admin_role', 'admin.write', 'admin_user', v_target_admin.id,
    p_request_id, null, null, 'allowed', p_reason,
    p_metadata || jsonb_build_object(
      'target_auth_user_id', p_target_auth_user_id,
      'role_key', p_role_key,
      'assignment_id', v_assignment.id
    )
  );

  return v_assignment.id;
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
      p_admin_auth_user_id, 'approve_admin_privileged_action', 'admin.write',
      'admin_privileged_action_request', p_privileged_action_request_id, p_request_id, null, null,
      'denied', 'missing admin.write permission', p_metadata
    );
    raise exception 'missing required permission: admin.write';
  end if;

  if is_active_super_admin(p_admin_auth_user_id) is not true then
    raise exception 'only super_admin can approve privileged admin action';
  end if;

  perform require_admin_action_risk_allowed(
    p_admin_auth_user_id, 'approve_admin_privileged_action', 'admin.write', null,
    'admin_privileged_action_request', p_privileged_action_request_id, p_request_id, p_metadata
  );

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'privileged_action',
    p_request_id,
    p_metadata || jsonb_build_object(
      'action_key', 'approve_admin_privileged_action',
      'privileged_action_request_id', p_privileged_action_request_id
    )
  );

  select * into v_request
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
    set status = 'expired', updated_at = now()
    where id = v_request.id;
    raise exception 'privileged action request expired';
  end if;
  if v_request.requested_by_auth_user_id = p_admin_auth_user_id then
    perform record_admin_action(
      p_admin_auth_user_id, 'approve_admin_privileged_action', 'admin.write',
      'admin_privileged_action_request', v_request.id, p_request_id, null, null,
      'denied', 'requester cannot approve own privileged action', p_metadata
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
    metadata = metadata || p_metadata || jsonb_build_object('approval_note', p_approval_note),
    updated_at = now()
  where id = v_request.id;

  perform record_admin_action(
    p_admin_auth_user_id, 'approve_admin_privileged_action', 'admin.write',
    'admin_privileged_action_request', v_request.id, p_request_id, null, null, 'allowed', p_approval_note,
    p_metadata || jsonb_build_object('action_key', v_request.action_key, 'target_auth_user_id', v_request.target_auth_user_id)
  );

  perform create_admin_security_alert(
    'privileged_admin_action_approved',
    case when v_request.action_key in ('assign_super_admin', 'revoke_super_admin', 'suspend_super_admin') then 'critical' else 'high' end,
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
    p_metadata || jsonb_build_object('approval_note', p_approval_note)
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
      p_admin_auth_user_id, 'reject_admin_privileged_action', 'admin.write',
      'admin_privileged_action_request', p_privileged_action_request_id, p_request_id, null, null,
      'denied', 'missing admin.write permission', p_metadata
    );
    raise exception 'missing required permission: admin.write';
  end if;

  if is_active_super_admin(p_admin_auth_user_id) is not true then
    raise exception 'only super_admin can reject privileged admin action';
  end if;

  perform require_admin_action_risk_allowed(
    p_admin_auth_user_id, 'reject_admin_privileged_action', 'admin.write', null,
    'admin_privileged_action_request', p_privileged_action_request_id, p_request_id, p_metadata
  );

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'privileged_action',
    p_request_id,
    p_metadata || jsonb_build_object(
      'action_key', 'reject_admin_privileged_action',
      'privileged_action_request_id', p_privileged_action_request_id
    )
  );

  select * into v_request
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
    set status = 'expired', updated_at = now()
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
    p_admin_auth_user_id, 'reject_admin_privileged_action', 'admin.write',
    'admin_privileged_action_request', v_request.id, p_request_id, null, null, 'allowed', p_rejection_reason,
    p_metadata || jsonb_build_object('action_key', v_request.action_key, 'target_auth_user_id', v_request.target_auth_user_id)
  );

  perform create_admin_security_alert(
    'privileged_admin_action_rejected',
    'high',
    p_admin_auth_user_id,
    v_request.target_auth_user_id,
    v_request.action_key,
    v_request.id,
    'Privileged admin action rejected: ' || v_request.action_key,
    p_metadata || jsonb_build_object('rejection_reason', p_rejection_reason)
  );

  return v_request.id;
end;
$$;

alter table admin_devices enable row level security;
alter table admin_network_observations enable row level security;
alter table admin_session_contexts enable row level security;
alter table admin_action_risk_evaluations enable row level security;

drop policy if exists admin_devices_no_user_direct_access on admin_devices;
create policy admin_devices_no_user_direct_access
on admin_devices
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_network_observations_no_user_direct_access on admin_network_observations;
create policy admin_network_observations_no_user_direct_access
on admin_network_observations
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_session_contexts_no_user_direct_access on admin_session_contexts;
create policy admin_session_contexts_no_user_direct_access
on admin_session_contexts
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_action_risk_evaluations_no_user_direct_access on admin_action_risk_evaluations;
create policy admin_action_risk_evaluations_no_user_direct_access
on admin_action_risk_evaluations
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_api_all_admin_devices on admin_devices;
create policy admin_api_all_admin_devices
on admin_devices
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_network_observations on admin_network_observations;
create policy admin_api_all_admin_network_observations
on admin_network_observations
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_session_contexts on admin_session_contexts;
create policy admin_api_all_admin_session_contexts
on admin_session_contexts
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_action_risk_evaluations on admin_action_risk_evaluations;
create policy admin_api_all_admin_action_risk_evaluations
on admin_action_risk_evaluations
for all
to admin_api_role
using (true)
with check (true);

grant execute on function register_admin_device_observation(
  uuid, text, text, text, text, text, text, text, jsonb
) to admin_api_role;
grant execute on function record_admin_network_observation(
  uuid, uuid, text, text, text, text, text, text, boolean, boolean, boolean, boolean, text, jsonb
) to admin_api_role;
grant execute on function create_admin_session_context(
  uuid, uuid, uuid, text, text, text, text, text, jsonb
) to admin_api_role;
grant execute on function evaluate_admin_action_risk(
  uuid, text, text, uuid, text, uuid, text, jsonb
) to admin_api_role;
grant execute on function require_admin_action_risk_allowed(
  uuid, text, text, uuid, text, uuid, text, jsonb
) to admin_api_role;

alter function register_admin_device_observation(
  uuid, text, text, text, text, text, text, text, jsonb
) security definer;
alter function register_admin_device_observation(
  uuid, text, text, text, text, text, text, text, jsonb
) set search_path = public;

alter function record_admin_network_observation(
  uuid, uuid, text, text, text, text, text, text, boolean, boolean, boolean, boolean, text, jsonb
) security definer;
alter function record_admin_network_observation(
  uuid, uuid, text, text, text, text, text, text, boolean, boolean, boolean, boolean, text, jsonb
) set search_path = public;

alter function create_admin_session_context(
  uuid, uuid, uuid, text, text, text, text, text, jsonb
) security definer;
alter function create_admin_session_context(
  uuid, uuid, uuid, text, text, text, text, text, jsonb
) set search_path = public;

alter function evaluate_admin_action_risk(
  uuid, text, text, uuid, text, uuid, text, jsonb
) security definer;
alter function evaluate_admin_action_risk(
  uuid, text, text, uuid, text, uuid, text, jsonb
) set search_path = public;

alter function require_admin_action_risk_allowed(
  uuid, text, text, uuid, text, uuid, text, jsonb
) security definer;
alter function require_admin_action_risk_allowed(
  uuid, text, text, uuid, text, uuid, text, jsonb
) set search_path = public;

create or replace view admin_device_dashboard as
select
  d.id as admin_device_id,
  d.admin_auth_user_id,
  au.email,
  au.display_name,
  d.device_fingerprint_hash,
  d.platform,
  d.browser_name,
  d.browser_version,
  d.os_name,
  d.os_version,
  d.device_label,
  d.status,
  d.trust_score,
  d.risk_score,
  d.first_seen_at,
  d.last_seen_at,
  d.created_at,
  d.updated_at,
  d.metadata
from admin_devices d
left join admin_users au on au.id = d.admin_user_id
order by d.last_seen_at desc;

create or replace view admin_session_risk_dashboard as
select
  s.id as admin_session_context_id,
  s.admin_auth_user_id,
  au.email,
  au.display_name,
  s.admin_device_id,
  d.status as device_status,
  d.platform,
  d.browser_name,
  d.os_name,
  s.admin_network_observation_id,
  n.ip_country,
  n.ip_region,
  n.ip_city,
  n.asn,
  n.network_type,
  n.is_vpn,
  n.is_proxy,
  n.is_tor,
  n.is_hosting,
  s.request_id,
  s.session_id,
  s.risk_score,
  s.trust_score,
  s.decision,
  s.reason_code,
  s.reason_message,
  s.created_at,
  s.metadata
from admin_session_contexts s
left join admin_users au on au.id = s.admin_user_id
left join admin_devices d on d.id = s.admin_device_id
left join admin_network_observations n on n.id = s.admin_network_observation_id
order by s.created_at desc;

create or replace view admin_action_risk_dashboard as
select
  e.id as admin_action_risk_evaluation_id,
  e.admin_auth_user_id,
  au.email,
  au.display_name,
  e.admin_session_context_id,
  e.admin_device_id,
  e.admin_network_observation_id,
  e.action_key,
  e.permission_key,
  e.target_type,
  e.target_id,
  e.risk_score,
  e.trust_score,
  e.decision,
  e.reason_code,
  e.reason_message,
  e.request_id,
  e.created_at,
  e.metadata
from admin_action_risk_evaluations e
left join admin_users au on au.id = e.admin_user_id
order by e.created_at desc;

grant select on admin_device_dashboard to admin_api_role;
grant select on admin_session_risk_dashboard to admin_api_role;
grant select on admin_action_risk_dashboard to admin_api_role;

create or replace function hash_admin_action_risk_evaluation(
  p_admin_action_risk_evaluation_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_eval admin_action_risk_evaluations%rowtype;
  v_payload jsonb;
begin
  select * into v_eval
  from admin_action_risk_evaluations
  where id = p_admin_action_risk_evaluation_id;

  if v_eval.id is null then
    raise exception 'admin action risk evaluation not found: %', p_admin_action_risk_evaluation_id;
  end if;

  v_payload := jsonb_build_object(
    'source_type', 'admin_action_risk_evaluation',
    'source_id', v_eval.id,
    'admin_auth_user_id', v_eval.admin_auth_user_id,
    'admin_user_id', v_eval.admin_user_id,
    'admin_session_context_id', v_eval.admin_session_context_id,
    'admin_device_id', v_eval.admin_device_id,
    'admin_network_observation_id', v_eval.admin_network_observation_id,
    'action_key', v_eval.action_key,
    'permission_key', v_eval.permission_key,
    'target_type', v_eval.target_type,
    'target_id', v_eval.target_id,
    'risk_score', v_eval.risk_score,
    'trust_score', v_eval.trust_score,
    'decision', v_eval.decision,
    'reason_code', v_eval.reason_code,
    'reason_message', v_eval.reason_message,
    'request_id', v_eval.request_id,
    'created_at', v_eval.created_at
  );

  return append_audit_hash_chain_entry(
    'admin_action_risk_evaluation',
    v_eval.id,
    v_payload,
    'global_audit_chain',
    p_metadata
  );
end;
$$;

create or replace view audit_hash_missing_records as
select
  'wallet_ledger_entry'::text as source_type,
  wle.id as source_id,
  wle.created_at
from wallet_ledger_entries wle
where not exists (
  select 1
  from audit_hash_chain_entries ahc
  where ahc.source_type = 'wallet_ledger_entry'
    and ahc.source_id = wle.id
)
union all
select
  'accounting_journal_entry'::text as source_type,
  aje.id as source_id,
  aje.created_at
from accounting_journal_entries aje
where not exists (
  select 1
  from audit_hash_chain_entries ahc
  where ahc.source_type = 'accounting_journal_entry'
    and ahc.source_id = aje.id
)
union all
select
  'reward_issuance_group'::text as source_type,
  rig.id as source_id,
  rig.created_at
from reward_issuance_groups rig
where rig.status = 'completed'
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'reward_issuance_group'
      and ahc.source_id = rig.id
  )
union all
select
  'attention_verification_event'::text as source_type,
  ave.id as source_id,
  ave.created_at
from attention_verification_events ave
where not exists (
  select 1
  from audit_hash_chain_entries ahc
  where ahc.source_type = 'attention_verification_event'
    and ahc.source_id = ave.id
)
union all
select
  'withdrawal_request'::text as source_type,
  wr.id as source_id,
  wr.created_at
from withdrawal_requests wr
where wr.status in ('reserved', 'submitted', 'processing', 'paid', 'failed', 'cancelled')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'withdrawal_request'
      and ahc.source_id = wr.id
  )
union all
select
  'external_payout'::text as source_type,
  ep.id as source_id,
  ep.created_at
from external_payouts ep
where not exists (
  select 1
  from audit_hash_chain_entries ahc
  where ahc.source_type = 'external_payout'
    and ahc.source_id = ep.id
)
union all
select
  'payout_provider_event'::text as source_type,
  ppe.id as source_id,
  ppe.created_at
from payout_provider_events ppe
where ppe.processing_status in ('processed', 'ignored', 'failed')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'payout_provider_event'
      and ahc.source_id = ppe.id
  )
union all
select
  'admin_action_risk_evaluation'::text as source_type,
  e.id as source_id,
  e.created_at
from admin_action_risk_evaluations e
where e.decision in ('challenge', 'block')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_action_risk_evaluation'
      and ahc.source_id = e.id
  );

create or replace function run_audit_hash_backfill_job(
  p_batch_size integer default 1000,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid;
  v_row record;
  v_scanned integer := 0;
  v_hashed integer := 0;
  v_failed integer := 0;
begin
  if p_batch_size <= 0 then
    raise exception 'batch size must be positive';
  end if;

  insert into audit_hash_backfill_runs (status, metadata)
  values ('processing', coalesce(p_metadata, '{}'::jsonb))
  returning id into v_run_id;

  for v_row in
    select * from audit_hash_missing_records order by created_at asc limit p_batch_size
  loop
    v_scanned := v_scanned + 1;
    begin
      if v_row.source_type = 'wallet_ledger_entry' then
        perform hash_wallet_ledger_entry(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'accounting_journal_entry' then
        perform hash_accounting_journal_entry(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'reward_issuance_group' then
        perform hash_reward_issuance_group(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'attention_verification_event' then
        perform hash_attention_verification_event(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'withdrawal_request' then
        perform hash_withdrawal_request(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'external_payout' then
        perform hash_external_payout(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'payout_provider_event' then
        perform hash_payout_provider_event(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'admin_action_risk_evaluation' then
        perform hash_admin_action_risk_evaluation(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      end if;
      v_hashed := v_hashed + 1;
    exception
      when others then
        v_failed := v_failed + 1;
    end;
  end loop;

  update audit_hash_backfill_runs
  set
    status = 'completed',
    completed_at = now(),
    scanned_count = v_scanned,
    hashed_count = v_hashed,
    failed_count = v_failed
  where id = v_run_id;

  return v_run_id;
exception
  when others then
    if v_run_id is not null then
      update audit_hash_backfill_runs
      set
        status = 'failed',
        failed_at = now(),
        failure_reason = sqlerrm,
        scanned_count = v_scanned,
        hashed_count = v_hashed,
        failed_count = v_failed
      where id = v_run_id;
    end if;
    raise;
end;
$$;

grant execute on function hash_admin_action_risk_evaluation(uuid, jsonb)
to worker_role, admin_api_role;
alter function hash_admin_action_risk_evaluation(uuid, jsonb) security definer;
alter function hash_admin_action_risk_evaluation(uuid, jsonb) set search_path = public;

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
  ('ADMIN_ACTION_RISK_BLOCKED', 'permission', 'critical', 403, false, true, 'Admin action blocked by security risk controls.', 'Admin action blocked by risk engine.', 'platform'),
  ('ADMIN_ACTION_RISK_CHALLENGE_REQUIRED', 'permission', 'high', 403, false, true, 'Additional verification required for this admin action.', 'Admin action risk challenge required.', 'platform'),
  ('ADMIN_DEVICE_BLOCKED', 'permission', 'critical', 403, false, true, 'Admin device is blocked.', 'Blocked admin device attempted action.', 'platform'),
  ('ADMIN_RISK_CONTEXT_FAILED', 'system', 'medium', 500, true, false, 'Admin risk context failed.', 'Failed to create admin request risk context.', 'platform')
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
  ('admin action blocked by risk engine', 'ADMIN_ACTION_RISK_BLOCKED', 5, '{}'),
  ('admin_device_blocked', 'ADMIN_DEVICE_BLOCKED', 5, '{}'),
  ('admin_session_high_risk', 'ADMIN_ACTION_RISK_BLOCKED', 5, '{}'),
  ('admin_action_high_risk_blocked', 'ADMIN_ACTION_RISK_BLOCKED', 5, '{}'),
  ('admin_action_risk_challenge', 'ADMIN_ACTION_RISK_CHALLENGE_REQUIRED', 5, '{}')
on conflict do nothing;
