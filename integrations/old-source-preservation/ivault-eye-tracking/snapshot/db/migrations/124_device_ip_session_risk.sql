create table if not exists user_devices (
  id uuid primary key default gen_random_uuid(),

  device_fingerprint_hash text not null unique,

  platform text not null,
  app_version text,
  device_model text,
  os_version text,

  first_seen_user_id uuid,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),

  user_count integer not null default 1,
  session_count bigint not null default 0,

  status text not null default 'active',

  risk_score numeric(6, 4) not null default 0.0000,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint user_devices_platform_check
  check (
    platform in (
      'ios',
      'android',
      'web',
      'desktop',
      'server',
      'unknown'
    )
  ),

  constraint user_devices_status_check
  check (
    status in (
      'active',
      'trusted',
      'suspicious',
      'blocked'
    )
  ),

  constraint user_devices_risk_score_check
  check (
    risk_score >= 0 and risk_score <= 1
  )
);

create index if not exists user_devices_status_idx
on user_devices (status, last_seen_at desc);

create index if not exists user_devices_risk_idx
on user_devices (risk_score desc, last_seen_at desc);

drop trigger if exists user_devices_set_updated_at
on user_devices;

create trigger user_devices_set_updated_at
before update on user_devices
for each row
execute function set_updated_at();

create table if not exists user_device_links (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null,
  device_id uuid not null references user_devices(id),

  relationship_status text not null default 'active',

  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),

  session_count bigint not null default 0,

  trust_label text not null default 'unknown',

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, device_id),

  constraint user_device_links_relationship_status_check
  check (
    relationship_status in (
      'active',
      'removed',
      'blocked'
    )
  ),

  constraint user_device_links_trust_label_check
  check (
    trust_label in (
      'unknown',
      'new',
      'recognized',
      'trusted',
      'suspicious',
      'blocked'
    )
  )
);

create index if not exists user_device_links_user_idx
on user_device_links (user_id, last_seen_at desc);

create index if not exists user_device_links_device_idx
on user_device_links (device_id, last_seen_at desc);

create index if not exists user_device_links_label_idx
on user_device_links (trust_label, last_seen_at desc);

drop trigger if exists user_device_links_set_updated_at
on user_device_links;

create trigger user_device_links_set_updated_at
before update on user_device_links
for each row
execute function set_updated_at();

create table if not exists user_network_observations (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null,
  device_id uuid references user_devices(id),

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

  risk_score numeric(6, 4) not null default 0.0000,

  source text not null default 'api',

  metadata jsonb not null default '{}'::jsonb,

  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint user_network_observations_network_type_check
  check (
    network_type is null
    or network_type in (
      'residential',
      'mobile',
      'corporate',
      'hosting',
      'proxy',
      'vpn',
      'tor',
      'unknown'
    )
  ),

  constraint user_network_observations_risk_score_check
  check (
    risk_score >= 0 and risk_score <= 1
  )
);

create index if not exists user_network_observations_user_idx
on user_network_observations (user_id, observed_at desc);

create index if not exists user_network_observations_ip_idx
on user_network_observations (ip_hash, observed_at desc);

create index if not exists user_network_observations_risk_idx
on user_network_observations (risk_score desc, observed_at desc);

create table if not exists user_session_risk_events (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null,
  device_id uuid references user_devices(id),

  app_session_id uuid,
  request_id text,

  event_type text not null,

  platform text,
  app_version text,

  ip_hash text,

  risk_score numeric(6, 4) not null default 0.0000,
  trust_delta numeric(7, 4) not null default 0.0000,
  risk_delta numeric(7, 4) not null default 0.0000,

  decision text not null default 'allow',

  reason_code text not null,
  reason_message text,

  source text not null default 'api',

  metadata jsonb not null default '{}'::jsonb,

  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint user_session_risk_events_event_type_check
  check (
    event_type in (
      'session_started',
      'new_device_seen',
      'recognized_device_seen',
      'shared_device_seen',
      'blocked_device_seen',
      'risky_network_seen',
      'vpn_seen',
      'proxy_seen',
      'tor_seen',
      'hosting_network_seen',
      'rapid_session_velocity',
      'attention_runtime_risk',
      'withdrawal_session_risk',
      'admin_flag'
    )
  ),

  constraint user_session_risk_events_decision_check
  check (
    decision in (
      'allow',
      'review',
      'block'
    )
  ),

  constraint user_session_risk_events_risk_score_check
  check (
    risk_score >= 0 and risk_score <= 1
  )
);

create index if not exists user_session_risk_events_user_idx
on user_session_risk_events (user_id, occurred_at desc);

create index if not exists user_session_risk_events_device_idx
on user_session_risk_events (device_id, occurred_at desc);

