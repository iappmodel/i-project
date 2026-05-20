-- 53/post-MVP schema — attention model rollout control and experiment registry.

-- ---------------------------------------------------------------------------
-- 1) Attention rollout registry
-- ---------------------------------------------------------------------------

create table if not exists attention_model_rollouts (
  id uuid primary key default gen_random_uuid(),

  rollout_key text not null unique,
  rollout_name text not null,

  model_version text not null references attention_model_versions(model_version),
  pipeline_version text not null references attention_pipeline_versions(pipeline_version),
  runtime_signal_schema_version text not null references runtime_signal_schema_versions(schema_version),
  scoring_formula_version text not null references attention_scoring_formula_versions(formula_version),

  status text not null default 'draft',
  rollout_type text not null default 'percentage',
  rollout_percentage numeric(6, 4) not null default 0.0000,

  target_platform text,
  min_app_version text,
  max_app_version text,

  target_campaign_id uuid,
  target_advertiser_id uuid,

  starts_at timestamptz,
  ends_at timestamptz,

  kill_switch_enabled boolean not null default false,
  rollback_rollout_id uuid references attention_model_rollouts(id),

  owner text,
  description text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint attention_model_rollouts_status_check
  check (
    status in (
      'draft',
      'scheduled',
      'active',
      'paused',
      'completed',
      'rolled_back',
      'cancelled'
    )
  ),

  constraint attention_model_rollouts_type_check
  check (
    rollout_type in (
      'percentage',
      'campaign_only',
      'platform_only',
      'internal_test',
      'holdout_experiment',
      'forced'
    )
  ),

  constraint attention_model_rollouts_percentage_check
  check (
    rollout_percentage >= 0
    and rollout_percentage <= 1
  ),

  constraint attention_model_rollouts_platform_check
  check (
    target_platform is null
    or target_platform in (
      'ios',
      'android',
      'web',
      'desktop',
      'server'
    )
  )
);

create index if not exists attention_model_rollouts_status_idx
on attention_model_rollouts (status, starts_at desc);

create index if not exists attention_model_rollouts_model_idx
on attention_model_rollouts (model_version, status);

create index if not exists attention_model_rollouts_pipeline_idx
on attention_model_rollouts (pipeline_version, status);

create index if not exists attention_model_rollouts_campaign_idx
on attention_model_rollouts (target_campaign_id, status);

-- ---------------------------------------------------------------------------
-- 2) Experiment registry
-- ---------------------------------------------------------------------------

create table if not exists attention_experiments (
  id uuid primary key default gen_random_uuid(),

  experiment_key text not null unique,
  experiment_name text not null,

  status text not null default 'draft',

  experiment_type text not null default 'model_comparison',

  primary_metric text not null default 'verified_attention_rate',
  guardrail_metric text default 'fraud_risk_rate',

  starts_at timestamptz,
  ends_at timestamptz,

  owner text,
  hypothesis text,
  description text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint attention_experiments_status_check
  check (
    status in (
      'draft',
      'scheduled',
      'active',
      'paused',
      'completed',
      'cancelled'
    )
  ),

  constraint attention_experiments_type_check
  check (
    experiment_type in (
      'model_comparison',
      'pipeline_comparison',
      'scoring_formula_comparison',
      'threshold_test',
      'fraud_detector_test',
      'holdout'
    )
  )
);

create index if not exists attention_experiments_status_idx
on attention_experiments (status, starts_at desc);

-- ---------------------------------------------------------------------------
-- 3) Experiment variants
-- ---------------------------------------------------------------------------

create table if not exists attention_experiment_variants (
  id uuid primary key default gen_random_uuid(),

  experiment_id uuid not null references attention_experiments(id) on delete cascade,

  variant_key text not null,
  variant_name text not null,

  allocation_percentage numeric(6, 4) not null,
  is_control boolean not null default false,

  model_version text not null references attention_model_versions(model_version),
  pipeline_version text not null references attention_pipeline_versions(pipeline_version),
  runtime_signal_schema_version text not null references runtime_signal_schema_versions(schema_version),
  scoring_formula_version text not null references attention_scoring_formula_versions(formula_version),

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint attention_experiment_variants_allocation_check
  check (
    allocation_percentage >= 0
    and allocation_percentage <= 1
  ),

  unique (experiment_id, variant_key)
);

