-- 34/post-MVP schema — patch campaign reward clawback into campaign budget accounting.

alter table campaign_budget_reservations
drop constraint if exists campaign_budget_reservations_status_check;

alter table campaign_budget_reservations
add constraint campaign_budget_reservations_status_check
check (
  status in (
    'reserved',
    'issued',
    'released',
    'cancelled',
    'expired',
    'refunded',
    'partially_refunded'
  )
);

alter table campaign_budget_reservations
add column if not exists refunded_at timestamptz,
add column if not exists refunded_amount_minor bigint not null default 0,
add column if not exists refund_reason text;

alter table campaign_budget_reservations
drop constraint if exists campaign_budget_reservations_refunded_amount_check;

alter table campaign_budget_reservations
add constraint campaign_budget_reservations_refunded_amount_check
check (
  refunded_amount_minor >= 0
  and refunded_amount_minor <= amount_minor
);

create table if not exists campaign_budget_refund_groups (
  id uuid primary key default gen_random_uuid(),

  campaign_budget_id uuid not null references campaign_budgets(id),
  campaign_budget_reservation_id uuid not null references campaign_budget_reservations(id),

  campaign_id uuid not null,
  advertiser_id uuid not null,
  user_id uuid not null,
  wallet_id uuid not null references wallets(id),

  wallet_value_lot_id uuid references wallet_value_lots(id),
  wallet_refund_group_id uuid references wallet_refund_groups(id),

  currency_code text not null default 'USD',

  requested_amount_minor bigint not null,
  refunded_amount_minor bigint not null default 0,

  refund_type text not null default 'campaign_reward_clawback',
  refund_reason text,

  status text not null default 'processing',

  idempotency_key text not null,
  operation_type text not null default 'refund_campaign_reward',

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,

  failure_reason text,

  constraint campaign_budget_refund_groups_amount_check
  check (
    requested_amount_minor > 0
    and refunded_amount_minor >= 0
    and refunded_amount_minor <= requested_amount_minor
  ),

  constraint campaign_budget_refund_groups_status_check
  check (
    status in (
      'processing',
      'completed',
      'failed'
    )
  )
);

create unique index if not exists campaign_budget_refund_groups_idempotency_unique
on campaign_budget_refund_groups (operation_type, idempotency_key);

create index if not exists campaign_budget_refund_groups_campaign_idx
on campaign_budget_refund_groups (campaign_id, created_at desc);

create index if not exists campaign_budget_refund_groups_reservation_idx
on campaign_budget_refund_groups (campaign_budget_reservation_id);

create index if not exists campaign_budget_refund_groups_wallet_idx
on campaign_budget_refund_groups (wallet_id, created_at desc);

alter table wallet_ledger_entries
add column if not exists campaign_budget_refund_group_id uuid
references campaign_budget_refund_groups(id);

alter table wallet_value_lots
add column if not exists campaign_budget_refund_group_id uuid
references campaign_budget_refund_groups(id);

create index if not exists wallet_ledger_entries_campaign_budget_refund_group_idx
on wallet_ledger_entries (campaign_budget_refund_group_id);

create index if not exists wallet_value_lots_campaign_budget_refund_group_idx
on wallet_value_lots (campaign_budget_refund_group_id);

create or replace function campaign_reward_refundable_amount(
  p_campaign_budget_reservation_id uuid
)
returns bigint
language sql
stable
as $$
  select greatest(
    amount_minor - refunded_amount_minor,
    0
  )::bigint
  from campaign_budget_reservations
  where id = p_campaign_budget_reservation_id
    and status in ('issued', 'released', 'partially_refunded');
$$;

