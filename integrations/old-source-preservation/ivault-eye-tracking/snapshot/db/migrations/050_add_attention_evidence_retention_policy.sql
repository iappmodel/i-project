-- 50/post-MVP schema — attention evidence retention policy, legal holds,
-- artifact registry, and retention processing.

create table if not exists attention_evidence_policies (
  id uuid primary key default gen_random_uuid(),

  policy_name text not null unique,
  policy_version text not null,

  evidence_level text not null default 'summary',

  retain_attention_events_days integer not null default 730,
  retain_frame_summaries_days integer not null default 90,
  retain_fraud_signals_days integer not null default 730,
  retain_runtime_metadata_days integer not null default 180,

  retain_raw_evidence_days integer,
  allow_raw_evidence boolean not null default false,

  auto_delete_enabled boolean not null default true,

  active boolean not null default false,

  legal_hold_exempt boolean not null default true,

  description text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint attention_evidence_policies_level_check
  check (
    evidence_level in (
      'none',
      'summary',
      'forensic',
      'legal_hold'
    )
  ),

  constraint attention_evidence_policies_retention_check
  check (
    retain_attention_events_days >= 0
    and retain_frame_summaries_days >= 0
    and retain_fraud_signals_days >= 0
    and retain_runtime_metadata_days >= 0
    and (
      retain_raw_evidence_days is null
      or retain_raw_evidence_days >= 0
    )
  )
);

create index if not exists attention_evidence_policies_active_idx
on attention_evidence_policies (active, created_at desc);

insert into attention_evidence_policies (
  policy_name,
  policy_version,
  evidence_level,
  retain_attention_events_days,
  retain_frame_summaries_days,
  retain_fraud_signals_days,
  retain_runtime_metadata_days,
  retain_raw_evidence_days,
  allow_raw_evidence,
  auto_delete_enabled,
  active,
  description,
  metadata
)
values (
  'default_attention_retention',
  'attention_retention_v1',
  'summary',
  730,
  90,
  730,
  180,
  null,
  false,
  true,
  true,
  'Default retention policy: keep canonical attention events and fraud signals, expire frame summaries earlier, no raw evidence by default.',
  '{
    "raw_camera_frames": "not_stored_by_default",
    "privacy_position": "scores_and_aggregates_only",
    "legal_hold_supported": true
  }'::jsonb
)
on conflict (policy_name)
do update set
  active = excluded.active,
  policy_version = excluded.policy_version,
  metadata = attention_evidence_policies.metadata || excluded.metadata,
  updated_at = now();

create table if not exists attention_evidence_legal_holds (
  id uuid primary key default gen_random_uuid(),

  attention_session_id uuid references attention_verification_sessions(id),
  attention_event_id uuid references attention_verification_events(id),

  user_id uuid,
  wallet_id uuid references wallets(id),
  campaign_id uuid,

  hold_reason text not null,
  hold_type text not null default 'fraud_review',

  status text not null default 'active',

  placed_by_admin_id uuid,
  released_by_admin_id uuid,

  placed_at timestamptz not null default now(),
  released_at timestamptz,

  expires_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  constraint attention_evidence_legal_holds_type_check
  check (
    hold_type in (
      'fraud_review',
      'user_dispute',
      'legal_request',
      'regulatory',
      'security_incident',
      'manual_admin'
    )
  ),

  constraint attention_evidence_legal_holds_status_check
  check (
    status in (
      'active',
      'released',
      'expired'
    )
  )
);

create index if not exists attention_evidence_legal_holds_event_idx
on attention_evidence_legal_holds (attention_event_id, status);

create index if not exists attention_evidence_legal_holds_session_idx
on attention_evidence_legal_holds (attention_session_id, status);

create index if not exists attention_evidence_legal_holds_wallet_idx
on attention_evidence_legal_holds (wallet_id, status, placed_at desc);

create index if not exists attention_evidence_legal_holds_status_idx
on attention_evidence_legal_holds (status, expires_at);

