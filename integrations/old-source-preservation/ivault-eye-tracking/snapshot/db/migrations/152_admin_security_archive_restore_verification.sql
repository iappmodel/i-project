-- Step 9.37 — Build restore / verification testing for archived security records.
-- Runs after 151_admin_security_archive_export_worker.sql.

create table if not exists admin_security_archive_verification_jobs (
  id uuid primary key default gen_random_uuid(),
  archive_manifest_id uuid not null references admin_security_archive_manifests(id) on delete cascade,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  max_attempts integer not null default 5,
  next_attempt_at timestamptz not null default now(),
  claimed_by_worker_id text,
  claimed_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  storage_uri text,
  expected_checksum_sha256 text,
  actual_checksum_sha256 text,
  expected_record_count bigint not null default 0,
  actual_record_count bigint,
  checksum_match boolean,
  record_count_match boolean,
  payload_parse_ok boolean not null default false,
  verification_summary text,
  last_error text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (archive_manifest_id),
  constraint admin_security_archive_verification_jobs_status_check
  check (
    status in (
      'pending',
      'claimed',
      'running',
      'passed',
      'failed',
      'abandoned'
    )
  )
);

create index if not exists admin_security_archive_verification_jobs_status_idx
on admin_security_archive_verification_jobs (status, next_attempt_at asc);

create index if not exists admin_security_archive_verification_jobs_manifest_idx
on admin_security_archive_verification_jobs (archive_manifest_id);

drop trigger if exists admin_security_archive_verification_jobs_set_updated_at
on admin_security_archive_verification_jobs;

create trigger admin_security_archive_verification_jobs_set_updated_at
before update on admin_security_archive_verification_jobs
for each row
execute function set_updated_at();

