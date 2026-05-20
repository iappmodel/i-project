-- 29/post-MVP schema — wallet lot expiration runs and reservation-safe expiry behavior.

do $$
begin
  alter type wallet_ledger_entry_type add value if not exists 'expiration';
exception
  when duplicate_object then null;
end
$$;

alter table wallet_value_lots
add column if not exists expired_at timestamptz,
add column if not exists expiration_reason text;

create table if not exists wallet_expiration_runs (
  id uuid primary key default gen_random_uuid(),

  run_type text not null default 'scheduled',
  status text not null default 'processing',

  scanned_lot_count integer not null default 0,
  expired_lot_count integer not null default 0,
  expired_amount_minor bigint not null default 0,

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,

  failure_reason text,

  metadata jsonb not null default '{}'::jsonb,

  constraint wallet_expiration_runs_status_check
  check (
    status in (
      'processing',
      'completed',
      'failed'
    )
  )
);

create index if not exists wallet_expiration_runs_started_idx
on wallet_expiration_runs (started_at desc);

alter table wallet_ledger_entries
add column if not exists expiration_run_id uuid references wallet_expiration_runs(id);

create index if not exists wallet_ledger_entries_expiration_run_idx
on wallet_ledger_entries (expiration_run_id);

create index if not exists wallet_value_lots_expirable_idx
on wallet_value_lots (
  expires_at,
  status,
  wallet_id,
  currency_code
)
where expires_at is not null
and remaining_amount_minor > 0
and status in ('pending', 'available');

create or replace function expire_wallet_value_lot(
  p_value_lot_id uuid,
  p_expiration_run_id uuid default null,
  p_reason text default 'expired_by_policy',
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
  if p_value_lot_id is null then
    raise exception 'value lot id is required';
  end if;

  if p_idempotency_key is null then
    p_idempotency_key := 'expire_lot:' || p_value_lot_id::text;
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
    'remaining_amount_minor', v_lot.remaining_amount_minor,
    'status', v_lot.status,
    'expires_at', v_lot.expires_at
  );

  select should_execute, existing_result_id
  into v_should_execute, v_existing_result_id
  from wallet_begin_idempotent_operation(
    'expire_wallet_value_lot',
    p_idempotency_key,
    v_lot.user_id,
    v_lot.wallet_id,
    v_payload,
    p_metadata
  );

  if v_should_execute is false then
    return v_existing_result_id;
  end if;

  if v_lot.status not in ('pending', 'available') then
    raise exception 'only pending/available lots can expire. lot %, status %',
      p_value_lot_id,
      v_lot.status;
  end if;

  if v_lot.remaining_amount_minor <= 0 then
    raise exception 'lot has no remaining value to expire: %', p_value_lot_id;
  end if;

  if v_lot.expires_at is null or v_lot.expires_at > now() then
    raise exception 'lot is not expired yet. lot %, expires_at %',
      p_value_lot_id,
      v_lot.expires_at;
  end if;

  update wallet_value_lots
  set
    status = 'expired',
    expired_at = now(),
    expiration_reason = p_reason,
    remaining_amount_minor = 0,
    updated_at = now()
  where id = p_value_lot_id;

  insert into wallet_ledger_entries (
    wallet_id,
    user_id,
    value_lot_id,
    expiration_run_id,
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
    v_lot.wallet_id,
    v_lot.user_id,
    v_lot.id,
    p_expiration_run_id,
    'expiration',
    p_expiration_run_id,
    v_lot.campaign_id,
    'expiration',
    -1,
    v_lot.currency_code,
    v_lot.remaining_amount_minor,
    case
      when v_lot.status = 'available'
      then -v_lot.remaining_amount_minor
      else 0
    end,
    case
      when v_lot.status = 'pending'
      then -v_lot.remaining_amount_minor
      else 0
    end,
    0,
    'posted',
    p_idempotency_key,
    'expire_wallet_value_lot',
    p_metadata || jsonb_build_object(
      'expiration_reason',
      p_reason,
      'expires_at',
      v_lot.expires_at,
      'previous_lot_status',
      v_lot.status
    )
  )
  returning id into v_ledger_entry_id;

  perform wallet_complete_idempotent_operation(
    'expire_wallet_value_lot',
    p_idempotency_key,
    'wallet_ledger_entry',
    v_ledger_entry_id,
    jsonb_build_object(
      'value_lot_id', p_value_lot_id,
      'ledger_entry_id', v_ledger_entry_id,
      'expired_amount_minor', v_lot.remaining_amount_minor
    )
  );

  return v_ledger_entry_id;
