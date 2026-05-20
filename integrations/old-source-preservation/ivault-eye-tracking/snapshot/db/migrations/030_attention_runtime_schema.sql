create table if not exists runtime_signal_schema_versions (
  id uuid primary key default gen_random_uuid(),

  schema_version text not null unique,

  status text not null default 'draft',

  required_fields text[] not null default '{}',
  optional_fields text[] not null default '{}',

  description text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint runtime_signal_schema_versions_status_check
  check (
    status in (
      'draft',
      'active',
      'deprecated',
      'revoked'
    )
  )
);

create index if not exists runtime_signal_schema_versions_status_idx
on runtime_signal_schema_versions (status);

drop trigger if exists runtime_signal_schema_versions_set_updated_at
on runtime_signal_schema_versions;

create trigger runtime_signal_schema_versions_set_updated_at
before update on runtime_signal_schema_versions
for each row
execute function set_updated_at();

create table if not exists attention_scoring_formula_versions (
  id uuid primary key default gen_random_uuid(),

  formula_version text not null unique,

  name text not null,

  status text not null default 'draft',
  active boolean not null default false,

  description text,

  minimum_attention_score numeric(6, 4) not null default 0.7500,
  minimum_confidence_score numeric(6, 4) not null default 0.6000,
  maximum_fraud_risk_score numeric(6, 4) not null default 0.6500,
  minimum_quality_score numeric(6, 4) not null default 0.6000,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint attention_scoring_formula_versions_status_check
  check (
    status in (
      'draft',
      'active',
      'deprecated',
      'revoked'
    )
  ),

  constraint attention_scoring_formula_versions_score_check
  check (
    minimum_attention_score >= 0 and minimum_attention_score <= 1
    and minimum_confidence_score >= 0 and minimum_confidence_score <= 1
    and maximum_fraud_risk_score >= 0 and maximum_fraud_risk_score <= 1
    and minimum_quality_score >= 0 and minimum_quality_score <= 1
  )
);

create unique index if not exists attention_scoring_formula_one_active_unique
on attention_scoring_formula_versions (active)
where active is true;

create index if not exists attention_scoring_formula_versions_status_idx
on attention_scoring_formula_versions (status, active);

drop trigger if exists attention_scoring_formula_versions_set_updated_at
on attention_scoring_formula_versions;

create trigger attention_scoring_formula_versions_set_updated_at
before update on attention_scoring_formula_versions
for each row
execute function set_updated_at();

create table if not exists attention_model_versions (
  id uuid primary key default gen_random_uuid(),

  model_version text not null unique,

  model_name text not null,
  model_type text not null,

  status text not null default 'draft',

  version_semver text,

  artifact_uri text,
  artifact_hash text,

  offline_capable boolean not null default true,

  description text,

  deployed_at timestamptz,
  deprecated_at timestamptz,
  revoked_at timestamptz,

  revoke_reason text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint attention_model_versions_type_check
  check (
    model_type in (
      'gaze_model',
      'blink_model',
      'liveness_model',
      'quality_model',
      'fusion_model',
      'fraud_model'
    )
  ),

  constraint attention_model_versions_status_check
  check (
    status in (
      'draft',
      'active',
      'deprecated',
      'revoked'
    )
  )
);

create index if not exists attention_model_versions_status_idx
on attention_model_versions (status, deployed_at desc);

create index if not exists attention_model_versions_type_idx
on attention_model_versions (model_type, status);

drop trigger if exists attention_model_versions_set_updated_at
on attention_model_versions;

create trigger attention_model_versions_set_updated_at
before update on attention_model_versions
for each row
execute function set_updated_at();

