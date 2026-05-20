-- 41/post-MVP schema — formal trust layer tables, scoring, auditing, and gate decisions.

create table if not exists trust_score_subjects (
  id uuid primary key default gen_random_uuid(),

  subject_type text not null,
  subject_id uuid not null,

  user_id uuid,
  wallet_id uuid references wallets(id),

  status text not null default 'active',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  metadata jsonb not null default '{}'::jsonb,

  constraint trust_score_subjects_type_check
  check (
    subject_type in (
      'user',
      'wallet',
      'device',
      'session',
      'campaign_participant'
    )
  ),

  constraint trust_score_subjects_status_check
  check (
    status in (
      'active',
      'watch',
      'restricted',
      'blocked',
      'archived'
    )
  )
);

create unique index if not exists trust_score_subjects_unique
on trust_score_subjects (subject_type, subject_id);

create index if not exists trust_score_subjects_user_idx
on trust_score_subjects (user_id);

create index if not exists trust_score_subjects_wallet_idx
on trust_score_subjects (wallet_id);

create table if not exists trust_score_current (
  subject_id uuid primary key references trust_score_subjects(id),

  subject_type text not null,
  user_id uuid,
  wallet_id uuid references wallets(id),

  trust_score numeric(6, 4) not null default 0.5000,
  risk_score numeric(6, 4) not null default 0.5000,

  confidence_score numeric(6, 4) not null default 0.0000,

  trust_tier text not null default 'new',
  risk_tier text not null default 'unknown',

  last_event_at timestamptz,
  last_calculated_at timestamptz not null default now(),

  sample_count integer not null default 0,

  positive_signal_count integer not null default 0,
  negative_signal_count integer not null default 0,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint trust_score_current_score_check
  check (
    trust_score >= 0 and trust_score <= 1
    and risk_score >= 0 and risk_score <= 1
    and confidence_score >= 0 and confidence_score <= 1
  ),

  constraint trust_score_current_tier_check
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

  constraint trust_score_current_risk_tier_check
  check (
    risk_tier in (
      'unknown',
      'low',
      'medium',
      'high',
      'critical'
    )
  )
);

create index if not exists trust_score_current_user_idx
on trust_score_current (user_id);

create index if not exists trust_score_current_wallet_idx
on trust_score_current (wallet_id);

create index if not exists trust_score_current_trust_idx
on trust_score_current (trust_score desc, trust_tier);

create index if not exists trust_score_current_risk_idx
on trust_score_current (risk_score desc, risk_tier);

create table if not exists trust_signal_events (
  id uuid primary key default gen_random_uuid(),

  subject_id uuid not null references trust_score_subjects(id),

  subject_type text not null,
  user_id uuid,
  wallet_id uuid references wallets(id),

  signal_type text not null,
  signal_source text not null,

  direction text not null,
  severity text not null default 'medium',

  signal_value numeric(10, 6),
  signal_weight numeric(10, 6) not null default 1.000000,

  trust_delta numeric(10, 6) not null default 0.000000,
  risk_delta numeric(10, 6) not null default 0.000000,
  confidence_delta numeric(10, 6) not null default 0.000000,

  related_attention_event_id uuid,
  related_reward_id uuid,
  related_campaign_id uuid,
  related_wallet_ledger_entry_id uuid references wallet_ledger_entries(id),
  related_withdrawal_request_id uuid,

  idempotency_key text,

  metadata jsonb not null default '{}'::jsonb,

  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint trust_signal_events_direction_check
  check (
    direction in (
      'positive',
      'negative',
      'neutral'
    )
  ),

  constraint trust_signal_events_severity_check
  check (
    severity in (
      'info',
      'low',
      'medium',
      'high',
      'critical'
    )
  )
);

create unique index if not exists trust_signal_events_idempotency_unique
on trust_signal_events (signal_source, idempotency_key)
where idempotency_key is not null;

create index if not exists trust_signal_events_subject_idx
on trust_signal_events (subject_id, occurred_at desc);

create index if not exists trust_signal_events_user_idx
on trust_signal_events (user_id, occurred_at desc);

create index if not exists trust_signal_events_wallet_idx
on trust_signal_events (wallet_id, occurred_at desc);

