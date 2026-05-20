create table if not exists audit_hash_chain_entries (
  id uuid primary key default gen_random_uuid(),

  chain_key text not null default 'global_audit_chain',

  source_type text not null,
  source_id uuid not null,

  sequence_number bigint not null,

  event_payload jsonb not null,

  previous_hash text,
  event_hash text not null,
  chain_hash text not null,

  hash_algorithm text not null default 'sha256',

  status text not null default 'active',

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint audit_hash_chain_entries_status_check
  check (
    status in (
      'active',
      'voided'
    )
  ),

  constraint audit_hash_chain_entries_hash_algorithm_check
  check (
    hash_algorithm in (
      'sha256'
    )
  )
);

create unique index if not exists audit_hash_chain_entries_source_unique
on audit_hash_chain_entries (source_type, source_id);

create unique index if not exists audit_hash_chain_entries_sequence_unique
on audit_hash_chain_entries (chain_key, sequence_number);

create index if not exists audit_hash_chain_entries_chain_idx
on audit_hash_chain_entries (chain_key, sequence_number desc);

create index if not exists audit_hash_chain_entries_source_idx
on audit_hash_chain_entries (source_type, source_id);

create index if not exists audit_hash_chain_entries_created_idx
on audit_hash_chain_entries (created_at desc);

create table if not exists audit_hash_chain_verification_runs (
  id uuid primary key default gen_random_uuid(),

  chain_key text not null default 'global_audit_chain',

  status text not null default 'processing',

  checked_entry_count integer not null default 0,
  broken_entry_count integer not null default 0,

  first_broken_sequence_number bigint,

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,

  failure_reason text,

  metadata jsonb not null default '{}'::jsonb,

  constraint audit_hash_chain_verification_runs_status_check
  check (
    status in (
      'processing',
      'completed',
      'failed'
    )
  )
);

create index if not exists audit_hash_chain_verification_runs_started_idx
on audit_hash_chain_verification_runs (started_at desc);

create index if not exists audit_hash_chain_verification_runs_chain_idx
on audit_hash_chain_verification_runs (chain_key, started_at desc);

create table if not exists audit_hash_chain_verification_issues (
  id uuid primary key default gen_random_uuid(),

  verification_run_id uuid not null references audit_hash_chain_verification_runs(id),

  chain_key text not null,

  audit_hash_chain_entry_id uuid references audit_hash_chain_entries(id),

  sequence_number bigint,

  source_type text,
  source_id uuid,

  issue_type text not null,

  expected_hash text,
  actual_hash text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint audit_hash_chain_verification_issues_type_check
  check (
    issue_type in (
      'missing_previous_hash',
      'event_hash_mismatch',
      'chain_hash_mismatch',
      'sequence_gap',
      'duplicate_sequence',
      'missing_entry'
    )
  )
);

create index if not exists audit_hash_chain_verification_issues_run_idx
on audit_hash_chain_verification_issues (verification_run_id);

create index if not exists audit_hash_chain_verification_issues_source_idx
on audit_hash_chain_verification_issues (source_type, source_id);

create index if not exists audit_hash_chain_verification_issues_sequence_idx
on audit_hash_chain_verification_issues (chain_key, sequence_number);

create table if not exists audit_hash_chain_anchors (
  id uuid primary key default gen_random_uuid(),

  chain_key text not null default 'global_audit_chain',

  sequence_number bigint not null,
  chain_hash text not null,

  anchor_type text not null default 'manual',

  external_reference text,
  external_uri text,

  anchored_by text,

  metadata jsonb not null default '{}'::jsonb,

  anchored_at timestamptz not null default now(),

  constraint audit_hash_chain_anchors_type_check
  check (
    anchor_type in (
      'manual',
      'scheduled',
      'external_storage',
      'blockchain',
      'notary'
    )
  )
);

create unique index if not exists audit_hash_chain_anchors_unique
on audit_hash_chain_anchors (chain_key, sequence_number, anchor_type);

create index if not exists audit_hash_chain_anchors_chain_idx
on audit_hash_chain_anchors (chain_key, sequence_number desc);

