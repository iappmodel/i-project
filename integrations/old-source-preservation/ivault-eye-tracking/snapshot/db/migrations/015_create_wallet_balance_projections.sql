-- 15/23 MVP — wallet_balance_projections — fast wallet read cache.
-- Source of truth is wallet_ledger_entries; projections are derived.

create table wallet_balance_projections (
  id uuid primary key default gen_random_uuid(),

  wallet_id uuid not null references wallets(id),
  user_id uuid not null references users(id),

  currency_code text not null default 'USD',

  available_balance_minor bigint not null default 0
    check (available_balance_minor >= 0),
  pending_balance_minor bigint not null default 0
    check (pending_balance_minor >= 0),
  locked_balance_minor bigint not null default 0
    check (locked_balance_minor >= 0),
  withdrawable_balance_minor bigint not null default 0
    check (withdrawable_balance_minor >= 0),

  lifetime_earned_minor bigint not null default 0
    check (lifetime_earned_minor >= 0),
  lifetime_spent_minor bigint not null default 0
    check (lifetime_spent_minor >= 0),
  lifetime_withdrawn_minor bigint not null default 0
    check (lifetime_withdrawn_minor >= 0),
  lifetime_reversed_minor bigint not null default 0
    check (lifetime_reversed_minor >= 0),

  last_ledger_entry_id uuid references wallet_ledger_entries(id),
  version bigint not null default 0,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (wallet_id, currency_code)
);

create index idx_wallet_balance_wallet_id
  on wallet_balance_projections(wallet_id);

create index idx_wallet_balance_user_id
  on wallet_balance_projections(user_id);

create index idx_wallet_balance_currency
  on wallet_balance_projections(currency_code);

create index idx_wallet_balance_updated_at
  on wallet_balance_projections(updated_at desc);

create table wallet_ledger_projection_applications (
  id uuid primary key default gen_random_uuid(),

  ledger_entry_id uuid not null unique references wallet_ledger_entries(id),
  wallet_id uuid not null references wallets(id),
  currency_code text not null,

  applied_at timestamptz not null default now()
);

create index idx_wallet_projection_applications_wallet_currency
  on wallet_ledger_projection_applications(wallet_id, currency_code);

create or replace function ensure_wallet_balance_projection(
  p_wallet_id uuid,
  p_user_id uuid,
  p_currency_code text
)
returns uuid
language plpgsql
as $$
declare
  v_projection_id uuid;
begin
  insert into wallet_balance_projections (
    wallet_id,
    user_id,
    currency_code
  )
  values (
    p_wallet_id,
    p_user_id,
    coalesce(p_currency_code, 'USD')
  )
  on conflict (wallet_id, currency_code)
  do update
    set updated_at = wallet_balance_projections.updated_at
  returning id into v_projection_id;

  return v_projection_id;
end;
$$;

create or replace function recalculate_withdrawable_balance(
  p_wallet_id uuid,
  p_currency_code text
)
returns void
language plpgsql
as $$
declare
  v_available bigint;
begin
  select available_balance_minor
  into v_available
  from wallet_balance_projections
  where wallet_id = p_wallet_id
    and currency_code = p_currency_code;

  if v_available is null then
    return;
  end if;

  update wallet_balance_projections
  set
    withdrawable_balance_minor =
      case
        when p_currency_code = 'USD'
          then greatest(v_available, 0)
        else 0
      end,
    updated_at = now(),
    version = version + 1
  where wallet_id = p_wallet_id
    and currency_code = p_currency_code;
end;
$$;

create or replace function apply_ledger_entry_to_balance_projection_once(
  p_ledger_entry_id uuid
)
returns void
language plpgsql
as $$
declare
  v_entry wallet_ledger_entries%rowtype;