create table if not exists attention_evidence_artifacts (
  id uuid primary key default gen_random_uuid(),

  attention_session_id uuid references attention_verification_sessions(id),
  attention_event_id uuid references attention_verification_events(id),

  user_id uuid,
  wallet_id uuid references wallets(id),
  campaign_id uuid,

  artifact_type text not null,
  evidence_level text not null default 'forensic',

  storage_uri text,
  storage_provider text,

  content_hash text,
  encryption_key_id text,

  size_bytes bigint,

  status text not null default 'active',

  retain_until timestamptz,
  deleted_at timestamptz,

  legal_hold_id uuid references attention_evidence_legal_holds(id),

  created_by text not null default 'system',

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint attention_evidence_artifacts_type_check
  check (
    artifact_type in (
      'frame_summary_bundle',
      'detector_trace',
      'forensic_packet',
      'raw_frame_sample',
      'review_export',
      'legal_export'
    )
  ),

  constraint attention_evidence_artifacts_level_check
  check (
    evidence_level in (
      'summary',
      'forensic',
      'legal_hold'
    )
  ),

  constraint attention_evidence_artifacts_status_check
  check (
    status in (
      'active',
      'deleted',
      'legal_hold',
      'expired',
      'quarantined'
    )
  )
);

create index if not exists attention_evidence_artifacts_event_idx
on attention_evidence_artifacts (attention_event_id, status);

create index if not exists attention_evidence_artifacts_wallet_idx
on attention_evidence_artifacts (wallet_id, status, created_at desc);

create index if not exists attention_evidence_artifacts_retention_idx
on attention_evidence_artifacts (status, retain_until);

create table if not exists attention_evidence_retention_runs (
  id uuid primary key default gen_random_uuid(),

  run_type text not null default 'scheduled',
  status text not null default 'processing',

  policy_id uuid references attention_evidence_policies(id),
  policy_version text,

  scanned_event_count integer not null default 0,
  expired_frame_summary_count integer not null default 0,
  expired_artifact_count integer not null default 0,
  skipped_legal_hold_count integer not null default 0,

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,

  failure_reason text,

  metadata jsonb not null default '{}'::jsonb,

  constraint attention_evidence_retention_runs_status_check
  check (
    status in (
      'processing',
      'completed',
      'failed'
    )
  )
);

create index if not exists attention_evidence_retention_runs_started_idx
on attention_evidence_retention_runs (started_at desc);

create or replace function get_active_attention_evidence_policy()
returns attention_evidence_policies
language plpgsql
stable
as $$
declare
  v_policy attention_evidence_policies%rowtype;
begin
  select *
  into v_policy
  from attention_evidence_policies
  where active is true
  order by created_at desc
  limit 1;

  if v_policy.id is null then
    raise exception 'no active attention evidence policy';
  end if;

  return v_policy;
end;
$$;

create or replace function attention_evidence_has_active_legal_hold(
  p_attention_session_id uuid default null,
  p_attention_event_id uuid default null
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from attention_evidence_legal_holds h
    where h.status = 'active'
      and (
        (
          p_attention_event_id is not null
          and h.attention_event_id = p_attention_event_id
        )
        or (
          p_attention_session_id is not null
          and h.attention_session_id = p_attention_session_id
        )
      )
      and (
        h.expires_at is null
        or h.expires_at > now()
      )
  );
$$;

