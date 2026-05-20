create table if not exists wallets (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null,

  currency_code text not null default 'USD',

  available_balance_minor bigint not null default 0,
  pending_balance_minor bigint not null default 0,
  locked_balance_minor bigint not null default 0,
  total_balance_minor bigint not null default 0,

  status text not null default 'active',

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint wallets_currency_check
  check (currency_code in ('USD')),

  constraint wallets_status_check
  check (
    status in (
      'active',
      'restricted',
      'locked',
      'fraud_locked',
      'closed'
    )
  ),

  constraint wallets_balance_nonnegative_check
  check (
    available_balance_minor >= 0
    and pending_balance_minor >= 0
    and locked_balance_minor >= 0
    and total_balance_minor >= 0
  ),

  constraint wallets_total_balance_check
  check (
    total_balance_minor =
      available_balance_minor
      + pending_balance_minor
      + locked_balance_minor
  )
);

create unique index if not exists wallets_user_currency_unique
on wallets (user_id, currency_code);

create index if not exists wallets_user_idx
on wallets (user_id);

create index if not exists wallets_status_idx
on wallets (status);

create table if not exists wallet_value_lots (
  id uuid primary key default gen_random_uuid(),

  wallet_id uuid not null references wallets(id),
  user_id uuid not null,

  currency_code text not null default 'USD',

  original_amount_minor bigint not null,
  remaining_amount_minor bigint not null,

  status text not null default 'pending',

  source_type text not null,
  source_id uuid,

  available_at timestamptz,
  expires_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint wallet_value_lots_currency_check
  check (currency_code in ('USD')),

  constraint wallet_value_lots_amount_check
  check (
    original_amount_minor > 0
    and remaining_amount_minor >= 0
    and remaining_amount_minor <= original_amount_minor
  ),

  constraint wallet_value_lots_status_check
  check (
    status in (
      'pending',
      'available',
      'reserved',
      'consumed',
      'expired',
      'cancelled',
      'clawed_back'
    )
  )
);

create index if not exists wallet_value_lots_wallet_idx
on wallet_value_lots (wallet_id, created_at desc);

create index if not exists wallet_value_lots_user_idx
on wallet_value_lots (user_id, created_at desc);

create index if not exists wallet_value_lots_status_idx
on wallet_value_lots (status, available_at);

create table if not exists wallet_ledger_entries (
  id uuid primary key default gen_random_uuid(),

  wallet_id uuid not null references wallets(id),
  user_id uuid not null,

  currency_code text not null default 'USD',

  entry_type text not null,

  source_type text not null,
  source_id uuid,

  available_impact_minor bigint not null default 0,
  pending_impact_minor bigint not null default 0,
  locked_impact_minor bigint not null default 0,

  status text not null default 'posted',

  idempotency_key text not null,

  previous_hash text,
  entry_hash text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint wallet_ledger_entries_currency_check
  check (currency_code in ('USD')),

  constraint wallet_ledger_entries_status_check
  check (
    status in (
      'posted',
      'voided',
      'reversed'
    )
  ),

  constraint wallet_ledger_entries_type_check
  check (
    entry_type in (
      'wallet_created',
      'admin_credit',
      'admin_debit',
      'reward_pending',
      'reward_released',
      'withdrawal_reserved',
      'withdrawal_paid',
      'withdrawal_failed_released',
      'withdrawal_reversal_recredit',
      'correction'
    )
  )
);

create unique index if not exists wallet_ledger_entries_idempotency_unique
on wallet_ledger_entries (idempotency_key);

create index if not exists wallet_ledger_entries_wallet_idx
on wallet_ledger_entries (wallet_id, created_at desc);

create index if not exists wallet_ledger_entries_user_idx
on wallet_ledger_entries (user_id, created_at desc);

create index if not exists wallet_ledger_entries_type_idx
on wallet_ledger_entries (entry_type, created_at desc);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists wallets_set_updated_at on wallets;

create trigger wallets_set_updated_at
before update on wallets
for each row
execute function set_updated_at();

drop trigger if exists wallet_value_lots_set_updated_at on wallet_value_lots;

create trigger wallet_value_lots_set_updated_at
before update on wallet_value_lots
for each row
execute function set_updated_at();

