create table if not exists withdrawal_limit_policies (
  id uuid primary key default gen_random_uuid(),

  policy_key text not null unique,

  status text not null default 'active',

  currency_code text not null default 'USD',

  min_withdrawal_amount_minor bigint not null default 100,
  max_withdrawal_amount_minor bigint not null default 100000,

  daily_limit_minor bigint not null default 100000,
  weekly_limit_minor bigint not null default 500000,
  monthly_limit_minor bigint not null default 1000000,

  daily_count_limit integer not null default 5,
  weekly_count_limit integer not null default 20,
  monthly_count_limit integer not null default 50,

  cooldown_seconds integer not null default 300,

  require_review_above_minor bigint not null default 50000,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint withdrawal_limit_policies_status_check
  check (
    status in (
      'active',
      'paused',
      'archived'
    )
  ),

  constraint withdrawal_limit_policies_currency_check
  check (currency_code in ('USD')),

  constraint withdrawal_limit_policies_amount_check
  check (
    min_withdrawal_amount_minor > 0
    and max_withdrawal_amount_minor >= min_withdrawal_amount_minor
    and daily_limit_minor > 0
    and weekly_limit_minor >= daily_limit_minor
    and monthly_limit_minor >= weekly_limit_minor
    and daily_count_limit > 0
    and weekly_count_limit >= daily_count_limit
    and monthly_count_limit >= weekly_count_limit
    and cooldown_seconds >= 0
    and require_review_above_minor >= min_withdrawal_amount_minor
  )
);

create index if not exists withdrawal_limit_policies_status_idx
on withdrawal_limit_policies (status);

drop trigger if exists withdrawal_limit_policies_set_updated_at
on withdrawal_limit_policies;

create trigger withdrawal_limit_policies_set_updated_at
before update on withdrawal_limit_policies
for each row
execute function set_updated_at();

insert into withdrawal_limit_policies (
  policy_key,
  status,
  currency_code,
  min_withdrawal_amount_minor,
  max_withdrawal_amount_minor,
  daily_limit_minor,
  weekly_limit_minor,
  monthly_limit_minor,
  daily_count_limit,
  weekly_count_limit,
  monthly_count_limit,
  cooldown_seconds,
  require_review_above_minor,
  metadata
)
values (
  'default_withdrawal_limits_v1',
  'active',
  'USD',
  100,
  100000,
  100000,
  500000,
  1000000,
  5,
  20,
  50,
  300,
  50000,
  '{"meaning": "default withdrawal limit policy for MVP"}'::jsonb
)
on conflict (policy_key)
do update set
  status = excluded.status,
  min_withdrawal_amount_minor = excluded.min_withdrawal_amount_minor,
  max_withdrawal_amount_minor = excluded.max_withdrawal_amount_minor,
  daily_limit_minor = excluded.daily_limit_minor,
  weekly_limit_minor = excluded.weekly_limit_minor,
  monthly_limit_minor = excluded.monthly_limit_minor,
  daily_count_limit = excluded.daily_count_limit,
  weekly_count_limit = excluded.weekly_count_limit,
  monthly_count_limit = excluded.monthly_count_limit,
  cooldown_seconds = excluded.cooldown_seconds,
  require_review_above_minor = excluded.require_review_above_minor,
  metadata = withdrawal_limit_policies.metadata || excluded.metadata,
  updated_at = now();

create table if not exists withdrawal_trust_gate_evaluations (
  id uuid primary key default gen_random_uuid(),

  withdrawal_request_id uuid references withdrawal_requests(id),

  user_id uuid not null,
  wallet_id uuid not null references wallets(id),

  policy_key text not null,

  requested_amount_minor bigint not null,
  currency_code text not null default 'USD',

  decision text not null,

  reason_code text not null,
  reason_message text,

  daily_withdrawn_minor bigint not null default 0,
  weekly_withdrawn_minor bigint not null default 0,
  monthly_withdrawn_minor bigint not null default 0,

  daily_withdrawal_count integer not null default 0,
  weekly_withdrawal_count integer not null default 0,
  monthly_withdrawal_count integer not null default 0,

  seconds_since_last_withdrawal integer,

  wallet_status text,
  available_balance_minor bigint,

  risk_score numeric(6, 4) not null default 0.0000,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint withdrawal_trust_gate_evaluations_currency_check
  check (currency_code in ('USD')),

  constraint withdrawal_trust_gate_evaluations_decision_check
  check (
    decision in (
      'allowed',
      'review',
      'blocked'
    )
  ),

  constraint withdrawal_trust_gate_evaluations_risk_score_check
  check (
    risk_score >= 0 and risk_score <= 1
  )
);