create or replace function place_attention_evidence_legal_hold(
  p_attention_event_id uuid,
  p_hold_reason text,
  p_hold_type text default 'fraud_review',
  p_admin_user_id uuid default null,
  p_expires_at timestamptz default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_event attention_verification_events%rowtype;
  v_hold_id uuid;
begin
  if p_attention_event_id is null then
    raise exception 'attention event id is required';
  end if;

  if p_hold_reason is null or length(trim(p_hold_reason)) = 0 then
    raise exception 'hold reason is required';
  end if;

  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'legal hold expiry must be in the future';
  end if;

  select *
  into v_event
  from attention_verification_events
  where id = p_attention_event_id;

  if v_event.id is null then
    raise exception 'attention event not found: %', p_attention_event_id;
  end if;

  insert into attention_evidence_legal_holds (
    attention_session_id,
    attention_event_id,
    user_id,
    wallet_id,
    campaign_id,
    hold_reason,
    hold_type,
    status,
    placed_by_admin_id,
    expires_at,
    metadata
  )
  values (
    v_event.attention_session_id,
    v_event.id,
    v_event.user_id,
    v_event.wallet_id,
    v_event.campaign_id,
    p_hold_reason,
    p_hold_type,
    'active',
    p_admin_user_id,
    p_expires_at,
    p_metadata
  )
  returning id into v_hold_id;

  update attention_evidence_artifacts
  set
    status = 'legal_hold',
    legal_hold_id = v_hold_id,
    metadata = metadata || jsonb_build_object(
      'legal_hold_id',
      v_hold_id,
      'legal_hold_reason',
      p_hold_reason
    )
  where attention_event_id = v_event.id
    and status = 'active';

  return v_hold_id;
end;
$$;

create or replace function release_attention_evidence_legal_hold(
  p_legal_hold_id uuid,
  p_admin_user_id uuid,
  p_reason text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  if p_legal_hold_id is null then
    raise exception 'legal hold id is required';
  end if;

  if p_admin_user_id is null then
    raise exception 'admin user id is required';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'release reason is required';
  end if;

  update attention_evidence_legal_holds
  set
    status = 'released',
    released_by_admin_id = p_admin_user_id,
    released_at = now(),
    metadata = metadata || p_metadata || jsonb_build_object(
      'release_reason',
      p_reason
    )
  where id = p_legal_hold_id
    and status = 'active';

  if not found then
    raise exception 'active legal hold not found: %', p_legal_hold_id;
  end if;

  update attention_evidence_artifacts
  set
    status = 'active',
    metadata = metadata || jsonb_build_object(
      'legal_hold_released_at',
      now(),
      'legal_hold_release_reason',
      p_reason
    )
  where legal_hold_id = p_legal_hold_id
    and status = 'legal_hold';

  return p_legal_hold_id;
end;
$$;

create or replace function register_attention_evidence_artifact(
  p_attention_event_id uuid,
  p_artifact_type text,
  p_evidence_level text,
  p_storage_uri text default null,
  p_storage_provider text default null,
  p_content_hash text default null,
  p_encryption_key_id text default null,
  p_size_bytes bigint default null,
  p_retain_until timestamptz default null,
  p_created_by text default 'system',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_event attention_verification_events%rowtype;
  v_policy attention_evidence_policies%rowtype;
  v_artifact_id uuid;
  v_retain_until timestamptz;
begin
  if p_attention_event_id is null then
    raise exception 'attention event id is required';
  end if;

  select *
  into v_event
  from attention_verification_events
  where id = p_attention_event_id;

  if v_event.id is null then
    raise exception 'attention event not found: %', p_attention_event_id;
  end if;

  v_policy := get_active_attention_evidence_policy();

  if p_artifact_type = 'raw_frame_sample'
    and v_policy.allow_raw_evidence is false then
    raise exception 'raw evidence is not allowed by active policy %',
      v_policy.policy_name;
  end if;

  v_retain_until :=
    coalesce(
      p_retain_until,
      case
        when p_evidence_level = 'summary'
        then now() + make_interval(days => v_policy.retain_frame_summaries_days)
        when p_evidence_level = 'forensic'
        then now() + make_interval(days => v_policy.retain_runtime_metadata_days)
        when p_evidence_level = 'legal_hold'
        then null
        else now() + interval '90 days'
      end
    );

  insert into attention_evidence_artifacts (
    attention_session_id,
    attention_event_id,
    user_id,
    wallet_id,
    campaign_id,
    artifact_type,
    evidence_level,
    storage_uri,
    storage_provider,
    content_hash,
    encryption_key_id,
    size_bytes,
    status,
    retain_until,
    created_by,
    metadata
  )
  values (
    v_event.attention_session_id,
    v_event.id,
    v_event.user_id,
    v_event.wallet_id,
    v_event.campaign_id,
    p_artifact_type,
    p_evidence_level,
    p_storage_uri,
    p_storage_provider,
    p_content_hash,
    p_encryption_key_id,
    p_size_bytes,
    case
      when attention_evidence_has_active_legal_hold(
        v_event.attention_session_id,
        v_event.id
      )
      then 'legal_hold'
      else 'active'
    end,
    v_retain_until,
    p_created_by,
    p_metadata || jsonb_build_object(
      'policy_id',
      v_policy.id,
      'policy_version',
      v_policy.policy_version
    )
  )
  returning id into v_artifact_id;

  return v_artifact_id;
end;
$$;

create or replace function run_attention_evidence_retention_job(
  p_batch_size integer default 500,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid;
  v_policy attention_evidence_policies%rowtype;

  v_expired_frame_summary_count integer := 0;
  v_expired_artifact_count integer := 0;
  v_skipped_legal_hold_count integer := 0;
begin
  if p_batch_size <= 0 then
    raise exception 'batch size must be positive';
  end if;

  v_policy := get_active_attention_evidence_policy();

  insert into attention_evidence_retention_runs (
    run_type,
    status,
    policy_id,
    policy_version,
    metadata
  )
  values (
    'scheduled',
    'processing',
    v_policy.id,
    v_policy.policy_version,
    p_metadata
  )
  returning id into v_run_id;

  if v_policy.auto_delete_enabled is false then
    update attention_evidence_retention_runs
    set
      status = 'completed',
      completed_at = now(),
      metadata = metadata || jsonb_build_object(
        'auto_delete_enabled',
        false
      )
    where id = v_run_id;

    return v_run_id;
  end if;

  with expired_frame_summaries as (
    select fs.id
    from attention_frame_summaries fs
    where fs.created_at < now() - make_interval(days => v_policy.retain_frame_summaries_days)
      and not attention_evidence_has_active_legal_hold(
        fs.attention_session_id,
        null
      )
    order by fs.created_at asc
    limit p_batch_size
  ),
  deleted as (
    delete from attention_frame_summaries fs
    using expired_frame_summaries efs
    where fs.id = efs.id
    returning fs.id
  )
  select count(*)
  into v_expired_frame_summary_count
  from deleted;

  update attention_evidence_artifacts a
  set
    status = 'expired',
    deleted_at = now(),
    metadata = metadata || p_metadata || jsonb_build_object(
      'expired_by_retention_run_id',
      v_run_id
    )
  where a.status = 'active'
    and a.retain_until is not null
    and a.retain_until <= now()
    and not attention_evidence_has_active_legal_hold(
      a.attention_session_id,
      a.attention_event_id
    )
    and a.id in (
      select id
      from attention_evidence_artifacts
      where status = 'active'
        and retain_until is not null
        and retain_until <= now()
      order by retain_until asc
      limit p_batch_size
    );

  get diagnostics v_expired_artifact_count = row_count;

  select count(*)
  into v_skipped_legal_hold_count
  from attention_evidence_artifacts a
  where a.retain_until is not null
    and a.retain_until <= now()
    and attention_evidence_has_active_legal_hold(
      a.attention_session_id,
      a.attention_event_id
    );

  update attention_evidence_retention_runs
  set
    status = 'completed',
    completed_at = now(),
    expired_frame_summary_count = v_expired_frame_summary_count,
    expired_artifact_count = v_expired_artifact_count,
    skipped_legal_hold_count = v_skipped_legal_hold_count
  where id = v_run_id;

  return v_run_id;

exception
  when others then
    if v_run_id is not null then
      update attention_evidence_retention_runs
      set
        status = 'failed',
        failed_at = now(),
        failure_reason = sqlerrm
      where id = v_run_id;
    end if;

    raise;
end;
$$;

create or replace view attention_evidence_dashboard as
select
  e.id as attention_event_id,
  e.attention_session_id,
  e.user_id,
  e.wallet_id,
  e.campaign_id,
  e.decision,
  e.reward_eligible,
  e.reward_issued,
  e.model_version,
  e.pipeline_version,
  e.scoring_formula_version,
  e.occurred_at,

  count(a.id) as artifact_count,
  count(a.id) filter (where a.status = 'active') as active_artifact_count,
  count(a.id) filter (where a.status = 'legal_hold') as legal_hold_artifact_count,
  count(a.id) filter (where a.status in ('expired', 'deleted')) as expired_artifact_count,

  exists (
    select 1
    from attention_evidence_legal_holds h
    where h.attention_event_id = e.id
      and h.status = 'active'
      and (
        h.expires_at is null
        or h.expires_at > now()
      )
  ) as has_active_legal_hold,

  jsonb_agg(
    jsonb_build_object(
      'artifact_id', a.id,
      'artifact_type', a.artifact_type,
      'evidence_level', a.evidence_level,
      'status', a.status,
      'storage_provider', a.storage_provider,
      'storage_uri', a.storage_uri,
      'content_hash', a.content_hash,
      'size_bytes', a.size_bytes,
      'retain_until', a.retain_until,
      'created_at', a.created_at
    )
    order by a.created_at desc
  ) filter (where a.id is not null) as artifacts

from attention_verification_events e
left join attention_evidence_artifacts a
  on a.attention_event_id = e.id
group by e.id;