create table if not exists attention_pipeline_versions (
  id uuid primary key default gen_random_uuid(),

  pipeline_version text not null unique,

  pipeline_name text not null,

  status text not null default 'draft',

  runtime_signal_schema_version text not null references runtime_signal_schema_versions(schema_version),
  scoring_formula_version text not null references attention_scoring_formula_versions(formula_version),

  fraud_formula_version text,

  frame_format text,
  max_frame_edge integer,
  target_processed_fps numeric(6, 3),

  app_platform text,

  description text,

  deployed_at timestamptz,
  deprecated_at timestamptz,
  revoked_at timestamptz,

  revoke_reason text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint attention_pipeline_versions_status_check
  check (
    status in (
      'draft',
      'active',
      'deprecated',
      'revoked'
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
  ),

  constraint attention_pipeline_versions_frame_check
  check (
    max_frame_edge is null
    or max_frame_edge > 0
  ),

  constraint attention_pipeline_versions_fps_check
  check (
    target_processed_fps is null
    or target_processed_fps > 0
  )
);

create index if not exists attention_pipeline_versions_status_idx
on attention_pipeline_versions (status, deployed_at desc);

create index if not exists attention_pipeline_versions_schema_idx
on attention_pipeline_versions (runtime_signal_schema_version);

create index if not exists attention_pipeline_versions_formula_idx
on attention_pipeline_versions (scoring_formula_version);

drop trigger if exists attention_pipeline_versions_set_updated_at
on attention_pipeline_versions;

create trigger attention_pipeline_versions_set_updated_at
before update on attention_pipeline_versions
for each row
execute function set_updated_at();

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
      'gaze',
      'blink',
      'liveness',
      'quality',
      'fusion',
      'fraud'
    )
  ),

  unique (pipeline_version, model_version, role)
);

create index if not exists attention_pipeline_model_links_pipeline_idx
on attention_pipeline_model_links (pipeline_version);

create index if not exists attention_pipeline_model_links_model_idx
on attention_pipeline_model_links (model_version);

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
  where status = 'active'
    and active is true
  order by updated_at desc
  limit 1;

  if v_formula_version is null then
    raise exception 'no active attention scoring formula version found';
  end if;

  return v_formula_version;
end;
$$;

create or replace function assert_attention_runtime_version_allowed(
  p_model_version text,
  p_pipeline_version text,
  p_runtime_signal_schema_version text
)
returns void
language plpgsql
stable
as $$
declare
  v_model attention_model_versions%rowtype;
  v_pipeline attention_pipeline_versions%rowtype;
  v_schema runtime_signal_schema_versions%rowtype;
  v_required_model_count integer;
begin
  if p_model_version is null or length(trim(p_model_version)) = 0 then
    raise exception 'attention model version is required';
  end if;

  if p_pipeline_version is null or length(trim(p_pipeline_version)) = 0 then
    raise exception 'attention pipeline version is required';
  end if;

  if p_runtime_signal_schema_version is null or length(trim(p_runtime_signal_schema_version)) = 0 then
    raise exception 'runtime signal schema version is required';
  end if;

  select *
  into v_model
  from attention_model_versions
  where model_version = p_model_version;

  if v_model.id is null then
    raise exception 'unknown attention model version: %', p_model_version;
  end if;

  if v_model.status <> 'active' then
    raise exception 'attention model version not allowed: % status %',
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

  if v_pipeline.status <> 'active' then
    raise exception 'attention pipeline version not allowed: % status %',
      p_pipeline_version,
      v_pipeline.status;
  end if;

  select *
  into v_schema
  from runtime_signal_schema_versions
  where schema_version = p_runtime_signal_schema_version;

  if v_schema.id is null then
    raise exception 'unknown runtime signal schema version: %',
      p_runtime_signal_schema_version;
  end if;

  if v_schema.status <> 'active' then
    raise exception 'runtime signal schema version not allowed: % status %',
      p_runtime_signal_schema_version,
      v_schema.status;
  end if;

  if v_pipeline.runtime_signal_schema_version <> p_runtime_signal_schema_version then
    raise exception 'pipeline/schema mismatch: pipeline % expects schema %, got %',
      p_pipeline_version,
      v_pipeline.runtime_signal_schema_version,
      p_runtime_signal_schema_version;
  end if;

  select count(*)
  into v_required_model_count
  from attention_pipeline_model_links
  where pipeline_version = p_pipeline_version
    and model_version = p_model_version
    and required is true;

  if v_required_model_count = 0 then
    raise exception 'model version % is not linked as required model for pipeline %',
      p_model_version,
      p_pipeline_version;
  end if;
end;
$$;

