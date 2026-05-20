-- 26/post-MVP schema — wallet idempotency and double-spend protection.

create extension if not exists pgcrypto;

create table if not exists wallet_idempotency_keys (
  id uuid primary key default gen_random_uuid(),

  idempotency_key text not null,
  operation_type text not null,

  user_id uuid,
  wallet_id uuid,

  request_hash text not null,

  result_type text,
  result_id uuid,
  result_payload jsonb not null default '{}'::jsonb,

  status text not null default 'processing',

  created_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  constraint wallet_idempotency_keys_status_check
  check (
    status in (
      'processing',
      'completed',
      'failed'
    )
  )
);

create unique index if not exists wallet_idempotency_keys_unique
on wallet_idempotency_keys (operation_type, idempotency_key);

alter table wallet_ledger_entries
add column if not exists operation_type text;

create index if not exists wallet_ledger_entries_idempotency_idx
on wallet_ledger_entries (operation_type, idempotency_key);

create unique index if not exists wallet_value_lots_unique_reward_source
on wallet_value_lots (source_type, source_id)
where source_type = 'campaign_reward';

create unique index if not exists wallet_ledger_entries_unique_reward_credit
on wallet_ledger_entries (source_type, source_id, entry_type)
where source_type = 'campaign_reward'
and entry_type = 'credit';

create or replace function wallet_request_hash(
  p_payload jsonb
)
returns text
language sql
immutable
as $$
  select encode(digest(coalesce(p_payload, '{}'::jsonb)::text, 'sha256'), 'hex');
$$;

