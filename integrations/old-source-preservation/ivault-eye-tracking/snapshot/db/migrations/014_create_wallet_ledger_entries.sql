-- 14/23 MVP — wallet_ledger_entries — immutable financial movement log.

do $$
begin
  create type wallet_ledger_entry_type as enum (
    'credit',
    'debit',
    'hold',
    'release',
    'reversal',
    'conversion',
    'withdrawal',
    'refund',
    'adjustment',
    'fee'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type wallet_ledger_status as enum (
    'pending',
    'posted',
    'failed',
    'reversed',
    'voided'
  );
exception
  when duplicate_object then null;
end
$$;

create table wallet_ledger_entries (
  id uuid primary key default gen_random_uuid(),

  wallet_id uuid not null references wallets(id),
  user_id uuid not null references users(id),
  value_lot_id uuid references wallet_value_lots(id),

  entry_type wallet_ledger_entry_type not null,
  status wallet_ledger_status not null default 'posted',

  currency_code text not null default 'USD',

  amount_minor bigint not null
    check (amount_minor > 0),

  direction smallint not null
    check (direction in (-1, 1)),

  balance_impact_minor bigint generated always as (
    amount_minor * direction
  ) stored,

  available_impact_minor bigint not null default 0,
  pending_impact_minor bigint not null default 0,
  locked_impact_minor bigint not null default 0,

  source_type text,
  source_id uuid,

  campaign_id uuid,
  reward_event_id uuid,
  withdrawal_id uuid,
  conversion_id uuid,

  idempotency_key text not null,

  reversal_of_entry_id uuid references wallet_ledger_entries(id),

  description text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  posted_at timestamptz,
  reversed_at timestamptz,

  unique (wallet_id, idempotency_key)
);

create index idx_wallet_ledger_wallet_id
  on wallet_ledger_entries(wallet_id);

create index idx_wallet_ledger_user_id
  on wallet_ledger_entries(user_id);

create index idx_wallet_ledger_value_lot_id
  on wallet_ledger_entries(value_lot_id);

create index idx_wallet_ledger_entry_type
  on wallet_ledger_entries(entry_type);

create index idx_wallet_ledger_status
  on wallet_ledger_entries(status);

create index idx_wallet_ledger_created_at
  on wallet_ledger_entries(created_at desc);

create index idx_wallet_ledger_source
  on wallet_ledger_entries(source_type, source_id);

create index idx_wallet_ledger_campaign_id
  on wallet_ledger_entries(campaign_id);

create index idx_wallet_ledger_reward_event_id
  on wallet_ledger_entries(reward_event_id);

create index idx_wallet_ledger_withdrawal_id
  on wallet_ledger_entries(withdrawal_id)
  where withdrawal_id is not null;

create index idx_wallet_ledger_conversion_id
  on wallet_ledger_entries(conversion_id)
  where conversion_id is not null;

create or replace function create_wallet_ledger_entry_idempotent(
  p_wallet_id uuid,
  p_user_id uuid,
  p_value_lot_id uuid,
  p_entry_type wallet_ledger_entry_type,
  p_status wallet_ledger_status,
  p_currency_code text,
  p_amount_minor bigint,
  p_direction smallint,
  p_available_impact_minor bigint,
  p_pending_impact_minor bigint,
  p_locked_impact_minor bigint,
  p_source_type text,
  p_source_id uuid,
  p_campaign_id uuid,
  p_reward_event_id uuid,
  p_withdrawal_id uuid,
  p_conversion_id uuid,
  p_idempotency_key text,
  p_reversal_of_entry_id uuid,
  p_description text,
  p_metadata jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_entry_id uuid;
begin
  if p_amount_minor <= 0 then
    raise exception 'amount_minor must be positive';
  end if;

  if p_direction not in (-1, 1) then
    raise exception 'direction must be -1 or 1';
  end if;

  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'idempotency_key is required';
  end if;

  select id
  into v_entry_id
  from wallet_ledger_entries
  where wallet_id = p_wallet_id
    and idempotency_key = p_idempotency_key;

  if v_entry_id is not null then
    return v_entry_id;
  end if;

  insert into wallet_ledger_entries (
    wallet_id,
    user_id,
    value_lot_id,
    entry_type,
    status,
    currency_code,
    amount_minor,
    direction,
    available_impact_minor,
    pending_impact_minor,
    locked_impact_minor,
    source_type,
    source_id,
    campaign_id,
    reward_event_id,
    withdrawal_id,
    conversion_id,
    idempotency_key,
    reversal_of_entry_id,
    description,
    metadata,
    posted_at
  )
  values (
    p_wallet_id,
    p_user_id,
    p_value_lot_id,
    p_entry_type,
    coalesce(p_status, 'posted'::wallet_ledger_status),
    coalesce(p_currency_code, 'USD'),
    p_amount_minor,
    p_direction,
    coalesce(p_available_impact_minor, 0),
    coalesce(p_pending_impact_minor, 0),
    coalesce(p_locked_impact_minor, 0),
    p_source_type,
    p_source_id,
    p_campaign_id,
    p_reward_event_id,
    p_withdrawal_id,
    p_conversion_id,
    p_idempotency_key,
    p_reversal_of_entry_id,
    p_description,
    coalesce(p_metadata, '{}'::jsonb),
    case
      when coalesce(p_status, 'posted'::wallet_ledger_status) = 'posted'
        then now()
      else null
    end
  )
  returning id into v_entry_id;

  return v_entry_id;
end;
$$;