create index if not exists user_session_risk_events_type_idx
on user_session_risk_events (event_type, occurred_at desc);

create index if not exists user_session_risk_events_decision_idx
on user_session_risk_events (decision, occurred_at desc);

create or replace function register_user_device_observation(
  p_user_id uuid,
  p_device_fingerprint_hash text,
  p_platform text default 'unknown',
  p_app_version text default null,
  p_device_model text default null,
  p_os_version text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_device_id uuid;
  v_existing_user_count integer;
  v_link_exists boolean;
  v_trust_label text;
begin
  if p_user_id is null then
    raise exception 'user id is required';
  end if;

  if p_device_fingerprint_hash is null or length(trim(p_device_fingerprint_hash)) < 16 then
    raise exception 'device fingerprint hash is required';
  end if;

  insert into user_devices (
    device_fingerprint_hash,
    platform,
    app_version,
    device_model,
    os_version,
    first_seen_user_id,
    first_seen_at,
    last_seen_at,
    session_count,
    metadata
  )
  values (
    p_device_fingerprint_hash,
    coalesce(p_platform, 'unknown'),
    p_app_version,
    p_device_model,
    p_os_version,
    p_user_id,
    now(),
    now(),
    1,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (device_fingerprint_hash)
  do update set
    platform = coalesce(excluded.platform, user_devices.platform),
    app_version = coalesce(excluded.app_version, user_devices.app_version),
    device_model = coalesce(excluded.device_model, user_devices.device_model),
    os_version = coalesce(excluded.os_version, user_devices.os_version),
    last_seen_at = now(),
    session_count = user_devices.session_count + 1,
    metadata = user_devices.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_device_id;

  select count(distinct user_id)
  into v_existing_user_count
  from user_device_links
  where device_id = v_device_id
    and relationship_status = 'active';

  select exists (
    select 1
    from user_device_links
    where user_id = p_user_id
      and device_id = v_device_id
  )
  into v_link_exists;

  v_trust_label :=
    case
      when v_link_exists is false then 'new'
      when v_existing_user_count >= 5 then 'suspicious'
      else 'recognized'
    end;

  insert into user_device_links (
    user_id,
    device_id,
    relationship_status,
    first_seen_at,
    last_seen_at,
    session_count,
    trust_label,
    metadata
  )
  values (
    p_user_id,
    v_device_id,
    'active',
    now(),
    now(),
    1,
    v_trust_label,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (user_id, device_id)
  do update set
    last_seen_at = now(),
    session_count = user_device_links.session_count + 1,
    trust_label =
      case
        when user_device_links.trust_label in ('trusted', 'blocked')
        then user_device_links.trust_label
        else excluded.trust_label
      end,
    metadata = user_device_links.metadata || excluded.metadata,
    updated_at = now();

  update user_devices
  set
    user_count = (
      select count(distinct user_id)
      from user_device_links
      where device_id = v_device_id
        and relationship_status = 'active'
    )
  where id = v_device_id;

  return v_device_id;
end;
$$;

create or replace function record_user_network_observation(
  p_user_id uuid,
  p_device_id uuid,
  p_ip_hash text,
  p_ip_country text default null,
  p_ip_region text default null,
  p_ip_city text default null,
  p_asn text default null,
  p_network_type text default 'unknown',
  p_is_vpn boolean default null,
  p_is_proxy boolean default null,
  p_is_tor boolean default null,
  p_is_hosting boolean default null,
  p_source text default 'api',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_risk_score numeric(6,4) := 0.0000;
  v_id uuid;
begin
  if p_user_id is null then
    raise exception 'user id is required';
  end if;

  if p_ip_hash is null or length(trim(p_ip_hash)) < 16 then
    raise exception 'ip hash is required';
  end if;

  v_risk_score :=
    least(
      1.0000,
      (
        case when coalesce(p_is_tor, false) then 0.9000 else 0 end
        + case when coalesce(p_is_proxy, false) then 0.6000 else 0 end
        + case when coalesce(p_is_vpn, false) then 0.3000 else 0 end
        + case when coalesce(p_is_hosting, false) then 0.5000 else 0 end
        + case when p_network_type in ('hosting', 'proxy', 'tor') then 0.4000 else 0 end
      )
    );

  insert into user_network_observations (
    user_id,
    device_id,
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
    p_user_id,
    p_device_id,
    p_ip_hash,
    p_ip_country,
    p_ip_region,
    p_ip_city,
    p_asn,
    coalesce(p_network_type, 'unknown'),
    p_is_vpn,
    p_is_proxy,
    p_is_tor,
    p_is_hosting,
    v_risk_score,
    coalesce(p_source, 'api'),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function record_user_session_risk_event(
  p_user_id uuid,
  p_device_id uuid default null,
  p_app_session_id uuid default null,
  p_request_id text default null,
  p_event_type text default 'session_started',
  p_platform text default null,
  p_app_version text default null,
  p_ip_hash text default null,
  p_risk_score numeric default 0,
  p_decision text default 'allow',
  p_reason_code text default 'session_started',
  p_reason_message text default null,
  p_source text default 'api',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_event_id uuid;
  v_trust_delta numeric(7,4) := 0.0000;
  v_risk_delta numeric(7,4) := 0.0000;
begin
  if p_user_id is null then
    raise exception 'user id is required';
  end if;

  v_trust_delta :=
    case
      when p_decision = 'block' then -0.1000
      when p_decision = 'review' then -0.0300
      when p_event_type = 'recognized_device_seen' then 0.0050
      else 0.0000
    end;

  v_risk_delta :=
    case
      when p_decision = 'block' then 0.1200
      when p_decision = 'review' then 0.0400
      when p_risk_score >= 0.9000 then 0.1000
      when p_risk_score >= 0.7000 then 0.0600
      when p_risk_score >= 0.4000 then 0.0200
      when p_event_type = 'recognized_device_seen' then -0.0050
      else 0.0000
    end;

  insert into user_session_risk_events (
    user_id,
    device_id,
    app_session_id,
    request_id,
    event_type,
    platform,
    app_version,
    ip_hash,
    risk_score,
    trust_delta,
    risk_delta,
    decision,
    reason_code,
    reason_message,
    source,
    metadata
  )
  values (
    p_user_id,
    p_device_id,
    p_app_session_id,
    p_request_id,
    p_event_type,
    p_platform,
    p_app_version,
    p_ip_hash,
    least(greatest(coalesce(p_risk_score, 0), 0), 1),
    v_trust_delta,
    v_risk_delta,
    coalesce(p_decision, 'allow'),
    coalesce(p_reason_code, 'session_started'),
    p_reason_message,
    coalesce(p_source, 'api'),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_event_id;

  if v_trust_delta <> 0 or v_risk_delta <> 0 then
    perform add_user_trust_score_component(
      p_user_id,
      p_event_type,
      'device',
      v_trust_delta,
      v_risk_delta,
      1.0000,
      'user_session_risk_event',
      v_event_id,
      p_reason_code,
      p_reason_message,
      p_metadata
    );
  end if;

  return v_event_id;
end;
$$;

create or replace function evaluate_user_session_risk(
  p_user_id uuid,
  p_device_id uuid default null,
  p_app_session_id uuid default null,
  p_request_id text default null,
  p_platform text default null,
  p_app_version text default null,
  p_ip_hash text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_device user_devices%rowtype;
  v_link user_device_links%rowtype;
  v_latest_network user_network_observations%rowtype;

  v_event_type text := 'session_started';
  v_decision text := 'allow';
  v_reason_code text := 'session_started';
  v_reason_message text := 'Session started.';
  v_risk_score numeric(6,4) := 0.0000;

  v_recent_session_count integer := 0;
begin
  if p_user_id is null then
    raise exception 'user id is required';
  end if;

  if p_device_id is not null then
    select *
    into v_device
    from user_devices
    where id = p_device_id;

    select *
    into v_link
    from user_device_links
    where user_id = p_user_id
      and device_id = p_device_id;
  end if;

  if p_ip_hash is not null then
    select *
    into v_latest_network
    from user_network_observations
    where user_id = p_user_id
      and ip_hash = p_ip_hash
    order by observed_at desc
    limit 1;
  end if;

  select count(*)
  into v_recent_session_count
  from user_session_risk_events
  where user_id = p_user_id
    and occurred_at >= now() - interval '10 minutes';

  if v_device.id is not null and v_device.status = 'blocked' then
    v_event_type := 'blocked_device_seen';
    v_decision := 'block';
    v_reason_code := 'blocked_device';
    v_reason_message := 'Blocked device used.';
    v_risk_score := 1.0000;

  elsif v_link.id is not null and v_link.trust_label = 'new' then
    v_event_type := 'new_device_seen';
    v_decision := 'review';
    v_reason_code := 'new_device';
    v_reason_message := 'New device observed.';
    v_risk_score := 0.3500;

  elsif v_device.id is not null and v_device.user_count >= 5 then
    v_event_type := 'shared_device_seen';
    v_decision := 'review';
    v_reason_code := 'shared_device_many_users';
    v_reason_message := 'Device is shared across many users.';
    v_risk_score := 0.6500;

  elsif v_latest_network.id is not null and coalesce(v_latest_network.is_tor, false) then
    v_event_type := 'tor_seen';
    v_decision := 'block';
    v_reason_code := 'tor_network';
    v_reason_message := 'Tor network detected.';
    v_risk_score := 0.9500;

  elsif v_latest_network.id is not null and coalesce(v_latest_network.is_proxy, false) then
    v_event_type := 'proxy_seen';
    v_decision := 'review';
    v_reason_code := 'proxy_network';
    v_reason_message := 'Proxy network detected.';
    v_risk_score := 0.7000;

  elsif v_latest_network.id is not null and coalesce(v_latest_network.is_hosting, false) then
    v_event_type := 'hosting_network_seen';
    v_decision := 'review';
    v_reason_code := 'hosting_network';
    v_reason_message := 'Hosting network detected.';
    v_risk_score := 0.6000;

  elsif v_recent_session_count >= 20 then
    v_event_type := 'rapid_session_velocity';
    v_decision := 'review';
    v_reason_code := 'rapid_session_velocity';
    v_reason_message := 'High session velocity detected.';
    v_risk_score := 0.6000;

  elsif v_link.id is not null and v_link.trust_label in ('recognized', 'trusted') then
    v_event_type := 'recognized_device_seen';
    v_decision := 'allow';
    v_reason_code := 'recognized_device';
    v_reason_message := 'Recognized device.';
    v_risk_score := 0.0500;

  else
    v_event_type := 'session_started';
    v_decision := 'allow';
    v_reason_code := 'session_started';
    v_reason_message := 'Session started.';
    v_risk_score := coalesce(v_latest_network.risk_score, 0.0000);
  end if;

  return record_user_session_risk_event(
    p_user_id,
    p_device_id,
    p_app_session_id,
    p_request_id,
    v_event_type,
    p_platform,
    p_app_version,
    p_ip_hash,
    v_risk_score,
    v_decision,
    v_reason_code,
    v_reason_message,
    'risk_engine_v1',
    p_metadata
  );
end;
$$;

create or replace function observe_user_session_context(
  p_user_id uuid,
  p_device_fingerprint_hash text,
  p_platform text default 'unknown',
  p_app_version text default null,
  p_device_model text default null,
  p_os_version text default null,
  p_app_session_id uuid default null,
  p_request_id text default null,
  p_ip_hash text default null,
  p_ip_country text default null,
  p_ip_region text default null,
  p_ip_city text default null,
  p_asn text default null,
  p_network_type text default 'unknown',
  p_is_vpn boolean default null,
  p_is_proxy boolean default null,
  p_is_tor boolean default null,
  p_is_hosting boolean default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_device_id uuid;
  v_network_id uuid;
  v_risk_event_id uuid;
begin
  v_device_id := register_user_device_observation(
    p_user_id,
    p_device_fingerprint_hash,
    p_platform,
    p_app_version,
    p_device_model,
    p_os_version,
    p_metadata
  );

  if p_ip_hash is not null then
    v_network_id := record_user_network_observation(
      p_user_id,
      v_device_id,
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
      'api',
      p_metadata
    );
  end if;

  v_risk_event_id := evaluate_user_session_risk(
    p_user_id,
    v_device_id,
    p_app_session_id,
    p_request_id,
    p_platform,
    p_app_version,
    p_ip_hash,
    p_metadata || jsonb_build_object(
      'device_id',
      v_device_id,
      'network_observation_id',
      v_network_id
    )
  );

  return v_risk_event_id;
end;
$$;

alter table withdrawal_trust_gate_evaluations
add column if not exists latest_session_risk_event_id uuid references user_session_risk_events(id),
add column if not exists latest_session_risk_score numeric(6, 4),
add column if not exists latest_session_risk_decision text,
add column if not exists latest_session_risk_reason_code text;

create or replace function evaluate_withdrawal_trust_gate(
  p_user_id uuid,
  p_wallet_id uuid,
  p_requested_amount_minor bigint,
  p_currency_code text default 'USD',
  p_withdrawal_request_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_wallet wallets%rowtype;
  v_policy withdrawal_limit_policies%rowtype;
  v_trust user_trust_score_snapshots%rowtype;
  v_tier_rule withdrawal_trust_tier_rules%rowtype;
  v_latest_session_risk user_session_risk_events%rowtype;

  v_daily_withdrawn bigint := 0;
  v_weekly_withdrawn bigint := 0;
  v_monthly_withdrawn bigint := 0;

  v_daily_count integer := 0;
  v_weekly_count integer := 0;
  v_monthly_count integer := 0;

  v_last_withdrawal_at timestamptz;
  v_seconds_since_last integer;

  v_effective_max_withdrawal bigint;
  v_effective_daily_limit bigint;
  v_effective_weekly_limit bigint;
  v_effective_monthly_limit bigint;

  v_effective_daily_count integer;
  v_effective_weekly_count integer;
  v_effective_monthly_count integer;

  v_effective_review_above bigint;

  v_decision text := 'allowed';
  v_reason_code text := 'allowed';
  v_reason_message text := 'Withdrawal allowed.';

  v_risk_score numeric(6, 4) := 0.0000;

  v_evaluation_id uuid;
begin
  if p_user_id is null then
    raise exception 'user id is required';
  end if;

  if p_wallet_id is null then
    raise exception 'wallet id is required';
  end if;

  if p_requested_amount_minor <= 0 then
    raise exception 'withdrawal amount must be positive';
  end if;

  if coalesce(p_currency_code, 'USD') <> 'USD' then
    raise exception 'unsupported currency: %', p_currency_code;
  end if;

  v_policy := get_active_withdrawal_limit_policy();

  select *
  into v_wallet
  from wallets
  where id = p_wallet_id;

  if v_wallet.id is null then
    raise exception 'wallet not found: %', p_wallet_id;
  end if;

  if v_wallet.user_id <> p_user_id then
    raise exception 'wallet/user mismatch';
  end if;

  v_trust := get_latest_user_trust_score(p_user_id);

  select *
  into v_latest_session_risk
  from user_session_risk_events
  where user_id = p_user_id
    and occurred_at >= now() - interval '24 hours'
  order by occurred_at desc
  limit 1;

  select *
  into v_tier_rule
  from withdrawal_trust_tier_rules
  where trust_tier = v_trust.trust_tier
    and status = 'active';

  if v_tier_rule.id is null then
    raise exception 'withdrawal trust tier rule not found: %', v_trust.trust_tier;
  end if;

  v_effective_max_withdrawal :=
    greatest(
      0,
      floor(v_policy.max_withdrawal_amount_minor * v_tier_rule.amount_limit_multiplier)
    )::bigint;

  v_effective_daily_limit :=
    greatest(
      0,
      floor(v_policy.daily_limit_minor * v_tier_rule.amount_limit_multiplier)
    )::bigint;

  v_effective_weekly_limit :=
    greatest(
      0,
      floor(v_policy.weekly_limit_minor * v_tier_rule.amount_limit_multiplier)
    )::bigint;

  v_effective_monthly_limit :=
    greatest(
      0,
      floor(v_policy.monthly_limit_minor * v_tier_rule.amount_limit_multiplier)
    )::bigint;

  v_effective_daily_count :=
    greatest(
      0,
      floor(v_policy.daily_count_limit * v_tier_rule.count_limit_multiplier)
    )::integer;

  v_effective_weekly_count :=
    greatest(
      0,
      floor(v_policy.weekly_count_limit * v_tier_rule.count_limit_multiplier)
    )::integer;

  v_effective_monthly_count :=
    greatest(
      0,
      floor(v_policy.monthly_count_limit * v_tier_rule.count_limit_multiplier)
    )::integer;

  v_effective_review_above :=
    greatest(
      v_policy.min_withdrawal_amount_minor,
      floor(v_policy.require_review_above_minor * v_tier_rule.require_review_above_multiplier)
    )::bigint;

  select
    coalesce(sum(requested_amount_minor), 0),
    count(*)
  into
    v_daily_withdrawn,
    v_daily_count
  from withdrawal_requests
  where wallet_id = p_wallet_id
    and status in ('approved', 'reserved', 'submitted', 'processing', 'paid')
    and created_at >= now() - interval '24 hours';

  select
    coalesce(sum(requested_amount_minor), 0),
    count(*)
  into
    v_weekly_withdrawn,
    v_weekly_count
  from withdrawal_requests
  where wallet_id = p_wallet_id
    and status in ('approved', 'reserved', 'submitted', 'processing', 'paid')
    and created_at >= now() - interval '7 days';

  select
    coalesce(sum(requested_amount_minor), 0),
    count(*)
  into
    v_monthly_withdrawn,
    v_monthly_count
  from withdrawal_requests
  where wallet_id = p_wallet_id
    and status in ('approved', 'reserved', 'submitted', 'processing', 'paid')
    and created_at >= now() - interval '30 days';

  select max(created_at)
  into v_last_withdrawal_at
  from withdrawal_requests
  where wallet_id = p_wallet_id
    and status in ('approved', 'reserved', 'submitted', 'processing', 'paid');

  if v_last_withdrawal_at is not null then
    v_seconds_since_last := extract(epoch from (now() - v_last_withdrawal_at))::integer;
  end if;

  if v_wallet.status in ('fraud_locked', 'locked', 'closed') then
    v_decision := 'blocked';
    v_reason_code := 'wallet_not_available';
    v_reason_message := 'Wallet is not available for withdrawal.';
    v_risk_score := 1.0000;

  elsif v_latest_session_risk.id is not null
    and v_latest_session_risk.decision = 'block' then
    v_decision := 'blocked';
    v_reason_code := 'session_risk_blocks_withdrawal';
    v_reason_message := 'Recent session risk blocks withdrawal.';
    v_risk_score := greatest(v_trust.risk_score, v_latest_session_risk.risk_score, 0.9500);

  elsif v_latest_session_risk.id is not null
    and v_latest_session_risk.decision = 'review' then
    v_decision := 'review';
    v_reason_code := 'session_risk_requires_review';
    v_reason_message := 'Recent session risk requires withdrawal review.';
    v_risk_score := greatest(v_trust.risk_score, v_latest_session_risk.risk_score, 0.7000);

  elsif v_tier_rule.block_withdrawals is true then
    v_decision := 'blocked';
    v_reason_code := 'trust_tier_blocks_withdrawals';
    v_reason_message := 'Trust tier blocks withdrawals.';
    v_risk_score := greatest(v_trust.risk_score, 0.9500);

  elsif v_wallet.available_balance_minor < p_requested_amount_minor then
    v_decision := 'blocked';
    v_reason_code := 'insufficient_available_balance';
    v_reason_message := 'Insufficient available balance.';
    v_risk_score := greatest(v_trust.risk_score, 0.9000);

  elsif p_requested_amount_minor < v_policy.min_withdrawal_amount_minor then
    v_decision := 'blocked';
    v_reason_code := 'below_minimum_withdrawal';
    v_reason_message := 'Withdrawal amount is below the minimum.';
    v_risk_score := greatest(v_trust.risk_score, 0.3000);

  elsif p_requested_amount_minor > v_effective_max_withdrawal then
    v_decision := 'blocked';
    v_reason_code := 'trust_adjusted_maximum_exceeded';
    v_reason_message := 'Withdrawal amount exceeds trust-adjusted maximum.';
    v_risk_score := greatest(v_trust.risk_score, 0.7500);

  elsif v_daily_withdrawn + p_requested_amount_minor > v_effective_daily_limit then
    v_decision := 'blocked';
    v_reason_code := 'trust_adjusted_daily_limit_exceeded';
    v_reason_message := 'Daily trust-adjusted withdrawal limit exceeded.';
    v_risk_score := greatest(v_trust.risk_score, 0.8000);

  elsif v_weekly_withdrawn + p_requested_amount_minor > v_effective_weekly_limit then
    v_decision := 'blocked';
    v_reason_code := 'trust_adjusted_weekly_limit_exceeded';
    v_reason_message := 'Weekly trust-adjusted withdrawal limit exceeded.';
    v_risk_score := greatest(v_trust.risk_score, 0.8000);

  elsif v_monthly_withdrawn + p_requested_amount_minor > v_effective_monthly_limit then
    v_decision := 'blocked';
    v_reason_code := 'trust_adjusted_monthly_limit_exceeded';
    v_reason_message := 'Monthly trust-adjusted withdrawal limit exceeded.';
    v_risk_score := greatest(v_trust.risk_score, 0.8000);

  elsif v_daily_count + 1 > v_effective_daily_count then
    v_decision := 'blocked';
    v_reason_code := 'trust_adjusted_daily_count_exceeded';
    v_reason_message := 'Daily trust-adjusted withdrawal count exceeded.';
    v_risk_score := greatest(v_trust.risk_score, 0.7500);

  elsif v_weekly_count + 1 > v_effective_weekly_count then
    v_decision := 'blocked';
    v_reason_code := 'trust_adjusted_weekly_count_exceeded';
    v_reason_message := 'Weekly trust-adjusted withdrawal count exceeded.';
    v_risk_score := greatest(v_trust.risk_score, 0.7500);

  elsif v_monthly_count + 1 > v_effective_monthly_count then
    v_decision := 'blocked';
    v_reason_code := 'trust_adjusted_monthly_count_exceeded';
    v_reason_message := 'Monthly trust-adjusted withdrawal count exceeded.';
    v_risk_score := greatest(v_trust.risk_score, 0.7500);

  elsif v_seconds_since_last is not null
    and v_seconds_since_last < v_policy.cooldown_seconds then
    v_decision := 'blocked';
    v_reason_code := 'withdrawal_cooldown_active';
    v_reason_message := 'Please wait before making another withdrawal.';
    v_risk_score := greatest(v_trust.risk_score, 0.5000);

  elsif v_tier_rule.force_review is true then
    v_decision := 'review';
    v_reason_code := 'trust_tier_requires_review';
    v_reason_message := 'Trust tier requires review.';
    v_risk_score := greatest(v_trust.risk_score, 0.6500);

  elsif p_requested_amount_minor >= v_effective_review_above then
    v_decision := 'review';
    v_reason_code := 'trust_adjusted_review_required_amount';
    v_reason_message := 'Withdrawal requires review based on trust-adjusted threshold.';
    v_risk_score := greatest(v_trust.risk_score, 0.6500);

  else
    v_decision := 'allowed';
    v_reason_code := 'allowed';
    v_reason_message := 'Withdrawal allowed.';
    v_risk_score := least(greatest(v_trust.risk_score, 0.0500), 1);
  end if;

  insert into withdrawal_trust_gate_evaluations (
    withdrawal_request_id,
    user_id,
    wallet_id,
    policy_key,
    requested_amount_minor,
    currency_code,
    decision,
    reason_code,
    reason_message,
    daily_withdrawn_minor,
    weekly_withdrawn_minor,
    monthly_withdrawn_minor,
    daily_withdrawal_count,
    weekly_withdrawal_count,
    monthly_withdrawal_count,
    seconds_since_last_withdrawal,
    wallet_status,
    available_balance_minor,
    risk_score,
    trust_score,
    trust_risk_score,
    trust_tier,
    trust_snapshot_id,
    latest_session_risk_event_id,
    latest_session_risk_score,
    latest_session_risk_decision,
    latest_session_risk_reason_code,
    metadata
  )
  values (
    p_withdrawal_request_id,
    p_user_id,
    p_wallet_id,
    v_policy.policy_key,
    p_requested_amount_minor,
    'USD',
    v_decision,
    v_reason_code,
    v_reason_message,
    v_daily_withdrawn,
    v_weekly_withdrawn,
    v_monthly_withdrawn,
    v_daily_count,
    v_weekly_count,
    v_monthly_count,
    v_seconds_since_last,
    v_wallet.status,
    v_wallet.available_balance_minor,
    v_risk_score,
    v_trust.trust_score,
    v_trust.risk_score,
    v_trust.trust_tier,
    v_trust.id,
    v_latest_session_risk.id,
    v_latest_session_risk.risk_score,
    v_latest_session_risk.decision,
    v_latest_session_risk.reason_code,
    p_metadata || jsonb_build_object(
      'effective_max_withdrawal_minor',
      v_effective_max_withdrawal,
      'effective_daily_limit_minor',
      v_effective_daily_limit,
      'effective_weekly_limit_minor',
      v_effective_weekly_limit,
      'effective_monthly_limit_minor',
      v_effective_monthly_limit,
      'effective_daily_count_limit',
      v_effective_daily_count,
      'effective_weekly_count_limit',
      v_effective_weekly_count,
      'effective_monthly_count_limit',
      v_effective_monthly_count,
      'effective_review_above_minor',
      v_effective_review_above
    )
  )
  returning id into v_evaluation_id;

  return v_evaluation_id;
end;
$$;

create or replace view admin_user_device_detail as
select
  ud.id as device_id,
  ud.device_fingerprint_hash,
  ud.platform,
  ud.app_version,
  ud.device_model,
  ud.os_version,
  ud.first_seen_user_id,
  ud.first_seen_at,
  ud.last_seen_at,
  ud.user_count,
  ud.session_count,
  ud.status,
  ud.risk_score,
  ud.metadata,
  ud.created_at,
  ud.updated_at
from user_devices ud;

create or replace view admin_user_session_risk_detail as
select
  usre.id as session_risk_event_id,
  usre.user_id,
  usre.device_id,
  usre.app_session_id,
  usre.request_id,
  usre.event_type,
  usre.platform,
  usre.app_version,
  usre.ip_hash,
  usre.risk_score,
  usre.trust_delta,
  usre.risk_delta,
  usre.decision,
  usre.reason_code,
  usre.reason_message,
  usre.source,
  usre.occurred_at,
  usre.metadata
from user_session_risk_events usre;

create or replace view admin_user_network_risk_detail as
select
  uno.id as network_observation_id,
  uno.user_id,
  uno.device_id,
  uno.ip_hash,
  uno.ip_country,
  uno.ip_region,
  uno.ip_city,
  uno.asn,
  uno.network_type,
  uno.is_vpn,
  uno.is_proxy,
  uno.is_tor,
  uno.is_hosting,
  uno.risk_score,
  uno.source,
  uno.observed_at,
  uno.metadata
from user_network_observations uno;

grant select on admin_user_device_detail to admin_api_role;
grant select on admin_user_session_risk_detail to admin_api_role;
grant select on admin_user_network_risk_detail to admin_api_role;

alter table user_devices enable row level security;
alter table user_device_links enable row level security;
alter table user_network_observations enable row level security;
alter table user_session_risk_events enable row level security;

drop policy if exists user_devices_no_user_access
on user_devices;
create policy user_devices_no_user_access
on user_devices
for all
to authenticated
using (false)
with check (false);

drop policy if exists user_device_links_no_user_access
on user_device_links;
create policy user_device_links_no_user_access
on user_device_links
for all
to authenticated
using (false)
with check (false);

drop policy if exists user_network_observations_no_user_access
on user_network_observations;
create policy user_network_observations_no_user_access
on user_network_observations
for all
to authenticated
using (false)
with check (false);

drop policy if exists user_session_risk_events_no_user_access
on user_session_risk_events;
create policy user_session_risk_events_no_user_access
on user_session_risk_events
for all
to authenticated
using (false)
with check (false);

drop policy if exists worker_all_user_devices
on user_devices;
create policy worker_all_user_devices
on user_devices
for all
to worker_role
using (true)
with check (true);

drop policy if exists worker_all_user_device_links
on user_device_links;
create policy worker_all_user_device_links
on user_device_links
for all
to worker_role
using (true)
with check (true);

drop policy if exists worker_all_user_network_observations
on user_network_observations;
create policy worker_all_user_network_observations
on user_network_observations
for all
to worker_role
using (true)
with check (true);

drop policy if exists worker_all_user_session_risk_events
on user_session_risk_events;
create policy worker_all_user_session_risk_events
on user_session_risk_events
for all
to worker_role
using (true)
with check (true);

drop policy if exists admin_read_user_devices
on user_devices;
create policy admin_read_user_devices
on user_devices
for select
to admin_api_role
using (true);

drop policy if exists admin_read_user_device_links
on user_device_links;
create policy admin_read_user_device_links
on user_device_links
for select
to admin_api_role
using (true);

drop policy if exists admin_read_user_network_observations
on user_network_observations;
create policy admin_read_user_network_observations
on user_network_observations
for select
to admin_api_role
using (true);

drop policy if exists admin_read_user_session_risk_events
on user_session_risk_events;
create policy admin_read_user_session_risk_events
on user_session_risk_events
for select
to admin_api_role
using (true);

grant execute on function register_user_device_observation(
  uuid,
  text,
  text,
  text,
  text,
  text,
  jsonb
) to app_api_role, worker_role;

grant execute on function record_user_network_observation(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  boolean,
  boolean,
  text,
  jsonb
) to app_api_role, worker_role;

grant execute on function record_user_session_risk_event(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  numeric,
  text,
  text,
  text,
  text,
  jsonb
) to app_api_role, worker_role;

grant execute on function evaluate_user_session_risk(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  jsonb
) to app_api_role, worker_role;

grant execute on function observe_user_session_context(
  uuid,
  text,
  text,
  text,
  text,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  boolean,
  boolean,
  jsonb
) to app_api_role, worker_role;

alter function observe_user_session_context(
  uuid,
  text,
  text,
  text,
  text,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  boolean,
  boolean,
  jsonb
) security definer;

alter function observe_user_session_context(
  uuid,
  text,
  text,
  text,
  text,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  boolean,
  boolean,
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
    'DEVICE_RISK_BLOCKED',
    'wallet',
    'high',
    403,
    false,
    true,
    'This action cannot be completed from this device.',
    'Device risk blocked action.',
    'trust'
  ),
  (
    'SESSION_RISK_REVIEW_REQUIRED',
    'wallet',
    'medium',
    202,
    false,
    true,
    'This action requires review.',
    'Session risk requires review.',
    'trust'
  ),
  (
    'INVALID_DEVICE_CONTEXT',
    'validation',
    'low',
    400,
    false,
    true,
    'Device context is invalid.',
    'Invalid device/session context.',
    'platform'
  )
on conflict (error_code)
do update set
  category = excluded.category,
  severity = excluded.severity,
  http_status = excluded.http_status,
  retryable = excluded.retryable,
  user_visible = excluded.user_message is not null,
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
  ('device fingerprint hash is required', 'INVALID_DEVICE_CONTEXT', 5, '{}'::jsonb),
  ('blocked device used', 'DEVICE_RISK_BLOCKED', 5, '{}'::jsonb),
  ('session risk blocks withdrawal', 'DEVICE_RISK_BLOCKED', 5, '{}'::jsonb),
  ('session risk requires withdrawal review', 'SESSION_RISK_REVIEW_REQUIRED', 5, '{}'::jsonb)
on conflict do nothing;
