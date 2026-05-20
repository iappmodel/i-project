-- 35/post-MVP schema — wallet fraud lock integration and risk policy bridge.

alter table wallets
add column if not exists fraud_lock_status text not null default 'clear',
add column if not exists fraud_locked_at timestamptz,
add column if not exists fraud_unlocked_at timestamptz,
add column if not exists fraud_lock_reason text,
add column if not exists fraud_lock_metadata jsonb not null default '{}'::jsonb;

alter table wallets
drop constraint if exists wallets_fraud_lock_status_check;

alter table wallets
add constraint wallets_fraud_lock_status_check
check (
  fraud_lock_status in (
    'clear',
    'watch',
    'soft_locked',
    'hard_locked',
    'permanent_ban'
  )
);

create index if not exists wallets_fraud_lock_status_idx
on wallets (fraud_lock_status, fraud_locked_at desc);

create table if not exists wallet_fraud_lock_events (
  id uuid primary key default gen_random_uuid(),

  wallet_id uuid not null references wallets(id),
  user_id uuid not null,

  previous_status text not null,
  new_status text not null,

  reason text not null,
  actor_type text not null default 'system',
  actor_id uuid,

  trust_score numeric(6, 4),
  risk_score numeric(6, 4),

  related_attention_event_id uuid,
  related_reward_id uuid,
  related_campaign_id uuid,
  related_withdrawal_request_id uuid,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint wallet_fraud_lock_events_status_check
  check (
    previous_status in (
      'clear',
      'watch',
      'soft_locked',
      'hard_locked',
      'permanent_ban'
    )
    and new_status in (
      'clear',
      'watch',
      'soft_locked',
      'hard_locked',
      'permanent_ban'
    )
  ),

  constraint wallet_fraud_lock_events_actor_type_check
  check (
    actor_type in (
      'system',
      'admin',
      'trust_engine',
      'fraud_engine',
      'appeal_engine'
    )
  )
);

create index if not exists wallet_fraud_lock_events_wallet_idx
on wallet_fraud_lock_events (wallet_id, created_at desc);

create index if not exists wallet_fraud_lock_events_user_idx
on wallet_fraud_lock_events (user_id, created_at desc);

create or replace function wallet_fraud_lock_allows_action(
  p_lock_status text,
  p_action text
)
returns boolean
language sql
immutable
as $$
  select case
    when p_lock_status in ('clear', 'watch') then true

    when p_lock_status = 'soft_locked' then
      p_action not in (
        'withdraw',
        'convert',
        'cashout',
        'external_transfer'
      )

    when p_lock_status in ('hard_locked', 'permanent_ban') then
      p_action in (
        'admin_adjustment',
        'fraud_clawback',
        'expire_lot',
        'read',
        'audit'
      )

    else false
  end;
$$;

create or replace function wallet_assert_not_fraud_locked(
  p_wallet_id uuid,
  p_action text
)
returns void
language plpgsql
stable
as $$
declare
  v_status text;
begin
  if p_wallet_id is null then
    raise exception 'wallet id is required';
  end if;

  if p_action is null or length(trim(p_action)) = 0 then
    raise exception 'wallet action is required';
  end if;

  select fraud_lock_status
  into v_status
  from wallets
  where id = p_wallet_id;

  if v_status is null then
    raise exception 'wallet not found: %', p_wallet_id;
  end if;

  if wallet_fraud_lock_allows_action(v_status, p_action) is false then
    raise exception 'wallet fraud lock blocks action. wallet %, status %, action %',
      p_wallet_id,
      v_status,
      p_action;
  end if;
end;
$$;

