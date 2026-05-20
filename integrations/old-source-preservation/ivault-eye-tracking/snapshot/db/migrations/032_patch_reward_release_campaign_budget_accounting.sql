-- 32/post-MVP schema — patch reward release into campaign budget accounting.

create or replace function mark_campaign_reward_released(
  p_campaign_budget_reservation_id uuid,
  p_wallet_value_lot_id uuid default null,
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
      'mark_campaign_reward_released:' ||
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
    'wallet_value_lot_id', p_wallet_value_lot_id,
    'campaign_id', v_reservation.campaign_id,
    'wallet_id', v_reservation.wallet_id,
    'user_id', v_reservation.user_id,
    'amount_minor', v_reservation.amount_minor,
    'current_status', v_reservation.status
  );

  select should_execute, existing_result_id
  into v_should_execute, v_existing_result_id
  from wallet_begin_idempotent_operation(
    'mark_campaign_reward_released',
    p_idempotency_key,
    v_reservation.user_id,
    v_reservation.wallet_id,
    v_payload,
    p_metadata
  );

  if v_should_execute is false then
    return v_existing_result_id;
  end if;

  if v_reservation.status = 'released' then
    perform wallet_complete_idempotent_operation(
      'mark_campaign_reward_released',
      p_idempotency_key,
      'campaign_budget_reservation',
      v_reservation.id,
      jsonb_build_object(
        'campaign_budget_reservation_id', v_reservation.id,
        'already_released', true
      )
    );

    return v_reservation.id;
  end if;

  if v_reservation.status <> 'issued' then
    raise exception 'only issued campaign reservations can be released. reservation %, status %',
      p_campaign_budget_reservation_id,
      v_reservation.status;
  end if;

  update campaign_budget_reservations
  set
    status = 'released',
    released_at = now(),
    updated_at = now(),
    metadata = metadata || p_metadata || jsonb_build_object(
      'wallet_value_lot_id',
      p_wallet_value_lot_id
    )
  where id = v_reservation.id;

  update campaign_budgets
  set
    released_amount_minor = released_amount_minor + v_reservation.amount_minor,
    updated_at = now()
  where id = v_reservation.campaign_budget_id;

  perform wallet_complete_idempotent_operation(
    'mark_campaign_reward_released',
    p_idempotency_key,
    'campaign_budget_reservation',
    v_reservation.id,
    jsonb_build_object(
      'campaign_budget_reservation_id', v_reservation.id,
      'released_amount_minor', v_reservation.amount_minor
    )
  );

  return v_reservation.id;
end;
$$;

create table if not exists wallet_release_runs (
  id uuid primary key default gen_random_uuid(),

  run_type text not null default 'scheduled',
  status text not null default 'processing',

  scanned_lot_count integer not null default 0,
  released_lot_count integer not null default 0,
  released_amount_minor bigint not null default 0,

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,

  failure_reason text,

  metadata jsonb not null default '{}'::jsonb,

  constraint wallet_release_runs_status_check
  check (
    status in (
      'processing',
      'completed',
      'failed'
    )
  )
);

create index if not exists wallet_release_runs_started_idx
on wallet_release_runs (started_at desc);

alter table wallet_ledger_entries
add column if not exists release_run_id uuid references wallet_release_runs(id);

create index if not exists wallet_ledger_entries_release_run_idx
on wallet_ledger_entries (release_run_id);

