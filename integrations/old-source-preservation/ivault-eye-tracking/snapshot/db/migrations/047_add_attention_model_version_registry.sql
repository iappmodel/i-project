-- 47/post-MVP — attention model/pipeline/formula registries and runtime provenance.

-- ---------------------------------------------------------------------------
-- 1) Attention model registry
-- ---------------------------------------------------------------------------

create table if not exists attention_model_versions (
  id uuid primary key default gen_random_uuid(),

  model_version text not null unique,

  model_name text not null,
  model_type text not null default 'attention_verification',

  status text not null default 'testing',

  version_semver text,
  build_hash text,
  artifact_uri text,

  trained_at timestamptz,
  deployed_at timestamptz,
  deprecated_at timestamptz,
  revoked_at timestamptz,

  min_app_version text,
  max_app_version text,

  owner text,
  description text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint attention_model_versions_type_check
  check (
    model_type in (
      'attention_verification',
      'gaze_estimation',
      'blink_detection',
      'liveness_detection',
      'fraud_detection',
      'quality_scoring',
      'fusion_model'
    )
  ),

  constraint attention_model_versions_status_check
  check (
    status in (
      'testing',
      'active',
      'deprecated',
      'revoked',
      'archived'
    )
  )
);

create index if not exists attention_model_versions_status_idx
on attention_model_versions (status, deployed_at desc);

create index if not exists attention_model_versions_type_idx
on attention_model_versions (model_type, status);

-- ---------------------------------------------------------------------------
-- 2) Attention pipeline registry
-- ---------------------------------------------------------------------------

create table if not exists attention_pipeline_versions (
  id uuid primary key default gen_random_uuid(),

  pipeline_version text not null unique,

  pipeline_name text not null,

  status text not null default 'testing',

  runtime_signal_schema_version text not null default 'runtime_signals_v1',
  scoring_formula_version text not null default 'attention_score_v1',
  fraud_formula_version text not null default 'attention_fraud_v1',

  frame_format text,
  max_frame_edge integer,
  target_processed_fps numeric(6, 2),

  app_platform text,
  min_app_version text,
  max_app_version text,

  deployed_at timestamptz,
  deprecated_at timestamptz,
  revoked_at timestamptz,

  description text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint attention_pipeline_versions_status_check
  check (
    status in (
      'testing',
      'active',
      'deprecated',
      'revoked',
      'archived'
    )
  ),

  constraint attention_pipeline_versions_platform_check
  check (
    app_platform is null
    or app_platform in (
      'ios',
      'android',
      'web',
      'desktop',
      'server'
    )
  )
);

create index if not exists attention_pipeline_versions_status_idx
on attention_pipeline_versions (status, deployed_at desc);

create index if not exists attention_pipeline_versions_platform_idx
on attention_pipeline_versions (app_platform, status);

-- ---------------------------------------------------------------------------
-- 3) Link pipelines to models
-- ---------------------------------------------------------------------------

create table if not exists attention_pipeline_model_links (
  id uuid primary key default gen_random_uuid(),

  pipeline_version text not null references attention_pipeline_versions(pipeline_version),
  model_version text not null references attention_model_versions(model_version),

  role text not null,

  required boolean not null default true,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint attention_pipeline_model_links_role_check
  check (
    role in (
      'gaze_estimation',
      'blink_detection',
      'liveness_detection',
      'quality_scoring',
      'fraud_detection',
      'fusion',
      'fallback'
    )
  ),

  unique (pipeline_version, model_version, role)
);

create index if not exists attention_pipeline_model_links_pipeline_idx
on attention_pipeline_model_links (pipeline_version);

create index if not exists attention_pipeline_model_links_model_idx
on attention_pipeline_model_links (model_version);

-- ---------------------------------------------------------------------------
-- 4) Runtime signal schema registry
-- ---------------------------------------------------------------------------

create table if not exists runtime_signal_schema_versions (
  id uuid primary key default gen_random_uuid(),

  schema_version text not null unique,

  status text not null default 'active',

  required_fields text[] not null,
  optional_fields text[] not null default '{}',

  description text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint runtime_signal_schema_versions_status_check
  check (
    status in (
      'active',
      'deprecated',
      'revoked',
      'archived'
    )
  )
);

insert into runtime_signal_schema_versions (
  schema_version,
  status,
  required_fields,
  optional_fields,
  description,
  metadata
)
values (
  'runtime_signals_v1',
  'active',
  array['gazeX', 'gazeY', 'confidence', 'blink'],
  array[
    'quality',
    'fixationState',
    'dwellProgress',
    'trackingState',
    'timestampMs'
  ],
  'Minimal runtime intent packet for gaze, confidence, and blink state.',
  '{"packet": "{ gazeX, gazeY, confidence, blink }"}'::jsonb
)
on conflict (schema_version)
do update set
  status = excluded.status,
  required_fields = excluded.required_fields,
  optional_fields = excluded.optional_fields,
  metadata = runtime_signal_schema_versions.metadata || excluded.metadata;

