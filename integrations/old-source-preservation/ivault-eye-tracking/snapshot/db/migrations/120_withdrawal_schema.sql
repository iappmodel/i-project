create table if not exists withdrawal_requests (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null,
  wallet_id uuid not null references wallets(id),

  currency_code text not null default 'USD',

  requested_amount_minor bigint not null,
  processor_fee_minor bigint not null default 0,
  net_amount_minor bigint not null,

  provider_key text not null default 'manual_demo',

  status text not null default 'requested',

  trust_gate_decision text not null default 'allowed',

  external_payout_id uuid,

  idempotency_key text not null,

  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  reserved_at timestamptz,
  submitted_at timestamptz,
  paid_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,

  failure_reason text,
  cancellation_reason text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint withdrawal_requests_currency_check
  check (currency_code in ('USD')),

  constraint withdrawal_requests_amount_check
  check (
    requested_amount_minor > 0
    and processor_fee_minor >= 0
    and net_amount_minor > 0
    and requested_amount_minor = processor_fee_minor + net_amount_minor
  ),

  constraint withdrawal_requests_status_check
  check (
    status in (
      'requested',
      'trust_review',
      'approved',
      'reserved',
      'submitted',
      'processing',
      'paid',
      'failed',
      'cancelled'
    )
  ),

  constraint withdrawal_requests_trust_gate_check
  check (
    trust_gate_decision in (
      'allowed',
      'review',
      'blocked'
    )
  )
);

create unique index if not exists withdrawal_requests_idempotency_unique
on withdrawal_requests (idempotency_key);

create index if not exists withdrawal_requests_user_idx
on withdrawal_requests (user_id, created_at desc);

create index if not exists withdrawal_requests_wallet_idx
on withdrawal_requests (wallet_id, created_at desc);

create index if not exists withdrawal_requests_status_idx
on withdrawal_requests (status, created_at asc);

drop trigger if exists withdrawal_requests_set_updated_at
on withdrawal_requests;

create trigger withdrawal_requests_set_updated_at
before update on withdrawal_requests
for each row
execute function set_updated_at();

create table if not exists withdrawal_reserved_lots (
  id uuid primary key default gen_random_uuid(),

  withdrawal_request_id uuid not null references withdrawal_requests(id),
  wallet_value_lot_id uuid not null references wallet_value_lots(id),

  user_id uuid not null,
  wallet_id uuid not null references wallets(id),

  currency_code text not null default 'USD',

  reserved_amount_minor bigint not null,

  status text not null default 'reserved',

  reserved_at timestamptz not null default now(),
  consumed_at timestamptz,
  released_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint withdrawal_reserved_lots_currency_check
  check (currency_code in ('USD')),

  constraint withdrawal_reserved_lots_amount_check
  check (reserved_amount_minor > 0),

  constraint withdrawal_reserved_lots_status_check
  check (
    status in (
      'reserved',
      'consumed',
      'released'
    )
  ),

  unique (withdrawal_request_id, wallet_value_lot_id)
);

create index if not exists withdrawal_reserved_lots_withdrawal_idx
on withdrawal_reserved_lots (withdrawal_request_id);

create index if not exists withdrawal_reserved_lots_wallet_idx
on withdrawal_reserved_lots (wallet_id, created_at desc);

create index if not exists withdrawal_reserved_lots_status_idx
on withdrawal_reserved_lots (status, created_at desc);

create table if not exists external_payouts (
  id uuid primary key default gen_random_uuid(),

  withdrawal_request_id uuid not null unique references withdrawal_requests(id),

  provider_key text not null,

  provider_payout_id text,
  provider_transfer_id text,
  processor_reference text,

  currency_code text not null default 'USD',

  amount_minor bigint not null,
  fee_minor bigint not null default 0,
  net_amount_minor bigint not null,

  status text not null default 'created',

  submitted_at timestamptz,
  processing_at timestamptz,
  paid_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,

  failure_code text,
  failure_message text,

  raw_provider_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint external_payouts_currency_check
  check (currency_code in ('USD')),

  constraint external_payouts_amount_check
  check (
    amount_minor > 0
    and fee_minor >= 0
    and net_amount_minor > 0
    and amount_minor = fee_minor + net_amount_minor
  ),

  constraint external_payouts_status_check
  check (
    status in (
      'created',
      'submitted',
      'processing',
      'paid',
      'failed',
      'cancelled'
    )
  )
);

