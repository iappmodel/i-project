create table if not exists campaign_budgets (
  id uuid primary key default gen_random_uuid(),

  campaign_id uuid not null unique,

  advertiser_id uuid,

  currency_code text not null default 'USD',

  funded_amount_minor bigint not null default 0,
  reserved_amount_minor bigint not null default 0,
  issued_amount_minor bigint not null default 0,
  released_amount_minor bigint not null default 0,
  expired_amount_minor bigint not null default 0,
  refunded_amount_minor bigint not null default 0,

  status text not null default 'active',

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint campaign_budgets_currency_check
  check (currency_code in ('USD')),

  constraint campaign_budgets_status_check
  check (
    status in (
      'draft',
      'active',
      'paused',
      'exhausted',
      'completed',
      'cancelled',
      'archived'
    )
  ),

  constraint campaign_budgets_nonnegative_check
  check (
    funded_amount_minor >= 0
    and reserved_amount_minor >= 0
    and issued_amount_minor >= 0
    and released_amount_minor >= 0
    and expired_amount_minor >= 0
    and refunded_amount_minor >= 0
  ),

  constraint campaign_budgets_funded_capacity_check
  check (
    reserved_amount_minor
    + issued_amount_minor
    + refunded_amount_minor
    <= funded_amount_minor
  )
);

create index if not exists campaign_budgets_campaign_idx
on campaign_budgets (campaign_id);

create index if not exists campaign_budgets_advertiser_idx
on campaign_budgets (advertiser_id);

create index if not exists campaign_budgets_status_idx
on campaign_budgets (status);

drop trigger if exists campaign_budgets_set_updated_at on campaign_budgets;

create trigger campaign_budgets_set_updated_at
before update on campaign_budgets
for each row
execute function set_updated_at();

create table if not exists campaign_budget_reservations (
  id uuid primary key default gen_random_uuid(),

  campaign_budget_id uuid not null references campaign_budgets(id),
  campaign_id uuid not null,

  user_id uuid,
  wallet_id uuid references wallets(id),

  attention_event_id uuid,
  reward_issuance_group_id uuid,

  currency_code text not null default 'USD',
  amount_minor bigint not null,

  status text not null default 'reserved',

  idempotency_key text not null,

  reserved_at timestamptz not null default now(),
  issued_at timestamptz,
  released_at timestamptz,
  expired_at timestamptz,
  refunded_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint campaign_budget_reservations_currency_check
  check (currency_code in ('USD')),

  constraint campaign_budget_reservations_amount_check
  check (amount_minor > 0),

  constraint campaign_budget_reservations_status_check
  check (
    status in (
      'reserved',
      'issued',
      'released',
      'expired',
      'refunded',
      'cancelled'
    )
  )
);

create unique index if not exists campaign_budget_reservations_idempotency_unique
on campaign_budget_reservations (idempotency_key);

create index if not exists campaign_budget_reservations_budget_idx
on campaign_budget_reservations (campaign_budget_id, created_at desc);

create index if not exists campaign_budget_reservations_campaign_idx
on campaign_budget_reservations (campaign_id, created_at desc);

create index if not exists campaign_budget_reservations_status_idx
on campaign_budget_reservations (status, created_at desc);

create index if not exists campaign_budget_reservations_wallet_idx
on campaign_budget_reservations (wallet_id, created_at desc);

drop trigger if exists campaign_budget_reservations_set_updated_at on campaign_budget_reservations;

create trigger campaign_budget_reservations_set_updated_at
before update on campaign_budget_reservations
for each row
execute function set_updated_at();

