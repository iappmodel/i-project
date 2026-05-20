-- 13/23 MVP — wallet_value_lots — source buckets of wallet value.

create type wallet_lot_status as enum (
  'pending',
  'available',
  'partially_consumed',
  'consumed',
  'expired',
  'revoked',
  'locked'
);

create type wallet_lot_source_type as enum (
  'campaign_reward',
  'bonus',
  'referral',
  'refund',
  'coin_conversion',
  'admin_grant',
  'adjustment'
);

create table wallet_value_lots (
  id uuid primary key default gen_random_uuid(),

  wallet_id uuid not null references wallets(id),
  user_id uuid not null references users(id),

  source_type wallet_lot_source_type not null,
  source_id uuid,

  campaign_id uuid,
  reward_event_id uuid,

  currency_code text not null default 'USD',

  original_amount_minor bigint not null
    check (original_amount_minor > 0),

  remaining_amount_minor bigint not null
    check (remaining_amount_minor >= 0),

  status wallet_lot_status not null default 'pending',

  is_withdrawable boolean not null default false,
  is_spendable boolean not null default true,
  is_convertible boolean not null default true,

  pending_until timestamptz,
  available_at timestamptz,
  expires_at timestamptz,
  consumed_at timestamptz,
  revoked_at timestamptz,

  risk_score numeric(6,4) not null default 0
    check (risk_score >= 0 and risk_score <= 1),

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz,

  check (remaining_amount_minor <= original_amount_minor)
);

create index idx_wallet_value_lots_wallet_id
on wallet_value_lots(wallet_id);

create index idx_wallet_value_lots_user_id
on wallet_value_lots(user_id);

create index idx_wallet_value_lots_status
on wallet_value_lots(status);

create index idx_wallet_value_lots_source
on wallet_value_lots(source_type, source_id);

create index idx_wallet_value_lots_campaign_id
on wallet_value_lots(campaign_id);

create index idx_wallet_value_lots_available
on wallet_value_lots(wallet_id, status, available_at);

create index idx_wallet_value_lots_expiry
on wallet_value_lots(expires_at)
where expires_at is not null;

create or replace function create_wallet_value_lot(
  p_wallet_id uuid,
  p_user_id uuid,
  p_source_type wallet_lot_source_type,
  p_source_id uuid,
  p_campaign_id uuid,
  p_reward_event_id uuid,
  p_currency_code text,
  p_amount_minor bigint,
  p_is_withdrawable boolean,
  p_is_spendable boolean,
  p_is_convertible boolean,
  p_pending_until timestamptz,
  p_expires_at timestamptz,
  p_risk_score numeric,
  p_metadata jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_lot_id uuid;
begin
  if p_amount_minor <= 0 then
    raise exception 'amount must be positive';
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
    is_withdrawable,
    is_spendable,
    is_convertible,
    pending_until,
    expires_at,
    risk_score,
    metadata
  )
  values (
    p_wallet_id,
    p_user_id,
    p_source_type,
    p_source_id,
    p_campaign_id,
    p_reward_event_id,
    coalesce(p_currency_code, 'USD'),
    p_amount_minor,
    p_amount_minor,
    case
      when p_pending_until is not null and p_pending_until > now()
        then 'pending'::wallet_lot_status
      else 'available'::wallet_lot_status
    end,
    p_is_withdrawable,
    p_is_spendable,
    p_is_convertible,
    p_pending_until,
    p_expires_at,
    coalesce(p_risk_score, 0),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_lot_id;

  return v_lot_id;
end;
$$;

create or replace function release_pending_wallet_value_lots()
returns integer
language plpgsql
as $$
declare
  v_count integer;
begin
  update wallet_value_lots
  set
    status = 'available',
    available_at = now(),
    updated_at = now()
  where status = 'pending'
    and pending_until is not null
    and pending_until <= now()
    and remaining_amount_minor > 0;

  get diagnostics v_count = row_count;

  return v_count;
end;
$$;

create or replace function expire_wallet_value_lots()
returns integer
language plpgsql
as $$
declare
  v_count integer;
begin
  update wallet_value_lots
  set
    status = 'expired',
    remaining_amount_minor = 0,
    updated_at = now()
  where status in ('pending', 'available', 'partially_consumed')
    and expires_at is not null
    and expires_at <= now()
    and remaining_amount_minor > 0;

  get diagnostics v_count = row_count;

  return v_count;
end;
$$;
