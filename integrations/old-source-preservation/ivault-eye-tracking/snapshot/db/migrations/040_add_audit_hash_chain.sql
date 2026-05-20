-- 40/post-MVP schema — tamper-evident audit hash chain.

create extension if not exists pgcrypto;

create table if not exists audit_hash_chain_entries (
  id uuid primary key default gen_random_uuid(),
  chain_key text not null default 'global_audit_chain',
  sequence_number bigint not null,
  event_type text not null,
  event_table text not null,
  event_id uuid not null,
  event_occurred_at timestamptz,
  event_payload jsonb not null,
  previous_hash text,
  event_hash text not null,
  chain_hash text not null,
  hash_algorithm text not null default 'sha256',
  canonicalization_version text not null default 'canonical_json_v1',
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_hash_chain_entries_status_check
    check (status in ('active', 'voided', 'superseded'))
);

create unique index if not exists audit_hash_chain_entries_chain_sequence_unique
on audit_hash_chain_entries (chain_key, sequence_number);
create unique index if not exists audit_hash_chain_entries_event_unique
on audit_hash_chain_entries (chain_key, event_table, event_id);
create index if not exists audit_hash_chain_entries_event_idx
on audit_hash_chain_entries (event_table, event_id);
create index if not exists audit_hash_chain_entries_chain_idx
on audit_hash_chain_entries (chain_key, sequence_number desc);

create or replace function audit_sha256_text(p_input text)
returns text
language sql
immutable
as $$
  select encode(digest(coalesce(p_input, ''), 'sha256'), 'hex');
$$;

create or replace function audit_compute_event_hash(
  p_event_type text,
  p_event_table text,
  p_event_id uuid,
  p_event_payload jsonb,
  p_event_occurred_at timestamptz default null
)
returns text
language sql
immutable
as $$
  select audit_sha256_text(
    jsonb_build_object(
      'event_type', p_event_type,
      'event_table', p_event_table,
      'event_id', p_event_id,
      'event_occurred_at', p_event_occurred_at,
      'event_payload', p_event_payload
    )::text
  );
$$;

create or replace function audit_compute_chain_hash(
  p_chain_key text,
  p_sequence_number bigint,
  p_previous_hash text,
  p_event_hash text
)
returns text
language sql
immutable
as $$
  select audit_sha256_text(
    jsonb_build_object(
      'chain_key', p_chain_key,
      'sequence_number', p_sequence_number,
      'previous_hash', p_previous_hash,
      'event_hash', p_event_hash
    )::text
  );
$$;

create table if not exists audit_hash_chain_locks (
  chain_key text primary key,
  updated_at timestamptz not null default now()
);

insert into audit_hash_chain_locks (chain_key)
values ('global_audit_chain')
on conflict (chain_key) do nothing;

