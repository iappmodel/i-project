create table if not exists attention_verification_sessions (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null,
  wallet_id uuid not null references wallets(id),

  campaign_id uuid,
  creative_id uuid,
  placement_id uuid,

  device_id uuid,
  app_session_id uuid,

  app_version text,
  platform text,

  model_version text not null references attention_model_versions(model_version),
  pipeline_version text not null references attention_pipeline_versions(pipeline_version),
  runtime_signal_schema_version text not null references runtime_signal_schema_versions(schema_version),
  scoring_formula_version text not null references attention_scoring_formula_versions(formula_version),

  status text not null default 'started',

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,

  failure_reason text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint attention_verification_sessions_status_check
  check (
    status in (
      'started',
      'completed',
      'failed',
      'cancelled',
      'expired'
    )
  ),

  constraint attention_verification_sessions_platform_check
  check (
    platform is null
    or platform in (
      'ios',
      'android',
      'web',
      'desktop',
      'server'
    )
  )
);

create index if not exists attention_verification_sessions_user_idx
on attention_verification_sessions (user_id, created_at desc);

create index if not exists attention_verification_sessions_wallet_idx
on attention_verification_sessions (wallet_id, created_at desc);

create index if not exists attention_verification_sessions_campaign_idx
on attention_verification_sessions (campaign_id, created_at desc);

create index if not exists attention_verification_sessions_status_idx
on attention_verification_sessions (status, created_at desc);

drop trigger if exists attention_verification_sessions_set_updated_at
on attention_verification_sessions;

create trigger attention_verification_sessions_set_updated_at
before update on attention_verification_sessions
for each row
execute function set_updated_at();

create table if not exists attention_verification_events (
  id uuid primary key default gen_random_uuid(),

  attention_session_id uuid not null references attention_verification_sessions(id),

  user_id uuid not null,
  wallet_id uuid not null references wallets(id),

  campaign_id uuid,
  creative_id uuid,
  placement_id uuid,

  device_id uuid,
  app_session_id uuid,

  model_version text not null,
  pipeline_version text not null,
  runtime_signal_schema_version text not null,
  scoring_formula_version text not null,

  decision text not null,
  decision_reason text,

  attention_score numeric(6, 4) not null,
  confidence_score numeric(6, 4) not null,
  fraud_risk_score numeric(6, 4) not null,
  quality_score numeric(6, 4) not null,

  gaze_score numeric(6, 4),
  fixation_score numeric(6, 4),
  liveness_score numeric(6, 4),
  completion_score numeric(6, 4),

  valid_frame_count integer not null default 0,
  invalid_frame_count integer not null default 0,
  no_face_frame_count integer not null default 0,
  gaze_invalid_frame_count integer not null default 0,

  reward_eligible boolean not null default false,
  reward_issued boolean not null default false,
  reward_id uuid,

  idempotency_key text not null,

  occurred_at timestamptz not null default now(),

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint attention_verification_events_decision_check
  check (
    decision in (
      'passed',
      'failed',
      'fraud_suspected',
      'inconclusive'
    )
  ),

  constraint attention_verification_events_score_check
  check (
    attention_score >= 0 and attention_score <= 1
    and confidence_score >= 0 and confidence_score <= 1
    and fraud_risk_score >= 0 and fraud_risk_score <= 1
    and quality_score >= 0 and quality_score <= 1
    and (gaze_score is null or (gaze_score >= 0 and gaze_score <= 1))
    and (fixation_score is null or (fixation_score >= 0 and fixation_score <= 1))
    and (liveness_score is null or (liveness_score >= 0 and liveness_score <= 1))
    and (completion_score is null or (completion_score >= 0 and completion_score <= 1))
  ),

  constraint attention_verification_events_frame_count_check
  check (
    valid_frame_count >= 0
    and invalid_frame_count >= 0
    and no_face_frame_count >= 0
    and gaze_invalid_frame_count >= 0
  )
);

create unique index if not exists attention_verification_events_idempotency_unique
on attention_verification_events (idempotency_key);

create unique index if not exists attention_verification_events_session_unique
on attention_verification_events (attention_session_id);

create index if not exists attention_verification_events_user_idx
on attention_verification_events (user_id, occurred_at desc);

create index if not exists attention_verification_events_wallet_idx
on attention_verification_events (wallet_id, occurred_at desc);

create index if not exists attention_verification_events_campaign_idx
on attention_verification_events (campaign_id, occurred_at desc);

create index if not exists attention_verification_events_decision_idx
on attention_verification_events (decision, occurred_at desc);

create index if not exists attention_verification_events_reward_idx
on attention_verification_events (reward_eligible, reward_issued, occurred_at desc);