create or replace function create_campaign_budget(
  p_campaign_id uuid,
  p_funded_amount_minor bigint,
  p_advertiser_id uuid default null,
  p_currency_code text default 'USD',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_budget_id uuid;
begin
  if p_campaign_id is null then
    raise exception 'campaign id is required';
  end if;

  if p_funded_amount_minor < 0 then
    raise exception 'funded amount cannot be negative';
  end if;

  if coalesce(p_currency_code, 'USD') <> 'USD' then
    raise exception 'unsupported currency: %', p_currency_code;
  end if;

  insert into campaign_budgets (
    campaign_id,
    advertiser_id,
    currency_code,
    funded_amount_minor,
    reserved_amount_minor,
    issued_amount_minor,
    released_amount_minor,
    expired_amount_minor,
    refunded_amount_minor,
    status,
    metadata
  )
  values (
    p_campaign_id,
    p_advertiser_id,
    'USD',
    p_funded_amount_minor,
    0,
    0,
    0,
    0,
    0,
    case
      when p_funded_amount_minor > 0 then 'active'
      else 'draft'
    end,
    p_metadata
  )
  on conflict (campaign_id)
  do update set
    advertiser_id = coalesce(excluded.advertiser_id, campaign_budgets.advertiser_id),
    funded_amount_minor = excluded.funded_amount_minor,
    status =
      case
        when excluded.funded_amount_minor > 0 then 'active'
        else campaign_budgets.status
      end,
    metadata = campaign_budgets.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_budget_id;

  return v_budget_id;
end;
$$;

create or replace function get_campaign_budget_available_minor(
  p_campaign_id uuid
)
returns bigint
language plpgsql
stable
as $$
declare
  v_available bigint;
begin
  select
    funded_amount_minor
    - reserved_amount_minor
    - issued_amount_minor
    - refunded_amount_minor
  into v_available
  from campaign_budgets
  where campaign_id = p_campaign_id;

  return coalesce(v_available, 0);
end;
$$;

create or replace function reserve_campaign_budget(
  p_campaign_id uuid,
  p_amount_minor bigint,
  p_user_id uuid default null,
  p_wallet_id uuid default null,
  p_attention_event_id uuid default null,
  p_reward_issuance_group_id uuid default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_budget campaign_budgets%rowtype;
  v_reservation_id uuid;
  v_available bigint;
  v_idempotency_key text;
begin
  if p_campaign_id is null then
    raise exception 'campaign id is required';
  end if;

  if p_amount_minor <= 0 then
    raise exception 'reservation amount must be positive';
  end if;

  v_idempotency_key := coalesce(
    p_idempotency_key,
    'campaign_budget_reservation:' || p_campaign_id::text || ':' || coalesce(p_attention_event_id::text, gen_random_uuid()::text)
  );

  if exists (
    select 1
    from campaign_budget_reservations
    where idempotency_key = v_idempotency_key
  ) then
    select id
    into v_reservation_id
    from campaign_budget_reservations
    where idempotency_key = v_idempotency_key;

    return v_reservation_id;
  end if;

  select *
  into v_budget
  from campaign_budgets
  where campaign_id = p_campaign_id
  for update;

  if v_budget.id is null then
    raise exception 'campaign budget not found: %', p_campaign_id;
  end if;

  if v_budget.status <> 'active' then
    raise exception 'campaign budget is not active';
  end if;

  v_available :=
    v_budget.funded_amount_minor
    - v_budget.reserved_amount_minor
    - v_budget.issued_amount_minor
    - v_budget.refunded_amount_minor;

  if v_available < p_amount_minor then
    raise exception 'campaign budget exhausted';
  end if;

  insert into campaign_budget_reservations (
    campaign_budget_id,
    campaign_id,
    user_id,
    wallet_id,
    attention_event_id,
    reward_issuance_group_id,
    currency_code,
    amount_minor,
    status,
    idempotency_key,
    metadata
  )
  values (
    v_budget.id,
    p_campaign_id,
    p_user_id,
    p_wallet_id,
    p_attention_event_id,
    p_reward_issuance_group_id,
    'USD',
    p_amount_minor,
    'reserved',
    v_idempotency_key,
    p_metadata
  )
  returning id into v_reservation_id;

  update campaign_budgets
  set
    reserved_amount_minor = reserved_amount_minor + p_amount_minor,
    status =
      case
        when (
          funded_amount_minor
          - (reserved_amount_minor + p_amount_minor)
          - issued_amount_minor
          - refunded_amount_minor
        ) = 0
        then 'exhausted'
        else status
      end,
    updated_at = now()
  where id = v_budget.id;

  return v_reservation_id;
end;
$$;

create or replace function mark_campaign_budget_reservation_issued(
  p_reservation_id uuid,
  p_reward_issuance_group_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_reservation campaign_budget_reservations%rowtype;
  v_budget campaign_budgets%rowtype;
begin
  if p_reservation_id is null then
    raise exception 'reservation id is required';
  end if;

  select *
  into v_reservation
  from campaign_budget_reservations
  where id = p_reservation_id
  for update;

  if v_reservation.id is null then
    raise exception 'campaign budget reservation not found: %', p_reservation_id;
  end if;

  if v_reservation.status = 'issued' then
    return v_reservation.id;
  end if;

  if v_reservation.status <> 'reserved' then
    raise exception 'reservation must be reserved before issue. status %', v_reservation.status;
  end if;

  select *
  into v_budget
  from campaign_budgets
  where id = v_reservation.campaign_budget_id
  for update;

  update campaign_budget_reservations
  set
    status = 'issued',
    issued_at = now(),
    reward_issuance_group_id = coalesce(
      p_reward_issuance_group_id,
      reward_issuance_group_id
    ),
    metadata = metadata || p_metadata,
    updated_at = now()
  where id = v_reservation.id;

  update campaign_budgets
  set
    reserved_amount_minor = reserved_amount_minor - v_reservation.amount_minor,
    issued_amount_minor = issued_amount_minor + v_reservation.amount_minor,
    status =
      case
        when status = 'exhausted' then 'exhausted'
        else status
      end,
    updated_at = now()
  where id = v_budget.id;

  return v_reservation.id;
end;
$$;

create or replace function release_campaign_budget_reservation(
  p_reservation_id uuid,
  p_reason text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_reservation campaign_budget_reservations%rowtype;
  v_budget campaign_budgets%rowtype;
begin
  if p_reservation_id is null then
    raise exception 'reservation id is required';
  end if;

  select *
  into v_reservation
  from campaign_budget_reservations
  where id = p_reservation_id
  for update;

  if v_reservation.id is null then
    raise exception 'campaign budget reservation not found: %', p_reservation_id;
  end if;

  if v_reservation.status = 'released' then
    return v_reservation.id;
  end if;

  if v_reservation.status <> 'reserved' then
    raise exception 'only reserved reservations can be released. status %', v_reservation.status;
  end if;

  select *
  into v_budget
  from campaign_budgets
  where id = v_reservation.campaign_budget_id
  for update;

  update campaign_budget_reservations
  set
    status = 'released',
    released_at = now(),
    metadata = metadata || p_metadata || jsonb_build_object(
      'release_reason',
      p_reason
    ),
    updated_at = now()
  where id = v_reservation.id;

  update campaign_budgets
  set
    reserved_amount_minor = reserved_amount_minor - v_reservation.amount_minor,
    released_amount_minor = released_amount_minor + v_reservation.amount_minor,
    status =
      case
        when status = 'exhausted'
          and (
            funded_amount_minor
            - (reserved_amount_minor - v_reservation.amount_minor)
            - issued_amount_minor
            - refunded_amount_minor
          ) > 0
        then 'active'
        else status
      end,
    updated_at = now()
  where id = v_budget.id;

  return v_reservation.id;
end;
$$;

create or replace function refund_campaign_budget(
  p_campaign_id uuid,
  p_amount_minor bigint,
  p_reason text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_budget campaign_budgets%rowtype;
  v_available bigint;
begin
  if p_campaign_id is null then
    raise exception 'campaign id is required';
  end if;

  if p_amount_minor <= 0 then
    raise exception 'refund amount must be positive';
  end if;

  select *
  into v_budget
  from campaign_budgets
  where campaign_id = p_campaign_id
  for update;

  if v_budget.id is null then
    raise exception 'campaign budget not found: %', p_campaign_id;
  end if;

  v_available :=
    v_budget.funded_amount_minor
    - v_budget.reserved_amount_minor
    - v_budget.issued_amount_minor
    - v_budget.refunded_amount_minor;

  if v_available < p_amount_minor then
    raise exception 'refund amount exceeds available campaign budget';
  end if;

  update campaign_budgets
  set
    refunded_amount_minor = refunded_amount_minor + p_amount_minor,
    status =
      case
        when (
          funded_amount_minor
          - reserved_amount_minor
          - issued_amount_minor
          - (refunded_amount_minor + p_amount_minor)
        ) = 0
        then 'completed'
        else status
      end,
    metadata = metadata || p_metadata || jsonb_build_object(
      'last_refund_reason',
      p_reason
    ),
    updated_at = now()
  where id = v_budget.id;

  return v_budget.id;
end;
$$;

create or replace view campaign_budget_summary as
select
  cb.id as campaign_budget_id,
  cb.campaign_id,
  cb.advertiser_id,
  cb.currency_code,

  cb.funded_amount_minor,
  cb.reserved_amount_minor,
  cb.issued_amount_minor,
  cb.released_amount_minor,
  cb.expired_amount_minor,
  cb.refunded_amount_minor,

  (
    cb.funded_amount_minor
    - cb.reserved_amount_minor
    - cb.issued_amount_minor
    - cb.refunded_amount_minor
  )::bigint as available_amount_minor,

  cb.status,
  cb.created_at,
  cb.updated_at
from campaign_budgets cb;

create or replace view campaign_budget_integrity_check as
select
  cb.id as campaign_budget_id,
  cb.campaign_id,

  cb.funded_amount_minor,
  cb.reserved_amount_minor,
  cb.issued_amount_minor,
  cb.released_amount_minor,
  cb.expired_amount_minor,
  cb.refunded_amount_minor,

  coalesce(sum(r.amount_minor) filter (where r.status = 'reserved'), 0)::bigint
    as reservation_reserved_minor,

  coalesce(sum(r.amount_minor) filter (where r.status = 'issued'), 0)::bigint
    as reservation_issued_minor,

  coalesce(sum(r.amount_minor) filter (where r.status = 'released'), 0)::bigint
    as reservation_released_minor,

  (
    cb.reserved_amount_minor
    - coalesce(sum(r.amount_minor) filter (where r.status = 'reserved'), 0)
  )::bigint as reserved_delta_minor,

  (
    cb.issued_amount_minor
    - coalesce(sum(r.amount_minor) filter (where r.status = 'issued'), 0)
  )::bigint as issued_delta_minor,

  (
    cb.released_amount_minor
    - coalesce(sum(r.amount_minor) filter (where r.status = 'released'), 0)
  )::bigint as released_delta_minor,

  (
    cb.funded_amount_minor
    - cb.reserved_amount_minor
    - cb.issued_amount_minor
    - cb.refunded_amount_minor
  )::bigint as available_amount_minor,

  case
    when cb.reserved_amount_minor
      <> coalesce(sum(r.amount_minor) filter (where r.status = 'reserved'), 0)
    then true

    when cb.issued_amount_minor
      <> coalesce(sum(r.amount_minor) filter (where r.status = 'issued'), 0)
    then true

    when cb.released_amount_minor
      <> coalesce(sum(r.amount_minor) filter (where r.status = 'released'), 0)
    then true

    when (
      cb.reserved_amount_minor
      + cb.issued_amount_minor
      + cb.refunded_amount_minor
    ) > cb.funded_amount_minor
    then true

    else false
  end as has_integrity_issue
from campaign_budgets cb
left join campaign_budget_reservations r
  on r.campaign_budget_id = cb.id
group by cb.id;
