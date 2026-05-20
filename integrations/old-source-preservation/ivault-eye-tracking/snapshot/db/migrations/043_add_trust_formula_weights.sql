-- Step 5.4 — Trust formula versions, parameter tables, signal weight rules,
-- and rule-based record_trust_signal / recalculate_trust_score / emit path.

-- ---------------------------------------------------------------------------
-- 1. Trust formula versions
-- ---------------------------------------------------------------------------

create table if not exists trust_formula_versions (
  id uuid primary key default gen_random_uuid(),

  formula_version text not null unique,

  name text not null,
  description text,

  active boolean not null default false,

  valid_from timestamptz not null default now(),
  valid_until timestamptz,

  created_by_admin_id uuid,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint trust_formula_versions_validity_check
  check (
    valid_until is null
    or valid_until > valid_from
  )
);

create index if not exists trust_formula_versions_active_idx
on trust_formula_versions (active, valid_from desc);

-- ---------------------------------------------------------------------------
-- 2. Trust signal weight rules
-- ---------------------------------------------------------------------------

create table if not exists trust_signal_weight_rules (
  id uuid primary key default gen_random_uuid(),

  formula_version text not null references trust_formula_versions(formula_version),

  signal_source text not null,
  signal_type text not null,

  direction text not null,
  severity text not null,

  base_signal_weight numeric(10, 6) not null default 1.000000,

  trust_delta numeric(10, 6) not null default 0.000000,
  risk_delta numeric(10, 6) not null default 0.000000,
  confidence_delta numeric(10, 6) not null default 0.000000,

  min_signal_value numeric(10, 6),
  max_signal_value numeric(10, 6),

  active boolean not null default true,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint trust_signal_weight_rules_direction_check
  check (
    direction in (
      'positive',
      'negative',
      'neutral'
    )
  ),

  constraint trust_signal_weight_rules_severity_check
  check (
    severity in (
      'info',
      'low',
      'medium',
      'high',
      'critical'
    )
  ),

  constraint trust_signal_weight_rules_value_range_check
  check (
    min_signal_value is null
    or max_signal_value is null
    or max_signal_value >= min_signal_value
  )
);

create index if not exists trust_signal_weight_rules_lookup_idx
on trust_signal_weight_rules (
  formula_version,
  signal_source,
  signal_type,
  direction,
  severity,
  active
);

-- ---------------------------------------------------------------------------
-- 3. Trust formula parameters
-- ---------------------------------------------------------------------------

create table if not exists trust_formula_parameters (
  id uuid primary key default gen_random_uuid(),

  formula_version text not null references trust_formula_versions(formula_version),

  parameter_name text not null,
  parameter_value numeric(12, 6) not null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  unique (formula_version, parameter_name)
);

create index if not exists trust_formula_parameters_formula_idx
on trust_formula_parameters (formula_version);

-- ---------------------------------------------------------------------------
-- 4. Active formula version (VOLATILE: uses now())
-- ---------------------------------------------------------------------------

create or replace function get_active_trust_formula_version()
returns text
language plpgsql
volatile
as $$
declare
  v_formula_version text;
begin
  select formula_version
  into v_formula_version
  from trust_formula_versions
  where active is true
    and valid_from <= now()
    and (
      valid_until is null
      or valid_until > now()
    )
  order by valid_from desc, created_at desc
  limit 1;

  if v_formula_version is null then
    raise exception 'no active trust formula version';
  end if;

  return v_formula_version;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Formula parameter helper
-- ---------------------------------------------------------------------------

create or replace function get_trust_formula_parameter(
  p_formula_version text,
  p_parameter_name text,
  p_default_value numeric
)
returns numeric
language sql
stable
as $$
  select coalesce(
    (
      select parameter_value
      from trust_formula_parameters
      where formula_version = p_formula_version
        and parameter_name = p_parameter_name
      limit 1
    ),
    p_default_value
  );
$$;

-- ---------------------------------------------------------------------------
-- 6. Signal weight lookup (VOLATILE when falling back to active version)
-- ---------------------------------------------------------------------------

create or replace function get_trust_signal_weight_rule(
  p_signal_source text,
  p_signal_type text,
  p_direction text,
  p_severity text,
  p_signal_value numeric default null,
  p_formula_version text default null
)
returns trust_signal_weight_rules
language plpgsql
volatile
as $$
declare
  v_formula_version text;
  v_rule trust_signal_weight_rules%rowtype;