create or replace function mark_campaign_reward_refunded(
  p_campaign_budget_reservation_id uuid,
  p_refunded_amount_minor bigint,
  p_campaign_budget_refund_group_id uuid default null,
  p_reason text default 'campaign_reward_refunded',
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_reservation campaign_budget_reservations%rowtype;
  v_refundable bigint;
  v_new_refunded_total bigint;

  v_should_execute boolean;
  v_existing_result_id uuid;
  v_payload jsonb;
begin
  if p_campaign_budget_reservation_id is null then
    raise exception 'campaign budget reservation id is required';
  end if;

  if p_refunded_amount_minor <= 0 then
    raise exception 'refunded amount must be positive';
  end if;

  if p_idempotency_key is null then
    p_idempotency_key :=
      'mark_campaign_reward_refunded:' ||
      p_campaign_budget_reservation_id::text || ':' ||
      p_refunded_amount_minor::text;
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

  if v_reservation.status not in ('issued', 'released', 'partially_refunded') then
    raise exception 'only issued/released/partially_refunded campaign rewards can be refunded. reservation %, status %',
      p_campaign_budget_reservation_id,
      v_reservation.status;
  end if;

  v_refundable := greatest(
    v_reservation.amount_minor - v_reservation.refunded_amount_minor,
    0
  );

  if v_refundable < p_refunded_amount_minor then
    raise exception 'campaign reward refund exceeds refundable amount. refundable %, requested %',
      v_refundable,
      p_refunded_amount_minor;
  end if;

  v_payload := jsonb_build_object(
    'campaign_budget_reservation_id', p_campaign_budget_reservation_id,
    'campaign_id', v_reservation.campaign_id,
    'wallet_id', v_reservation.wallet_id,
    'user_id', v_reservation.user_id,
    'refunded_amount_minor', p_refunded_amount_minor,
    'campaign_budget_refund_group_id', p_campaign_budget_refund_group_id,
    'reason', p_reason
  );

  select should_execute, existing_result_id
  into v_should_execute, v_existing_result_id
  from wallet_begin_idempotent_operation(
    'mark_campaign_reward_refunded',
    p_idempotency_key,
    v_reservation.user_id,
    v_reservation.wallet_id,
    v_payload,
    p_metadata
  );

  if v_should_execute is false then
    return v_existing_result_id;
  end if;

  v_new_refunded_total :=
    v_reservation.refunded_amount_minor + p_refunded_amount_minor;

  update campaign_budget_reservations
  set
    refunded_amount_minor = v_new_refunded_total,
    refunded_at =
      case
        when v_new_refunded_total = amount_minor then now()
        else refunded_at
      end,
    refund_reason = p_reason,
    status =
      case
        when v_new_refunded_total = amount_minor then 'refunded'
        else 'partially_refunded'
      end,
    updated_at = now(),
    metadata = metadata || p_metadata || jsonb_build_object(
      'campaign_budget_refund_group_id',
      p_campaign_budget_refund_group_id,
      'last_refunded_amount_minor',
      p_refunded_amount_minor,
      'refund_reason',
      p_reason
    )
  where id = v_reservation.id;

  update campaign_budgets
  set
    refunded_amount_minor = refunded_amount_minor + p_refunded_amount_minor,
    updated_at = now()
  where id = v_reservation.campaign_budget_id;

  perform wallet_complete_idempotent_operation(
    'mark_campaign_reward_refunded',
    p_idempotency_key,
    'campaign_budget_reservation',
    v_reservation.id,
    jsonb_build_object(
      'campaign_budget_reservation_id', v_reservation.id,
      'refunded_amount_minor', p_refunded_amount_minor,
      'total_refunded_amount_minor', v_new_refunded_total
    )
  );

  return v_reservation.id;
end;
$$;

do $$
begin
  alter type wallet_ledger_entry_type add value if not exists 'campaign_reward_clawback';
exception
  when duplicate_object then null;
end
$$;

create or replace function clawback_campaign_reward_lot(
  p_wallet_value_lot_id uuid,
  p_amount_minor bigint default null,
  p_reason text default 'campaign_reward_clawback',
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_lot wallet_value_lots%rowtype;
  v_reservation campaign_budget_reservations%rowtype;

  v_clawback_amount bigint;
  v_refundable_campaign_amount bigint;

  v_campaign_refund_group_id uuid;
  v_ledger_entry_id uuid;

  v_should_execute boolean;
  v_existing_result_id uuid;
  v_payload jsonb;
begin
  if p_wallet_value_lot_id is null then
    raise exception 'wallet value lot id is required';
  end if;

  select *
  into v_lot
  from wallet_value_lots
  where id = p_wallet_value_lot_id
  for update;

  if v_lot.id is null then
    raise exception 'wallet value lot not found: %', p_wallet_value_lot_id;
  end if;

  if v_lot.campaign_budget_reservation_id is null then
    raise exception 'wallet value lot is not campaign-backed: %', p_wallet_value_lot_id;
  end if;

  select *
  into v_reservation
  from campaign_budget_reservations
  where id = v_lot.campaign_budget_reservation_id
  for update;

  if v_reservation.id is null then
    raise exception 'campaign reservation not found for wallet lot %',
      p_wallet_value_lot_id;
  end if;

  if v_lot.status not in ('pending', 'available') then
    raise exception 'only pending/available unspent campaign lots can be clawed back directly. lot %, status %',
      p_wallet_value_lot_id,
      v_lot.status;
  end if;

  if v_lot.remaining_amount_minor <= 0 then
    raise exception 'wallet lot has no remaining amount to claw back: %',
      p_wallet_value_lot_id;
  end if;

  v_clawback_amount := coalesce(p_amount_minor, v_lot.remaining_amount_minor);

  if v_clawback_amount <= 0 then
    raise exception 'clawback amount must be positive';
  end if;

  if v_clawback_amount > v_lot.remaining_amount_minor then
    raise exception 'clawback amount exceeds lot remaining amount. remaining %, requested %',
      v_lot.remaining_amount_minor,
      v_clawback_amount;
  end if;

  v_refundable_campaign_amount :=
    campaign_reward_refundable_amount(v_lot.campaign_budget_reservation_id);

  if v_refundable_campaign_amount < v_clawback_amount then
    raise exception 'clawback exceeds campaign refundable amount. refundable %, requested %',
      v_refundable_campaign_amount,
      v_clawback_amount;
  end if;

  if p_idempotency_key is null then
    p_idempotency_key :=
      'clawback_campaign_reward_lot:' ||
      p_wallet_value_lot_id::text || ':' ||
      v_clawback_amount::text;
  end if;

  v_payload := jsonb_build_object(
    'wallet_value_lot_id', p_wallet_value_lot_id,
    'wallet_id', v_lot.wallet_id,
    'user_id', v_lot.user_id,
    'campaign_budget_reservation_id', v_lot.campaign_budget_reservation_id,
    'campaign_id', v_lot.campaign_id,
    'amount_minor', v_clawback_amount,
    'reason', p_reason
  );

  select should_execute, existing_result_id
  into v_should_execute, v_existing_result_id
  from wallet_begin_idempotent_operation(
    'clawback_campaign_reward_lot',
    p_idempotency_key,
    v_lot.user_id,
    v_lot.wallet_id,
    v_payload,
    p_metadata
  );

  if v_should_execute is false then
    return v_existing_result_id;
  end if;

  insert into campaign_budget_refund_groups (
    campaign_budget_id,
    campaign_budget_reservation_id,
    campaign_id,
    advertiser_id,
    user_id,
    wallet_id,
    wallet_value_lot_id,
    currency_code,
    requested_amount_minor,
    refunded_amount_minor,
    refund_type,
    refund_reason,
    status,
    idempotency_key,
    operation_type,
    metadata
  )
  values (
    v_reservation.campaign_budget_id,
    v_reservation.id,
    v_reservation.campaign_id,
    v_reservation.advertiser_id,
    v_reservation.user_id,
    v_reservation.wallet_id,
    v_lot.id,
    v_lot.currency_code,
    v_clawback_amount,
    0,
    'campaign_reward_clawback',
    p_reason,
    'processing',
    p_idempotency_key,
    'clawback_campaign_reward_lot',
    p_metadata
  )
  returning id into v_campaign_refund_group_id;

  update wallet_value_lots
  set
    remaining_amount_minor = remaining_amount_minor - v_clawback_amount,
    status =
      case
        when remaining_amount_minor - v_clawback_amount = 0
        then 'revoked'
        else status
      end,
    revoked_at =
      case
        when remaining_amount_minor - v_clawback_amount = 0
        then now()
        else revoked_at
      end,
    campaign_budget_refund_group_id = v_campaign_refund_group_id,
    updated_at = now(),
    metadata = metadata || p_metadata || jsonb_build_object(
      'clawback_reason',
      p_reason,
      'campaign_budget_refund_group_id',
      v_campaign_refund_group_id
    )
  where id = v_lot.id;

  insert into wallet_ledger_entries (
    wallet_id,
    user_id,
    value_lot_id,
    campaign_id,
    campaign_budget_reservation_id,
    campaign_budget_refund_group_id,
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
    v_lot.wallet_id,
    v_lot.user_id,
    v_lot.id,
    v_lot.campaign_id,
    v_lot.campaign_budget_reservation_id,
    v_campaign_refund_group_id,
    'campaign_reward_clawback',
    v_campaign_refund_group_id,
    'campaign_reward_clawback',
    -1,
    v_lot.currency_code,
    v_clawback_amount,
    case
      when v_lot.status = 'available'
      then -v_clawback_amount
      else 0
    end,
    case
      when v_lot.status = 'pending'
      then -v_clawback_amount
      else 0
    end,
    0,
    'posted',
    p_idempotency_key,
    'clawback_campaign_reward_lot',
    p_metadata || jsonb_build_object(
      'campaign_budget_refund_group_id',
      v_campaign_refund_group_id,
      'campaign_budget_reservation_id',
      v_lot.campaign_budget_reservation_id,
      'reason',
      p_reason
    )
  )
  returning id into v_ledger_entry_id;

  perform mark_campaign_reward_refunded(
    v_lot.campaign_budget_reservation_id,
    v_clawback_amount,
    v_campaign_refund_group_id,
    p_reason,
    'mark_campaign_reward_refunded:' ||
      v_lot.campaign_budget_reservation_id::text || ':' ||
      v_campaign_refund_group_id::text,
    p_metadata || jsonb_build_object(
      'wallet_value_lot_id',
      v_lot.id,
      'ledger_entry_id',
      v_ledger_entry_id
    )
  );

  update campaign_budget_refund_groups
  set
    status = 'completed',
    completed_at = now(),
    refunded_amount_minor = v_clawback_amount
  where id = v_campaign_refund_group_id;

  perform wallet_complete_idempotent_operation(
    'clawback_campaign_reward_lot',
    p_idempotency_key,
    'campaign_budget_refund_group',
    v_campaign_refund_group_id,
    jsonb_build_object(
      'campaign_budget_refund_group_id', v_campaign_refund_group_id,
      'wallet_value_lot_id', v_lot.id,
      'clawback_amount_minor', v_clawback_amount,
      'ledger_entry_id', v_ledger_entry_id
    )
  );

  return v_campaign_refund_group_id;

exception
  when others then
    if v_campaign_refund_group_id is not null then
      update campaign_budget_refund_groups
      set
        status = 'failed',
        failed_at = now(),
        failure_reason = sqlerrm
      where id = v_campaign_refund_group_id;
    end if;

    raise;
end;
$$;

alter table wallet_value_lots
add column if not exists revoked_at timestamptz;

alter table wallet_value_lots
drop constraint if exists wallet_value_lots_status_check;

alter table wallet_value_lots
add constraint wallet_value_lots_status_check
check (
  status::text in (
    'pending',
    'available',
    'locked',
    'spent',
    'withdrawn',
    'expired',
    'revoked',
    'reversed'
  )
);

create or replace view campaign_budget_refund_group_details as
select
  crg.id as campaign_budget_refund_group_id,
  crg.campaign_budget_id,
  crg.campaign_budget_reservation_id,
  crg.campaign_id,
  crg.advertiser_id,
  crg.user_id,
  crg.wallet_id,
  crg.wallet_value_lot_id,
  crg.wallet_refund_group_id,
  crg.currency_code,
  crg.requested_amount_minor,
  crg.refunded_amount_minor,
  crg.refund_type,
  crg.refund_reason,
  crg.status,
  crg.created_at,
  crg.completed_at,
  crg.failed_at,
  crg.failure_reason,

  cbr.amount_minor as original_campaign_reward_minor,
  cbr.status as campaign_reservation_status,
  cbr.refunded_amount_minor as campaign_reservation_refunded_minor,

  wl.status as wallet_lot_status,
  wl.original_amount_minor as wallet_lot_original_minor,
  wl.remaining_amount_minor as wallet_lot_remaining_minor,

  count(le.id) as ledger_entry_count,

  jsonb_agg(
    jsonb_build_object(
      'ledger_entry_id', le.id,
      'entry_type', le.entry_type,
      'direction', le.direction,
      'amount_minor', le.amount_minor,
      'available_impact_minor', le.available_impact_minor,
      'pending_impact_minor', le.pending_impact_minor,
      'created_at', le.created_at
    )
    order by le.created_at asc
  ) filter (where le.id is not null) as ledger_entries

from campaign_budget_refund_groups crg
left join campaign_budget_reservations cbr
  on cbr.id = crg.campaign_budget_reservation_id
left join wallet_value_lots wl
  on wl.id = crg.wallet_value_lot_id
left join wallet_ledger_entries le
  on le.campaign_budget_refund_group_id = crg.id
group by crg.id, cbr.id, wl.id;

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

  greatest(
    cb.issued_amount_minor
    - cb.released_amount_minor
    - cb.expired_amount_minor
    - cb.refunded_amount_minor,
    0
  )::bigint as issued_not_released_minor,

  greatest(
    cb.released_amount_minor
    - cb.expired_amount_minor
    - cb.refunded_amount_minor,
    0
  )::bigint as released_active_minor,

  cb.status,
  cb.created_at,
  cb.updated_at,

  count(cbr.id) as reservation_count,

  coalesce(sum(cbr.amount_minor) filter (
    where cbr.status = 'reserved'
  ), 0)::bigint as live_reserved_minor,

  coalesce(sum(cbr.amount_minor) filter (
    where cbr.status = 'issued'
  ), 0)::bigint as issued_pending_release_minor,

  coalesce(sum(cbr.amount_minor) filter (
    where cbr.status = 'released'
  ), 0)::bigint as released_reservations_minor,

  coalesce(sum(cbr.amount_minor) filter (
    where cbr.status = 'expired'
  ), 0)::bigint as expired_reservations_minor,

  coalesce(sum(cbr.refunded_amount_minor), 0)::bigint as refunded_reservations_minor,

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
  cbr.expired_at,
  cbr.refunded_at,
  cbr.refunded_amount_minor,
  cbr.refund_reason,
  cbr.expiration_reason,

  wl.id as wallet_value_lot_id,
  wl.status as wallet_lot_status,
  wl.original_amount_minor,
  wl.remaining_amount_minor,
  wl.available_at,
  wl.released_at as wallet_lot_released_at,
  wl.expires_at,
  wl.expired_at as wallet_lot_expired_at,
  wl.revoked_at as wallet_lot_revoked_at,
  wl.expiration_reason as wallet_lot_expiration_reason,

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