create or replace function append_audit_hash_chain_entry(
  p_event_type text,
  p_event_table text,
  p_event_id uuid,
  p_event_payload jsonb,
  p_event_occurred_at timestamptz default null,
  p_chain_key text default 'global_audit_chain',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_sequence_number bigint;
  v_previous_hash text;
  v_event_hash text;
  v_chain_hash text;
  v_entry_id uuid;
begin
  if p_event_type is null or length(trim(p_event_type)) = 0 then
    raise exception 'event type is required';
  end if;
  if p_event_table is null or length(trim(p_event_table)) = 0 then
    raise exception 'event table is required';
  end if;
  if p_event_id is null then
    raise exception 'event id is required';
  end if;
  if p_event_payload is null then
    raise exception 'event payload is required';
  end if;

  insert into audit_hash_chain_locks (chain_key)
  values (p_chain_key)
  on conflict (chain_key) do nothing;

  perform 1
  from audit_hash_chain_locks
  where chain_key = p_chain_key
  for update;

  select id
  into v_entry_id
  from audit_hash_chain_entries
  where chain_key = p_chain_key
    and event_table = p_event_table
    and event_id = p_event_id;

  if v_entry_id is not null then
    return v_entry_id;
  end if;

  select coalesce(max(sequence_number), 0) + 1
  into v_sequence_number
  from audit_hash_chain_entries
  where chain_key = p_chain_key;

  select chain_hash
  into v_previous_hash
  from audit_hash_chain_entries
  where chain_key = p_chain_key
  order by sequence_number desc
  limit 1;

  v_event_hash := audit_compute_event_hash(
    p_event_type, p_event_table, p_event_id, p_event_payload, p_event_occurred_at
  );
  v_chain_hash := audit_compute_chain_hash(
    p_chain_key, v_sequence_number, v_previous_hash, v_event_hash
  );

  insert into audit_hash_chain_entries (
    chain_key, sequence_number, event_type, event_table, event_id, event_occurred_at,
    event_payload, previous_hash, event_hash, chain_hash, metadata
  )
  values (
    p_chain_key, v_sequence_number, p_event_type, p_event_table, p_event_id, p_event_occurred_at,
    p_event_payload, v_previous_hash, v_event_hash, v_chain_hash, coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_entry_id;

  update audit_hash_chain_locks
  set updated_at = now()
  where chain_key = p_chain_key;

  return v_entry_id;
end;
$$;

create table if not exists audit_hash_chain_verification_runs (
  id uuid primary key default gen_random_uuid(),
  chain_key text not null default 'global_audit_chain',
  status text not null default 'processing',
  checked_entry_count integer not null default 0,
  broken_entry_count integer not null default 0,
  first_broken_sequence_number bigint,
  first_broken_entry_id uuid,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  constraint audit_hash_chain_verification_runs_status_check
    check (status in ('processing', 'completed', 'failed'))
);
create index if not exists audit_hash_chain_verification_runs_started_idx
on audit_hash_chain_verification_runs (started_at desc);

create table if not exists audit_hash_chain_verification_issues (
  id uuid primary key default gen_random_uuid(),
  verification_run_id uuid not null references audit_hash_chain_verification_runs(id),
  chain_entry_id uuid references audit_hash_chain_entries(id),
  chain_key text not null,
  sequence_number bigint,
  issue_type text not null,
  severity text not null default 'critical',
  expected_hash text,
  actual_hash text,
  metadata jsonb not null default '{}'::jsonb,
  detected_at timestamptz not null default now(),
  constraint audit_hash_chain_verification_issues_severity_check
    check (severity in ('warning', 'critical'))
);
create index if not exists audit_hash_chain_verification_issues_run_idx
on audit_hash_chain_verification_issues (verification_run_id);
create index if not exists audit_hash_chain_verification_issues_chain_idx
on audit_hash_chain_verification_issues (chain_key, sequence_number);

create or replace function verify_audit_hash_chain(
  p_chain_key text default 'global_audit_chain',
  p_batch_size integer default 100000,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid;
  v_entry record;
  v_previous_hash text;
  v_expected_event_hash text;
  v_expected_chain_hash text;
  v_checked integer := 0;
  v_broken integer := 0;
  v_first_broken_sequence bigint;
  v_first_broken_entry_id uuid;
begin
  if p_batch_size <= 0 then
    raise exception 'batch size must be positive';
  end if;

  insert into audit_hash_chain_verification_runs (chain_key, status, metadata)
  values (p_chain_key, 'processing', coalesce(p_metadata, '{}'::jsonb))
  returning id into v_run_id;

  v_previous_hash := null;

  for v_entry in
    select *
    from audit_hash_chain_entries
    where chain_key = p_chain_key and status = 'active'
    order by sequence_number asc
    limit p_batch_size
  loop
    v_checked := v_checked + 1;
    v_expected_event_hash := audit_compute_event_hash(
      v_entry.event_type,
      v_entry.event_table,
      v_entry.event_id,
      v_entry.event_payload,
      v_entry.event_occurred_at
    );

    if v_expected_event_hash <> v_entry.event_hash then
      v_broken := v_broken + 1;
      if v_first_broken_sequence is null then
        v_first_broken_sequence := v_entry.sequence_number;
        v_first_broken_entry_id := v_entry.id;
      end if;
      insert into audit_hash_chain_verification_issues (
        verification_run_id, chain_entry_id, chain_key, sequence_number,
        issue_type, expected_hash, actual_hash, metadata
      )
      values (
        v_run_id, v_entry.id, p_chain_key, v_entry.sequence_number,
        'event_hash_mismatch', v_expected_event_hash, v_entry.event_hash, coalesce(p_metadata, '{}'::jsonb)
      );
    end if;

    if v_entry.previous_hash is distinct from v_previous_hash then
      v_broken := v_broken + 1;
      if v_first_broken_sequence is null then
        v_first_broken_sequence := v_entry.sequence_number;
        v_first_broken_entry_id := v_entry.id;
      end if;
      insert into audit_hash_chain_verification_issues (
        verification_run_id, chain_entry_id, chain_key, sequence_number,
        issue_type, expected_hash, actual_hash, metadata
      )
      values (
        v_run_id, v_entry.id, p_chain_key, v_entry.sequence_number,
        'previous_hash_mismatch', v_previous_hash, v_entry.previous_hash, coalesce(p_metadata, '{}'::jsonb)
      );
    end if;

    v_expected_chain_hash := audit_compute_chain_hash(
      p_chain_key, v_entry.sequence_number, v_entry.previous_hash, v_entry.event_hash
    );

    if v_expected_chain_hash <> v_entry.chain_hash then
      v_broken := v_broken + 1;
      if v_first_broken_sequence is null then
        v_first_broken_sequence := v_entry.sequence_number;
        v_first_broken_entry_id := v_entry.id;
      end if;
      insert into audit_hash_chain_verification_issues (
        verification_run_id, chain_entry_id, chain_key, sequence_number,
        issue_type, expected_hash, actual_hash, metadata
      )
      values (
        v_run_id, v_entry.id, p_chain_key, v_entry.sequence_number,
        'chain_hash_mismatch', v_expected_chain_hash, v_entry.chain_hash, coalesce(p_metadata, '{}'::jsonb)
      );
    end if;

    v_previous_hash := v_entry.chain_hash;
  end loop;

  update audit_hash_chain_verification_runs
  set
    status = 'completed',
    completed_at = now(),
    checked_entry_count = v_checked,
    broken_entry_count = v_broken,
    first_broken_sequence_number = v_first_broken_sequence,
    first_broken_entry_id = v_first_broken_entry_id
  where id = v_run_id;

  return v_run_id;

exception when others then
  if v_run_id is not null then
    update audit_hash_chain_verification_runs
    set status = 'failed', failed_at = now(), failure_reason = sqlerrm
    where id = v_run_id;
  end if;
  raise;
end;
$$;

create or replace function hash_wallet_ledger_entry(
  p_wallet_ledger_entry_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_row wallet_ledger_entries%rowtype;
begin
  select * into v_row from wallet_ledger_entries where id = p_wallet_ledger_entry_id;
  if v_row.id is null then
    raise exception 'wallet ledger entry not found: %', p_wallet_ledger_entry_id;
  end if;
  return append_audit_hash_chain_entry(
    'wallet_ledger_entry', 'wallet_ledger_entries', v_row.id, to_jsonb(v_row),
    v_row.created_at, 'global_audit_chain', p_metadata
  );
end;
$$;

create or replace function hash_accounting_journal_entry(
  p_accounting_journal_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_journal accounting_journals%rowtype;
  v_lines jsonb;
  v_payload jsonb;
begin
  select * into v_journal from accounting_journals where id = p_accounting_journal_id;
  if v_journal.id is null then
    raise exception 'accounting journal entry not found: %', p_accounting_journal_id;
  end if;

  select jsonb_agg(to_jsonb(l) order by l.created_at asc, l.id asc)
  into v_lines
  from accounting_journal_lines l
  where l.journal_id = v_journal.id;

  v_payload := jsonb_build_object(
    'journal_entry', to_jsonb(v_journal),
    'journal_lines', coalesce(v_lines, '[]'::jsonb)
  );

  return append_audit_hash_chain_entry(
    'accounting_journal_entry', 'accounting_journals', v_journal.id, v_payload,
    coalesce(v_journal.posted_at, v_journal.created_at), 'global_audit_chain', p_metadata
  );
end;
$$;

create or replace function hash_admin_audit_log_entry(
  p_admin_audit_log_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_row admin_audit_log%rowtype;
begin
  select * into v_row from admin_audit_log where id = p_admin_audit_log_id;
  if v_row.id is null then
    raise exception 'admin audit log entry not found: %', p_admin_audit_log_id;
  end if;
  return append_audit_hash_chain_entry(
    'admin_audit_log', 'admin_audit_log', v_row.id, to_jsonb(v_row),
    v_row.created_at, 'global_audit_chain', p_metadata
  );
end;
$$;

create or replace function hash_trust_score_override_event(
  p_trust_score_override_event_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_row trust_score_override_events%rowtype;
begin
  select * into v_row from trust_score_override_events where id = p_trust_score_override_event_id;
  if v_row.id is null then
    raise exception 'trust score override event not found: %', p_trust_score_override_event_id;
  end if;
  return append_audit_hash_chain_entry(
    'trust_score_override_event', 'trust_score_override_events', v_row.id, to_jsonb(v_row),
    v_row.created_at, 'global_audit_chain', p_metadata
  );
end;
$$;

create or replace function hash_attention_verification_event(
  p_attention_event_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_event attention_verification_events%rowtype;
  v_fraud_signals jsonb;
  v_payload jsonb;
begin
  select * into v_event from attention_verification_events where id = p_attention_event_id;
  if v_event.id is null then
    raise exception 'attention verification event not found: %', p_attention_event_id;
  end if;

  select jsonb_agg(to_jsonb(fs) order by fs.created_at asc, fs.id asc)
  into v_fraud_signals
  from attention_fraud_signals fs
  where fs.attention_event_id = v_event.id;

  v_payload := jsonb_build_object(
    'attention_event', to_jsonb(v_event),
    'fraud_signals', coalesce(v_fraud_signals, '[]'::jsonb)
  );

  return append_audit_hash_chain_entry(
    'attention_verification_event', 'attention_verification_events', v_event.id, v_payload,
    v_event.occurred_at, 'global_audit_chain', p_metadata
  );
end;
$$;

create or replace function hash_reward_issuance_group(
  p_reward_issuance_group_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_row reward_issuance_groups%rowtype;
begin
  select * into v_row from reward_issuance_groups where id = p_reward_issuance_group_id;
  if v_row.id is null then
    raise exception 'reward issuance group not found: %', p_reward_issuance_group_id;
  end if;
  return append_audit_hash_chain_entry(
    'reward_issuance_group', 'reward_issuance_groups', v_row.id, to_jsonb(v_row),
    coalesce(v_row.completed_at, v_row.created_at), 'global_audit_chain', p_metadata
  );
end;
$$;

create or replace function hash_wallet_fraud_lock_event(
  p_wallet_fraud_lock_event_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_row wallet_fraud_lock_events%rowtype;
begin
  select * into v_row from wallet_fraud_lock_events where id = p_wallet_fraud_lock_event_id;
  if v_row.id is null then
    raise exception 'wallet fraud lock event not found: %', p_wallet_fraud_lock_event_id;
  end if;
  return append_audit_hash_chain_entry(
    'wallet_fraud_lock_event', 'wallet_fraud_lock_events', v_row.id, to_jsonb(v_row),
    v_row.created_at, 'global_audit_chain', p_metadata
  );
end;
$$;

create or replace function hash_wallet_reconciliation_issue(
  p_wallet_reconciliation_issue_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_row wallet_reconciliation_issues%rowtype;
begin
  select * into v_row from wallet_reconciliation_issues where id = p_wallet_reconciliation_issue_id;
  if v_row.id is null then
    raise exception 'wallet reconciliation issue not found: %', p_wallet_reconciliation_issue_id;
  end if;
  return append_audit_hash_chain_entry(
    'wallet_reconciliation_issue', 'wallet_reconciliation_issues', v_row.id, to_jsonb(v_row),
    v_row.detected_at, 'global_audit_chain', p_metadata
  );
end;
$$;

create or replace view audit_hash_missing_events as
select 'wallet_ledger_entry' as event_type, 'wallet_ledger_entries' as event_table, wle.id as event_id, wle.created_at as event_occurred_at
from wallet_ledger_entries wle
left join audit_hash_chain_entries h on h.event_table = 'wallet_ledger_entries' and h.event_id = wle.id and h.chain_key = 'global_audit_chain'
where h.id is null
union all
select 'accounting_journal_entry', 'accounting_journals', aj.id, coalesce(aj.posted_at, aj.created_at)
from accounting_journals aj
left join audit_hash_chain_entries h on h.event_table = 'accounting_journals' and h.event_id = aj.id and h.chain_key = 'global_audit_chain'
where aj.status = 'posted' and h.id is null
union all
select 'admin_audit_log', 'admin_audit_log', aal.id, aal.created_at
from admin_audit_log aal
left join audit_hash_chain_entries h on h.event_table = 'admin_audit_log' and h.event_id = aal.id and h.chain_key = 'global_audit_chain'
where h.id is null
union all
select 'trust_score_override_event', 'trust_score_override_events', tsoe.id, tsoe.created_at
from trust_score_override_events tsoe
left join audit_hash_chain_entries h on h.event_table = 'trust_score_override_events' and h.event_id = tsoe.id and h.chain_key = 'global_audit_chain'
where h.id is null
union all
select 'attention_verification_event', 'attention_verification_events', ave.id, ave.occurred_at
from attention_verification_events ave
left join audit_hash_chain_entries h on h.event_table = 'attention_verification_events' and h.event_id = ave.id and h.chain_key = 'global_audit_chain'
where h.id is null
union all
select 'reward_issuance_group', 'reward_issuance_groups', rig.id, coalesce(rig.completed_at, rig.created_at)
from reward_issuance_groups rig
left join audit_hash_chain_entries h on h.event_table = 'reward_issuance_groups' and h.event_id = rig.id and h.chain_key = 'global_audit_chain'
where rig.status = 'completed' and h.id is null
union all
select 'wallet_fraud_lock_event', 'wallet_fraud_lock_events', wfle.id, wfle.created_at
from wallet_fraud_lock_events wfle
left join audit_hash_chain_entries h on h.event_table = 'wallet_fraud_lock_events' and h.event_id = wfle.id and h.chain_key = 'global_audit_chain'
where h.id is null
union all
select 'wallet_reconciliation_issue', 'wallet_reconciliation_issues', wri.id, wri.detected_at
from wallet_reconciliation_issues wri
left join audit_hash_chain_entries h on h.event_table = 'wallet_reconciliation_issues' and h.event_id = wri.id and h.chain_key = 'global_audit_chain'
where h.id is null;

create table if not exists audit_hash_backfill_runs (
  id uuid primary key default gen_random_uuid(),
  run_type text not null default 'scheduled',
  status text not null default 'processing',
  scanned_count integer not null default 0,
  hashed_count integer not null default 0,
  failed_count integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  constraint audit_hash_backfill_runs_status_check
    check (status in ('processing', 'completed', 'failed'))
);
create index if not exists audit_hash_backfill_runs_started_idx
on audit_hash_backfill_runs (started_at desc);

create or replace function run_audit_hash_backfill_job(
  p_batch_size integer default 500,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid;
  v_event record;
  v_scanned integer := 0;
  v_hashed integer := 0;
  v_failed integer := 0;
begin
  if p_batch_size <= 0 then
    raise exception 'batch size must be positive';
  end if;

  insert into audit_hash_backfill_runs (run_type, status, metadata)
  values ('scheduled', 'processing', coalesce(p_metadata, '{}'::jsonb))
  returning id into v_run_id;

  for v_event in
    select * from audit_hash_missing_events order by event_occurred_at asc limit p_batch_size
  loop
    v_scanned := v_scanned + 1;
    begin
      if v_event.event_table = 'wallet_ledger_entries' then
        perform hash_wallet_ledger_entry(v_event.event_id, coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_event.event_table = 'accounting_journals' then
        perform hash_accounting_journal_entry(v_event.event_id, coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_event.event_table = 'admin_audit_log' then
        perform hash_admin_audit_log_entry(v_event.event_id, coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_event.event_table = 'trust_score_override_events' then
        perform hash_trust_score_override_event(v_event.event_id, coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_event.event_table = 'attention_verification_events' then
        perform hash_attention_verification_event(v_event.event_id, coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_event.event_table = 'reward_issuance_groups' then
        perform hash_reward_issuance_group(v_event.event_id, coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_event.event_table = 'wallet_fraud_lock_events' then
        perform hash_wallet_fraud_lock_event(v_event.event_id, coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_event.event_table = 'wallet_reconciliation_issues' then
        perform hash_wallet_reconciliation_issue(v_event.event_id, coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      end if;
      v_hashed := v_hashed + 1;
    exception when others then
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

exception when others then
  if v_run_id is not null then
    update audit_hash_backfill_runs
    set status = 'failed', failed_at = now(), failure_reason = sqlerrm
    where id = v_run_id;
  end if;
  raise;
end;
$$;

create or replace view audit_hash_chain_dashboard as
select
  chain_key,
  count(*) as entry_count,
  min(sequence_number) as first_sequence_number,
  max(sequence_number) as latest_sequence_number,
  min(created_at) as first_entry_at,
  max(created_at) as latest_entry_at,
  (
    select chain_hash
    from audit_hash_chain_entries h2
    where h2.chain_key = h.chain_key
      and h2.status = 'active'
    order by sequence_number desc
    limit 1
  ) as latest_chain_hash,
  count(*) filter (where status <> 'active') as nonactive_entry_count
from audit_hash_chain_entries h
group by chain_key;

create or replace view audit_hash_chain_verification_dashboard as
select
  vr.id as verification_run_id,
  vr.chain_key,
  vr.status,
  vr.checked_entry_count,
  vr.broken_entry_count,
  vr.first_broken_sequence_number,
  vr.first_broken_entry_id,
  vr.started_at,
  vr.completed_at,
  vr.failed_at,
  vr.failure_reason,
  jsonb_agg(
    jsonb_build_object(
      'issue_id', i.id,
      'chain_entry_id', i.chain_entry_id,
      'sequence_number', i.sequence_number,
      'issue_type', i.issue_type,
      'severity', i.severity,
      'expected_hash', i.expected_hash,
      'actual_hash', i.actual_hash,
      'detected_at', i.detected_at
    )
    order by i.detected_at asc
  ) filter (where i.id is not null) as issues
from audit_hash_chain_verification_runs vr
left join audit_hash_chain_verification_issues i
  on i.verification_run_id = vr.id
group by vr.id;

create table if not exists audit_hash_chain_anchors (
  id uuid primary key default gen_random_uuid(),
  chain_key text not null default 'global_audit_chain',
  latest_sequence_number bigint not null,
  latest_chain_hash text not null,
  anchor_type text not null,
  anchor_uri text,
  anchored_by_admin_id uuid references admin_users(id),
  metadata jsonb not null default '{}'::jsonb,
  anchored_at timestamptz not null default now(),
  constraint audit_hash_chain_anchors_type_check
    check (anchor_type in ('manual_export', 's3_object_lock', 'git_commit', 'external_audit', 'blockchain', 'other'))
);
create index if not exists audit_hash_chain_anchors_chain_idx
on audit_hash_chain_anchors (chain_key, anchored_at desc);

create or replace function register_audit_hash_chain_anchor(
  p_chain_key text,
  p_anchor_type text,
  p_anchor_uri text default null,
  p_anchored_by_admin_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_latest audit_hash_chain_entries%rowtype;
  v_anchor_id uuid;
begin
  select *
  into v_latest
  from audit_hash_chain_entries
  where chain_key = p_chain_key
    and status = 'active'
  order by sequence_number desc
  limit 1;

  if v_latest.id is null then
    raise exception 'no audit chain entries found for chain %', p_chain_key;
  end if;

  insert into audit_hash_chain_anchors (
    chain_key, latest_sequence_number, latest_chain_hash, anchor_type, anchor_uri, anchored_by_admin_id, metadata
  )
  values (
    p_chain_key, v_latest.sequence_number, v_latest.chain_hash, p_anchor_type, p_anchor_uri, p_anchored_by_admin_id, coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_anchor_id;

  return v_anchor_id;
end;
$$;