create index if not exists attention_experiment_variants_experiment_idx
on attention_experiment_variants (experiment_id);

create index if not exists attention_experiment_variants_model_idx
on attention_experiment_variants (model_version);

-- ---------------------------------------------------------------------------
-- 4) Runtime assignments
-- ---------------------------------------------------------------------------

create table if not exists attention_runtime_assignments (
  id uuid primary key default gen_random_uuid(),

  assignment_key text not null unique,

  user_id uuid,
  wallet_id uuid references wallets(id),
  device_id uuid,
  app_session_id uuid,

  campaign_id uuid,
  creative_id uuid,
  placement_id uuid,

  rollout_id uuid references attention_model_rollouts(id),
  experiment_id uuid references attention_experiments(id),
  experiment_variant_id uuid references attention_experiment_variants(id),

  model_version text not null,
  pipeline_version text not null,
  runtime_signal_schema_version text not null,
  scoring_formula_version text not null,

  assignment_reason text not null,

  assigned_at timestamptz not null default now(),

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists attention_runtime_assignments_user_idx
on attention_runtime_assignments (user_id, assigned_at desc);

create index if not exists attention_runtime_assignments_wallet_idx
on attention_runtime_assignments (wallet_id, assigned_at desc);

create index if not exists attention_runtime_assignments_rollout_idx
on attention_runtime_assignments (rollout_id, assigned_at desc);

create index if not exists attention_runtime_assignments_experiment_idx
on attention_runtime_assignments (experiment_id, experiment_variant_id, assigned_at desc);

-- ---------------------------------------------------------------------------
-- 5) Attach assignment to sessions/events
-- ---------------------------------------------------------------------------

alter table attention_verification_sessions
add column if not exists runtime_assignment_id uuid references attention_runtime_assignments(id),
add column if not exists rollout_id uuid references attention_model_rollouts(id),
add column if not exists experiment_id uuid references attention_experiments(id),
add column if not exists experiment_variant_id uuid references attention_experiment_variants(id);

alter table attention_verification_events
add column if not exists runtime_assignment_id uuid references attention_runtime_assignments(id),
add column if not exists rollout_id uuid references attention_model_rollouts(id),
add column if not exists experiment_id uuid references attention_experiments(id),
add column if not exists experiment_variant_id uuid references attention_experiment_variants(id);

create index if not exists attention_verification_events_rollout_idx
on attention_verification_events (rollout_id, occurred_at desc);

create index if not exists attention_verification_events_experiment_idx
on attention_verification_events (experiment_id, experiment_variant_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- 6) Stable bucket helper
-- ---------------------------------------------------------------------------

create or replace function stable_rollout_bucket(
  p_key text,
  p_salt text default 'attention_rollout_v1'
)
returns numeric
language sql
immutable
as $$
  select (
    (
      ('x' || substr(md5(coalesce(p_salt, '') || ':' || coalesce(p_key, '')), 1, 8))::bit(32)::bigint
    )::numeric
    / 4294967295.0
  );
$$;

-- ---------------------------------------------------------------------------
-- 7) Active rollout selector
-- ---------------------------------------------------------------------------