create table if not exists attention_frame_summaries (
  id uuid primary key default gen_random_uuid(),

  attention_session_id uuid not null references attention_verification_sessions(id),
  attention_event_id uuid references attention_verification_events(id),

  user_id uuid not null,
  wallet_id uuid not null references wallets(id),

  bucket_start_ms integer not null,
  bucket_end_ms integer not null,

  avg_attention_score numeric(6, 4),
  avg_confidence_score numeric(6, 4),
  avg_fraud_risk_score numeric(6, 4),
  avg_quality_score numeric(6, 4),

  frame_count integer not null default 0,
  valid_frame_count integer not null default 0,
  no_face_frame_count integer not null default 0,
  gaze_invalid_frame_count integer not null default 0,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint attention_frame_summaries_bucket_check
  check (
    bucket_start_ms >= 0
    and bucket_end_ms >= bucket_start_ms
  ),

  constraint attention_frame_summaries_count_check
  check (
    frame_count >= 0
    and valid_frame_count >= 0
    and no_face_frame_count >= 0
    and gaze_invalid_frame_count >= 0
  )
);

create index if not exists attention_frame_summaries_session_idx
on attention_frame_summaries (attention_session_id, bucket_start_ms);

create index if not exists attention_frame_summaries_event_idx
on attention_frame_summaries (attention_event_id);

create table if not exists attention_fraud_signals (
  id uuid primary key default gen_random_uuid(),

  attention_session_id uuid references attention_verification_sessions(id),
  attention_event_id uuid references attention_verification_events(id),

  user_id uuid not null,
  wallet_id uuid references wallets(id),

  signal_type text not null,
  severity text not null default 'medium',

  risk_score numeric(6, 4),

  message text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint attention_fraud_signals_severity_check
  check (
    severity in (
      'low',
      'medium',
      'high',
      'critical'
    )
  ),

  constraint attention_fraud_signals_score_check
  check (
    risk_score is null
    or (risk_score >= 0 and risk_score <= 1)
  )
);

create index if not exists attention_fraud_signals_event_idx
on attention_fraud_signals (attention_event_id, created_at desc);

create index if not exists attention_fraud_signals_wallet_idx
on attention_fraud_signals (wallet_id, created_at desc);

create index if not exists attention_fraud_signals_type_idx
on attention_fraud_signals (signal_type, severity, created_at desc);

