-- 42/post-MVP schema — formal attention layer tables, scoring, fraud signals,
-- trust bridge, and reward eligibility surfaces.

create table if not exists attention_verification_sessions (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null,
  wallet_id uuid references wallets(id),

  campaign_id uuid,
  creative_id uuid,
  placement_id uuid,

  device_id uuid,
  session_id uuid,

  status text not null default 'started',

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,

  failure_reason text,
  cancellation_reason text,

  app_version text,
  model_version text,
  pipeline_version text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint attention_verification_sessions_status_check
  check (
    status in (
      'started',
      'processing',
      'completed',
      'failed',
      'cancelled',
      'expired'
    )
  )
);

create index if not exists attention_verification_sessions_user_idx
on attention_verification_sessions (user_id, started_at desc);

create index if not exists attention_verification_sessions_wallet_idx
on attention_verification_sessions (wallet_id, started_at desc);

create index if not exists attention_verification_sessions_campaign_idx
on attention_verification_sessions (campaign_id, started_at desc);

create index if not exists attention_verification_sessions_status_idx
on attention_verification_sessions (status, started_at desc);

create table if not exists attention_verification_events (
  id uuid primary key default gen_random_uuid(),

  attention_session_id uuid not null references attention_verification_sessions(id),

  user_id uuid not null,
  wallet_id uuid references wallets(id),

  campaign_id uuid,
  creative_id uuid,
  placement_id uuid,

  verification_type text not null default 'sponsored_attention',

  decision text not null,
  decision_reason text,

  attention_score numeric(6, 4) not null default 0.0000,
  confidence_score numeric(6, 4) not null default 0.0000,
  fraud_risk_score numeric(6, 4) not null default 0.0000,
  quality_score numeric(6, 4) not null default 0.0000,

  gaze_score numeric(6, 4),
  blink_score numeric(6, 4),
  fixation_score numeric(6, 4),
  liveness_score numeric(6, 4),
  completion_score numeric(6, 4),

  required_duration_ms integer,
  observed_duration_ms integer,

  valid_frame_count integer not null default 0,
  invalid_frame_count integer not null default 0,
  no_face_frame_count integer not null default 0,
  gaze_invalid_frame_count integer not null default 0,

  reward_eligible boolean not null default false,
  reward_id uuid,

  trust_signal_emitted boolean not null default false,
  reward_issued boolean not null default false,

  idempotency_key text,

  model_version text,
  pipeline_version text,

  metadata jsonb not null default '{}'::jsonb,

  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint attention_verification_events_decision_check
  check (
    decision in (
      'passed',
      'failed',
      'held_for_review',
      'fraud_suspected',
      'cancelled',
      'inconclusive'
    )
  ),

  constraint attention_verification_events_score_check
  check (
    attention_score >= 0 and attention_score <= 1
    and confidence_score >= 0 and confidence_score <= 1
    and fraud_risk_score >= 0 and fraud_risk_score <= 1
    and quality_score >= 0 and quality_score <= 1
  )
);

create unique index if not exists attention_verification_events_idempotency_unique
on attention_verification_events (idempotency_key)
where idempotency_key is not null;

create index if not exists attention_verification_events_session_idx
on attention_verification_events (attention_session_id);

create index if not exists attention_verification_events_user_idx
on attention_verification_events (user_id, occurred_at desc);

create index if not exists attention_verification_events_wallet_idx
on attention_verification_events (wallet_id, occurred_at desc);

create index if not exists attention_verification_events_campaign_idx
on attention_verification_events (campaign_id, occurred_at desc);

create index if not exists attention_verification_events_reward_eligible_idx
on attention_verification_events (reward_eligible, reward_issued, occurred_at desc);

