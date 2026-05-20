-- Step 9.2 — Withdrawal provider event processing skeleton

create table if not exists payout_provider_events (
  id uuid primary key default gen_random_uuid(),

  provider_key text not null,
  provider_event_id text not null,
  provider_event_type text not null,

  provider_payout_id text,
  provider_transfer_id text,
  processor_reference text,

  withdrawal_request_id uuid references withdrawal_requests(id),
  external_payout_id uuid references external_payouts(id),

  currency_code text not null default 'USD',
  amount_minor bigint,
  fee_minor bigint,

  normalized_status text,
  processing_status text not null default 'received',

  received_at timestamptz not null default now(),
  processed_at timestamptz,
  failed_at timestamptz,

  failure_reason text,

  raw_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint payout_provider_events_currency_check
  check (currency_code in ('USD')),

  constraint payout_provider_events_amount_check
  check (amount_minor is null or amount_minor > 0),

  constraint payout_provider_events_fee_check
  check (fee_minor is null or fee_minor >= 0),

  constraint payout_provider_events_normalized_status_check
  check (
    normalized_status is null
    or normalized_status in (
      'submitted',
      'processing',
      'paid',
      'failed',
      'cancelled',
      'reversed',
      'unknown'
    )
  ),

  constraint payout_provider_events_processing_status_check
  check (
    processing_status in (
      'received',
      'processing',
      'processed',
      'ignored',
      'failed'
    )
  )
);

create unique index if not exists payout_provider_events_provider_unique
on payout_provider_events (provider_key, provider_event_id);

create index if not exists payout_provider_events_processing_idx
on payout_provider_events (processing_status, received_at asc);

create index if not exists payout_provider_events_withdrawal_idx
on payout_provider_events (withdrawal_request_id, received_at desc);

create index if not exists payout_provider_events_payout_idx
on payout_provider_events (external_payout_id, received_at desc);

create index if not exists payout_provider_events_provider_payout_idx
on payout_provider_events (provider_key, provider_payout_id);