end;
$$;

create or replace function run_wallet_expiration_job(
  p_batch_size integer default 500,
  p_reason text default 'scheduled_expiration',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid;
  v_lot record;

  v_scanned integer := 0;
  v_expired integer := 0;
  v_expired_amount bigint := 0;
begin
  if p_batch_size <= 0 then
    raise exception 'batch size must be positive';
  end if;

  insert into wallet_expiration_runs (
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

  for v_lot in
    select
      id,
      remaining_amount_minor
    from wallet_value_lots
    where expires_at is not null
      and expires_at <= now()
      and remaining_amount_minor > 0
      and status in ('pending', 'available')
    order by expires_at asc, created_at asc, id asc
    limit p_batch_size
    for update skip locked
  loop
    v_scanned := v_scanned + 1;

    perform expire_wallet_value_lot(
      v_lot.id,
      v_run_id,
      p_reason,
      'expire_lot:' || v_lot.id::text,
      p_metadata
    );

    v_expired := v_expired + 1;
    v_expired_amount := v_expired_amount + v_lot.remaining_amount_minor;
  end loop;

  update wallet_expiration_runs
  set
    status = 'completed',
    completed_at = now(),
    scanned_lot_count = v_scanned,
    expired_lot_count = v_expired,
    expired_amount_minor = v_expired_amount
  where id = v_run_id;

  return v_run_id;

exception
  when others then
    update wallet_expiration_runs
    set
      status = 'failed',
      failed_at = now(),
      failure_reason = sqlerrm
    where id = v_run_id;

    raise;
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
      remaining_amount_minor =
        case
          when expires_at is not null and expires_at <= now()
          then 0
          else remaining_amount_minor + v_reservation.reserved_amount_minor
        end,
      status =
        case
          when expires_at is not null and expires_at <= now()
          then 'expired'
          else 'available'
        end,
      expired_at =
        case
          when expires_at is not null and expires_at <= now()
          then now()
          else expired_at
        end,
      expiration_reason =
        case
          when expires_at is not null and expires_at <= now()
          then 'expired_while_reserved'
          else expiration_reason
        end,
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
      case
        when exists (
          select 1
          from wallet_value_lots wl
          where wl.id = v_reservation.value_lot_id
            and wl.expires_at is not null
            and wl.expires_at <= now()
        )
        then 0
        else v_reservation.reserved_amount_minor
      end,
      0,
      -v_reservation.reserved_amount_minor,
      'posted',
      p_idempotency_key || ':lot_reservation:' || v_reservation.id::text,
      'release_wallet_reservation',
      p_metadata || jsonb_build_object(
        'reason',
        p_reason,
        'lot_reservation_id',
        v_reservation.id,
        'expired_on_release',
        exists (
          select 1
          from wallet_value_lots wl
          where wl.id = v_reservation.value_lot_id
            and wl.expires_at is not null
            and wl.expires_at <= now()
        )
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

create or replace view wallet_expiration_run_details as
select
  er.id as expiration_run_id,
  er.run_type,
  er.status,
  er.scanned_lot_count,
  er.expired_lot_count,
  er.expired_amount_minor,
  er.started_at,
  er.completed_at,
  er.failed_at,
  er.failure_reason,

  count(le.id) as ledger_entry_count,

  jsonb_agg(
    jsonb_build_object(
      'ledger_entry_id', le.id,
      'value_lot_id', le.value_lot_id,
      'wallet_id', le.wallet_id,
      'user_id', le.user_id,
      'currency_code', le.currency_code,
      'amount_minor', le.amount_minor,
      'available_impact_minor', le.available_impact_minor,
      'pending_impact_minor', le.pending_impact_minor,
      'created_at', le.created_at
    )
    order by le.created_at asc
  ) filter (where le.id is not null) as expired_entries

from wallet_expiration_runs er
left join wallet_ledger_entries le
  on le.expiration_run_id = er.id
group by er.id;

create or replace view wallet_lots_expiring_soon as
select
  id as value_lot_id,
  wallet_id,
  user_id,
  campaign_id,
  currency_code,
  remaining_amount_minor,
  status,
  expires_at,
  extract(epoch from (expires_at - now()))::bigint as seconds_until_expiry,
  metadata
from wallet_value_lots
where expires_at is not null
  and expires_at > now()
  and expires_at <= now() + interval '14 days'
  and remaining_amount_minor > 0
  and status in ('pending', 'available')
order by expires_at asc, created_at asc;
