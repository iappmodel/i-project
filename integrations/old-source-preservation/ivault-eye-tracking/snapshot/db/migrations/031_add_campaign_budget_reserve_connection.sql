-- 31/post-MVP schema — campaign budget reserve connection to wallet reward issuance.

create table if not exists campaign_budgets (
  id uuid primary key default gen_random_uuid(),

  campaign_id uuid not null,
  advertiser_id uuid not null,

  currency_code text not null default 'USD',

  funded_amount_minor bigint not null default 0,
  reserved_amount_minor bigint not null default 0,
  issued_amount_minor bigint not null default 0,
  released_amount_minor bigint not null default 0,
  refunded_amount_minor bigint not null default 0,
  expired_amount_minor bigint not null default 0,

  status text not null default 'active',

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint campaign_budgets_amount_check
  check (
    funded_amount_minor >= 0
    and reserved_amount_minor >= 0
    and issued_amount_minor >= 0
    and released_amount_minor >= 0
    and refunded_amount_minor >= 0
    and expired_amount_minor >= 0
    and reserved_amount_minor <= funded_amount_minor
    and issued_amount_minor <= funded_amount_minor
  ),

  constraint campaign_budgets_status_check
  check (
    status in (
      'draft',
      'active',
      'paused',
      'completed',
      'cancelled',
      'exhausted'
    )
  )
);

create unique index if not exists campaign_budgets_campaign_unique
on campaign_budgets (campaign_id);

create index if not exists campaign_budgets_advertiser_idx
on campaign_budgets (advertiser_id, created_at desc);

create index if not exists campaign_budgets_status_idx
on campaign_budgets (status, created_at desc);

create table if not exists campaign_budget_reservations (
  id uuid primary key default gen_random_uuid(),

  campaign_budget_id uuid not null references campaign_budgets(id),
  campaign_id uuid not null,
  advertiser_id uuid not null,

  user_id uuid not null,
  wallet_id uuid not null references wallets(id),

  attention_event_id uuid,
  reward_id uuid,

  currency_code text not null default 'USD',
  amount_minor bigint not null,

  status text not null default 'reserved',

  idempotency_key text not null,
  operation_type text not null default 'reserve_campaign_reward_budget',

  reserved_at timestamptz not null default now(),
  issued_at timestamptz,
  released_at timestamptz,
  cancelled_at timestamptz,
  expired_at timestamptz,

  cancellation_reason text,
  expiration_reason text,

  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint campaign_budget_reservations_amount_check
  check (amount_minor > 0),

  constraint campaign_budget_reservations_status_check
  check (
    status in (
      'reserved',
      'issued',
      'released',
      'cancelled',
      'expired'
    )
  )
);

create unique index if not exists campaign_budget_reservations_idempotency_unique
on campaign_budget_reservations (operation_type, idempotency_key);

create index if not exists campaign_budget_reservations_campaign_idx
on campaign_budget_reservations (campaign_id, created_at desc);

create index if not exists campaign_budget_reservations_wallet_idx
on campaign_budget_reservations (wallet_id, reserved_at desc);

create index if not exists campaign_budget_reservations_reward_idx
on campaign_budget_reservations (reward_id);

create index if not exists campaign_budget_reservations_attention_idx
on campaign_budget_reservations (attention_event_id);

alter table wallet_value_lots
add column if not exists campaign_budget_reservation_id uuid
references campaign_budget_reservations(id);

alter table wallet_ledger_entries
add column if not exists campaign_budget_reservation_id uuid
references campaign_budget_reservations(id);

create index if not exists wallet_value_lots_campaign_budget_reservation_idx
on wallet_value_lots (campaign_budget_reservation_id);

create index if not exists wallet_ledger_entries_campaign_budget_reservation_idx
on wallet_ledger_entries (campaign_budget_reservation_id);

create or replace function campaign_budget_available_amount(
  p_campaign_id uuid
)
returns bigint
language sql
stable
as $$
  select greatest(
    funded_amount_minor
    - reserved_amount_minor
    - issued_amount_minor
    - refunded_amount_minor
    - expired_amount_minor,
    0
  )::bigint
  from campaign_budgets
  where campaign_id = p_campaign_id
    and status = 'active';