create index if not exists external_payouts_provider_idx
on external_payouts (provider_key, provider_payout_id);

create index if not exists external_payouts_status_idx
on external_payouts (status, created_at desc);

drop trigger if exists external_payouts_set_updated_at
on external_payouts;

create trigger external_payouts_set_updated_at
before update on external_payouts
for each row
execute function set_updated_at();

alter table withdrawal_requests
  drop constraint if exists withdrawal_requests_external_payout_fk;

alter table withdrawal_requests
  add constraint withdrawal_requests_external_payout_fk
  foreign key (external_payout_id)
  references external_payouts(id);

create table if not exists withdrawal_status_events (
  id uuid primary key default gen_random_uuid(),

  withdrawal_request_id uuid not null references withdrawal_requests(id),

  user_id uuid not null,
  wallet_id uuid not null references wallets(id),

  previous_status text,
  new_status text not null,

  event_type text not null,
  reason text,

  actor_type text not null default 'system',
  actor_id uuid,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint withdrawal_status_events_actor_type_check
  check (
    actor_type in (
      'user',
      'worker',
      'admin',
      'provider',
      'system'
    )
  )
);

create index if not exists withdrawal_status_events_withdrawal_idx
on withdrawal_status_events (withdrawal_request_id, created_at asc);

create index if not exists withdrawal_status_events_wallet_idx
on withdrawal_status_events (wallet_id, created_at desc);

