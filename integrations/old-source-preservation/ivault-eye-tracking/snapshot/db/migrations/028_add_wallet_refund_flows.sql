-- 28/post-MVP schema — wallet refund groups and reversal flows.

create table if not exists wallet_refund_groups (
  id uuid primary key default gen_random_uuid(),

  wallet_id uuid not null references wallets(id),
  user_id uuid not null,

  original_spend_group_id uuid references wallet_spend_groups(id),

  refund_type text not null,
  refund_id uuid,

  currency_code text not null default 'USD',

  requested_amount_minor bigint not null,
  refunded_amount_minor bigint not null default 0,

  status text not null default 'processing',

  idempotency_key text not null,
  operation_type text not null default 'refund_wallet_spend',

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,

  constraint wallet_refund_groups_amount_check
  check (
    requested_amount_minor > 0
    and refunded_amount_minor >= 0
    and refunded_amount_minor <= requested_amount_minor
  ),

  constraint wallet_refund_groups_status_check
  check (
    status in (
      'processing',
      'completed',
      'failed'
    )
  )
);

create unique index if not exists wallet_refund_groups_idempotency_unique
on wallet_refund_groups (operation_type, idempotency_key);

create index if not exists wallet_refund_groups_wallet_idx
on wallet_refund_groups (wallet_id, created_at desc);

create index if not exists wallet_refund_groups_user_idx
on wallet_refund_groups (user_id, created_at desc);

create index if not exists wallet_refund_groups_original_spend_idx
on wallet_refund_groups (original_spend_group_id);

alter table wallet_ledger_entries
add column if not exists refund_group_id uuid references wallet_refund_groups(id);

alter table wallet_ledger_entries
add column if not exists original_ledger_entry_id uuid references wallet_ledger_entries(id);

alter table wallet_value_lots
add column if not exists refunded_from_value_lot_id uuid references wallet_value_lots(id);

alter table wallet_value_lots
add column if not exists refund_group_id uuid references wallet_refund_groups(id);

create index if not exists wallet_ledger_entries_refund_group_idx
on wallet_ledger_entries (refund_group_id);

create index if not exists wallet_ledger_entries_original_entry_idx
on wallet_ledger_entries (original_ledger_entry_id);

create index if not exists wallet_value_lots_refund_group_idx
on wallet_value_lots (refund_group_id);

create index if not exists wallet_value_lots_refunded_from_idx
on wallet_value_lots (refunded_from_value_lot_id);

create or replace function wallet_spend_group_refundable_balance(
  p_spend_group_id uuid
)
returns bigint
language sql
stable
as $$
  with original_debits as (
    select coalesce(sum(amount_minor), 0)::bigint as debited_minor
    from wallet_ledger_entries
    where spend_group_id = p_spend_group_id
      and direction = -1
      and entry_type in ('debit', 'withdrawal')
      and status = 'posted'
  ),

  existing_refunds as (
    select coalesce(sum(amount_minor), 0)::bigint as refunded_minor
    from wallet_ledger_entries
    where original_ledger_entry_id in (
      select id
      from wallet_ledger_entries
      where spend_group_id = p_spend_group_id
        and direction = -1
        and status = 'posted'
    )
      and direction = 1
      and entry_type = 'refund'
      and status = 'posted'
  )

  select greatest(
    (select debited_minor from original_debits)
    - (select refunded_minor from existing_refunds),
    0
  )::bigint;
$$;

create or replace function wallet_ledger_entry_refundable_balance(
  p_ledger_entry_id uuid
)
returns bigint
language sql
stable
as $$
  with original as (
    select amount_minor
    from wallet_ledger_entries
    where id = p_ledger_entry_id
      and direction = -1
      and status = 'posted'
  ),

  refunded as (
    select coalesce(sum(amount_minor), 0)::bigint as refunded_minor
    from wallet_ledger_entries
    where original_ledger_entry_id = p_ledger_entry_id
      and direction = 1
      and entry_type = 'refund'
      and status = 'posted'
  )

  select greatest(
    coalesce((select amount_minor from original), 0)
    - coalesce((select refunded_minor from refunded), 0),
    0
  )::bigint;
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