create or replace function record_payout_provider_event(
  p_provider_key text,
  p_provider_event_id text,
  p_provider_event_type text,
  p_provider_payout_id text default null,
  p_provider_transfer_id text default null,
  p_processor_reference text default null,
  p_currency_code text default 'USD',
  p_amount_minor bigint default null,
  p_fee_minor bigint default null,
  p_normalized_status text default null,
  p_raw_payload jsonb default '{}'::jsonb,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_event_id uuid;
  v_external_payout external_payouts%rowtype;
begin
  if p_provider_key is null or length(trim(p_provider_key)) = 0 then
    raise exception 'provider key is required';
  end if;

  if p_provider_event_id is null or length(trim(p_provider_event_id)) = 0 then
    raise exception 'provider event id is required';
  end if;

  if p_provider_event_type is null or length(trim(p_provider_event_type)) = 0 then
    raise exception 'provider event type is required';
  end if;

  if coalesce(p_currency_code, 'USD') <> 'USD' then
    raise exception 'unsupported currency: %', p_currency_code;
  end if;

  if p_amount_minor is not null and p_amount_minor <= 0 then
    raise exception 'provider event amount must be positive';
  end if;

  if p_fee_minor is not null and p_fee_minor < 0 then
    raise exception 'provider event fee cannot be negative';
  end if;

  select *
  into v_external_payout
  from external_payouts
  where provider_key = p_provider_key
    and (
      provider_payout_id = p_provider_payout_id
      or provider_transfer_id = p_provider_transfer_id
      or processor_reference = p_processor_reference
    )
  order by created_at desc
  limit 1;

  insert into payout_provider_events (
    provider_key,
    provider_event_id,
    provider_event_type,
    provider_payout_id,
    provider_transfer_id,
    processor_reference,
    withdrawal_request_id,
    external_payout_id,
    currency_code,
    amount_minor,
    fee_minor,
    normalized_status,
    processing_status,
    raw_payload,
    metadata
  )
  values (
    p_provider_key,
    p_provider_event_id,
    p_provider_event_type,
    p_provider_payout_id,
    p_provider_transfer_id,
    p_processor_reference,
    v_external_payout.withdrawal_request_id,
    v_external_payout.id,
    'USD',
    p_amount_minor,
    p_fee_minor,
    p_normalized_status,
    'received',
    coalesce(p_raw_payload, '{}'::jsonb),
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (provider_key, provider_event_id)
  do update set
    metadata = payout_provider_events.metadata || excluded.metadata
  returning id into v_event_id;

  return v_event_id;
end;
$$;

create or replace function assert_payout_provider_event_matches_payout(
  p_provider_event_id uuid
)
returns void
language plpgsql
as $$
declare
  v_event payout_provider_events%rowtype;
  v_payout external_payouts%rowtype;
begin
  select *
  into v_event
  from payout_provider_events
  where id = p_provider_event_id;

  if v_event.id is null then
    raise exception 'payout provider event not found: %', p_provider_event_id;
  end if;

  if v_event.external_payout_id is null then
    raise exception 'provider event is not linked to external payout';
  end if;

  select *
  into v_payout
  from external_payouts
  where id = v_event.external_payout_id;

  if v_payout.id is null then
    raise exception 'external payout not found for provider event';
  end if;

  if v_event.currency_code <> v_payout.currency_code then
    raise exception 'provider event currency mismatch';
  end if;

  if v_event.amount_minor is not null
    and v_event.amount_minor <> v_payout.amount_minor then
    raise exception 'provider event amount mismatch';
  end if;

  if v_event.fee_minor is not null
    and v_event.fee_minor <> v_payout.fee_minor then
    raise exception 'provider event fee mismatch';
  end if;
end;
$$;

create or replace function process_payout_provider_event(
  p_provider_event_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_event payout_provider_events%rowtype;
  v_payout external_payouts%rowtype;
  v_withdrawal withdrawal_requests%rowtype;
begin
  if p_provider_event_id is null then
    raise exception 'provider event id is required';
  end if;

  select *
  into v_event
  from payout_provider_events
  where id = p_provider_event_id
  for update;

  if v_event.id is null then
    raise exception 'payout provider event not found: %', p_provider_event_id;
  end if;

  if v_event.processing_status in ('processed', 'ignored') then
    return v_event.id;
  end if;

  update payout_provider_events
  set processing_status = 'processing'
  where id = v_event.id;

  if v_event.external_payout_id is null then
    update payout_provider_events
    set
      processing_status = 'failed',
      failed_at = now(),
      failure_reason = 'provider event is not linked to external payout'
    where id = v_event.id;

    raise exception 'provider event is not linked to external payout';
  end if;

  perform assert_payout_provider_event_matches_payout(v_event.id);

  select *
  into v_payout
  from external_payouts
  where id = v_event.external_payout_id
  for update;

  select *
  into v_withdrawal
  from withdrawal_requests
  where id = v_payout.withdrawal_request_id
  for update;

  if v_withdrawal.id is null then
    raise exception 'withdrawal request not found for payout provider event';
  end if;

  if v_event.normalized_status = 'processing' then
    update external_payouts
    set
      status = 'processing',
      processing_at = coalesce(processing_at, now()),
      updated_at = now(),
      raw_provider_payload = raw_provider_payload || v_event.raw_payload,
      metadata = metadata || p_metadata
    where id = v_payout.id;

    update withdrawal_requests
    set
      status = 'processing',
      updated_at = now(),
      metadata = metadata || p_metadata
    where id = v_withdrawal.id
      and status = 'submitted';

    perform record_withdrawal_status_event(
      v_withdrawal.id,
      v_withdrawal.status,
      'processing',
      'provider_processing_event',
      null,
      'provider',
      null,
      p_metadata || jsonb_build_object('provider_event_id', v_event.id)
    );

  elsif v_event.normalized_status = 'paid' then
    perform mark_withdrawal_paid(
      v_withdrawal.id,
      v_payout.id,
      coalesce(v_event.processor_reference, v_event.provider_payout_id),
      p_metadata || jsonb_build_object('provider_event_id', v_event.id)
    );

  elsif v_event.normalized_status in ('failed', 'cancelled') then
    perform mark_withdrawal_failed_and_release(
      v_withdrawal.id,
      coalesce(v_event.provider_event_type, 'provider_failed'),
      v_payout.id,
      p_metadata || jsonb_build_object('provider_event_id', v_event.id)
    );

  elsif v_event.normalized_status = 'submitted' then
    update payout_provider_events
    set
      processing_status = 'ignored',
      processed_at = now(),
      metadata = metadata || p_metadata || jsonb_build_object(
        'ignore_reason',
        'submitted event does not require state transition'
      )
    where id = v_event.id;

    return v_event.id;

  elsif v_event.normalized_status = 'reversed' then
    update payout_provider_events
    set
      processing_status = 'failed',
      failed_at = now(),
      failure_reason = 'reversal handling not implemented yet',
      metadata = metadata || p_metadata
    where id = v_event.id;

    raise exception 'payout reversal handling not implemented yet';

  else
    update payout_provider_events
    set
      processing_status = 'ignored',
      processed_at = now(),
      metadata = metadata || p_metadata || jsonb_build_object(
        'ignore_reason',
        'unknown or unsupported normalized status'
      )
    where id = v_event.id;

    return v_event.id;
  end if;

  update payout_provider_events
  set
    processing_status = 'processed',
    processed_at = now(),
    metadata = metadata || p_metadata
  where id = v_event.id;

  return v_event.id;

exception
  when others then
    update payout_provider_events
    set
      processing_status = 'failed',
      failed_at = now(),
      failure_reason = sqlerrm,
      metadata = metadata || p_metadata
    where id = p_provider_event_id
      and processing_status <> 'processed';

    raise;
end;
$$;

create table if not exists payout_provider_event_processing_runs (
  id uuid primary key default gen_random_uuid(),

  status text not null default 'processing',

  scanned_count integer not null default 0,
  processed_count integer not null default 0,
  ignored_count integer not null default 0,
  failed_count integer not null default 0,

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,

  failure_reason text,

  metadata jsonb not null default '{}'::jsonb,

  constraint payout_provider_event_processing_runs_status_check
  check (status in ('processing', 'completed', 'failed'))
);

create index if not exists payout_provider_event_processing_runs_started_idx
on payout_provider_event_processing_runs (started_at desc);

create or replace function run_payout_provider_event_processing_job(
  p_batch_size integer default 500,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid;
  v_event record;
  v_status text;

  v_scanned integer := 0;
  v_processed integer := 0;
  v_ignored integer := 0;
  v_failed integer := 0;
begin
  if p_batch_size <= 0 then
    raise exception 'batch size must be positive';
  end if;

  insert into payout_provider_event_processing_runs (
    status,
    metadata
  )
  values (
    'processing',
    p_metadata
  )
  returning id into v_run_id;

  for v_event in
    select id
    from payout_provider_events
    where processing_status = 'received'
    order by received_at asc
    limit p_batch_size
    for update skip locked
  loop
    v_scanned := v_scanned + 1;

    begin
      perform process_payout_provider_event(
        v_event.id,
        p_metadata || jsonb_build_object(
          'payout_provider_event_processing_run_id',
          v_run_id
        )
      );

      select processing_status
      into v_status
      from payout_provider_events
      where id = v_event.id;

      if v_status = 'processed' then
        v_processed := v_processed + 1;
      elsif v_status = 'ignored' then
        v_ignored := v_ignored + 1;
      else
        v_failed := v_failed + 1;
      end if;
    exception
      when others then
        v_failed := v_failed + 1;
    end;
  end loop;

  update payout_provider_event_processing_runs
  set
    status = 'completed',
    completed_at = now(),
    scanned_count = v_scanned,
    processed_count = v_processed,
    ignored_count = v_ignored,
    failed_count = v_failed
  where id = v_run_id;

  return v_run_id;

exception
  when others then
    if v_run_id is not null then
      update payout_provider_event_processing_runs
      set
        status = 'failed',
        failed_at = now(),
        failure_reason = sqlerrm
      where id = v_run_id;
    end if;

    raise;
end;
$$;

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
  'payout_provider_events_every_minute',
  'Process payout provider events',
  'wallet',
  true,
  '* * * * *',
  'run_payout_provider_event_processing_job',
  '{"batch_size": 500}'::jsonb,
  180,
  300,
  '{"priority": "high"}'::jsonb
)
on conflict (job_key)
do update set
  job_name = excluded.job_name,
  job_group = excluded.job_group,
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
    insert into scheduled_job_runs (
      scheduled_job_id,
      job_key,
      job_group,
      status,
      metadata
    )
    values (
      v_job.id,
      v_job.job_key,
      v_job.job_group,
      'disabled',
      p_metadata
    )
    returning id into v_run_id;

    update scheduled_jobs
    set
      last_status = 'disabled',
      last_run_id = v_run_id,
      updated_at = now()
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
    insert into scheduled_job_runs (
      scheduled_job_id,
      job_key,
      job_group,
      status,
      metadata
    )
    values (
      v_job.id,
      v_job.job_key,
      v_job.job_group,
      'skipped_locked',
      p_metadata
    )
    returning id into v_run_id;

    update scheduled_jobs
    set
      last_status = 'skipped_locked',
      last_run_id = v_run_id,
      updated_at = now()
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

  elsif v_job.function_name = 'run_payout_provider_event_processing_job' then
    v_uuid_result := run_payout_provider_event_processing_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'expire_admin_security_evidence_answer_sessions' then
    v_uuid_result := expire_admin_security_evidence_answer_sessions(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'expire_admin_security_answer_receipt_export_bundles' then
    v_uuid_result := expire_admin_security_answer_receipt_export_bundles(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'process_due_admin_security_proof_digests' then
    v_result := process_due_admin_security_proof_digests(
      coalesce((v_job.function_args->>'batch_size')::integer, 100),
      'scheduled-job',
      v_run_id::text,
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );

  elsif v_job.function_name = 'expire_admin_security_proof_notification_events' then
    v_uuid_result := expire_admin_security_proof_notification_events(
      coalesce((v_job.function_args->>'batch_size')::integer, 5000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'process_admin_security_proof_observability_cycle' then
    v_result := process_admin_security_proof_observability_cycle(
      'scheduled-job',
      v_run_id::text,
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );

  elsif v_job.function_name = 'expire_admin_security_proof_observability_records' then
    v_uuid_result := expire_admin_security_proof_observability_records(
      coalesce((v_job.function_args->>'batch_size')::integer, 5000),
      'scheduled-job',
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

create or replace function hash_payout_provider_event(
  p_payout_provider_event_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_event payout_provider_events%rowtype;
  v_payload jsonb;
begin
  select *
  into v_event
  from payout_provider_events
  where id = p_payout_provider_event_id;

  if v_event.id is null then
    raise exception 'payout provider event not found: %', p_payout_provider_event_id;
  end if;

  v_payload := jsonb_build_object(
    'source_type', 'payout_provider_event',
    'source_id', v_event.id,
    'provider_key', v_event.provider_key,
    'provider_event_id', v_event.provider_event_id,
    'provider_event_type', v_event.provider_event_type,
    'provider_payout_id', v_event.provider_payout_id,
    'withdrawal_request_id', v_event.withdrawal_request_id,
    'external_payout_id', v_event.external_payout_id,
    'currency_code', v_event.currency_code,
    'amount_minor', v_event.amount_minor,
    'fee_minor', v_event.fee_minor,
    'normalized_status', v_event.normalized_status,
    'processing_status', v_event.processing_status,
    'received_at', v_event.received_at,
    'processed_at', v_event.processed_at,
    'failed_at', v_event.failed_at,
    'created_at', v_event.created_at
  );

  return append_audit_hash_chain_entry(
    'payout_provider_event',
    v_event.id,
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

  insert into audit_hash_backfill_runs (
    status,
    metadata
  )
  values (
    'processing',
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_run_id;

  for v_row in
    select *
    from audit_hash_missing_records
    order by created_at asc
    limit p_batch_size
  loop
    v_scanned := v_scanned + 1;

    begin
      if v_row.source_type = 'wallet_ledger_entry' then
        perform hash_wallet_ledger_entry(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );

      elsif v_row.source_type = 'accounting_journal_entry' then
        perform hash_accounting_journal_entry(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );

      elsif v_row.source_type = 'reward_issuance_group' then
        perform hash_reward_issuance_group(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );

      elsif v_row.source_type = 'attention_verification_event' then
        perform hash_attention_verification_event(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );

      elsif v_row.source_type = 'withdrawal_request' then
        perform hash_withdrawal_request(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );

      elsif v_row.source_type = 'external_payout' then
        perform hash_external_payout(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );

      elsif v_row.source_type = 'payout_provider_event' then
        perform hash_payout_provider_event(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
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
        failure_reason = sqlerrm
      where id = v_run_id;
    end if;

    raise;
end;
$$;

alter table payout_provider_events enable row level security;
alter table payout_provider_event_processing_runs enable row level security;

drop policy if exists payout_provider_events_no_user_access on payout_provider_events;
create policy payout_provider_events_no_user_access
on payout_provider_events
for all
to authenticated
using (false)
with check (false);

drop policy if exists payout_provider_event_runs_no_user_access on payout_provider_event_processing_runs;
create policy payout_provider_event_runs_no_user_access
on payout_provider_event_processing_runs
for all
to authenticated
using (false)
with check (false);

drop policy if exists worker_all_payout_provider_events on payout_provider_events;
create policy worker_all_payout_provider_events
on payout_provider_events
for all
to worker_role
using (true)
with check (true);

drop policy if exists worker_all_payout_provider_event_runs on payout_provider_event_processing_runs;
create policy worker_all_payout_provider_event_runs
on payout_provider_event_processing_runs
for all
to worker_role
using (true)
with check (true);

drop policy if exists admin_read_payout_provider_events on payout_provider_events;
create policy admin_read_payout_provider_events
on payout_provider_events
for select
to admin_api_role
using (true);

drop policy if exists admin_read_payout_provider_event_runs on payout_provider_event_processing_runs;
create policy admin_read_payout_provider_event_runs
on payout_provider_event_processing_runs
for select
to admin_api_role
using (true);

grant execute on function record_payout_provider_event(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  bigint,
  bigint,
  text,
  jsonb,
  jsonb
) to worker_role;

grant execute on function process_payout_provider_event(uuid, jsonb)
to worker_role;

grant execute on function run_payout_provider_event_processing_job(integer, jsonb)
to worker_role;

alter function record_payout_provider_event(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  bigint,
  bigint,
  text,
  jsonb,
  jsonb
) security definer;

alter function record_payout_provider_event(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  bigint,
  bigint,
  text,
  jsonb,
  jsonb
) set search_path = public;

alter function process_payout_provider_event(uuid, jsonb) security definer;
alter function process_payout_provider_event(uuid, jsonb) set search_path = public;

alter function run_payout_provider_event_processing_job(integer, jsonb) security definer;
alter function run_payout_provider_event_processing_job(integer, jsonb) set search_path = public;

create or replace view admin_payout_provider_event_detail as
select
  ppe.id as payout_provider_event_id,
  ppe.provider_key,
  ppe.provider_event_id,
  ppe.provider_event_type,
  ppe.provider_payout_id,
  ppe.provider_transfer_id,
  ppe.processor_reference,
  ppe.withdrawal_request_id,
  ppe.external_payout_id,
  ppe.currency_code,
  ppe.amount_minor,
  ppe.fee_minor,
  ppe.normalized_status,
  ppe.processing_status,
  ppe.received_at,
  ppe.processed_at,
  ppe.failed_at,
  ppe.failure_reason,
  ppe.metadata,
  ppe.created_at
from payout_provider_events ppe;

grant select on admin_payout_provider_event_detail to admin_api_role;
