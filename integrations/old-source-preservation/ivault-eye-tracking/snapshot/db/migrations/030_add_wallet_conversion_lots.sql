-- 30/post-MVP schema — wallet conversion groups, rates, and lot-based conversion flows.

do $$
begin
  alter type wallet_ledger_entry_type add value if not exists 'conversion_debit';
  alter type wallet_ledger_entry_type add value if not exists 'conversion_credit';
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter type wallet_lot_source_type add value if not exists 'conversion';
exception
  when duplicate_object then null;
end
$$;

create table if not exists wallet_conversion_groups (
  id uuid primary key default gen_random_uuid(),

  wallet_id uuid not null references wallets(id),
  user_id uuid not null,

  source_currency_code text not null,
  target_currency_code text not null,

  source_amount_minor bigint not null,
  target_amount_minor bigint not null,

  conversion_rate numeric(24, 12) not null,
  fee_amount_minor bigint not null default 0,
  spread_bps integer not null default 0,

  conversion_type text not null default 'wallet_conversion',
  conversion_id uuid,

  status text not null default 'processing',

  idempotency_key text not null,
  operation_type text not null default 'convert_wallet_balance',

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,

  constraint wallet_conversion_groups_amount_check
  check (
    source_amount_minor > 0
    and target_amount_minor >= 0
    and fee_amount_minor >= 0
  ),

  constraint wallet_conversion_groups_currency_check
  check (source_currency_code <> target_currency_code),

  constraint wallet_conversion_groups_status_check
  check (
    status in (
      'processing',
      'completed',
      'failed'
    )
  )
);

create unique index if not exists wallet_conversion_groups_idempotency_unique
on wallet_conversion_groups (operation_type, idempotency_key);

create index if not exists wallet_conversion_groups_wallet_idx
on wallet_conversion_groups (wallet_id, created_at desc);

create index if not exists wallet_conversion_groups_user_idx
on wallet_conversion_groups (user_id, created_at desc);

create index if not exists wallet_conversion_groups_conversion_idx
on wallet_conversion_groups (conversion_type, conversion_id);

alter table wallet_ledger_entries
add column if not exists conversion_group_id uuid references wallet_conversion_groups(id);

alter table wallet_value_lots
add column if not exists conversion_group_id uuid references wallet_conversion_groups(id);

alter table wallet_value_lots
add column if not exists converted_from_value_lot_id uuid references wallet_value_lots(id);

create index if not exists wallet_ledger_entries_conversion_group_idx
on wallet_ledger_entries (conversion_group_id);

create index if not exists wallet_value_lots_conversion_group_idx
on wallet_value_lots (conversion_group_id);

create index if not exists wallet_value_lots_converted_from_idx
on wallet_value_lots (converted_from_value_lot_id);

create table if not exists wallet_conversion_rates (
  id uuid primary key default gen_random_uuid(),

  source_currency_code text not null,
  target_currency_code text not null,

  rate numeric(24, 12) not null,
  spread_bps integer not null default 0,

  min_source_amount_minor bigint not null default 1,
  max_source_amount_minor bigint,

  active boolean not null default true,

  valid_from timestamptz not null default now(),
  valid_until timestamptz,

  created_at timestamptz not null default now(),

  metadata jsonb not null default '{}'::jsonb,

  constraint wallet_conversion_rates_rate_check
  check (rate > 0),

  constraint wallet_conversion_rates_spread_check
  check (spread_bps >= 0 and spread_bps <= 10000),

  constraint wallet_conversion_rates_amount_check
  check (
    min_source_amount_minor > 0
    and (
      max_source_amount_minor is null
      or max_source_amount_minor >= min_source_amount_minor
    )
  ),

  constraint wallet_conversion_rates_currency_check
  check (source_currency_code <> target_currency_code)
);

create index if not exists wallet_conversion_rates_lookup_idx
on wallet_conversion_rates (
  source_currency_code,
  target_currency_code,
  active,
  valid_from,
  valid_until
);

create or replace function wallet_get_conversion_rate(
  p_source_currency_code text,
  p_target_currency_code text,
  p_source_amount_minor bigint,
  p_at timestamptz default now()
)
returns table (
  rate_id uuid,
  rate numeric,
  spread_bps integer
)
language plpgsql
stable
as $$
begin
  if p_source_currency_code = p_target_currency_code then
    raise exception 'source and target currency must differ';
  end if;

  if p_source_amount_minor <= 0 then
    raise exception 'source amount must be positive';
  end if;

  return query
  select
    r.id,
    r.rate,
    r.spread_bps
  from wallet_conversion_rates r
  where r.source_currency_code = p_source_currency_code
    and r.target_currency_code = p_target_currency_code
    and r.active is true
    and r.valid_from <= p_at
    and (
      r.valid_until is null
      or r.valid_until > p_at
    )
    and r.min_source_amount_minor <= p_source_amount_minor
    and (
      r.max_source_amount_minor is null
      or r.max_source_amount_minor >= p_source_amount_minor
    )
  order by r.valid_from desc, r.created_at desc
  limit 1;

  if not found then
    raise exception 'no active conversion rate for % to % amount %',
      p_source_currency_code,
      p_target_currency_code,
      p_source_amount_minor;
  end if;
