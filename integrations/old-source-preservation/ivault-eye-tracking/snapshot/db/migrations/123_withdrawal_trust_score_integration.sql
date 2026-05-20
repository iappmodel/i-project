create table if not exists user_trust_score_snapshots (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null,

  trust_score numeric(6, 4) not null default 0.5000,
  risk_score numeric(6, 4) not null default 0.5000,

  trust_tier text not null default 'new',

  status text not null default 'active',

  reason_code text,
  reason_message text,

  source text not null default 'trust_engine',

  metadata jsonb not null default '{}'::jsonb,

  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint user_trust_score_snapshots_score_check
  check (
    trust_score >= 0 and trust_score <= 1
    and risk_score >= 0 and risk_score <= 1
  ),

  constraint user_trust_score_snapshots_tier_check
  check (
    trust_tier in (
      'new',
      'low',
      'normal',
      'trusted',
      'high_trust',
      'restricted',
      'blocked'
    )
  ),

  constraint user_trust_score_snapshots_status_check
  check (
    status in (
      'active',
      'superseded',
      'voided'
    )
  )
);

create index if not exists user_trust_score_snapshots_user_idx
on user_trust_score_snapshots (user_id, calculated_at desc);

create index if not exists user_trust_score_snapshots_tier_idx
on user_trust_score_snapshots (trust_tier, calculated_at desc);

create index if not exists user_trust_score_snapshots_status_idx
on user_trust_score_snapshots (status, calculated_at desc);

create table if not exists user_trust_score_components (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null,

  component_key text not null,
  component_category text not null,

  score_delta numeric(7, 4) not null default 0.0000,
  risk_delta numeric(7, 4) not null default 0.0000,

  weight numeric(6, 4) not null default 1.0000,

  source_type text,
  source_id uuid,

  reason_code text not null,
  reason_message text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint user_trust_score_components_category_check
  check (
    component_category in (
      'identity',
      'wallet',
      'attention',
      'reward',
      'withdrawal',
      'device',
      'behavior',
      'fraud',
      'admin',
      'system'
    )
  ),

  constraint user_trust_score_components_weight_check
  check (
    weight >= 0 and weight <= 10
  )
);

create index if not exists user_trust_score_components_user_idx
on user_trust_score_components (user_id, created_at desc);

create index if not exists user_trust_score_components_component_idx
on user_trust_score_components (component_key, created_at desc);

create index if not exists user_trust_score_components_source_idx
on user_trust_score_components (source_type, source_id);

create table if not exists trust_score_policies (
  id uuid primary key default gen_random_uuid(),

  policy_key text not null unique,

  status text not null default 'active',

  blocked_max_trust_score numeric(6, 4) not null default 0.1500,
  restricted_max_trust_score numeric(6, 4) not null default 0.3000,
  low_max_trust_score numeric(6, 4) not null default 0.4500,
  normal_max_trust_score numeric(6, 4) not null default 0.7500,
  trusted_max_trust_score numeric(6, 4) not null default 0.9000,

  high_risk_min_score numeric(6, 4) not null default 0.7500,
  critical_risk_min_score numeric(6, 4) not null default 0.9000,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint trust_score_policies_status_check
  check (
    status in (
      'active',
      'paused',
      'archived'
    )
  ),

  constraint trust_score_policies_score_check
  check (
    blocked_max_trust_score >= 0 and blocked_max_trust_score <= 1
    and restricted_max_trust_score >= blocked_max_trust_score and restricted_max_trust_score <= 1
    and low_max_trust_score >= restricted_max_trust_score and low_max_trust_score <= 1
    and normal_max_trust_score >= low_max_trust_score and normal_max_trust_score <= 1
    and trusted_max_trust_score >= normal_max_trust_score and trusted_max_trust_score <= 1
    and high_risk_min_score >= 0 and high_risk_min_score <= 1
    and critical_risk_min_score >= high_risk_min_score and critical_risk_min_score <= 1
  )
);

create index if not exists trust_score_policies_status_idx
on trust_score_policies (status);

drop trigger if exists trust_score_policies_set_updated_at
on trust_score_policies;

create trigger trust_score_policies_set_updated_at
before update on trust_score_policies
for each row
execute function set_updated_at();