create or replace function select_attention_model_rollout(
  p_user_id uuid,
  p_wallet_id uuid,
  p_device_id uuid,
  p_campaign_id uuid default null,
  p_platform text default null,
  p_app_version text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns attention_model_rollouts
language plpgsql
stable
as $$
declare
  v_key text;
  v_bucket numeric;
  v_rollout attention_model_rollouts%rowtype;
begin
  v_key := coalesce(
    p_wallet_id::text,
    p_user_id::text,
    p_device_id::text,
    'anonymous'
  );

  v_bucket := stable_rollout_bucket(v_key, 'attention_rollout');

  select *
  into v_rollout
  from attention_model_rollouts r
  where r.status = 'active'
    and r.kill_switch_enabled is false
    and (
      r.starts_at is null
      or r.starts_at <= now()
    )
    and (
      r.ends_at is null
      or r.ends_at > now()
    )
    and (
      r.target_campaign_id is null
      or r.target_campaign_id = p_campaign_id
    )
    and (
      r.target_platform is null
      or r.target_platform = p_platform
    )
    and (
      r.min_app_version is null
      or p_app_version is null
      or p_app_version >= r.min_app_version
    )
    and (
      r.max_app_version is null
      or p_app_version is null
      or p_app_version <= r.max_app_version
    )
    and (
      r.rollout_type = 'forced'
      or r.rollout_type = 'campaign_only'
      or r.rollout_type = 'platform_only'
      or (
        r.rollout_type = 'percentage'
        and v_bucket < r.rollout_percentage
      )
      or r.rollout_type = 'internal_test'
    )
  order by
    case r.rollout_type
      when 'forced' then 1
      when 'campaign_only' then 2
      when 'platform_only' then 3
      when 'percentage' then 4
      when 'internal_test' then 5
      else 9
    end,
    r.created_at desc
  limit 1;

  return v_rollout;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8) Experiment variant selector
-- ---------------------------------------------------------------------------

create or replace function select_attention_experiment_variant(
  p_experiment_id uuid,
  p_assignment_key text
)
returns attention_experiment_variants
language plpgsql
stable
as $$
declare
  v_bucket numeric;
  v_variant attention_experiment_variants%rowtype;
begin
  if p_experiment_id is null then
    raise exception 'experiment id is required';
  end if;

  v_bucket := stable_rollout_bucket(
    p_assignment_key,
    'attention_experiment:' || p_experiment_id::text
  );

  with ordered_variants as (
    select
      v.*,
      sum(v.allocation_percentage) over (
        order by v.variant_key asc
      ) as cumulative_allocation
    from attention_experiment_variants v
    where v.experiment_id = p_experiment_id
  )
  select *
  into v_variant
  from ordered_variants
  where v_bucket < cumulative_allocation
  order by cumulative_allocation asc
  limit 1;

  if v_variant.id is null then
    select *
    into v_variant
    from attention_experiment_variants
    where experiment_id = p_experiment_id
      and is_control is true
    limit 1;
  end if;

  return v_variant;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9) Active experiment selector
-- ---------------------------------------------------------------------------

create or replace function select_active_attention_experiment(
  p_campaign_id uuid default null,
  p_platform text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns attention_experiments
language plpgsql
stable
as $$
declare
  v_experiment attention_experiments%rowtype;
begin
  select *
  into v_experiment
  from attention_experiments e
  where e.status = 'active'
    and (
      e.starts_at is null
      or e.starts_at <= now()
    )
    and (
      e.ends_at is null
      or e.ends_at > now()
    )
  order by e.created_at desc
  limit 1;

  return v_experiment;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10) Resolve runtime assignment
-- ---------------------------------------------------------------------------