create table if not exists attention_frame_summaries (
  id uuid primary key default gen_random_uuid(),

  attention_session_id uuid not null references attention_verification_sessions(id),

  user_id uuid not null,
  wallet_id uuid references wallets(id),

  bucket_start_ms integer not null,
  bucket_end_ms integer not null,

  frame_count integer not null default 0,

  valid_frame_count integer not null default 0,
  invalid_frame_count integer not null default 0,

  avg_gaze_x numeric(8, 5),
  avg_gaze_y numeric(8, 5),

  avg_confidence numeric(6, 4),
  avg_quality numeric(6, 4),

  blink_count integer not null default 0,
  fixation_count integer not null default 0,

  no_face_count integer not null default 0,
  gaze_invalid_count integer not null default 0,

  suspicious_frame_count integer not null default 0,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint attention_frame_summaries_bucket_check
  check (bucket_end_ms > bucket_start_ms),

  constraint attention_frame_summaries_count_check
  check (
    frame_count >= 0
    and valid_frame_count >= 0
    and invalid_frame_count >= 0
    and blink_count >= 0
    and fixation_count >= 0
  )
);

create index if not exists attention_frame_summaries_session_idx
on attention_frame_summaries (attention_session_id, bucket_start_ms);

create index if not exists attention_frame_summaries_user_idx
on attention_frame_summaries (user_id, created_at desc);

create table if not exists attention_fraud_signals (
  id uuid primary key default gen_random_uuid(),

  attention_session_id uuid references attention_verification_sessions(id),
  attention_event_id uuid references attention_verification_events(id),

  user_id uuid not null,
  wallet_id uuid references wallets(id),

  campaign_id uuid,

  signal_type text not null,
  severity text not null default 'medium',

  risk_delta numeric(10, 6) not null default 0.000000,
  trust_delta numeric(10, 6) not null default 0.000000,

  signal_value numeric(10, 6),
  threshold_value numeric(10, 6),

  model_version text,
  detector_version text,

  metadata jsonb not null default '{}'::jsonb,

  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint attention_fraud_signals_severity_check
  check (
    severity in (
      'info',
      'low',
      'medium',
      'high',
      'critical'
    )
  )
);

create index if not exists attention_fraud_signals_session_idx
on attention_fraud_signals (attention_session_id, occurred_at desc);

create index if not exists attention_fraud_signals_event_idx
on attention_fraud_signals (attention_event_id, occurred_at desc);

create index if not exists attention_fraud_signals_wallet_idx
on attention_fraud_signals (wallet_id, occurred_at desc);

create index if not exists attention_fraud_signals_type_idx
on attention_fraud_signals (signal_type, severity, occurred_at desc);

create table if not exists campaign_attention_requirements (
  id uuid primary key default gen_random_uuid(),

  campaign_id uuid not null,

  requirement_type text not null default 'sponsored_attention',

  required_duration_ms integer not null default 5000,

  min_attention_score numeric(6, 4) not null default 0.7000,
  min_confidence_score numeric(6, 4) not null default 0.5000,
  max_fraud_risk_score numeric(6, 4) not null default 0.7000,
  min_quality_score numeric(6, 4) not null default 0.5000,

  min_valid_frame_ratio numeric(6, 4) not null default 0.7000,
  max_no_face_ratio numeric(6, 4) not null default 0.2000,
  max_gaze_invalid_ratio numeric(6, 4) not null default 0.2500,

  require_liveness boolean not null default true,
  require_blink_variation boolean not null default false,

  reward_hold_seconds integer not null default 86400,
  reward_expiry_seconds integer not null default 2592000,

  active boolean not null default true,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint campaign_attention_requirements_score_check
  check (
    min_attention_score >= 0 and min_attention_score <= 1
    and min_confidence_score >= 0 and min_confidence_score <= 1
    and max_fraud_risk_score >= 0 and max_fraud_risk_score <= 1
    and min_quality_score >= 0 and min_quality_score <= 1
    and min_valid_frame_ratio >= 0 and min_valid_frame_ratio <= 1
    and max_no_face_ratio >= 0 and max_no_face_ratio <= 1
    and max_gaze_invalid_ratio >= 0 and max_gaze_invalid_ratio <= 1
  )
);

create unique index if not exists campaign_attention_requirements_active_unique
on campaign_attention_requirements (campaign_id, requirement_type)
where active is true;

create index if not exists campaign_attention_requirements_campaign_idx
on campaign_attention_requirements (campaign_id, active);