insert into trust_score_policies (
  policy_key,
  status,
  metadata
)
values (
  'default_trust_score_policy_v1',
  'active',
  '{"meaning": "default trust tier thresholds"}'::jsonb
)
on conflict (policy_key)
do update set
  status = excluded.status,
  metadata = trust_score_policies.metadata || excluded.metadata,
  updated_at = now();

create or replace function get_latest_user_trust_score(
  p_user_id uuid
)
returns user_trust_score_snapshots
language plpgsql
stable
as $$
declare
  v_snapshot user_trust_score_snapshots%rowtype;
begin
  if p_user_id is null then
    raise exception 'user id is required';
  end if;

  select *
  into v_snapshot
  from user_trust_score_snapshots
  where user_id = p_user_id
    and status = 'active'
  order by calculated_at desc
  limit 1;

  if v_snapshot.id is null then
    v_snapshot.user_id := p_user_id;
    v_snapshot.trust_score := 0.5000;
    v_snapshot.risk_score := 0.5000;
    v_snapshot.trust_tier := 'new';
    v_snapshot.status := 'active';
    v_snapshot.reason_code := 'default_new_user';
    v_snapshot.reason_message := 'Default trust score for user without trust history.';
    v_snapshot.source := 'default';
    v_snapshot.metadata := '{}'::jsonb;
    v_snapshot.calculated_at := now();
    v_snapshot.created_at := now();
  end if;

  return v_snapshot;
end;
$$;

create or replace function calculate_trust_tier(
  p_trust_score numeric,
  p_risk_score numeric
)
returns text
language plpgsql
stable
as $$
declare
  v_policy trust_score_policies%rowtype;
begin
  select *
  into v_policy
  from trust_score_policies
  where status = 'active'
  order by updated_at desc
  limit 1;

  if v_policy.id is null then
    raise exception 'no active trust score policy found';
  end if;

  if p_risk_score >= v_policy.critical_risk_min_score then
    return 'blocked';
  end if;

  if p_risk_score >= v_policy.high_risk_min_score then
    return 'restricted';
  end if;

  if p_trust_score <= v_policy.blocked_max_trust_score then
    return 'blocked';

  elsif p_trust_score <= v_policy.restricted_max_trust_score then
    return 'restricted';

  elsif p_trust_score <= v_policy.low_max_trust_score then
    return 'low';

  elsif p_trust_score <= v_policy.normal_max_trust_score then
    return 'normal';

  elsif p_trust_score <= v_policy.trusted_max_trust_score then
    return 'trusted';

  else
    return 'high_trust';
  end if;
end;
$$;