create index if not exists withdrawal_trust_gate_evaluations_user_idx
on withdrawal_trust_gate_evaluations (user_id, created_at desc);

create index if not exists withdrawal_trust_gate_evaluations_wallet_idx
on withdrawal_trust_gate_evaluations (wallet_id, created_at desc);

create index if not exists withdrawal_trust_gate_evaluations_decision_idx
on withdrawal_trust_gate_evaluations (decision, created_at desc);

create index if not exists withdrawal_trust_gate_evaluations_withdrawal_idx
on withdrawal_trust_gate_evaluations (withdrawal_request_id);

create table if not exists withdrawal_review_queue (
  id uuid primary key default gen_random_uuid(),

  withdrawal_request_id uuid not null unique references withdrawal_requests(id),

  user_id uuid not null,
  wallet_id uuid not null references wallets(id),

  trust_gate_evaluation_id uuid references withdrawal_trust_gate_evaluations(id),

  status text not null default 'open',

  priority text not null default 'medium',

  reason_code text not null,
  reason_message text,

  requested_amount_minor bigint not null,
  currency_code text not null default 'USD',

  assigned_to text,

  reviewed_by text,
  reviewed_at timestamptz,

  review_decision text,
  review_note text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint withdrawal_review_queue_status_check
  check (
    status in (
      'open',
      'assigned',
      'approved',
      'blocked',
      'cancelled'
    )
  ),

  constraint withdrawal_review_queue_priority_check
  check (
    priority in (
      'low',
      'medium',
      'high',
      'critical'
    )
  ),

  constraint withdrawal_review_queue_review_decision_check
  check (
    review_decision is null
    or review_decision in (
      'approved',
      'blocked',
      'cancelled'
    )
  ),

  constraint withdrawal_review_queue_currency_check
  check (currency_code in ('USD'))
);

create index if not exists withdrawal_review_queue_status_idx
on withdrawal_review_queue (status, priority, created_at asc);

create index if not exists withdrawal_review_queue_wallet_idx
on withdrawal_review_queue (wallet_id, created_at desc);

drop trigger if exists withdrawal_review_queue_set_updated_at
on withdrawal_review_queue;

create trigger withdrawal_review_queue_set_updated_at
before update on withdrawal_review_queue
for each row
execute function set_updated_at();

create or replace function get_active_withdrawal_limit_policy()
returns withdrawal_limit_policies
language plpgsql
stable
as $$
declare
  v_policy withdrawal_limit_policies%rowtype;
begin
  select *
  into v_policy
  from withdrawal_limit_policies
  where status = 'active'
  order by updated_at desc
  limit 1;

  if v_policy.id is null then
    raise exception 'no active withdrawal limit policy found';
  end if;

  return v_policy;
end;
$$;