create or replace function enqueue_admin_security_archive_verification_job(
  p_archive_manifest_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_manifest admin_security_archive_manifests%rowtype;
  v_job_id uuid;
begin
  if p_archive_manifest_id is null then
    raise exception 'archive manifest id is required';
  end if;

  select *
  into v_manifest
  from admin_security_archive_manifests
  where id = p_archive_manifest_id;

  if v_manifest.id is null then
    raise exception 'admin security archive manifest not found: %', p_archive_manifest_id;
  end if;

  if v_manifest.status not in ('sealed', 'verified') then
    raise exception 'archive manifest must be sealed before verification';
  end if;

  if v_manifest.storage_uri is null or length(trim(v_manifest.storage_uri)) = 0 then
    raise exception 'archive manifest storage uri is required';
  end if;

  if v_manifest.checksum_sha256 is null or length(trim(v_manifest.checksum_sha256)) = 0 then
    raise exception 'archive manifest checksum is required';
  end if;

  insert into admin_security_archive_verification_jobs (
    archive_manifest_id,
    status,
    next_attempt_at,
    storage_uri,
    expected_checksum_sha256,
    expected_record_count,
    request_id,
    metadata
  )
  values (
    p_archive_manifest_id,
    'pending',
    now(),
    v_manifest.storage_uri,
    v_manifest.checksum_sha256,
    v_manifest.record_count,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (archive_manifest_id)
  do update set
    status =
      case
        when admin_security_archive_verification_jobs.status in ('running', 'claimed')
        then admin_security_archive_verification_jobs.status
        else 'pending'
      end,
    next_attempt_at = now(),
    storage_uri = excluded.storage_uri,
    expected_checksum_sha256 = excluded.expected_checksum_sha256,
    expected_record_count = excluded.expected_record_count,
    metadata = admin_security_archive_verification_jobs.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_job_id;

  return v_job_id;
end;
$$;

create or replace function enqueue_pending_admin_security_archive_verifications(
  p_batch_size integer default 100,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_manifest record;
begin
  if p_batch_size <= 0 or p_batch_size > 1000 then
    raise exception 'batch size must be between 1 and 1000';
  end if;

  for v_manifest in
    select m.*
    from admin_security_archive_manifests m
    where m.status = 'sealed'
      and m.storage_uri is not null
      and m.checksum_sha256 is not null
      and not exists (
        select 1
        from admin_security_archive_verification_jobs j
        where j.archive_manifest_id = m.id
          and j.status in ('pending', 'claimed', 'running', 'passed')
      )
    order by m.sealed_at asc nulls last, m.created_at asc
    limit p_batch_size
  loop
    perform enqueue_admin_security_archive_verification_job(
      v_manifest.id,
      null,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'run_id',
        v_run_id,
        'source',
        'enqueue_pending_admin_security_archive_verifications'
      )
    );
  end loop;

  return v_run_id;
end;
$$;

create or replace function claim_admin_security_archive_verification_jobs(
  p_batch_size integer default 10,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  job_id uuid,
  archive_manifest_id uuid,
  archive_key text,
  source_type text,
  period_start timestamptz,
  period_end timestamptz,
  storage_uri text,
  expected_checksum_sha256 text,
  expected_record_count bigint
)
language plpgsql
as $$
begin
  if p_batch_size <= 0 or p_batch_size > 50 then
    raise exception 'batch size must be between 1 and 50';
  end if;

  return query
  with claimed as (
    select j.id
    from admin_security_archive_verification_jobs j
    where j.status in ('pending', 'failed')
      and j.next_attempt_at <= now()
      and j.attempt_count < j.max_attempts
    order by j.next_attempt_at asc, j.created_at asc
    limit p_batch_size
    for update skip locked
  ),
  updated as (
    update admin_security_archive_verification_jobs j
    set
      status = 'claimed',
      attempt_count = j.attempt_count + 1,
      claimed_by_worker_id = p_worker_id,
      claimed_at = now(),
      metadata = j.metadata || coalesce(p_metadata, '{}'::jsonb),
      updated_at = now()
    from claimed
    where j.id = claimed.id
    returning j.*
  )
  select
    u.id as job_id,
    m.id as archive_manifest_id,
    m.archive_key,
    m.source_type,
    m.period_start,
    m.period_end,
    u.storage_uri,
    u.expected_checksum_sha256,
    u.expected_record_count
  from updated u
  join admin_security_archive_manifests m
    on m.id = u.archive_manifest_id;
end;
$$;

create or replace function mark_admin_security_archive_verification_running(
  p_job_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  if p_job_id is null then
    raise exception 'archive verification job id is required';
  end if;

  update admin_security_archive_verification_jobs
  set
    status = 'running',
    started_at = coalesce(started_at, now()),
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = p_job_id
    and status in ('claimed', 'pending', 'failed');

  if not found then
    raise exception 'archive verification job not found or not runnable: %', p_job_id;
  end if;

  return p_job_id;
end;
$$;

create or replace function complete_admin_security_archive_verification_job(
  p_job_id uuid,
  p_actual_checksum_sha256 text,
  p_actual_record_count bigint,
  p_payload_parse_ok boolean,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_job admin_security_archive_verification_jobs%rowtype;
  v_checksum_match boolean;
  v_record_count_match boolean;
  v_summary text;
begin
  if p_job_id is null then
    raise exception 'archive verification job id is required';
  end if;

  if p_actual_checksum_sha256 is null or length(trim(p_actual_checksum_sha256)) = 0 then
    raise exception 'actual archive checksum is required';
  end if;

  select *
  into v_job
  from admin_security_archive_verification_jobs
  where id = p_job_id
  for update;

  if v_job.id is null then
    raise exception 'archive verification job not found: %', p_job_id;
  end if;

  v_checksum_match := v_job.expected_checksum_sha256 = p_actual_checksum_sha256;
  v_record_count_match := coalesce(v_job.expected_record_count, 0) = coalesce(p_actual_record_count, -1);

  v_summary :=
    'checksum_match=' || v_checksum_match::text ||
    ', record_count_match=' || v_record_count_match::text ||
    ', payload_parse_ok=' || coalesce(p_payload_parse_ok, false)::text;

  if v_checksum_match and v_record_count_match and coalesce(p_payload_parse_ok, false) then
    update admin_security_archive_verification_jobs
    set
      status = 'passed',
      completed_at = now(),
      actual_checksum_sha256 = p_actual_checksum_sha256,
      actual_record_count = p_actual_record_count,
      checksum_match = true,
      record_count_match = true,
      payload_parse_ok = true,
      verification_summary = v_summary,
      metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
      updated_at = now()
    where id = p_job_id;

    update admin_security_archive_manifests
    set
      status = 'verified',
      verified_at = now(),
      metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'verified_by_archive_verification_job_id',
        p_job_id,
        'verification_summary',
        v_summary
      ),
      updated_at = now()
    where id = v_job.archive_manifest_id;

    perform hash_admin_security_archive_manifest(
      v_job.archive_manifest_id,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'source',
        'complete_admin_security_archive_verification_job'
      )
    );
  else
    update admin_security_archive_verification_jobs
    set
      status = 'failed',
      failed_at = now(),
      actual_checksum_sha256 = p_actual_checksum_sha256,
      actual_record_count = p_actual_record_count,
      checksum_match = v_checksum_match,
      record_count_match = v_record_count_match,
      payload_parse_ok = coalesce(p_payload_parse_ok, false),
      verification_summary = v_summary,
      last_error = 'archive verification failed: ' || v_summary,
      next_attempt_at = now() + interval '15 minutes',
      metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
      updated_at = now()
    where id = p_job_id;

    perform create_admin_security_alert(
      'admin_security_archive_verification_failed',
      'critical',
      null,
      null,
      'complete_admin_security_archive_verification_job',
      null,
      'Security archive verification failed.',
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'archive_manifest_id',
        v_job.archive_manifest_id,
        'archive_verification_job_id',
        p_job_id,
        'verification_summary',
        v_summary
      )
    );
  end if;

  return v_job.archive_manifest_id;
end;
$$;

create or replace function fail_admin_security_archive_verification_job(
  p_job_id uuid,
  p_error text,
  p_retry_seconds integer default 900,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_job admin_security_archive_verification_jobs%rowtype;
begin
  if p_job_id is null then
    raise exception 'archive verification job id is required';
  end if;

  if p_error is null or length(trim(p_error)) = 0 then
    raise exception 'archive verification error is required';
  end if;

  select *
  into v_job
  from admin_security_archive_verification_jobs
  where id = p_job_id
  for update;

  if v_job.id is null then
    raise exception 'archive verification job not found: %', p_job_id;
  end if;

  if v_job.attempt_count >= v_job.max_attempts then
    update admin_security_archive_verification_jobs
    set
      status = 'abandoned',
      failed_at = now(),
      last_error = p_error,
      metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'abandoned_at',
        now()
      ),
      updated_at = now()
    where id = p_job_id;

    perform create_admin_security_alert(
      'admin_security_archive_verification_abandoned',
      'critical',
      null,
      null,
      'fail_admin_security_archive_verification_job',
      null,
      'Security archive verification job was abandoned after max attempts.',
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'archive_manifest_id',
        v_job.archive_manifest_id,
        'archive_verification_job_id',
        p_job_id,
        'error',
        p_error
      )
    );
  else
    update admin_security_archive_verification_jobs
    set
      status = 'failed',
      failed_at = now(),
      last_error = p_error,
      next_attempt_at = now() + make_interval(secs => greatest(p_retry_seconds, 60)),
      metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
      updated_at = now()
    where id = p_job_id;
  end if;

  return p_job_id;
