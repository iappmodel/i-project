-- Step 6.4 — Withdrawal reversal after paid payout reversal.
-- Handles wallet re-credit, accounting mirror, trust/fraud signaling, review queue,
-- detection jobs, and admin resolution flow for paid payout reversals.

do $$
begin
  alter type wallet_lot_source_type add value if not exists 'withdrawal_reversal';
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter type wallet_ledger_entry_type add value if not exists 'withdrawal_reversal_recredit';
exception
  when duplicate_object then null;
end
$$;

create table if not exists withdrawal_reversal_groups (
  id uuid primary key default gen_random_uuid(),

  withdrawal_request_id uuid not null,
  external_payout_id uuid references external_payouts(id),

  wallet_id uuid not null references wallets(id),
  user_id uuid not null,

  provider_key text,
  provider_payout_id text,
  processor_reference text,

  currency_code text not null default 'USD',

  reversed_amount_minor bigint not null,
  processor_fee_reversed_minor bigint not null default 0,
  net_reversed_amount_minor bigint not null,

  reversal_type text not null,
  money_returned boolean,
  platform_cash_impact text not null default 'unknown',

  status text not null default 'processing',

  wallet_action text,
  wallet_value_lot_id uuid references wallet_value_lots(id),
  wallet_ledger_entry_id uuid references wallet_ledger_entries(id),

  accounting_journal_entry_id uuid references accounting_journal_entries(id),

  trust_signal_id uuid references trust_signal_events(id),
  fraud_lock_event_id uuid,

  idempotency_key text not null,
  operation_type text not null default 'handle_paid_withdrawal_reversal',

  failure_reason text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,

  constraint withdrawal_reversal_groups_amount_check
  check (
    reversed_amount_minor > 0
    and processor_fee_reversed_minor >= 0
    and net_reversed_amount_minor > 0
    and net_reversed_amount_minor <= reversed_amount_minor
  ),

  constraint withdrawal_reversal_groups_reversal_type_check
  check (
    reversal_type in (
      'provider_reversal',
      'bank_return',
      'fraud_reversal',
      'duplicate_payout_reversal',
      'compliance_reversal',
      'manual_reversal'
    )
  ),

  constraint withdrawal_reversal_groups_cash_impact_check
  check (
    platform_cash_impact in (
      'returned_to_platform',
      'not_returned',
      'partial_return',
      'unknown'
    )
  ),

  constraint withdrawal_reversal_groups_status_check
  check (
    status in (
      'processing',
      'completed',
      'held_for_review',
      'failed',
      'cancelled'
    )
  ),

  constraint withdrawal_reversal_groups_wallet_action_check
  check (
    wallet_action is null
    or wallet_action in (
      'recredit_wallet',
      'do_not_recredit',
      'hold_for_review',
      'create_negative_balance',
      'manual_review_required'
    )
  )
);

create unique index if not exists withdrawal_reversal_groups_idempotency_unique
on withdrawal_reversal_groups (operation_type, idempotency_key);

create index if not exists withdrawal_reversal_groups_withdrawal_idx
on withdrawal_reversal_groups (withdrawal_request_id, created_at desc);

create index if not exists withdrawal_reversal_groups_external_payout_idx
on withdrawal_reversal_groups (external_payout_id, created_at desc);

create index if not exists withdrawal_reversal_groups_wallet_idx
on withdrawal_reversal_groups (wallet_id, created_at desc);

create index if not exists withdrawal_reversal_groups_status_idx
on withdrawal_reversal_groups (status, created_at desc);

create table if not exists withdrawal_reversal_review_queue (
  id uuid primary key default gen_random_uuid(),

  withdrawal_reversal_group_id uuid not null references withdrawal_reversal_groups(id),

  withdrawal_request_id uuid not null,
  external_payout_id uuid references external_payouts(id),

  wallet_id uuid not null references wallets(id),
  user_id uuid not null,

  reason text not null,
  severity text not null default 'high',

  recommended_action text not null,

  status text not null default 'open',

  assigned_admin_user_id uuid references admin_users(id),
  resolved_by_admin_id uuid references admin_users(id),

  resolution_action text,
  resolution_note text,

  created_at timestamptz not null default now(),
  resolved_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  constraint withdrawal_reversal_review_queue_severity_check
  check (
    severity in (
      'medium',
      'high',
      'critical'
    )
  ),

  constraint withdrawal_reversal_review_queue_status_check
  check (
    status in (
      'open',
      'assigned',
      'resolved',
      'dismissed'
    )
  ),

  constraint withdrawal_reversal_review_queue_action_check
  check (
    recommended_action in (
      'recredit_wallet',
      'do_not_recredit',
      'fraud_lock',
      'manual_investigation',
      'create_negative_balance'
    )
  )
);