create or replace function evaluate_withdrawal_trust_gate(
  p_user_id uuid,
  p_wallet_id uuid,
  p_requested_amount_minor bigint,
  p_currency_code text default 'USD',
  p_withdrawal_request_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_wallet wallets%rowtype;
  v_policy withdrawal_limit_policies%rowtype;

  v_daily_withdrawn bigint := 0;
  v_weekly_withdrawn bigint := 0;
  v_monthly_withdrawn bigint := 0;

  v_daily_count integer := 0;
  v_weekly_count integer := 0;
  v_monthly_count integer := 0;

  v_last_withdrawal_at timestamptz;
  v_seconds_since_last integer;

  v_decision text := 'allowed';
  v_reason_code text := 'allowed';
  v_reason_message text := 'Withdrawal allowed.';

  v_risk_score numeric(6, 4) := 0.0000;

  v_evaluation_id uuid;
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

  if coalesce(p_currency_code, 'USD') <> 'USD' then
    raise exception 'unsupported currency: %', p_currency_code;
  end if;

  v_policy := get_active_withdrawal_limit_policy();

  select *
  into v_wallet
  from wallets
  where id = p_wallet_id;

  if v_wallet.id is null then
    raise exception 'wallet not found: %', p_wallet_id;
  end if;

  if v_wallet.user_id <> p_user_id then
    raise exception 'wallet/user mismatch';
  end if;

  select
    coalesce(sum(requested_amount_minor), 0),
    count(*)
  into
    v_daily_withdrawn,
    v_daily_count
  from withdrawal_requests
  where wallet_id = p_wallet_id
    and status in ('approved', 'reserved', 'submitted', 'processing', 'paid')
    and created_at >= now() - interval '24 hours';

  select
    coalesce(sum(requested_amount_minor), 0),
    count(*)
  into
    v_weekly_withdrawn,
    v_weekly_count
  from withdrawal_requests
  where wallet_id = p_wallet_id
    and status in ('approved', 'reserved', 'submitted', 'processing', 'paid')
    and created_at >= now() - interval '7 days';

  select
    coalesce(sum(requested_amount_minor), 0),
    count(*)
  into
    v_monthly_withdrawn,
    v_monthly_count
  from withdrawal_requests
  where wallet_id = p_wallet_id
    and status in ('approved', 'reserved', 'submitted', 'processing', 'paid')
    and created_at >= now() - interval '30 days';

  select max(created_at)
  into v_last_withdrawal_at
  from withdrawal_requests
  where wallet_id = p_wallet_id
    and status in ('approved', 'reserved', 'submitted', 'processing', 'paid');

  if v_last_withdrawal_at is not null then
    v_seconds_since_last := extract(epoch from (now() - v_last_withdrawal_at))::integer;
  end if;

  if v_wallet.status in ('fraud_locked', 'locked', 'closed') then
    v_decision := 'blocked';
    v_reason_code := 'wallet_not_available';
    v_reason_message := 'Wallet is not available for withdrawal.';
    v_risk_score := 1.0000;

  elsif v_wallet.available_balance_minor < p_requested_amount_minor then
    v_decision := 'blocked';
    v_reason_code := 'insufficient_available_balance';
    v_reason_message := 'Insufficient available balance.';
    v_risk_score := 0.9000;

  elsif p_requested_amount_minor < v_policy.min_withdrawal_amount_minor then
    v_decision := 'blocked';
    v_reason_code := 'below_minimum_withdrawal';
    v_reason_message := 'Withdrawal amount is below the minimum.';
    v_risk_score := 0.3000;

  elsif p_requested_amount_minor > v_policy.max_withdrawal_amount_minor then
    v_decision := 'blocked';
    v_reason_code := 'above_maximum_withdrawal';
    v_reason_message := 'Withdrawal amount is above the maximum.';
    v_risk_score := 0.7000;

  elsif v_daily_withdrawn + p_requested_amount_minor > v_policy.daily_limit_minor then
    v_decision := 'blocked';
    v_reason_code := 'daily_amount_limit_exceeded';
    v_reason_message := 'Daily withdrawal limit exceeded.';
    v_risk_score := 0.8000;

  elsif v_weekly_withdrawn + p_requested_amount_minor > v_policy.weekly_limit_minor then
    v_decision := 'blocked';
    v_reason_code := 'weekly_amount_limit_exceeded';
    v_reason_message := 'Weekly withdrawal limit exceeded.';
    v_risk_score := 0.8000;

  elsif v_monthly_withdrawn + p_requested_amount_minor > v_policy.monthly_limit_minor then
    v_decision := 'blocked';
    v_reason_code := 'monthly_amount_limit_exceeded';
    v_reason_message := 'Monthly withdrawal limit exceeded.';
    v_risk_score := 0.8000;

  elsif v_daily_count + 1 > v_policy.daily_count_limit then
    v_decision := 'blocked';
    v_reason_code := 'daily_count_limit_exceeded';
    v_reason_message := 'Daily withdrawal count limit exceeded.';
    v_risk_score := 0.7500;

  elsif v_weekly_count + 1 > v_policy.weekly_count_limit then
    v_decision := 'blocked';
    v_reason_code := 'weekly_count_limit_exceeded';
    v_reason_message := 'Weekly withdrawal count limit exceeded.';
    v_risk_score := 0.7500;

  elsif v_monthly_count + 1 > v_policy.monthly_count_limit then
    v_decision := 'blocked';
    v_reason_code := 'monthly_count_limit_exceeded';
    v_reason_message := 'Monthly withdrawal count limit exceeded.';
    v_risk_score := 0.7500;

  elsif v_seconds_since_last is not null
    and v_seconds_since_last < v_policy.cooldown_seconds then
    v_decision := 'blocked';
    v_reason_code := 'withdrawal_cooldown_active';
    v_reason_message := 'Please wait before making another withdrawal.';
    v_risk_score := 0.5000;

  elsif p_requested_amount_minor >= v_policy.require_review_above_minor then
    v_decision := 'review';
    v_reason_code := 'manual_review_required_amount';
    v_reason_message := 'Withdrawal requires review.';
    v_risk_score := 0.6500;

  else
    v_decision := 'allowed';
    v_reason_code := 'allowed';
    v_reason_message := 'Withdrawal allowed.';
    v_risk_score := 0.0500;
  end if;

  insert into withdrawal_trust_gate_evaluations (
    withdrawal_request_id,
    user_id,
    wallet_id,
    policy_key,
    requested_amount_minor,
    currency_code,
    decision,
    reason_code,
    reason_message,
    daily_withdrawn_minor,
    weekly_withdrawn_minor,
    monthly_withdrawn_minor,
    daily_withdrawal_count,
    weekly_withdrawal_count,
    monthly_withdrawal_count,
    seconds_since_last_withdrawal,
    wallet_status,
    available_balance_minor,
    risk_score,
    metadata
  )
  values (
    p_withdrawal_request_id,
    p_user_id,
    p_wallet_id,
    v_policy.policy_key,
    p_requested_amount_minor,
    'USD',
    v_decision,
    v_reason_code,
    v_reason_message,
    v_daily_withdrawn,
    v_weekly_withdrawn,
    v_monthly_withdrawn,
    v_daily_count,
    v_weekly_count,
    v_monthly_count,
    v_seconds_since_last,
    v_wallet.status,
    v_wallet.available_balance_minor,
    v_risk_score,
    p_metadata
  )
  returning id into v_evaluation_id;

  return v_evaluation_id;
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

  v_evaluation_id uuid;
  v_evaluation withdrawal_trust_gate_evaluations%rowtype;

  v_initial_status text;
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

  v_evaluation_id := evaluate_withdrawal_trust_gate(
    p_user_id,
    p_wallet_id,
    p_requested_amount_minor,
    p_currency_code,
    null,
    p_metadata
  );

  select *
  into v_evaluation
  from withdrawal_trust_gate_evaluations
  where id = v_evaluation_id;

  if v_evaluation.decision = 'blocked' then
    raise exception 'withdrawal blocked by trust gate: %', v_evaluation.reason_code;
  end if;

  v_net_amount_minor := p_requested_amount_minor - p_processor_fee_minor;

  v_initial_status :=
    case
      when v_evaluation.decision = 'review' then 'trust_review'
      else 'approved'
    end;

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
    v_initial_status,
    v_evaluation.decision,
    v_idempotency_key,
    p_metadata || jsonb_build_object(
      'trust_gate_evaluation_id',
      v_evaluation_id,
      'trust_gate_reason_code',
      v_evaluation.reason_code
    )
  )
  returning id into v_withdrawal_id;

  update withdrawal_trust_gate_evaluations
  set withdrawal_request_id = v_withdrawal_id
  where id = v_evaluation_id;

  perform record_withdrawal_status_event(
    v_withdrawal_id,
    null,
    v_initial_status,
    case
      when v_initial_status = 'trust_review'
      then 'withdrawal_requested_needs_review'
      else 'withdrawal_requested_approved'
    end,
    v_evaluation.reason_message,
    'user',
    p_user_id,
    p_metadata || jsonb_build_object(
      'trust_gate_evaluation_id',
      v_evaluation_id,
      'trust_gate_decision',
      v_evaluation.decision,
      'trust_gate_reason_code',
      v_evaluation.reason_code
    )
  );

  if v_evaluation.decision = 'review' then
    insert into withdrawal_review_queue (
      withdrawal_request_id,
      user_id,
      wallet_id,
      trust_gate_evaluation_id,
      status,
      priority,
      reason_code,
      reason_message,
      requested_amount_minor,
      currency_code,
      metadata
    )
    values (
      v_withdrawal_id,
      p_user_id,
      p_wallet_id,
      v_evaluation_id,
      'open',
      case
        when v_evaluation.risk_score >= 0.8500 then 'critical'
        when v_evaluation.risk_score >= 0.6500 then 'high'
        else 'medium'
      end,
      v_evaluation.reason_code,
      v_evaluation.reason_message,
      p_requested_amount_minor,
      'USD',
      p_metadata
    );
  end if;

  return v_withdrawal_id;
