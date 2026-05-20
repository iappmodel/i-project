-- 28/post-MVP schema — withdrawal reservation lifecycle (requested -> reserved -> processing -> paid/failed/cancelled/reversed).

create table if not exists wallet_withdrawal_requests (
  id uuid primary key default gen_random_uuid(),

  wallet_id uuid not null references wallets(id),
  user_id uuid not null,

  currency_code text not null default 'USD',
  requested_amount_minor bigint not null,
  reserved_amount_minor bigint not null default 0,
  paid_amount_minor bigint not null default 0,

  status text not null default 'requested',

  payout_provider text,
  payout_account_id uuid,
  provider_transfer_id text,

  idempotency_key text not null,

  failure_reason text,
  cancelled_reason text,
  reversal_reason text,

  metadata jsonb not null default '{}'::jsonb,

  requested_at timestamptz not null default now(),
  reserved_at timestamptz,
  processing_at timestamptz,
  paid_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,
  reversed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint wallet_withdrawal_requests_amount_check
  check (
    requested_amount_minor > 0
    and reserved_amount_minor >= 0
    and paid_amount_minor >= 0
    and reserved_amount_minor <= requested_amount_minor
    and paid_amount_minor <= requested_amount_minor
  ),

  constraint wallet_withdrawal_requests_status_check
  check (
    status in (
      'requested',
      'reserved',
      'processing',
      'paid',
      'failed',
      'cancelled',
      'reversed'
    )
  )
);

create unique index if not exists wallet_withdrawal_requests_idempotency_unique
on wallet_withdrawal_requests (idempotency_key);

create index if not exists wallet_withdrawal_requests_wallet_idx
on wallet_withdrawal_requests (wallet_id, created_at desc);

create index if not exists wallet_withdrawal_requests_user_idx
on wallet_withdrawal_requests (user_id, created_at desc);

create index if not exists wallet_withdrawal_requests_status_idx
on wallet_withdrawal_requests (status, created_at desc);

create table if not exists wallet_reservation_groups (
  id uuid primary key default gen_random_uuid(),

  wallet_id uuid not null references wallets(id),
  user_id uuid not null,

  reservation_type text not null,
  reservation_id uuid not null,

  currency_code text not null default 'USD',

  requested_amount_minor bigint not null,
  reserved_amount_minor bigint not null default 0,

  status text not null default 'processing',

  idempotency_key text not null,
  operation_type text not null default 'reserve_wallet_balance',

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  completed_at timestamptz,
  released_at timestamptz,
  failed_at timestamptz,

  constraint wallet_reservation_groups_amount_check
  check (
    requested_amount_minor > 0
    and reserved_amount_minor >= 0
    and reserved_amount_minor <= requested_amount_minor
  ),

  constraint wallet_reservation_groups_status_check
  check (
    status in (
      'processing',
      'reserved',
      'released',
      'consumed',
      'failed'
    )
  )
);

create unique index if not exists wallet_reservation_groups_idempotency_unique
on wallet_reservation_groups (operation_type, idempotency_key);

create index if not exists wallet_reservation_groups_wallet_idx
on wallet_reservation_groups (wallet_id, created_at desc);

create index if not exists wallet_reservation_groups_reservation_idx
on wallet_reservation_groups (reservation_type, reservation_id);

create table if not exists wallet_lot_reservations (
  id uuid primary key default gen_random_uuid(),

  reservation_group_id uuid not null references wallet_reservation_groups(id),
  wallet_id uuid not null references wallets(id),
  user_id uuid not null,
  value_lot_id uuid not null references wallet_value_lots(id),

  reservation_type text not null,
  reservation_id uuid not null,

  currency_code text not null default 'USD',

  reserved_amount_minor bigint not null,
  consumed_amount_minor bigint not null default 0,
  released_amount_minor bigint not null default 0,

  status text not null default 'reserved',

  created_at timestamptz not null default now(),
  consumed_at timestamptz,
  released_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  constraint wallet_lot_reservations_amount_check
  check (
    reserved_amount_minor > 0
    and consumed_amount_minor >= 0
    and released_amount_minor >= 0
    and consumed_amount_minor + released_amount_minor <= reserved_amount_minor
  ),

  constraint wallet_lot_reservations_status_check
  check (
    status in (
      'reserved',
      'consumed',
      'released',
      'partially_released'
    )
  )
);