begin
  v_formula_version := coalesce(
    p_formula_version,
    get_active_trust_formula_version()
  );

  select *
  into v_rule
  from trust_signal_weight_rules
  where formula_version = v_formula_version
    and signal_source = p_signal_source
    and signal_type = p_signal_type
    and direction = p_direction
    and severity = p_severity
    and active is true
    and (
      min_signal_value is null
      or p_signal_value is null
      or p_signal_value >= min_signal_value
    )
    and (
      max_signal_value is null
      or p_signal_value is null
      or p_signal_value <= max_signal_value
    )
  order by
    min_signal_value desc nulls last,
    max_signal_value asc nulls last,
    created_at desc
  limit 1;

  if v_rule.id is null then
    raise exception 'no trust signal weight rule for formula %, source %, type %, direction %, severity %',
      v_formula_version,
      p_signal_source,
      p_signal_type,
      p_direction,
      p_severity;
  end if;

  return v_rule;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. record_trust_signal — deltas default from weight rules
-- ---------------------------------------------------------------------------

create or replace function record_trust_signal(
  p_subject_type text,
  p_subject_entity_id uuid,
  p_user_id uuid,
  p_wallet_id uuid,
  p_signal_type text,
  p_signal_source text,
  p_direction text,
  p_severity text default 'medium',
  p_signal_value numeric default null,
  p_signal_weight numeric default null,
  p_trust_delta numeric default null,
  p_risk_delta numeric default null,
  p_confidence_delta numeric default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_formula_version text default null
)
returns uuid
language plpgsql
as $$
declare
  v_subject_id uuid;
  v_signal_id uuid;

  v_formula_version text;
  v_rule trust_signal_weight_rules%rowtype;

  v_signal_weight numeric;
  v_trust_delta numeric;
  v_risk_delta numeric;
  v_confidence_delta numeric;
begin
  if p_signal_type is null or length(trim(p_signal_type)) = 0 then
    raise exception 'signal type is required';
  end if;

  if p_signal_source is null or length(trim(p_signal_source)) = 0 then
    raise exception 'signal source is required';
  end if;

  if p_direction not in ('positive', 'negative', 'neutral') then
    raise exception 'invalid signal direction: %', p_direction;
  end if;

  if p_severity not in ('info', 'low', 'medium', 'high', 'critical') then
    raise exception 'invalid signal severity: %', p_severity;
  end if;

  v_formula_version := coalesce(
    p_formula_version,
    get_active_trust_formula_version()
  );

  v_rule := get_trust_signal_weight_rule(
    p_signal_source,
    p_signal_type,
    p_direction,
    p_severity,
    p_signal_value,
    v_formula_version
  );

  v_signal_weight := coalesce(p_signal_weight, v_rule.base_signal_weight);
  v_trust_delta := coalesce(p_trust_delta, v_rule.trust_delta);
  v_risk_delta := coalesce(p_risk_delta, v_rule.risk_delta);
  v_confidence_delta := coalesce(p_confidence_delta, v_rule.confidence_delta);

  v_subject_id := get_or_create_trust_subject(
    p_subject_type,
    p_subject_entity_id,
    p_user_id,
    p_wallet_id,
    p_metadata
  );

  insert into trust_signal_events (
    subject_id,
    subject_type,
    user_id,
    wallet_id,
    signal_type,
    signal_source,
    direction,
    severity,
    signal_value,
    signal_weight,
    trust_delta,
    risk_delta,
    confidence_delta,
    idempotency_key,
    metadata
  )
  values (
    v_subject_id,
    p_subject_type,
    p_user_id,
    p_wallet_id,
    p_signal_type,
    p_signal_source,
    p_direction,
    p_severity,
    p_signal_value,
    v_signal_weight,
    v_trust_delta,
    v_risk_delta,
    v_confidence_delta,
    p_idempotency_key,
    p_metadata || jsonb_build_object(
      'formula_version',
      v_formula_version,
      'weight_rule_id',
      v_rule.id
    )
  )
  on conflict (signal_source, idempotency_key)
  where idempotency_key is not null
  do update set
    metadata = trust_signal_events.metadata || excluded.metadata
  returning id into v_signal_id;

  perform recalculate_trust_score(v_subject_id, v_formula_version);

  return v_signal_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. recalculate_trust_score — baselines and window from parameters
-- ---------------------------------------------------------------------------