create or replace function resolve_attention_runtime_assignment(
  p_user_id uuid,
  p_wallet_id uuid,
  p_device_id uuid default null,
  p_app_session_id uuid default null,
  p_campaign_id uuid default null,
  p_creative_id uuid default null,
  p_placement_id uuid default null,
  p_platform text default null,
  p_app_version text default null,
  p_assignment_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_assignment_key text;
  v_existing_id uuid;

  v_rollout attention_model_rollouts%rowtype;
  v_experiment attention_experiments%rowtype;
  v_variant attention_experiment_variants%rowtype;

  v_model_version text;
  v_pipeline_version text;
  v_runtime_signal_schema_version text;
  v_scoring_formula_version text;

  v_assignment_reason text;
  v_assignment_id uuid;
begin
  v_assignment_key := coalesce(
    p_assignment_key,
    'attention_runtime:' ||
    coalesce(p_wallet_id::text, p_user_id::text, p_device_id::text, 'anonymous') ||
    ':' ||
    coalesce(p_campaign_id::text, 'no_campaign') ||
    ':' ||
    coalesce(p_app_session_id::text, gen_random_uuid()::text)
  );

  select id
  into v_existing_id
  from attention_runtime_assignments
  where assignment_key = v_assignment_key;

  if v_existing_id is not null then
    return v_existing_id;
  end if;

  v_experiment := select_active_attention_experiment(
    p_campaign_id,
    p_platform,
    p_metadata
  );

  if v_experiment.id is not null then
    v_variant := select_attention_experiment_variant(
      v_experiment.id,
      v_assignment_key
    );

    if v_variant.id is not null then
      v_model_version := v_variant.model_version;
      v_pipeline_version := v_variant.pipeline_version;
      v_runtime_signal_schema_version := v_variant.runtime_signal_schema_version;
      v_scoring_formula_version := v_variant.scoring_formula_version;
      v_assignment_reason := 'experiment_variant';
    end if;
  end if;

  if v_model_version is null then
    v_rollout := select_attention_model_rollout(
      p_user_id,
      p_wallet_id,
      p_device_id,
      p_campaign_id,
      p_platform,
      p_app_version,
      p_metadata
    );

    if v_rollout.id is not null then
      v_model_version := v_rollout.model_version;
      v_pipeline_version := v_rollout.pipeline_version;
      v_runtime_signal_schema_version := v_rollout.runtime_signal_schema_version;
      v_scoring_formula_version := v_rollout.scoring_formula_version;
      v_assignment_reason := 'rollout';
    end if;
  end if;

  if v_model_version is null then
    select
      mv.model_version,
      pv.pipeline_version,
      pv.runtime_signal_schema_version,
      pv.scoring_formula_version
    into
      v_model_version,
      v_pipeline_version,
      v_runtime_signal_schema_version,
      v_scoring_formula_version
    from attention_model_versions mv
    join attention_pipeline_model_links pml
      on pml.model_version = mv.model_version
     and pml.required is true
    join attention_pipeline_versions pv
      on pv.pipeline_version = pml.pipeline_version
    where mv.status = 'active'
      and pv.status = 'active'
    order by mv.deployed_at desc nulls last, mv.created_at desc
    limit 1;

    v_assignment_reason := 'default_active_runtime';
  end if;

  perform assert_attention_runtime_version_allowed(
    v_model_version,
    v_pipeline_version,
    v_runtime_signal_schema_version
  );

  insert into attention_runtime_assignments (
    assignment_key,
    user_id,
    wallet_id,
    device_id,
    app_session_id,
    campaign_id,
    creative_id,
    placement_id,
    rollout_id,
    experiment_id,
    experiment_variant_id,
    model_version,
    pipeline_version,
    runtime_signal_schema_version,
    scoring_formula_version,
    assignment_reason,
    metadata
  )
  values (
    v_assignment_key,
    p_user_id,
    p_wallet_id,
    p_device_id,
    p_app_session_id,
    p_campaign_id,
    p_creative_id,
    p_placement_id,
    case when v_rollout.id is not null then v_rollout.id else null end,
    case when v_experiment.id is not null then v_experiment.id else null end,
    case when v_variant.id is not null then v_variant.id else null end,
    v_model_version,
    v_pipeline_version,
    v_runtime_signal_schema_version,
    v_scoring_formula_version,
    v_assignment_reason,
    p_metadata || jsonb_build_object(
      'platform',
      p_platform,
      'app_version',
      p_app_version
    )
  )
  returning id into v_assignment_id;

  return v_assignment_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 11) Start session from assignment
-- ---------------------------------------------------------------------------

