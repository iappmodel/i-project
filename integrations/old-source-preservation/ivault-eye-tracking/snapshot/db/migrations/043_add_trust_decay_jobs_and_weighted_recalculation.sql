-- 43/post-MVP schema — trust time-decay controls, decay run audits, and decay-aware recalculation jobs.

insert into trust_formula_parameters (
  formula_version,
  parameter_name,
  parameter_value,
  metadata
)
values
  ('trust_v1', 'decay_half_life_days', 30.000000, '{"meaning": "ordinary signal half-life"}'),
  ('trust_v1', 'critical_decay_half_life_days', 180.000000, '{"meaning": "critical fraud signal half-life"}'),
  ('trust_v1', 'minimum_decay_multiplier', 0.050000, '{"meaning": "old signals retain at least 5% weight inside lookback"}'),
  ('trust_v1', 'inactive_confidence_decay_days', 30.000000, '{"meaning": "confidence decays after inactivity"}'),
  ('trust_v1', 'inactive_confidence_decay_rate', 0.100000, '{"meaning": "confidence reduction per inactive decay period"}')
on conflict (formula_version, parameter_name)
do update set
  parameter_value = excluded.parameter_value,
  metadata = trust_formula_parameters.metadata || excluded.metadata;

create table if not exists trust_decay_runs (
  id uuid primary key default gen_random_uuid(),

  run_type text not null default 'scheduled',
  status text not null default 'processing',

  formula_version text not null,

  scanned_subject_count integer not null default 0,
  recalculated_subject_count integer not null default 0,
  failed_subject_count integer not null default 0,

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,

  failure_reason text,

  metadata jsonb not null default '{}'::jsonb,

  constraint trust_decay_runs_status_check
  check (
    status in (
      'processing',
      'completed',
      'failed'
    )
  )
);

create index if not exists trust_decay_runs_started_idx
on trust_decay_runs (started_at desc);

alter table trust_score_calculations
add column if not exists trust_decay_run_id uuid references trust_decay_runs(id);

create index if not exists trust_score_calculations_decay_run_idx
on trust_score_calculations (trust_decay_run_id);

create or replace function trust_decay_multiplier(
  p_occurred_at timestamptz,
  p_now timestamptz,
  p_half_life_days numeric,
  p_minimum_multiplier numeric default 0.05
)
returns numeric
language plpgsql
immutable
as $$
declare
  v_age_days numeric;
  v_multiplier numeric;
begin
  if p_occurred_at is null then
    return p_minimum_multiplier;
  end if;

  if p_half_life_days is null or p_half_life_days <= 0 then
    raise exception 'half life days must be positive';
  end if;

  if p_minimum_multiplier < 0 or p_minimum_multiplier > 1 then
    raise exception 'minimum multiplier must be between 0 and 1';
  end if;

  v_age_days :=
    greatest(
      extract(epoch from (p_now - p_occurred_at)) / 86400.0,
      0
    );

  v_multiplier := power(0.5, v_age_days / p_half_life_days);

  return greatest(v_multiplier, p_minimum_multiplier);
end;
$$;