create or replace function set_wallet_fraud_lock_status(
  p_wallet_id uuid,
  p_new_status text,
  p_reason text,
  p_actor_type text default 'system',
  p_actor_id uuid default null,
  p_trust_score numeric default null,
  p_risk_score numeric default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_wallet wallets%rowtype;
  v_event_id uuid;
begin
  if p_wallet_id is null then
    raise exception 'wallet id is required';
  end if;

  if p_new_status not in (
    'clear',
    'watch',
    'soft_locked',
    'hard_locked',
    'permanent_ban'
  ) then
    raise exception 'invalid fraud lock status: %', p_new_status;
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'fraud lock reason is required';
  end if;

  if p_actor_type not in (
    'system',
    'admin',
    'trust_engine',
    'fraud_engine',
    'appeal_engine'
  ) then
    raise exception 'invalid actor type: %', p_actor_type;
  end if;

  select *
  into v_wallet
  from wallets
  where id = p_wallet_id
  for update;

  if v_wallet.id is null then
    raise exception 'wallet not found: %', p_wallet_id;
  end if;

  insert into wallet_fraud_lock_events (
    wallet_id,
    user_id,
    previous_status,
    new_status,
    reason,
    actor_type,
    actor_id,
    trust_score,
    risk_score,
    metadata
  )
  values (
    v_wallet.id,
    v_wallet.user_id,
    v_wallet.fraud_lock_status,
    p_new_status,
    p_reason,
    p_actor_type,
    p_actor_id,
    p_trust_score,
    p_risk_score,
    p_metadata
  )
  returning id into v_event_id;

  update wallets
  set
    fraud_lock_status = p_new_status,
    fraud_locked_at =
      case
        when p_new_status in ('soft_locked', 'hard_locked', 'permanent_ban')
        then now()
        else fraud_locked_at
      end,
    fraud_unlocked_at =
      case
        when p_new_status in ('clear', 'watch')
        then now()
        else fraud_unlocked_at
      end,
    fraud_lock_reason = p_reason,
    fraud_lock_metadata = fraud_lock_metadata || p_metadata,
    updated_at = now()
  where id = v_wallet.id;

  return v_event_id;
end;
$$;

create or replace function watch_wallet_for_fraud(
  p_wallet_id uuid,
  p_reason text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language sql
as $$
  select set_wallet_fraud_lock_status(
    p_wallet_id,
    'watch',
    p_reason,
    'fraud_engine',
    null,
    null,
    null,
    p_metadata
  );
$$;

create or replace function soft_lock_wallet(
  p_wallet_id uuid,
  p_reason text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language sql
as $$
  select set_wallet_fraud_lock_status(
    p_wallet_id,
    'soft_locked',
    p_reason,
    'fraud_engine',
    null,
    null,
    null,
    p_metadata
  );
$$;

create or replace function hard_lock_wallet(
  p_wallet_id uuid,
  p_reason text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language sql
as $$
  select set_wallet_fraud_lock_status(
    p_wallet_id,
    'hard_locked',
    p_reason,
    'fraud_engine',
    null,
    null,
    null,
    p_metadata
  );
$$;

create or replace function clear_wallet_fraud_lock(
  p_wallet_id uuid,
  p_reason text,
  p_actor_type text default 'admin',
  p_actor_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language sql
as $$
  select set_wallet_fraud_lock_status(
    p_wallet_id,
    'clear',
    p_reason,
    p_actor_type,
    p_actor_id,
    null,
    null,
    p_metadata
  );
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

  perform wallet_assert_not_fraud_locked(
    p_wallet_id,
    'issue_reward'
  );

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

  perform wallet_assert_not_fraud_locked(
    v_lot.wallet_id,
    'release_reward'
  );

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

create or replace function spend_wallet_balance(
  p_wallet_id uuid,
  p_user_id uuid,
  p_amount_minor bigint,
  p_spend_type text,
  p_spend_id uuid default null,
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
  v_remaining_to_spend bigint;
  v_take_amount bigint;

  v_lot wallet_value_lots%rowtype;

  v_spend_group_id uuid;
  v_ledger_entry_id uuid;

  v_should_execute boolean;
  v_existing_result_id uuid;
  v_payload jsonb;
begin
  if p_amount_minor <= 0 then
    raise exception 'spend amount must be positive';
  end if;

  if p_wallet_id is null then
    raise exception 'wallet id is required';
  end if;

  if p_user_id is null then
    raise exception 'user id is required';
  end if;

  if p_spend_type is null or length(trim(p_spend_type)) = 0 then
    raise exception 'spend type is required';
  end if;

  if p_idempotency_key is null then
    if p_spend_id is null then
      raise exception 'idempotency key or spend id is required for multi-lot spend';
    end if;

    p_idempotency_key := 'spend_balance:' || p_spend_type || ':' || p_spend_id::text;
  end if;

  perform wallet_assert_not_fraud_locked(
    p_wallet_id,
    'spend'
  );

  v_payload := jsonb_build_object(
    'wallet_id', p_wallet_id,
    'user_id', p_user_id,
    'amount_minor', p_amount_minor,
    'spend_type', p_spend_type,
    'spend_id', p_spend_id,
    'currency_code', coalesce(p_currency_code, 'USD'),
    'cashout_only', p_cashout_only
  );

  select should_execute, existing_result_id
  into v_should_execute, v_existing_result_id
  from wallet_begin_idempotent_operation(
    'spend_wallet_balance',
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
        'insufficient_available_balance',
        'available_minor',
        v_available,
        'requested_minor',
        p_amount_minor
      )
    where operation_type = 'spend_wallet_balance'
      and idempotency_key = p_idempotency_key;

    raise exception 'insufficient available balance. wallet %, available %, requested %',
      p_wallet_id,
      v_available,
      p_amount_minor;
  end if;

  insert into wallet_spend_groups (
    wallet_id,
    user_id,
    spend_type,
    spend_id,
    currency_code,
    requested_amount_minor,
    spent_amount_minor,
    status,
    idempotency_key,
    operation_type,
    metadata
  )
  values (
    p_wallet_id,
    p_user_id,
    p_spend_type,
    p_spend_id,
    coalesce(p_currency_code, 'USD'),
    p_amount_minor,
    0,
    'processing',
    p_idempotency_key,
    'spend_wallet_balance',
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_spend_group_id;

  v_remaining_to_spend := p_amount_minor;

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
    exit when v_remaining_to_spend <= 0;

    v_take_amount := least(v_lot.remaining_amount_minor, v_remaining_to_spend);

    update wallet_value_lots
    set
      remaining_amount_minor = remaining_amount_minor - v_take_amount,
      status =
        case
          when remaining_amount_minor - v_take_amount = 0
          then
            case
              when p_spend_type = 'withdrawal' then 'withdrawn'
              else 'spent'
            end
          else status
        end,
      spent_at =
        case
          when remaining_amount_minor - v_take_amount = 0
               and p_spend_type <> 'withdrawal'
          then now()
          else spent_at
        end,
      withdrawn_at =
        case
          when remaining_amount_minor - v_take_amount = 0
               and p_spend_type = 'withdrawal'
          then now()
          else withdrawn_at
        end,
      consumed_at =
        case
          when remaining_amount_minor - v_take_amount = 0
          then now()
          else consumed_at
        end,
      updated_at = now()
    where id = v_lot.id;

    insert into wallet_ledger_entries (
      wallet_id,
      user_id,
      value_lot_id,
      spend_group_id,
      source_type,
      source_id,
      campaign_id,
      reward_event_id,
      withdrawal_id,
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
      v_spend_group_id,
      p_spend_type,
      p_spend_id,
      v_lot.campaign_id,
      v_lot.reward_event_id,
      case when p_spend_type = 'withdrawal' then p_spend_id else null end,
      case
        when p_spend_type = 'withdrawal' then 'withdrawal'
        else 'debit'
      end,
      -1,
      coalesce(p_currency_code, 'USD'),
      v_take_amount,
      -v_take_amount,
      0,
      0,
      'posted',
      p_idempotency_key || ':lot:' || v_lot.id::text,
      'spend_wallet_balance',
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'spend_group_id',
        v_spend_group_id,
        'lot_amount_before',
        v_lot.remaining_amount_minor,
        'lot_amount_taken',
        v_take_amount
      )
    )
    returning id into v_ledger_entry_id;

    v_remaining_to_spend := v_remaining_to_spend - v_take_amount;
  end loop;

  if v_remaining_to_spend <> 0 then
    update wallet_spend_groups
    set
      status = 'failed',
      failed_at = now(),
      spent_amount_minor = p_amount_minor - v_remaining_to_spend,
      metadata = metadata || jsonb_build_object(
        'failed_reason',
        'selection_race_or_insufficient_locked_lots',
        'remaining_to_spend',
        v_remaining_to_spend
      )
    where id = v_spend_group_id;

    update wallet_idempotency_keys
    set
      status = 'failed',
      failed_at = now(),
      metadata = metadata || jsonb_build_object(
        'failed_reason',
        'selection_race_or_insufficient_locked_lots',
        'remaining_to_spend',
        v_remaining_to_spend
      )
    where operation_type = 'spend_wallet_balance'
      and idempotency_key = p_idempotency_key;

    raise exception 'spend failed after lot selection. remaining amount %',
      v_remaining_to_spend;
  end if;

  update wallet_spend_groups
  set
    status = 'completed',
    completed_at = now(),
    spent_amount_minor = p_amount_minor
  where id = v_spend_group_id;

  perform wallet_complete_idempotent_operation(
    'spend_wallet_balance',
    p_idempotency_key,
    'wallet_spend_group',
    v_spend_group_id,
    jsonb_build_object(
      'spend_group_id', v_spend_group_id,
      'spent_amount_minor', p_amount_minor,
      'currency_code', coalesce(p_currency_code, 'USD')
    )
  );

  return v_spend_group_id;
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

  perform wallet_assert_not_fraud_locked(
    p_wallet_id,
    'withdraw'
  );

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

create or replace function convert_wallet_balance(
  p_wallet_id uuid,
  p_user_id uuid,
  p_source_amount_minor bigint,
  p_source_currency_code text,
  p_target_currency_code text,
  p_conversion_type text default 'wallet_conversion',
  p_conversion_id uuid default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_available bigint;

  v_rate_id uuid;
  v_rate numeric;
  v_spread_bps integer;
  v_target_amount_minor bigint;
  v_fee_amount_minor bigint;

  v_conversion_group_id uuid;

  v_remaining_to_consume bigint;
  v_take_amount bigint;
  v_target_piece_minor bigint;
  v_target_allocated_minor bigint := 0;

  v_lot wallet_value_lots%rowtype;
  v_source_ledger_entry_id uuid;
  v_target_lot_id uuid;
  v_target_ledger_entry_id uuid;

  v_should_execute boolean;
  v_existing_result_id uuid;
  v_payload jsonb;
begin
  if p_wallet_id is null then
    raise exception 'wallet id is required';
  end if;

  if p_user_id is null then
    raise exception 'user id is required';
  end if;

  if p_source_amount_minor <= 0 then
    raise exception 'source amount must be positive';
  end if;

  if p_source_currency_code is null or length(trim(p_source_currency_code)) = 0 then
    raise exception 'source currency is required';
  end if;

  if p_target_currency_code is null or length(trim(p_target_currency_code)) = 0 then
    raise exception 'target currency is required';
  end if;

  if p_source_currency_code = p_target_currency_code then
    raise exception 'source and target currency must differ';
  end if;

  if p_idempotency_key is null then
    if p_conversion_id is null then
      raise exception 'idempotency key or conversion id is required';
    end if;

    p_idempotency_key :=
      'conversion:' || p_conversion_type || ':' || p_conversion_id::text;
  end if;

  perform wallet_assert_not_fraud_locked(
    p_wallet_id,
    'convert'
  );

  select rate_id, rate, spread_bps
  into v_rate_id, v_rate, v_spread_bps
  from wallet_get_conversion_rate(
    p_source_currency_code,
    p_target_currency_code,
    p_source_amount_minor,
    now()
  );

  select target_amount_minor, fee_amount_minor
  into v_target_amount_minor, v_fee_amount_minor
  from wallet_calculate_conversion_output(
    p_source_amount_minor,
    v_rate,
    v_spread_bps
  );

  if v_target_amount_minor <= 0 then
    raise exception 'conversion output is zero';
  end if;

  v_payload := jsonb_build_object(
    'wallet_id', p_wallet_id,
    'user_id', p_user_id,
    'source_amount_minor', p_source_amount_minor,
    'source_currency_code', p_source_currency_code,
    'target_currency_code', p_target_currency_code,
    'conversion_type', p_conversion_type,
    'conversion_id', p_conversion_id,
    'rate_id', v_rate_id,
    'rate', v_rate,
    'spread_bps', v_spread_bps,
    'target_amount_minor', v_target_amount_minor,
    'fee_amount_minor', v_fee_amount_minor
  );

  select should_execute, existing_result_id
  into v_should_execute, v_existing_result_id
  from wallet_begin_idempotent_operation(
    'convert_wallet_balance',
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
    p_source_currency_code,
    false
  );

  if v_available < p_source_amount_minor then
    update wallet_idempotency_keys
    set
      status = 'failed',
      failed_at = now(),
      metadata = metadata || jsonb_build_object(
        'failed_reason',
        'insufficient_available_balance_for_conversion',
        'available_minor',
        v_available,
        'requested_minor',
        p_source_amount_minor
      )
    where operation_type = 'convert_wallet_balance'
      and idempotency_key = p_idempotency_key;

    raise exception 'insufficient available balance for conversion. available %, requested %',
      v_available,
      p_source_amount_minor;
  end if;

  insert into wallet_conversion_groups (
    wallet_id,
    user_id,
    source_currency_code,
    target_currency_code,
    source_amount_minor,
    target_amount_minor,
    conversion_rate,
    fee_amount_minor,
    spread_bps,
    conversion_type,
    conversion_id,
    status,
    idempotency_key,
    operation_type,
    metadata
  )
  values (
    p_wallet_id,
    p_user_id,
    p_source_currency_code,
    p_target_currency_code,
    p_source_amount_minor,
    v_target_amount_minor,
    v_rate,
    v_fee_amount_minor,
    v_spread_bps,
    p_conversion_type,
    p_conversion_id,
    'processing',
    p_idempotency_key,
    'convert_wallet_balance',
    p_metadata || jsonb_build_object(
      'rate_id',
      v_rate_id
    )
  )
  returning id into v_conversion_group_id;

  v_remaining_to_consume := p_source_amount_minor;

  for v_lot in
    select *
    from wallet_value_lots
    where wallet_id = p_wallet_id
      and user_id = p_user_id
      and currency_code = p_source_currency_code
      and status = 'available'
      and remaining_amount_minor > 0
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
    exit when v_remaining_to_consume <= 0;

    v_take_amount := least(v_lot.remaining_amount_minor, v_remaining_to_consume);

    if v_remaining_to_consume = v_take_amount then
      v_target_piece_minor := v_target_amount_minor - v_target_allocated_minor;
    else
      v_target_piece_minor := floor(
        (v_take_amount::numeric / p_source_amount_minor::numeric)
        * v_target_amount_minor::numeric
      )::bigint;
    end if;

    if v_target_piece_minor <= 0 then
      raise exception 'conversion target allocation produced zero for lot %',
        v_lot.id;
    end if;

    update wallet_value_lots
    set
      remaining_amount_minor = remaining_amount_minor - v_take_amount,
      status =
        case
          when remaining_amount_minor - v_take_amount = 0
          then 'spent'
          else status
        end,
      spent_at =
        case
          when remaining_amount_minor - v_take_amount = 0
          then now()
          else spent_at
        end,
      updated_at = now()
    where id = v_lot.id;

    insert into wallet_ledger_entries (
      wallet_id,
      user_id,
      value_lot_id,
      conversion_group_id,
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
      v_conversion_group_id,
      p_conversion_type,
      p_conversion_id,
      v_lot.campaign_id,
      'conversion_debit',
      -1,
      p_source_currency_code,
      v_take_amount,
      -v_take_amount,
      0,
      0,
      'posted',
      p_idempotency_key,
      'convert_wallet_balance',
      p_metadata || jsonb_build_object(
        'conversion_group_id',
        v_conversion_group_id,
        'target_currency_code',
        p_target_currency_code,
        'target_piece_minor',
        v_target_piece_minor
      )
    )
    returning id into v_source_ledger_entry_id;

    insert into wallet_value_lots (
      wallet_id,
      user_id,
      source_type,
      source_id,
      campaign_id,
      currency_code,
      original_amount_minor,
      remaining_amount_minor,
      status,
      cashout_eligible,
      available_at,
      released_at,
      expires_at,
      metadata,
      conversion_group_id,
      converted_from_value_lot_id
    )
    values (
      p_wallet_id,
      p_user_id,
      'conversion',
      v_conversion_group_id,
      v_lot.campaign_id,
      p_target_currency_code,
      v_target_piece_minor,
      v_target_piece_minor,
      'available',
      case
        when p_target_currency_code = 'USD' then true
        else false
      end,
      now(),
      now(),
      null,
      p_metadata || jsonb_build_object(
        'conversion_group_id',
        v_conversion_group_id,
        'source_value_lot_id',
        v_lot.id,
        'source_amount_minor',
        v_take_amount,
        'source_currency_code',
        p_source_currency_code,
        'target_currency_code',
        p_target_currency_code,
        'rate_id',
        v_rate_id,
        'rate',
        v_rate,
        'spread_bps',
        v_spread_bps
      ),
      v_conversion_group_id,
      v_lot.id
    )
    returning id into v_target_lot_id;

    insert into wallet_ledger_entries (
      wallet_id,
      user_id,
      value_lot_id,
      conversion_group_id,
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
      v_target_lot_id,
      v_conversion_group_id,
      p_conversion_type,
      p_conversion_id,
      v_lot.campaign_id,
      'conversion_credit',
      1,
      p_target_currency_code,
      v_target_piece_minor,
      v_target_piece_minor,
      0,
      0,
      'posted',
      p_idempotency_key,
      'convert_wallet_balance',
      p_metadata || jsonb_build_object(
        'conversion_group_id',
        v_conversion_group_id,
        'source_value_lot_id',
        v_lot.id,
        'source_ledger_entry_id',
        v_source_ledger_entry_id,
        'source_amount_minor',
        v_take_amount,
        'rate_id',
        v_rate_id
      )
    )
    returning id into v_target_ledger_entry_id;

    v_target_allocated_minor := v_target_allocated_minor + v_target_piece_minor;
    v_remaining_to_consume := v_remaining_to_consume - v_take_amount;
  end loop;

  if v_remaining_to_consume <> 0 then
    update wallet_conversion_groups
    set
      status = 'failed',
      failed_at = now(),
      metadata = metadata || jsonb_build_object(
        'failed_reason',
        'conversion_selection_race',
        'remaining_to_consume',
        v_remaining_to_consume
      )
    where id = v_conversion_group_id;

    update wallet_idempotency_keys
    set
      status = 'failed',
      failed_at = now(),
      metadata = metadata || jsonb_build_object(
        'failed_reason',
        'conversion_selection_race',
        'remaining_to_consume',
        v_remaining_to_consume
      )
    where operation_type = 'convert_wallet_balance'
      and idempotency_key = p_idempotency_key;

    raise exception 'conversion failed after lot selection. remaining amount %',
      v_remaining_to_consume;
  end if;

  update wallet_conversion_groups
  set
    status = 'completed',
    completed_at = now()
  where id = v_conversion_group_id;

  perform wallet_complete_idempotent_operation(
    'convert_wallet_balance',
    p_idempotency_key,
    'wallet_conversion_group',
    v_conversion_group_id,
    jsonb_build_object(
      'conversion_group_id', v_conversion_group_id,
      'source_amount_minor', p_source_amount_minor,
      'source_currency_code', p_source_currency_code,
      'target_amount_minor', v_target_amount_minor,
      'target_currency_code', p_target_currency_code,
      'rate', v_rate,
      'spread_bps', v_spread_bps
    )
  );

  return v_conversion_group_id;
end;
$$;

create or replace function refund_wallet_spend(
  p_original_spend_group_id uuid,
  p_amount_minor bigint,
  p_refund_type text,
  p_refund_id uuid default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_spend_group wallet_spend_groups%rowtype;

  v_refundable bigint;
  v_remaining_to_refund bigint;
  v_refund_amount bigint;

  v_debit wallet_ledger_entries%rowtype;

  v_refund_group_id uuid;
  v_refund_lot_id uuid;
  v_ledger_entry_id uuid;

  v_should_execute boolean;
  v_existing_result_id uuid;
  v_payload jsonb;
begin
  if p_original_spend_group_id is null then
    raise exception 'original spend group id is required';
  end if;

  if p_amount_minor <= 0 then
    raise exception 'refund amount must be positive';
  end if;

  if p_refund_type is null or length(trim(p_refund_type)) = 0 then
    raise exception 'refund type is required';
  end if;

  select *
  into v_spend_group
  from wallet_spend_groups
  where id = p_original_spend_group_id
  for update;

  if v_spend_group.id is null then
    raise exception 'original spend group not found: %',
      p_original_spend_group_id;
  end if;

  perform wallet_assert_not_fraud_locked(
    v_spend_group.wallet_id,
    'refund'
  );

  if v_spend_group.status <> 'completed' then
    raise exception 'only completed spend groups can be refunded. spend group %, status %',
      p_original_spend_group_id,
      v_spend_group.status;
  end if;

  if p_idempotency_key is null then
    if p_refund_id is null then
      raise exception 'idempotency key or refund id is required';
    end if;

    p_idempotency_key := 'refund:' || p_refund_type || ':' || p_refund_id::text;
  end if;

  v_payload := jsonb_build_object(
    'original_spend_group_id', p_original_spend_group_id,
    'amount_minor', p_amount_minor,
    'refund_type', p_refund_type,
    'refund_id', p_refund_id,
    'wallet_id', v_spend_group.wallet_id,
    'user_id', v_spend_group.user_id,
    'currency_code', v_spend_group.currency_code
  );

  select should_execute, existing_result_id
  into v_should_execute, v_existing_result_id
  from wallet_begin_idempotent_operation(
    'refund_wallet_spend',
    p_idempotency_key,
    v_spend_group.user_id,
    v_spend_group.wallet_id,
    v_payload,
    p_metadata
  );

  if v_should_execute is false then
    return v_existing_result_id;
  end if;

  v_refundable := wallet_spend_group_refundable_balance(
    p_original_spend_group_id
  );

  if v_refundable < p_amount_minor then
    update wallet_idempotency_keys
    set
      status = 'failed',
      failed_at = now(),
      metadata = metadata || jsonb_build_object(
        'failed_reason',
        'refund_amount_exceeds_refundable_balance',
        'refundable_minor',
        v_refundable,
        'requested_minor',
        p_amount_minor
      )
    where operation_type = 'refund_wallet_spend'
      and idempotency_key = p_idempotency_key;

    raise exception 'refund amount exceeds refundable balance. refundable %, requested %',
      v_refundable,
      p_amount_minor;
  end if;

  insert into wallet_refund_groups (
    wallet_id,
    user_id,
    original_spend_group_id,
    refund_type,
    refund_id,
    currency_code,
    requested_amount_minor,
    refunded_amount_minor,
    status,
    idempotency_key,
    operation_type,
    metadata
  )
  values (
    v_spend_group.wallet_id,
    v_spend_group.user_id,
    p_original_spend_group_id,
    p_refund_type,
    p_refund_id,
    v_spend_group.currency_code,
    p_amount_minor,
    0,
    'processing',
    p_idempotency_key,
    'refund_wallet_spend',
    p_metadata
  )
  returning id into v_refund_group_id;

  v_remaining_to_refund := p_amount_minor;

  for v_debit in
    select *
    from wallet_ledger_entries
    where spend_group_id = p_original_spend_group_id
      and direction = -1
      and entry_type in ('debit', 'withdrawal')
      and status = 'posted'
    order by created_at asc, id asc
    for update
  loop
    exit when v_remaining_to_refund <= 0;

    v_refund_amount := least(
      wallet_ledger_entry_refundable_balance(v_debit.id),
      v_remaining_to_refund
    );

    if v_refund_amount <= 0 then
      continue;
    end if;

    insert into wallet_value_lots (
      wallet_id,
      user_id,
      source_type,
      source_id,
      campaign_id,
      currency_code,
      original_amount_minor,
      remaining_amount_minor,
      status,
      cashout_eligible,
      available_at,
      released_at,
      expires_at,
      metadata,
      refunded_from_value_lot_id,
      refund_group_id
    )
    values (
      v_spend_group.wallet_id,
      v_spend_group.user_id,
      'refund',
      v_refund_group_id,
      v_debit.campaign_id,
      v_spend_group.currency_code,
      v_refund_amount,
      v_refund_amount,
      'available',
      true,
      now(),
      now(),
      null,
      p_metadata || jsonb_build_object(
        'refund_group_id',
        v_refund_group_id,
        'original_spend_group_id',
        p_original_spend_group_id,
        'original_ledger_entry_id',
        v_debit.id,
        'original_value_lot_id',
        v_debit.value_lot_id
      ),
      v_debit.value_lot_id,
      v_refund_group_id
    )
    returning id into v_refund_lot_id;

    insert into wallet_ledger_entries (
      wallet_id,
      user_id,
      value_lot_id,
      refund_group_id,
      original_ledger_entry_id,
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
      v_spend_group.wallet_id,
      v_spend_group.user_id,
      v_refund_lot_id,
      v_refund_group_id,
      v_debit.id,
      p_refund_type,
      p_refund_id,
      v_debit.campaign_id,
      'refund',
      1,
      v_spend_group.currency_code,
      v_refund_amount,
      v_refund_amount,
      0,
      0,
      'posted',
      p_idempotency_key,
      'refund_wallet_spend',
      p_metadata || jsonb_build_object(
        'refund_group_id',
        v_refund_group_id,
        'original_spend_group_id',
        p_original_spend_group_id,
        'original_ledger_entry_id',
        v_debit.id,
        'refund_amount_minor',
        v_refund_amount
      )
    )
    returning id into v_ledger_entry_id;

    v_remaining_to_refund := v_remaining_to_refund - v_refund_amount;
  end loop;

  if v_remaining_to_refund <> 0 then
    update wallet_refund_groups
    set
      status = 'failed',
      failed_at = now(),
      refunded_amount_minor = p_amount_minor - v_remaining_to_refund,
      metadata = metadata || jsonb_build_object(
        'failed_reason',
        'refund_selection_race',
        'remaining_to_refund',
        v_remaining_to_refund
      )
    where id = v_refund_group_id;

    update wallet_idempotency_keys
    set
      status = 'failed',
      failed_at = now(),
      metadata = metadata || jsonb_build_object(
        'failed_reason',
        'refund_selection_race',
        'remaining_to_refund',
        v_remaining_to_refund
      )
    where operation_type = 'refund_wallet_spend'
      and idempotency_key = p_idempotency_key;

    raise exception 'refund failed after debit selection. remaining amount %',
      v_remaining_to_refund;
  end if;

  update wallet_refund_groups
  set
    status = 'completed',
    completed_at = now(),
    refunded_amount_minor = p_amount_minor
  where id = v_refund_group_id;

  perform wallet_complete_idempotent_operation(
    'refund_wallet_spend',
    p_idempotency_key,
    'wallet_refund_group',
    v_refund_group_id,
    jsonb_build_object(
      'refund_group_id', v_refund_group_id,
      'original_spend_group_id', p_original_spend_group_id,
      'refunded_amount_minor', p_amount_minor,
      'currency_code', v_spend_group.currency_code
    )
  );

  return v_refund_group_id;
end;
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

  perform wallet_assert_not_fraud_locked(
    v_lot.wallet_id,
    'fraud_clawback'
  );

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

  perform wallet_assert_not_fraud_locked(
    v_lot.wallet_id,
    'expire_lot'
  );

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

create or replace view wallet_fraud_lock_details as
select
  w.id as wallet_id,
  w.user_id,
  w.fraud_lock_status,
  w.fraud_locked_at,
  w.fraud_unlocked_at,
  w.fraud_lock_reason,
  w.fraud_lock_metadata,

  count(e.id) as event_count,

  max(e.created_at) as last_event_at,

  jsonb_agg(
    jsonb_build_object(
      'event_id', e.id,
      'previous_status', e.previous_status,
      'new_status', e.new_status,
      'reason', e.reason,
      'actor_type', e.actor_type,
      'actor_id', e.actor_id,
      'trust_score', e.trust_score,
      'risk_score', e.risk_score,
      'created_at', e.created_at,
      'metadata', e.metadata
    )
    order by e.created_at desc
  ) filter (where e.id is not null) as events

from wallets w
left join wallet_fraud_lock_events e
  on e.wallet_id = w.id
group by w.id;

create table if not exists wallet_risk_action_queue (
  id uuid primary key default gen_random_uuid(),

  wallet_id uuid not null references wallets(id),
  user_id uuid not null,

  recommended_action text not null,
  priority text not null default 'normal',

  reason text not null,
  risk_score numeric(6, 4),
  trust_score numeric(6, 4),

  status text not null default 'open',

  assigned_admin_id uuid,
  resolved_by_admin_id uuid,

  created_at timestamptz not null default now(),
  assigned_at timestamptz,
  resolved_at timestamptz,

  resolution text,
  metadata jsonb not null default '{}'::jsonb,

  constraint wallet_risk_action_queue_action_check
  check (
    recommended_action in (
      'watch',
      'soft_lock',
      'hard_lock',
      'permanent_ban',
      'manual_review',
      'clear'
    )
  ),

  constraint wallet_risk_action_queue_priority_check
  check (
    priority in (
      'low',
      'normal',
      'high',
      'critical'
    )
  ),

  constraint wallet_risk_action_queue_status_check
  check (
    status in (
      'open',
      'assigned',
      'resolved',
      'dismissed'
    )
  )
);

create index if not exists wallet_risk_action_queue_status_idx
on wallet_risk_action_queue (status, priority, created_at desc);

create index if not exists wallet_risk_action_queue_wallet_idx
on wallet_risk_action_queue (wallet_id, created_at desc);

create or replace function enqueue_wallet_risk_action(
  p_wallet_id uuid,
  p_recommended_action text,
  p_reason text,
  p_priority text default 'normal',
  p_risk_score numeric default null,
  p_trust_score numeric default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_wallet wallets%rowtype;
  v_queue_id uuid;
begin
  if p_recommended_action not in (
    'watch',
    'soft_lock',
    'hard_lock',
    'permanent_ban',
    'manual_review',
    'clear'
  ) then
    raise exception 'invalid recommended action: %', p_recommended_action;
  end if;

  if p_priority not in ('low', 'normal', 'high', 'critical') then
    raise exception 'invalid priority: %', p_priority;
  end if;

  select *
  into v_wallet
  from wallets
  where id = p_wallet_id;

  if v_wallet.id is null then
    raise exception 'wallet not found: %', p_wallet_id;
  end if;

  insert into wallet_risk_action_queue (
    wallet_id,
    user_id,
    recommended_action,
    priority,
    reason,
    risk_score,
    trust_score,
    metadata
  )
  values (
    v_wallet.id,
    v_wallet.user_id,
    p_recommended_action,
    p_priority,
    p_reason,
    p_risk_score,
    p_trust_score,
    p_metadata
  )
  returning id into v_queue_id;

  return v_queue_id;
end;
$$;

create or replace function apply_wallet_risk_policy(
  p_wallet_id uuid,
  p_risk_score numeric,
  p_trust_score numeric default null,
  p_reason text default 'risk_policy_triggered',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_event_or_queue_id uuid;
begin
  if p_risk_score is null then
    raise exception 'risk score is required';
  end if;

  if p_risk_score < 0 or p_risk_score > 1 then
    raise exception 'risk score must be between 0 and 1';
  end if;

  if p_risk_score >= 0.95 then
    return set_wallet_fraud_lock_status(
      p_wallet_id,
      'hard_locked',
      p_reason,
      'fraud_engine',
      null,
      p_trust_score,
      p_risk_score,
      p_metadata || jsonb_build_object(
        'policy',
        'risk_score_gte_0_95'
      )
    );
  end if;

  if p_risk_score >= 0.85 then
    return set_wallet_fraud_lock_status(
      p_wallet_id,
      'soft_locked',
      p_reason,
      'fraud_engine',
      null,
      p_trust_score,
      p_risk_score,
      p_metadata || jsonb_build_object(
        'policy',
        'risk_score_gte_0_85'
      )
    );
  end if;

  if p_risk_score >= 0.70 then
    return enqueue_wallet_risk_action(
      p_wallet_id,
      'manual_review',
      p_reason,
      'high',
      p_risk_score,
      p_trust_score,
      p_metadata || jsonb_build_object(
        'policy',
        'risk_score_gte_0_70'
      )
    );
  end if;

  if p_risk_score >= 0.55 then
    return set_wallet_fraud_lock_status(
      p_wallet_id,
      'watch',
      p_reason,
      'fraud_engine',
      null,
      p_trust_score,
      p_risk_score,
      p_metadata || jsonb_build_object(
        'policy',
        'risk_score_gte_0_55'
      )
    );
  end if;

  return enqueue_wallet_risk_action(
    p_wallet_id,
    'clear',
    p_reason,
    'low',
    p_risk_score,
    p_trust_score,
    p_metadata || jsonb_build_object(
      'policy',
      'risk_score_lt_0_55'
    )
  );
end;
$$;