create or replace function start_attention_verification_session_from_assignment(
  p_runtime_assignment_id uuid,
  p_user_id uuid,
  p_wallet_id uuid,
  p_campaign_id uuid default null,
  p_creative_id uuid default null,
  p_placement_id uuid default null,
  p_device_id uuid default null,
  p_session_id uuid default null,
  p_app_version text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_assignment attention_runtime_assignments%rowtype;
  v_session_id uuid;
begin
  if p_runtime_assignment_id is null then
    raise exception 'runtime assignment id is required';
  end if;

  select *
  into v_assignment
  from attention_runtime_assignments
  where id = p_runtime_assignment_id;

  if v_assignment.id is null then
    raise exception 'runtime assignment not found: %', p_runtime_assignment_id;
  end if;

  v_session_id := start_attention_verification_session(
    p_user_id,
    p_wallet_id,
    coalesce(p_campaign_id, v_assignment.campaign_id),
    coalesce(p_creative_id, v_assignment.creative_id),
    coalesce(p_placement_id, v_assignment.placement_id),
    coalesce(p_device_id, v_assignment.device_id),
    p_session_id,
    p_app_version,
    v_assignment.model_version,
    v_assignment.pipeline_version,
    v_assignment.runtime_signal_schema_version,
    p_metadata || jsonb_build_object(
      'runtime_assignment_id',
      v_assignment.id,
      'rollout_id',
      v_assignment.rollout_id,
      'experiment_id',
      v_assignment.experiment_id,
      'experiment_variant_id',
      v_assignment.experiment_variant_id,
      'assignment_reason',
      v_assignment.assignment_reason
    )
  );

  update attention_verification_sessions
  set
    runtime_assignment_id = v_assignment.id,
    rollout_id = v_assignment.rollout_id,
    experiment_id = v_assignment.experiment_id,
    experiment_variant_id = v_assignment.experiment_variant_id
  where id = v_session_id;

  return v_session_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 12) Patch complete_attention_verification_event with assignment fields
-- ---------------------------------------------------------------------------

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

  perform assert_attention_runtime_version_allowed(
    coalesce(p_model_version, v_session.model_version),
    coalesce(p_pipeline_version, v_session.pipeline_version),
    v_session.runtime_signal_schema_version
  );

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
    runtime_signal_schema_version,
    scoring_formula_version,
    fraud_formula_version,
    runtime_assignment_id,
    rollout_id,
    experiment_id,
    experiment_variant_id,
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
    v_session.runtime_signal_schema_version,
    coalesce(
      (
        select scoring_formula_version
        from attention_runtime_assignments
        where id = v_session.runtime_assignment_id
      ),
      get_active_attention_scoring_formula_version()
    ),
    coalesce(
      (
        select fraud_formula_version
        from attention_pipeline_versions
        where pipeline_version = coalesce(p_pipeline_version, v_session.pipeline_version)
        limit 1
      ),
      'attention_fraud_v1'
    ),
    v_session.runtime_assignment_id,
    v_session.rollout_id,
    v_session.experiment_id,
    v_session.experiment_variant_id,
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

-- ---------------------------------------------------------------------------
-- 13) Rollout metrics table
-- ---------------------------------------------------------------------------

create table if not exists attention_rollout_metrics (
  id uuid primary key default gen_random_uuid(),

  rollout_id uuid references attention_model_rollouts(id),
  experiment_id uuid references attention_experiments(id),
  experiment_variant_id uuid references attention_experiment_variants(id),

  metric_bucket_start timestamptz not null,
  metric_bucket_end timestamptz not null,

  event_count integer not null default 0,
  passed_count integer not null default 0,
  failed_count integer not null default 0,
  fraud_suspected_count integer not null default 0,
  reward_eligible_count integer not null default 0,
  reward_issued_count integer not null default 0,

  avg_attention_score numeric(8, 6),
  avg_confidence_score numeric(8, 6),
  avg_fraud_risk_score numeric(8, 6),
  avg_quality_score numeric(8, 6),

  no_face_rate numeric(8, 6),
  gaze_invalid_rate numeric(8, 6),

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint attention_rollout_metrics_bucket_check
  check (metric_bucket_end > metric_bucket_start)
);

create index if not exists attention_rollout_metrics_rollout_idx
on attention_rollout_metrics (rollout_id, metric_bucket_start desc);

create index if not exists attention_rollout_metrics_experiment_idx
on attention_rollout_metrics (experiment_id, experiment_variant_id, metric_bucket_start desc);

-- ---------------------------------------------------------------------------
-- 14) Compute rollout metrics
-- ---------------------------------------------------------------------------

