-- 25/post-MVP schema — wallet transaction service functions.
-- Controlled money movement entry points for wallet lifecycle operations.

-- Align lot status enum with the wallet lifecycle states.
do $$
begin
  alter type wallet_lot_status add value if not exists 'spent';
  alter type wallet_lot_status add value if not exists 'withdrawn';
  alter type wallet_lot_status add value if not exists 'reversed';
exception
  when duplicate_object then null;
end
$$;

-- Align ledger entry enum with lock/unlock operations.
do $$
begin
  alter type wallet_ledger_entry_type add value if not exists 'lock';
  alter type wallet_ledger_entry_type add value if not exists 'unlock';
exception
  when duplicate_object then null;
end
$$;

alter table wallet_value_lots
  add column if not exists hold_until timestamptz,
  add column if not exists released_at timestamptz,
  add column if not exists spent_at timestamptz,
  add column if not exists withdrawn_at timestamptz,
  add column if not exists reversed_at timestamptz,
  add column if not exists lock_reason text,
  add column if not exists reversal_reason text,
  add column if not exists cashout_eligible boolean not null default false;

-- Backfill compatibility from older schema flag.
update wallet_value_lots
set cashout_eligible = true
where is_withdrawable is true
  and cashout_eligible is false;

-- Replace the earlier experimental signature so callers use this canonical one.
drop function if exists credit_pending_reward(
  uuid,
  uuid,
  bigint,
  currency_code,
  timestamptz,
  numeric,
  numeric,
  uuid,
  text
);