create or replace function recalculate_user_trust_score(
  p_user_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_component record;

  v_base_trust numeric := 0.5000;
  v_base_risk numeric := 0.5000;

  v_trust_score numeric := 0.5000;
  v_risk_score numeric := 0.5000;

  v_trust_tier text;
  v_snapshot_id uuid;
begin
  if p_user_id is null then
    raise exception 'user id is required';
  end if;

  v_trust_score := v_base_trust;
  v_risk_score := v_base_risk;

  for v_component in
    select *
    from user_trust_score_components
    where user_id = p_user_id
      and created_at >= now() - interval '90 days'
    order by created_at asc
  loop
    v_trust_score := v_trust_score + (v_component.score_delta * v_component.weight);
    v_risk_score := v_risk_score + (v_component.risk_delta * v_component.weight);
  end loop;

  v_trust_score := least(greatest(v_trust_score, 0), 1);
  v_risk_score := least(greatest(v_risk_score, 0), 1);

  v_trust_tier := calculate_trust_tier(v_trust_score, v_risk_score);

  update user_trust_score_snapshots
  set status = 'superseded'
  where user_id = p_user_id
    and status = 'active';

  insert into user_trust_score_snapshots (
    user_id,
    trust_score,
    risk_score,
    trust_tier,
    status,
    reason_code,
    reason_message,
    source,
    metadata
  )
  values (
    p_user_id,
    v_trust_score,
    v_risk_score,
    v_trust_tier,
    'active',
    'recalculated',
    'Trust score recalculated from recent components.',
    'trust_engine_v1',
    p_metadata
  )
  returning id into v_snapshot_id;

  return v_snapshot_id;
end;
$$;

create or replace function add_user_trust_score_component(
  p_user_id uuid,
  p_component_key text,
  p_component_category text,
  p_score_delta numeric default 0,
  p_risk_delta numeric default 0,
  p_weight numeric default 1,
  p_source_type text default null,
  p_source_id uuid default null,
  p_reason_code text default 'manual_component',
  p_reason_message text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_component_id uuid;
begin
  if p_user_id is null then
    raise exception 'user id is required';
  end if;

  if p_component_key is null or length(trim(p_component_key)) = 0 then
    raise exception 'component key is required';
  end if;

  insert into user_trust_score_components (
    user_id,
    component_key,
    component_category,
    score_delta,
    risk_delta,
    weight,
    source_type,
    source_id,
    reason_code,
    reason_message,
    metadata
  )
  values (
    p_user_id,
    p_component_key,
    p_component_category,
    p_score_delta,
    p_risk_delta,
    p_weight,
    p_source_type,
    p_source_id,
    p_reason_code,
    p_reason_message,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_component_id;

  perform recalculate_user_trust_score(
    p_user_id,
    p_metadata || jsonb_build_object(
      'trigger_component_id',
      v_component_id
    )
  );

  return v_component_id;
end;
$$;

create table if not exists withdrawal_trust_tier_rules (
  id uuid primary key default gen_random_uuid(),

  trust_tier text not null unique,

  status text not null default 'active',

  amount_limit_multiplier numeric(8, 4) not null default 1.0000,
  count_limit_multiplier numeric(8, 4) not null default 1.0000,

  force_review boolean not null default false,
  block_withdrawals boolean not null default false,

  require_review_above_multiplier numeric(8, 4) not null default 1.0000,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint withdrawal_trust_tier_rules_tier_check
  check (
    trust_tier in (
      'new',
      'low',
      'normal',
      'trusted',
      'high_trust',
      'restricted',
      'blocked'
    )
  ),

  constraint withdrawal_trust_tier_rules_status_check
  check (
    status in (
      'active',
      'paused',
      'archived'
    )
  ),

  constraint withdrawal_trust_tier_rules_multiplier_check
  check (
    amount_limit_multiplier >= 0
    and count_limit_multiplier >= 0
    and require_review_above_multiplier >= 0
  )
);

create index if not exists withdrawal_trust_tier_rules_status_idx
on withdrawal_trust_tier_rules (status);

drop trigger if exists withdrawal_trust_tier_rules_set_updated_at
on withdrawal_trust_tier_rules;

create trigger withdrawal_trust_tier_rules_set_updated_at
before update on withdrawal_trust_tier_rules
for each row
execute function set_updated_at();

insert into withdrawal_trust_tier_rules (
  trust_tier,
  status,
  amount_limit_multiplier,
  count_limit_multiplier,
  force_review,
  block_withdrawals,
  require_review_above_multiplier,
  metadata
)
values
  ('blocked', 'active', 0.0000, 0.0000, false, true, 0.0000, '{}'),
  ('restricted', 'active', 0.2500, 0.2500, true, false, 0.2500, '{}'),
  ('low', 'active', 0.5000, 0.5000, true, false, 0.5000, '{}'),
  ('new', 'active', 0.7500, 0.5000, false, false, 0.7500, '{}'),
  ('normal', 'active', 1.0000, 1.0000, false, false, 1.0000, '{}'),
  ('trusted', 'active', 2.0000, 2.0000, false, false, 2.0000, '{}'),
  ('high_trust', 'active', 5.0000, 3.0000, false, false, 5.0000, '{}')
on conflict (trust_tier)
do update set
  status = excluded.status,
  amount_limit_multiplier = excluded.amount_limit_multiplier,
  count_limit_multiplier = excluded.count_limit_multiplier,
  force_review = excluded.force_review,
  block_withdrawals = excluded.block_withdrawals,
  require_review_above_multiplier = excluded.require_review_above_multiplier,
  metadata = withdrawal_trust_tier_rules.metadata || excluded.metadata,
  updated_at = now();

alter table withdrawal_trust_gate_evaluations
add column if not exists trust_score numeric(6, 4),
add column if not exists trust_risk_score numeric(6, 4),
add column if not exists trust_tier text,
add column if not exists trust_snapshot_id uuid references user_trust_score_snapshots(id);

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
  v_trust user_trust_score_snapshots%rowtype;
  v_tier_rule withdrawal_trust_tier_rules%rowtype;

  v_daily_withdrawn bigint := 0;
  v_weekly_withdrawn bigint := 0;
  v_monthly_withdrawn bigint := 0;

  v_daily_count integer := 0;
  v_weekly_count integer := 0;
  v_monthly_count integer := 0;

  v_last_withdrawal_at timestamptz;
  v_seconds_since_last integer;

  v_effective_max_withdrawal bigint;
  v_effective_daily_limit bigint;
  v_effective_weekly_limit bigint;
  v_effective_monthly_limit bigint;

  v_effective_daily_count integer;
  v_effective_weekly_count integer;
  v_effective_monthly_count integer;

  v_effective_review_above bigint;

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

  v_trust := get_latest_user_trust_score(p_user_id);

  select *
  into v_tier_rule
  from withdrawal_trust_tier_rules
  where trust_tier = v_trust.trust_tier
    and status = 'active';

  if v_tier_rule.id is null then
    raise exception 'withdrawal trust tier rule not found: %', v_trust.trust_tier;
  end if;

  v_effective_max_withdrawal :=
    greatest(
      0,
      floor(v_policy.max_withdrawal_amount_minor * v_tier_rule.amount_limit_multiplier)
    )::bigint;

  v_effective_daily_limit :=
    greatest(
      0,
      floor(v_policy.daily_limit_minor * v_tier_rule.amount_limit_multiplier)
    )::bigint;

  v_effective_weekly_limit :=
    greatest(
      0,
      floor(v_policy.weekly_limit_minor * v_tier_rule.amount_limit_multiplier)
    )::bigint;

  v_effective_monthly_limit :=
    greatest(
      0,
      floor(v_policy.monthly_limit_minor * v_tier_rule.amount_limit_multiplier)
    )::bigint;

  v_effective_daily_count :=
    greatest(
      0,
      floor(v_policy.daily_count_limit * v_tier_rule.count_limit_multiplier)
    )::integer;

  v_effective_weekly_count :=
    greatest(
      0,
      floor(v_policy.weekly_count_limit * v_tier_rule.count_limit_multiplier)
    )::integer;

  v_effective_monthly_count :=
    greatest(
      0,
      floor(v_policy.monthly_count_limit * v_tier_rule.count_limit_multiplier)
    )::integer;

  v_effective_review_above :=
    greatest(
      v_policy.min_withdrawal_amount_minor,
      floor(v_policy.require_review_above_minor * v_tier_rule.require_review_above_multiplier)
    )::bigint;

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

  elsif v_tier_rule.block_withdrawals is true then
    v_decision := 'blocked';
    v_reason_code := 'trust_tier_blocks_withdrawals';
    v_reason_message := 'Trust tier blocks withdrawals.';
    v_risk_score := greatest(v_trust.risk_score, 0.9500);

  elsif v_wallet.available_balance_minor < p_requested_amount_minor then
    v_decision := 'blocked';
    v_reason_code := 'insufficient_available_balance';
    v_reason_message := 'Insufficient available balance.';
    v_risk_score := greatest(v_trust.risk_score, 0.9000);

  elsif p_requested_amount_minor < v_policy.min_withdrawal_amount_minor then
    v_decision := 'blocked';
    v_reason_code := 'below_minimum_withdrawal';
    v_reason_message := 'Withdrawal amount is below the minimum.';
    v_risk_score := greatest(v_trust.risk_score, 0.3000);

  elsif p_requested_amount_minor > v_effective_max_withdrawal then
    v_decision := 'blocked';
    v_reason_code := 'trust_adjusted_maximum_exceeded';
    v_reason_message := 'Withdrawal amount exceeds trust-adjusted maximum.';
    v_risk_score := greatest(v_trust.risk_score, 0.7500);

  elsif v_daily_withdrawn + p_requested_amount_minor > v_effective_daily_limit then
    v_decision := 'blocked';
    v_reason_code := 'trust_adjusted_daily_limit_exceeded';
    v_reason_message := 'Daily trust-adjusted withdrawal limit exceeded.';
    v_risk_score := greatest(v_trust.risk_score, 0.8000);

  elsif v_weekly_withdrawn + p_requested_amount_minor > v_effective_weekly_limit then
    v_decision := 'blocked';
    v_reason_code := 'trust_adjusted_weekly_limit_exceeded';
    v_reason_message := 'Weekly trust-adjusted withdrawal limit exceeded.';
    v_risk_score := greatest(v_trust.risk_score, 0.8000);

  elsif v_monthly_withdrawn + p_requested_amount_minor > v_effective_monthly_limit then
    v_decision := 'blocked';
    v_reason_code := 'trust_adjusted_monthly_limit_exceeded';
    v_reason_message := 'Monthly trust-adjusted withdrawal limit exceeded.';
    v_risk_score := greatest(v_trust.risk_score, 0.8000);

  elsif v_daily_count + 1 > v_effective_daily_count then
    v_decision := 'blocked';
    v_reason_code := 'trust_adjusted_daily_count_exceeded';
    v_reason_message := 'Daily trust-adjusted withdrawal count exceeded.';
    v_risk_score := greatest(v_trust.risk_score, 0.7500);

  elsif v_weekly_count + 1 > v_effective_weekly_count then
    v_decision := 'blocked';
    v_reason_code := 'trust_adjusted_weekly_count_exceeded';
    v_reason_message := 'Weekly trust-adjusted withdrawal count exceeded.';
    v_risk_score := greatest(v_trust.risk_score, 0.7500);

  elsif v_monthly_count + 1 > v_effective_monthly_count then
    v_decision := 'blocked';
    v_reason_code := 'trust_adjusted_monthly_count_exceeded';
    v_reason_message := 'Monthly trust-adjusted withdrawal count exceeded.';
    v_risk_score := greatest(v_trust.risk_score, 0.7500);

  elsif v_seconds_since_last is not null
    and v_seconds_since_last < v_policy.cooldown_seconds then
    v_decision := 'blocked';
    v_reason_code := 'withdrawal_cooldown_active';
    v_reason_message := 'Please wait before making another withdrawal.';
    v_risk_score := greatest(v_trust.risk_score, 0.5000);

  elsif v_tier_rule.force_review is true then
    v_decision := 'review';
    v_reason_code := 'trust_tier_requires_review';
    v_reason_message := 'Trust tier requires review.';
    v_risk_score := greatest(v_trust.risk_score, 0.6500);

  elsif p_requested_amount_minor >= v_effective_review_above then
    v_decision := 'review';
    v_reason_code := 'trust_adjusted_review_required_amount';
    v_reason_message := 'Withdrawal requires review based on trust-adjusted threshold.';
    v_risk_score := greatest(v_trust.risk_score, 0.6500);

  else
    v_decision := 'allowed';
    v_reason_code := 'allowed';
    v_reason_message := 'Withdrawal allowed.';
    v_risk_score := least(greatest(v_trust.risk_score, 0.0500), 1);
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
    trust_score,
    trust_risk_score,
    trust_tier,
    trust_snapshot_id,
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
    v_trust.trust_score,
    v_trust.risk_score,
    v_trust.trust_tier,
    v_trust.id,
    p_metadata || jsonb_build_object(
      'effective_max_withdrawal_minor',
      v_effective_max_withdrawal,
      'effective_daily_limit_minor',
      v_effective_daily_limit,
      'effective_weekly_limit_minor',
      v_effective_weekly_limit,
      'effective_monthly_limit_minor',
      v_effective_monthly_limit,
      'effective_daily_count_limit',
      v_effective_daily_count,
      'effective_weekly_count_limit',
      v_effective_weekly_count,
      'effective_monthly_count_limit',
      v_effective_monthly_count,
      'effective_review_above_minor',
      v_effective_review_above
    )
  )
  returning id into v_evaluation_id;

  return v_evaluation_id;
end;
$$;

create or replace function add_trust_component_for_withdrawal_paid(
  p_withdrawal_request_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request withdrawal_requests%rowtype;
begin
  select *
  into v_request
  from withdrawal_requests
  where id = p_withdrawal_request_id;

  if v_request.id is null then
    raise exception 'withdrawal request not found: %', p_withdrawal_request_id;
  end if;

  if v_request.status <> 'paid' then
    raise exception 'withdrawal must be paid before adding trust component';
  end if;

  return add_user_trust_score_component(
    v_request.user_id,
    'withdrawal_paid_successfully',
    'withdrawal',
    0.0100,
    -0.0100,
    1.0000,
    'withdrawal_request',
    v_request.id,
    'withdrawal_paid_successfully',
    'Withdrawal was paid successfully.',
    p_metadata
  );
end;
$$;

create or replace function add_trust_component_for_withdrawal_failed(
  p_withdrawal_request_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request withdrawal_requests%rowtype;
begin
  select *
  into v_request
  from withdrawal_requests
  where id = p_withdrawal_request_id;

  if v_request.id is null then
    raise exception 'withdrawal request not found: %', p_withdrawal_request_id;
  end if;

  if v_request.status <> 'failed' then
    raise exception 'withdrawal must be failed before adding trust component';
  end if;

  return add_user_trust_score_component(
    v_request.user_id,
    'withdrawal_failed',
    'withdrawal',
    -0.0100,
    0.0200,
    1.0000,
    'withdrawal_request',
    v_request.id,
    'withdrawal_failed',
    'Withdrawal failed.',
    p_metadata
  );
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

  perform add_trust_component_for_withdrawal_paid(
    v_request.id,
    p_metadata
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

  perform add_trust_component_for_withdrawal_failed(
    v_request.id,
    p_metadata
  );

  return v_request.id;
end;
$$;

create or replace view admin_user_trust_score_detail as
select
  uts.id as trust_score_snapshot_id,
  uts.user_id,
  uts.trust_score,
  uts.risk_score,
  uts.trust_tier,
  uts.status,
  uts.reason_code,
  uts.reason_message,
  uts.source,
  uts.calculated_at,
  uts.created_at,
  uts.metadata,

  (
    select jsonb_agg(
      jsonb_build_object(
        'component_id', c.id,
        'component_key', c.component_key,
        'component_category', c.component_category,
        'score_delta', c.score_delta,
        'risk_delta', c.risk_delta,
        'weight', c.weight,
        'source_type', c.source_type,
        'source_id', c.source_id,
        'reason_code', c.reason_code,
        'reason_message', c.reason_message,
        'created_at', c.created_at
      )
      order by c.created_at desc
    )
    from user_trust_score_components c
    where c.user_id = uts.user_id
      and c.created_at >= now() - interval '90 days'
  ) as recent_components

from user_trust_score_snapshots uts
where uts.status = 'active';

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

  wtge.trust_score,
  wtge.trust_risk_score,
  wtge.trust_tier,
  wtge.trust_snapshot_id,

  wtge.created_at,
  wtge.metadata

from withdrawal_trust_gate_evaluations wtge;

alter table user_trust_score_snapshots enable row level security;
alter table user_trust_score_components enable row level security;
alter table trust_score_policies enable row level security;
alter table withdrawal_trust_tier_rules enable row level security;

drop policy if exists user_trust_score_snapshots_no_user_access
on user_trust_score_snapshots;
create policy user_trust_score_snapshots_no_user_access
on user_trust_score_snapshots
for all
to authenticated
using (false)
with check (false);

drop policy if exists user_trust_score_components_no_user_access
on user_trust_score_components;
create policy user_trust_score_components_no_user_access
on user_trust_score_components
for all
to authenticated
using (false)
with check (false);

drop policy if exists trust_score_policies_no_user_access
on trust_score_policies;
create policy trust_score_policies_no_user_access
on trust_score_policies
for all
to authenticated
using (false)
with check (false);

drop policy if exists withdrawal_trust_tier_rules_no_user_access
on withdrawal_trust_tier_rules;
create policy withdrawal_trust_tier_rules_no_user_access
on withdrawal_trust_tier_rules
for all
to authenticated
using (false)
with check (false);

drop policy if exists worker_all_user_trust_score_snapshots
on user_trust_score_snapshots;
create policy worker_all_user_trust_score_snapshots
on user_trust_score_snapshots
for all
to worker_role
using (true)
with check (true);

drop policy if exists worker_all_user_trust_score_components
on user_trust_score_components;
create policy worker_all_user_trust_score_components
on user_trust_score_components
for all
to worker_role
using (true)
with check (true);

drop policy if exists admin_read_user_trust_score_snapshots
on user_trust_score_snapshots;
create policy admin_read_user_trust_score_snapshots
on user_trust_score_snapshots
for select
to admin_api_role
using (true);

drop policy if exists admin_read_user_trust_score_components
on user_trust_score_components;
create policy admin_read_user_trust_score_components
on user_trust_score_components
for select
to admin_api_role
using (true);

drop policy if exists admin_read_trust_score_policies
on trust_score_policies;
create policy admin_read_trust_score_policies
on trust_score_policies
for select
to admin_api_role
using (true);

drop policy if exists admin_read_withdrawal_trust_tier_rules
on withdrawal_trust_tier_rules;
create policy admin_read_withdrawal_trust_tier_rules
on withdrawal_trust_tier_rules
for select
to admin_api_role
using (true);

grant execute on function get_latest_user_trust_score(uuid)
to app_api_role, worker_role, admin_api_role;

grant execute on function calculate_trust_tier(numeric, numeric)
to worker_role, admin_api_role;

grant execute on function recalculate_user_trust_score(uuid, jsonb)
to worker_role, admin_api_role;

grant execute on function add_user_trust_score_component(
  uuid,
  text,
  text,
  numeric,
  numeric,
  numeric,
  text,
  uuid,
  text,
  text,
  jsonb
) to worker_role, admin_api_role;

grant execute on function add_trust_component_for_withdrawal_paid(uuid, jsonb)
to worker_role;

grant execute on function add_trust_component_for_withdrawal_failed(uuid, jsonb)
to worker_role;

alter function get_latest_user_trust_score(uuid) security definer;
alter function get_latest_user_trust_score(uuid) set search_path = public;

alter function recalculate_user_trust_score(uuid, jsonb) security definer;
alter function recalculate_user_trust_score(uuid, jsonb) set search_path = public;

alter function add_user_trust_score_component(
  uuid,
  text,
  text,
  numeric,
  numeric,
  numeric,
  text,
  uuid,
  text,
  text,
  jsonb
) security definer;

alter function add_user_trust_score_component(
  uuid,
  text,
  text,
  numeric,
  numeric,
  numeric,
  text,
  uuid,
  text,
  text,
  jsonb
) set search_path = public;

grant select on admin_user_trust_score_detail to admin_api_role;
grant select on admin_withdrawal_trust_gate_detail to admin_api_role;

insert into error_catalog (
  error_code,
  category,
  severity,
  http_status,
  retryable,
  user_visible,
  user_message,
  internal_message,
  owner_team
)
values
  (
    'TRUST_SCORE_BLOCKED',
    'wallet',
    'high',
    403,
    false,
    true,
    'Your account is not eligible for withdrawal.',
    'Trust score blocks withdrawal.',
    'trust'
  ),
  (
    'TRUST_SCORE_REVIEW_REQUIRED',
    'wallet',
    'medium',
    202,
    false,
    true,
    'Your withdrawal is under review.',
    'Trust score requires withdrawal review.',
    'trust'
  ),
  (
    'TRUST_SCORE_POLICY_MISSING',
    'system',
    'critical',
    500,
    false,
    false,
    'Something went wrong. Please try again.',
    'Trust score policy or tier rule missing.',
    'trust'
  )
on conflict (error_code)
do update set
  category = excluded.category,
  severity = excluded.severity,
  http_status = excluded.http_status,
  retryable = excluded.retryable,
  user_visible = excluded.user_visible,
  user_message = excluded.user_message,
  internal_message = excluded.internal_message,
  owner_team = excluded.owner_team,
  updated_at = now();

insert into error_mapping_rules (
  match_pattern,
  error_code,
  priority,
  metadata
)
values
  ('trust tier blocks withdrawals', 'TRUST_SCORE_BLOCKED', 5, '{}'::jsonb),
  ('withdrawal trust tier rule not found', 'TRUST_SCORE_POLICY_MISSING', 5, '{}'::jsonb),
  ('no active trust score policy found', 'TRUST_SCORE_POLICY_MISSING', 5, '{}'::jsonb)
on conflict do nothing;