end;
$$;

create or replace view admin_security_archive_verification_job_dashboard as
select
  j.id as admin_security_archive_verification_job_id,
  j.archive_manifest_id,
  m.archive_key,
  m.source_type,
  m.period_start,
  m.period_end,
  j.status,
  j.attempt_count,
  j.max_attempts,
  j.next_attempt_at,
  j.claimed_by_worker_id,
  j.claimed_at,
  j.started_at,
  j.completed_at,
  j.failed_at,
  j.storage_uri,
  j.expected_checksum_sha256,
  j.actual_checksum_sha256,
  j.expected_record_count,
  j.actual_record_count,
  j.checksum_match,
  j.record_count_match,
  j.payload_parse_ok,
  j.verification_summary,
  j.last_error,
  j.created_at,
  j.updated_at,
  j.metadata
from admin_security_archive_verification_jobs j
join admin_security_archive_manifests m
  on m.id = j.archive_manifest_id
order by j.created_at desc;

create or replace view admin_security_archive_verification_integrity as
select
  (
    select count(*)
    from admin_security_archive_verification_jobs
    where status = 'pending'
  ) as pending_verification_job_count,
  (
    select count(*)
    from admin_security_archive_verification_jobs
    where status in ('claimed', 'running')
  ) as active_verification_job_count,
  (
    select count(*)
    from admin_security_archive_verification_jobs
    where status = 'failed'
  ) as failed_verification_job_count,
  (
    select count(*)
    from admin_security_archive_verification_jobs
    where status = 'abandoned'
  ) as abandoned_verification_job_count,
  (
    select count(*)
    from admin_security_archive_verification_jobs
    where status = 'passed'
      and completed_at >= now() - interval '24 hours'
  ) as passed_verification_job_count_24h,
  (
    select count(*)
    from admin_security_archive_manifests m
    where m.status = 'sealed'
      and not exists (
        select 1
        from admin_security_archive_verification_jobs j
        where j.archive_manifest_id = m.id
          and j.status in ('pending', 'claimed', 'running', 'passed')
      )
  ) as sealed_manifest_without_verification_job_count,
  now() as checked_at;