$$;

create or replace function reserve_campaign_reward_budget(
  p_campaign_id uuid,
  p_user_id uuid,
  p_wallet_id uuid,
  p_amount_minor bigint,
  p_attention_event_id uuid default null,
  p_reward_id uuid default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_budget campaign_budgets%rowtype;
  v_available bigint;
  v_reservation_id uuid;

  v_should_execute boolean;
  v_existing_result_id uuid;
  v_payload jsonb;
begin
  if p_campaign_id is null then
    raise exception 'campaign id is required';
  end if;

  if p_user_id is null then
    raise exception 'user id is required';
  end if;

  if p_wallet_id is null then
    raise exception 'wallet id is required';
  end if;

  if p_amount_minor <= 0 then
    raise exception 'campaign reward reservation amount must be positive';
  end if;

  if p_idempotency_key is null then
    if p_attention_event_id is null and p_reward_id is null then
      raise exception 'idempotency key, attention event id, or reward id is required';
    end if;

    p_idempotency_key :=
      'campaign_budget_reserve:' ||
      p_campaign_id::text || ':' ||
      coalesce(p_reward_id::text, p_attention_event_id::text);
  end if;

  select *
  into v_budget
  from campaign_budgets
  where campaign_id = p_campaign_id
  for update;

  if v_budget.id is null then
    raise exception 'campaign budget not found for campaign %', p_campaign_id;
  end if;

  if v_budget.status <> 'active' then
    raise exception 'campaign budget is not active. campaign %, status %',
      p_campaign_id,
      v_budget.status;
  end if;

  v_payload := jsonb_build_object(
    'campaign_id', p_campaign_id,
    'campaign_budget_id', v_budget.id,
    'advertiser_id', v_budget.advertiser_id,
    'user_id', p_user_id,
    'wallet_id', p_wallet_id,
    'amount_minor', p_amount_minor,
    'attention_event_id', p_attention_event_id,
    'reward_id', p_reward_id,
    'currency_code', v_budget.currency_code
  );

  select should_execute, existing_result_id
  into v_should_execute, v_existing_result_id
  from wallet_begin_idempotent_operation(
    'reserve_campaign_reward_budget',
    p_idempotency_key,
    p_user_id,
    p_wallet_id,
    v_payload,
    p_metadata
  );

  if v_should_execute is false then
    return v_existing_result_id;
  end if;

  v_available := greatest(
    v_budget.funded_amount_minor
    - v_budget.reserved_amount_minor
    - v_budget.issued_amount_minor
    - v_budget.refunded_amount_minor
    - v_budget.expired_amount_minor,
    0
  );

  if v_available < p_amount_minor then
    update wallet_idempotency_keys
    set
      status = 'failed',
      failed_at = now(),
      metadata = metadata || jsonb_build_object(
        'failed_reason',
        'campaign_budget_insufficient',
        'available_minor',
        v_available,
        'requested_minor',
        p_amount_minor
      )
    where operation_type = 'reserve_campaign_reward_budget'
      and idempotency_key = p_idempotency_key;

    raise exception 'campaign budget insufficient. campaign %, available %, requested %',
      p_campaign_id,
      v_available,
      p_amount_minor;
  end if;

  insert into campaign_budget_reservations (
    campaign_budget_id,
    campaign_id,
    advertiser_id,
    user_id,
    wallet_id,
    attention_event_id,
    reward_id,
    currency_code,
    amount_minor,
    status,
    idempotency_key,
    operation_type,
    metadata
  )
  values (
    v_budget.id,
    p_campaign_id,
    v_budget.advertiser_id,
    p_user_id,
    p_wallet_id,
    p_attention_event_id,
    p_reward_id,
    v_budget.currency_code,
    p_amount_minor,
    'reserved',
    p_idempotency_key,
    'reserve_campaign_reward_budget',
    p_metadata
  )
  returning id into v_reservation_id;

  update campaign_budgets
  set
    reserved_amount_minor = reserved_amount_minor + p_amount_minor,
    updated_at = now(),
    status =
      case
        when v_available = p_amount_minor then 'exhausted'
        else status
      end
  where id = v_budget.id;

  perform wallet_complete_idempotent_operation(
    'reserve_campaign_reward_budget',
    p_idempotency_key,
    'campaign_budget_reservation',
    v_reservation_id,
    jsonb_build_object(
      'campaign_budget_reservation_id', v_reservation_id,
      'campaign_id', p_campaign_id,
      'amount_minor', p_amount_minor
    )
  );

  return v_reservation_id;
end;
$$;

create or replace function issue_reward_from_campaign_reservation(
  p_campaign_budget_reservation_id uuid,
  p_hold_until timestamptz default null,
  p_value_lot_expires_at timestamptz default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_reservation campaign_budget_reservations%rowtype;
  v_wallet_lot_id uuid;
  v_ledger_entry_id uuid;

  v_should_execute boolean;
  v_existing_result_id uuid;
  v_payload jsonb;
begin
  if p_campaign_budget_reservation_id is null then
    raise exception 'campaign budget reservation id is required';
  end if;

  if p_idempotency_key is null then
    p_idempotency_key :=
      'issue_reward_from_campaign_reservation:' ||
      p_campaign_budget_reservation_id::text;
  end if;

  select *
  into v_reservation
  from campaign_budget_reservations
  where id = p_campaign_budget_reservation_id
  for update;

  if v_reservation.id is null then
    raise exception 'campaign budget reservation not found: %',
      p_campaign_budget_reservation_id;
  end if;

  if v_reservation.status <> 'reserved' then
    raise exception 'only reserved campaign budget can issue reward. reservation %, status %',
      p_campaign_budget_reservation_id,
      v_reservation.status;
  end if;

  v_payload := jsonb_build_object(
    'campaign_budget_reservation_id', p_campaign_budget_reservation_id,
    'campaign_id', v_reservation.campaign_id,
    'user_id', v_reservation.user_id,
    'wallet_id', v_reservation.wallet_id,
    'amount_minor', v_reservation.amount_minor,
    'currency_code', v_reservation.currency_code,
    'hold_until', p_hold_until,
    'expires_at', p_value_lot_expires_at
  );

  select should_execute, existing_result_id
  into v_should_execute, v_existing_result_id
  from wallet_begin_idempotent_operation(
    'issue_reward_from_campaign_reservation',
    p_idempotency_key,
    v_reservation.user_id,
    v_reservation.wallet_id,
    v_payload,
    p_metadata
  );

  if v_should_execute is false then
    return v_existing_result_id;
  end if;

  insert into wallet_value_lots (
    wallet_id,
    user_id,
    source_type,
    source_id,
    campaign_id,
    campaign_budget_reservation_id,
    currency_code,
    original_amount_minor,
    remaining_amount_minor,
    status,
    cashout_eligible,
    available_at,
    released_at,
    expires_at,
    metadata
  )
  values (
    v_reservation.wallet_id,
    v_reservation.user_id,
    'campaign_reward',
    v_reservation.reward_id,
    v_reservation.campaign_id,
    v_reservation.id,
    v_reservation.currency_code,
    v_reservation.amount_minor,
    v_reservation.amount_minor,
    case
      when p_hold_until is null or p_hold_until <= now()
      then 'available'
      else 'pending'
    end,
    true,
    coalesce(p_hold_until, now()),
    case
      when p_hold_until is null or p_hold_until <= now()
      then now()
      else null
    end,
    p_value_lot_expires_at,
    p_metadata || jsonb_build_object(
      'campaign_budget_reservation_id',
      v_reservation.id,
      'attention_event_id',
      v_reservation.attention_event_id,
      'reward_id',
      v_reservation.reward_id
    )
  )
  returning id into v_wallet_lot_id;

  insert into wallet_ledger_entries (
    wallet_id,
    user_id,
    value_lot_id,
    campaign_id,
    campaign_budget_reservation_id,
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
    v_reservation.wallet_id,
    v_reservation.user_id,
    v_wallet_lot_id,
    v_reservation.campaign_id,
    v_reservation.id,
    'campaign_reward',
    v_reservation.reward_id,
    'credit',
    1,
    v_reservation.currency_code,
    v_reservation.amount_minor,
    case
      when p_hold_until is null or p_hold_until <= now()
      then v_reservation.amount_minor
      else 0
    end,
    case
      when p_hold_until is null or p_hold_until <= now()
      then 0
      else v_reservation.amount_minor
    end,
    0,
    'posted',
    p_idempotency_key,
    'issue_reward_from_campaign_reservation',
    p_metadata || jsonb_build_object(
      'wallet_value_lot_id',
      v_wallet_lot_id,
      'campaign_budget_reservation_id',
      v_reservation.id
    )
  )
  returning id into v_ledger_entry_id;

  update campaign_budget_reservations
  set
    status = 'issued',
    issued_at = now(),
    updated_at = now()
  where id = v_reservation.id;

  update campaign_budgets
  set
    reserved_amount_minor = reserved_amount_minor - v_reservation.amount_minor,
    issued_amount_minor = issued_amount_minor + v_reservation.amount_minor,
    updated_at = now()
  where id = v_reservation.campaign_budget_id;

  perform wallet_complete_idempotent_operation(
    'issue_reward_from_campaign_reservation',
    p_idempotency_key,
    'wallet_value_lot',
    v_wallet_lot_id,
    jsonb_build_object(
      'wallet_value_lot_id', v_wallet_lot_id,
      'campaign_budget_reservation_id', v_reservation.id,
      'ledger_entry_id', v_ledger_entry_id,
      'amount_minor', v_reservation.amount_minor
    )
  );

  return v_wallet_lot_id;
end;
$$;

create or replace function cancel_campaign_budget_reservation(
  p_campaign_budget_reservation_id uuid,
  p_reason text default 'reservation_cancelled',
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_reservation campaign_budget_reservations%rowtype;

  v_should_execute boolean;
  v_existing_result_id uuid;
  v_payload jsonb;
begin
  if p_campaign_budget_reservation_id is null then
    raise exception 'campaign budget reservation id is required';
  end if;

  if p_idempotency_key is null then
    p_idempotency_key :=
      'cancel_campaign_budget_reservation:' ||
      p_campaign_budget_reservation_id::text;
  end if;

  select *
  into v_reservation
  from campaign_budget_reservations
  where id = p_campaign_budget_reservation_id
  for update;

  if v_reservation.id is null then
    raise exception 'campaign budget reservation not found: %',
      p_campaign_budget_reservation_id;
  end if;

  v_payload := jsonb_build_object(
    'campaign_budget_reservation_id', p_campaign_budget_reservation_id,
    'campaign_id', v_reservation.campaign_id,
    'amount_minor', v_reservation.amount_minor,
    'status', v_reservation.status
  );

  select should_execute, existing_result_id
  into v_should_execute, v_existing_result_id
  from wallet_begin_idempotent_operation(
    'cancel_campaign_budget_reservation',
    p_idempotency_key,
    v_reservation.user_id,
    v_reservation.wallet_id,
    v_payload,
    p_metadata
  );

  if v_should_execute is false then
    return v_existing_result_id;
  end if;

  if v_reservation.status <> 'reserved' then
    raise exception 'only reserved campaign budget reservations can be cancelled. reservation %, status %',
      p_campaign_budget_reservation_id,
      v_reservation.status;
  end if;

  update campaign_budget_reservations
  set
    status = 'cancelled',
    cancelled_at = now(),
    cancellation_reason = p_reason,
    updated_at = now(),
    metadata = metadata || p_metadata
  where id = v_reservation.id;

  update campaign_budgets
  set
    reserved_amount_minor = reserved_amount_minor - v_reservation.amount_minor,
    status =
      case
        when status = 'exhausted' then 'active'
        else status
      end,
    updated_at = now()
  where id = v_reservation.campaign_budget_id;

  perform wallet_complete_idempotent_operation(
    'cancel_campaign_budget_reservation',
    p_idempotency_key,
    'campaign_budget_reservation',
    v_reservation.id,
    jsonb_build_object(
      'campaign_budget_reservation_id',
      v_reservation.id,
      'cancelled_amount_minor',
      v_reservation.amount_minor
    )
  );

  return v_reservation.id;
end;
$$;

create or replace function issue_campaign_reward(
  p_campaign_id uuid,
  p_user_id uuid,
  p_wallet_id uuid,
  p_amount_minor bigint,
  p_attention_event_id uuid,
  p_reward_id uuid,
  p_hold_until timestamptz default null,
  p_expires_at timestamptz default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_reservation_id uuid;
  v_value_lot_id uuid;
begin
  if p_reward_id is null then
    raise exception 'reward id is required';
  end if;

  if p_attention_event_id is null then
    raise exception 'attention event id is required';
  end if;

  if p_idempotency_key is null then
    p_idempotency_key := 'issue_campaign_reward:' || p_reward_id::text;
  end if;

  v_reservation_id := reserve_campaign_reward_budget(
    p_campaign_id,
    p_user_id,
    p_wallet_id,
    p_amount_minor,
    p_attention_event_id,
    p_reward_id,
    p_idempotency_key || ':reserve',
    p_metadata
  );

  v_value_lot_id := issue_reward_from_campaign_reservation(
    v_reservation_id,
    p_hold_until,
    p_expires_at,
    p_idempotency_key || ':issue',
    p_metadata
  );

  return v_value_lot_id;

exception
  when others then
    if v_reservation_id is not null then
      begin
        perform cancel_campaign_budget_reservation(
          v_reservation_id,
          'issue_campaign_reward_failed',
          p_idempotency_key || ':cancel',
          p_metadata || jsonb_build_object(
            'error',
            sqlerrm
          )
        );
      exception
        when others then
          null;
      end;
    end if;

    raise;
end;
$$;

create or replace view campaign_budget_details as
select
  cb.id as campaign_budget_id,
  cb.campaign_id,
  cb.advertiser_id,
  cb.currency_code,

  cb.funded_amount_minor,
  cb.reserved_amount_minor,
  cb.issued_amount_minor,
  cb.released_amount_minor,
  cb.refunded_amount_minor,
  cb.expired_amount_minor,

  greatest(
    cb.funded_amount_minor
    - cb.reserved_amount_minor
    - cb.issued_amount_minor
    - cb.refunded_amount_minor
    - cb.expired_amount_minor,
    0
  )::bigint as available_amount_minor,

  cb.status,
  cb.created_at,
  cb.updated_at,

  count(cbr.id) as reservation_count,

  coalesce(sum(cbr.amount_minor) filter (
    where cbr.status = 'reserved'
  ), 0)::bigint as live_reserved_minor,

  coalesce(sum(cbr.amount_minor) filter (
    where cbr.status = 'issued'
  ), 0)::bigint as total_issued_reservations_minor,

  coalesce(sum(cbr.amount_minor) filter (
    where cbr.status = 'cancelled'
  ), 0)::bigint as cancelled_reservations_minor

from campaign_budgets cb
left join campaign_budget_reservations cbr
  on cbr.campaign_budget_id = cb.id
group by cb.id;

create or replace view campaign_reward_trace as
select
  cbr.id as campaign_budget_reservation_id,
  cbr.campaign_id,
  cbr.advertiser_id,
  cbr.user_id,
  cbr.wallet_id,
  cbr.attention_event_id,
  cbr.reward_id,
  cbr.currency_code,
  cbr.amount_minor,
  cbr.status as reservation_status,
  cbr.reserved_at,
  cbr.issued_at,
  cbr.released_at,
  cbr.cancelled_at,

  wl.id as wallet_value_lot_id,
  wl.status as wallet_lot_status,
  wl.original_amount_minor,
  wl.remaining_amount_minor,
  wl.available_at,
  wl.released_at as wallet_lot_released_at,
  wl.expires_at,

  le.id as ledger_entry_id,
  le.entry_type,
  le.direction,
  le.amount_minor as ledger_amount_minor,
  le.available_impact_minor,
  le.pending_impact_minor,
  le.status as ledger_status,
  le.created_at as ledger_created_at

from campaign_budget_reservations cbr
left join wallet_value_lots wl
  on wl.campaign_budget_reservation_id = cbr.id
left join wallet_ledger_entries le
  on le.campaign_budget_reservation_id = cbr.id;

create or replace function release_pending_reward(
  p_value_lot_id uuid,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_lot wallet_value_lots%rowtype;
  v_ledger_entry_id uuid;
  v_should_execute boolean;
  v_existing_result_id uuid;
  v_payload jsonb;
begin
  if p_idempotency_key is null then
    p_idempotency_key := 'release:' || p_value_lot_id::text;
  end if;

  select *
  into v_lot
  from wallet_value_lots
  where id = p_value_lot_id
  for update;

  if v_lot.id is null then
    raise exception 'value lot not found: %', p_value_lot_id;
  end if;

  v_payload := jsonb_build_object(
    'value_lot_id', p_value_lot_id,
    'wallet_id', v_lot.wallet_id,
    'user_id', v_lot.user_id,
    'amount_minor', v_lot.remaining_amount_minor
  );

  select should_execute, existing_result_id
  into v_should_execute, v_existing_result_id
  from wallet_begin_idempotent_operation(
    'release_pending_reward',
    p_idempotency_key,
    v_lot.user_id,
    v_lot.wallet_id,
    v_payload,
    p_metadata
  );

  if v_should_execute is false then
    return v_existing_result_id;
  end if;

  if v_lot.status <> 'pending' then
    raise exception 'only pending lots can be released. lot %, status %',
      p_value_lot_id,
      v_lot.status;
  end if;

  if v_lot.remaining_amount_minor <= 0 then
    raise exception 'value lot has no remaining value: %', p_value_lot_id;
  end if;

  update wallet_value_lots
  set
    status = 'available',
    released_at = now(),
    available_at = now(),
    updated_at = now()
  where id = p_value_lot_id;

  insert into wallet_ledger_entries (
    wallet_id,
    user_id,
    value_lot_id,
    source_type,
    source_id,
    campaign_id,
    reward_event_id,
    campaign_budget_reservation_id,
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
    v_lot.wallet_id,
    v_lot.user_id,
    v_lot.id,
    v_lot.source_type::text,
    v_lot.source_id,
    v_lot.campaign_id,
    v_lot.reward_event_id,
    v_lot.campaign_budget_reservation_id,
    'release',
    1,
    v_lot.currency_code,
    v_lot.remaining_amount_minor,
    v_lot.remaining_amount_minor,
    -v_lot.remaining_amount_minor,
    0,
    'posted',
    p_idempotency_key,
    'release_pending_reward',
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_ledger_entry_id;

  if v_lot.campaign_budget_reservation_id is not null then
    update campaign_budget_reservations
    set
      status = 'released',
      released_at = now(),
      updated_at = now()
    where id = v_lot.campaign_budget_reservation_id
      and status = 'issued';

    if found then
      update campaign_budgets cb
      set
        released_amount_minor = cb.released_amount_minor + v_lot.remaining_amount_minor,
        updated_at = now()
      where cb.id = (
        select cbr.campaign_budget_id
        from campaign_budget_reservations cbr
        where cbr.id = v_lot.campaign_budget_reservation_id
      );
    end if;
  end if;

  perform wallet_complete_idempotent_operation(
    'release_pending_reward',
    p_idempotency_key,
    'wallet_ledger_entry',
    v_ledger_entry_id,
    jsonb_build_object(
      'value_lot_id', p_value_lot_id,
      'ledger_entry_id', v_ledger_entry_id
    )
  );

  return v_ledger_entry_id;
end;
$$;