-- ---------------------------------------------------------------------------
-- 5) Attention scoring formula registry
-- ---------------------------------------------------------------------------

create table if not exists attention_scoring_formula_versions (
  id uuid primary key default gen_random_uuid(),

  formula_version text not null unique,

  name text not null,
  status text not null default 'testing',

  description text,

  active boolean not null default false,

  valid_from timestamptz not null default now(),
  valid_until timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint attention_scoring_formula_versions_status_check
  check (
    status in (
      'testing',
      'active',
      'deprecated',
      'revoked',
      'archived'
    )
  )
);

create index if not exists attention_scoring_formula_versions_active_idx
on attention_scoring_formula_versions (active, valid_from desc);

-- ---------------------------------------------------------------------------
-- 6) Attention scoring formula parameters
-- ---------------------------------------------------------------------------

create table if not exists attention_scoring_formula_parameters (
  id uuid primary key default gen_random_uuid(),

  formula_version text not null references attention_scoring_formula_versions(formula_version),

  parameter_name text not null,
  parameter_value numeric(12, 6) not null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  unique (formula_version, parameter_name)
);

create index if not exists attention_scoring_formula_parameters_formula_idx
on attention_scoring_formula_parameters (formula_version);

insert into attention_scoring_formula_versions (
  formula_version,
  name,
  status,
  active,
  description,
  metadata
)
values (
  'attention_score_v1',
  'Attention Score V1',
  'active',
  true,
  'Initial weighted scoring formula for gaze, fixation, liveness, completion, and quality.',
  '{"owner": "attention_engine"}'::jsonb
)
on conflict (formula_version)
do update set
  status = excluded.status,
  active = excluded.active,
  metadata = attention_scoring_formula_versions.metadata || excluded.metadata;

insert into attention_scoring_formula_parameters (
  formula_version,
  parameter_name,
  parameter_value,
  metadata
)
values
  ('attention_score_v1', 'gaze_weight', 0.300000, '{}'),
  ('attention_score_v1', 'fixation_weight', 0.250000, '{}'),
  ('attention_score_v1', 'liveness_weight', 0.200000, '{}'),
  ('attention_score_v1', 'completion_weight', 0.150000, '{}'),
  ('attention_score_v1', 'quality_weight', 0.100000, '{}'),
  ('attention_score_v1', 'min_valid_frame_ratio', 0.700000, '{}'),
  ('attention_score_v1', 'max_no_face_ratio', 0.200000, '{}'),
  ('attention_score_v1', 'max_gaze_invalid_ratio', 0.250000, '{}')
on conflict (formula_version, parameter_name)
do update set
  parameter_value = excluded.parameter_value,
  metadata = attention_scoring_formula_parameters.metadata || excluded.metadata;

-- ---------------------------------------------------------------------------
-- 7) Active formula helper
-- ---------------------------------------------------------------------------

create or replace function get_active_attention_scoring_formula_version()
returns text
language plpgsql
stable
as $$
declare
  v_formula_version text;
begin
  select formula_version
  into v_formula_version
  from attention_scoring_formula_versions
  where active is true
    and status = 'active'
    and valid_from <= now()
    and (
      valid_until is null
      or valid_until > now()
    )
  order by valid_from desc, created_at desc
  limit 1;

  if v_formula_version is null then
    raise exception 'no active attention scoring formula version';
  end if;

  return v_formula_version;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8) Runtime version validation helper
-- ---------------------------------------------------------------------------

create or replace function assert_attention_runtime_version_allowed(
  p_model_version text,
  p_pipeline_version text,
  p_runtime_signal_schema_version text default null
)
returns void
language plpgsql
stable
as $$
declare
  v_model attention_model_versions%rowtype;
  v_pipeline attention_pipeline_versions%rowtype;
  v_schema runtime_signal_schema_versions%rowtype;