create or replace function credit_pending_reward(
  p_user_id uuid,
  p_wallet_id uuid,
  p_campaign_id uuid,
  p_reward_event_id uuid,
  p_currency_code text,
  p_amount_minor bigint,
  p_hold_until timestamptz default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_lot_id uuid;
begin
  if p_amount_minor <= 0 then
    raise exception 'reward amount must be positive';
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
    'credit_pending_reward:' || v_lot_id::text || ':' || gen_random_uuid()::text,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_lot_id;
end;
$$;

create or replace function release_pending_reward(
  p_value_lot_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_lot wallet_value_lots%rowtype;
  v_ledger_entry_id uuid;
begin
  select *
  into v_lot
  from wallet_value_lots
  where id = p_value_lot_id
  for update;

  if v_lot.id is null then
    raise exception 'value lot not found: %', p_value_lot_id;
  end if;

  if v_lot.status <> 'pending' then
    raise exception 'only pending lots can be released. lot %, status %', p_value_lot_id, v_lot.status;
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
    'release_pending_reward:' || v_lot.id::text || ':' || gen_random_uuid()::text,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_ledger_entry_id;

  return v_ledger_entry_id;
end;
$$;

create or replace function lock_wallet_value(
  p_value_lot_id uuid,
  p_reason text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_lot wallet_value_lots%rowtype;
  v_amount bigint;
  v_ledger_entry_id uuid;
begin
  select *
  into v_lot
  from wallet_value_lots
  where id = p_value_lot_id
  for update;

  if v_lot.id is null then
    raise exception 'value lot not found: %', p_value_lot_id;
  end if;

  if v_lot.status <> 'available' then
    raise exception 'only available lots can be locked. lot %, status %', p_value_lot_id, v_lot.status;
  end if;

  v_amount := v_lot.remaining_amount_minor;

  if v_amount <= 0 then
    raise exception 'value lot has no remaining value: %', p_value_lot_id;
  end if;

  update wallet_value_lots
  set
    status = 'locked',
    lock_reason = p_reason,
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
    'lock',
    -1,
    v_lot.currency_code,
    v_amount,
    -v_amount,
    0,
    v_amount,
    'posted',
    'lock_wallet_value:' || v_lot.id::text || ':' || gen_random_uuid()::text,
    jsonb_build_object('reason', p_reason) || coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_ledger_entry_id;

  return v_ledger_entry_id;
end;
$$;

create or replace function unlock_wallet_value(
  p_value_lot_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_lot wallet_value_lots%rowtype;
  v_amount bigint;
  v_ledger_entry_id uuid;
begin
  select *
  into v_lot
  from wallet_value_lots
  where id = p_value_lot_id
  for update;

  if v_lot.id is null then
    raise exception 'value lot not found: %', p_value_lot_id;
  end if;

  if v_lot.status <> 'locked' then
    raise exception 'only locked lots can be unlocked. lot %, status %', p_value_lot_id, v_lot.status;
  end if;

  v_amount := v_lot.remaining_amount_minor;

  if v_amount <= 0 then
    raise exception 'value lot has no remaining value: %', p_value_lot_id;
  end if;

  update wallet_value_lots
  set
    status = 'available',
    lock_reason = null,
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
    'unlock',
    1,
    v_lot.currency_code,
    v_amount,
    v_amount,
    0,
    -v_amount,
    'posted',
    'unlock_wallet_value:' || v_lot.id::text || ':' || gen_random_uuid()::text,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_ledger_entry_id;

  return v_ledger_entry_id;
end;
$$;

create or replace function reverse_wallet_reward(
  p_value_lot_id uuid,
  p_reason text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_lot wallet_value_lots%rowtype;
  v_amount bigint;
  v_available_impact bigint := 0;
  v_pending_impact bigint := 0;
  v_locked_impact bigint := 0;
  v_ledger_entry_id uuid;
begin
  select *
  into v_lot
  from wallet_value_lots
  where id = p_value_lot_id
  for update;

  if v_lot.id is null then
    raise exception 'value lot not found: %', p_value_lot_id;
  end if;

  if v_lot.status not in ('pending', 'available', 'locked') then
    raise exception 'lot cannot be reversed from status %. lot %', v_lot.status, p_value_lot_id;
  end if;

  v_amount := v_lot.remaining_amount_minor;

  if v_amount <= 0 then
    raise exception 'value lot has no remaining value: %', p_value_lot_id;
  end if;

  if v_lot.status = 'pending' then
    v_pending_impact := -v_amount;
  elsif v_lot.status = 'available' then
    v_available_impact := -v_amount;
  elsif v_lot.status = 'locked' then
    v_locked_impact := -v_amount;
  end if;

  update wallet_value_lots
  set
    status = 'reversed',
    remaining_amount_minor = 0,
    reversed_at = now(),
    reversal_reason = p_reason,
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
    'reversal',
    -1,
    v_lot.currency_code,
    v_amount,
    v_available_impact,
    v_pending_impact,
    v_locked_impact,
    'posted',
    'reverse_wallet_reward:' || v_lot.id::text || ':' || gen_random_uuid()::text,
    jsonb_build_object('reason', p_reason) || coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_ledger_entry_id;

  return v_ledger_entry_id;
end;
$$;

create or replace function spend_wallet_value_lot(
  p_value_lot_id uuid,
  p_amount_minor bigint,
  p_spend_type text,
  p_spend_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_lot wallet_value_lots%rowtype;
  v_ledger_entry_id uuid;
begin
  if p_amount_minor <= 0 then
    raise exception 'spend amount must be positive';
  end if;

  select *
  into v_lot
  from wallet_value_lots
  where id = p_value_lot_id
  for update;

  if v_lot.id is null then
    raise exception 'value lot not found: %', p_value_lot_id;
  end if;

  if v_lot.status <> 'available' then
    raise exception 'only available lots can be spent. lot %, status %', p_value_lot_id, v_lot.status;
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
    'spend_wallet_value_lot:' || v_lot.id::text || ':' || gen_random_uuid()::text,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_ledger_entry_id;

  return v_ledger_entry_id;
end;
$$;

create or replace function withdraw_wallet_value_lot(
  p_value_lot_id uuid,
  p_amount_minor bigint,
  p_withdrawal_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_lot wallet_value_lots%rowtype;
  v_ledger_entry_id uuid;
begin
  if p_amount_minor <= 0 then
    raise exception 'withdrawal amount must be positive';
  end if;

  select *
  into v_lot
  from wallet_value_lots
  where id = p_value_lot_id
  for update;

  if v_lot.id is null then
    raise exception 'value lot not found: %', p_value_lot_id;
  end if;

  if v_lot.status <> 'available' then
    raise exception 'only available lots can be withdrawn. lot %, status %', p_value_lot_id, v_lot.status;
  end if;

  if v_lot.cashout_eligible is not true then
    raise exception 'value lot is not cashout eligible: %', p_value_lot_id;
  end if;

  if v_lot.currency_code <> 'USD' then
    raise exception 'only USD can be withdrawn in this primitive function. got %', v_lot.currency_code;
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
    'withdraw_wallet_value_lot:' || v_lot.id::text || ':' || gen_random_uuid()::text,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_ledger_entry_id;

  return v_ledger_entry_id;
end;
$$;