create or replace function start_attention_verification_session(
  p_user_id uuid,
  p_wallet_id uuid,
  p_campaign_id uuid default null,
  p_creative_id uuid default null,
  p_placement_id uuid default null,
  p_device_id uuid default null,
  p_app_session_id uuid default null,
  p_app_version text default null,
  p_platform text default null,
  p_model_version text default 'vision_model_v1',
  p_pipeline_version text default 'runtime_pipeline_v1',
  p_runtime_signal_schema_version text default 'runtime_signals_v1',
  p_scoring_formula_version text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_wallet wallets%rowtype;
  v_session_id uuid;
  v_scoring_formula_version text;
begin
  if p_user_id is null then
    raise exception 'user id is required';
  end if;

  if p_wallet_id is null then
    raise exception 'wallet id is required';
  end if;

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

  perform wallet_assert_not_fraud_locked(
    p_wallet_id,
    'start_attention_verification'
  );

  v_scoring_formula_version := coalesce(
    p_scoring_formula_version,
    get_active_attention_scoring_formula_version()
  );

  perform assert_attention_runtime_version_allowed(
    p_model_version,
    p_pipeline_version,
    p_runtime_signal_schema_version
  );

  insert into attention_verification_sessions (
    user_id,
    wallet_id,
    campaign_id,
    creative_id,
    placement_id,
    device_id,
    app_session_id,
    app_version,
    platform,
    model_version,
    pipeline_version,
    runtime_signal_schema_version,
    scoring_formula_version,
    status,
    metadata
  )
  values (
    p_user_id,
    p_wallet_id,
    p_campaign_id,
    p_creative_id,
    p_placement_id,
    p_device_id,
    p_app_session_id,
    p_app_version,
    p_platform,
    p_model_version,
    p_pipeline_version,
    p_runtime_signal_schema_version,
    v_scoring_formula_version,
    'started',
    p_metadata
  )
  returning id into v_session_id;

  return v_session_id;
end;
$$;

create or replace function compute_attention_reward_eligibility(
  p_decision text,
  p_attention_score numeric,
  p_confidence_score numeric,
  p_fraud_risk_score numeric,
  p_quality_score numeric,
  p_scoring_formula_version text
)
returns boolean
language plpgsql
stable
as $$
declare
  v_formula attention_scoring_formula_versions%rowtype;
begin
  if p_decision <> 'passed' then
    return false;
  end if;

  select *
  into v_formula
  from attention_scoring_formula_versions
  where formula_version = p_scoring_formula_version;

  if v_formula.id is null then
    raise exception 'scoring formula not found: %', p_scoring_formula_version;
  end if;

  if v_formula.status <> 'active' then
    raise exception 'scoring formula not active: %', p_scoring_formula_version;
  end if;

  return
    p_attention_score >= v_formula.minimum_attention_score
    and p_confidence_score >= v_formula.minimum_confidence_score
    and p_fraud_risk_score <= v_formula.maximum_fraud_risk_score
    and p_quality_score >= v_formula.minimum_quality_score;
end;
$$;

create or replace function complete_attention_verification_event(
  p_attention_session_id uuid,
  p_decision text,
  p_decision_reason text,
  p_attention_score numeric,
  p_confidence_score numeric,
  p_fraud_risk_score numeric,
  p_quality_score numeric,
  p_gaze_score numeric default null,
  p_fixation_score numeric default null,
  p_liveness_score numeric default null,
  p_completion_score numeric default null,
  p_valid_frame_count integer default 0,
  p_invalid_frame_count integer default 0,
  p_no_face_frame_count integer default 0,
  p_gaze_invalid_frame_count integer default 0,
  p_reward_eligible boolean default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_session attention_verification_sessions%rowtype;
  v_event_id uuid;
  v_idempotency_key text;
  v_reward_eligible boolean;
begin
  if p_attention_session_id is null then
    raise exception 'attention session id is required';
  end if;

  if p_decision not in ('passed', 'failed', 'fraud_suspected', 'inconclusive') then
    raise exception 'invalid attention decision: %', p_decision;
  end if;

  if p_attention_score < 0 or p_attention_score > 1
    or p_confidence_score < 0 or p_confidence_score > 1
    or p_fraud_risk_score < 0 or p_fraud_risk_score > 1
    or p_quality_score < 0 or p_quality_score > 1 then
    raise exception 'attention scores must be between 0 and 1';
  end if;

  if p_valid_frame_count < 0
    or p_invalid_frame_count < 0
    or p_no_face_frame_count < 0
    or p_gaze_invalid_frame_count < 0 then
    raise exception 'frame counts cannot be negative';
  end if;

  v_idempotency_key := coalesce(
    p_idempotency_key,
    'attention_complete:' || p_attention_session_id::text
  );

  if exists (
    select 1
    from attention_verification_events
    where idempotency_key = v_idempotency_key
  ) then
    select id
    into v_event_id
    from attention_verification_events
    where idempotency_key = v_idempotency_key;

    return v_event_id;
  end if;

  select *
  into v_session
  from attention_verification_sessions
  where id = p_attention_session_id
  for update;

  if v_session.id is null then
    raise exception 'attention session not found: %', p_attention_session_id;
  end if;

  if v_session.status <> 'started' then
    raise exception 'attention session is not started. status %', v_session.status;
  end if;

  perform assert_attention_runtime_version_allowed(
    v_session.model_version,
    v_session.pipeline_version,
    v_session.runtime_signal_schema_version
  );

  v_reward_eligible := coalesce(
    p_reward_eligible,
    compute_attention_reward_eligibility(
      p_decision,
      p_attention_score,
      p_confidence_score,
      p_fraud_risk_score,
      p_quality_score,
      v_session.scoring_formula_version
    )
  );

  insert into attention_verification_events (
    attention_session_id,
    user_id,
    wallet_id,
    campaign_id,
    creative_id,
    placement_id,
    device_id,
    app_session_id,
    model_version,
    pipeline_version,
    runtime_signal_schema_version,
    scoring_formula_version,
    decision,
    decision_reason,
    attention_score,
    confidence_score,
    fraud_risk_score,
    quality_score,
    gaze_score,
    fixation_score,
    liveness_score,
    completion_score,
    valid_frame_count,
    invalid_frame_count,
    no_face_frame_count,
    gaze_invalid_frame_count,
    reward_eligible,
    reward_issued,
    idempotency_key,
    metadata
  )
  values (
    v_session.id,
    v_session.user_id,
    v_session.wallet_id,
    v_session.campaign_id,
    v_session.creative_id,
    v_session.placement_id,
    v_session.device_id,
    v_session.app_session_id,
    v_session.model_version,
    v_session.pipeline_version,
    v_session.runtime_signal_schema_version,
    v_session.scoring_formula_version,
    p_decision,
    p_decision_reason,
    p_attention_score,
    p_confidence_score,
    p_fraud_risk_score,
    p_quality_score,
    p_gaze_score,
    p_fixation_score,
    p_liveness_score,
    p_completion_score,
    p_valid_frame_count,
    p_invalid_frame_count,
    p_no_face_frame_count,
    p_gaze_invalid_frame_count,
    v_reward_eligible,
    false,
    v_idempotency_key,
    p_metadata
  )
  returning id into v_event_id;

  update attention_verification_sessions
  set
    status = 'completed',
    completed_at = now(),
    metadata = metadata || jsonb_build_object(
      'attention_event_id',
      v_event_id,
      'decision',
      p_decision,
      'reward_eligible',
      v_reward_eligible
    ),
    updated_at = now()
  where id = v_session.id;

  if p_decision = 'fraud_suspected'
    or p_fraud_risk_score >= 0.8500 then
    insert into attention_fraud_signals (
      attention_session_id,
      attention_event_id,
      user_id,
      wallet_id,
      signal_type,
      severity,
      risk_score,
      message,
      metadata
    )
    values (
      v_session.id,
      v_event_id,
      v_session.user_id,
      v_session.wallet_id,
      'attention_fraud_suspected',
      case
        when p_fraud_risk_score >= 0.9500 then 'critical'
        when p_fraud_risk_score >= 0.8500 then 'high'
        else 'medium'
      end,
      p_fraud_risk_score,
      'Attention verification indicated possible fraud.',
      p_metadata
    );
  end if;

  return v_event_id;
end;
$$;

create or replace function fail_attention_verification_session(
  p_attention_session_id uuid,
  p_failure_reason text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  if p_attention_session_id is null then
    raise exception 'attention session id is required';
  end if;

  if p_failure_reason is null or length(trim(p_failure_reason)) = 0 then
    raise exception 'failure reason is required';
  end if;

  update attention_verification_sessions
  set
    status = 'failed',
    failed_at = now(),
    failure_reason = p_failure_reason,
    metadata = metadata || p_metadata,
    updated_at = now()
  where id = p_attention_session_id
    and status = 'started';

  if not found then
    raise exception 'attention session not found or not started: %',
      p_attention_session_id;
  end if;

  return p_attention_session_id;
end;
$$;

create or replace view attention_event_summary as
select
  id as attention_event_id,
  attention_session_id,

  user_id,
  wallet_id,

  campaign_id,
  creative_id,
  placement_id,

  decision,
  decision_reason,

  attention_score,
  confidence_score,
  fraud_risk_score,
  quality_score,

  reward_eligible,
  reward_issued,
  reward_id,

  model_version,
  pipeline_version,
  runtime_signal_schema_version,
  scoring_formula_version,

  occurred_at,
  created_at
from attention_verification_events;

create or replace view attention_runtime_provenance_details as
select
  ave.id as attention_event_id,
  ave.attention_session_id,

  ave.user_id,
  ave.wallet_id,
  ave.campaign_id,

  ave.decision,
  ave.reward_eligible,
  ave.reward_issued,

  ave.model_version,
  mv.model_name,
  mv.model_type,
  mv.status as model_status,

  ave.pipeline_version,
  pv.pipeline_name,
  pv.status as pipeline_status,

  ave.runtime_signal_schema_version,
  rsv.status as schema_status,

  ave.scoring_formula_version,
  sfv.name as scoring_formula_name,
  sfv.status as scoring_formula_status,

  ave.attention_score,
  ave.confidence_score,
  ave.fraud_risk_score,
  ave.quality_score,

  ave.occurred_at

from attention_verification_events ave
left join attention_model_versions mv
  on mv.model_version = ave.model_version
left join attention_pipeline_versions pv
  on pv.pipeline_version = ave.pipeline_version
left join runtime_signal_schema_versions rsv
  on rsv.schema_version = ave.runtime_signal_schema_version
left join attention_scoring_formula_versions sfv
  on sfv.formula_version = ave.scoring_formula_version;

create or replace view attention_verification_health as
select
  date_trunc('hour', occurred_at) as bucket_hour,

  count(*) as event_count,

  count(*) filter (where decision = 'passed') as passed_count,
  count(*) filter (where decision = 'failed') as failed_count,
  count(*) filter (where decision = 'fraud_suspected') as fraud_suspected_count,
  count(*) filter (where decision = 'inconclusive') as inconclusive_count,

  count(*) filter (where reward_eligible is true) as reward_eligible_count,
  count(*) filter (where reward_issued is true) as reward_issued_count,

  (
    count(*) filter (where decision = 'passed')::numeric
    / greatest(count(*), 1)
  )::numeric(8, 6) as pass_rate,

  (
    count(*) filter (where decision = 'fraud_suspected')::numeric
    / greatest(count(*), 1)
  )::numeric(8, 6) as fraud_suspected_rate,

  avg(attention_score)::numeric(8, 6) as avg_attention_score,
  avg(confidence_score)::numeric(8, 6) as avg_confidence_score,
  avg(fraud_risk_score)::numeric(8, 6) as avg_fraud_risk_score,
  avg(quality_score)::numeric(8, 6) as avg_quality_score

from attention_verification_events
group by date_trunc('hour', occurred_at)
order by bucket_hour desc;