begin
  if p_model_version is null or length(trim(p_model_version)) = 0 then
    raise exception 'model version is required';
  end if;

  if p_pipeline_version is null or length(trim(p_pipeline_version)) = 0 then
    raise exception 'pipeline version is required';
  end if;

  select *
  into v_model
  from attention_model_versions
  where model_version = p_model_version;

  if v_model.id is null then
    raise exception 'unknown attention model version: %', p_model_version;
  end if;

  if v_model.status not in ('active', 'testing') then
    raise exception 'attention model version not allowed. version %, status %',
      p_model_version,
      v_model.status;
  end if;

  select *
  into v_pipeline
  from attention_pipeline_versions
  where pipeline_version = p_pipeline_version;

  if v_pipeline.id is null then
    raise exception 'unknown attention pipeline version: %', p_pipeline_version;
  end if;

  if v_pipeline.status not in ('active', 'testing') then
    raise exception 'attention pipeline version not allowed. version %, status %',
      p_pipeline_version,
      v_pipeline.status;
  end if;

  if p_runtime_signal_schema_version is not null then
    select *
    into v_schema
    from runtime_signal_schema_versions
    where schema_version = p_runtime_signal_schema_version;

    if v_schema.id is null then
      raise exception 'unknown runtime signal schema version: %',
        p_runtime_signal_schema_version;
    end if;

    if v_schema.status <> 'active' then
      raise exception 'runtime signal schema version not active. version %, status %',
        p_runtime_signal_schema_version,
        v_schema.status;
    end if;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9) Patch attention session/event tables with runtime provenance columns
-- ---------------------------------------------------------------------------

alter table attention_verification_sessions
add column if not exists runtime_signal_schema_version text;

alter table attention_verification_events
add column if not exists runtime_signal_schema_version text,
add column if not exists scoring_formula_version text,
add column if not exists fraud_formula_version text;

update attention_verification_sessions
set runtime_signal_schema_version = coalesce(runtime_signal_schema_version, 'runtime_signals_v1')
where runtime_signal_schema_version is null;

update attention_verification_events
set
  runtime_signal_schema_version = coalesce(runtime_signal_schema_version, 'runtime_signals_v1'),
  scoring_formula_version = coalesce(scoring_formula_version, 'attention_score_v1'),
  fraud_formula_version = coalesce(fraud_formula_version, 'attention_fraud_v1')
where runtime_signal_schema_version is null
   or scoring_formula_version is null
   or fraud_formula_version is null;

create index if not exists attention_verification_events_model_idx
on attention_verification_events (model_version, occurred_at desc);

create index if not exists attention_verification_events_pipeline_idx
on attention_verification_events (pipeline_version, occurred_at desc);

create index if not exists attention_verification_events_scoring_formula_idx
on attention_verification_events (scoring_formula_version, occurred_at desc);

-- ---------------------------------------------------------------------------
-- 10) Patch start_attention_verification_session
-- ---------------------------------------------------------------------------

drop function if exists start_attention_verification_session(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  jsonb
);

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
  p_runtime_signal_schema_version text default 'runtime_signals_v1',
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
    session_id,
    status,
    app_version,
    model_version,
    pipeline_version,
    runtime_signal_schema_version,
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
    p_runtime_signal_schema_version,
    p_metadata
  )
  returning id into v_session_id;

  return v_session_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 11) Patch complete_attention_verification_event
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
    get_active_attention_scoring_formula_version(),
    coalesce(
      (
        select fraud_formula_version
        from attention_pipeline_versions
        where pipeline_version = coalesce(p_pipeline_version, v_session.pipeline_version)
        limit 1
      ),
      'attention_fraud_v1'
    ),
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
-- 12) Seed active model and pipeline
-- ---------------------------------------------------------------------------

insert into attention_model_versions (
  model_version,
  model_name,
  model_type,
  status,
  version_semver,
  description,
  metadata,
  deployed_at
)
values (
  'vision_model_v1',
  'Local Vision Attention Model V1',
  'fusion_model',
  'active',
  '1.0.0',
  'Initial local/offline attention model using gaze, blink, quality, and liveness scores.',
  '{
    "runtime_packet": "{ gazeX, gazeY, confidence, blink }",
    "offline_capable": true,
    "api_dependency": false
  }'::jsonb,
  now()
)
on conflict (model_version)
do update set
  status = excluded.status,
  metadata = attention_model_versions.metadata || excluded.metadata,
  updated_at = now();

insert into attention_pipeline_versions (
  pipeline_version,
  pipeline_name,
  status,
  runtime_signal_schema_version,
  scoring_formula_version,
  fraud_formula_version,
  frame_format,
  max_frame_edge,
  target_processed_fps,
  app_platform,
  description,
  metadata,
  deployed_at
)
values (
  'runtime_signals_v1',
  'Runtime Signals Pipeline V1',
  'active',
  'runtime_signals_v1',
  'attention_score_v1',
  'attention_fraud_v1',
  'y8',
  320,
  10.0,
  'android',
  'Initial local pipeline using minimal runtime signal packet and native Y8 hot path.',
  '{
    "signals": ["gazeX", "gazeY", "confidence", "blink"],
    "hot_path": "YUV420 Y plane to native y8",
    "debug_metrics": ["frame_perf", "invalid_no_face", "invalid_gaze"]
  }'::jsonb,
  now()
)
on conflict (pipeline_version)
do update set
  status = excluded.status,
  metadata = attention_pipeline_versions.metadata || excluded.metadata,
  updated_at = now();