create or replace function wallet_begin_idempotent_operation(
  p_operation_type text,
  p_idempotency_key text,
  p_user_id uuid,
  p_wallet_id uuid,
  p_request_payload jsonb,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  should_execute boolean,
  existing_status text,
  existing_result_type text,
  existing_result_id uuid,
  existing_result_payload jsonb
)
language plpgsql
as $$
declare
  v_request_hash text;
  v_existing wallet_idempotency_keys%rowtype;
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'idempotency key is required and must be at least 8 characters';
  end if;

  if p_operation_type is null or length(trim(p_operation_type)) = 0 then
    raise exception 'operation type is required';
  end if;

  v_request_hash := wallet_request_hash(p_request_payload);

  insert into wallet_idempotency_keys (
    operation_type,
    idempotency_key,
    user_id,
    wallet_id,
    request_hash,
    status,
    metadata
  )
  values (
    p_operation_type,
    p_idempotency_key,
    p_user_id,
    p_wallet_id,
    v_request_hash,
    'processing',
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (operation_type, idempotency_key)
  do nothing;

  select *
  into v_existing
  from wallet_idempotency_keys
  where operation_type = p_operation_type
    and idempotency_key = p_idempotency_key
  for update;

  if v_existing.request_hash <> v_request_hash then
    raise exception
      'idempotency key reused with different request payload. operation %, key %',
      p_operation_type,
      p_idempotency_key;
  end if;

  if v_existing.status = 'completed' then
    return query select
      false,
      v_existing.status,
      v_existing.result_type,
      v_existing.result_id,
      v_existing.result_payload;
    return;
  end if;

  if v_existing.status = 'processing'
     and v_existing.created_at < now() - interval '5 minutes' then
    update wallet_idempotency_keys
    set
      failed_at = now(),
      status = 'failed',
      metadata = metadata || jsonb_build_object(
        'auto_failed_reason',
        'processing_timeout'
      )
    where id = v_existing.id;

    raise exception 'stale idempotency operation timed out. operation %, key %',
      p_operation_type,
      p_idempotency_key;
  end if;

  if v_existing.status = 'failed' then
    raise exception 'idempotency operation previously failed. operation %, key %',
      p_operation_type,
      p_idempotency_key;
  end if;

  return query select
    true,
    v_existing.status,
    null::text,
    null::uuid,
    '{}'::jsonb;
end;
$$;

create or replace function wallet_complete_idempotent_operation(
  p_operation_type text,
  p_idempotency_key text,
  p_result_type text,
  p_result_id uuid,
  p_result_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
as $$
begin
  update wallet_idempotency_keys
  set
    status = 'completed',
    completed_at = now(),
    result_type = p_result_type,
    result_id = p_result_id,
    result_payload = coalesce(p_result_payload, '{}'::jsonb)
  where operation_type = p_operation_type
    and idempotency_key = p_idempotency_key;

  if not found then
    raise exception 'idempotency key not found on complete. operation %, key %',
      p_operation_type,
      p_idempotency_key;
  end if;
end;
$$;

alter table wallet_value_lots
drop constraint if exists wallet_value_lots_remaining_non_negative;

alter table wallet_value_lots
add constraint wallet_value_lots_remaining_non_negative
check (remaining_amount_minor >= 0);

alter table wallet_value_lots
drop constraint if exists wallet_value_lots_original_positive;

alter table wallet_value_lots
add constraint wallet_value_lots_original_positive
check (original_amount_minor > 0);

alter table wallet_value_lots
drop constraint if exists wallet_value_lots_remaining_not_over_original;

alter table wallet_value_lots
add constraint wallet_value_lots_remaining_not_over_original
check (remaining_amount_minor <= original_amount_minor);

create or replace function credit_pending_reward(
  p_user_id uuid,
  p_wallet_id uuid,
  p_campaign_id uuid,
  p_reward_event_id uuid,
  p_currency_code text,
  p_amount_minor bigint,
  p_hold_until timestamptz default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_lot_id uuid;
  v_ledger_entry_id uuid;
  v_should_execute boolean;
  v_existing_result_id uuid;
  v_payload jsonb;
begin
  if p_amount_minor <= 0 then
    raise exception 'reward amount must be positive';
  end if;

  if p_idempotency_key is null then
    p_idempotency_key := 'reward:' || p_reward_event_id::text;
  end if;

  v_payload := jsonb_build_object(
    'user_id', p_user_id,
    'wallet_id', p_wallet_id,
    'campaign_id', p_campaign_id,
    'reward_event_id', p_reward_event_id,
    'currency_code', coalesce(p_currency_code, 'USD'),
    'amount_minor', p_amount_minor,
    'hold_until', p_hold_until
  );

  select should_execute, existing_result_id
  into v_should_execute, v_existing_result_id
  from wallet_begin_idempotent_operation(
    'credit_pending_reward',
    p_idempotency_key,
    p_user_id,
    p_wallet_id,
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
    reward_event_id,
    currency_code,
    original_amount_minor,
    remaining_amount_minor,
    status,
    hold_until,
    cashout_eligible,
    metadata
  )
  values (
    p_wallet_id,
    p_user_id,
    'campaign_reward',
    p_reward_event_id,
    p_campaign_id,
    p_reward_event_id,
    coalesce(p_currency_code, 'USD'),
    p_amount_minor,
    p_amount_minor,
    'pending',
    p_hold_until,
    true,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_lot_id;

  insert into wallet_ledger_entries (
    wallet_id,
    user_id,
    value_lot_id,
    source_type,
    source_id,
    campaign_id,
    reward_event_id,
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
    v_lot_id,
    'campaign_reward',
    p_reward_event_id,
    p_campaign_id,
    p_reward_event_id,
    'credit',
    1,
    coalesce(p_currency_code, 'USD'),
    p_amount_minor,
    0,
    p_amount_minor,
    0,
    'posted',
    p_idempotency_key,
    'credit_pending_reward',
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_ledger_entry_id;

  perform wallet_complete_idempotent_operation(
    'credit_pending_reward',
    p_idempotency_key,
    'wallet_value_lot',
    v_lot_id,
    jsonb_build_object(
      'value_lot_id', v_lot_id,
      'ledger_entry_id', v_ledger_entry_id
    )
  );

  return v_lot_id;
end;
$$;

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

create or replace function spend_wallet_value_lot(
  p_value_lot_id uuid,
  p_amount_minor bigint,
  p_spend_type text,
  p_spend_id uuid default null,
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
  if p_amount_minor <= 0 then
    raise exception 'spend amount must be positive';
  end if;

  if p_idempotency_key is null then
    p_idempotency_key := 'spend:' || coalesce(p_spend_id::text, gen_random_uuid()::text);
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
    'amount_minor', p_amount_minor,
    'spend_type', p_spend_type,
    'spend_id', p_spend_id
  );

  select should_execute, existing_result_id
  into v_should_execute, v_existing_result_id
  from wallet_begin_idempotent_operation(
    'spend_wallet_value_lot',
    p_idempotency_key,
    v_lot.user_id,
    v_lot.wallet_id,
    v_payload,
    p_metadata
  );

  if v_should_execute is false then
    return v_existing_result_id;
  end if;

  if v_lot.status <> 'available' then
    raise exception 'only available lots can be spent. lot %, status %',
      p_value_lot_id,
      v_lot.status;
  end if;

  if v_lot.remaining_amount_minor < p_amount_minor then
    raise exception 'insufficient lot balance. lot %, remaining %, requested %',
      p_value_lot_id,
      v_lot.remaining_amount_minor,
      p_amount_minor;
  end if;

  update wallet_value_lots
  set
    remaining_amount_minor = remaining_amount_minor - p_amount_minor,
    status =
      case
        when remaining_amount_minor - p_amount_minor = 0
        then 'spent'
        else status
      end,
    spent_at =
      case
        when remaining_amount_minor - p_amount_minor = 0
        then now()
        else spent_at
      end,
    consumed_at =
      case
        when remaining_amount_minor - p_amount_minor = 0
        then now()
        else consumed_at
      end,
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
    p_spend_type,
    p_spend_id,
    v_lot.campaign_id,
    v_lot.reward_event_id,
    'debit',
    -1,
    v_lot.currency_code,
    p_amount_minor,
    -p_amount_minor,
    0,
    0,
    'posted',
    p_idempotency_key,
    'spend_wallet_value_lot',
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_ledger_entry_id;

  perform wallet_complete_idempotent_operation(
    'spend_wallet_value_lot',
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

create or replace function withdraw_wallet_value_lot(
  p_value_lot_id uuid,
  p_amount_minor bigint,
  p_withdrawal_id uuid,
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
  if p_amount_minor <= 0 then
    raise exception 'withdrawal amount must be positive';
  end if;

  if p_withdrawal_id is null then
    raise exception 'withdrawal id is required for idempotent withdrawal';
  end if;

  if p_idempotency_key is null then
    p_idempotency_key := 'withdrawal:' || p_withdrawal_id::text;
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
    'amount_minor', p_amount_minor,
    'withdrawal_id', p_withdrawal_id
  );

  select should_execute, existing_result_id
  into v_should_execute, v_existing_result_id
  from wallet_begin_idempotent_operation(
    'withdraw_wallet_value_lot',
    p_idempotency_key,
    v_lot.user_id,
    v_lot.wallet_id,
    v_payload,
    p_metadata
  );

  if v_should_execute is false then
    return v_existing_result_id;
  end if;

  if v_lot.status <> 'available' then
    raise exception 'only available lots can be withdrawn. lot %, status %',
      p_value_lot_id,
      v_lot.status;
  end if;

  if v_lot.cashout_eligible is not true then
    raise exception 'value lot is not cashout eligible: %', p_value_lot_id;
  end if;

  if v_lot.currency_code <> 'USD' then
    raise exception 'only USD can be withdrawn in this primitive function. got %',
      v_lot.currency_code;
  end if;

  if v_lot.remaining_amount_minor < p_amount_minor then
    raise exception 'insufficient lot balance. lot %, remaining %, requested %',
      p_value_lot_id,
      v_lot.remaining_amount_minor,
      p_amount_minor;
  end if;

  update wallet_value_lots
  set
    remaining_amount_minor = remaining_amount_minor - p_amount_minor,
    status =
      case
        when remaining_amount_minor - p_amount_minor = 0
        then 'withdrawn'
        else status
      end,
    withdrawn_at =
      case
        when remaining_amount_minor - p_amount_minor = 0
        then now()
        else withdrawn_at
      end,
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
    v_lot.wallet_id,
    v_lot.user_id,
    v_lot.id,
    'withdrawal',
    p_withdrawal_id,
    v_lot.campaign_id,
    v_lot.reward_event_id,
    p_withdrawal_id,
    'withdrawal',
    -1,
    v_lot.currency_code,
    p_amount_minor,
    -p_amount_minor,
    0,
    0,
    'posted',
    p_idempotency_key,
    'withdraw_wallet_value_lot',
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_ledger_entry_id;

  perform wallet_complete_idempotent_operation(
    'withdraw_wallet_value_lot',
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