create or replace function recalculate_trust_score(
  p_subject_id uuid,
  p_formula_version text default null
)
returns uuid
language plpgsql
as $$
declare
  v_current trust_score_current%rowtype;

  v_formula_version text;

  v_event_count integer;
  v_positive_count integer;
  v_negative_count integer;

  v_trust_delta numeric;
  v_risk_delta numeric;
  v_confidence_delta numeric;
  v_last_event_at timestamptz;

  v_trust_baseline numeric;
  v_risk_baseline numeric;
  v_confidence_baseline numeric;
  v_lookback_days numeric;
  v_max_sample_confidence_bonus numeric;
  v_sample_count_for_max_bonus numeric;
  v_sample_bonus numeric;

  v_new_trust numeric;
  v_new_risk numeric;
  v_new_confidence numeric;

  v_new_trust_tier text;
  v_new_risk_tier text;

  v_calculation_id uuid;
begin
  v_formula_version := coalesce(
    p_formula_version,
    get_active_trust_formula_version()
  );

  select *
  into v_current
  from trust_score_current
  where subject_id = p_subject_id
  for update;

  if v_current.subject_id is null then
    raise exception 'trust score current row not found for subject %', p_subject_id;
  end if;

  v_trust_baseline := get_trust_formula_parameter(
    v_formula_version,
    'trust_baseline',
    0.500000
  );

  v_risk_baseline := get_trust_formula_parameter(
    v_formula_version,
    'risk_baseline',
    0.500000
  );

  v_confidence_baseline := get_trust_formula_parameter(
    v_formula_version,
    'confidence_baseline',
    0.000000
  );

  v_lookback_days := get_trust_formula_parameter(
    v_formula_version,
    'lookback_days',
    90
  );

  v_max_sample_confidence_bonus := get_trust_formula_parameter(
    v_formula_version,
    'max_sample_confidence_bonus',
    0.500000
  );

  v_sample_count_for_max_bonus := get_trust_formula_parameter(
    v_formula_version,
    'sample_count_for_max_bonus',
    100
  );

  select
    count(*)::integer,
    count(*) filter (where direction = 'positive')::integer,
    count(*) filter (where direction = 'negative')::integer,
    coalesce(sum(trust_delta * signal_weight), 0),
    coalesce(sum(risk_delta * signal_weight), 0),
    coalesce(sum(confidence_delta * signal_weight), 0),
    max(occurred_at)
  into
    v_event_count,
    v_positive_count,
    v_negative_count,
    v_trust_delta,
    v_risk_delta,
    v_confidence_delta,
    v_last_event_at
  from trust_signal_events
  where subject_id = p_subject_id
    and occurred_at >= now() - ((v_lookback_days::text || ' days')::interval);

  v_sample_bonus := least(
    (v_event_count::numeric / greatest(v_sample_count_for_max_bonus, 1))
      * v_max_sample_confidence_bonus,
    v_max_sample_confidence_bonus
  );

  v_new_trust := least(
    greatest(
      v_trust_baseline + v_trust_delta,
      0.0000
    ),
    1.0000
  );

  v_new_risk := least(
    greatest(
      v_risk_baseline + v_risk_delta,
      0.0000
    ),
    1.0000
  );

  v_new_confidence := least(
    greatest(
      v_confidence_baseline + v_confidence_delta + v_sample_bonus,
      0.0000
    ),
    1.0000
  );

  v_new_trust_tier := trust_score_to_tier(v_new_trust);
  v_new_risk_tier := risk_score_to_tier(v_new_risk);

  insert into trust_score_calculations (
    subject_id,
    previous_trust_score,
    previous_risk_score,
    previous_confidence_score,
    new_trust_score,
    new_risk_score,
    new_confidence_score,
    previous_trust_tier,
    new_trust_tier,
    previous_risk_tier,
    new_risk_tier,
    event_count,
    positive_signal_count,
    negative_signal_count,
    formula_version,
    metadata
  )
  values (
    p_subject_id,
    v_current.trust_score,
    v_current.risk_score,
    v_current.confidence_score,
    v_new_trust,
    v_new_risk,
    v_new_confidence,
    v_current.trust_tier,
    v_new_trust_tier,
    v_current.risk_tier,
    v_new_risk_tier,
    v_event_count,
    v_positive_count,
    v_negative_count,
    v_formula_version,
    jsonb_build_object(
      'trust_delta_sum',
      v_trust_delta,
      'risk_delta_sum',
      v_risk_delta,
      'confidence_delta_sum',
      v_confidence_delta,
      'sample_bonus',
      v_sample_bonus,
      'lookback_days',
      v_lookback_days
    )
  )
  returning id into v_calculation_id;

  update trust_score_current
  set
    trust_score = v_new_trust,
    risk_score = v_new_risk,
    confidence_score = v_new_confidence,
    trust_tier = v_new_trust_tier,
    risk_tier = v_new_risk_tier,
    sample_count = v_event_count,
    positive_signal_count = v_positive_count,
    negative_signal_count = v_negative_count,
    last_event_at = v_last_event_at,
    last_calculated_at = now(),
    updated_at = now(),
    metadata = metadata || jsonb_build_object(
      'formula_version',
      v_formula_version
    )
  where subject_id = p_subject_id;

  return v_calculation_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. emit_trust_signal_from_attention_event — classify only; deltas from rules