create or replace function activate_attention_scoring_formula(
  p_formula_version text,
  p_metadata jsonb default '{}'::jsonb
)
returns text
language plpgsql
as $$
begin
  if p_formula_version is null or length(trim(p_formula_version)) = 0 then
    raise exception 'formula version is required';
  end if;

  if not exists (
    select 1
    from attention_scoring_formula_versions
    where formula_version = p_formula_version
      and status <> 'revoked'
  ) then
    raise exception 'scoring formula not found or revoked: %', p_formula_version;
  end if;

  update attention_scoring_formula_versions
  set
    active = false,
    updated_at = now()
  where active is true;

  update attention_scoring_formula_versions
  set
    status = 'active',
    active = true,
    metadata = metadata || p_metadata,
    updated_at = now()
  where formula_version = p_formula_version;

  return p_formula_version;
end;
$$;

create or replace function revoke_attention_model_version(
  p_model_version text,
  p_reason text,
  p_metadata jsonb default '{}'::jsonb
)
returns text
language plpgsql
as $$
begin
  if p_model_version is null or length(trim(p_model_version)) = 0 then
    raise exception 'model version is required';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'revoke reason is required';
  end if;

  update attention_model_versions
  set
    status = 'revoked',
    revoked_at = now(),
    revoke_reason = p_reason,
    metadata = metadata || p_metadata,
    updated_at = now()
  where model_version = p_model_version;

  if not found then
    raise exception 'model version not found: %', p_model_version;
  end if;

  return p_model_version;
end;
$$;

create or replace function revoke_attention_pipeline_version(
  p_pipeline_version text,
  p_reason text,
  p_metadata jsonb default '{}'::jsonb
)
returns text
language plpgsql
as $$
begin
  if p_pipeline_version is null or length(trim(p_pipeline_version)) = 0 then
    raise exception 'pipeline version is required';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'revoke reason is required';
  end if;

  update attention_pipeline_versions
  set
    status = 'revoked',
    revoked_at = now(),
    revoke_reason = p_reason,
    metadata = metadata || p_metadata,
    updated_at = now()
  where pipeline_version = p_pipeline_version;

  if not found then
    raise exception 'pipeline version not found: %', p_pipeline_version;
  end if;

  return p_pipeline_version;
end;
$$;

create or replace function seed_demo_attention_runtime(
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
begin
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
    array[
      'attentionScore',
      'confidenceScore',
      'fraudRiskScore',
      'qualityScore'
    ],
    array[
      'gazeScore',
      'fixationScore',
      'livenessScore',
      'completionScore',
      'validFrameCount',
      'invalidFrameCount',
      'noFaceFrameCount',
      'gazeInvalidFrameCount'
    ],
    'Demo runtime signal schema for local attention verification.',
    p_metadata || '{"demo": true}'::jsonb
  )
  on conflict (schema_version)
  do update set
    status = 'active',
    required_fields = excluded.required_fields,
    optional_fields = excluded.optional_fields,
    metadata = runtime_signal_schema_versions.metadata || excluded.metadata,
    updated_at = now();

  insert into attention_scoring_formula_versions (
    formula_version,
    name,
    status,
    active,
    description,
    minimum_attention_score,
    minimum_confidence_score,
    maximum_fraud_risk_score,
    minimum_quality_score,
    metadata
  )
  values (
    'attention_score_v1',
    'Attention Score V1',
    'active',
    false,
    'Demo scoring thresholds for attention verification.',
    0.7500,
    0.6000,
    0.6500,
    0.6000,
    p_metadata || '{"demo": true}'::jsonb
  )
  on conflict (formula_version)
  do update set
    status = 'active',
    description = excluded.description,
    minimum_attention_score = excluded.minimum_attention_score,
    minimum_confidence_score = excluded.minimum_confidence_score,
    maximum_fraud_risk_score = excluded.maximum_fraud_risk_score,
    minimum_quality_score = excluded.minimum_quality_score,
    metadata = attention_scoring_formula_versions.metadata || excluded.metadata,
    updated_at = now();

  perform activate_attention_scoring_formula(
    'attention_score_v1',
    p_metadata || '{"demo": true}'::jsonb
  );

  insert into attention_model_versions (
    model_version,
    model_name,
    model_type,
    status,
    version_semver,
    artifact_uri,
    artifact_hash,
    offline_capable,
    description,
    deployed_at,
    metadata
  )
  values (
    'vision_model_v1',
    'Demo Vision Model V1',
    'fusion_model',
    'active',
    '1.0.0',
    null,
    null,
    true,
    'Demo local/offline attention fusion model.',
    now(),
    p_metadata || '{"demo": true, "offline_capable": true}'::jsonb
  )
  on conflict (model_version)
  do update set
    status = 'active',
    deployed_at = coalesce(attention_model_versions.deployed_at, now()),
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
    deployed_at,
    metadata
  )
  values (
    'runtime_pipeline_v1',
    'Demo Runtime Pipeline V1',
    'active',
    'runtime_signals_v1',
    'attention_score_v1',
    'attention_fraud_v1',
    'runtime_summary',
    320,
    10.000,
    'android',
    'Demo runtime pipeline for local/offline attention verification.',
    now(),
    p_metadata || '{"demo": true}'::jsonb
  )
  on conflict (pipeline_version)
  do update set
    status = 'active',
    runtime_signal_schema_version = excluded.runtime_signal_schema_version,
    scoring_formula_version = excluded.scoring_formula_version,
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
    'runtime_pipeline_v1',
    'vision_model_v1',
    'fusion',
    true,
    p_metadata || '{"demo": true}'::jsonb
  )
  on conflict (pipeline_version, model_version, role)
  do update set
    required = true,
    metadata = attention_pipeline_model_links.metadata || excluded.metadata;

  return jsonb_build_object(
    'model_version', 'vision_model_v1',
    'pipeline_version', 'runtime_pipeline_v1',
    'runtime_signal_schema_version', 'runtime_signals_v1',
    'scoring_formula_version', 'attention_score_v1'
  );