insert into attention_pipeline_model_links (
  pipeline_version,
  model_version,
  role,
  required,
  metadata
)
values (
  'runtime_signals_v1',
  'vision_model_v1',
  'fusion',
  true,
  '{"source": "local_attention_runtime"}'::jsonb
)
on conflict (pipeline_version, model_version, role)
do update set
  metadata = attention_pipeline_model_links.metadata || excluded.metadata;

-- ---------------------------------------------------------------------------
-- 13) Runtime provenance view
-- ---------------------------------------------------------------------------

create or replace view attention_runtime_provenance_details as
select
  ave.id as attention_event_id,
  ave.attention_session_id,
  ave.user_id,
  ave.wallet_id,
  ave.campaign_id,

  ave.decision,
  ave.decision_reason,
  ave.attention_score,
  ave.confidence_score,
  ave.fraud_risk_score,
  ave.quality_score,

  ave.model_version,
  mv.model_name,
  mv.model_type,
  mv.status as model_status,
  mv.build_hash as model_build_hash,

  ave.pipeline_version,
  pv.pipeline_name,
  pv.status as pipeline_status,
  pv.runtime_signal_schema_version,
  pv.scoring_formula_version,
  pv.fraud_formula_version,
  pv.frame_format,
  pv.max_frame_edge,
  pv.target_processed_fps,

  ave.runtime_signal_schema_version as event_runtime_signal_schema_version,
  rsv.required_fields,
  rsv.optional_fields,

  ave.scoring_formula_version as event_scoring_formula_version,
  sfv.status as scoring_formula_status,

  ave.occurred_at,
  ave.created_at,

  ave.metadata

from attention_verification_events ave
left join attention_model_versions mv
  on mv.model_version = ave.model_version
left join attention_pipeline_versions pv
  on pv.pipeline_version = ave.pipeline_version
left join runtime_signal_schema_versions rsv
  on rsv.schema_version = ave.runtime_signal_schema_version
left join attention_scoring_formula_versions sfv
  on sfv.formula_version = ave.scoring_formula_version;

-- ---------------------------------------------------------------------------
-- 14) Model deprecation helper
-- ---------------------------------------------------------------------------

create or replace function deprecate_attention_model_version(
  p_model_version text,
  p_reason text,
  p_admin_user_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns text
language plpgsql
as $$
begin
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'deprecation reason is required';
  end if;

  update attention_model_versions
  set
    status = 'deprecated',
    deprecated_at = now(),
    metadata = metadata || p_metadata || jsonb_build_object(
      'deprecation_reason',
      p_reason,
      'admin_user_id',
      p_admin_user_id
    ),
    updated_at = now()
  where model_version = p_model_version;

  if not found then
    raise exception 'attention model version not found: %', p_model_version;
  end if;

  return p_model_version;
end;
$$;

-- ---------------------------------------------------------------------------
-- 15) Model revocation helper
-- ---------------------------------------------------------------------------

create or replace function revoke_attention_model_version(
  p_model_version text,
  p_reason text,
  p_admin_user_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns text
language plpgsql
as $$
begin
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'revocation reason is required';
  end if;

  update attention_model_versions
  set
    status = 'revoked',
    revoked_at = now(),
    metadata = metadata || p_metadata || jsonb_build_object(
      'revocation_reason',
      p_reason,
      'admin_user_id',
      p_admin_user_id
    ),
    updated_at = now()
  where model_version = p_model_version;

  if not found then
    raise exception 'attention model version not found: %', p_model_version;
  end if;

  return p_model_version;
end;
$$;

-- ---------------------------------------------------------------------------
-- 16) Investigation view for deprecated/revoked/unknown runtimes
-- ---------------------------------------------------------------------------

create or replace view attention_events_from_nonactive_runtime as
select
  ave.id as attention_event_id,
  ave.user_id,
  ave.wallet_id,
  ave.campaign_id,
  ave.reward_eligible,
  ave.reward_issued,
  ave.reward_id,
  ave.decision,
  ave.attention_score,
  ave.fraud_risk_score,
  ave.model_version,
  mv.status as model_status,
  ave.pipeline_version,
  pv.status as pipeline_status,
  ave.occurred_at,
  ave.metadata
from attention_verification_events ave
left join attention_model_versions mv
  on mv.model_version = ave.model_version
left join attention_pipeline_versions pv
  on pv.pipeline_version = ave.pipeline_version
where
  mv.status in ('deprecated', 'revoked')
  or pv.status in ('deprecated', 'revoked')
  or mv.id is null
  or pv.id is null;