create or replace function compute_attention_rollout_metrics(
  p_bucket_start timestamptz,
  p_bucket_end timestamptz,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
as $$
declare
  v_inserted integer := 0;
begin
  if p_bucket_start is null or p_bucket_end is null then
    raise exception 'bucket start/end required';
  end if;

  if p_bucket_end <= p_bucket_start then
    raise exception 'bucket end must be after bucket start';
  end if;

  insert into attention_rollout_metrics (
    rollout_id,
    experiment_id,
    experiment_variant_id,
    metric_bucket_start,
    metric_bucket_end,
    event_count,
    passed_count,
    failed_count,
    fraud_suspected_count,
    reward_eligible_count,
    reward_issued_count,
    avg_attention_score,
    avg_confidence_score,
    avg_fraud_risk_score,
    avg_quality_score,
    no_face_rate,
    gaze_invalid_rate,
    metadata
  )
  select
    ave.rollout_id,
    ave.experiment_id,
    ave.experiment_variant_id,
    p_bucket_start,
    p_bucket_end,

    count(*)::integer,
    count(*) filter (where ave.decision = 'passed')::integer,
    count(*) filter (where ave.decision = 'failed')::integer,
    count(*) filter (where ave.decision = 'fraud_suspected')::integer,
    count(*) filter (where ave.reward_eligible is true)::integer,
    count(*) filter (where ave.reward_issued is true)::integer,

    avg(ave.attention_score),
    avg(ave.confidence_score),
    avg(ave.fraud_risk_score),
    avg(ave.quality_score),

    (
      sum(ave.no_face_frame_count)::numeric
      / greatest(sum(ave.valid_frame_count + ave.invalid_frame_count), 1)
    )::numeric(8, 6),

    (
      sum(ave.gaze_invalid_frame_count)::numeric
      / greatest(sum(ave.valid_frame_count + ave.invalid_frame_count), 1)
    )::numeric(8, 6),

    p_metadata
  from attention_verification_events ave
  where ave.occurred_at >= p_bucket_start
    and ave.occurred_at < p_bucket_end
    and (
      ave.rollout_id is not null
      or ave.experiment_id is not null
    )
  group by
    ave.rollout_id,
    ave.experiment_id,
    ave.experiment_variant_id;

  get diagnostics v_inserted = row_count;

  return v_inserted;
end;
$$;

-- ---------------------------------------------------------------------------
-- 15) Rollout guardrail view
-- ---------------------------------------------------------------------------

create or replace view attention_rollout_guardrails as
select
  r.id as rollout_id,
  r.rollout_key,
  r.rollout_name,
  r.model_version,
  r.pipeline_version,
  r.status,
  r.rollout_percentage,
  r.kill_switch_enabled,

  coalesce(sum(m.event_count), 0)::integer as event_count,
  coalesce(sum(m.passed_count), 0)::integer as passed_count,
  coalesce(sum(m.fraud_suspected_count), 0)::integer as fraud_suspected_count,
  coalesce(sum(m.reward_issued_count), 0)::integer as reward_issued_count,

  (
    coalesce(sum(m.passed_count), 0)::numeric
    / greatest(coalesce(sum(m.event_count), 0), 1)
  )::numeric(8, 6) as pass_rate,

  (
    coalesce(sum(m.fraud_suspected_count), 0)::numeric
    / greatest(coalesce(sum(m.event_count), 0), 1)
  )::numeric(8, 6) as fraud_suspected_rate,

  avg(m.avg_attention_score)::numeric(8, 6) as avg_attention_score,
  avg(m.avg_fraud_risk_score)::numeric(8, 6) as avg_fraud_risk_score,

  case
    when coalesce(sum(m.event_count), 0) >= 100
      and (
        coalesce(sum(m.fraud_suspected_count), 0)::numeric
        / greatest(coalesce(sum(m.event_count), 0), 1)
      ) >= 0.100000
    then true

    when coalesce(sum(m.event_count), 0) >= 100
      and avg(m.avg_fraud_risk_score) >= 0.700000
    then true

    else false
  end as should_pause
from attention_model_rollouts r
left join attention_rollout_metrics m
  on m.rollout_id = r.id
 and m.metric_bucket_start >= now() - interval '24 hours'
group by r.id;