grant select on admin_security_archive_verification_job_dashboard to admin_api_role;
grant select on admin_security_archive_verification_integrity to admin_api_role, worker_role;

alter table admin_security_archive_verification_jobs enable row level security;

drop policy if exists admin_security_archive_verification_jobs_no_user_direct_access
on admin_security_archive_verification_jobs;
create policy admin_security_archive_verification_jobs_no_user_direct_access
on admin_security_archive_verification_jobs
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_api_read_admin_security_archive_verification_jobs
on admin_security_archive_verification_jobs;
create policy admin_api_read_admin_security_archive_verification_jobs
on admin_security_archive_verification_jobs
for select
to admin_api_role
using (true);

drop policy if exists worker_all_admin_security_archive_verification_jobs
on admin_security_archive_verification_jobs;
create policy worker_all_admin_security_archive_verification_jobs
on admin_security_archive_verification_jobs
for all
to worker_role
using (true)
with check (true);

grant execute on function enqueue_admin_security_archive_verification_job(uuid, text, jsonb)
to admin_api_role, worker_role;
grant execute on function enqueue_pending_admin_security_archive_verifications(integer, jsonb)
to worker_role;
grant execute on function claim_admin_security_archive_verification_jobs(integer, text, jsonb)
to worker_role;
grant execute on function mark_admin_security_archive_verification_running(uuid, jsonb)
to worker_role;
grant execute on function complete_admin_security_archive_verification_job(uuid, text, bigint, boolean, jsonb)
to worker_role;
grant execute on function fail_admin_security_archive_verification_job(uuid, text, integer, jsonb)
to worker_role;

alter function enqueue_admin_security_archive_verification_job(uuid, text, jsonb) security definer;
alter function enqueue_admin_security_archive_verification_job(uuid, text, jsonb) set search_path = public;

alter function enqueue_pending_admin_security_archive_verifications(integer, jsonb) security definer;
alter function enqueue_pending_admin_security_archive_verifications(integer, jsonb) set search_path = public;

alter function claim_admin_security_archive_verification_jobs(integer, text, jsonb) security definer;
alter function claim_admin_security_archive_verification_jobs(integer, text, jsonb) set search_path = public;

alter function mark_admin_security_archive_verification_running(uuid, jsonb) security definer;
alter function mark_admin_security_archive_verification_running(uuid, jsonb) set search_path = public;

alter function complete_admin_security_archive_verification_job(uuid, text, bigint, boolean, jsonb) security definer;
alter function complete_admin_security_archive_verification_job(uuid, text, bigint, boolean, jsonb) set search_path = public;

alter function fail_admin_security_archive_verification_job(uuid, text, integer, jsonb) security definer;
alter function fail_admin_security_archive_verification_job(uuid, text, integer, jsonb) set search_path = public;