create or replace function create_wallet(
  p_user_id uuid,
  p_currency_code text default 'USD',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_wallet_id uuid;
begin
  if p_user_id is null then
    raise exception 'user id is required';
  end if;

  if coalesce(p_currency_code, 'USD') <> 'USD' then
    raise exception 'unsupported currency: %', p_currency_code;
  end if;

  insert into wallets (
    user_id,
    currency_code,
    available_balance_minor,
    pending_balance_minor,
    locked_balance_minor,
    total_balance_minor,
    status,
    metadata
  )
  values (
    p_user_id,
    'USD',
    0,
    0,
    0,
    0,
    'active',
    p_metadata
  )
  on conflict (user_id, currency_code)
  do update set
    metadata = wallets.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_wallet_id;

  return v_wallet_id;
end;
$$;

create or replace function wallet_assert_not_fraud_locked(
  p_wallet_id uuid,
  p_action text default null
)
returns void
language plpgsql
as $$
declare
  v_wallet wallets%rowtype;
begin
  select *
  into v_wallet
  from wallets
  where id = p_wallet_id;

  if v_wallet.id is null then
    raise exception 'wallet not found: %', p_wallet_id;
  end if;

  if v_wallet.status in ('locked', 'fraud_locked', 'closed') then
    raise exception 'wallet is fraud locked or unavailable for action: %', coalesce(p_action, 'unknown');
  end if;
end;
$$;

create or replace function post_wallet_ledger_entry(
  p_wallet_id uuid,
  p_user_id uuid,
  p_entry_type text,
  p_source_type text,
  p_source_id uuid,
  p_available_impact_minor bigint default 0,
  p_pending_impact_minor bigint default 0,
  p_locked_impact_minor bigint default 0,
  p_currency_code text default 'USD',
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_wallet wallets%rowtype;
  v_ledger_entry_id uuid;

  v_new_available bigint;
  v_new_pending bigint;
  v_new_locked bigint;
  v_new_total bigint;

  v_idempotency_key text;
begin
  if p_wallet_id is null then
    raise exception 'wallet id is required';
  end if;

  if p_user_id is null then
    raise exception 'user id is required';
  end if;

  if p_entry_type is null or length(trim(p_entry_type)) = 0 then
    raise exception 'entry type is required';
  end if;

  if p_source_type is null or length(trim(p_source_type)) = 0 then
    raise exception 'source type is required';
  end if;

  if coalesce(p_currency_code, 'USD') <> 'USD' then
    raise exception 'unsupported currency: %', p_currency_code;
  end if;

  v_idempotency_key := coalesce(
    p_idempotency_key,
    'wallet_ledger:' || p_wallet_id::text || ':' || p_entry_type || ':' || coalesce(p_source_id::text, gen_random_uuid()::text)
  );

  select *
  into v_wallet
  from wallets
  where id = p_wallet_id
  for update;

  if v_wallet.id is null then
    raise exception 'wallet not found: %', p_wallet_id;
  end if;

  if v_wallet.user_id <> p_user_id then
    raise exception 'wallet/user mismatch';
  end if;

  perform wallet_assert_not_fraud_locked(
    p_wallet_id,
    p_entry_type
  );

  if exists (
    select 1
    from wallet_ledger_entries
    where idempotency_key = v_idempotency_key
  ) then
    select id
    into v_ledger_entry_id
    from wallet_ledger_entries
    where idempotency_key = v_idempotency_key;

    return v_ledger_entry_id;
  end if;

  v_new_available := v_wallet.available_balance_minor + coalesce(p_available_impact_minor, 0);
  v_new_pending := v_wallet.pending_balance_minor + coalesce(p_pending_impact_minor, 0);
  v_new_locked := v_wallet.locked_balance_minor + coalesce(p_locked_impact_minor, 0);
  v_new_total := v_new_available + v_new_pending + v_new_locked;

  if v_new_available < 0 then
    raise exception 'available balance cannot go negative';
  end if;

  if v_new_pending < 0 then
    raise exception 'pending balance cannot go negative';
  end if;

  if v_new_locked < 0 then
    raise exception 'locked balance cannot go negative';
  end if;

  if v_new_total < 0 then
    raise exception 'total balance cannot go negative';
  end if;

  insert into wallet_ledger_entries (
    wallet_id,
    user_id,
    currency_code,
    entry_type,
    source_type,
    source_id,
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
    'USD',
    p_entry_type,
    p_source_type,
    p_source_id,
    coalesce(p_available_impact_minor, 0),
    coalesce(p_pending_impact_minor, 0),
    coalesce(p_locked_impact_minor, 0),
    'posted',
    v_idempotency_key,
    p_metadata
  )
  returning id into v_ledger_entry_id;

  update wallets
  set
    available_balance_minor = v_new_available,
    pending_balance_minor = v_new_pending,
    locked_balance_minor = v_new_locked,
    total_balance_minor = v_new_total,
    updated_at = now()
  where id = p_wallet_id;

  return v_ledger_entry_id;
end;
$$;

create or replace function create_available_wallet_value_lot(
  p_wallet_id uuid,
  p_user_id uuid,
  p_amount_minor bigint,
  p_source_type text,
  p_source_id uuid default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_wallet wallets%rowtype;
  v_lot_id uuid;
  v_ledger_entry_id uuid;
  v_idempotency_key text;
begin
  if p_amount_minor <= 0 then
    raise exception 'amount must be positive';
  end if;

  select *
  into v_wallet
  from wallets
  where id = p_wallet_id
  for update;

  if v_wallet.id is null then
    raise exception 'wallet not found: %', p_wallet_id;
  end if;

  if v_wallet.user_id <> p_user_id then
    raise exception 'wallet/user mismatch';
  end if;

  v_idempotency_key := coalesce(
    p_idempotency_key,
    'available_lot:' || p_wallet_id::text || ':' || p_source_type || ':' || coalesce(p_source_id::text, gen_random_uuid()::text)
  );

  if exists (
    select 1
    from wallet_ledger_entries
    where idempotency_key = v_idempotency_key
  ) then
    select (metadata->>'wallet_value_lot_id')::uuid
    into v_lot_id
    from wallet_ledger_entries
    where idempotency_key = v_idempotency_key;

    return v_lot_id;
  end if;

  insert into wallet_value_lots (
    wallet_id,
    user_id,
    currency_code,
    original_amount_minor,
    remaining_amount_minor,
    status,
    source_type,
    source_id,
    available_at,
    expires_at,
    metadata
  )
  values (
    p_wallet_id,
    p_user_id,
    'USD',
    p_amount_minor,
    p_amount_minor,
    'available',
    p_source_type,
    p_source_id,
    now(),
    null,
    p_metadata
  )
  returning id into v_lot_id;

  v_ledger_entry_id := post_wallet_ledger_entry(
    p_wallet_id,
    p_user_id,
    case
      when p_source_type = 'admin_credit' then 'admin_credit'
      else 'correction'
    end,
    p_source_type,
    coalesce(p_source_id, v_lot_id),
    p_amount_minor,
    0,
    0,
    'USD',
    v_idempotency_key,
    p_metadata || jsonb_build_object(
      'wallet_value_lot_id',
      v_lot_id
    )
  );

  return v_lot_id;
end;
$$;

create or replace view user_wallet_summary as
select
  id as wallet_id,
  user_id,
  currency_code,
  available_balance_minor,
  pending_balance_minor,
  locked_balance_minor,
  total_balance_minor,
  status,
  created_at,
  updated_at
from wallets;

create or replace view user_wallet_ledger as
select
  id as wallet_ledger_entry_id,
  wallet_id,
  user_id,
  currency_code,
  entry_type,
  source_type,
  source_id,
  available_impact_minor,
  pending_impact_minor,
  locked_impact_minor,
  status,
  created_at
from wallet_ledger_entries;

create or replace view wallet_integrity_check as
select
  w.id as wallet_id,
  w.user_id,
  w.currency_code,

  w.available_balance_minor,
  w.pending_balance_minor,
  w.locked_balance_minor,
  w.total_balance_minor,

  (
    w.available_balance_minor
    + w.pending_balance_minor
    + w.locked_balance_minor
  ) as computed_total_balance_minor,

  (
    w.total_balance_minor
    -
    (
      w.available_balance_minor
      + w.pending_balance_minor
      + w.locked_balance_minor
    )
  ) as total_balance_delta_minor,

  coalesce(sum(l.available_impact_minor), 0)::bigint as ledger_available_minor,
  coalesce(sum(l.pending_impact_minor), 0)::bigint as ledger_pending_minor,
  coalesce(sum(l.locked_impact_minor), 0)::bigint as ledger_locked_minor,

  (
    w.available_balance_minor
    - coalesce(sum(l.available_impact_minor), 0)
  )::bigint as available_vs_ledger_delta_minor,

  (
    w.pending_balance_minor
    - coalesce(sum(l.pending_impact_minor), 0)
  )::bigint as pending_vs_ledger_delta_minor,

  (
    w.locked_balance_minor
    - coalesce(sum(l.locked_impact_minor), 0)
  )::bigint as locked_vs_ledger_delta_minor

from wallets w
left join wallet_ledger_entries l
  on l.wallet_id = w.id
 and l.status = 'posted'
group by w.id;