-- ---------------------------------------------------------------------------
-- 16) Auto-pause risky rollouts
-- ---------------------------------------------------------------------------

create or replace function auto_pause_risky_attention_rollouts(
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
as $$
declare
  v_row record;
  v_paused integer := 0;
begin
  for v_row in
    select *
    from attention_rollout_guardrails
    where should_pause is true
      and status = 'active'
      and kill_switch_enabled is false
  loop
    update attention_model_rollouts
    set
      status = 'paused',
      kill_switch_enabled = true,
      metadata = metadata || p_metadata || jsonb_build_object(
        'auto_paused_at',
        now(),
        'auto_pause_reason',
        'guardrail_triggered',
        'fraud_suspected_rate',
        v_row.fraud_suspected_rate,
        'avg_fraud_risk_score',
        v_row.avg_fraud_risk_score
      ),
      updated_at = now()
    where id = v_row.rollout_id;

    v_paused := v_paused + 1;
  end loop;

  return v_paused;
end;
$$;

-- ---------------------------------------------------------------------------
-- 17) Create rollout helper
-- ---------------------------------------------------------------------------

create or replace function create_attention_model_rollout(
  p_rollout_key text,
  p_rollout_name text,
  p_model_version text,
  p_pipeline_version text,
  p_runtime_signal_schema_version text,
  p_scoring_formula_version text,
  p_rollout_type text default 'percentage',
  p_rollout_percentage numeric default 0.0000,
  p_target_platform text default null,
  p_target_campaign_id uuid default null,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_owner text default null,
  p_description text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_rollout_id uuid;
begin
  perform assert_attention_runtime_version_allowed(
    p_model_version,
    p_pipeline_version,
    p_runtime_signal_schema_version
  );

  insert into attention_model_rollouts (
    rollout_key,
    rollout_name,
    model_version,
    pipeline_version,
    runtime_signal_schema_version,
    scoring_formula_version,
    rollout_type,
    rollout_percentage,
    target_platform,
    target_campaign_id,
    starts_at,
    ends_at,
    owner,
    description,
    status,
    metadata
  )
  values (
    p_rollout_key,
    p_rollout_name,
    p_model_version,
    p_pipeline_version,
    p_runtime_signal_schema_version,
    p_scoring_formula_version,
    p_rollout_type,
    p_rollout_percentage,
    p_target_platform,
    p_target_campaign_id,
    p_starts_at,
    p_ends_at,
    p_owner,
    p_description,
    'draft',
    p_metadata
  )
  returning id into v_rollout_id;

  return v_rollout_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 18) Activate rollout
-- ---------------------------------------------------------------------------

create or replace function activate_attention_model_rollout(
  p_rollout_id uuid,
  p_admin_user_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_rollout attention_model_rollouts%rowtype;
begin
  select *
  into v_rollout
  from attention_model_rollouts
  where id = p_rollout_id
  for update;

  if v_rollout.id is null then
    raise exception 'rollout not found: %', p_rollout_id;
  end if;

  perform assert_attention_runtime_version_allowed(
    v_rollout.model_version,
    v_rollout.pipeline_version,
    v_rollout.runtime_signal_schema_version
  );

  update attention_model_rollouts
  set
    status = 'active',
    starts_at = coalesce(starts_at, now()),
    kill_switch_enabled = false,
    metadata = metadata || p_metadata || jsonb_build_object(
      'activated_by_admin_id',
      p_admin_user_id,
      'activated_at',
      now()
    ),
    updated_at = now()
  where id = p_rollout_id;

  return p_rollout_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 19) Pause/kill rollout
-- ---------------------------------------------------------------------------

create or replace function pause_attention_model_rollout(
  p_rollout_id uuid,
  p_reason text,
  p_admin_user_id uuid default null,
  p_kill_switch boolean default true,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'pause reason is required';
  end if;

  update attention_model_rollouts
  set
    status = 'paused',
    kill_switch_enabled = p_kill_switch,
    metadata = metadata || p_metadata || jsonb_build_object(
      'paused_by_admin_id',
      p_admin_user_id,
      'paused_at',
      now(),
      'pause_reason',
      p_reason
    ),
    updated_at = now()
  where id = p_rollout_id;

  if not found then
    raise exception 'rollout not found: %', p_rollout_id;
  end if;

  return p_rollout_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 20) Rollback rollout