create or replace function recalculate_trust_score(
  p_subject_id uuid,
  p_formula_version text default null,
  p_trust_decay_run_id uuid default null
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

  v_trust_baseline numeric;
  v_risk_baseline numeric;
  v_confidence_baseline numeric;
  v_lookback_days numeric;
  v_max_sample_confidence_bonus numeric;
  v_sample_count_for_max_bonus numeric;

  v_decay_half_life_days numeric;
  v_critical_decay_half_life_days numeric;
  v_minimum_decay_multiplier numeric;
  v_inactive_confidence_decay_days numeric;
  v_inactive_confidence_decay_rate numeric;

  v_last_signal_at timestamptz;
  v_inactive_days numeric;
  v_inactive_decay_periods numeric;
  v_inactive_confidence_penalty numeric;

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

  v_decay_half_life_days := get_trust_formula_parameter(
    v_formula_version,
    'decay_half_life_days',
    30
  );

  v_critical_decay_half_life_days := get_trust_formula_parameter(
    v_formula_version,
    'critical_decay_half_life_days',
    180
  );

  v_minimum_decay_multiplier := get_trust_formula_parameter(
    v_formula_version,
    'minimum_decay_multiplier',
    0.050000
  );

  v_inactive_confidence_decay_days := get_trust_formula_parameter(
    v_formula_version,
    'inactive_confidence_decay_days',
    30
  );

  v_inactive_confidence_decay_rate := get_trust_formula_parameter(
    v_formula_version,
    'inactive_confidence_decay_rate',
    0.100000
  );

  select
    count(*)::integer,
    count(*) filter (where direction = 'positive')::integer,
    count(*) filter (where direction = 'negative')::integer,
    coalesce(
      sum(
        trust_delta
        * signal_weight
        * trust_decay_multiplier(
            occurred_at,
            now(),
            case
              when severity = 'critical'
              then v_critical_decay_half_life_days
              else v_decay_half_life_days
            end,
            v_minimum_decay_multiplier
          )
      ),
      0
    ),
    coalesce(
      sum(
        risk_delta
        * signal_weight
        * trust_decay_multiplier(
            occurred_at,
            now(),
            case
              when severity = 'critical'
              then v_critical_decay_half_life_days
              else v_decay_half_life_days
            end,
            v_minimum_decay_multiplier
          )
      ),
      0
    ),
    coalesce(
      sum(
        confidence_delta
        * signal_weight
        * trust_decay_multiplier(
            occurred_at,
            now(),
            case
              when severity = 'critical'
              then v_critical_decay_half_life_days
              else v_decay_half_life_days
            end,
            v_minimum_decay_multiplier
          )
      ),
      0
    ),
    max(occurred_at)
  into
    v_event_count,
    v_positive_count,
    v_negative_count,
    v_trust_delta,
    v_risk_delta,
    v_confidence_delta,
    v_last_signal_at
  from trust_signal_events
  where subject_id = p_subject_id
    and occurred_at >= now() - ((v_lookback_days::text || ' days')::interval);

  v_sample_bonus := least(
    (v_event_count::numeric / greatest(v_sample_count_for_max_bonus, 1))
      * v_max_sample_confidence_bonus,
    v_max_sample_confidence_bonus
  );

  if v_last_signal_at is null then
    v_inactive_confidence_penalty := 0;
  else
    v_inactive_days :=
      greatest(
        extract(epoch from (now() - v_last_signal_at)) / 86400.0,
        0
      );

    v_inactive_decay_periods :=
      floor(v_inactive_days / greatest(v_inactive_confidence_decay_days, 1));

    v_inactive_confidence_penalty :=
      v_inactive_decay_periods * v_inactive_confidence_decay_rate;
  end if;

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
      v_confidence_baseline
      + v_confidence_delta
      + v_sample_bonus
      - v_inactive_confidence_penalty,
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
    trust_decay_run_id,
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
    p_trust_decay_run_id,
    jsonb_build_object(
      'trust_delta_sum_decayed',
      v_trust_delta,
      'risk_delta_sum_decayed',
      v_risk_delta,
      'confidence_delta_sum_decayed',
      v_confidence_delta,
      'sample_bonus',
      v_sample_bonus,
      'inactive_confidence_penalty',
      v_inactive_confidence_penalty,
      'last_signal_at',
      v_last_signal_at,
      'lookback_days',
      v_lookback_days,
      'decay_half_life_days',
      v_decay_half_life_days,
      'critical_decay_half_life_days',
      v_critical_decay_half_life_days,
      'minimum_decay_multiplier',
      v_minimum_decay_multiplier
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
    last_event_at = v_last_signal_at,
    last_calculated_at = now(),
    updated_at = now(),
    metadata = metadata || jsonb_build_object(
      'formula_version',
      v_formula_version,
      'last_decay_run_id',
      p_trust_decay_run_id
    )
  where subject_id = p_subject_id;

  return v_calculation_id;
end;
$$;

create or replace function run_trust_decay_job(
  p_batch_size integer default 500,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid;
  v_formula_version text;

  v_subject record;

  v_scanned integer := 0;
  v_recalculated integer := 0;
  v_failed integer := 0;
begin
  if p_batch_size <= 0 then
    raise exception 'batch size must be positive';
  end if;

  v_formula_version := get_active_trust_formula_version();

  insert into trust_decay_runs (
    run_type,
    status,
    formula_version,
    metadata
  )
  values (
    'scheduled',
    'processing',
    v_formula_version,
    p_metadata
  )
  returning id into v_run_id;

  for v_subject in
    select id
    from trust_score_subjects
    where status in ('active', 'watch', 'restricted')
    order by updated_at asc, id asc
    limit p_batch_size
    for update skip locked
  loop
    v_scanned := v_scanned + 1;

    begin
      perform recalculate_trust_score(
        v_subject.id,
        v_formula_version,
        v_run_id
      );

      v_recalculated := v_recalculated + 1;

    exception
      when others then
        v_failed := v_failed + 1;
    end;
  end loop;

  update trust_decay_runs
  set
    status = 'completed',
    completed_at = now(),
    scanned_subject_count = v_scanned,
    recalculated_subject_count = v_recalculated,
    failed_subject_count = v_failed
  where id = v_run_id;

  return v_run_id;

exception
  when others then
    if v_run_id is not null then
      update trust_decay_runs
      set
        status = 'failed',
        failed_at = now(),
        failure_reason = sqlerrm
      where id = v_run_id;
    end if;

    raise;
end;
$$;

create or replace function run_trust_decay_and_policy_sync_job(
  p_batch_size integer default 500,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid;
  v_formula_version text;

  v_subject record;

  v_scanned integer := 0;
  v_recalculated integer := 0;
  v_failed integer := 0;
begin
  if p_batch_size <= 0 then
    raise exception 'batch size must be positive';
  end if;

  v_formula_version := get_active_trust_formula_version();

  insert into trust_decay_runs (
    run_type,
    status,
    formula_version,
    metadata
  )
  values (
    'scheduled_with_policy_sync',
    'processing',
    v_formula_version,
    p_metadata
  )
  returning id into v_run_id;

  for v_subject in
    select
      id,
      wallet_id
    from trust_score_subjects
    where status in ('active', 'watch', 'restricted')
    order by updated_at asc, id asc
    limit p_batch_size
    for update skip locked
  loop
    v_scanned := v_scanned + 1;

    begin
      perform recalculate_trust_score(
        v_subject.id,
        v_formula_version,
        v_run_id
      );

      if v_subject.wallet_id is not null then
        perform apply_trust_score_to_wallet_policy(
          v_subject.wallet_id,
          p_metadata || jsonb_build_object(
            'trigger',
            'trust_decay_policy_sync',
            'trust_decay_run_id',
            v_run_id
          )
        );
      end if;

      v_recalculated := v_recalculated + 1;

    exception
      when others then
        v_failed := v_failed + 1;
    end;
  end loop;

  update trust_decay_runs
  set
    status = 'completed',
    completed_at = now(),
    scanned_subject_count = v_scanned,
    recalculated_subject_count = v_recalculated,
    failed_subject_count = v_failed
  where id = v_run_id;

  return v_run_id;

exception
  when others then
    if v_run_id is not null then
      update trust_decay_runs
      set
        status = 'failed',
        failed_at = now(),
        failure_reason = sqlerrm
      where id = v_run_id;
    end if;

    raise;
end;
$$;

create or replace view trust_decay_run_details as
select
  dr.id as trust_decay_run_id,
  dr.run_type,
  dr.status,
  dr.formula_version,
  dr.scanned_subject_count,
  dr.recalculated_subject_count,
  dr.failed_subject_count,
  dr.started_at,
  dr.completed_at,
  dr.failed_at,
  dr.failure_reason,

  count(c.id) as calculation_count,

  jsonb_agg(
    jsonb_build_object(
      'calculation_id', c.id,
      'subject_id', c.subject_id,
      'previous_trust_score', c.previous_trust_score,
      'new_trust_score', c.new_trust_score,
      'previous_risk_score', c.previous_risk_score,
      'new_risk_score', c.new_risk_score,
      'previous_confidence_score', c.previous_confidence_score,
      'new_confidence_score', c.new_confidence_score,
      'previous_trust_tier', c.previous_trust_tier,
      'new_trust_tier', c.new_trust_tier,
      'previous_risk_tier', c.previous_risk_tier,
      'new_risk_tier', c.new_risk_tier,
      'event_count', c.event_count,
      'calculated_at', c.calculated_at,
      'metadata', c.metadata
    )
    order by c.calculated_at asc
  ) filter (where c.id is not null) as calculations

from trust_decay_runs dr
left join trust_score_calculations c
  on c.trust_decay_run_id = dr.id
group by dr.id;

create or replace view trust_signal_decayed_contributions as
with active_formula as (
  select get_active_trust_formula_version() as formula_version
),

params as (
  select
    af.formula_version,

    get_trust_formula_parameter(
      af.formula_version,
      'decay_half_life_days',
      30
    ) as decay_half_life_days,

    get_trust_formula_parameter(
      af.formula_version,
      'critical_decay_half_life_days',
      180
    ) as critical_decay_half_life_days,

    get_trust_formula_parameter(
      af.formula_version,
      'minimum_decay_multiplier',
      0.050000
    ) as minimum_decay_multiplier

  from active_formula af
)

select
  e.id as trust_signal_event_id,
  e.subject_id,
  e.subject_type,
  e.user_id,
  e.wallet_id,
  e.signal_type,
  e.signal_source,
  e.direction,
  e.severity,
  e.signal_value,
  e.signal_weight,
  e.trust_delta,
  e.risk_delta,
  e.confidence_delta,
  e.occurred_at,

  trust_decay_multiplier(
    e.occurred_at,
    now(),
    case
      when e.severity = 'critical'
      then p.critical_decay_half_life_days
      else p.decay_half_life_days
    end,
    p.minimum_decay_multiplier
  ) as decay_multiplier,

  (
    e.trust_delta
    * e.signal_weight
    * trust_decay_multiplier(
        e.occurred_at,
        now(),
        case
          when e.severity = 'critical'
          then p.critical_decay_half_life_days
          else p.decay_half_life_days
        end,
        p.minimum_decay_multiplier
      )
  )::numeric(10, 6) as decayed_trust_contribution,

  (
    e.risk_delta
    * e.signal_weight
    * trust_decay_multiplier(
        e.occurred_at,
        now(),
        case
          when e.severity = 'critical'
          then p.critical_decay_half_life_days
          else p.decay_half_life_days
        end,
        p.minimum_decay_multiplier
      )
  )::numeric(10, 6) as decayed_risk_contribution,

  (
    e.confidence_delta
    * e.signal_weight
    * trust_decay_multiplier(
        e.occurred_at,
        now(),
        case
          when e.severity = 'critical'
          then p.critical_decay_half_life_days
          else p.decay_half_life_days
        end,
        p.minimum_decay_multiplier
      )
  )::numeric(10, 6) as decayed_confidence_contribution

from trust_signal_events e
cross join params p;
