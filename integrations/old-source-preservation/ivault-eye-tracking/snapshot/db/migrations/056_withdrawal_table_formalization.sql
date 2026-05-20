-- Step 6.9 — Withdrawal table formalization
-- Canonical withdrawal state machine:
-- requested -> trust_review/approved -> reserved -> submitted/processing -> paid/failed/cancelled/reversed.

do $$
begin
  alter type wallet_ledger_entry_type add value if not exists 'withdrawal_reserved';
  alter type wallet_ledger_entry_type add value if not exists 'withdrawal_paid';
  alter type wallet_ledger_entry_type add value if not exists 'withdrawal_failed_released';
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter type wallet_lot_status add value if not exists 'reserved';
exception
  when duplicate_object then null;
end
$$;

create table if not exists withdrawal_requests (
  id uuid primary key default gen_random_uuid(),

  wallet_id uuid not null references wallets(id),
  user_id uuid not null,

  currency_code text not null default 'USD',

  requested_amount_minor bigint not null,
  processor_fee_minor bigint not null default 0,
  net_amount_minor bigint not null,

  status text not null default 'requested',

  trust_gate_decision text,
  trust_gate_reason text,

  provider_key text,
  external_payout_id uuid references external_payouts(id),

  wallet_reservation_group_id uuid,
  accounting_journal_entry_id uuid references accounting_journal_entries(id),

  idempotency_key text not null,
  operation_type text not null default 'withdrawal_request',

  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  reserved_at timestamptz,
  submitted_at timestamptz,
  paid_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,
  reversed_at timestamptz,

  failure_reason text,
  cancellation_reason text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint withdrawal_requests_amount_check
  check (
    requested_amount_minor > 0
    and processor_fee_minor >= 0
    and net_amount_minor > 0
    and net_amount_minor <= requested_amount_minor
  ),

  constraint withdrawal_requests_status_check
  check (
    status in (
      'requested',
      'trust_review',
      'approved',
      'reserved',
      'submitted',
      'processing',
      'paid',
      'failed',
      'cancelled',
      'reversed',
      'partially_reversed'
    )
  ),

  constraint withdrawal_requests_trust_gate_decision_check
  check (
    trust_gate_decision is null
    or trust_gate_decision in (
      'allow',
      'allow_with_limit',
      'hold',
      'review',
      'deny'
    )
  )
);

create unique index if not exists withdrawal_requests_idempotency_unique
on withdrawal_requests (operation_type, idempotency_key);

create index if not exists withdrawal_requests_wallet_idx
on withdrawal_requests (wallet_id, created_at desc);

create index if not exists withdrawal_requests_user_idx
on withdrawal_requests (user_id, created_at desc);

create index if not exists withdrawal_requests_status_idx
on withdrawal_requests (status, created_at desc);

create index if not exists withdrawal_requests_external_payout_idx
on withdrawal_requests (external_payout_id);

create table if not exists withdrawal_reserved_lots (
  id uuid primary key default gen_random_uuid(),

  withdrawal_request_id uuid not null references withdrawal_requests(id) on delete cascade,

  wallet_id uuid not null references wallets(id),
  user_id uuid not null,

  wallet_value_lot_id uuid not null references wallet_value_lots(id),

  currency_code text not null default 'USD',

  reserved_amount_minor bigint not null,

  status text not null default 'reserved',

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  released_at timestamptz,
  consumed_at timestamptz,

  constraint withdrawal_reserved_lots_amount_check
  check (reserved_amount_minor > 0),

  constraint withdrawal_reserved_lots_status_check
  check (
    status in (
      'reserved',
      'consumed',
      'released',
      'failed'
    )
  )
);

create index if not exists withdrawal_reserved_lots_request_idx
on withdrawal_reserved_lots (withdrawal_request_id);

create index if not exists withdrawal_reserved_lots_wallet_lot_idx
on withdrawal_reserved_lots (wallet_value_lot_id);

create index if not exists withdrawal_reserved_lots_wallet_idx
on withdrawal_reserved_lots (wallet_id, created_at desc);