create or replace function start_attention_verification_session(
  p_user_id uuid,
  p_wallet_id uuid,
  p_campaign_id uuid default null,
  p_creative_id uuid default null,
  p_placement_id uuid default null,
  p_device_id uuid default null,
  p_session_id uuid default null,
  p_app_version text default null,
  p_model_version text default null,
  p_pipeline_version text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_session_id uuid;
begin
  if p_user_id is null then
    raise exception 'user id is required';
  end if;

  insert into attention_verification_sessions (
    user_id,
    wallet_id,
    campaign_id,
    creative_id,
    placement_id,
    device_id,
    session_id,
    status,
    app_version,
    model_version,
    pipeline_version,
    metadata
  )
  values (
    p_user_id,
    p_wallet_id,
    p_campaign_id,
    p_creative_id,
    p_placement_id,
    p_device_id,
    p_session_id,
    'started',
    p_app_version,
    p_model_version,
    p_pipeline_version,
    p_metadata
  )
  returning id into v_session_id;

  return v_session_id;
end;
$$;

create or replace function complete_attention_verification_event(
  p_attention_session_id uuid,
  p_decision text,
  p_attention_score numeric,
  p_confidence_score numeric,
  p_fraud_risk_score numeric,
  p_quality_score numeric,
  p_gaze_score numeric default null,
  p_blink_score numeric default null,
  p_fixation_score numeric default null,
  p_liveness_score numeric default null,
  p_completion_score numeric default null,
  p_required_duration_ms integer default null,
  p_observed_duration_ms integer default null,
  p_valid_frame_count integer default 0,
  p_invalid_frame_count integer default 0,
  p_no_face_frame_count integer default 0,
  p_gaze_invalid_frame_count integer default 0,
  p_reward_id uuid default null,
  p_idempotency_key text default null,
  p_model_version text default null,
  p_pipeline_version text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_session attention_verification_sessions%rowtype;
  v_requirement campaign_attention_requirements%rowtype;

  v_event_id uuid;
  v_reward_eligible boolean := false;
  v_decision_reason text;
begin
  if p_attention_session_id is null then
    raise exception 'attention session id is required';
  end if;

  if p_decision not in (
    'passed',
    'failed',
    'held_for_review',
    'fraud_suspected',
    'cancelled',
    'inconclusive'
  ) then
    raise exception 'invalid attention decision: %', p_decision;
  end if;

  select *
  into v_session
  from attention_verification_sessions
  where id = p_attention_session_id
  for update;

  if v_session.id is null then
    raise exception 'attention session not found: %', p_attention_session_id;
  end if;

  if v_session.campaign_id is not null then
    select *
    into v_requirement
    from campaign_attention_requirements
    where campaign_id = v_session.campaign_id
      and requirement_type = 'sponsored_attention'
      and active is true
    limit 1;
  end if;

  v_reward_eligible :=
    p_decision = 'passed'
    and p_attention_score >= coalesce(v_requirement.min_attention_score, 0.7000)
    and p_confidence_score >= coalesce(v_requirement.min_confidence_score, 0.5000)
    and p_fraud_risk_score <= coalesce(v_requirement.max_fraud_risk_score, 0.7000)
    and p_quality_score >= coalesce(v_requirement.min_quality_score, 0.5000);

  v_decision_reason :=
    case
      when p_decision <> 'passed'
      then 'decision_not_passed'
      when p_attention_score < coalesce(v_requirement.min_attention_score, 0.7000)
      then 'attention_score_below_requirement'
      when p_confidence_score < coalesce(v_requirement.min_confidence_score, 0.5000)
      then 'confidence_score_below_requirement'
      when p_fraud_risk_score > coalesce(v_requirement.max_fraud_risk_score, 0.7000)
      then 'fraud_risk_above_requirement'
      when p_quality_score < coalesce(v_requirement.min_quality_score, 0.5000)
      then 'quality_score_below_requirement'
      else 'requirements_passed'
    end;

  insert into attention_verification_events (
    attention_session_id,
    user_id,
    wallet_id,
    campaign_id,
    creative_id,
    placement_id,
    verification_type,
    decision,
    decision_reason,
    attention_score,
    confidence_score,
    fraud_risk_score,
    quality_score,
    gaze_score,
    blink_score,
    fixation_score,
    liveness_score,
    completion_score,
    required_duration_ms,
    observed_duration_ms,
    valid_frame_count,
    invalid_frame_count,
    no_face_frame_count,
    gaze_invalid_frame_count,
    reward_eligible,
    reward_id,
    idempotency_key,
    model_version,
    pipeline_version,
    metadata
  )
  values (
    v_session.id,
    v_session.user_id,
    v_session.wallet_id,
    v_session.campaign_id,
    v_session.creative_id,
    v_session.placement_id,
    'sponsored_attention',
    p_decision,
    v_decision_reason,
    p_attention_score,
    p_confidence_score,
    p_fraud_risk_score,
    p_quality_score,
    p_gaze_score,
    p_blink_score,
    p_fixation_score,
    p_liveness_score,
    p_completion_score,
    p_required_duration_ms,
    p_observed_duration_ms,
    p_valid_frame_count,
    p_invalid_frame_count,
    p_no_face_frame_count,
    p_gaze_invalid_frame_count,
    v_reward_eligible,
    p_reward_id,
    p_idempotency_key,
    coalesce(p_model_version, v_session.model_version),
    coalesce(p_pipeline_version, v_session.pipeline_version),
    p_metadata
  )
  on conflict (idempotency_key)
  where idempotency_key is not null
  do update set
    metadata = attention_verification_events.metadata || excluded.metadata
  returning id into v_event_id;

  update attention_verification_sessions
  set
    status = 'completed',
    completed_at = now(),
    updated_at = now()
  where id = v_session.id;

  return v_event_id;
end;
$$;

create or replace function emit_trust_signal_from_attention_event(
  p_attention_event_id uuid,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_event attention_verification_events%rowtype;

  v_direction text;
  v_severity text;
  v_signal_type text;

  v_trust_delta numeric;
  v_risk_delta numeric;
  v_confidence_delta numeric;

  v_signal_id uuid;
begin
  if p_attention_event_id is null then
    raise exception 'attention event id is required';
  end if;

  select *
  into v_event
  from attention_verification_events
  where id = p_attention_event_id
  for update;

  if v_event.id is null then
    raise exception 'attention event not found: %', p_attention_event_id;
  end if;

  if v_event.trust_signal_emitted is true then
    select id
    into v_signal_id
    from trust_signal_events
    where idempotency_key = coalesce(
      p_idempotency_key,
      'attention_trust_signal:' || p_attention_event_id::text
    )
    limit 1;

    return v_signal_id;
  end if;

  if p_idempotency_key is null then
    p_idempotency_key := 'attention_trust_signal:' || p_attention_event_id::text;
  end if;

  if v_event.decision = 'passed' and v_event.fraud_risk_score < 0.5500 then
    v_direction := 'positive';
    v_severity := 'medium';
    v_signal_type := 'valid_attention_verification';
    v_trust_delta := 0.0200;
    v_risk_delta := -0.0150;
    v_confidence_delta := 0.0200;
  elsif v_event.decision = 'fraud_suspected' or v_event.fraud_risk_score >= 0.8500 then
    v_direction := 'negative';
    v_severity := 'critical';
    v_signal_type := 'attention_fraud_suspected';
    v_trust_delta := -0.1500;
    v_risk_delta := 0.2500;
    v_confidence_delta := 0.0500;
  elsif v_event.decision in ('failed', 'inconclusive') then
    v_direction := 'negative';
    v_severity := 'low';
    v_signal_type := 'failed_attention_verification';
    v_trust_delta := -0.0200;
    v_risk_delta := 0.0300;
    v_confidence_delta := 0.0100;
  else
    v_direction := 'neutral';
    v_severity := 'info';
    v_signal_type := 'neutral_attention_verification';
    v_trust_delta := 0.0000;
    v_risk_delta := 0.0000;
    v_confidence_delta := 0.0050;
  end if;

  v_signal_id := record_trust_signal(
    'wallet',
    v_event.wallet_id,
    v_event.user_id,
    v_event.wallet_id,
    v_signal_type,
    'attention_verification_engine',
    v_direction,
    v_severity,
    v_event.attention_score,
    1.0000,
    v_trust_delta,
    v_risk_delta,
    v_confidence_delta,
    p_idempotency_key,
    p_metadata || jsonb_build_object(
      'attention_event_id',
      v_event.id,
      'campaign_id',
      v_event.campaign_id,
      'decision',
      v_event.decision,
      'attention_score',
      v_event.attention_score,
      'fraud_risk_score',
      v_event.fraud_risk_score
    )
  );

  update attention_verification_events
  set trust_signal_emitted = true
  where id = v_event.id;

  perform apply_trust_score_to_wallet_policy(
    v_event.wallet_id,
    p_metadata || jsonb_build_object(
      'trigger',
      'attention_event',
      'attention_event_id',
      v_event.id
    )
  );

  return v_signal_id;
end;
$$;

create or replace view attention_reward_eligible_events as
select
  ave.id as attention_event_id,
  ave.attention_session_id,
  ave.user_id,
  ave.wallet_id,
  ave.campaign_id,
  ave.creative_id,
  ave.placement_id,

  ave.decision,
  ave.decision_reason,

  ave.attention_score,
  ave.confidence_score,
  ave.fraud_risk_score,
  ave.quality_score,

  ave.reward_eligible,
  ave.reward_issued,
  ave.reward_id,

  ave.required_duration_ms,
  ave.observed_duration_ms,

  ave.valid_frame_count,
  ave.invalid_frame_count,
  ave.no_face_frame_count,
  ave.gaze_invalid_frame_count,

  ave.occurred_at,

  car.reward_hold_seconds,
  car.reward_expiry_seconds,

  car.min_attention_score,
  car.min_confidence_score,
  car.max_fraud_risk_score,
  car.min_quality_score

from attention_verification_events ave
left join campaign_attention_requirements car
  on car.campaign_id = ave.campaign_id
 and car.requirement_type = ave.verification_type
 and car.active is true
where ave.reward_eligible is true
  and ave.reward_issued is false;

create or replace function mark_attention_reward_issued(
  p_attention_event_id uuid,
  p_reward_id uuid,
  p_wallet_value_lot_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  if p_attention_event_id is null then
    raise exception 'attention event id is required';
  end if;

  if p_reward_id is null then
    raise exception 'reward id is required';
  end if;

  update attention_verification_events
  set
    reward_issued = true,
    reward_id = p_reward_id,
    metadata = metadata || p_metadata || jsonb_build_object(
      'wallet_value_lot_id',
      p_wallet_value_lot_id
    )
  where id = p_attention_event_id
    and reward_eligible is true;

  if not found then
    raise exception 'attention event not found or not reward eligible: %',
      p_attention_event_id;
  end if;

  return p_attention_event_id;
end;
$$;

create or replace view attention_verification_details as
select
  s.id as attention_session_id,
  s.user_id,
  s.wallet_id,
  s.campaign_id,
  s.creative_id,
  s.placement_id,
  s.device_id,
  s.session_id,
  s.status as session_status,
  s.started_at,
  s.completed_at,

  e.id as attention_event_id,
  e.decision,
  e.decision_reason,
  e.attention_score,
  e.confidence_score,
  e.fraud_risk_score,
  e.quality_score,
  e.gaze_score,
  e.blink_score,
  e.fixation_score,
  e.liveness_score,
  e.completion_score,
  e.reward_eligible,
  e.reward_issued,
  e.reward_id,

  count(fs.id) as fraud_signal_count,
  count(fs.id) filter (where fs.severity = 'critical') as critical_fraud_signal_count,
  count(fs.id) filter (where fs.severity = 'high') as high_fraud_signal_count,

  jsonb_agg(
    jsonb_build_object(
      'fraud_signal_id', fs.id,
      'signal_type', fs.signal_type,
      'severity', fs.severity,
      'risk_delta', fs.risk_delta,
      'trust_delta', fs.trust_delta,
      'signal_value', fs.signal_value,
      'threshold_value', fs.threshold_value,
      'occurred_at', fs.occurred_at,
      'metadata', fs.metadata
    )
    order by fs.occurred_at desc
  ) filter (where fs.id is not null) as fraud_signals

from attention_verification_sessions s
left join attention_verification_events e
  on e.attention_session_id = s.id
left join attention_fraud_signals fs
  on fs.attention_event_id = e.id
group by s.id, e.id;