create index if not exists trust_signal_events_signal_type_idx
on trust_signal_events (signal_type, occurred_at desc);

create table if not exists trust_score_calculations (
  id uuid primary key default gen_random_uuid(),

  subject_id uuid not null references trust_score_subjects(id),

  previous_trust_score numeric(6, 4),
  previous_risk_score numeric(6, 4),
  previous_confidence_score numeric(6, 4),

  new_trust_score numeric(6, 4) not null,
  new_risk_score numeric(6, 4) not null,
  new_confidence_score numeric(6, 4) not null,

  previous_trust_tier text,
  new_trust_tier text not null,

  previous_risk_tier text,
  new_risk_tier text not null,

  event_count integer not null default 0,

  positive_signal_count integer not null default 0,
  negative_signal_count integer not null default 0,

  formula_version text not null default 'trust_v1',

  metadata jsonb not null default '{}'::jsonb,

  calculated_at timestamptz not null default now(),

  constraint trust_score_calculations_score_check
  check (
    new_trust_score >= 0 and new_trust_score <= 1
    and new_risk_score >= 0 and new_risk_score <= 1
    and new_confidence_score >= 0 and new_confidence_score <= 1
  )
);

create index if not exists trust_score_calculations_subject_idx
on trust_score_calculations (subject_id, calculated_at desc);

create table if not exists trust_gate_decisions (
  id uuid primary key default gen_random_uuid(),

  subject_id uuid not null references trust_score_subjects(id),

  user_id uuid,
  wallet_id uuid references wallets(id),

  action_type text not null,

  decision text not null,
  gate_reason text,

  trust_score numeric(6, 4) not null,
  risk_score numeric(6, 4) not null,
  confidence_score numeric(6, 4) not null,

  trust_tier text not null,
  risk_tier text not null,

  policy_version text not null default 'trust_policy_v1',

  related_campaign_id uuid,
  related_reward_id uuid,
  related_withdrawal_request_id uuid,

  metadata jsonb not null default '{}'::jsonb,

  decided_at timestamptz not null default now(),

  constraint trust_gate_decisions_decision_check
  check (
    decision in (
      'allow',
      'allow_with_limit',
      'hold',
      'review',
      'deny'
    )
  )
);

create index if not exists trust_gate_decisions_subject_idx
on trust_gate_decisions (subject_id, decided_at desc);

create index if not exists trust_gate_decisions_wallet_idx
on trust_gate_decisions (wallet_id, decided_at desc);

create index if not exists trust_gate_decisions_action_idx
on trust_gate_decisions (action_type, decided_at desc);

create or replace function get_or_create_trust_subject(
  p_subject_type text,
  p_subject_id uuid,
  p_user_id uuid default null,
  p_wallet_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_subject_id uuid;
begin
  if p_subject_type not in (
    'user',
    'wallet',
    'device',
    'session',
    'campaign_participant'
  ) then
    raise exception 'invalid trust subject type: %', p_subject_type;
  end if;

  if p_subject_id is null then
    raise exception 'subject id is required';
  end if;

  insert into trust_score_subjects (
    subject_type,
    subject_id,
    user_id,
    wallet_id,
    metadata
  )
  values (
    p_subject_type,
    p_subject_id,
    p_user_id,
    p_wallet_id,
    p_metadata
  )
  on conflict (subject_type, subject_id)
  do update set
    user_id = coalesce(excluded.user_id, trust_score_subjects.user_id),
    wallet_id = coalesce(excluded.wallet_id, trust_score_subjects.wallet_id),
    metadata = trust_score_subjects.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_subject_id;

  insert into trust_score_current (
    subject_id,
    subject_type,
    user_id,
    wallet_id
  )
  values (
    v_subject_id,
    p_subject_type,
    p_user_id,
    p_wallet_id
  )
  on conflict (subject_id)
  do nothing;

  return v_subject_id;
end;
$$;

create or replace function trust_score_to_tier(
  p_trust_score numeric
)
returns text
language sql
immutable
as $$
  select case
    when p_trust_score >= 0.9000 then 'high_trust'
    when p_trust_score >= 0.7500 then 'trusted'
    when p_trust_score >= 0.4500 then 'normal'
    when p_trust_score >= 0.2500 then 'low'
    else 'restricted'
  end;
$$;

create or replace function risk_score_to_tier(
  p_risk_score numeric
)
returns text
language sql
immutable
as $$
  select case
    when p_risk_score >= 0.9500 then 'critical'
    when p_risk_score >= 0.8500 then 'high'
    when p_risk_score >= 0.5500 then 'medium'
    else 'low'
  end;
$$;

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
  p_signal_weight numeric default 1.0,
  p_trust_delta numeric default 0.0,
  p_risk_delta numeric default 0.0,
  p_confidence_delta numeric default 0.0,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_subject_id uuid;
  v_signal_id uuid;
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
    p_signal_weight,
    p_trust_delta,
    p_risk_delta,
    p_confidence_delta,
    p_idempotency_key,
    p_metadata
  )
  on conflict (signal_source, idempotency_key)
  where idempotency_key is not null
  do update set
    metadata = trust_signal_events.metadata || excluded.metadata
  returning id into v_signal_id;

  perform recalculate_trust_score(v_subject_id);

  return v_signal_id;