create or replace function refund_purchase(
  p_original_spend_group_id uuid,
  p_amount_minor bigint,
  p_refund_id uuid,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  if p_refund_id is null then
    raise exception 'refund id is required';
  end if;

  if p_idempotency_key is null then
    p_idempotency_key := 'purchase_refund:' || p_refund_id::text;
  end if;

  return refund_wallet_spend(
    p_original_spend_group_id,
    p_amount_minor,
    'purchase_refund',
    p_refund_id,
    p_idempotency_key,
    p_metadata
  );
end;
$$;

create or replace function refund_tip(
  p_original_spend_group_id uuid,
  p_amount_minor bigint,
  p_refund_id uuid,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  if p_refund_id is null then
    raise exception 'refund id is required';
  end if;

  if p_idempotency_key is null then
    p_idempotency_key := 'tip_refund:' || p_refund_id::text;
  end if;

  return refund_wallet_spend(
    p_original_spend_group_id,
    p_amount_minor,
    'tip_refund',
    p_refund_id,
    p_idempotency_key,
    p_metadata
  );
end;
$$;

create or replace function admin_refund_wallet_spend(
  p_original_spend_group_id uuid,
  p_amount_minor bigint,
  p_admin_user_id uuid,
  p_reason text,
  p_idempotency_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_refund_id uuid := gen_random_uuid();
begin
  if p_admin_user_id is null then
    raise exception 'admin user id is required';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'admin refund reason is required';
  end if;

  if p_idempotency_key is null then
    raise exception 'admin refund idempotency key is required';
  end if;

  return refund_wallet_spend(
    p_original_spend_group_id,
    p_amount_minor,
    'admin_refund',
    v_refund_id,
    p_idempotency_key,
    p_metadata || jsonb_build_object(
      'admin_user_id',
      p_admin_user_id,
      'reason',
      p_reason
    )
  );
end;
$$;

create or replace view wallet_refund_group_details as
select
  rg.id as refund_group_id,
  rg.wallet_id,
  rg.user_id,
  rg.original_spend_group_id,
  rg.refund_type,
  rg.refund_id,
  rg.currency_code,
  rg.requested_amount_minor,
  rg.refunded_amount_minor,
  rg.status,
  rg.idempotency_key,
  rg.created_at,
  rg.completed_at,

  sg.spend_type as original_spend_type,
  sg.spend_id as original_spend_id,
  sg.requested_amount_minor as original_spend_requested_minor,
  sg.spent_amount_minor as original_spend_spent_minor,

  count(le.id) as refund_ledger_entry_count,
  coalesce(sum(le.amount_minor), 0)::bigint as refund_ledger_total_minor,

  jsonb_agg(
    jsonb_build_object(
      'refund_ledger_entry_id', le.id,
      'refund_value_lot_id', le.value_lot_id,
      'original_ledger_entry_id', le.original_ledger_entry_id,
      'amount_minor', le.amount_minor,
      'campaign_id', le.campaign_id,
      'created_at', le.created_at
    )
    order by le.created_at asc
  ) filter (where le.id is not null) as refund_entries

from wallet_refund_groups rg
left join wallet_spend_groups sg
  on sg.id = rg.original_spend_group_id
left join wallet_ledger_entries le
  on le.refund_group_id = rg.id
group by rg.id, sg.id;

create or replace view wallet_spend_refundability as
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

  coalesce(sum(le.amount_minor) filter (
    where le.direction = -1
      and le.status = 'posted'
      and le.entry_type in ('debit', 'withdrawal')
  ), 0)::bigint as original_debited_minor,

  coalesce(sum(ref.amount_minor) filter (
    where ref.direction = 1
      and ref.status = 'posted'
      and ref.entry_type = 'refund'
  ), 0)::bigint as refunded_minor,

  greatest(
    coalesce(sum(le.amount_minor) filter (
      where le.direction = -1
        and le.status = 'posted'
        and le.entry_type in ('debit', 'withdrawal')
    ), 0)
    -
    coalesce(sum(ref.amount_minor) filter (
      where ref.direction = 1
        and ref.status = 'posted'
        and ref.entry_type = 'refund'
    ), 0),
    0
  )::bigint as refundable_minor,

  sg.created_at,
  sg.completed_at

from wallet_spend_groups sg
left join wallet_ledger_entries le
  on le.spend_group_id = sg.id
left join wallet_ledger_entries ref
  on ref.original_ledger_entry_id = le.id
group by sg.id;