create index if not exists withdrawal_reversal_review_queue_status_idx
on withdrawal_reversal_review_queue (status, severity, created_at desc);

create index if not exists withdrawal_reversal_review_queue_wallet_idx
on withdrawal_reversal_review_queue (wallet_id, created_at desc);

create or replace function recredit_wallet_for_withdrawal_reversal(
  p_wallet_id uuid,
  p_user_id uuid,
  p_amount_minor bigint,
  p_currency_code text,
  p_withdrawal_request_id uuid,
  p_external_payout_id uuid,
  p_withdrawal_reversal_group_id uuid,
  p_idempotency_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_lot_id uuid;
  v_ledger_entry_id uuid;
begin
  if p_wallet_id is null then
    raise exception 'wallet id is required';
  end if;

  if p_user_id is null then
    raise exception 'user id is required';
  end if;

  if p_amount_minor <= 0 then
    raise exception 'recredit amount must be positive';
  end if;

  perform wallet_assert_not_fraud_locked(
    p_wallet_id,
    'withdrawal_reversal_recredit'
  );

  insert into wallet_value_lots (
    wallet_id,
    user_id,
    currency_code,
    original_amount_minor,
    remaining_amount_minor,
    status,
    source_type,
    source_id,
    cashout_eligible,
    available_at,
    expires_at,
    metadata
  )
  values (
    p_wallet_id,
    p_user_id,
    coalesce(p_currency_code, 'USD'),
    p_amount_minor,
    p_amount_minor,
    'available',
    'withdrawal_reversal',
    p_withdrawal_reversal_group_id,
    true,
    now(),
    null,
    p_metadata || jsonb_build_object(
      'withdrawal_request_id',
      p_withdrawal_request_id,
      'external_payout_id',
      p_external_payout_id,
      'withdrawal_reversal_group_id',
      p_withdrawal_reversal_group_id
    )
  )
  returning id into v_lot_id;

  insert into wallet_ledger_entries (
    wallet_id,
    user_id,
    value_lot_id,
    currency_code,
    entry_type,
    source_type,
    source_id,
    amount_minor,
    direction,
    available_impact_minor,
    pending_impact_minor,
    locked_impact_minor,
    status,
    idempotency_key,
    metadata
  )
  values (
    p_wallet_id,
    p_user_id,
    v_lot_id,
    coalesce(p_currency_code, 'USD'),
    'withdrawal_reversal_recredit',
    'withdrawal_reversal_group',
    p_withdrawal_reversal_group_id,
    p_amount_minor,
    1,
    p_amount_minor,
    0,
    0,
    'posted',
    p_idempotency_key,
    p_metadata || jsonb_build_object(
      'wallet_value_lot_id',
      v_lot_id,
      'withdrawal_request_id',
      p_withdrawal_request_id,
      'external_payout_id',
      p_external_payout_id
    )
  )
  returning id into v_ledger_entry_id;

  update withdrawal_reversal_groups
  set
    wallet_value_lot_id = v_lot_id,
    wallet_ledger_entry_id = v_ledger_entry_id
  where id = p_withdrawal_reversal_group_id;

  perform hash_wallet_ledger_entry(
    v_ledger_entry_id,
    p_metadata || jsonb_build_object(
      'trigger',
      'withdrawal_reversal_recredit'
    )
  );

  return v_lot_id;
end;
$$;

create or replace function mirror_accounting_withdrawal_reversal_recredit(
  p_withdrawal_reversal_group_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_group withdrawal_reversal_groups%rowtype;
  v_journal_id uuid;
begin
  select *
  into v_group
  from withdrawal_reversal_groups
  where id = p_withdrawal_reversal_group_id;

  if v_group.id is null then
    raise exception 'withdrawal reversal group not found: %',
      p_withdrawal_reversal_group_id;
  end if;

  if v_group.net_reversed_amount_minor <= 0 then
    raise exception 'invalid reversal amount';
  end if;

  v_journal_id := create_accounting_journal_entry(
    'withdrawal_reversal_recredit',
    'withdrawal_reversal_group',
    v_group.id,
    v_group.wallet_id,
    v_group.user_id,
    null,
    v_group.currency_code,
    'mirror_accounting_withdrawal_reversal_recredit',
    'withdrawal_reversal_group:' || v_group.id::text,
    p_metadata
  );

  perform add_accounting_journal_line(
    v_journal_id,
    'processor_clearing_usd',
    'debit',
    v_group.net_reversed_amount_minor,
    v_group.currency_code,
    null,
    v_group.wallet_value_lot_id,
    null,
    p_metadata
  );

  perform add_accounting_journal_line(
    v_journal_id,
    'user_wallet_liability_usd',
    'credit',
    v_group.net_reversed_amount_minor,
    v_group.currency_code,
    v_group.wallet_ledger_entry_id,
    v_group.wallet_value_lot_id,
    null,
    p_metadata
  );

  perform post_accounting_journal_entry(v_journal_id);

  perform hash_accounting_journal_entry(
    v_journal_id,
    p_metadata || jsonb_build_object(
      'trigger',
      'withdrawal_reversal_recredit'
    )
  );

  update withdrawal_reversal_groups
  set accounting_journal_entry_id = v_journal_id
  where id = v_group.id;

  return v_journal_id;
end;
$$;

insert into trust_signal_weight_rules (
  formula_version,
  signal_source,
  signal_type,
  direction,
  severity,
  base_signal_weight,
  trust_delta,
  risk_delta,
  confidence_delta,
  metadata
)
select
  'trust_v1',
  'payout_reconciliation_engine',
  'withdrawal_reversal_returned',
  'negative',
  'medium',
  1.000000,
  -0.020000,
  0.050000,
  0.020000,
  '{"meaning": "payout reversed but funds returned; moderate risk signal"}'::jsonb
where not exists (
  select 1
  from trust_signal_weight_rules
  where formula_version = 'trust_v1'
    and signal_source = 'payout_reconciliation_engine'
    and signal_type = 'withdrawal_reversal_returned'
    and direction = 'negative'
    and severity = 'medium'
);

insert into trust_signal_weight_rules (
  formula_version,
  signal_source,
  signal_type,
  direction,
  severity,
  base_signal_weight,
  trust_delta,
  risk_delta,
  confidence_delta,
  metadata
)
select
  'trust_v1',
  'payout_reconciliation_engine',
  'withdrawal_reversal_not_returned',
  'negative',
  'critical',
  1.000000,
  -0.150000,
  0.300000,
  0.080000,
  '{"meaning": "payout reversed or disputed without confirmed returned funds"}'::jsonb
where not exists (
  select 1
  from trust_signal_weight_rules
  where formula_version = 'trust_v1'
    and signal_source = 'payout_reconciliation_engine'
    and signal_type = 'withdrawal_reversal_not_returned'
    and direction = 'negative'
    and severity = 'critical'
);

insert into trust_signal_weight_rules (
  formula_version,
  signal_source,
  signal_type,
  direction,
  severity,
  base_signal_weight,
  trust_delta,
  risk_delta,
  confidence_delta,
  metadata
)
select
  'trust_v1',
  'payout_reconciliation_engine',
  'withdrawal_reversal_unknown',
  'negative',
  'high',
  1.000000,
  -0.080000,
  0.180000,
  0.050000,
  '{"meaning": "payout reversal cash impact unknown"}'::jsonb
where not exists (
  select 1
  from trust_signal_weight_rules
  where formula_version = 'trust_v1'
    and signal_source = 'payout_reconciliation_engine'
    and signal_type = 'withdrawal_reversal_unknown'
    and direction = 'negative'
    and severity = 'high'
);

create or replace function handle_paid_withdrawal_reversal(
  p_external_payout_id uuid,
  p_reversal_type text,
  p_reversed_amount_minor bigint,
  p_money_returned boolean default null,
  p_platform_cash_impact text default 'unknown',
  p_reason text default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_payout external_payouts%rowtype;

  v_group_id uuid;
  v_idempotency_key text;

  v_wallet_action text;
  v_status text;

  v_lot_id uuid;
  v_journal_id uuid;
  v_signal_id uuid;

  v_signal_type text;
  v_severity text;
begin
  if p_external_payout_id is null then
    raise exception 'external payout id is required';
  end if;

  if p_reversed_amount_minor <= 0 then
    raise exception 'reversed amount must be positive';
  end if;

  if p_reversal_type not in (
    'provider_reversal',
    'bank_return',
    'fraud_reversal',
    'duplicate_payout_reversal',
    'compliance_reversal',
    'manual_reversal'
  ) then
    raise exception 'invalid reversal type: %', p_reversal_type;
  end if;

  if p_platform_cash_impact not in (
    'returned_to_platform',
    'not_returned',
    'partial_return',
    'unknown'
  ) then
    raise exception 'invalid platform cash impact: %', p_platform_cash_impact;
  end if;

  select *
  into v_payout
  from external_payouts
  where id = p_external_payout_id
  for update;

  if v_payout.id is null then
    raise exception 'external payout not found: %', p_external_payout_id;
  end if;

  if v_payout.status not in ('paid', 'reversed', 'partially_reversed') then
    raise exception 'external payout is not a paid/reversed payout. status %',
      v_payout.status;
  end if;

  if p_reversed_amount_minor > v_payout.requested_amount_minor then
    raise exception 'reversed amount exceeds original payout amount';
  end if;

  v_idempotency_key := coalesce(
    p_idempotency_key,
    'handle_paid_withdrawal_reversal:' || v_payout.id::text
  );

  if exists (
    select 1
    from withdrawal_reversal_groups
    where operation_type = 'handle_paid_withdrawal_reversal'
      and idempotency_key = v_idempotency_key
  ) then
    select id
    into v_group_id
    from withdrawal_reversal_groups
    where operation_type = 'handle_paid_withdrawal_reversal'
      and idempotency_key = v_idempotency_key;

    return v_group_id;
  end if;

  if p_platform_cash_impact = 'returned_to_platform'
    and coalesce(p_money_returned, true) is true then
    v_wallet_action := 'recredit_wallet';
    v_status := 'processing';

  elsif p_platform_cash_impact = 'partial_return' then
    v_wallet_action := 'manual_review_required';
    v_status := 'held_for_review';

  elsif p_platform_cash_impact in ('not_returned', 'unknown') then
    v_wallet_action := 'manual_review_required';
    v_status := 'held_for_review';

  else
    v_wallet_action := 'manual_review_required';
    v_status := 'held_for_review';
  end if;

  insert into withdrawal_reversal_groups (
    withdrawal_request_id,
    external_payout_id,
    wallet_id,
    user_id,
    provider_key,
    provider_payout_id,
    processor_reference,
    currency_code,
    reversed_amount_minor,
    processor_fee_reversed_minor,
    net_reversed_amount_minor,
    reversal_type,
    money_returned,
    platform_cash_impact,
    status,
    wallet_action,
    idempotency_key,
    operation_type,
    metadata
  )
  values (
    v_payout.withdrawal_request_id,
    v_payout.id,
    v_payout.wallet_id,
    v_payout.user_id,
    v_payout.provider_key,
    v_payout.provider_payout_id,
    v_payout.processor_reference,
    v_payout.currency_code,
    p_reversed_amount_minor,
    0,
    p_reversed_amount_minor,
    p_reversal_type,
    p_money_returned,
    p_platform_cash_impact,
    v_status,
    v_wallet_action,
    v_idempotency_key,
    'handle_paid_withdrawal_reversal',
    p_metadata || jsonb_build_object(
      'reason',
      p_reason
    )
  )
  returning id into v_group_id;

  update external_payouts
  set
    status =
      case
        when p_reversed_amount_minor = requested_amount_minor then 'reversed'
        else 'partially_reversed'
      end,
    reversed_at = now(),
    metadata = metadata || p_metadata || jsonb_build_object(
      'withdrawal_reversal_group_id',
      v_group_id,
      'reversal_reason',
      p_reason,
      'platform_cash_impact',
      p_platform_cash_impact
    ),
    updated_at = now()
  where id = v_payout.id;

  if v_wallet_action = 'recredit_wallet' then
    v_lot_id := recredit_wallet_for_withdrawal_reversal(
      v_payout.wallet_id,
      v_payout.user_id,
      p_reversed_amount_minor,
      v_payout.currency_code,
      v_payout.withdrawal_request_id,
      v_payout.id,
      v_group_id,
      v_idempotency_key || ':wallet_recredit',
      p_metadata
    );

    v_journal_id := mirror_accounting_withdrawal_reversal_recredit(
      v_group_id,
      p_metadata
    );

    update withdrawal_reversal_groups
    set
      status = 'completed',
      completed_at = now(),
      wallet_value_lot_id = v_lot_id,
      accounting_journal_entry_id = v_journal_id
    where id = v_group_id;

    v_signal_type := 'withdrawal_reversal_returned';
    v_severity := 'medium';

  else
    insert into withdrawal_reversal_review_queue (
      withdrawal_reversal_group_id,
      withdrawal_request_id,
      external_payout_id,
      wallet_id,
      user_id,
      reason,
      severity,
      recommended_action,
      metadata
    )
    values (
      v_group_id,
      v_payout.withdrawal_request_id,
      v_payout.id,
      v_payout.wallet_id,
      v_payout.user_id,
      coalesce(p_reason, 'paid withdrawal reversal requires review'),
      case
        when p_platform_cash_impact = 'not_returned' then 'critical'
        else 'high'
      end,
      case
        when p_platform_cash_impact = 'not_returned' then 'fraud_lock'
        else 'manual_investigation'
      end,
      p_metadata
    );

    v_signal_type :=
      case
        when p_platform_cash_impact = 'not_returned'
        then 'withdrawal_reversal_not_returned'
        else 'withdrawal_reversal_unknown'
      end;

    v_severity :=
      case
        when p_platform_cash_impact = 'not_returned'
        then 'critical'
        else 'high'
      end;
  end if;

  v_signal_id := record_trust_signal(
    'wallet',
    v_payout.wallet_id,
    v_payout.user_id,
    v_payout.wallet_id,
    v_signal_type,
    'payout_reconciliation_engine',
    'negative',
    v_severity,
    1.0000,
    null,
    null,
    null,
    null,
    'withdrawal_reversal:' || v_group_id::text,
    p_metadata || jsonb_build_object(
      'withdrawal_reversal_group_id',
      v_group_id,
      'external_payout_id',
      v_payout.id,
      'withdrawal_request_id',
      v_payout.withdrawal_request_id,
      'platform_cash_impact',
      p_platform_cash_impact,
      'reversed_amount_minor',
      p_reversed_amount_minor
    )
  );

  update withdrawal_reversal_groups
  set trust_signal_id = v_signal_id
  where id = v_group_id;

  perform apply_effective_trust_score_to_wallet_policy(
    v_payout.wallet_id,
    p_metadata || jsonb_build_object(
      'trigger',
      'paid_withdrawal_reversal',
      'withdrawal_reversal_group_id',
      v_group_id
    )
  );

  return v_group_id;

exception
  when others then
    if v_group_id is not null then
      update withdrawal_reversal_groups
      set
        status = 'failed',
        failed_at = now(),
        failure_reason = sqlerrm
      where id = v_group_id;
    end if;

    raise;
end;
$$;

create table if not exists withdrawal_reversal_runs (
  id uuid primary key default gen_random_uuid(),

  run_type text not null default 'scheduled',
  status text not null default 'processing',

  scanned_payout_count integer not null default 0,
  reversal_group_count integer not null default 0,
  held_for_review_count integer not null default 0,
  failed_count integer not null default 0,

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,

  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,

  constraint withdrawal_reversal_runs_status_check
  check (
    status in (
      'processing',
      'completed',
      'failed'
    )
  )
);

create index if not exists withdrawal_reversal_runs_started_idx
on withdrawal_reversal_runs (started_at desc);

create or replace function run_withdrawal_reversal_detection_job(
  p_batch_size integer default 500,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid;
  v_payout record;
  v_group_id uuid;

  v_scanned integer := 0;
  v_created integer := 0;
  v_held integer := 0;
  v_failed integer := 0;
  v_group_status text;
begin
  if p_batch_size <= 0 then
    raise exception 'batch size must be positive';
  end if;

  insert into withdrawal_reversal_runs (
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

  for v_payout in
    select *
    from external_payouts ep
    where ep.status in ('reversed', 'partially_reversed')
      and not exists (
        select 1
        from withdrawal_reversal_groups wrg
        where wrg.external_payout_id = ep.id
      )
    order by ep.reversed_at asc nulls last, ep.updated_at asc
    limit p_batch_size
    for update skip locked
  loop
    v_scanned := v_scanned + 1;

    begin
      v_group_id := handle_paid_withdrawal_reversal(
        v_payout.id,
        'provider_reversal',
        v_payout.requested_amount_minor,
        null,
        'unknown',
        'auto-detected reversed external payout; cash impact unknown',
        'handle_paid_withdrawal_reversal:' || v_payout.id::text,
        p_metadata || jsonb_build_object(
          'withdrawal_reversal_run_id',
          v_run_id
        )
      );

      select status
      into v_group_status
      from withdrawal_reversal_groups
      where id = v_group_id;

      v_created := v_created + 1;

      if v_group_status = 'held_for_review' then
        v_held := v_held + 1;
      end if;

    exception
      when others then
        v_failed := v_failed + 1;
    end;
  end loop;

  update withdrawal_reversal_runs
  set
    status = 'completed',
    completed_at = now(),
    scanned_payout_count = v_scanned,
    reversal_group_count = v_created,
    held_for_review_count = v_held,
    failed_count = v_failed
  where id = v_run_id;

  return v_run_id;

exception
  when others then
    if v_run_id is not null then
      update withdrawal_reversal_runs
      set
        status = 'failed',
        failed_at = now(),
        failure_reason = sqlerrm
      where id = v_run_id;
    end if;

    raise;
end;
$$;

create or replace function resolve_withdrawal_reversal_review(
  p_review_id uuid,
  p_admin_user_id uuid,
  p_resolution_action text,
  p_resolution_note text,
  p_admin_case_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_review withdrawal_reversal_review_queue%rowtype;
  v_group withdrawal_reversal_groups%rowtype;

  v_lot_id uuid;
  v_journal_id uuid;
begin
  if p_review_id is null then
    raise exception 'review id is required';
  end if;

  if p_admin_user_id is null then
    raise exception 'admin user id is required';
  end if;

  if p_resolution_note is null or length(trim(p_resolution_note)) = 0 then
    raise exception 'resolution note is required';
  end if;

  if p_resolution_action not in (
    'recredit_wallet',
    'do_not_recredit',
    'fraud_lock',
    'dismiss'
  ) then
    raise exception 'invalid resolution action: %', p_resolution_action;
  end if;

  select *
  into v_review
  from withdrawal_reversal_review_queue
  where id = p_review_id
  for update;

  if v_review.id is null then
    raise exception 'withdrawal reversal review not found: %', p_review_id;
  end if;

  if v_review.status not in ('open', 'assigned') then
    raise exception 'review is not open/assigned';
  end if;

  select *
  into v_group
  from withdrawal_reversal_groups
  where id = v_review.withdrawal_reversal_group_id
  for update;

  if v_group.id is null then
    raise exception 'withdrawal reversal group not found';
  end if;

  if p_resolution_action = 'recredit_wallet' then
    v_lot_id := recredit_wallet_for_withdrawal_reversal(
      v_group.wallet_id,
      v_group.user_id,
      v_group.net_reversed_amount_minor,
      v_group.currency_code,
      v_group.withdrawal_request_id,
      v_group.external_payout_id,
      v_group.id,
      'manual_withdrawal_reversal_recredit:' || v_group.id::text,
      p_metadata || jsonb_build_object(
        'admin_user_id',
        p_admin_user_id,
        'admin_case_id',
        p_admin_case_id,
        'resolution_note',
        p_resolution_note
      )
    );

    v_journal_id := mirror_accounting_withdrawal_reversal_recredit(
      v_group.id,
      p_metadata || jsonb_build_object(
        'admin_user_id',
        p_admin_user_id,
        'admin_case_id',
        p_admin_case_id
      )
    );

    update withdrawal_reversal_groups
    set
      status = 'completed',
      completed_at = now(),
      wallet_action = 'recredit_wallet',
      wallet_value_lot_id = v_lot_id,
      accounting_journal_entry_id = v_journal_id,
      metadata = metadata || p_metadata || jsonb_build_object(
        'resolved_by_admin_id',
        p_admin_user_id,
        'admin_case_id',
        p_admin_case_id,
        'resolution_action',
        p_resolution_action,
        'resolution_note',
        p_resolution_note
      )
    where id = v_group.id;

  elsif p_resolution_action = 'fraud_lock' then
    perform apply_wallet_risk_policy(
      v_group.wallet_id,
      0.9800,
      0.0500,
      'withdrawal_reversal_admin_fraud_lock',
      p_metadata || jsonb_build_object(
        'withdrawal_reversal_group_id',
        v_group.id,
        'admin_user_id',
        p_admin_user_id,
        'admin_case_id',
        p_admin_case_id,
        'resolution_note',
        p_resolution_note
      )
    );

    update withdrawal_reversal_groups
    set
      status = 'completed',
      completed_at = now(),
      wallet_action = 'do_not_recredit',
      metadata = metadata || p_metadata || jsonb_build_object(
        'resolved_by_admin_id',
        p_admin_user_id,
        'admin_case_id',
        p_admin_case_id,
        'resolution_action',
        p_resolution_action,
        'resolution_note',
        p_resolution_note
      )
    where id = v_group.id;

  elsif p_resolution_action = 'do_not_recredit' then
    update withdrawal_reversal_groups
    set
      status = 'completed',
      completed_at = now(),
      wallet_action = 'do_not_recredit',
      metadata = metadata || p_metadata || jsonb_build_object(
        'resolved_by_admin_id',
        p_admin_user_id,
        'admin_case_id',
        p_admin_case_id,
        'resolution_action',
        p_resolution_action,
        'resolution_note',
        p_resolution_note
      )
    where id = v_group.id;

  elsif p_resolution_action = 'dismiss' then
    update withdrawal_reversal_groups
    set
      status = 'cancelled',
      completed_at = now(),
      metadata = metadata || p_metadata || jsonb_build_object(
        'resolved_by_admin_id',
        p_admin_user_id,
        'admin_case_id',
        p_admin_case_id,
        'resolution_action',
        p_resolution_action,
        'resolution_note',
        p_resolution_note
      )
    where id = v_group.id;
  end if;

  update withdrawal_reversal_review_queue
  set
    status = 'resolved',
    resolved_by_admin_id = p_admin_user_id,
    resolved_at = now(),
    resolution_action = p_resolution_action,
    resolution_note = p_resolution_note,
    metadata = metadata || p_metadata || jsonb_build_object(
      'admin_case_id',
      p_admin_case_id
    )
  where id = v_review.id;

  return v_review.id;
end;
$$;

create or replace view withdrawal_reversal_details as
select
  wrg.id as withdrawal_reversal_group_id,
  wrg.withdrawal_request_id,
  wrg.external_payout_id,
  wrg.wallet_id,
  wrg.user_id,
  wrg.provider_key,
  wrg.provider_payout_id,
  wrg.processor_reference,
  wrg.currency_code,
  wrg.reversed_amount_minor,
  wrg.net_reversed_amount_minor,
  wrg.reversal_type,
  wrg.money_returned,
  wrg.platform_cash_impact,
  wrg.status,
  wrg.wallet_action,
  wrg.wallet_value_lot_id,
  wrg.wallet_ledger_entry_id,
  wrg.accounting_journal_entry_id,
  wrg.trust_signal_id,
  wrg.created_at,
  wrg.completed_at,
  wrg.failed_at,
  wrg.failure_reason,

  ep.status as external_payout_status,
  ep.requested_amount_minor as original_payout_amount_minor,
  ep.paid_at as external_paid_at,
  ep.reversed_at as external_reversed_at,

  rq.id as review_id,
  rq.status as review_status,
  rq.reason as review_reason,
  rq.severity as review_severity,
  rq.recommended_action,
  rq.assigned_admin_user_id,
  rq.resolved_by_admin_id,
  rq.resolution_action,
  rq.resolution_note,
  rq.resolved_at

from withdrawal_reversal_groups wrg
left join external_payouts ep
  on ep.id = wrg.external_payout_id
left join withdrawal_reversal_review_queue rq
  on rq.withdrawal_reversal_group_id = wrg.id;

create or replace view withdrawal_reversal_dashboard as
select
  status,
  platform_cash_impact,
  wallet_action,

  count(*) as reversal_count,

  coalesce(sum(net_reversed_amount_minor), 0)::bigint as total_net_reversed_minor,

  count(*) filter (where status = 'held_for_review') as held_for_review_count,
  count(*) filter (where status = 'completed') as completed_count,
  count(*) filter (where status = 'failed') as failed_count,

  min(created_at) as first_seen_at,
  max(created_at) as latest_seen_at

from withdrawal_reversal_groups
group by status, platform_cash_impact, wallet_action;
