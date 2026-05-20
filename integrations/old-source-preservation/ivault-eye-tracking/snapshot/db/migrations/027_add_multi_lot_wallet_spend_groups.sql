-- 27/post-MVP schema — multi-lot debit selection with spend groups.

create table if not exists wallet_spend_groups (
  id uuid primary key default gen_random_uuid(),

  wallet_id uuid not null references wallets(id),
  user_id uuid not null references users(id),

  spend_type text not null,
  spend_id uuid,

  currency_code text not null default 'USD',

  requested_amount_minor bigint not null,
  spent_amount_minor bigint not null default 0,

  status text not null default 'processing',

  idempotency_key text not null,
  operation_type text not null default 'spend_wallet_balance',

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,

  constraint wallet_spend_groups_amount_check
  check (
    requested_amount_minor > 0
    and spent_amount_minor >= 0
    and spent_amount_minor <= requested_amount_minor
  ),

  constraint wallet_spend_groups_status_check
  check (
    status in (
      'processing',
      'completed',
      'failed'
    )
  )
);

create unique index if not exists wallet_spend_groups_idempotency_unique
on wallet_spend_groups (operation_type, idempotency_key);

create index if not exists wallet_spend_groups_wallet_idx
on wallet_spend_groups (wallet_id, created_at desc);

create index if not exists wallet_spend_groups_user_idx
on wallet_spend_groups (user_id, created_at desc);

alter table wallet_ledger_entries
add column if not exists spend_group_id uuid references wallet_spend_groups(id);

create index if not exists wallet_ledger_entries_spend_group_idx
on wallet_ledger_entries (spend_group_id);

create index if not exists wallet_value_lots_available_selection_idx
on wallet_value_lots (
  wallet_id,
  currency_code,
  status,
  cashout_eligible,
  expires_at,
  released_at,
  created_at
)
where status = 'available'
and remaining_amount_minor > 0;

create or replace function wallet_available_balance(
  p_wallet_id uuid,
  p_currency_code text default 'USD',
  p_cashout_only boolean default false
)
returns bigint
language sql
stable
as $$
  select coalesce(sum(remaining_amount_minor), 0)::bigint
  from wallet_value_lots
  where wallet_id = p_wallet_id
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
    );
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

  if p_idempotency_key is null then
    p_idempotency_key := 'withdrawal:' || p_withdrawal_id::text;
  end if;

  return spend_wallet_balance(
    p_wallet_id,
    p_user_id,
    p_amount_minor,
    'withdrawal',
    p_withdrawal_id,
    'USD',
    true,
    p_idempotency_key,
    p_metadata
  );
end;
$$;

create or replace function purchase_with_wallet_balance(
  p_wallet_id uuid,
  p_user_id uuid,
  p_amount_minor bigint,
  p_purchase_id uuid,
  p_currency_code text default 'USD',
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  if p_purchase_id is null then
    raise exception 'purchase id is required';
  end if;

  if p_idempotency_key is null then
    p_idempotency_key := 'purchase:' || p_purchase_id::text;
  end if;

  return spend_wallet_balance(
    p_wallet_id,
    p_user_id,
    p_amount_minor,
    'purchase',
    p_purchase_id,
    coalesce(p_currency_code, 'USD'),
    false,
    p_idempotency_key,
    p_metadata
  );
end;
$$;

create or replace function tip_with_wallet_balance(
  p_wallet_id uuid,
  p_user_id uuid,
  p_amount_minor bigint,
  p_tip_id uuid,
  p_currency_code text default 'USD',
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  if p_tip_id is null then
    raise exception 'tip id is required';
  end if;

  if p_idempotency_key is null then
    p_idempotency_key := 'tip:' || p_tip_id::text;
  end if;

  return spend_wallet_balance(
    p_wallet_id,
    p_user_id,
    p_amount_minor,
    'tip',
    p_tip_id,
    coalesce(p_currency_code, 'USD'),
    false,
    p_idempotency_key,
    p_metadata
  );
end;
$$;

create or replace view wallet_balances as
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
    where status = 'locked'
  ), 0)::bigint as locked_minor,

  coalesce(sum(remaining_amount_minor) filter (
    where status = 'available'
    and cashout_eligible is true
  ), 0)::bigint as withdrawable_minor,

  coalesce(sum(remaining_amount_minor), 0)::bigint as total_remaining_minor,

  max(updated_at) as last_lot_update_at

from wallet_value_lots
where remaining_amount_minor > 0
group by wallet_id, user_id, currency_code;

create or replace view wallet_spend_group_details as
select
  sg.id as spend_group_id,
  sg.wallet_id,
  sg.user_id,
  sg.spend_type,
  sg.spend_id,
  sg.currency_code,
  sg.requested_amount_minor,
  sg.spent_amount_minor,
  sg.status,
  sg.idempotency_key,
  sg.created_at,
  sg.completed_at,

  count(le.id) as ledger_entry_count,
  coalesce(sum(le.amount_minor), 0)::bigint as ledger_total_minor,

  jsonb_agg(
    jsonb_build_object(
      'ledger_entry_id', le.id,
      'value_lot_id', le.value_lot_id,
      'amount_minor', le.amount_minor,
      'entry_type', le.entry_type,
      'campaign_id', le.campaign_id,
      'created_at', le.created_at
    )
    order by le.created_at asc
  ) filter (where le.id is not null) as ledger_entries

from wallet_spend_groups sg
left join wallet_ledger_entries le
  on le.spend_group_id = sg.id
group by sg.id;
