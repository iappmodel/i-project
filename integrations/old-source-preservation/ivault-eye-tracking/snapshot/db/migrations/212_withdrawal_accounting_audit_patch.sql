-- Step 9.1 — Wire withdrawal accounting mirror + audit hashing

create or replace function mirror_accounting_withdrawal_reserved(
  p_withdrawal_request_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request withdrawal_requests%rowtype;
  v_journal_id uuid;
begin
  if p_withdrawal_request_id is null then
    raise exception 'withdrawal request id is required';
  end if;

  select *
  into v_request
  from withdrawal_requests
  where id = p_withdrawal_request_id;

  if v_request.id is null then
    raise exception 'withdrawal request not found: %', p_withdrawal_request_id;
  end if;

  if v_request.status not in ('reserved', 'submitted', 'processing', 'paid', 'failed') then
    raise exception 'withdrawal must be reserved or later before reserve accounting mirror';
  end if;

  v_journal_id := create_accounting_journal_entry(
    'withdrawal_reserved:' || v_request.id::text,
    'withdrawal_request',
    v_request.id,
    'Withdrawal funds reserved into payout payable',
    jsonb_build_array(
      jsonb_build_object(
        'line_type', 'debit',
        'account_key', 'user_wallet_liability_usd',
        'amount_minor', v_request.requested_amount_minor,
        'memo', 'Reduce user wallet liability for reserved withdrawal'
      ),
      jsonb_build_object(
        'line_type', 'credit',
        'account_key', 'payout_payable_usd',
        'amount_minor', v_request.requested_amount_minor,
        'memo', 'Increase payout payable'
      )
    ),
    v_request.currency_code,
    p_metadata || jsonb_build_object(
      'withdrawal_request_id', v_request.id,
      'wallet_id', v_request.wallet_id,
      'user_id', v_request.user_id
    )
  );

  return v_journal_id;
end;
$$;

create or replace function mirror_accounting_withdrawal_paid(
  p_withdrawal_request_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request withdrawal_requests%rowtype;
  v_journal_id uuid;
begin
  if p_withdrawal_request_id is null then
    raise exception 'withdrawal request id is required';
  end if;

  select *
  into v_request
  from withdrawal_requests
  where id = p_withdrawal_request_id;

  if v_request.id is null then
    raise exception 'withdrawal request not found: %', p_withdrawal_request_id;
  end if;

  if v_request.status <> 'paid' then
    raise exception 'withdrawal must be paid before paid accounting mirror';
  end if;

  v_journal_id := create_accounting_journal_entry(
    'withdrawal_paid:' || v_request.id::text,
    'withdrawal_request',
    v_request.id,
    'Withdrawal paid from payout payable to cash',
    jsonb_build_array(
      jsonb_build_object(
        'line_type', 'debit',
        'account_key', 'payout_payable_usd',
        'amount_minor', v_request.requested_amount_minor,
        'memo', 'Reduce payout payable after payout paid'
      ),
      jsonb_build_object(
        'line_type', 'credit',
        'account_key', 'cash_usd',
        'amount_minor', v_request.net_amount_minor,
        'memo', 'Cash paid to user'
      ),
      jsonb_build_object(
        'line_type', 'credit',
        'account_key', 'cash_usd',
        'amount_minor', v_request.processor_fee_minor,
        'memo', 'Processor fee paid'
      )
    ),
    v_request.currency_code,
    p_metadata || jsonb_build_object(
      'withdrawal_request_id', v_request.id,
      'external_payout_id', v_request.external_payout_id,
      'wallet_id', v_request.wallet_id,
      'user_id', v_request.user_id
    )
  );

  return v_journal_id;
end;
$$;

create or replace function mirror_accounting_withdrawal_failed_released(
  p_withdrawal_request_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request withdrawal_requests%rowtype;
  v_journal_id uuid;
begin
  if p_withdrawal_request_id is null then
    raise exception 'withdrawal request id is required';
  end if;

  select *
  into v_request
  from withdrawal_requests
  where id = p_withdrawal_request_id;

  if v_request.id is null then
    raise exception 'withdrawal request not found: %', p_withdrawal_request_id;
  end if;

  if v_request.status <> 'failed' then
    raise exception 'withdrawal must be failed before release accounting mirror';
  end if;

  v_journal_id := create_accounting_journal_entry(
    'withdrawal_failed_released:' || v_request.id::text,
    'withdrawal_request',
    v_request.id,
    'Failed withdrawal released back to user wallet liability',
    jsonb_build_array(
      jsonb_build_object(
        'line_type', 'debit',
        'account_key', 'payout_payable_usd',
        'amount_minor', v_request.requested_amount_minor,
        'memo', 'Reduce payout payable after failed payout'
      ),
      jsonb_build_object(
        'line_type', 'credit',
        'account_key', 'user_wallet_liability_usd',
        'amount_minor', v_request.requested_amount_minor,
        'memo', 'Restore user wallet liability'
      )
    ),
    v_request.currency_code,
    p_metadata || jsonb_build_object(
      'withdrawal_request_id', v_request.id,
      'wallet_id', v_request.wallet_id,
      'user_id', v_request.user_id,
      'failure_reason', v_request.failure_reason
    )
  );

  return v_journal_id;
end;
$$;

-- Backward compatibility with older function name/signature.
create or replace function mirror_accounting_withdrawal_failed(
  p_withdrawal_request_id uuid,
  p_wallet_id uuid,
  p_user_id uuid,
  p_amount_minor bigint,
  p_currency_code text default 'USD',
  p_failure_reason text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  return mirror_accounting_withdrawal_failed_released(
    p_withdrawal_request_id,
    p_metadata || jsonb_build_object(
      'legacy_wallet_id', p_wallet_id,
      'legacy_user_id', p_user_id,
      'legacy_amount_minor', p_amount_minor,
      'legacy_currency_code', p_currency_code,
      'legacy_failure_reason', p_failure_reason
    )
  );
end;
$$;

create or replace function run_accounting_mirror_job(
  p_batch_size integer default 500,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid;
  v_row record;

  v_scanned integer := 0;
  v_mirrored integer := 0;
  v_failed integer := 0;
begin
  if p_batch_size <= 0 then
    raise exception 'batch size must be positive';
  end if;

  insert into accounting_mirror_runs (
    run_type,
    status,
    metadata
  )
  values (
    'scheduled',
    'processing',
    p_metadata
  )
  returning id into v_run_id;

  for v_row in
    select
      'reward_issued'::text as mirror_type,
      rig.id as source_id
    from reward_issuance_groups rig
    where rig.status = 'completed'
      and not exists (
        select 1
        from accounting_journal_entries aje
        where aje.journal_key = 'reward_issued:' || rig.id::text
          and aje.status = 'posted'
      )
    order by rig.completed_at asc nulls last, rig.created_at asc
    limit p_batch_size
  loop
    v_scanned := v_scanned + 1;
    begin
      perform mirror_accounting_reward_issued(
        v_row.source_id,
        p_metadata || jsonb_build_object('accounting_mirror_run_id', v_run_id)
      );
      v_mirrored := v_mirrored + 1;
    exception
      when others then
        v_failed := v_failed + 1;
    end;
  end loop;

  for v_row in
    select
      'withdrawal_reserved'::text as mirror_type,
      wr.id as source_id
    from withdrawal_requests wr
    where wr.status in ('reserved', 'submitted', 'processing', 'paid', 'failed')
      and not exists (
        select 1
        from accounting_journal_entries aje
        where aje.journal_key = 'withdrawal_reserved:' || wr.id::text
          and aje.status = 'posted'
      )
    order by wr.reserved_at asc nulls last, wr.created_at asc
    limit p_batch_size
  loop
    v_scanned := v_scanned + 1;
    begin
      perform mirror_accounting_withdrawal_reserved(
        v_row.source_id,
        p_metadata || jsonb_build_object('accounting_mirror_run_id', v_run_id)
      );
      v_mirrored := v_mirrored + 1;
    exception
      when others then
        v_failed := v_failed + 1;
    end;
  end loop;

  for v_row in
    select
      'withdrawal_paid'::text as mirror_type,
      wr.id as source_id
    from withdrawal_requests wr
    where wr.status = 'paid'
      and not exists (
        select 1
        from accounting_journal_entries aje
        where aje.journal_key = 'withdrawal_paid:' || wr.id::text
          and aje.status = 'posted'
      )
    order by wr.paid_at asc nulls last, wr.created_at asc
    limit p_batch_size
  loop
    v_scanned := v_scanned + 1;
    begin
      perform mirror_accounting_withdrawal_paid(
        v_row.source_id,
        p_metadata || jsonb_build_object('accounting_mirror_run_id', v_run_id)
      );
      v_mirrored := v_mirrored + 1;
    exception
      when others then
        v_failed := v_failed + 1;
    end;
  end loop;

  for v_row in
    select
      'withdrawal_failed_released'::text as mirror_type,
      wr.id as source_id
    from withdrawal_requests wr
    where wr.status = 'failed'
      and not exists (
        select 1
        from accounting_journal_entries aje
        where aje.journal_key = 'withdrawal_failed_released:' || wr.id::text
          and aje.status = 'posted'
      )
    order by wr.failed_at asc nulls last, wr.created_at asc
    limit p_batch_size
  loop
    v_scanned := v_scanned + 1;
    begin
      perform mirror_accounting_withdrawal_failed_released(
        v_row.source_id,
        p_metadata || jsonb_build_object('accounting_mirror_run_id', v_run_id)
      );
      v_mirrored := v_mirrored + 1;
    exception
      when others then
        v_failed := v_failed + 1;
    end;
  end loop;

  update accounting_mirror_runs
  set
    status = 'completed',
    completed_at = now(),
    scanned_count = v_scanned,
    mirrored_count = v_mirrored,
    failed_count = v_failed
  where id = v_run_id;

  return v_run_id;

exception
  when others then
    if v_run_id is not null then
      update accounting_mirror_runs
      set
        status = 'failed',
        failed_at = now(),
        failure_reason = sqlerrm
      where id = v_run_id;
    end if;

    raise;
end;
$$;

create or replace view accounting_missing_money_mirrors as
select
  'reward_issued'::text as mirror_type,
  rig.id as source_id,
  rig.created_at
from reward_issuance_groups rig
where rig.status = 'completed'
  and not exists (
    select 1
    from accounting_journal_entries aje
    where aje.journal_key = 'reward_issued:' || rig.id::text
      and aje.status = 'posted'
  )

union all

select
  'withdrawal_reserved'::text as mirror_type,
  wr.id as source_id,
  wr.created_at
from withdrawal_requests wr
where wr.status in ('reserved', 'submitted', 'processing', 'paid', 'failed')
  and not exists (
    select 1
    from accounting_journal_entries aje
    where aje.journal_key = 'withdrawal_reserved:' || wr.id::text
      and aje.status = 'posted'
  )

union all

select
  'withdrawal_paid'::text as mirror_type,
  wr.id as source_id,
  wr.created_at
from withdrawal_requests wr
where wr.status = 'paid'
  and not exists (
    select 1
    from accounting_journal_entries aje
    where aje.journal_key = 'withdrawal_paid:' || wr.id::text
      and aje.status = 'posted'
  )

union all

select
  'withdrawal_failed_released'::text as mirror_type,
  wr.id as source_id,
  wr.created_at
from withdrawal_requests wr
where wr.status = 'failed'
  and not exists (
    select 1
    from accounting_journal_entries aje
    where aje.journal_key = 'withdrawal_failed_released:' || wr.id::text
      and aje.status = 'posted'
  );

create or replace view accounting_missing_reward_mirrors as
select
  rig.id as reward_issuance_group_id,
  rig.attention_event_id,
  rig.wallet_id,
  rig.user_id,
  rig.campaign_id,
  rig.reward_amount_minor,
  rig.completed_at
from reward_issuance_groups rig
where rig.status = 'completed'
  and not exists (
    select 1
    from accounting_journal_entries aje
    where aje.journal_key = 'reward_issued:' || rig.id::text
      and aje.status = 'posted'
  );

create or replace view money_integrity_dashboard as
select
  (
    select count(*)
    from accounting_unbalanced_journals
  ) as unbalanced_journal_count,

  (
    select count(*)
    from accounting_missing_money_mirrors
  ) as missing_money_mirror_count,

  (
    select count(*)
    from accounting_missing_reward_mirrors
  ) as missing_reward_mirror_count,

  (
    select coalesce(sum(balance_minor), 0)
    from accounting_account_balances
    where account_key = 'user_wallet_liability_usd'
  ) as accounting_user_wallet_liability_minor,

  (
    select coalesce(sum(balance_minor), 0)
    from accounting_account_balances
    where account_key = 'payout_payable_usd'
  ) as accounting_payout_payable_minor,

  (
    select coalesce(sum(total_balance_minor), 0)
    from wallets
  ) as wallet_total_balance_minor,

  (
    select coalesce(sum(requested_amount_minor), 0)
    from withdrawal_requests
    where status in ('reserved', 'submitted', 'processing')
  ) as withdrawal_reserved_payable_minor,

  (
    (
      select coalesce(sum(balance_minor), 0)
      from accounting_account_balances
      where account_key = 'user_wallet_liability_usd'
    )
    +
    (
      select coalesce(sum(balance_minor), 0)
      from accounting_account_balances
      where account_key = 'payout_payable_usd'
    )
    -
    (
      select coalesce(sum(total_balance_minor), 0)
      from wallets
    )
  ) as wallet_vs_accounting_delta_minor,

  now() as checked_at;

create or replace function hash_withdrawal_request(
  p_withdrawal_request_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request withdrawal_requests%rowtype;
  v_payload jsonb;
begin
  select *
  into v_request
  from withdrawal_requests
  where id = p_withdrawal_request_id;

  if v_request.id is null then
    raise exception 'withdrawal request not found: %', p_withdrawal_request_id;
  end if;

  v_payload := jsonb_build_object(
    'source_type', 'withdrawal_request',
    'source_id', v_request.id,
    'user_id', v_request.user_id,
    'wallet_id', v_request.wallet_id,
    'currency_code', v_request.currency_code,
    'requested_amount_minor', v_request.requested_amount_minor,
    'processor_fee_minor', v_request.processor_fee_minor,
    'net_amount_minor', v_request.net_amount_minor,
    'provider_key', v_request.provider_key,
    'status', v_request.status,
    'trust_gate_decision', v_request.trust_gate_decision,
    'external_payout_id', v_request.external_payout_id,
    'idempotency_key', v_request.idempotency_key,
    'requested_at', v_request.requested_at,
    'reserved_at', v_request.reserved_at,
    'submitted_at', v_request.submitted_at,
    'paid_at', v_request.paid_at,
    'failed_at', v_request.failed_at,
    'created_at', v_request.created_at
  );

  return append_audit_hash_chain_entry(
    'withdrawal_request',
    v_request.id,
    v_payload,
    'global_audit_chain',
    p_metadata
  );
end;
$$;

create or replace function hash_external_payout(
  p_external_payout_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_payout external_payouts%rowtype;
  v_payload jsonb;
begin
  select *
  into v_payout
  from external_payouts
  where id = p_external_payout_id;

  if v_payout.id is null then
    raise exception 'external payout not found: %', p_external_payout_id;
  end if;

  v_payload := jsonb_build_object(
    'source_type', 'external_payout',
    'source_id', v_payout.id,
    'withdrawal_request_id', v_payout.withdrawal_request_id,
    'provider_key', v_payout.provider_key,
    'provider_payout_id', v_payout.provider_payout_id,
    'provider_transfer_id', v_payout.provider_transfer_id,
    'processor_reference', v_payout.processor_reference,
    'currency_code', v_payout.currency_code,
    'amount_minor', v_payout.amount_minor,
    'fee_minor', v_payout.fee_minor,
    'net_amount_minor', v_payout.net_amount_minor,
    'status', v_payout.status,
    'submitted_at', v_payout.submitted_at,
    'paid_at', v_payout.paid_at,
    'failed_at', v_payout.failed_at,
    'created_at', v_payout.created_at
  );

  return append_audit_hash_chain_entry(
    'external_payout',
    v_payout.id,
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
    'WITHDRAWAL_NOT_FOUND',
    'wallet',
    'medium',
    404,
    false,
    true,
    'Withdrawal not found.',
    'Withdrawal request not found.',
    'wallet'
  ),
  (
    'WITHDRAWAL_INVALID_STATE',
    'wallet',
    'medium',
    409,
    false,
    true,
    'Withdrawal cannot be processed in its current state.',
    'Withdrawal state transition invalid.',
    'wallet'
  ),
  (
    'WITHDRAWAL_RESERVE_FAILED',
    'wallet',
    'high',
    500,
    true,
    false,
    'Withdrawal processing failed.',
    'Withdrawal reserve failed.',
    'wallet'
  ),
  (
    'WITHDRAWAL_INTEGRITY_FAILED',
    'wallet',
    'critical',
    500,
    false,
    false,
    'A withdrawal consistency error occurred.',
    'Withdrawal integrity check failed.',
    'wallet'
  )
on conflict (error_code)
do update set
  category = excluded.category,
  severity = excluded.severity,
  http_status = excluded.http_status,
  retryable = excluded.retryable,
  user_visible = excluded.user_visible,
  user_message = excluded.user_message,
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
  ('withdrawal request not found', 'WITHDRAWAL_NOT_FOUND', 10, '{}'::jsonb),
  ('withdrawal must be approved before reserve', 'WITHDRAWAL_INVALID_STATE', 10, '{}'::jsonb),
  ('withdrawal must be reserved before submit', 'WITHDRAWAL_INVALID_STATE', 10, '{}'::jsonb),
  ('withdrawal must be submitted/processing before paid', 'WITHDRAWAL_INVALID_STATE', 10, '{}'::jsonb),
  ('withdrawal cannot fail/release from status', 'WITHDRAWAL_INVALID_STATE', 10, '{}'::jsonb),
  ('reserved withdrawal lot sum mismatch', 'WITHDRAWAL_INTEGRITY_FAILED', 10, '{}'::jsonb),
  ('unable to reserve exact withdrawal amount', 'WITHDRAWAL_RESERVE_FAILED', 10, '{}'::jsonb)
on conflict do nothing;

alter table system_health_snapshots
add column if not exists withdrawal_requested_count bigint not null default 0,
add column if not exists withdrawal_reserved_count bigint not null default 0,
add column if not exists withdrawal_submitted_count bigint not null default 0,
add column if not exists withdrawal_paid_count_24h bigint not null default 0,
add column if not exists withdrawal_failed_count_24h bigint not null default 0,
add column if not exists withdrawal_integrity_issue_count bigint not null default 0;

create or replace function create_system_health_snapshot(
  p_snapshot_type text default 'scheduled',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_snapshot_id uuid;

  v_wallet_count bigint := 0;
  v_active_wallet_count bigint := 0;
  v_available bigint := 0;
  v_pending bigint := 0;
  v_locked bigint := 0;
  v_total bigint := 0;

  v_reward_pending bigint := 0;
  v_reward_completed_24h bigint := 0;
  v_reward_failed_24h bigint := 0;

  v_attention_events_1h bigint := 0;
  v_attention_passed_1h bigint := 0;
  v_attention_fraud_1h bigint := 0;

  v_unbalanced_journals bigint := 0;
  v_missing_reward_mirrors bigint := 0;
  v_wallet_accounting_delta bigint := 0;

  v_audit_missing bigint := 0;
  v_audit_broken_24h bigint := 0;

  v_failed_jobs_24h bigint := 0;
  v_critical_errors_1h bigint := 0;
  v_high_errors_1h bigint := 0;

  v_withdrawal_requested bigint := 0;
  v_withdrawal_reserved bigint := 0;
  v_withdrawal_submitted bigint := 0;
  v_withdrawal_paid_24h bigint := 0;
  v_withdrawal_failed_24h bigint := 0;
  v_withdrawal_integrity_issues bigint := 0;

  v_attention_pass_rate_1h numeric := 0;
  v_attention_fraud_rate_1h numeric := 0;

  v_status text := 'healthy';
begin
  select
    count(*),
    count(*) filter (where status = 'active'),
    coalesce(sum(available_balance_minor), 0),
    coalesce(sum(pending_balance_minor), 0),
    coalesce(sum(locked_balance_minor), 0),
    coalesce(sum(total_balance_minor), 0)
  into
    v_wallet_count,
    v_active_wallet_count,
    v_available,
    v_pending,
    v_locked,
    v_total
  from wallets;

  select
    count(*) filter (where status in ('pending', 'processing')),
    count(*) filter (
      where status = 'completed'
        and completed_at >= now() - interval '24 hours'
    ),
    count(*) filter (
      where status = 'failed'
        and failed_at >= now() - interval '24 hours'
    )
  into
    v_reward_pending,
    v_reward_completed_24h,
    v_reward_failed_24h
  from reward_issuance_groups;

  select
    count(*),
    count(*) filter (where decision = 'passed'),
    count(*) filter (where decision = 'fraud_suspected')
  into
    v_attention_events_1h,
    v_attention_passed_1h,
    v_attention_fraud_1h
  from attention_verification_events
  where occurred_at >= now() - interval '1 hour';

  v_attention_pass_rate_1h :=
    case
      when v_attention_events_1h > 0
      then v_attention_passed_1h::numeric / v_attention_events_1h
      else 0
    end;

  v_attention_fraud_rate_1h :=
    case
      when v_attention_events_1h > 0
      then v_attention_fraud_1h::numeric / v_attention_events_1h
      else 0
    end;

  select count(*)
  into v_unbalanced_journals
  from accounting_unbalanced_journals;

  select count(*)
  into v_missing_reward_mirrors
  from accounting_missing_reward_mirrors;

  select coalesce(wallet_vs_accounting_delta_minor, 0)
  into v_wallet_accounting_delta
  from money_integrity_dashboard
  limit 1;

  select count(*)
  into v_audit_missing
  from audit_hash_missing_records;

  select count(*)
  into v_audit_broken_24h
  from audit_hash_chain_verification_runs
  where status = 'completed'
    and broken_entry_count > 0
    and started_at >= now() - interval '24 hours';

  select count(*)
  into v_failed_jobs_24h
  from scheduled_job_runs
  where status = 'failed'
    and started_at >= now() - interval '24 hours';

  select
    count(*) filter (where severity = 'critical'),
    count(*) filter (where severity = 'high')
  into
    v_critical_errors_1h,
    v_high_errors_1h
  from error_events
  where occurred_at >= now() - interval '1 hour';

  select
    count(*) filter (where status = 'approved'),
    count(*) filter (where status = 'reserved'),
    count(*) filter (where status in ('submitted', 'processing')),
    count(*) filter (where status = 'paid' and paid_at >= now() - interval '24 hours'),
    count(*) filter (where status = 'failed' and failed_at >= now() - interval '24 hours')
  into
    v_withdrawal_requested,
    v_withdrawal_reserved,
    v_withdrawal_submitted,
    v_withdrawal_paid_24h,
    v_withdrawal_failed_24h
  from withdrawal_requests;

  select count(*)
  into v_withdrawal_integrity_issues
  from withdrawal_integrity_check
  where has_integrity_issue is true;

  v_status :=
    case
      when v_unbalanced_journals > 0
        or v_wallet_accounting_delta <> 0
        or v_audit_broken_24h > 0
        or v_critical_errors_1h > 0
        or v_withdrawal_integrity_issues > 0
      then 'critical'

      when v_missing_reward_mirrors > 0
        or v_audit_missing > 0
        or v_failed_jobs_24h >= 3
        or v_high_errors_1h >= 5
      then 'degraded'

      when v_reward_failed_24h > 0
        or v_failed_jobs_24h > 0
        or v_attention_fraud_rate_1h >= 0.10
      then 'warning'

      else 'healthy'
    end;

  insert into system_health_snapshots (
    snapshot_type,
    status,
    wallet_count,
    active_wallet_count,
    total_available_balance_minor,
    total_pending_balance_minor,
    total_locked_balance_minor,
    total_wallet_balance_minor,
    reward_pending_count,
    reward_completed_count_24h,
    reward_failed_count_24h,
    attention_event_count_1h,
    attention_passed_count_1h,
    attention_fraud_suspected_count_1h,
    unbalanced_journal_count,
    missing_reward_mirror_count,
    wallet_accounting_delta_minor,
    audit_missing_hash_record_count,
    audit_broken_verification_count_24h,
    failed_scheduled_job_count_24h,
    critical_error_count_1h,
    high_error_count_1h,
    withdrawal_requested_count,
    withdrawal_reserved_count,
    withdrawal_submitted_count,
    withdrawal_paid_count_24h,
    withdrawal_failed_count_24h,
    withdrawal_integrity_issue_count,
    metrics,
    metadata
  )
  values (
    coalesce(p_snapshot_type, 'scheduled'),
    v_status,
    v_wallet_count,
    v_active_wallet_count,
    v_available,
    v_pending,
    v_locked,
    v_total,
    v_reward_pending,
    v_reward_completed_24h,
    v_reward_failed_24h,
    v_attention_events_1h,
    v_attention_passed_1h,
    v_attention_fraud_1h,
    v_unbalanced_journals,
    v_missing_reward_mirrors,
    v_wallet_accounting_delta,
    v_audit_missing,
    v_audit_broken_24h,
    v_failed_jobs_24h,
    v_critical_errors_1h,
    v_high_errors_1h,
    v_withdrawal_requested,
    v_withdrawal_reserved,
    v_withdrawal_submitted,
    v_withdrawal_paid_24h,
    v_withdrawal_failed_24h,
    v_withdrawal_integrity_issues,
    jsonb_build_object(
      'attention_pass_rate_1h', v_attention_pass_rate_1h,
      'attention_fraud_rate_1h', v_attention_fraud_rate_1h
    ),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_snapshot_id;

  perform emit_platform_event(
    'system_health_snapshot_created',
    'system',
    case
      when v_status = 'critical' then 'critical'
      when v_status = 'degraded' then 'high'
      when v_status = 'warning' then 'warning'
      else 'info'
    end,
    'observability_engine',
    null,
    null,
    null,
    'system_health_snapshot',
    v_snapshot_id,
    null,
    null,
    'System health snapshot created',
    jsonb_build_object(
      'status', v_status,
      'wallet_accounting_delta_minor', v_wallet_accounting_delta,
      'unbalanced_journal_count', v_unbalanced_journals,
      'audit_missing_hash_record_count', v_audit_missing,
      'failed_scheduled_job_count_24h', v_failed_jobs_24h,
      'critical_error_count_1h', v_critical_errors_1h,
      'withdrawal_integrity_issue_count', v_withdrawal_integrity_issues
    ),
    p_metadata
  );

  return v_snapshot_id;
end;
$$;

create or replace view platform_operations_dashboard as
select
  shs.id as latest_snapshot_id,
  shs.status as system_status,
  shs.created_at as snapshot_at,
  shs.wallet_count,
  shs.active_wallet_count,
  shs.total_available_balance_minor,
  shs.total_pending_balance_minor,
  shs.total_locked_balance_minor,
  shs.total_wallet_balance_minor,
  shs.reward_pending_count,
  shs.reward_completed_count_24h,
  shs.reward_failed_count_24h,
  shs.attention_event_count_1h,
  shs.attention_passed_count_1h,
  shs.attention_fraud_suspected_count_1h,
  shs.unbalanced_journal_count,
  shs.missing_reward_mirror_count,
  shs.wallet_accounting_delta_minor,
  shs.audit_missing_hash_record_count,
  shs.audit_broken_verification_count_24h,
  shs.failed_scheduled_job_count_24h,
  shs.critical_error_count_1h,
  shs.high_error_count_1h,
  shs.withdrawal_requested_count,
  shs.withdrawal_reserved_count,
  shs.withdrawal_submitted_count,
  shs.withdrawal_paid_count_24h,
  shs.withdrawal_failed_count_24h,
  shs.withdrawal_integrity_issue_count,
  shs.metrics,
  (
    select jsonb_agg(
      jsonb_build_object(
        'job_key', job_key,
        'job_name', job_name,
        'job_group', job_group,
        'last_status', last_status,
        'last_failed_at', last_failed_at,
        'last_completed_at', last_completed_at,
        'alert_type', alert_type
      )
      order by last_failed_at desc nulls last
    )
    from scheduled_job_alerts
  ) as job_alerts,
  (
    select jsonb_agg(
      jsonb_build_object(
        'error_code', error_code,
        'category', category,
        'severity', severity,
        'owner_team', owner_team,
        'count_1h', count_1h,
        'count_24h', count_24h,
        'last_seen_at', last_seen_at
      )
      order by
        case severity
          when 'critical' then 1
          when 'high' then 2
          when 'medium' then 3
          else 4
        end,
        count_1h desc,
        count_24h desc
    )
    from error_event_dashboard
    where count_1h > 0
       or count_24h > 0
  ) as error_summary
from system_health_snapshots shs
order by shs.created_at desc
limit 1;

create or replace view admin_system_command_center as
select
  pod.latest_snapshot_id,
  pod.system_status,
  pod.snapshot_at,
  pod.wallet_count,
  pod.active_wallet_count,
  pod.total_available_balance_minor,
  pod.total_pending_balance_minor,
  pod.total_locked_balance_minor,
  pod.total_wallet_balance_minor,
  pod.reward_pending_count,
  pod.reward_completed_count_24h,
  pod.reward_failed_count_24h,
  pod.attention_event_count_1h,
  pod.attention_passed_count_1h,
  pod.attention_fraud_suspected_count_1h,
  pod.unbalanced_journal_count,
  pod.missing_reward_mirror_count,
  pod.wallet_accounting_delta_minor,
  pod.audit_missing_hash_record_count,
  pod.audit_broken_verification_count_24h,
  pod.failed_scheduled_job_count_24h,
  pod.critical_error_count_1h,
  pod.high_error_count_1h,
  pod.withdrawal_requested_count,
  pod.withdrawal_reserved_count,
  pod.withdrawal_submitted_count,
  pod.withdrawal_paid_count_24h,
  pod.withdrawal_failed_count_24h,
  pod.withdrawal_integrity_issue_count,
  pod.metrics,
  pod.job_alerts,
  pod.error_summary,
  (
    select jsonb_agg(
      jsonb_build_object(
        'alert_event_id', alert_event_id,
        'alert_key', alert_key,
        'alert_name', alert_name,
        'category', category,
        'severity', severity,
        'status', status,
        'metric_name', metric_name,
        'metric_value', metric_value,
        'threshold', threshold,
        'message', message,
        'created_at', created_at
      )
      order by
        case severity
          when 'critical' then 1
          when 'high' then 2
          else 3
        end,
        created_at desc
    )
    from alert_dashboard
    where status in ('open', 'acknowledged')
  ) as active_alerts
from platform_operations_dashboard pod;

alter table withdrawal_requests enable row level security;
alter table withdrawal_reserved_lots enable row level security;
alter table external_payouts enable row level security;
alter table withdrawal_status_events enable row level security;

drop policy if exists withdrawal_requests_user_read_own on withdrawal_requests;
create policy withdrawal_requests_user_read_own
on withdrawal_requests
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists withdrawal_status_events_user_read_own on withdrawal_status_events;
create policy withdrawal_status_events_user_read_own
on withdrawal_status_events
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists withdrawal_requests_no_user_write on withdrawal_requests;
create policy withdrawal_requests_no_user_write
on withdrawal_requests
for all
to authenticated
using (false)
with check (false);

drop policy if exists withdrawal_reserved_lots_no_user_access on withdrawal_reserved_lots;
create policy withdrawal_reserved_lots_no_user_access
on withdrawal_reserved_lots
for all
to authenticated
using (false)
with check (false);

drop policy if exists external_payouts_no_user_access on external_payouts;
create policy external_payouts_no_user_access
on external_payouts
for all
to authenticated
using (false)
with check (false);

drop policy if exists worker_all_withdrawal_requests on withdrawal_requests;
create policy worker_all_withdrawal_requests
on withdrawal_requests
for all
to worker_role
using (true)
with check (true);

drop policy if exists worker_all_withdrawal_reserved_lots on withdrawal_reserved_lots;
create policy worker_all_withdrawal_reserved_lots
on withdrawal_reserved_lots
for all
to worker_role
using (true)
with check (true);

drop policy if exists worker_all_external_payouts on external_payouts;
create policy worker_all_external_payouts
on external_payouts
for all
to worker_role
using (true)
with check (true);

drop policy if exists worker_all_withdrawal_status_events on withdrawal_status_events;
create policy worker_all_withdrawal_status_events
on withdrawal_status_events
for all
to worker_role
using (true)
with check (true);

drop policy if exists admin_read_withdrawal_requests on withdrawal_requests;
create policy admin_read_withdrawal_requests
on withdrawal_requests
for select
to admin_api_role
using (true);

drop policy if exists admin_read_withdrawal_reserved_lots on withdrawal_reserved_lots;
create policy admin_read_withdrawal_reserved_lots
on withdrawal_reserved_lots
for select
to admin_api_role
using (true);

drop policy if exists admin_read_external_payouts on external_payouts;
create policy admin_read_external_payouts
on external_payouts
for select
to admin_api_role
using (true);

drop policy if exists admin_read_withdrawal_status_events on withdrawal_status_events;
create policy admin_read_withdrawal_status_events
on withdrawal_status_events
for select
to admin_api_role
using (true);

grant execute on function create_withdrawal_request(
  uuid,
  uuid,
  bigint,
  text,
  bigint,
  text,
  text,
  jsonb
) to app_api_role;

grant execute on function reserve_wallet_funds_for_withdrawal(uuid, jsonb)
to worker_role;

grant execute on function submit_withdrawal_to_provider(uuid, text, text, text, text, jsonb)
to worker_role;

grant execute on function mark_withdrawal_paid(uuid, uuid, text, jsonb)
to worker_role;

grant execute on function mark_withdrawal_failed_and_release(uuid, text, uuid, jsonb)
to worker_role;

alter function create_withdrawal_request(
  uuid,
  uuid,
  bigint,
  text,
  bigint,
  text,
  text,
  jsonb
) security definer;

alter function create_withdrawal_request(
  uuid,
  uuid,
  bigint,
  text,
  bigint,
  text,
  text,
  jsonb
) set search_path = public;

alter function reserve_wallet_funds_for_withdrawal(uuid, jsonb) security definer;
alter function reserve_wallet_funds_for_withdrawal(uuid, jsonb) set search_path = public;

alter function submit_withdrawal_to_provider(uuid, text, text, text, text, jsonb) security definer;
alter function submit_withdrawal_to_provider(uuid, text, text, text, text, jsonb) set search_path = public;

alter function mark_withdrawal_paid(uuid, uuid, text, jsonb) security definer;
alter function mark_withdrawal_paid(uuid, uuid, text, jsonb) set search_path = public;

alter function mark_withdrawal_failed_and_release(uuid, text, uuid, jsonb) security definer;
alter function mark_withdrawal_failed_and_release(uuid, text, uuid, jsonb) set search_path = public;

create or replace view admin_withdrawal_operations as
select
  count(*) as withdrawal_count,
  count(*) filter (where status = 'approved') as approved_count,
  count(*) filter (where status = 'reserved') as reserved_count,
  count(*) filter (where status in ('submitted', 'processing')) as processing_count,
  count(*) filter (where status = 'paid') as paid_count,
  count(*) filter (where status = 'failed') as failed_count,
  coalesce(sum(requested_amount_minor), 0)::bigint as total_requested_minor,
  coalesce(sum(requested_amount_minor) filter (where status = 'paid'), 0)::bigint
    as total_paid_minor,
  coalesce(
    sum(requested_amount_minor) filter (where status in ('reserved', 'submitted', 'processing')),
    0
  )::bigint as total_in_flight_minor,
  (
    select count(*)
    from withdrawal_integrity_check
    where has_integrity_issue is true
  ) as integrity_issue_count,
  now() as checked_at
from withdrawal_requests;

grant select on app_withdrawal_summary to authenticated, app_api_role;
grant select on admin_withdrawal_detail to admin_api_role;
grant select on admin_withdrawal_operations to admin_api_role;
grant select on withdrawal_integrity_check to admin_api_role, readonly_audit_role;

do $$
begin
  execute 'alter view app_withdrawal_summary set (security_invoker = true)';
exception
  when others then null;
end
$$;