-- ---------------------------------------------------------------------------

create or replace function emit_trust_signal_from_attention_event(
  p_attention_event_id uuid,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_event attention_verification_events%rowtype;

  v_direction text;
  v_severity text;
  v_signal_type text;

  v_signal_id uuid;
begin
  if p_attention_event_id is null then
    raise exception 'attention event id is required';
  end if;

  select *
  into v_event
  from attention_verification_events
  where id = p_attention_event_id
  for update;

  if v_event.id is null then
    raise exception 'attention event not found: %', p_attention_event_id;
  end if;

  if v_event.trust_signal_emitted is true then
    select id
    into v_signal_id
    from trust_signal_events
    where idempotency_key = coalesce(
      p_idempotency_key,
      'attention_trust_signal:' || p_attention_event_id::text
    )
    limit 1;

    return v_signal_id;
  end if;

  if p_idempotency_key is null then
    p_idempotency_key := 'attention_trust_signal:' || p_attention_event_id::text;
  end if;

  if v_event.decision = 'passed' and v_event.fraud_risk_score < 0.5500 then
    v_direction := 'positive';
    v_severity := 'medium';
    v_signal_type := 'valid_attention_verification';

  elsif v_event.decision = 'fraud_suspected' or v_event.fraud_risk_score >= 0.8500 then
    v_direction := 'negative';
    v_severity := 'critical';
    v_signal_type := 'attention_fraud_suspected';

  elsif v_event.decision in ('failed', 'inconclusive') then
    v_direction := 'negative';
    v_severity := 'low';
    v_signal_type := 'failed_attention_verification';

  else
    v_direction := 'neutral';
    v_severity := 'info';
    v_signal_type := 'neutral_attention_verification';
  end if;

  v_signal_id := record_trust_signal(
    'wallet',
    v_event.wallet_id,
    v_event.user_id,
    v_event.wallet_id,
    v_signal_type,
    'attention_verification_engine',
    v_direction,
    v_severity,
    v_event.attention_score,
    null,
    null,
    null,
    null,
    p_idempotency_key,
    p_metadata || jsonb_build_object(
      'attention_event_id',
      v_event.id,
      'campaign_id',
      v_event.campaign_id,
      'decision',
      v_event.decision,
      'attention_score',
      v_event.attention_score,
      'fraud_risk_score',
      v_event.fraud_risk_score
    )
  );

  update attention_verification_events
  set trust_signal_emitted = true
  where id = v_event.id;

  perform apply_trust_score_to_wallet_policy(
    v_event.wallet_id,
    p_metadata || jsonb_build_object(
      'trigger',
      'attention_event',
      'attention_event_id',
      v_event.id
    )
  );

  return v_signal_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10–13. Seed formula, parameters, attention + wallet behavior rules
-- ---------------------------------------------------------------------------

insert into trust_formula_versions (
  formula_version,
  name,
  description,
  active,
  metadata
)
values (
  'trust_v1',
  'Trust Formula V1',
  'Initial trust formula using weighted signal deltas over a 90-day window.',
  true,
  '{"owner": "trust_engine"}'::jsonb
)
on conflict (formula_version)
do update set
  active = excluded.active,
  metadata = trust_formula_versions.metadata || excluded.metadata;

insert into trust_formula_parameters (
  formula_version,
  parameter_name,
  parameter_value,
  metadata
)
values
  ('trust_v1', 'trust_baseline', 0.500000, '{}'),
  ('trust_v1', 'risk_baseline', 0.500000, '{}'),
  ('trust_v1', 'confidence_baseline', 0.000000, '{}'),
  ('trust_v1', 'lookback_days', 90.000000, '{}'),
  ('trust_v1', 'max_sample_confidence_bonus', 0.500000, '{}'),
  ('trust_v1', 'sample_count_for_max_bonus', 100.000000, '{}')
on conflict (formula_version, parameter_name)
do update set
  parameter_value = excluded.parameter_value,
  metadata = trust_formula_parameters.metadata || excluded.metadata;

insert into trust_signal_weight_rules (
  formula_version,
  signal_source,
  signal_type,
  direction,
  severity,
  base_signal_weight,
  trust_delta,
  risk_delta,
  confidence_delta,
  metadata
)
values
  (
    'trust_v1',
    'attention_verification_engine',
    'valid_attention_verification',
    'positive',
    'medium',
    1.000000,
    0.020000,
    -0.015000,
    0.020000,
    '{"meaning": "clean verified attention improves trust slightly"}'::jsonb
  ),
  (
    'trust_v1',
    'attention_verification_engine',
    'attention_fraud_suspected',
    'negative',
    'critical',
    1.000000,
    -0.150000,
    0.250000,
    0.050000,
    '{"meaning": "suspected attention fraud sharply reduces trust and raises risk"}'::jsonb
  ),
  (
    'trust_v1',
    'attention_verification_engine',
    'failed_attention_verification',
    'negative',
    'low',
    1.000000,
    -0.020000,
    0.030000,
    0.010000,
    '{"meaning": "failed attention slightly lowers trust"}'::jsonb
  ),
  (
    'trust_v1',
    'attention_verification_engine',
    'neutral_attention_verification',
    'neutral',
    'info',
    1.000000,
    0.000000,
    0.000000,
    0.005000,
    '{"meaning": "neutral events add tiny confidence only"}'::jsonb
  ),
  (
    'trust_v1',
    'wallet_engine',
    'successful_withdrawal',
    'positive',
    'medium',
    1.000000,
    0.030000,
    -0.020000,
    0.020000,
    '{"meaning": "successful withdrawal lifecycle improves trust"}'::jsonb
  ),
  (
    'trust_v1',
    'wallet_engine',
    'withdrawal_failed_processor',
    'negative',
    'medium',
    1.000000,
    -0.030000,
    0.050000,
    0.020000,
    '{"meaning": "failed processor payout increases risk moderately"}'::jsonb
  ),
  (
    'trust_v1',
    'fraud_engine',
    'manual_fraud_confirmed',
    'negative',
    'critical',
    1.000000,
    -0.300000,
    0.400000,
    0.100000,
    '{"meaning": "confirmed fraud strongly impacts trust"}'::jsonb
  ),
  (
    'trust_v1',
    'admin_review',
    'manual_review_passed',
    'positive',
    'high',
    1.000000,
    0.100000,
    -0.150000,
    0.100000,
    '{"meaning": "admin review clears risk"}'::jsonb
  );

-- ---------------------------------------------------------------------------
-- 14. Formula detail view
-- ---------------------------------------------------------------------------

create or replace view trust_formula_details as
select
  fv.id as formula_id,
  fv.formula_version,
  fv.name,
  fv.description,
  fv.active,
  fv.valid_from,
  fv.valid_until,
  fv.created_by_admin_id,
  fv.created_at,

  jsonb_agg(
    distinct jsonb_build_object(
      'parameter_name', fp.parameter_name,
      'parameter_value', fp.parameter_value,
      'metadata', fp.metadata
    )
  ) filter (where fp.id is not null) as parameters,

  jsonb_agg(
    distinct jsonb_build_object(
      'rule_id', wr.id,
      'signal_source', wr.signal_source,
      'signal_type', wr.signal_type,
      'direction', wr.direction,
      'severity', wr.severity,
      'base_signal_weight', wr.base_signal_weight,
      'trust_delta', wr.trust_delta,
      'risk_delta', wr.risk_delta,
      'confidence_delta', wr.confidence_delta,
      'min_signal_value', wr.min_signal_value,
      'max_signal_value', wr.max_signal_value,
      'active', wr.active
    )
  ) filter (where wr.id is not null) as weight_rules

from trust_formula_versions fv
left join trust_formula_parameters fp
  on fp.formula_version = fv.formula_version
left join trust_signal_weight_rules wr
  on wr.formula_version = fv.formula_version
group by fv.id;

-- ---------------------------------------------------------------------------
-- 17. Safe activation (single active formula)
-- ---------------------------------------------------------------------------

create or replace function activate_trust_formula_version(
  p_formula_version text,
  p_admin_user_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns text
language plpgsql
as $$
begin
  if not exists (
    select 1
    from trust_formula_versions
    where formula_version = p_formula_version
  ) then
    raise exception 'trust formula version not found: %', p_formula_version;
  end if;

  update trust_formula_versions
  set
    active = false,
    valid_until =
      case
        when active is true then now()
        else valid_until
      end
  where active is true;

  update trust_formula_versions
  set
    active = true,
    valid_from = now(),
    valid_until = null,
    created_by_admin_id = coalesce(
      p_admin_user_id,
      created_by_admin_id
    ),
    metadata = metadata || p_metadata
  where formula_version = p_formula_version;

  return p_formula_version;
end;
$$;