insert into scheduled_jobs (
  job_key,
  job_name,
  job_group,
  enabled,
  schedule_cron,
  function_name,
  function_args,
  max_runtime_seconds,
  lock_ttl_seconds,
  metadata
)
values (
  'admin_security_archive_verifications_enqueue_hourly',
  'Enqueue admin security archive verifications',
  'admin',
  true,
  '27 * * * *',
  'enqueue_pending_admin_security_archive_verifications',
  '{"batch_size": 100}'::jsonb,
  180,
  300,
  '{"priority":"medium"}'::jsonb
)
on conflict (job_key)
do update set
  enabled = excluded.enabled,
  schedule_cron = excluded.schedule_cron,
  function_name = excluded.function_name,
  function_args = excluded.function_args,
  max_runtime_seconds = excluded.max_runtime_seconds,
  lock_ttl_seconds = excluded.lock_ttl_seconds,
  metadata = scheduled_jobs.metadata || excluded.metadata,
  updated_at = now();

create or replace function run_scheduled_job(
  p_job_key text,
  p_locked_by text default 'scheduler',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_job scheduled_jobs%rowtype;
  v_run_id uuid;
  v_lock_acquired boolean;
  v_started_at timestamptz;
  v_uuid_result uuid;
  v_result jsonb := '{}'::jsonb;
begin
  if p_job_key is null or length(trim(p_job_key)) = 0 then
    raise exception 'job key is required';
  end if;

  select *
  into v_job
  from scheduled_jobs
  where job_key = p_job_key;

  if v_job.id is null then
    raise exception 'scheduled job not found: %', p_job_key;
  end if;

  if v_job.enabled is false then
    insert into scheduled_job_runs (scheduled_job_id, job_key, job_group, status, metadata)
    values (v_job.id, v_job.job_key, v_job.job_group, 'disabled', p_metadata)
    returning id into v_run_id;

    update scheduled_jobs
    set last_status = 'disabled', last_run_id = v_run_id, updated_at = now()
    where id = v_job.id;

    return v_run_id;
  end if;

  v_lock_acquired := acquire_scheduled_job_lock(
    v_job.job_key,
    p_locked_by,
    v_job.lock_ttl_seconds,
    p_metadata
  );

  if v_lock_acquired is false then
    insert into scheduled_job_runs (scheduled_job_id, job_key, job_group, status, metadata)
    values (v_job.id, v_job.job_key, v_job.job_group, 'skipped_locked', p_metadata)
    returning id into v_run_id;

    update scheduled_jobs
    set last_status = 'skipped_locked', last_run_id = v_run_id, updated_at = now()
    where id = v_job.id;

    return v_run_id;
  end if;

  v_started_at := now();

  insert into scheduled_job_runs (
    scheduled_job_id,
    job_key,
    job_group,
    status,
    started_at,
    metadata
  )
  values (
    v_job.id,
    v_job.job_key,
    v_job.job_group,
    'started',
    v_started_at,
    p_metadata
  )
  returning id into v_run_id;

  update scheduled_jobs
  set
    last_started_at = v_started_at,
    last_status = 'started',
    last_run_id = v_run_id,
    updated_at = now()
  where id = v_job.id;

  if v_job.function_name = 'run_reward_issuance_job' then
    v_uuid_result := run_reward_issuance_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'release_mature_reward_lots' then
    v_uuid_result := release_mature_reward_lots(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'run_accounting_mirror_job' then
    v_uuid_result := run_accounting_mirror_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'run_withdrawal_reserve_job' then
    v_uuid_result := run_withdrawal_reserve_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 100),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'run_audit_hash_backfill_job' then
    v_uuid_result := run_audit_hash_backfill_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'verify_audit_hash_chain' then
    v_uuid_result := verify_audit_hash_chain(
      coalesce(v_job.function_args->>'chain_key', 'global_audit_chain'),
      coalesce((v_job.function_args->>'batch_size')::integer, 100000),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'run_observability_snapshot_job' then
    v_uuid_result := run_observability_snapshot_job(
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'expire_admin_sessions' then
    v_uuid_result := expire_admin_sessions(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'expire_admin_break_glass_requests' then
    v_uuid_result := expire_admin_break_glass_requests(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'run_admin_incident_review_creation_job' then
    v_uuid_result := run_admin_incident_review_creation_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'mark_overdue_admin_incident_reviews' then
    v_uuid_result := mark_overdue_admin_incident_reviews(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'mark_overdue_admin_incident_corrective_actions' then
    v_uuid_result := mark_overdue_admin_incident_corrective_actions(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'create_admin_security_daily_snapshot' then
    v_uuid_result := create_admin_security_daily_snapshot(
      current_date,
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('snapshot_id', v_uuid_result);
  elsif v_job.function_name = 'enqueue_pending_admin_security_archive_exports' then
    v_uuid_result := enqueue_pending_admin_security_archive_exports(
      coalesce((v_job.function_args->>'batch_size')::integer, 100),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'enqueue_pending_admin_security_archive_verifications' then
    v_uuid_result := enqueue_pending_admin_security_archive_verifications(
      coalesce((v_job.function_args->>'batch_size')::integer, 100),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  else
    raise exception 'scheduled function not allowlisted: %', v_job.function_name;
  end if;

  update scheduled_job_runs
  set
    status = 'completed',
    completed_at = now(),
    runtime_ms = (extract(epoch from (now() - v_started_at)) * 1000)::integer,
    result = v_result
  where id = v_run_id;

  update scheduled_jobs
  set
    last_completed_at = now(),
    last_status = 'completed',
    last_run_id = v_run_id,
    updated_at = now()
  where id = v_job.id;

  perform release_scheduled_job_lock(v_job.job_key);
  return v_run_id;
exception
  when others then
    if v_run_id is not null then
      update scheduled_job_runs
      set
        status = 'failed',
        failed_at = now(),
        runtime_ms =
          case
            when v_started_at is not null then (extract(epoch from (now() - v_started_at)) * 1000)::integer
            else null
          end,
        error_message = sqlerrm
      where id = v_run_id;
    end if;

    update scheduled_jobs
    set
      last_failed_at = now(),
      last_status = 'failed',
      last_run_id = v_run_id,
      updated_at = now()
    where job_key = p_job_key;

    perform release_scheduled_job_lock(p_job_key);
    raise;
end;
$$;

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
    'ADMIN_SECURITY_ARCHIVE_VERIFICATION_JOB_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Security archive verification job not found.',
    'Admin security archive verification job not found.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_ARCHIVE_VERIFICATION_FAILED',
    'system',
    'critical',
    500,
    true,
    false,
    'Security archive verification failed.',
    'Admin security archive verification failed.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_ARCHIVE_NOT_SEALED',
    'validation',
    'high',
    409,
    false,
    true,
    'Archive must be sealed before verification.',
    'Archive manifest not sealed before verification.',
    'platform'
  )
on conflict (error_code)
do update set
  category = excluded.category,
  severity = excluded.severity,
  http_status = excluded.http_status,
  retryable = excluded.retryable,
  user_visible = excluded.user_visible,
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
  ('archive verification job not found', 'ADMIN_SECURITY_ARCHIVE_VERIFICATION_JOB_NOT_FOUND', 5, '{}'),
  ('archive verification job id is required', 'ADMIN_SECURITY_ARCHIVE_VERIFICATION_JOB_NOT_FOUND', 5, '{}'),
  ('archive manifest must be sealed before verification', 'ADMIN_SECURITY_ARCHIVE_NOT_SEALED', 5, '{}'),
  ('archive verification failed', 'ADMIN_SECURITY_ARCHIVE_VERIFICATION_FAILED', 5, '{}'),
  ('unsupported verification storage URI', 'ADMIN_SECURITY_ARCHIVE_VERIFICATION_FAILED', 5, '{}'),
  ('archive payload records must be an array', 'ADMIN_SECURITY_ARCHIVE_VERIFICATION_FAILED', 5, '{}')
on conflict do nothing;