create or replace function record_withdrawal_status_event(
  p_withdrawal_request_id uuid,
  p_previous_status text,
  p_new_status text,
  p_event_type text,
  p_reason text default null,
  p_actor_type text default 'system',
  p_actor_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request withdrawal_requests%rowtype;
  v_event_id uuid;
begin
  select *
  into v_request
  from withdrawal_requests
  where id = p_withdrawal_request_id;

  if v_request.id is null then
    raise exception 'withdrawal request not found: %', p_withdrawal_request_id;
  end if;

  insert into withdrawal_status_events (
    withdrawal_request_id,
    user_id,
    wallet_id,
    previous_status,
    new_status,
    event_type,
    reason,
    actor_type,
    actor_id,
    metadata
  )
  values (
    v_request.id,
    v_request.user_id,
    v_request.wallet_id,
    p_previous_status,
    p_new_status,
    p_event_type,
    p_reason,
    coalesce(p_actor_type, 'system'),
    p_actor_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_event_id;

  perform append_audit_hash_chain_entry(
    'withdrawal_status_event',
    v_event_id,
    jsonb_build_object(
      'withdrawal_status_event_id', v_event_id,
      'withdrawal_request_id', v_request.id,
      'user_id', v_request.user_id,
      'wallet_id', v_request.wallet_id,
      'previous_status', p_previous_status,
      'new_status', p_new_status,
      'event_type', p_event_type,
      'reason', p_reason,
      'actor_type', coalesce(p_actor_type, 'system'),
      'actor_id', p_actor_id,
      'metadata', coalesce(p_metadata, '{}'::jsonb)
    ),
    'global_audit_chain',
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_event_id;
end;
$$;

create or replace function create_withdrawal_request(
  p_user_id uuid,
  p_wallet_id uuid,
  p_requested_amount_minor bigint,
  p_provider_key text default 'manual_demo',
  p_processor_fee_minor bigint default 0,
  p_currency_code text default 'USD',
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_wallet wallets%rowtype;
  v_withdrawal_id uuid;
  v_idempotency_key text;
  v_net_amount_minor bigint;
begin
  if p_user_id is null then
    raise exception 'user id is required';
  end if;

  if p_wallet_id is null then
    raise exception 'wallet id is required';
  end if;

  if p_requested_amount_minor <= 0 then
    raise exception 'withdrawal amount must be positive';
  end if;

  if p_processor_fee_minor < 0 then
    raise exception 'processor fee cannot be negative';
  end if;

  if p_requested_amount_minor <= p_processor_fee_minor then
    raise exception 'withdrawal amount must exceed processor fee';
  end if;

  if coalesce(p_currency_code, 'USD') <> 'USD' then
    raise exception 'unsupported currency: %', p_currency_code;
  end if;

  v_idempotency_key := coalesce(
    p_idempotency_key,
    'withdrawal_request:' || p_wallet_id::text || ':' || gen_random_uuid()::text
  );

  if exists (
    select 1
    from withdrawal_requests
    where idempotency_key = v_idempotency_key
  ) then
    select id
    into v_withdrawal_id
    from withdrawal_requests
    where idempotency_key = v_idempotency_key;

    return v_withdrawal_id;
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

  perform wallet_assert_not_fraud_locked(
    p_wallet_id,
    'create_withdrawal_request'
  );

  if v_wallet.available_balance_minor < p_requested_amount_minor then
    raise exception 'insufficient available balance';
  end if;

  v_net_amount_minor := p_requested_amount_minor - p_processor_fee_minor;

  insert into withdrawal_requests (
    user_id,
    wallet_id,
    currency_code,
    requested_amount_minor,
    processor_fee_minor,
    net_amount_minor,
    provider_key,
    status,
    trust_gate_decision,
    approved_at,
    idempotency_key,
    metadata
  )
  values (
    p_user_id,
    p_wallet_id,
    'USD',
    p_requested_amount_minor,
    p_processor_fee_minor,
    v_net_amount_minor,
    coalesce(p_provider_key, 'manual_demo'),
    'approved',
    'allowed',
    now(),
    v_idempotency_key,
    p_metadata
  )
  returning id into v_withdrawal_id;

  perform record_withdrawal_status_event(
    v_withdrawal_id,
    null,
    'approved',
    'withdrawal_requested_approved',
    'basic wallet gate allowed withdrawal',
    'user',
    p_user_id,
    p_metadata
  );

  return v_withdrawal_id;
end;
$$;

create or replace function reserve_wallet_funds_for_withdrawal(
  p_withdrawal_request_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request withdrawal_requests%rowtype;
  v_lot record;

  v_remaining bigint;
  v_take bigint;
  v_total_reserved bigint := 0;

  v_previous_status text;
begin
  if p_withdrawal_request_id is null then
    raise exception 'withdrawal request id is required';
  end if;

  select *
  into v_request
  from withdrawal_requests
  where id = p_withdrawal_request_id
  for update;

  if v_request.id is null then
    raise exception 'withdrawal request not found: %', p_withdrawal_request_id;
  end if;

  if v_request.status = 'reserved' then
    return v_request.id;
  end if;

  if v_request.status <> 'approved' then
    raise exception 'withdrawal must be approved before reserve. status %', v_request.status;
  end if;

  perform wallet_assert_not_fraud_locked(
    v_request.wallet_id,
    'reserve_withdrawal'
  );

  if not exists (
    select 1
    from wallets
    where id = v_request.wallet_id
      and available_balance_minor >= v_request.requested_amount_minor
  ) then
    raise exception 'insufficient available balance';
  end if;

  v_remaining := v_request.requested_amount_minor;

  for v_lot in
    select *
    from wallet_value_lots
    where wallet_id = v_request.wallet_id
      and user_id = v_request.user_id
      and status = 'available'
      and remaining_amount_minor > 0
    order by available_at asc nulls last, created_at asc
    for update
  loop
    exit when v_remaining <= 0;

    v_take := least(v_lot.remaining_amount_minor, v_remaining);

    update wallet_value_lots
    set
      remaining_amount_minor = remaining_amount_minor - v_take,
      status =
        case
          when remaining_amount_minor - v_take = 0 then 'reserved'
          else status
        end,
      metadata = metadata || p_metadata || jsonb_build_object(
        'withdrawal_request_id',
        v_request.id
      ),
      updated_at = now()
    where id = v_lot.id;

    insert into withdrawal_reserved_lots (
      withdrawal_request_id,
      wallet_value_lot_id,
      user_id,
      wallet_id,
      currency_code,
      reserved_amount_minor,
      status,
      metadata
    )
    values (
      v_request.id,
      v_lot.id,
      v_request.user_id,
      v_request.wallet_id,
      v_request.currency_code,
      v_take,
      'reserved',
      p_metadata
    );

    v_total_reserved := v_total_reserved + v_take;
    v_remaining := v_remaining - v_take;
  end loop;

  if v_total_reserved <> v_request.requested_amount_minor then
    raise exception 'unable to reserve exact withdrawal amount';
  end if;

  perform post_wallet_ledger_entry(
    v_request.wallet_id,
    v_request.user_id,
    'withdrawal_reserved',
    'withdrawal_request',
    v_request.id,
    -v_request.requested_amount_minor,
    0,
    v_request.requested_amount_minor,
    v_request.currency_code,
    'withdrawal_reserved:' || v_request.id::text,
    p_metadata
  );

  v_previous_status := v_request.status;

  update withdrawal_requests
  set
    status = 'reserved',
    reserved_at = now(),
    updated_at = now(),
    metadata = metadata || p_metadata
  where id = v_request.id;

  perform record_withdrawal_status_event(
    v_request.id,
    v_previous_status,
    'reserved',
    'withdrawal_funds_reserved',
    null,
    'worker',
    null,
    p_metadata
  );

  return v_request.id;
end;
$$;

create or replace function submit_withdrawal_to_provider(
  p_withdrawal_request_id uuid,
  p_provider_key text default 'manual_demo',
  p_provider_payout_id text default null,
  p_provider_transfer_id text default null,
  p_processor_reference text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request withdrawal_requests%rowtype;
  v_payout_id uuid;
  v_previous_status text;
begin
  select *
  into v_request
  from withdrawal_requests
  where id = p_withdrawal_request_id
  for update;

  if v_request.id is null then
    raise exception 'withdrawal request not found: %', p_withdrawal_request_id;
  end if;

  if v_request.status = 'submitted'
    or v_request.status = 'processing'
    or v_request.status = 'paid' then
    select id
    into v_payout_id
    from external_payouts
    where withdrawal_request_id = v_request.id;

    return v_payout_id;
  end if;

  if v_request.status <> 'reserved' then
    raise exception 'withdrawal must be reserved before submit. status %', v_request.status;
  end if;

  insert into external_payouts (
    withdrawal_request_id,
    provider_key,
    provider_payout_id,
    provider_transfer_id,
    processor_reference,
    currency_code,
    amount_minor,
    fee_minor,
    net_amount_minor,
    status,
    submitted_at,
    metadata
  )
  values (
    v_request.id,
    coalesce(p_provider_key, v_request.provider_key),
    p_provider_payout_id,
    p_provider_transfer_id,
    p_processor_reference,
    v_request.currency_code,
    v_request.requested_amount_minor,
    v_request.processor_fee_minor,
    v_request.net_amount_minor,
    'submitted',
    now(),
    p_metadata
  )
  on conflict (withdrawal_request_id)
  do update set
    provider_payout_id = coalesce(excluded.provider_payout_id, external_payouts.provider_payout_id),
    provider_transfer_id = coalesce(excluded.provider_transfer_id, external_payouts.provider_transfer_id),
    processor_reference = coalesce(excluded.processor_reference, external_payouts.processor_reference),
    metadata = external_payouts.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_payout_id;

  v_previous_status := v_request.status;

  update withdrawal_requests
  set
    status = 'submitted',
    submitted_at = now(),
    external_payout_id = v_payout_id,
    updated_at = now(),
    metadata = metadata || p_metadata
  where id = v_request.id;

  perform record_withdrawal_status_event(
    v_request.id,
    v_previous_status,
    'submitted',
    'withdrawal_submitted_to_provider',
    null,
    'worker',
    null,
    p_metadata || jsonb_build_object(
      'external_payout_id',
      v_payout_id
    )
  );

  return v_payout_id;
end;
$$;

create or replace function mark_withdrawal_paid(
  p_withdrawal_request_id uuid,
  p_external_payout_id uuid default null,
  p_provider_reference text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request withdrawal_requests%rowtype;
  v_payout external_payouts%rowtype;
  v_reserved_sum bigint;
  v_previous_status text;
begin
  select *
  into v_request
  from withdrawal_requests
  where id = p_withdrawal_request_id
  for update;

  if v_request.id is null then
    raise exception 'withdrawal request not found: %', p_withdrawal_request_id;
  end if;

  if v_request.status = 'paid' then
    return v_request.id;
  end if;

  if v_request.status not in ('submitted', 'processing') then
    raise exception 'withdrawal must be submitted/processing before paid. status %', v_request.status;
  end if;

  select coalesce(sum(reserved_amount_minor), 0)
  into v_reserved_sum
  from withdrawal_reserved_lots
  where withdrawal_request_id = v_request.id
    and status = 'reserved';

  if v_reserved_sum <> v_request.requested_amount_minor then
    raise exception 'reserved withdrawal lot sum mismatch';
  end if;

  select *
  into v_payout
  from external_payouts
  where id = coalesce(p_external_payout_id, v_request.external_payout_id)
     or withdrawal_request_id = v_request.id
  order by created_at desc
  limit 1
  for update;

  if v_payout.id is null then
    raise exception 'external payout not found for withdrawal';
  end if;

  update withdrawal_reserved_lots
  set
    status = 'consumed',
    consumed_at = now(),
    metadata = metadata || p_metadata
  where withdrawal_request_id = v_request.id
    and status = 'reserved';

  perform post_wallet_ledger_entry(
    v_request.wallet_id,
    v_request.user_id,
    'withdrawal_paid',
    'withdrawal_request',
    v_request.id,
    0,
    0,
    -v_request.requested_amount_minor,
    v_request.currency_code,
    'withdrawal_paid:' || v_request.id::text,
    p_metadata || jsonb_build_object(
      'external_payout_id',
      v_payout.id,
      'provider_reference',
      p_provider_reference
    )
  );

  update external_payouts
  set
    status = 'paid',
    paid_at = now(),
    processor_reference = coalesce(p_provider_reference, processor_reference),
    metadata = metadata || p_metadata,
    updated_at = now()
  where id = v_payout.id;

  v_previous_status := v_request.status;

  update withdrawal_requests
  set
    status = 'paid',
    paid_at = now(),
    external_payout_id = v_payout.id,
    updated_at = now(),
    metadata = metadata || p_metadata
  where id = v_request.id;

  perform record_withdrawal_status_event(
    v_request.id,
    v_previous_status,
    'paid',
    'withdrawal_paid',
    null,
    'provider',
    null,
    p_metadata || jsonb_build_object(
      'external_payout_id',
      v_payout.id
    )
  );

  return v_request.id;
end;
$$;

create or replace function mark_withdrawal_failed_and_release(
  p_withdrawal_request_id uuid,
  p_failure_reason text,
  p_external_payout_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request withdrawal_requests%rowtype;
  v_reserved_sum bigint;
  v_previous_status text;
begin
  if p_failure_reason is null or length(trim(p_failure_reason)) = 0 then
    raise exception 'failure reason is required';
  end if;

  select *
  into v_request
  from withdrawal_requests
  where id = p_withdrawal_request_id
  for update;

  if v_request.id is null then
    raise exception 'withdrawal request not found: %', p_withdrawal_request_id;
  end if;

  if v_request.status = 'failed' then
    return v_request.id;
  end if;

  if v_request.status not in ('reserved', 'submitted', 'processing') then
    raise exception 'withdrawal cannot fail/release from status %', v_request.status;
  end if;

  select coalesce(sum(reserved_amount_minor), 0)
  into v_reserved_sum
  from withdrawal_reserved_lots
  where withdrawal_request_id = v_request.id
    and status = 'reserved';

  if v_reserved_sum <> v_request.requested_amount_minor then
    raise exception 'reserved withdrawal lot sum mismatch';
  end if;

  update withdrawal_reserved_lots
  set
    status = 'released',
    released_at = now(),
    metadata = metadata || p_metadata
  where withdrawal_request_id = v_request.id
    and status = 'reserved';

  update wallet_value_lots wvl
  set
    remaining_amount_minor = remaining_amount_minor + wrl.reserved_amount_minor,
    status = 'available',
    updated_at = now(),
    metadata = wvl.metadata || p_metadata || jsonb_build_object(
      'withdrawal_released_id',
      v_request.id
    )
  from withdrawal_reserved_lots wrl
  where wrl.wallet_value_lot_id = wvl.id
    and wrl.withdrawal_request_id = v_request.id
    and wrl.status = 'released';

  perform post_wallet_ledger_entry(
    v_request.wallet_id,
    v_request.user_id,
    'withdrawal_failed_released',
    'withdrawal_request',
    v_request.id,
    v_request.requested_amount_minor,
    0,
    -v_request.requested_amount_minor,
    v_request.currency_code,
    'withdrawal_failed_released:' || v_request.id::text,
    p_metadata || jsonb_build_object(
      'external_payout_id',
      p_external_payout_id,
      'failure_reason',
      p_failure_reason
    )
  );

  update external_payouts
  set
    status = 'failed',
    failed_at = now(),
    failure_message = p_failure_reason,
    metadata = metadata || p_metadata,
    updated_at = now()
  where id = coalesce(p_external_payout_id, v_request.external_payout_id);

  v_previous_status := v_request.status;

  update withdrawal_requests
  set
    status = 'failed',
    failed_at = now(),
    failure_reason = p_failure_reason,
    updated_at = now(),
    metadata = metadata || p_metadata
  where id = v_request.id;

  perform record_withdrawal_status_event(
    v_request.id,
    v_previous_status,
    'failed',
    'withdrawal_failed_funds_released',
    p_failure_reason,
    'provider',
    null,
    p_metadata
  );

  return v_request.id;
end;
$$;

create or replace function run_withdrawal_reserve_job(
  p_batch_size integer default 100,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_row record;
begin
  for v_row in
    select id
    from withdrawal_requests
    where status = 'approved'
    order by created_at asc
    limit p_batch_size
    for update skip locked
  loop
    perform reserve_wallet_funds_for_withdrawal(
      v_row.id,
      p_metadata || jsonb_build_object(
        'withdrawal_reserve_run_id',
        v_run_id
      )
    );
  end loop;

  return v_run_id;
end;
$$;

create or replace view app_withdrawal_summary as
select
  id as withdrawal_request_id,
  user_id,
  wallet_id,
  currency_code,

  requested_amount_minor,
  processor_fee_minor,
  net_amount_minor,

  status,

  requested_at,
  approved_at,
  reserved_at,
  submitted_at,
  paid_at,
  failed_at,
  cancelled_at,

  case
    when status = 'failed' then failure_reason
    when status = 'cancelled' then cancellation_reason
    else null
  end as visible_status_reason,

  created_at,
  updated_at
from withdrawal_requests;

create or replace view admin_withdrawal_detail as
select
  wr.id as withdrawal_request_id,
  wr.user_id,
  wr.wallet_id,
  wr.currency_code,

  wr.requested_amount_minor,
  wr.processor_fee_minor,
  wr.net_amount_minor,

  wr.provider_key,
  wr.status,
  wr.trust_gate_decision,

  wr.external_payout_id,
  ep.status as external_payout_status,
  ep.provider_payout_id,
  ep.provider_transfer_id,
  ep.processor_reference,

  wr.requested_at,
  wr.approved_at,
  wr.reserved_at,
  wr.submitted_at,
  wr.paid_at,
  wr.failed_at,
  wr.cancelled_at,

  wr.failure_reason,
  wr.cancellation_reason,

  (
    select count(*)
    from withdrawal_reserved_lots wrl
    where wrl.withdrawal_request_id = wr.id
  ) as reserved_lot_count,

  (
    select coalesce(sum(reserved_amount_minor), 0)
    from withdrawal_reserved_lots wrl
    where wrl.withdrawal_request_id = wr.id
      and wrl.status = 'reserved'
  )::bigint as currently_reserved_minor,

  (
    select coalesce(sum(reserved_amount_minor), 0)
    from withdrawal_reserved_lots wrl
    where wrl.withdrawal_request_id = wr.id
      and wrl.status = 'consumed'
  )::bigint as consumed_reserved_minor,

  (
    select coalesce(sum(reserved_amount_minor), 0)
    from withdrawal_reserved_lots wrl
    where wrl.withdrawal_request_id = wr.id
      and wrl.status = 'released'
  )::bigint as released_reserved_minor,

  wr.metadata,
  wr.created_at,
  wr.updated_at
from withdrawal_requests wr
left join external_payouts ep
  on ep.id = wr.external_payout_id;

create or replace view withdrawal_integrity_check as
select
  wr.id as withdrawal_request_id,
  wr.status,
  wr.requested_amount_minor,

  coalesce(sum(wrl.reserved_amount_minor) filter (where wrl.status = 'reserved'), 0)::bigint
    as reserved_minor,

  coalesce(sum(wrl.reserved_amount_minor) filter (where wrl.status = 'consumed'), 0)::bigint
    as consumed_minor,

  coalesce(sum(wrl.reserved_amount_minor) filter (where wrl.status = 'released'), 0)::bigint
    as released_minor,

  case
    when wr.status in ('reserved', 'submitted', 'processing')
      and coalesce(sum(wrl.reserved_amount_minor) filter (where wrl.status = 'reserved'), 0) <> wr.requested_amount_minor
    then true

    when wr.status = 'paid'
      and coalesce(sum(wrl.reserved_amount_minor) filter (where wrl.status = 'consumed'), 0) <> wr.requested_amount_minor
    then true

    when wr.status = 'failed'
      and coalesce(sum(wrl.reserved_amount_minor) filter (where wrl.status = 'released'), 0) <> wr.requested_amount_minor
    then true

    else false
  end as has_integrity_issue
from withdrawal_requests wr
left join withdrawal_reserved_lots wrl
  on wrl.withdrawal_request_id = wr.id
group by wr.id;
