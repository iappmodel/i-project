-- 33/post-MVP schema — patch expiration into campaign budget accounting.

create or replace function mark_campaign_reward_expired(
  p_campaign_budget_reservation_id uuid,
  p_wallet_value_lot_id uuid default null,
  p_expired_amount_minor bigint default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_reservation campaign_budget_reservations%rowtype;
  v_expired_amount bigint;

  v_should_execute boolean;
  v_existing_result_id uuid;
  v_payload jsonb;
begin
  if p_campaign_budget_reservation_id is null then
    raise exception 'campaign budget reservation id is required';
  end if;

  if p_idempotency_key is null then
    p_idempotency_key :=
      'mark_campaign_reward_expired:' ||
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

  v_expired_amount := coalesce(
    p_expired_amount_minor,
    v_reservation.amount_minor
  );

  if v_expired_amount <= 0 then
    raise exception 'expired amount must be positive';
  end if;

  v_payload := jsonb_build_object(
    'campaign_budget_reservation_id', p_campaign_budget_reservation_id,
    'wallet_value_lot_id', p_wallet_value_lot_id,
    'campaign_id', v_reservation.campaign_id,
    'wallet_id', v_reservation.wallet_id,
    'user_id', v_reservation.user_id,
    'expired_amount_minor', v_expired_amount,
    'current_status', v_reservation.status
  );

  select should_execute, existing_result_id
  into v_should_execute, v_existing_result_id
  from wallet_begin_idempotent_operation(
    'mark_campaign_reward_expired',
    p_idempotency_key,
    v_reservation.user_id,
    v_reservation.wallet_id,
    v_payload,
    p_metadata
  );

  if v_should_execute is false then
    return v_existing_result_id;
  end if;

  if v_reservation.status = 'expired' then
    perform wallet_complete_idempotent_operation(
      'mark_campaign_reward_expired',
      p_idempotency_key,
      'campaign_budget_reservation',
      v_reservation.id,
      jsonb_build_object(
        'campaign_budget_reservation_id', v_reservation.id,
        'already_expired', true
      )
    );

    return v_reservation.id;
  end if;

  if v_reservation.status not in ('issued', 'released') then
    raise exception 'only issued/released campaign rewards can expire. reservation %, status %',
      p_campaign_budget_reservation_id,
      v_reservation.status;
  end if;

  update campaign_budget_reservations
  set
    status = 'expired',
    expired_at = now(),
    expiration_reason = coalesce(
      p_metadata->>'expiration_reason',
      'wallet_value_lot_expired'
    ),
    updated_at = now(),
    metadata = metadata || p_metadata || jsonb_build_object(
      'wallet_value_lot_id',
      p_wallet_value_lot_id,
      'expired_amount_minor',
      v_expired_amount
    )
  where id = v_reservation.id;

  update campaign_budgets
  set
    expired_amount_minor = expired_amount_minor + v_expired_amount,
    updated_at = now()
  where id = v_reservation.campaign_budget_id;

  perform wallet_complete_idempotent_operation(
    'mark_campaign_reward_expired',
    p_idempotency_key,
    'campaign_budget_reservation',
    v_reservation.id,
    jsonb_build_object(
      'campaign_budget_reservation_id', v_reservation.id,
      'expired_amount_minor', v_expired_amount
    )
  );

  return v_reservation.id;
end;
$$;

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
  v_expired_amount bigint;

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

  v_expired_amount := v_lot.remaining_amount_minor;

  v_payload := jsonb_build_object(
    'value_lot_id', p_value_lot_id,
    'wallet_id', v_lot.wallet_id,
    'user_id', v_lot.user_id,
    'remaining_amount_minor', v_lot.remaining_amount_minor,
    'status', v_lot.status,
    'expires_at', v_lot.expires_at,
    'campaign_budget_reservation_id',
    v_lot.campaign_budget_reservation_id
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
    p_expiration_run_id,
    'expiration',
    p_expiration_run_id,
    v_lot.campaign_id,
    v_lot.campaign_budget_reservation_id,
    'expiration',
    -1,
    v_lot.currency_code,
    v_expired_amount,
    case
      when v_lot.status = 'available'
      then -v_expired_amount
      else 0
    end,
    case
      when v_lot.status = 'pending'
      then -v_expired_amount
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
      v_lot.status,
      'campaign_budget_reservation_id',
      v_lot.campaign_budget_reservation_id
    )
  )
  returning id into v_ledger_entry_id;

  if v_lot.campaign_budget_reservation_id is not null then
    perform mark_campaign_reward_expired(
      v_lot.campaign_budget_reservation_id,
      v_lot.id,
      v_expired_amount,
      'mark_campaign_reward_expired:' ||
        v_lot.campaign_budget_reservation_id::text,
      p_metadata || jsonb_build_object(
        'expired_by',
        'expire_wallet_value_lot',
        'wallet_value_lot_id',
        v_lot.id,
        'ledger_entry_id',
        v_ledger_entry_id,
        'expiration_run_id',
        p_expiration_run_id,
        'expiration_reason',
        p_reason
      )
    );
  end if;

  perform wallet_complete_idempotent_operation(
    'expire_wallet_value_lot',
    p_idempotency_key,
    'wallet_ledger_entry',
    v_ledger_entry_id,
    jsonb_build_object(
      'value_lot_id', p_value_lot_id,
      'ledger_entry_id', v_ledger_entry_id,
      'expired_amount_minor', v_expired_amount,
      'campaign_budget_reservation_id',
      v_lot.campaign_budget_reservation_id
    )
  );

  return v_ledger_entry_id;
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

    if exists (
      select 1
      from wallet_value_lots wl
      where wl.id = v_reservation.value_lot_id
        and wl.status = 'expired'
        and wl.campaign_budget_reservation_id is not null
    ) then
      perform mark_campaign_reward_expired(
        (
          select wl.campaign_budget_reservation_id
          from wallet_value_lots wl
          where wl.id = v_reservation.value_lot_id
        ),
        v_reservation.value_lot_id,
        v_reservation.reserved_amount_minor,
        'mark_campaign_reward_expired:' ||
          (
            select wl.campaign_budget_reservation_id::text
            from wallet_value_lots wl
            where wl.id = v_reservation.value_lot_id
          ),
        p_metadata || jsonb_build_object(
          'expired_by',
          'release_wallet_reservation',
          'reason',
          p_reason,
          'expired_on_release',
          true,
          'reservation_group_id',
          p_reservation_group_id
        )
      );
    end if;

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
  cbr.expiration_reason,

  wl.id as wallet_value_lot_id,
  wl.status as wallet_lot_status,
  wl.original_amount_minor,
  wl.remaining_amount_minor,
  wl.available_at,
  wl.released_at as wallet_lot_released_at,
  wl.expires_at,
  wl.expired_at as wallet_lot_expired_at,
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