end;
$$;

create or replace function approve_withdrawal_review(
  p_withdrawal_request_id uuid,
  p_reviewed_by text,
  p_review_note text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request withdrawal_requests%rowtype;
begin
  if p_reviewed_by is null or length(trim(p_reviewed_by)) = 0 then
    raise exception 'reviewed_by is required';
  end if;

  select *
  into v_request
  from withdrawal_requests
  where id = p_withdrawal_request_id
  for update;

  if v_request.id is null then
    raise exception 'withdrawal request not found: %', p_withdrawal_request_id;
  end if;

  if v_request.status <> 'trust_review' then
    raise exception 'withdrawal is not in trust review';
  end if;

  update withdrawal_requests
  set
    status = 'approved',
    approved_at = now(),
    trust_gate_decision = 'allowed',
    metadata = metadata || p_metadata || jsonb_build_object(
      'reviewed_by',
      p_reviewed_by,
      'review_note',
      p_review_note
    ),
    updated_at = now()
  where id = v_request.id;

  update withdrawal_review_queue
  set
    status = 'approved',
    reviewed_by = p_reviewed_by,
    reviewed_at = now(),
    review_decision = 'approved',
    review_note = p_review_note,
    metadata = metadata || p_metadata
  where withdrawal_request_id = v_request.id;

  perform record_withdrawal_status_event(
    v_request.id,
    v_request.status,
    'approved',
    'withdrawal_review_approved',
    p_review_note,
    'admin',
    null,
    p_metadata || jsonb_build_object(
      'reviewed_by',
      p_reviewed_by
    )
  );

  return v_request.id;
end;
$$;

create or replace function block_withdrawal_review(
  p_withdrawal_request_id uuid,
  p_reviewed_by text,
  p_review_note text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request withdrawal_requests%rowtype;
begin
  if p_reviewed_by is null or length(trim(p_reviewed_by)) = 0 then
    raise exception 'reviewed_by is required';
  end if;

  if p_review_note is null or length(trim(p_review_note)) = 0 then
    raise exception 'review note is required';
  end if;

  select *
  into v_request
  from withdrawal_requests
  where id = p_withdrawal_request_id
  for update;

  if v_request.id is null then
    raise exception 'withdrawal request not found: %', p_withdrawal_request_id;
  end if;

  if v_request.status <> 'trust_review' then
    raise exception 'withdrawal is not in trust review';
  end if;

  update withdrawal_requests
  set
    status = 'cancelled',
    cancelled_at = now(),
    cancellation_reason = p_review_note,
    trust_gate_decision = 'blocked',
    metadata = metadata || p_metadata || jsonb_build_object(
      'reviewed_by',
      p_reviewed_by,
      'review_note',
      p_review_note
    ),
    updated_at = now()
  where id = v_request.id;

  update withdrawal_review_queue
  set
    status = 'blocked',
    reviewed_by = p_reviewed_by,
    reviewed_at = now(),
    review_decision = 'blocked',
    review_note = p_review_note,
    metadata = metadata || p_metadata
  where withdrawal_request_id = v_request.id;

  perform record_withdrawal_status_event(
    v_request.id,
    v_request.status,
    'cancelled',
    'withdrawal_review_blocked',
    p_review_note,
    'admin',
    null,
    p_metadata || jsonb_build_object(
      'reviewed_by',
      p_reviewed_by
    )
  );

  return v_request.id;
end;
$$;

create or replace view admin_withdrawal_review_queue as
select
  wrq.id as withdrawal_review_queue_id,
  wrq.withdrawal_request_id,

  wrq.user_id,
  wrq.wallet_id,

  wrq.status,
  wrq.priority,

  wrq.reason_code,
  wrq.reason_message,

  wrq.requested_amount_minor,
  wrq.currency_code,

  wrq.assigned_to,

  wrq.reviewed_by,
  wrq.reviewed_at,
  wrq.review_decision,
  wrq.review_note,

  wr.status as withdrawal_status,
  wr.trust_gate_decision,

  w.available_balance_minor,
  w.pending_balance_minor,
  w.locked_balance_minor,
  w.total_balance_minor,
  w.status as wallet_status,

  wrq.created_at,
  wrq.updated_at,
  wrq.metadata

from withdrawal_review_queue wrq
join withdrawal_requests wr
  on wr.id = wrq.withdrawal_request_id
join wallets w
  on w.id = wrq.wallet_id;

create or replace view admin_withdrawal_trust_gate_detail as
select
  wtge.id as withdrawal_trust_gate_evaluation_id,
  wtge.withdrawal_request_id,

  wtge.user_id,
  wtge.wallet_id,

  wtge.policy_key,

  wtge.requested_amount_minor,
  wtge.currency_code,

  wtge.decision,
  wtge.reason_code,
  wtge.reason_message,

  wtge.daily_withdrawn_minor,
  wtge.weekly_withdrawn_minor,
  wtge.monthly_withdrawn_minor,

  wtge.daily_withdrawal_count,
  wtge.weekly_withdrawal_count,
  wtge.monthly_withdrawal_count,

  wtge.seconds_since_last_withdrawal,

  wtge.wallet_status,
  wtge.available_balance_minor,

  wtge.risk_score,

  wtge.created_at,
  wtge.metadata

from withdrawal_trust_gate_evaluations wtge;