-- ---------------------------------------------------------------------------

create or replace function rollback_attention_model_rollout(
  p_rollout_id uuid,
  p_rollback_to_rollout_id uuid default null,
  p_reason text default null,
  p_admin_user_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'rollback reason is required';
  end if;

  update attention_model_rollouts
  set
    status = 'rolled_back',
    kill_switch_enabled = true,
    rollback_rollout_id = p_rollback_to_rollout_id,
    metadata = metadata || p_metadata || jsonb_build_object(
      'rolled_back_by_admin_id',
      p_admin_user_id,
      'rolled_back_at',
      now(),
      'rollback_reason',
      p_reason,
      'rollback_to_rollout_id',
      p_rollback_to_rollout_id
    ),
    updated_at = now()
  where id = p_rollout_id;

  if not found then
    raise exception 'rollout not found: %', p_rollout_id;
  end if;

  return p_rollout_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 21) Rollout dashboard view
-- ---------------------------------------------------------------------------

create or replace view attention_rollout_dashboard as
select
  r.id as rollout_id,
  r.rollout_key,
  r.rollout_name,
  r.status,
  r.rollout_type,
  r.rollout_percentage,
  r.kill_switch_enabled,

  r.model_version,
  mv.status as model_status,

  r.pipeline_version,
  pv.status as pipeline_status,

  r.runtime_signal_schema_version,
  r.scoring_formula_version,

  r.target_platform,
  r.target_campaign_id,
  r.starts_at,
  r.ends_at,
  r.owner,
  r.description,

  g.event_count,
  g.pass_rate,
  g.fraud_suspected_rate,
  g.avg_attention_score,
  g.avg_fraud_risk_score,
  g.should_pause,

  r.created_at,
  r.updated_at
from attention_model_rollouts r
left join attention_model_versions mv
  on mv.model_version = r.model_version
left join attention_pipeline_versions pv
  on pv.pipeline_version = r.pipeline_version
left join attention_rollout_guardrails g
  on g.rollout_id = r.id;

-- ---------------------------------------------------------------------------
-- 22) Experiment dashboard view
-- ---------------------------------------------------------------------------

create or replace view attention_experiment_dashboard as
select
  e.id as experiment_id,
  e.experiment_key,
  e.experiment_name,
  e.status,
  e.experiment_type,
  e.primary_metric,
  e.guardrail_metric,
  e.starts_at,
  e.ends_at,
  e.owner,
  e.hypothesis,

  count(distinct v.id) as variant_count,
  count(distinct a.id) as assignment_count,
  count(distinct ave.id) as event_count,

  jsonb_agg(
    distinct jsonb_build_object(
      'variant_id', v.id,
      'variant_key', v.variant_key,
      'variant_name', v.variant_name,
      'allocation_percentage', v.allocation_percentage,
      'is_control', v.is_control,
      'model_version', v.model_version,
      'pipeline_version', v.pipeline_version,
      'scoring_formula_version', v.scoring_formula_version
    )
  ) filter (where v.id is not null) as variants,

  jsonb_agg(
    distinct jsonb_build_object(
      'variant_id', m.experiment_variant_id,
      'event_count', m.event_count,
      'passed_count', m.passed_count,
      'fraud_suspected_count', m.fraud_suspected_count,
      'reward_issued_count', m.reward_issued_count,
      'avg_attention_score', m.avg_attention_score,
      'avg_fraud_risk_score', m.avg_fraud_risk_score,
      'bucket_start', m.metric_bucket_start,
      'bucket_end', m.metric_bucket_end
    )
  ) filter (where m.id is not null) as metric_buckets
from attention_experiments e
left join attention_experiment_variants v
  on v.experiment_id = e.id
left join attention_runtime_assignments a
  on a.experiment_id = e.id
left join attention_verification_events ave
  on ave.experiment_id = e.id
left join attention_rollout_metrics m
  on m.experiment_id = e.id
group by e.id;