create or replace function release_pending_reward(
  p_value_lot_id uuid,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_release_run_id uuid default null
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
    'amount_minor', v_lot.remaining_amount_minor,
    'campaign_budget_reservation_id',
    v_lot.campaign_budget_reservation_id,
    'release_run_id',
    p_release_run_id
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

  if v_lot.hold_until is not null and v_lot.hold_until > now() then
    raise exception 'value lot hold has not ended yet. lot %, hold_until %',
      p_value_lot_id,
      v_lot.hold_until;
  end if;

  if v_lot.expires_at is not null and v_lot.expires_at <= now() then
    raise exception 'value lot expired before release. lot %, expires_at %',
      p_value_lot_id,
      v_lot.expires_at;
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
    release_run_id,
    source_type,
    source_id,
    campaign_id,
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
    p_release_run_id,
    v_lot.source_type,
    v_lot.source_id,
    v_lot.campaign_id,
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
    p_metadata
  )
  returning id into v_ledger_entry_id;

  if v_lot.campaign_budget_reservation_id is not null then
    perform mark_campaign_reward_released(
      v_lot.campaign_budget_reservation_id,
      v_lot.id,
      'mark_campaign_reward_released:' ||
        v_lot.campaign_budget_reservation_id::text,
      p_metadata || jsonb_build_object(
        'released_by',
        'release_pending_reward',
        'wallet_value_lot_id',
        v_lot.id,
        'ledger_entry_id',
        v_ledger_entry_id,
        'release_run_id',
        p_release_run_id
      )
    );
  end if;

  perform wallet_complete_idempotent_operation(
    'release_pending_reward',
    p_idempotency_key,
    'wallet_ledger_entry',
    v_ledger_entry_id,
    jsonb_build_object(
      'value_lot_id', p_value_lot_id,
      'ledger_entry_id', v_ledger_entry_id,
      'campaign_budget_reservation_id',
      v_lot.campaign_budget_reservation_id,
      'release_run_id',
      p_release_run_id
    )
  );

  return v_ledger_entry_id;
end;
$$;

create or replace function run_wallet_release_job(
  p_batch_size integer default 500,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid;
  v_lot record;

  v_scanned integer := 0;
  v_released integer := 0;
  v_released_amount bigint := 0;
begin
  if p_batch_size <= 0 then
    raise exception 'batch size must be positive';
  end if;

  insert into wallet_release_runs (
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
    where status = 'pending'
      and remaining_amount_minor > 0
      and (
        hold_until is null
        or hold_until <= now()
      )
      and (
        expires_at is null
        or expires_at > now()
      )
    order by
      available_at asc nulls last,
      created_at asc,
      id asc
    limit p_batch_size
    for update skip locked
  loop
    v_scanned := v_scanned + 1;

    perform release_pending_reward(
      v_lot.id,
      'release:' || v_lot.id::text,
      p_metadata,
      v_run_id
    );

    v_released := v_released + 1;
    v_released_amount := v_released_amount + v_lot.remaining_amount_minor;
  end loop;

  update wallet_release_runs
  set
    status = 'completed',
    completed_at = now(),
    scanned_lot_count = v_scanned,
    released_lot_count = v_released,
    released_amount_minor = v_released_amount
  where id = v_run_id;

  return v_run_id;

exception
  when others then
    update wallet_release_runs
    set
      status = 'failed',
      failed_at = now(),
      failure_reason = sqlerrm
    where id = v_run_id;

    raise;
end;
$$;

create or replace view wallet_release_run_details as
select
  rr.id as release_run_id,
  rr.run_type,
  rr.status,
  rr.scanned_lot_count,
  rr.released_lot_count,
  rr.released_amount_minor,
  rr.started_at,
  rr.completed_at,
  rr.failed_at,
  rr.failure_reason,

  count(le.id) as ledger_entry_count,

  jsonb_agg(
    jsonb_build_object(
      'ledger_entry_id', le.id,
      'value_lot_id', le.value_lot_id,
      'wallet_id', le.wallet_id,
      'user_id', le.user_id,
      'campaign_id', le.campaign_id,
      'campaign_budget_reservation_id',
      le.campaign_budget_reservation_id,
      'currency_code', le.currency_code,
      'amount_minor', le.amount_minor,
      'available_impact_minor', le.available_impact_minor,
      'pending_impact_minor', le.pending_impact_minor,
      'created_at', le.created_at
    )
    order by le.created_at asc
  ) filter (where le.id is not null) as released_entries

from wallet_release_runs rr
left join wallet_ledger_entries le
  on le.release_run_id = rr.id
group by rr.id;

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
    where cbr.status = 'cancelled'
  ), 0)::bigint as cancelled_reservations_minor

from campaign_budgets cb
left join campaign_budget_reservations cbr
  on cbr.campaign_budget_id = cb.id
group by cb.id;