create index if not exists wallet_lot_reservations_group_idx
on wallet_lot_reservations (reservation_group_id);

create index if not exists wallet_lot_reservations_lot_idx
on wallet_lot_reservations (value_lot_id);

create index if not exists wallet_lot_reservations_reservation_idx
on wallet_lot_reservations (reservation_type, reservation_id);

alter table wallet_ledger_entries
add column if not exists reservation_group_id uuid references wallet_reservation_groups(id);

create index if not exists wallet_ledger_entries_reservation_group_idx
on wallet_ledger_entries (reservation_group_id);

create or replace function reserve_wallet_balance(
  p_wallet_id uuid,
  p_user_id uuid,
  p_amount_minor bigint,
  p_reservation_type text,
  p_reservation_id uuid,
  p_currency_code text default 'USD',
  p_cashout_only boolean default false,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_available bigint;
  v_remaining_to_reserve bigint;
  v_take_amount bigint;

  v_lot wallet_value_lots%rowtype;

  v_reservation_group_id uuid;
  v_lot_reservation_id uuid;
  v_ledger_entry_id uuid;

  v_should_execute boolean;
  v_existing_result_id uuid;
  v_payload jsonb;
begin
  if p_amount_minor <= 0 then
    raise exception 'reservation amount must be positive';
  end if;

  if p_wallet_id is null then
    raise exception 'wallet id is required';
  end if;

  if p_user_id is null then
    raise exception 'user id is required';
  end if;

  if p_reservation_type is null or length(trim(p_reservation_type)) = 0 then
    raise exception 'reservation type is required';
  end if;

  if p_reservation_id is null then
    raise exception 'reservation id is required';
  end if;

  if p_idempotency_key is null then
    p_idempotency_key := 'reserve:' || p_reservation_type || ':' || p_reservation_id::text;
  end if;

  v_payload := jsonb_build_object(
    'wallet_id', p_wallet_id,
    'user_id', p_user_id,
    'amount_minor', p_amount_minor,
    'reservation_type', p_reservation_type,
    'reservation_id', p_reservation_id,
    'currency_code', coalesce(p_currency_code, 'USD'),
    'cashout_only', p_cashout_only
  );

  select should_execute, existing_result_id
  into v_should_execute, v_existing_result_id
  from wallet_begin_idempotent_operation(
    'reserve_wallet_balance',
    p_idempotency_key,
    p_user_id,
    p_wallet_id,
    v_payload,
    p_metadata
  );

  if v_should_execute is false then
    return v_existing_result_id;
  end if;

  v_available := wallet_available_balance(
    p_wallet_id,
    coalesce(p_currency_code, 'USD'),
    p_cashout_only
  );

  if v_available < p_amount_minor then
    update wallet_idempotency_keys
    set
      status = 'failed',
      failed_at = now(),
      metadata = metadata || jsonb_build_object(
        'failed_reason',
        'insufficient_available_balance_for_reservation',
        'available_minor',
        v_available,
        'requested_minor',
        p_amount_minor
      )
    where operation_type = 'reserve_wallet_balance'
      and idempotency_key = p_idempotency_key;

    raise exception 'insufficient available balance for reservation. wallet %, available %, requested %',
      p_wallet_id,
      v_available,
      p_amount_minor;
  end if;

  insert into wallet_reservation_groups (
    wallet_id,
    user_id,
    reservation_type,
    reservation_id,
    currency_code,
    requested_amount_minor,
    reserved_amount_minor,
    status,
    idempotency_key,
    operation_type,
    metadata
  )
  values (
    p_wallet_id,
    p_user_id,
    p_reservation_type,
    p_reservation_id,
    coalesce(p_currency_code, 'USD'),
    p_amount_minor,
    0,
    'processing',
    p_idempotency_key,
    'reserve_wallet_balance',
    p_metadata
  )
  returning id into v_reservation_group_id;

  v_remaining_to_reserve := p_amount_minor;

  for v_lot in
    select *
    from wallet_value_lots
    where wallet_id = p_wallet_id
      and user_id = p_user_id
      and currency_code = coalesce(p_currency_code, 'USD')
      and status = 'available'
      and remaining_amount_minor > 0
      and (
        p_cashout_only is false
        or cashout_eligible is true
      )
      and (
        expires_at is null
        or expires_at > now()
      )
    order by
      expires_at asc nulls last,
      released_at asc nulls last,
      created_at asc,
      remaining_amount_minor asc,
      id asc
    for update
  loop
    exit when v_remaining_to_reserve <= 0;

    v_take_amount := least(v_lot.remaining_amount_minor, v_remaining_to_reserve);

    update wallet_value_lots
    set
      remaining_amount_minor = remaining_amount_minor - v_take_amount,
      status =
        case
          when remaining_amount_minor - v_take_amount = 0
          then 'locked'
          else status
        end,
      updated_at = now()
    where id = v_lot.id;

    insert into wallet_lot_reservations (
      reservation_group_id,
      wallet_id,
      user_id,
      value_lot_id,
      reservation_type,
      reservation_id,
      currency_code,
      reserved_amount_minor,
      status,
      metadata
    )
    values (
      v_reservation_group_id,
      p_wallet_id,
      p_user_id,
      v_lot.id,
      p_reservation_type,
      p_reservation_id,
      coalesce(p_currency_code, 'USD'),
      v_take_amount,
      'reserved',
      p_metadata
    )
    returning id into v_lot_reservation_id;

    insert into wallet_ledger_entries (
      wallet_id,
      user_id,
      value_lot_id,
      reservation_group_id,
      source_type,
      source_id,
      campaign_id,
      entry_type,
      direction,
      currency_code,
      amount_minor,
      available_impact_minor,
      pending_impact_minor,
      locked_impact_minor,
      status,
      idempotency_key,
      operation_type,
      metadata
    )
    values (
      p_wallet_id,
      p_user_id,
      v_lot.id,
      v_reservation_group_id,
      p_reservation_type,
      p_reservation_id,
      v_lot.campaign_id,
      'lock',
      1,
      coalesce(p_currency_code, 'USD'),
      v_take_amount,
      -v_take_amount,
      0,
      v_take_amount,
      'posted',
      p_idempotency_key || ':lot_reservation:' || v_lot_reservation_id::text,
      'reserve_wallet_balance',
      p_metadata || jsonb_build_object(
        'reservation_group_id',
        v_reservation_group_id,
        'lot_amount_before',
        v_lot.remaining_amount_minor,
        'reserved_amount',
        v_take_amount
      )
    )
    returning id into v_ledger_entry_id;

    v_remaining_to_reserve := v_remaining_to_reserve - v_take_amount;
  end loop;

  if v_remaining_to_reserve <> 0 then
    update wallet_reservation_groups
    set
      status = 'failed',
      failed_at = now(),
      reserved_amount_minor = p_amount_minor - v_remaining_to_reserve,
      metadata = metadata || jsonb_build_object(
        'failed_reason',
        'reservation_selection_race',
        'remaining_to_reserve',
        v_remaining_to_reserve
      )
    where id = v_reservation_group_id;

    update wallet_idempotency_keys
    set
      status = 'failed',
      failed_at = now(),
      metadata = metadata || jsonb_build_object(
        'failed_reason',
        'reservation_selection_race',
        'remaining_to_reserve',
        v_remaining_to_reserve
      )
    where operation_type = 'reserve_wallet_balance'
      and idempotency_key = p_idempotency_key;

    raise exception 'reservation failed after lot selection. remaining amount %',
      v_remaining_to_reserve;
  end if;

  update wallet_reservation_groups
  set
    status = 'reserved',
    completed_at = now(),
    reserved_amount_minor = p_amount_minor
  where id = v_reservation_group_id;

  perform wallet_complete_idempotent_operation(
    'reserve_wallet_balance',
    p_idempotency_key,
    'wallet_reservation_group',
    v_reservation_group_id,
    jsonb_build_object(
      'reservation_group_id', v_reservation_group_id,
      'reserved_amount_minor', p_amount_minor,
      'currency_code', coalesce(p_currency_code, 'USD')
    )
  );

  return v_reservation_group_id;
end;
$$;

create or replace function create_withdrawal_request(
  p_wallet_id uuid,
  p_user_id uuid,
  p_amount_minor bigint,
  p_payout_provider text default null,
  p_payout_account_id uuid default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_withdrawal_id uuid;
  v_reservation_group_id uuid;
  v_should_execute boolean;
  v_existing_result_id uuid;
  v_payload jsonb;
begin
  if p_amount_minor <= 0 then
    raise exception 'withdrawal amount must be positive';
  end if;

  if p_idempotency_key is null then
    p_idempotency_key := 'withdrawal_request:' || gen_random_uuid()::text;
  end if;

  v_payload := jsonb_build_object(
    'wallet_id', p_wallet_id,
    'user_id', p_user_id,
    'amount_minor', p_amount_minor,
    'currency_code', 'USD',
    'payout_provider', p_payout_provider,
    'payout_account_id', p_payout_account_id
  );

  select should_execute, existing_result_id
  into v_should_execute, v_existing_result_id
  from wallet_begin_idempotent_operation(
    'create_withdrawal_request',
    p_idempotency_key,
    p_user_id,
    p_wallet_id,
    v_payload,
    p_metadata
  );

  if v_should_execute is false then
    return v_existing_result_id;
  end if;

  insert into wallet_withdrawal_requests (
    wallet_id,
    user_id,
    currency_code,
    requested_amount_minor,
    reserved_amount_minor,
    status,
    payout_provider,
    payout_account_id,
    idempotency_key,
    metadata
  )
  values (
    p_wallet_id,
    p_user_id,
    'USD',
    p_amount_minor,
    0,
    'requested',
    p_payout_provider,
    p_payout_account_id,
    p_idempotency_key,
    p_metadata
  )
  returning id into v_withdrawal_id;

  v_reservation_group_id := reserve_wallet_balance(
    p_wallet_id,
    p_user_id,
    p_amount_minor,
    'withdrawal',
    v_withdrawal_id,
    'USD',
    true,
    'reserve:withdrawal:' || v_withdrawal_id::text,
    p_metadata
  );

  update wallet_withdrawal_requests
  set
    status = 'reserved',
    reserved_amount_minor = p_amount_minor,
    reserved_at = now(),
    updated_at = now(),
    metadata = metadata || jsonb_build_object(
      'reservation_group_id',
      v_reservation_group_id
    )
  where id = v_withdrawal_id;

  perform wallet_complete_idempotent_operation(
    'create_withdrawal_request',
    p_idempotency_key,
    'wallet_withdrawal_request',
    v_withdrawal_id,
    jsonb_build_object(
      'withdrawal_id', v_withdrawal_id,
      'reservation_group_id', v_reservation_group_id,
      'reserved_amount_minor', p_amount_minor
    )
  );

  return v_withdrawal_id;
end;
$$;

create or replace function mark_withdrawal_processing(
  p_withdrawal_id uuid,
  p_provider_transfer_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
as $$
declare
  v_withdrawal wallet_withdrawal_requests%rowtype;
begin
  select *
  into v_withdrawal
  from wallet_withdrawal_requests
  where id = p_withdrawal_id
  for update;

  if v_withdrawal.id is null then
    raise exception 'withdrawal not found: %', p_withdrawal_id;
  end if;

  if v_withdrawal.status <> 'reserved' then
    raise exception 'only reserved withdrawals can move to processing. withdrawal %, status %',
      p_withdrawal_id,
      v_withdrawal.status;
  end if;

  update wallet_withdrawal_requests
  set
    status = 'processing',
    processing_at = now(),
    provider_transfer_id = coalesce(p_provider_transfer_id, provider_transfer_id),
    updated_at = now(),
    metadata = metadata || p_metadata
  where id = p_withdrawal_id;
end;
$$;

create or replace function complete_withdrawal_request(
  p_withdrawal_id uuid,
  p_provider_transfer_id text default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_withdrawal wallet_withdrawal_requests%rowtype;
  v_reservation_group wallet_reservation_groups%rowtype;
  v_reservation wallet_lot_reservations%rowtype;
  v_ledger_entry_id uuid;

  v_should_execute boolean;
  v_existing_result_id uuid;
  v_payload jsonb;
begin
  if p_idempotency_key is null then
    p_idempotency_key := 'complete_withdrawal:' || p_withdrawal_id::text;
  end if;

  select *
  into v_withdrawal
  from wallet_withdrawal_requests
  where id = p_withdrawal_id
  for update;

  if v_withdrawal.id is null then
    raise exception 'withdrawal not found: %', p_withdrawal_id;
  end if;

  v_payload := jsonb_build_object(
    'withdrawal_id', p_withdrawal_id,
    'wallet_id', v_withdrawal.wallet_id,
    'user_id', v_withdrawal.user_id,
    'amount_minor', v_withdrawal.reserved_amount_minor,
    'provider_transfer_id', p_provider_transfer_id
  );

  select should_execute, existing_result_id
  into v_should_execute, v_existing_result_id
  from wallet_begin_idempotent_operation(
    'complete_withdrawal_request',
    p_idempotency_key,
    v_withdrawal.user_id,
    v_withdrawal.wallet_id,
    v_payload,
    p_metadata
  );

  if v_should_execute is false then
    return v_existing_result_id;
  end if;

  if v_withdrawal.status not in ('reserved', 'processing') then
    raise exception 'only reserved/processing withdrawals can be completed. withdrawal %, status %',
      p_withdrawal_id,
      v_withdrawal.status;
  end if;

  select *
  into v_reservation_group
  from wallet_reservation_groups
  where reservation_type = 'withdrawal'
    and reservation_id = p_withdrawal_id
    and status = 'reserved'
  for update;

  if v_reservation_group.id is null then
    raise exception 'active reservation group not found for withdrawal: %',
      p_withdrawal_id;
  end if;

  for v_reservation in
    select *
    from wallet_lot_reservations
    where reservation_group_id = v_reservation_group.id
      and status = 'reserved'
    order by created_at asc, id asc
    for update
  loop
    update wallet_lot_reservations
    set
      status = 'consumed',
      consumed_amount_minor = reserved_amount_minor,
      consumed_at = now()
    where id = v_reservation.id;

    update wallet_value_lots
    set
      status = 'withdrawn',
      withdrawn_at = now(),
      updated_at = now()
    where id = v_reservation.value_lot_id
      and remaining_amount_minor = 0;

    insert into wallet_ledger_entries (
      wallet_id,
      user_id,
      value_lot_id,
      reservation_group_id,
      source_type,
      source_id,
      entry_type,
      direction,
      currency_code,
      amount_minor,
      available_impact_minor,
      pending_impact_minor,
      locked_impact_minor,
      status,
      idempotency_key,
      operation_type,
      metadata
    )
    values (
      v_withdrawal.wallet_id,
      v_withdrawal.user_id,
      v_reservation.value_lot_id,
      v_reservation_group.id,
      'withdrawal',
      p_withdrawal_id,
      'withdrawal',
      -1,
      v_withdrawal.currency_code,
      v_reservation.reserved_amount_minor,
      0,
      0,
      -v_reservation.reserved_amount_minor,
      'posted',
      p_idempotency_key || ':lot_reservation:' || v_reservation.id::text,
      'complete_withdrawal_request',
      p_metadata || jsonb_build_object(
        'withdrawal_id',
        p_withdrawal_id,
        'provider_transfer_id',
        p_provider_transfer_id,
        'lot_reservation_id',
        v_reservation.id
      )
    )
    returning id into v_ledger_entry_id;
  end loop;

  update wallet_reservation_groups
  set
    status = 'consumed',
    completed_at = now(),
    metadata = metadata || jsonb_build_object(
      'consumed_by',
      'complete_withdrawal_request',
      'withdrawal_id',
      p_withdrawal_id
    )
  where id = v_reservation_group.id;

  update wallet_withdrawal_requests
  set
    status = 'paid',
    paid_amount_minor = reserved_amount_minor,
    paid_at = now(),
    provider_transfer_id = coalesce(p_provider_transfer_id, provider_transfer_id),
    updated_at = now(),
    metadata = metadata || p_metadata
  where id = p_withdrawal_id;

  perform wallet_complete_idempotent_operation(
    'complete_withdrawal_request',
    p_idempotency_key,
    'wallet_withdrawal_request',
    p_withdrawal_id,
    jsonb_build_object(
      'withdrawal_id', p_withdrawal_id,
      'reservation_group_id', v_reservation_group.id,
      'paid_amount_minor', v_withdrawal.reserved_amount_minor
    )
  );

  return p_withdrawal_id;
end;
$$;

create or replace function release_wallet_reservation(
  p_reservation_group_id uuid,
  p_reason text default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_group wallet_reservation_groups%rowtype;
  v_reservation wallet_lot_reservations%rowtype;
  v_should_execute boolean;
  v_existing_result_id uuid;
  v_payload jsonb;
begin
  if p_idempotency_key is null then
    p_idempotency_key := 'release_reservation:' || p_reservation_group_id::text;
  end if;

  select *
  into v_group
  from wallet_reservation_groups
  where id = p_reservation_group_id
  for update;

  if v_group.id is null then
    raise exception 'reservation group not found: %', p_reservation_group_id;
  end if;

  v_payload := jsonb_build_object(
    'reservation_group_id', p_reservation_group_id,
    'wallet_id', v_group.wallet_id,
    'user_id', v_group.user_id,
    'reserved_amount_minor', v_group.reserved_amount_minor
  );

  select should_execute, existing_result_id
  into v_should_execute, v_existing_result_id
  from wallet_begin_idempotent_operation(
    'release_wallet_reservation',
    p_idempotency_key,
    v_group.user_id,
    v_group.wallet_id,
    v_payload,
    p_metadata
  );

  if v_should_execute is false then
    return v_existing_result_id;
  end if;

  if v_group.status <> 'reserved' then
    raise exception 'only reserved reservation groups can be released. group %, status %',
      p_reservation_group_id,
      v_group.status;
  end if;

  for v_reservation in
    select *
    from wallet_lot_reservations
    where reservation_group_id = p_reservation_group_id
      and status = 'reserved'
    order by created_at asc, id asc
    for update
  loop
    update wallet_lot_reservations
    set
      status = 'released',
      released_amount_minor = reserved_amount_minor,
      released_at = now()
    where id = v_reservation.id;

    update wallet_value_lots
    set
      remaining_amount_minor = remaining_amount_minor + v_reservation.reserved_amount_minor,
      status = 'available',
      updated_at = now()
    where id = v_reservation.value_lot_id;

    insert into wallet_ledger_entries (
      wallet_id,
      user_id,
      value_lot_id,
      reservation_group_id,
      source_type,
      source_id,
      entry_type,
      direction,
      currency_code,
      amount_minor,
      available_impact_minor,
      pending_impact_minor,
      locked_impact_minor,
      status,
      idempotency_key,
      operation_type,
      metadata
    )
    values (
      v_group.wallet_id,
      v_group.user_id,
      v_reservation.value_lot_id,
      v_group.id,
      v_group.reservation_type,
      v_group.reservation_id,
      'unlock',
      1,
      v_group.currency_code,
      v_reservation.reserved_amount_minor,
      v_reservation.reserved_amount_minor,
      0,
      -v_reservation.reserved_amount_minor,
      'posted',
      p_idempotency_key || ':lot_reservation:' || v_reservation.id::text,
      'release_wallet_reservation',
      p_metadata || jsonb_build_object(
        'reason',
        p_reason,
        'lot_reservation_id',
        v_reservation.id
      )
    );
  end loop;

  update wallet_reservation_groups
  set
    status = 'released',
    released_at = now(),
    metadata = metadata || jsonb_build_object(
      'release_reason',
      p_reason
    )
  where id = p_reservation_group_id;

  perform wallet_complete_idempotent_operation(
    'release_wallet_reservation',
    p_idempotency_key,
    'wallet_reservation_group',
    p_reservation_group_id,
    jsonb_build_object(
      'reservation_group_id', p_reservation_group_id,
      'released_amount_minor', v_group.reserved_amount_minor
    )
  );

  return p_reservation_group_id;
end;
$$;

create or replace function fail_withdrawal_request(
  p_withdrawal_id uuid,
  p_failure_reason text,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_withdrawal wallet_withdrawal_requests%rowtype;
  v_group wallet_reservation_groups%rowtype;
begin
  select *
  into v_withdrawal
  from wallet_withdrawal_requests
  where id = p_withdrawal_id
  for update;

  if v_withdrawal.id is null then
    raise exception 'withdrawal not found: %', p_withdrawal_id;
  end if;

  if v_withdrawal.status not in ('reserved', 'processing') then
    raise exception 'only reserved/processing withdrawals can fail. withdrawal %, status %',
      p_withdrawal_id,
      v_withdrawal.status;
  end if;

  select *
  into v_group
  from wallet_reservation_groups
  where reservation_type = 'withdrawal'
    and reservation_id = p_withdrawal_id
    and status = 'reserved'
  for update;

  if v_group.id is not null then
    perform release_wallet_reservation(
      v_group.id,
      coalesce(p_failure_reason, 'withdrawal_failed'),
      coalesce(
        p_idempotency_key,
        'fail_withdrawal_release:' || p_withdrawal_id::text
      ),
      p_metadata
    );
  end if;

  update wallet_withdrawal_requests
  set
    status = 'failed',
    failure_reason = p_failure_reason,
    failed_at = now(),
    updated_at = now(),
    metadata = metadata || p_metadata
  where id = p_withdrawal_id;

  return p_withdrawal_id;
end;
$$;

create or replace function cancel_withdrawal_request(
  p_withdrawal_id uuid,
  p_cancelled_reason text,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_withdrawal wallet_withdrawal_requests%rowtype;
  v_group wallet_reservation_groups%rowtype;
begin
  select *
  into v_withdrawal
  from wallet_withdrawal_requests
  where id = p_withdrawal_id
  for update;

  if v_withdrawal.id is null then
    raise exception 'withdrawal not found: %', p_withdrawal_id;
  end if;

  if v_withdrawal.status <> 'reserved' then
    raise exception 'only reserved withdrawals can be cancelled. withdrawal %, status %',
      p_withdrawal_id,
      v_withdrawal.status;
  end if;

  select *
  into v_group
  from wallet_reservation_groups
  where reservation_type = 'withdrawal'
    and reservation_id = p_withdrawal_id
    and status = 'reserved'
  for update;

  if v_group.id is not null then
    perform release_wallet_reservation(
      v_group.id,
      coalesce(p_cancelled_reason, 'withdrawal_cancelled'),
      coalesce(
        p_idempotency_key,
        'cancel_withdrawal_release:' || p_withdrawal_id::text
      ),
      p_metadata
    );
  end if;

  update wallet_withdrawal_requests
  set
    status = 'cancelled',
    cancelled_reason = p_cancelled_reason,
    cancelled_at = now(),
    updated_at = now(),
    metadata = metadata || p_metadata
  where id = p_withdrawal_id;

  return p_withdrawal_id;
end;
$$;

create or replace function withdraw_wallet_balance(
  p_wallet_id uuid,
  p_user_id uuid,
  p_amount_minor bigint,
  p_withdrawal_id uuid,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  if p_withdrawal_id is null then
    raise exception 'withdrawal id is required';
  end if;

  raise exception
    'direct withdrawal is deprecated. use create_withdrawal_request + complete/fail/cancel flow';
end;
$$;

create or replace view wallet_balances as
with lot_balances as (
  select
    wallet_id,
    user_id,
    currency_code,

    coalesce(sum(remaining_amount_minor) filter (
      where status = 'pending'
    ), 0)::bigint as pending_minor,

    coalesce(sum(remaining_amount_minor) filter (
      where status = 'available'
    ), 0)::bigint as available_minor,

    coalesce(sum(remaining_amount_minor) filter (
      where status = 'available'
        and cashout_eligible is true
    ), 0)::bigint as withdrawable_minor,

    coalesce(sum(remaining_amount_minor), 0)::bigint as liquid_remaining_minor,

    max(updated_at) as last_lot_update_at

  from wallet_value_lots
  where remaining_amount_minor > 0
  group by wallet_id, user_id, currency_code
),

reservation_balances as (
  select
    wallet_id,
    user_id,
    currency_code,

    coalesce(sum(reserved_amount_minor - consumed_amount_minor - released_amount_minor), 0)::bigint as locked_minor

  from wallet_lot_reservations
  where status = 'reserved'
  group by wallet_id, user_id, currency_code
)

select
  coalesce(lb.wallet_id, rb.wallet_id) as wallet_id,
  coalesce(lb.user_id, rb.user_id) as user_id,
  coalesce(lb.currency_code, rb.currency_code) as currency_code,

  coalesce(lb.pending_minor, 0)::bigint as pending_minor,
  coalesce(lb.available_minor, 0)::bigint as available_minor,
  coalesce(rb.locked_minor, 0)::bigint as locked_minor,
  coalesce(lb.withdrawable_minor, 0)::bigint as withdrawable_minor,

  (
    coalesce(lb.liquid_remaining_minor, 0)
    + coalesce(rb.locked_minor, 0)
  )::bigint as total_remaining_minor,

  lb.last_lot_update_at

from lot_balances lb
full outer join reservation_balances rb
  on rb.wallet_id = lb.wallet_id
 and rb.user_id = lb.user_id
 and rb.currency_code = lb.currency_code;

create or replace view wallet_withdrawal_request_details as
select
  wr.id as withdrawal_id,
  wr.wallet_id,
  wr.user_id,
  wr.currency_code,
  wr.requested_amount_minor,
  wr.reserved_amount_minor,
  wr.paid_amount_minor,
  wr.status,
  wr.payout_provider,
  wr.payout_account_id,
  wr.provider_transfer_id,
  wr.failure_reason,
  wr.cancelled_reason,
  wr.reversal_reason,
  wr.requested_at,
  wr.reserved_at,
  wr.processing_at,
  wr.paid_at,
  wr.failed_at,
  wr.cancelled_at,
  wr.reversed_at,

  rg.id as reservation_group_id,
  rg.status as reservation_status,

  count(lr.id) as lot_reservation_count,

  coalesce(sum(lr.reserved_amount_minor), 0)::bigint as total_lot_reserved_minor,
  coalesce(sum(lr.consumed_amount_minor), 0)::bigint as total_lot_consumed_minor,
  coalesce(sum(lr.released_amount_minor), 0)::bigint as total_lot_released_minor,

  jsonb_agg(
    jsonb_build_object(
      'lot_reservation_id', lr.id,
      'value_lot_id', lr.value_lot_id,
      'reserved_amount_minor', lr.reserved_amount_minor,
      'consumed_amount_minor', lr.consumed_amount_minor,
      'released_amount_minor', lr.released_amount_minor,
      'status', lr.status,
      'created_at', lr.created_at
    )
    order by lr.created_at asc
  ) filter (where lr.id is not null) as lot_reservations

from wallet_withdrawal_requests wr
left join wallet_reservation_groups rg
  on rg.reservation_type = 'withdrawal'
 and rg.reservation_id = wr.id
left join wallet_lot_reservations lr
  on lr.reservation_group_id = rg.id
group by wr.id, rg.id;