create or replace function audit_sha256_jsonb(
  p_payload jsonb
)
returns text
language sql
immutable
as $$
  select encode(
    digest(
      convert_to(p_payload::text, 'UTF8'),
      'sha256'
    ),
    'hex'
  );
$$;

create or replace function append_audit_hash_chain_entry(
  p_source_type text,
  p_source_id uuid,
  p_event_payload jsonb,
  p_chain_key text default 'global_audit_chain',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_existing_id uuid;

  v_previous_sequence bigint;
  v_next_sequence bigint;

  v_previous_hash text;
  v_event_hash text;
  v_chain_hash text;

  v_entry_id uuid;
begin
  if p_source_type is null or length(trim(p_source_type)) = 0 then
    raise exception 'source type is required';
  end if;

  if p_source_id is null then
    raise exception 'source id is required';
  end if;

  if p_event_payload is null then
    raise exception 'event payload is required';
  end if;

  select id
  into v_existing_id
  from audit_hash_chain_entries
  where source_type = p_source_type
    and source_id = p_source_id;

  if v_existing_id is not null then
    return v_existing_id;
  end if;

  perform pg_advisory_xact_lock(hashtext(coalesce(p_chain_key, 'global_audit_chain')));

  select sequence_number, chain_hash
  into v_previous_sequence, v_previous_hash
  from audit_hash_chain_entries
  where chain_key = coalesce(p_chain_key, 'global_audit_chain')
    and status = 'active'
  order by sequence_number desc
  limit 1;

  v_next_sequence := coalesce(v_previous_sequence, 0) + 1;

  v_event_hash := audit_sha256_jsonb(p_event_payload);

  v_chain_hash := encode(
    digest(
      convert_to(
        coalesce(v_previous_hash, '') || ':' || v_event_hash || ':' || v_next_sequence::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  insert into audit_hash_chain_entries (
    chain_key,
    source_type,
    source_id,
    sequence_number,
    event_payload,
    previous_hash,
    event_hash,
    chain_hash,
    hash_algorithm,
    status,
    metadata
  )
  values (
    coalesce(p_chain_key, 'global_audit_chain'),
    p_source_type,
    p_source_id,
    v_next_sequence,
    p_event_payload,
    v_previous_hash,
    v_event_hash,
    v_chain_hash,
    'sha256',
    'active',
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_entry_id;

  return v_entry_id;
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
  v_entry wallet_ledger_entries%rowtype;
  v_payload jsonb;
begin
  select *
  into v_entry
  from wallet_ledger_entries
  where id = p_wallet_ledger_entry_id;

  if v_entry.id is null then
    raise exception 'wallet ledger entry not found: %', p_wallet_ledger_entry_id;
  end if;

  v_payload := jsonb_build_object(
    'source_type', 'wallet_ledger_entry',
    'source_id', v_entry.id,
    'wallet_id', v_entry.wallet_id,
    'user_id', v_entry.user_id,
    'currency_code', v_entry.currency_code,
    'entry_type', v_entry.entry_type,
    'source_type_ref', v_entry.source_type,
    'source_id_ref', v_entry.source_id,
    'available_impact_minor', v_entry.available_impact_minor,
    'pending_impact_minor', v_entry.pending_impact_minor,
    'locked_impact_minor', v_entry.locked_impact_minor,
    'status', v_entry.status,
    'idempotency_key', v_entry.idempotency_key,
    'created_at', v_entry.created_at
  );

  return append_audit_hash_chain_entry(
    'wallet_ledger_entry',
    v_entry.id,
    v_payload,
    'global_audit_chain',
    p_metadata
  );
end;
$$;

create or replace function hash_accounting_journal_entry(
  p_journal_entry_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_journal accounting_journal_entries%rowtype;
  v_lines jsonb;
  v_payload jsonb;
begin
  select *
  into v_journal
  from accounting_journal_entries
  where id = p_journal_entry_id;

  if v_journal.id is null then
    raise exception 'accounting journal entry not found: %', p_journal_entry_id;
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'account_key', account_key,
      'line_type', line_type,
      'amount_minor', amount_minor,
      'currency_code', currency_code,
      'memo', memo
    )
    order by created_at asc, id asc
  )
  into v_lines
  from accounting_journal_lines
  where journal_entry_id = v_journal.id;

  v_payload := jsonb_build_object(
    'source_type', 'accounting_journal_entry',
    'source_id', v_journal.id,
    'journal_key', v_journal.journal_key,
    'source_type_ref', v_journal.source_type,
    'source_id_ref', v_journal.source_id,
    'status', v_journal.status,
    'description', v_journal.description,
    'currency_code', v_journal.currency_code,
    'total_debit_minor', v_journal.total_debit_minor,
    'total_credit_minor', v_journal.total_credit_minor,
    'posted_at', v_journal.posted_at,
    'lines', coalesce(v_lines, '[]'::jsonb)
  );

  return append_audit_hash_chain_entry(
    'accounting_journal_entry',
    v_journal.id,
    v_payload,
    'global_audit_chain',
    p_metadata
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
  v_group reward_issuance_groups%rowtype;
  v_payload jsonb;
begin
  select *
  into v_group
  from reward_issuance_groups
  where id = p_reward_issuance_group_id;

  if v_group.id is null then
    raise exception 'reward issuance group not found: %', p_reward_issuance_group_id;
  end if;

  v_payload := jsonb_build_object(
    'source_type', 'reward_issuance_group',
    'source_id', v_group.id,
    'attention_event_id', v_group.attention_event_id,
    'user_id', v_group.user_id,
    'wallet_id', v_group.wallet_id,
    'campaign_id', v_group.campaign_id,
    'currency_code', v_group.currency_code,
    'reward_amount_minor', v_group.reward_amount_minor,
    'status', v_group.status,
    'campaign_budget_reservation_id', v_group.campaign_budget_reservation_id,
    'wallet_value_lot_id', v_group.wallet_value_lot_id,
    'wallet_ledger_entry_id', v_group.wallet_ledger_entry_id,
    'idempotency_key', v_group.idempotency_key,
    'completed_at', v_group.completed_at,
    'created_at', v_group.created_at
  );

  return append_audit_hash_chain_entry(
    'reward_issuance_group',
    v_group.id,
    v_payload,
    'global_audit_chain',
    p_metadata
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
  v_payload jsonb;
begin
  select *
  into v_event
  from attention_verification_events
  where id = p_attention_event_id;

  if v_event.id is null then
    raise exception 'attention event not found: %', p_attention_event_id;
  end if;

  v_payload := jsonb_build_object(
    'source_type', 'attention_verification_event',
    'source_id', v_event.id,
    'attention_session_id', v_event.attention_session_id,
    'user_id', v_event.user_id,
    'wallet_id', v_event.wallet_id,
    'campaign_id', v_event.campaign_id,
    'model_version', v_event.model_version,
    'pipeline_version', v_event.pipeline_version,
    'runtime_signal_schema_version', v_event.runtime_signal_schema_version,
    'scoring_formula_version', v_event.scoring_formula_version,
    'decision', v_event.decision,
    'decision_reason', v_event.decision_reason,
    'attention_score', v_event.attention_score,
    'confidence_score', v_event.confidence_score,
    'fraud_risk_score', v_event.fraud_risk_score,
    'quality_score', v_event.quality_score,
    'reward_eligible', v_event.reward_eligible,
    'reward_issued', v_event.reward_issued,
    'reward_id', v_event.reward_id,
    'idempotency_key', v_event.idempotency_key,
    'occurred_at', v_event.occurred_at
  );

  return append_audit_hash_chain_entry(
    'attention_verification_event',
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
);

create table if not exists audit_hash_backfill_runs (
  id uuid primary key default gen_random_uuid(),

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
  check (
    status in (
      'processing',
      'completed',
      'failed'
    )
  )
);

create index if not exists audit_hash_backfill_runs_started_idx
on audit_hash_backfill_runs (started_at desc);

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

  v_row record;
  v_prev record;

  v_expected_event_hash text;
  v_expected_chain_hash text;

  v_checked integer := 0;
  v_broken integer := 0;
  v_first_broken bigint;
begin
  if p_batch_size <= 0 then
    raise exception 'batch size must be positive';
  end if;

  insert into audit_hash_chain_verification_runs (
    chain_key,
    status,
    metadata
  )
  values (
    coalesce(p_chain_key, 'global_audit_chain'),
    'processing',
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_run_id;

  v_prev := null;

  for v_row in
    select *
    from audit_hash_chain_entries
    where chain_key = coalesce(p_chain_key, 'global_audit_chain')
      and status = 'active'
    order by sequence_number asc
    limit p_batch_size
  loop
    v_checked := v_checked + 1;

    v_expected_event_hash := audit_sha256_jsonb(v_row.event_payload);

    if v_expected_event_hash <> v_row.event_hash then
      v_broken := v_broken + 1;
      v_first_broken := coalesce(v_first_broken, v_row.sequence_number);

      insert into audit_hash_chain_verification_issues (
        verification_run_id,
        chain_key,
        audit_hash_chain_entry_id,
        sequence_number,
        source_type,
        source_id,
        issue_type,
        expected_hash,
        actual_hash,
        metadata
      )
      values (
        v_run_id,
        v_row.chain_key,
        v_row.id,
        v_row.sequence_number,
        v_row.source_type,
        v_row.source_id,
        'event_hash_mismatch',
        v_expected_event_hash,
        v_row.event_hash,
        p_metadata
      );
    end if;

    v_expected_chain_hash := encode(
      digest(
        convert_to(
          coalesce(v_row.previous_hash, '') || ':' || v_row.event_hash || ':' || v_row.sequence_number::text,
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    );

    if v_expected_chain_hash <> v_row.chain_hash then
      v_broken := v_broken + 1;
      v_first_broken := coalesce(v_first_broken, v_row.sequence_number);

      insert into audit_hash_chain_verification_issues (
        verification_run_id,
        chain_key,
        audit_hash_chain_entry_id,
        sequence_number,
        source_type,
        source_id,
        issue_type,
        expected_hash,
        actual_hash,
        metadata
      )
      values (
        v_run_id,
        v_row.chain_key,
        v_row.id,
        v_row.sequence_number,
        v_row.source_type,
        v_row.source_id,
        'chain_hash_mismatch',
        v_expected_chain_hash,
        v_row.chain_hash,
        p_metadata
      );
    end if;

    if v_prev.id is not null then
      if v_row.previous_hash <> v_prev.chain_hash then
        v_broken := v_broken + 1;
        v_first_broken := coalesce(v_first_broken, v_row.sequence_number);

        insert into audit_hash_chain_verification_issues (
          verification_run_id,
          chain_key,
          audit_hash_chain_entry_id,
          sequence_number,
          source_type,
          source_id,
          issue_type,
          expected_hash,
          actual_hash,
          metadata
        )
        values (
          v_run_id,
          v_row.chain_key,
          v_row.id,
          v_row.sequence_number,
          v_row.source_type,
          v_row.source_id,
          'missing_previous_hash',
          v_prev.chain_hash,
          v_row.previous_hash,
          p_metadata
        );
      end if;

      if v_row.sequence_number <> v_prev.sequence_number + 1 then
        v_broken := v_broken + 1;
        v_first_broken := coalesce(v_first_broken, v_row.sequence_number);

        insert into audit_hash_chain_verification_issues (
          verification_run_id,
          chain_key,
          audit_hash_chain_entry_id,
          sequence_number,
          source_type,
          source_id,
          issue_type,
          expected_hash,
          actual_hash,
          metadata
        )
        values (
          v_run_id,
          v_row.chain_key,
          v_row.id,
          v_row.sequence_number,
          v_row.source_type,
          v_row.source_id,
          'sequence_gap',
          (v_prev.sequence_number + 1)::text,
          v_row.sequence_number::text,
          p_metadata
        );
      end if;
    end if;

    v_prev := v_row;
  end loop;

  update audit_hash_chain_verification_runs
  set
    status = 'completed',
    completed_at = now(),
    checked_entry_count = v_checked,
    broken_entry_count = v_broken,
    first_broken_sequence_number = v_first_broken
  where id = v_run_id;

  return v_run_id;

exception
  when others then
    if v_run_id is not null then
      update audit_hash_chain_verification_runs
      set
        status = 'failed',
        failed_at = now(),
        failure_reason = sqlerrm
      where id = v_run_id;
    end if;

    raise;
end;
$$;

create or replace function register_audit_hash_chain_anchor(
  p_chain_key text default 'global_audit_chain',
  p_sequence_number bigint default null,
  p_anchor_type text default 'manual',
  p_external_reference text default null,
  p_external_uri text default null,
  p_anchored_by text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_entry audit_hash_chain_entries%rowtype;
  v_anchor_id uuid;
begin
  if p_sequence_number is null then
    select *
    into v_entry
    from audit_hash_chain_entries
    where chain_key = coalesce(p_chain_key, 'global_audit_chain')
      and status = 'active'
    order by sequence_number desc
    limit 1;
  else
    select *
    into v_entry
    from audit_hash_chain_entries
    where chain_key = coalesce(p_chain_key, 'global_audit_chain')
      and sequence_number = p_sequence_number
      and status = 'active';
  end if;

  if v_entry.id is null then
    raise exception 'audit hash chain entry not found for anchor';
  end if;

  insert into audit_hash_chain_anchors (
    chain_key,
    sequence_number,
    chain_hash,
    anchor_type,
    external_reference,
    external_uri,
    anchored_by,
    metadata
  )
  values (
    v_entry.chain_key,
    v_entry.sequence_number,
    v_entry.chain_hash,
    coalesce(p_anchor_type, 'manual'),
    p_external_reference,
    p_external_uri,
    p_anchored_by,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (chain_key, sequence_number, anchor_type)
  do update set
    external_reference = excluded.external_reference,
    external_uri = excluded.external_uri,
    anchored_by = excluded.anchored_by,
    metadata = audit_hash_chain_anchors.metadata || excluded.metadata,
    anchored_at = now()
  returning id into v_anchor_id;

  return v_anchor_id;
end;
$$;

create or replace view audit_hash_chain_dashboard as
select
  chain_key,

  count(*) as entry_count,

  min(sequence_number) as first_sequence_number,
  max(sequence_number) as latest_sequence_number,

  max(created_at) as latest_entry_at,

  (
    select source_type
    from audit_hash_chain_entries e2
    where e2.chain_key = e.chain_key
    order by sequence_number desc
    limit 1
  ) as latest_source_type,

  (
    select source_id
    from audit_hash_chain_entries e2
    where e2.chain_key = e.chain_key
    order by sequence_number desc
    limit 1
  ) as latest_source_id,

  (
    select chain_hash
    from audit_hash_chain_entries e2
    where e2.chain_key = e.chain_key
    order by sequence_number desc
    limit 1
  ) as latest_chain_hash,

  (
    select count(*)
    from audit_hash_missing_records
  ) as missing_hash_record_count,

  (
    select count(*)
    from audit_hash_chain_verification_runs r
    where r.chain_key = e.chain_key
      and r.status = 'completed'
      and r.broken_entry_count > 0
      and r.started_at >= now() - interval '24 hours'
  ) as broken_verification_runs_24h

from audit_hash_chain_entries e
where status = 'active'
group by chain_key;

create or replace view audit_hash_chain_verification_dashboard as
select
  r.id as verification_run_id,
  r.chain_key,
  r.status,
  r.checked_entry_count,
  r.broken_entry_count,
  r.first_broken_sequence_number,
  r.started_at,
  r.completed_at,
  r.failed_at,
  r.failure_reason,

  jsonb_agg(
    jsonb_build_object(
      'issue_id', i.id,
      'issue_type', i.issue_type,
      'sequence_number', i.sequence_number,
      'source_type', i.source_type,
      'source_id', i.source_id,
      'expected_hash', i.expected_hash,
      'actual_hash', i.actual_hash,
      'created_at', i.created_at
    )
    order by i.sequence_number asc
  ) filter (where i.id is not null) as issues

from audit_hash_chain_verification_runs r
left join audit_hash_chain_verification_issues i
  on i.verification_run_id = r.id
group by r.id
order by r.started_at desc;