end;
$$;

create or replace view attention_runtime_dashboard as
select
  pv.pipeline_version,
  pv.pipeline_name,
  pv.status as pipeline_status,
  pv.app_platform,
  pv.runtime_signal_schema_version,
  rsv.status as schema_status,
  pv.scoring_formula_version,
  sfv.status as scoring_formula_status,
  sfv.active as scoring_formula_active,
  pml.model_version,
  mv.model_name,
  mv.model_type,
  mv.status as model_status,
  pml.role as model_role,
  pml.required,
  pv.deployed_at as pipeline_deployed_at,
  mv.deployed_at as model_deployed_at
from attention_pipeline_versions pv
join runtime_signal_schema_versions rsv
  on rsv.schema_version = pv.runtime_signal_schema_version
join attention_scoring_formula_versions sfv
  on sfv.formula_version = pv.scoring_formula_version
left join attention_pipeline_model_links pml
  on pml.pipeline_version = pv.pipeline_version
left join attention_model_versions mv
  on mv.model_version = pml.model_version;

create or replace view attention_runtime_integrity_check as
select
  pv.pipeline_version,
  pv.status as pipeline_status,
  pv.runtime_signal_schema_version,
  rsv.status as schema_status,
  pv.scoring_formula_version,
  sfv.status as scoring_formula_status,

  count(pml.id) filter (where pml.required is true) as required_model_count,

  count(pml.id) filter (
    where pml.required is true
      and mv.status = 'active'
  ) as active_required_model_count,

  case
    when pv.status = 'active'
      and rsv.status <> 'active'
    then true

    when pv.status = 'active'
      and sfv.status <> 'active'
    then true

    when pv.status = 'active'
      and count(pml.id) filter (where pml.required is true) = 0
    then true

    when pv.status = 'active'
      and count(pml.id) filter (
        where pml.required is true
          and mv.status = 'active'
      ) = 0
    then true

    else false
  end as has_integrity_issue

from attention_pipeline_versions pv
left join runtime_signal_schema_versions rsv
  on rsv.schema_version = pv.runtime_signal_schema_version
left join attention_scoring_formula_versions sfv
  on sfv.formula_version = pv.scoring_formula_version
left join attention_pipeline_model_links pml
  on pml.pipeline_version = pv.pipeline_version
left join attention_model_versions mv
  on mv.model_version = pml.model_version
group by
  pv.pipeline_version,
  pv.status,
  pv.runtime_signal_schema_version,
  rsv.status,
  pv.scoring_formula_version,
  sfv.status;