begin
  select *
  into v_entry
  from wallet_ledger_entries
  where id = p_ledger_entry_id;

  if v_entry.id is null then
    raise exception 'ledger entry not found: %', p_ledger_entry_id;
  end if;

  if v_entry.status <> 'posted' then
    return;
  end if;

  insert into wallet_ledger_projection_applications (
    ledger_entry_id,
    wallet_id,
    currency_code
  )
  values (
    v_entry.id,
    v_entry.wallet_id,
    v_entry.currency_code
  )
  on conflict (ledger_entry_id)
  do nothing;

  if not found then
    return;
  end if;

  perform ensure_wallet_balance_projection(
    v_entry.wallet_id,
    v_entry.user_id,
    v_entry.currency_code
  );

  update wallet_balance_projections
  set
    available_balance_minor = available_balance_minor + v_entry.available_impact_minor,
    pending_balance_minor = pending_balance_minor + v_entry.pending_impact_minor,
    locked_balance_minor = locked_balance_minor + v_entry.locked_impact_minor,

    lifetime_earned_minor =
      lifetime_earned_minor +
      case
        when v_entry.entry_type = 'credit'
          and v_entry.direction = 1
          then v_entry.amount_minor
        else 0
      end,

    lifetime_spent_minor =
      lifetime_spent_minor +
      case
        when v_entry.entry_type = 'debit'
          and v_entry.direction = -1
          then v_entry.amount_minor
        else 0
      end,

    lifetime_withdrawn_minor =
      lifetime_withdrawn_minor +
      case
        when v_entry.entry_type = 'withdrawal'
          and v_entry.direction = -1
          then v_entry.amount_minor
        else 0
      end,

    lifetime_reversed_minor =
      lifetime_reversed_minor +
      case
        when v_entry.entry_type = 'reversal'
          then v_entry.amount_minor
        else 0
      end,

    last_ledger_entry_id = v_entry.id,
    version = version + 1,
    updated_at = now()
  where wallet_id = v_entry.wallet_id
    and currency_code = v_entry.currency_code;

  perform recalculate_withdrawable_balance(
    v_entry.wallet_id,
    v_entry.currency_code
  );

  if exists (
    select 1
    from wallet_balance_projections
    where wallet_id = v_entry.wallet_id
      and currency_code = v_entry.currency_code
      and (
        available_balance_minor < 0
        or pending_balance_minor < 0
        or locked_balance_minor < 0
        or withdrawable_balance_minor < 0
      )
  ) then
    raise exception 'wallet balance projection cannot go negative';
  end if;
end;
$$;

create or replace function trg_apply_wallet_ledger_entry_once()
returns trigger
language plpgsql
as $$
begin
  perform apply_ledger_entry_to_balance_projection_once(new.id);
  return new;
end;
$$;

drop trigger if exists apply_wallet_ledger_entry_after_insert
on wallet_ledger_entries;

create trigger apply_wallet_ledger_entry_after_insert
after insert on wallet_ledger_entries
for each row
execute function trg_apply_wallet_ledger_entry_once();

create or replace function rebuild_wallet_balance_projection(
  p_wallet_id uuid,
  p_currency_code text
)
returns void
language plpgsql
as $$
declare
  v_user_id uuid;
begin
  select user_id
  into v_user_id
  from wallets
  where id = p_wallet_id;

  if v_user_id is null then
    raise exception 'wallet not found: %', p_wallet_id;
  end if;

  insert into wallet_balance_projections (
    wallet_id,
    user_id,
    currency_code
  )
  values (
    p_wallet_id,
    v_user_id,
    coalesce(p_currency_code, 'USD')
  )
  on conflict (wallet_id, currency_code)
  do nothing;

  update wallet_balance_projections
  set
    available_balance_minor = coalesce((
      select sum(available_impact_minor)
      from wallet_ledger_entries
      where wallet_id = p_wallet_id
        and currency_code = p_currency_code
        and status = 'posted'
    ), 0),

    pending_balance_minor = coalesce((
      select sum(pending_impact_minor)
      from wallet_ledger_entries
      where wallet_id = p_wallet_id
        and currency_code = p_currency_code
        and status = 'posted'
    ), 0),

    locked_balance_minor = coalesce((
      select sum(locked_impact_minor)
      from wallet_ledger_entries
      where wallet_id = p_wallet_id
        and currency_code = p_currency_code
        and status = 'posted'
    ), 0),

    lifetime_earned_minor = coalesce((
      select sum(amount_minor)
      from wallet_ledger_entries
      where wallet_id = p_wallet_id
        and currency_code = p_currency_code
        and status = 'posted'
        and entry_type = 'credit'
        and direction = 1
    ), 0),

    lifetime_spent_minor = coalesce((
      select sum(amount_minor)
      from wallet_ledger_entries
      where wallet_id = p_wallet_id
        and currency_code = p_currency_code
        and status = 'posted'
        and entry_type = 'debit'
        and direction = -1
    ), 0),

    lifetime_withdrawn_minor = coalesce((
      select sum(amount_minor)
      from wallet_ledger_entries
      where wallet_id = p_wallet_id
        and currency_code = p_currency_code
        and status = 'posted'
        and entry_type = 'withdrawal'
        and direction = -1
    ), 0),

    lifetime_reversed_minor = coalesce((
      select sum(amount_minor)
      from wallet_ledger_entries
      where wallet_id = p_wallet_id
        and currency_code = p_currency_code
        and status = 'posted'
        and entry_type = 'reversal'
    ), 0),

    version = version + 1,
    updated_at = now()
  where wallet_id = p_wallet_id
    and currency_code = p_currency_code;

  perform recalculate_withdrawable_balance(
    p_wallet_id,
    p_currency_code
  );

  if exists (
    select 1
    from wallet_balance_projections
    where wallet_id = p_wallet_id
      and currency_code = p_currency_code
      and (
        available_balance_minor < 0
        or pending_balance_minor < 0
        or locked_balance_minor < 0
        or withdrawable_balance_minor < 0
      )
  ) then
    raise exception 'wallet balance projection cannot go negative after rebuild';
  end if;
end;
$$;