create table if not exists withdrawal_status_events (
  id uuid primary key default gen_random_uuid(),

  withdrawal_request_id uuid not null references withdrawal_requests(id),

  wallet_id uuid not null references wallets(id),
  user_id uuid not null,

  previous_status text,
  new_status text not null,

  event_type text not null,
  reason text,

  external_payout_id uuid references external_payouts(id),
  provider_key text,
  provider_event_id uuid references payout_provider_events(id),

  admin_user_id uuid references admin_users(id),
  admin_case_id uuid,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists withdrawal_status_events_request_idx
on withdrawal_status_events (withdrawal_request_id, created_at desc);

create index if not exists withdrawal_status_events_wallet_idx
on withdrawal_status_events (wallet_id, created_at desc);

create index if not exists withdrawal_status_events_type_idx
on withdrawal_status_events (event_type, created_at desc);

create or replace function log_withdrawal_status_event(
  p_withdrawal_request_id uuid,
  p_previous_status text,
  p_new_status text,
  p_event_type text,
  p_reason text default null,
  p_external_payout_id uuid default null,
  p_provider_key text default null,
  p_provider_event_id uuid default null,
  p_admin_user_id uuid default null,
  p_admin_case_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request withdrawal_requests%rowtype;
  v_event_id uuid;
begin
  select *
  into v_request
  from withdrawal_requests
  where id = p_withdrawal_request_id;

  if v_request.id is null then
    raise exception 'withdrawal request not found: %', p_withdrawal_request_id;
  end if;

  insert into withdrawal_status_events (
    withdrawal_request_id,
    wallet_id,
    user_id,
    previous_status,
    new_status,
    event_type,
    reason,
    external_payout_id,
    provider_key,
    provider_event_id,
    admin_user_id,
    admin_case_id,
    metadata
  )
  values (
    v_request.id,
    v_request.wallet_id,
    v_request.user_id,
    p_previous_status,
    p_new_status,
    p_event_type,
    p_reason,
    p_external_payout_id,
    p_provider_key,
    p_provider_event_id,
    p_admin_user_id,
    p_admin_case_id,
    p_metadata
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

create or replace function create_withdrawal_request(
  p_wallet_id uuid,
  p_user_id uuid,
  p_requested_amount_minor bigint,
  p_currency_code text default 'USD',
  p_processor_fee_minor bigint default 0,
  p_provider_key text default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_wallet wallets%rowtype;
  v_request_id uuid;
  v_idempotency_key text;
  v_net_amount_minor bigint;

  v_trust_decision text;
  v_status text;
begin
  if p_wallet_id is null then
    raise exception 'wallet id is required';
  end if;

  if p_user_id is null then
    raise exception 'user id is required';
  end if;

  if p_requested_amount_minor <= 0 then
    raise exception 'withdrawal amount must be positive';
  end if;

  if p_processor_fee_minor < 0 then
    raise exception 'processor fee cannot be negative';
  end if;

  v_net_amount_minor := p_requested_amount_minor - p_processor_fee_minor;

  if v_net_amount_minor <= 0 then
    raise exception 'net withdrawal amount must be positive';
  end if;

  select *
  into v_wallet
  from wallets
  where id = p_wallet_id
  for update;

  if v_wallet.id is null then
    raise exception 'wallet not found: %', p_wallet_id;
  end if;

  if v_wallet.user_id <> p_user_id then
    raise exception 'wallet/user mismatch';
  end if;

  perform wallet_assert_not_fraud_locked(
    p_wallet_id,
    'withdraw'
  );

  if v_wallet.available_balance_minor < p_requested_amount_minor then
    raise exception 'insufficient available balance';
  end if;

  v_trust_decision := evaluate_trust_gate(
    'wallet',
    p_wallet_id,
    'withdraw',
    p_user_id,
    p_wallet_id,
    p_metadata
  );

  v_status :=
    case
      when v_trust_decision = 'allow' then 'approved'
      when v_trust_decision in ('hold', 'review', 'allow_with_limit') then 'trust_review'
      when v_trust_decision = 'deny' then 'failed'
      else 'trust_review'
    end;

  v_idempotency_key := coalesce(
    p_idempotency_key,
    'withdrawal_request:' || p_wallet_id::text || ':' || p_requested_amount_minor::text
  );

  insert into withdrawal_requests (
    wallet_id,
    user_id,
    currency_code,
    requested_amount_minor,
    processor_fee_minor,
    net_amount_minor,
    status,
    trust_gate_decision,
    trust_gate_reason,
    provider_key,
    idempotency_key,
    operation_type,
    approved_at,
    failed_at,
    failure_reason,
    metadata
  )
  values (
    p_wallet_id,
    p_user_id,
    coalesce(p_currency_code, 'USD'),
    p_requested_amount_minor,
    p_processor_fee_minor,
    v_net_amount_minor,
    v_status,
    v_trust_decision,
    null,
    p_provider_key,
    v_idempotency_key,
    'withdrawal_request',
    case when v_status = 'approved' then now() else null end,
    case when v_status = 'failed' then now() else null end,
    case when v_status = 'failed' then 'trust_gate_denied' else null end,
    p_metadata
  )
  on conflict (operation_type, idempotency_key)
  do update set
    metadata = withdrawal_requests.metadata || excluded.metadata
  returning id into v_request_id;

  perform log_withdrawal_status_event(
    v_request_id,
    null,
    v_status,
    'withdrawal_requested',
    'withdrawal request created',
    null,
    p_provider_key,
    null,
    null,
    null,
    p_metadata || jsonb_build_object(
      'trust_gate_decision',
      v_trust_decision
    )
  );

  return v_request_id;
end;
$$;

create or replace function reserve_wallet_funds_for_withdrawal(
  p_withdrawal_request_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request withdrawal_requests%rowtype;
  v_wallet wallets%rowtype;

  v_remaining bigint;
  v_take bigint;

  v_lot record;
  v_ledger_entry_id uuid;
begin
  if p_withdrawal_request_id is null then
    raise exception 'withdrawal request id is required';
  end if;

  select *
  into v_request
  from withdrawal_requests
  where id = p_withdrawal_request_id
  for update;

  if v_request.id is null then
    raise exception 'withdrawal request not found: %', p_withdrawal_request_id;
  end if;

  if v_request.status <> 'approved' then
    raise exception 'withdrawal request must be approved before reserve. status %',
      v_request.status;
  end if;

  select *
  into v_wallet
  from wallets
  where id = v_request.wallet_id
  for update;

  if v_wallet.available_balance_minor < v_request.requested_amount_minor then
    raise exception 'insufficient available balance at reserve time';
  end if;

  v_remaining := v_request.requested_amount_minor;

  for v_lot in
    select *
    from wallet_value_lots
    where wallet_id = v_request.wallet_id
      and user_id = v_request.user_id
      and currency_code = v_request.currency_code
      and status = 'available'
      and remaining_amount_minor > 0
      and available_at <= now()
      and (
        expires_at is null
        or expires_at > now()
      )
    order by expires_at asc nulls last, created_at asc
    for update
  loop
    exit when v_remaining <= 0;

    v_take := least(v_remaining, v_lot.remaining_amount_minor);

    insert into withdrawal_reserved_lots (
      withdrawal_request_id,
      wallet_id,
      user_id,
      wallet_value_lot_id,
      currency_code,
      reserved_amount_minor,
      status,
      metadata
    )
    values (
      v_request.id,
      v_request.wallet_id,
      v_request.user_id,
      v_lot.id,
      v_request.currency_code,
      v_take,
      'reserved',
      p_metadata
    );

    update wallet_value_lots
    set
      remaining_amount_minor = remaining_amount_minor - v_take,
      status =
        case
          when remaining_amount_minor - v_take = 0 then 'reserved'
          else status
        end,
      metadata = metadata || jsonb_build_object(
        'withdrawal_request_id',
        v_request.id
      )
    where id = v_lot.id;

    v_remaining := v_remaining - v_take;
  end loop;

  if v_remaining > 0 then
    raise exception 'could not reserve full withdrawal amount. remaining %', v_remaining;
  end if;

  insert into wallet_ledger_entries (
    wallet_id,
    user_id,
    currency_code,
    entry_type,
    source_type,
    source_id,
    available_impact_minor,
    pending_impact_minor,
    locked_impact_minor,
    status,
    idempotency_key,
    metadata
  )
  values (
    v_request.wallet_id,
    v_request.user_id,
    v_request.currency_code,
    'withdrawal_reserved',
    'withdrawal_request',
    v_request.id,
    -v_request.requested_amount_minor,
    0,
    v_request.requested_amount_minor,
    'posted',
    'withdrawal_reserved:' || v_request.id::text,
    p_metadata
  )
  returning id into v_ledger_entry_id;

  update wallets
  set
    available_balance_minor = available_balance_minor - v_request.requested_amount_minor,
    locked_balance_minor = locked_balance_minor + v_request.requested_amount_minor,
    updated_at = now()
  where id = v_request.wallet_id;

  update withdrawal_requests
  set
    status = 'reserved',
    reserved_at = now(),
    wallet_reservation_group_id = v_ledger_entry_id,
    updated_at = now()
  where id = v_request.id;

  perform log_withdrawal_status_event(
    v_request.id,
    v_request.status,
    'reserved',
    'withdrawal_funds_reserved',
    'wallet funds reserved for withdrawal',
    null,
    v_request.provider_key,
    null,
    null,
    null,
    p_metadata || jsonb_build_object(
      'wallet_ledger_entry_id',
      v_ledger_entry_id
    )
  );

  perform hash_wallet_ledger_entry(
    v_ledger_entry_id,
    p_metadata || jsonb_build_object(
      'trigger',
      'withdrawal_reserved'
    )
  );

  perform mirror_accounting_withdrawal_reserved(
    v_request.id,
    v_request.wallet_id,
    v_request.user_id,
    v_request.requested_amount_minor,
    v_request.currency_code,
    p_metadata
  );

  return v_request.id;
end;
$$;

create or replace function submit_withdrawal_to_provider(
  p_withdrawal_request_id uuid,
  p_provider_key text,
  p_provider_payout_id text default null,
  p_provider_transfer_id text default null,
  p_processor_reference text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request withdrawal_requests%rowtype;
  v_external_payout_id uuid;
begin
  select *
  into v_request
  from withdrawal_requests
  where id = p_withdrawal_request_id
  for update;

  if v_request.id is null then
    raise exception 'withdrawal request not found: %', p_withdrawal_request_id;
  end if;

  if v_request.status <> 'reserved' then
    raise exception 'withdrawal must be reserved before provider submission. status %',
      v_request.status;
  end if;

  v_external_payout_id := create_external_payout_record(
    v_request.id,
    v_request.wallet_id,
    v_request.user_id,
    p_provider_key,
    v_request.requested_amount_minor,
    v_request.currency_code,
    v_request.processor_fee_minor,
    p_provider_payout_id,
    p_provider_transfer_id,
    p_processor_reference,
    'external_payout:' || v_request.id::text,
    p_metadata
  );

  update withdrawal_requests
  set
    status = 'submitted',
    submitted_at = now(),
    provider_key = p_provider_key,
    external_payout_id = v_external_payout_id,
    updated_at = now()
  where id = v_request.id;

  perform log_withdrawal_status_event(
    v_request.id,
    v_request.status,
    'submitted',
    'withdrawal_submitted_to_provider',
    'external payout record created',
    v_external_payout_id,
    p_provider_key,
    null,
    null,
    null,
    p_metadata
  );

  return v_external_payout_id;
end;
$$;

create or replace function mark_withdrawal_paid(
  p_withdrawal_request_id uuid,
  p_external_payout_id uuid default null,
  p_processor_reference text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request withdrawal_requests%rowtype;
  v_ledger_entry_id uuid;
begin
  select *
  into v_request
  from withdrawal_requests
  where id = p_withdrawal_request_id
  for update;

  if v_request.id is null then
    raise exception 'withdrawal request not found: %', p_withdrawal_request_id;
  end if;

  if v_request.status not in ('submitted', 'processing', 'reserved') then
    raise exception 'withdrawal cannot be marked paid from status %',
      v_request.status;
  end if;

  update withdrawal_reserved_lots
  set
    status = 'consumed',
    consumed_at = now(),
    metadata = metadata || p_metadata
  where withdrawal_request_id = v_request.id
    and status = 'reserved';

  insert into wallet_ledger_entries (
    wallet_id,
    user_id,
    currency_code,
    entry_type,
    source_type,
    source_id,
    available_impact_minor,
    pending_impact_minor,
    locked_impact_minor,
    status,
    idempotency_key,
    metadata
  )
  values (
    v_request.wallet_id,
    v_request.user_id,
    v_request.currency_code,
    'withdrawal_paid',
    'withdrawal_request',
    v_request.id,
    0,
    0,
    -v_request.requested_amount_minor,
    'posted',
    'withdrawal_paid:' || v_request.id::text,
    p_metadata || jsonb_build_object(
      'external_payout_id',
      coalesce(p_external_payout_id, v_request.external_payout_id),
      'processor_reference',
      p_processor_reference
    )
  )
  returning id into v_ledger_entry_id;

  update wallets
  set
    locked_balance_minor = locked_balance_minor - v_request.requested_amount_minor,
    total_balance_minor = total_balance_minor - v_request.requested_amount_minor,
    updated_at = now()
  where id = v_request.wallet_id;

  update withdrawal_requests
  set
    status = 'paid',
    paid_at = now(),
    external_payout_id = coalesce(p_external_payout_id, external_payout_id),
    updated_at = now()
  where id = v_request.id;

  perform log_withdrawal_status_event(
    v_request.id,
    v_request.status,
    'paid',
    'withdrawal_paid',
    'provider payout paid',
    coalesce(p_external_payout_id, v_request.external_payout_id),
    v_request.provider_key,
    null,
    null,
    null,
    p_metadata || jsonb_build_object(
      'wallet_ledger_entry_id',
      v_ledger_entry_id
    )
  );

  perform hash_wallet_ledger_entry(
    v_ledger_entry_id,
    p_metadata || jsonb_build_object(
      'trigger',
      'withdrawal_paid'
    )
  );

  perform mirror_accounting_withdrawal_paid(
    v_request.id,
    v_request.wallet_id,
    v_request.user_id,
    v_request.requested_amount_minor,
    v_request.currency_code,
    p_processor_reference,
    p_metadata
  );

  return v_request.id;
end;
$$;

create or replace function mark_withdrawal_failed_and_release(
  p_withdrawal_request_id uuid,
  p_failure_reason text,
  p_external_payout_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request withdrawal_requests%rowtype;
  v_reserved record;
  v_ledger_entry_id uuid;
begin
  if p_failure_reason is null or length(trim(p_failure_reason)) = 0 then
    raise exception 'failure reason is required';
  end if;

  select *
  into v_request
  from withdrawal_requests
  where id = p_withdrawal_request_id
  for update;

  if v_request.id is null then
    raise exception 'withdrawal request not found: %', p_withdrawal_request_id;
  end if;

  if v_request.status not in ('reserved', 'submitted', 'processing') then
    raise exception 'withdrawal cannot be failed/released from status %',
      v_request.status;
  end if;

  for v_reserved in
    select *
    from withdrawal_reserved_lots
    where withdrawal_request_id = v_request.id
      and status = 'reserved'
    for update
  loop
    update wallet_value_lots
    set
      remaining_amount_minor = remaining_amount_minor + v_reserved.reserved_amount_minor,
      status = 'available',
      metadata = metadata || p_metadata || jsonb_build_object(
        'withdrawal_release_request_id',
        v_request.id
      )
    where id = v_reserved.wallet_value_lot_id;

    update withdrawal_reserved_lots
    set
      status = 'released',
      released_at = now(),
      metadata = metadata || p_metadata
    where id = v_reserved.id;
  end loop;

  insert into wallet_ledger_entries (
    wallet_id,
    user_id,
    currency_code,
    entry_type,
    source_type,
    source_id,
    available_impact_minor,
    pending_impact_minor,
    locked_impact_minor,
    status,
    idempotency_key,
    metadata
  )
  values (
    v_request.wallet_id,
    v_request.user_id,
    v_request.currency_code,
    'withdrawal_failed_released',
    'withdrawal_request',
    v_request.id,
    v_request.requested_amount_minor,
    0,
    -v_request.requested_amount_minor,
    'posted',
    'withdrawal_failed_released:' || v_request.id::text,
    p_metadata || jsonb_build_object(
      'external_payout_id',
      coalesce(p_external_payout_id, v_request.external_payout_id),
      'failure_reason',
      p_failure_reason
    )
  )
  returning id into v_ledger_entry_id;

  update wallets
  set
    available_balance_minor = available_balance_minor + v_request.requested_amount_minor,
    locked_balance_minor = locked_balance_minor - v_request.requested_amount_minor,
    updated_at = now()
  where id = v_request.wallet_id;

  update withdrawal_requests
  set
    status = 'failed',
    failed_at = now(),
    failure_reason = p_failure_reason,
    external_payout_id = coalesce(p_external_payout_id, external_payout_id),
    updated_at = now()
  where id = v_request.id;

  perform log_withdrawal_status_event(
    v_request.id,
    v_request.status,
    'failed',
    'withdrawal_failed_released',
    p_failure_reason,
    coalesce(p_external_payout_id, v_request.external_payout_id),
    v_request.provider_key,
    null,
    null,
    null,
    p_metadata || jsonb_build_object(
      'wallet_ledger_entry_id',
      v_ledger_entry_id
    )
  );

  perform hash_wallet_ledger_entry(
    v_ledger_entry_id,
    p_metadata || jsonb_build_object(
      'trigger',
      'withdrawal_failed_released'
    )
  );

  perform mirror_accounting_withdrawal_failed(
    v_request.id,
    v_request.wallet_id,
    v_request.user_id,
    v_request.requested_amount_minor,
    v_request.currency_code,
    p_failure_reason,
    p_metadata
  );

  return v_request.id;
end;
$$;

create or replace function cancel_withdrawal_request(
  p_withdrawal_request_id uuid,
  p_reason text,
  p_admin_user_id uuid default null,
  p_admin_case_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request withdrawal_requests%rowtype;
begin
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'cancel reason is required';
  end if;

  select *
  into v_request
  from withdrawal_requests
  where id = p_withdrawal_request_id
  for update;

  if v_request.id is null then
    raise exception 'withdrawal request not found: %', p_withdrawal_request_id;
  end if;

  if v_request.status in ('paid', 'reversed', 'partially_reversed') then
    raise exception 'cannot cancel withdrawal after payout finalization';
  end if;

  if v_request.status in ('reserved', 'submitted', 'processing') then
    perform mark_withdrawal_failed_and_release(
      v_request.id,
      'cancelled: ' || p_reason,
      v_request.external_payout_id,
      p_metadata || jsonb_build_object(
        'cancelled_by_admin_id',
        p_admin_user_id,
        'admin_case_id',
        p_admin_case_id
      )
    );
  end if;

  update withdrawal_requests
  set
    status = 'cancelled',
    cancelled_at = now(),
    cancellation_reason = p_reason,
    updated_at = now(),
    metadata = metadata || p_metadata || jsonb_build_object(
      'cancelled_by_admin_id',
      p_admin_user_id,
      'admin_case_id',
      p_admin_case_id
    )
  where id = v_request.id;

  perform log_withdrawal_status_event(
    v_request.id,
    v_request.status,
    'cancelled',
    'withdrawal_cancelled',
    p_reason,
    v_request.external_payout_id,
    v_request.provider_key,
    null,
    p_admin_user_id,
    p_admin_case_id,
    p_metadata
  );

  return v_request.id;
end;
$$;

create or replace function sync_withdrawal_from_external_payout(
  p_external_payout_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_payout external_payouts%rowtype;
  v_request withdrawal_requests%rowtype;
begin
  select *
  into v_payout
  from external_payouts
  where id = p_external_payout_id;

  if v_payout.id is null then
    raise exception 'external payout not found: %', p_external_payout_id;
  end if;

  select *
  into v_request
  from withdrawal_requests
  where id = v_payout.withdrawal_request_id
  for update;

  if v_request.id is null then
    raise exception 'withdrawal request not found for external payout %',
      p_external_payout_id;
  end if;

  if v_payout.status = 'paid' then
    perform mark_withdrawal_paid(
      v_request.id,
      v_payout.id,
      v_payout.processor_reference,
      p_metadata || jsonb_build_object(
        'sync_source',
        'external_payout'
      )
    );

  elsif v_payout.status in ('failed', 'cancelled') then
    perform mark_withdrawal_failed_and_release(
      v_request.id,
      coalesce(v_payout.failure_reason, 'external payout failed/cancelled'),
      v_payout.id,
      p_metadata || jsonb_build_object(
        'sync_source',
        'external_payout'
      )
    );

  elsif v_payout.status in ('processing', 'submitted') then
    update withdrawal_requests
    set
      status = 'processing',
      updated_at = now(),
      metadata = metadata || p_metadata
    where id = v_request.id
      and status in ('submitted', 'reserved');

    perform log_withdrawal_status_event(
      v_request.id,
      v_request.status,
      'processing',
      'withdrawal_processing',
      'external payout processing',
      v_payout.id,
      v_payout.provider_key,
      null,
      null,
      null,
      p_metadata
    );

  elsif v_payout.status in ('reversed', 'partially_reversed') then
    update withdrawal_requests
    set
      status = v_payout.status,
      reversed_at = coalesce(v_payout.reversed_at, now()),
      updated_at = now(),
      metadata = metadata || p_metadata
    where id = v_request.id;

    perform log_withdrawal_status_event(
      v_request.id,
      v_request.status,
      v_payout.status,
      'withdrawal_reversed_from_provider',
      'external payout reversed',
      v_payout.id,
      v_payout.provider_key,
      null,
      null,
      null,
      p_metadata
    );
  end if;

  return v_request.id;
end;
$$;

create or replace view withdrawal_request_details as
select
  wr.id as withdrawal_request_id,
  wr.wallet_id,
  wr.user_id,
  wr.currency_code,
  wr.requested_amount_minor,
  wr.processor_fee_minor,
  wr.net_amount_minor,
  wr.status,
  wr.trust_gate_decision,
  wr.trust_gate_reason,
  wr.provider_key,
  wr.external_payout_id,
  wr.wallet_reservation_group_id,
  wr.accounting_journal_entry_id,
  wr.requested_at,
  wr.approved_at,
  wr.reserved_at,
  wr.submitted_at,
  wr.paid_at,
  wr.failed_at,
  wr.cancelled_at,
  wr.reversed_at,
  wr.failure_reason,
  wr.cancellation_reason,

  ep.status as external_payout_status,
  ep.provider_payout_id,
  ep.processor_reference,
  ep.paid_at as external_paid_at,
  ep.failed_at as external_failed_at,
  ep.reversed_at as external_reversed_at,

  count(distinct wrl.id) as reserved_lot_count,

  jsonb_agg(
    distinct jsonb_build_object(
      'reserved_lot_id', wrl.id,
      'wallet_value_lot_id', wrl.wallet_value_lot_id,
      'reserved_amount_minor', wrl.reserved_amount_minor,
      'status', wrl.status,
      'created_at', wrl.created_at,
      'released_at', wrl.released_at,
      'consumed_at', wrl.consumed_at
    )
  ) filter (where wrl.id is not null) as reserved_lots,

  jsonb_agg(
    distinct jsonb_build_object(
      'status_event_id', wse.id,
      'previous_status', wse.previous_status,
      'new_status', wse.new_status,
      'event_type', wse.event_type,
      'reason', wse.reason,
      'created_at', wse.created_at,
      'metadata', wse.metadata
    )
  ) filter (where wse.id is not null) as status_events

from withdrawal_requests wr
left join external_payouts ep
  on ep.id = wr.external_payout_id
left join withdrawal_reserved_lots wrl
  on wrl.withdrawal_request_id = wr.id
left join withdrawal_status_events wse
  on wse.withdrawal_request_id = wr.id
group by wr.id, ep.id;

create or replace view withdrawal_dashboard as
select
  status,
  currency_code,

  count(*) as withdrawal_count,

  coalesce(sum(requested_amount_minor), 0)::bigint as total_requested_minor,
  coalesce(sum(net_amount_minor), 0)::bigint as total_net_minor,

  count(*) filter (where trust_gate_decision = 'deny') as trust_denied_count,
  count(*) filter (where trust_gate_decision in ('hold', 'review')) as trust_review_count,

  min(created_at) as first_seen_at,
  max(created_at) as latest_seen_at

from withdrawal_requests
group by status, currency_code;

create or replace view stale_withdrawal_requests as
select
  *
from withdrawal_requests
where
  (
    status = 'requested'
    and created_at < now() - interval '1 hour'
  )
  or
  (
    status = 'approved'
    and approved_at < now() - interval '1 hour'
  )
  or
  (
    status = 'reserved'
    and reserved_at < now() - interval '6 hours'
  )
  or
  (
    status in ('submitted', 'processing')
    and submitted_at < now() - interval '3 days'
  );

create table if not exists withdrawal_maintenance_runs (
  id uuid primary key default gen_random_uuid(),

  run_type text not null default 'scheduled',
  status text not null default 'processing',

  scanned_count integer not null default 0,
  corrected_count integer not null default 0,
  failed_count integer not null default 0,

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,

  failure_reason text,

  metadata jsonb not null default '{}'::jsonb,

  constraint withdrawal_maintenance_runs_status_check
  check (
    status in (
      'processing',
      'completed',
      'failed'
    )
  )
);

create or replace function run_withdrawal_maintenance_job(
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
  v_corrected integer := 0;
  v_failed integer := 0;
begin
  if p_batch_size <= 0 then
    raise exception 'batch size must be positive';
  end if;

  insert into withdrawal_maintenance_runs (
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
    select *
    from withdrawal_requests
    where
      (
        status = 'approved'
        and approved_at < now() - interval '24 hours'
      )
      or
      (
        status = 'reserved'
        and external_payout_id is null
        and reserved_at < now() - interval '24 hours'
      )
    order by created_at asc
    limit p_batch_size
    for update skip locked
  loop
    v_scanned := v_scanned + 1;

    begin
      if v_row.status = 'reserved' then
        perform mark_withdrawal_failed_and_release(
          v_row.id,
          'withdrawal expired before provider submission',
          null,
          p_metadata || jsonb_build_object(
            'withdrawal_maintenance_run_id',
            v_run_id
          )
        );
      else
        update withdrawal_requests
        set
          status = 'cancelled',
          cancelled_at = now(),
          cancellation_reason = 'approved withdrawal expired before reservation',
          updated_at = now()
        where id = v_row.id;

        perform log_withdrawal_status_event(
          v_row.id,
          v_row.status,
          'cancelled',
          'withdrawal_expired',
          'approved withdrawal expired before reservation',
          null,
          v_row.provider_key,
          null,
          null,
          null,
          p_metadata || jsonb_build_object(
            'withdrawal_maintenance_run_id',
            v_run_id
          )
        );
      end if;

      v_corrected := v_corrected + 1;

    exception
      when others then
        v_failed := v_failed + 1;
    end;
  end loop;

  update withdrawal_maintenance_runs
  set
    status = 'completed',
    completed_at = now(),
    scanned_count = v_scanned,
    corrected_count = v_corrected,
    failed_count = v_failed
  where id = v_run_id;

  return v_run_id;

exception
  when others then
    if v_run_id is not null then
      update withdrawal_maintenance_runs
      set
        status = 'failed',
        failed_at = now(),
        failure_reason = sqlerrm
      where id = v_run_id;
    end if;

    raise;
end;
$$;

-- Integration note:
-- apply_payout_provider_event() should call:
-- perform sync_withdrawal_from_external_payout(
--   v_payout.id,
--   p_metadata || jsonb_build_object(
--     'payout_provider_event_id',
--     v_event.id
--   )
-- );