end;
$$;

create or replace function recalculate_trust_score(
  p_subject_id uuid
)
returns uuid
language plpgsql
as $$
declare
  v_current trust_score_current%rowtype;

  v_event_count integer;
  v_positive_count integer;
  v_negative_count integer;

  v_trust_delta numeric;
  v_risk_delta numeric;
  v_confidence_delta numeric;
  v_last_event_at timestamptz;

  v_new_trust numeric;
  v_new_risk numeric;
  v_new_confidence numeric;

  v_new_trust_tier text;
  v_new_risk_tier text;

  v_calculation_id uuid;
begin
  select *
  into v_current
  from trust_score_current
  where subject_id = p_subject_id
  for update;

  if v_current.subject_id is null then
    raise exception 'trust score current row not found for subject %', p_subject_id;
  end if;

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
    and occurred_at >= now() - interval '90 days';

  v_new_trust := least(
    greatest(
      0.5000 + v_trust_delta,
      0.0000
    ),
    1.0000
  );

  v_new_risk := least(
    greatest(
      0.5000 + v_risk_delta,
      0.0000
    ),
    1.0000
  );

  v_new_confidence := least(
    greatest(
      0.0000 + v_confidence_delta + least(v_event_count::numeric / 100.0, 0.5000),
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
    'trust_v1',
    jsonb_build_object(
      'trust_delta_sum',
      v_trust_delta,
      'risk_delta_sum',
      v_risk_delta,
      'confidence_delta_sum',
      v_confidence_delta,
      'window',
      '90_days'
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
    updated_at = now()
  where subject_id = p_subject_id;

  return v_calculation_id;
end;
$$;

create or replace function evaluate_trust_gate(
  p_subject_type text,
  p_subject_entity_id uuid,
  p_action_type text,
  p_user_id uuid default null,
  p_wallet_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns text
language plpgsql
as $$
declare
  v_subject_id uuid;
  v_current trust_score_current%rowtype;
  v_decision text;
  v_reason text;
begin
  if p_action_type is null or length(trim(p_action_type)) = 0 then
    raise exception 'action type is required';
  end if;

  v_subject_id := get_or_create_trust_subject(
    p_subject_type,
    p_subject_entity_id,
    p_user_id,
    p_wallet_id,
    p_metadata
  );

  select *
  into v_current
  from trust_score_current
  where subject_id = v_subject_id;

  if v_current.subject_id is null then
    raise exception 'trust score current not found for subject %', v_subject_id;
  end if;

  if p_action_type = 'withdraw' then
    if v_current.risk_score >= 0.8500 then
      v_decision := 'deny';
      v_reason := 'risk_score_too_high_for_withdrawal';
    elsif v_current.trust_score < 0.4500 then
      v_decision := 'review';
      v_reason := 'trust_score_too_low_for_withdrawal';
    elsif v_current.confidence_score < 0.3000 then
      v_decision := 'hold';
      v_reason := 'insufficient_trust_confidence';
    else
      v_decision := 'allow';
      v_reason := 'trust_gate_passed';
    end if;

  elsif p_action_type = 'convert' then
    if v_current.risk_score >= 0.8500 then
      v_decision := 'deny';
      v_reason := 'risk_score_too_high_for_conversion';
    elsif v_current.trust_score < 0.3500 then
      v_decision := 'review';
      v_reason := 'trust_score_too_low_for_conversion';
    else
      v_decision := 'allow';
      v_reason := 'trust_gate_passed';
    end if;

  elsif p_action_type = 'reward_release' then
    if v_current.risk_score >= 0.9500 then
      v_decision := 'deny';
      v_reason := 'critical_risk_blocks_reward_release';
    elsif v_current.risk_score >= 0.8500 then
      v_decision := 'hold';
      v_reason := 'high_risk_holds_reward_release';
    else
      v_decision := 'allow';
      v_reason := 'trust_gate_passed';
    end if;

  else
    if v_current.risk_score >= 0.9500 then
      v_decision := 'review';
      v_reason := 'critical_risk_generic_review';
    else
      v_decision := 'allow';
      v_reason := 'default_allow';
    end if;
  end if;

  insert into trust_gate_decisions (
    subject_id,
    user_id,
    wallet_id,
    action_type,
    decision,
    gate_reason,
    trust_score,
    risk_score,
    confidence_score,
    trust_tier,
    risk_tier,
    metadata
  )
  values (
    v_subject_id,
    coalesce(p_user_id, v_current.user_id),
    coalesce(p_wallet_id, v_current.wallet_id),
    p_action_type,
    v_decision,
    v_reason,
    v_current.trust_score,
    v_current.risk_score,
    v_current.confidence_score,
    v_current.trust_tier,
    v_current.risk_tier,
    p_metadata
  );

  return v_decision;
end;
$$;

create or replace view trust_score_subject_details as
select
  s.id as trust_subject_id,
  s.subject_type,
  s.subject_id,
  s.user_id,
  s.wallet_id,
  s.status as subject_status,

  c.trust_score,
  c.risk_score,
  c.confidence_score,
  c.trust_tier,
  c.risk_tier,
  c.sample_count,
  c.positive_signal_count,
  c.negative_signal_count,
  c.last_calculated_at,

  count(e.id) as total_signal_count,
  max(e.occurred_at) as last_signal_at,

  jsonb_agg(
    jsonb_build_object(
      'signal_id', e.id,
      'signal_type', e.signal_type,
      'signal_source', e.signal_source,
      'direction', e.direction,
      'severity', e.severity,
      'signal_value', e.signal_value,
      'signal_weight', e.signal_weight,
      'trust_delta', e.trust_delta,
      'risk_delta', e.risk_delta,
      'confidence_delta', e.confidence_delta,
      'occurred_at', e.occurred_at,
      'metadata', e.metadata
    )
    order by e.occurred_at desc
  ) filter (where e.id is not null) as recent_signals

from trust_score_subjects s
left join trust_score_current c
  on c.subject_id = s.id
left join trust_signal_events e
  on e.subject_id = s.id
group by s.id, c.subject_id;

create or replace function apply_trust_score_to_wallet_policy(
  p_wallet_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_subject_id uuid;
  v_current trust_score_current%rowtype;
begin
  if p_wallet_id is null then
    raise exception 'wallet id is required';
  end if;

  v_subject_id := get_or_create_trust_subject(
    'wallet',
    p_wallet_id,
    null,
    p_wallet_id,
    p_metadata
  );

  select *
  into v_current
  from trust_score_current
  where subject_id = v_subject_id;

  if v_current.subject_id is null then
    raise exception 'trust score current not found for wallet %', p_wallet_id;
  end if;

  return apply_wallet_risk_policy(
    p_wallet_id,
    v_current.risk_score,
    v_current.trust_score,
    'trust_score_policy_sync',
    p_metadata || jsonb_build_object(
      'trust_subject_id',
      v_subject_id,
      'trust_score',
      v_current.trust_score,
      'risk_score',
      v_current.risk_score,
      'confidence_score',
      v_current.confidence_score,
      'trust_tier',
      v_current.trust_tier,
      'risk_tier',
      v_current.risk_tier
    )
  );
end;
$$;