end;
$$;

create or replace function wallet_calculate_conversion_output(
  p_source_amount_minor bigint,
  p_rate numeric,
  p_spread_bps integer default 0
)
returns table (
  target_amount_minor bigint,
  fee_amount_minor bigint
)
language plpgsql
immutable
as $$
declare
  v_gross numeric;
  v_fee numeric;
  v_net numeric;
begin
  if p_source_amount_minor <= 0 then
    raise exception 'source amount must be positive';
  end if;

  if p_rate <= 0 then
    raise exception 'rate must be positive';
  end if;

  if p_spread_bps < 0 or p_spread_bps > 10000 then
    raise exception 'spread_bps must be between 0 and 10000';
  end if;

  v_gross := p_source_amount_minor::numeric * p_rate;
  v_fee := floor(v_gross * (p_spread_bps::numeric / 10000));
  v_net := floor(v_gross - v_fee);

  return query select
    greatest(v_net, 0)::bigint,
    greatest(v_fee, 0)::bigint;
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

insert into wallet_conversion_rates (
  source_currency_code,
  target_currency_code,
  rate,
  spread_bps,
  min_source_amount_minor,
  active,
  metadata
)
select
  'USD',
  'ICOIN',
  1.000000000000,
  0,
  1,
  true,
  '{"meaning": "1 USD cent converts to 1 ICOIN minor unit"}'::jsonb
where not exists (
  select 1
  from wallet_conversion_rates
  where source_currency_code = 'USD'
    and target_currency_code = 'ICOIN'
    and active is true
    and min_source_amount_minor = 1
    and max_source_amount_minor is null
);

create or replace function convert_usd_to_icoins(
  p_wallet_id uuid,
  p_user_id uuid,
  p_usd_amount_minor bigint,
  p_conversion_id uuid,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  if p_conversion_id is null then
    raise exception 'conversion id is required';
  end if;

  if p_idempotency_key is null then
    p_idempotency_key := 'convert_usd_to_icoins:' || p_conversion_id::text;
  end if;

  return convert_wallet_balance(
    p_wallet_id,
    p_user_id,
    p_usd_amount_minor,
    'USD',
    'ICOIN',
    'convert_usd_to_icoins',
    p_conversion_id,
    p_idempotency_key,
    p_metadata
  );
end;
$$;

insert into wallet_conversion_rates (
  source_currency_code,
  target_currency_code,
  rate,
  spread_bps,
  min_source_amount_minor,
  active,
  metadata
)
select
  'ICOIN',
  'USD',
  1.000000000000,
  0,
  1,
  true,
  '{"meaning": "1 ICOIN minor unit converts to 1 USD cent"}'::jsonb
where not exists (
  select 1
  from wallet_conversion_rates
  where source_currency_code = 'ICOIN'
    and target_currency_code = 'USD'
    and active is true
    and min_source_amount_minor = 1
    and max_source_amount_minor is null
);

create or replace function convert_icoins_to_usd(
  p_wallet_id uuid,
  p_user_id uuid,
  p_icoin_amount_minor bigint,
  p_conversion_id uuid,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  if p_conversion_id is null then
    raise exception 'conversion id is required';
  end if;

  if p_idempotency_key is null then
    p_idempotency_key := 'convert_icoins_to_usd:' || p_conversion_id::text;
  end if;

  return convert_wallet_balance(
    p_wallet_id,
    p_user_id,
    p_icoin_amount_minor,
    'ICOIN',
    'USD',
    'convert_icoins_to_usd',
    p_conversion_id,
    p_idempotency_key,
    p_metadata
  );
end;
$$;

create or replace view wallet_conversion_group_details as
select
  cg.id as conversion_group_id,
  cg.wallet_id,
  cg.user_id,
  cg.source_currency_code,
  cg.target_currency_code,
  cg.source_amount_minor,
  cg.target_amount_minor,
  cg.conversion_rate,
  cg.fee_amount_minor,
  cg.spread_bps,
  cg.conversion_type,
  cg.conversion_id,
  cg.status,
  cg.idempotency_key,
  cg.created_at,
  cg.completed_at,

  count(le.id) as ledger_entry_count,

  coalesce(sum(le.amount_minor) filter (
    where le.entry_type = 'conversion_debit'
      and le.direction = -1
  ), 0)::bigint as source_debited_minor,

  coalesce(sum(le.amount_minor) filter (
    where le.entry_type = 'conversion_credit'
      and le.direction = 1
  ), 0)::bigint as target_credited_minor,

  jsonb_agg(
    jsonb_build_object(
      'ledger_entry_id', le.id,
      'value_lot_id', le.value_lot_id,
      'entry_type', le.entry_type,
      'currency_code', le.currency_code,
      'amount_minor', le.amount_minor,
      'campaign_id', le.campaign_id,
      'created_at', le.created_at
    )
    order by le.created_at asc
  ) filter (where le.id is not null) as ledger_entries

from wallet_conversion_groups cg
left join wallet_ledger_entries le
  on le.conversion_group_id = cg.id
group by cg.id;
