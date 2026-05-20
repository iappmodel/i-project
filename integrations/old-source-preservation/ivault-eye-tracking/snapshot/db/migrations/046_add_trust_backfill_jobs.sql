-- Step 5.8 — Trust score backfill jobs with auditable run tracking.

create table if not exists trust_backfill_runs (
  id uuid primary key default gen_random_uuid(),

  run_type text not null default 'manual',
  status text not null default 'processing',

  formula_version text not null,

  scope text not null default 'all',

  subject_type text,
  wallet_id uuid references wallets(id),
  user_id uuid,

  scanned_subject_count integer not null default 0,
  recalculated_subject_count integer not null default 0,
  failed_subject_count integer not null default 0,

  apply_wallet_policy_sync boolean not null default false,

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,

  failure_reason text,

  requested_by_admin_id uuid,
  admin_case_id uuid,

  metadata jsonb not null default '{}'::jsonb,

  constraint trust_backfill_runs_status_check
  check (
    status in (
      'processing',
      'completed',
      'failed',
      'cancelled'
    )
  ),

  constraint trust_backfill_runs_scope_check
  check (
    scope in (
      'all',
      'subject_type',
      'wallet',
      'user'
    )
  )
);

create index if not exists trust_backfill_runs_started_idx
on trust_backfill_runs (started_at desc);

create index if not exists trust_backfill_runs_formula_idx
on trust_backfill_runs (formula_version, started_at desc);

create index if not exists trust_backfill_runs_status_idx
on trust_backfill_runs (status, started_at desc);

alter table trust_score_calculations
add column if not exists trust_backfill_run_id uuid references trust_backfill_runs(id);

create index if not exists trust_score_calculations_backfill_run_idx
on trust_score_calculations (trust_backfill_run_id);

create or replace function recalculate_trust_score(
  p_subject_id uuid,
  p_formula_version text default null,
  p_trust_decay_run_id uuid default null,
  p_trust_backfill_run_id uuid default null
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
    greatest(v_trust_baseline + v_trust_delta, 0.0000),
    1.0000
  );

  v_new_risk := least(
    greatest(v_risk_baseline + v_risk_delta, 0.0000),
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
    trust_backfill_run_id,
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
    p_trust_backfill_run_id,
    jsonb_build_object(
      'trust_delta_sum_decayed', v_trust_delta,
      'risk_delta_sum_decayed', v_risk_delta,
      'confidence_delta_sum_decayed', v_confidence_delta,
      'sample_bonus', v_sample_bonus,
      'inactive_confidence_penalty', v_inactive_confidence_penalty,
      'last_signal_at', v_last_signal_at,
      'lookback_days', v_lookback_days,
      'decay_half_life_days', v_decay_half_life_days,
      'critical_decay_half_life_days', v_critical_decay_half_life_days,
      'minimum_decay_multiplier', v_minimum_decay_multiplier,
      'trust_backfill_run_id', p_trust_backfill_run_id
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
      p_trust_decay_run_id,
      'last_backfill_run_id',
      p_trust_backfill_run_id
    )
  where subject_id = p_subject_id;

  return v_calculation_id;
end;
$$;

create or replace function run_trust_backfill_job(
  p_formula_version text default null,
  p_scope text default 'all',
  p_subject_type text default null,
  p_wallet_id uuid default null,
  p_user_id uuid default null,
  p_batch_size integer default 500,
  p_apply_wallet_policy_sync boolean default false,
  p_requested_by_admin_id uuid default null,
  p_admin_case_id uuid default null,
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

  if p_scope not in ('all', 'subject_type', 'wallet', 'user') then
    raise exception 'invalid backfill scope: %', p_scope;
  end if;

  if p_scope = 'subject_type' and p_subject_type is null then
    raise exception 'subject_type is required for subject_type scope';
  end if;

  if p_scope = 'wallet' and p_wallet_id is null then
    raise exception 'wallet_id is required for wallet scope';
  end if;

  if p_scope = 'user' and p_user_id is null then
    raise exception 'user_id is required for user scope';
  end if;

  v_formula_version := coalesce(
    p_formula_version,
    get_active_trust_formula_version()
  );

  insert into trust_backfill_runs (
    run_type,
    status,
    formula_version,
    scope,
    subject_type,
    wallet_id,
    user_id,
    apply_wallet_policy_sync,
    requested_by_admin_id,
    admin_case_id,
    metadata
  )
  values (
    'manual',
    'processing',
    v_formula_version,
    p_scope,
    p_subject_type,
    p_wallet_id,
    p_user_id,
    p_apply_wallet_policy_sync,
    p_requested_by_admin_id,
    p_admin_case_id,
    p_metadata
  )
  returning id into v_run_id;

  for v_subject in
    select
      s.id,
      s.wallet_id
    from trust_score_subjects s
    where
      (
        p_scope = 'all'
        or (p_scope = 'subject_type' and s.subject_type = p_subject_type)
        or (p_scope = 'wallet' and s.wallet_id = p_wallet_id)
        or (p_scope = 'user' and s.user_id = p_user_id)
      )
      and s.status in ('active', 'watch', 'restricted')
    order by s.updated_at asc, s.id asc
    limit p_batch_size
    for update skip locked
  loop
    v_scanned := v_scanned + 1;

    begin
      perform recalculate_trust_score(
        v_subject.id,
        v_formula_version,
        null,
        v_run_id
      );

      if p_apply_wallet_policy_sync is true
        and v_subject.wallet_id is not null then
        perform apply_effective_trust_score_to_wallet_policy(
          v_subject.wallet_id,
          p_metadata || jsonb_build_object(
            'trigger',
            'trust_backfill_policy_sync',
            'trust_backfill_run_id',
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

  update trust_backfill_runs
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
      update trust_backfill_runs
      set
        status = 'failed',
        failed_at = now(),
        failure_reason = sqlerrm
      where id = v_run_id;
    end if;

    raise;
end;
$$;

create or replace function continue_trust_backfill_job(
  p_trust_backfill_run_id uuid,
  p_batch_size integer default 500,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run trust_backfill_runs%rowtype;
  v_subject record;

  v_scanned integer := 0;
  v_recalculated integer := 0;
  v_failed integer := 0;
begin
  if p_trust_backfill_run_id is null then
    raise exception 'trust backfill run id is required';
  end if;

  if p_batch_size <= 0 then
    raise exception 'batch size must be positive';
  end if;

  select *
  into v_run
  from trust_backfill_runs
  where id = p_trust_backfill_run_id
  for update;

  if v_run.id is null then
    raise exception 'trust backfill run not found: %', p_trust_backfill_run_id;
  end if;

  if v_run.status not in ('processing', 'completed') then
    raise exception 'cannot continue backfill run with status %', v_run.status;
  end if;

  update trust_backfill_runs
  set status = 'processing'
  where id = v_run.id;

  for v_subject in
    select
      s.id,
      s.wallet_id
    from trust_score_subjects s
    where
      (
        v_run.scope = 'all'
        or (v_run.scope = 'subject_type' and s.subject_type = v_run.subject_type)
        or (v_run.scope = 'wallet' and s.wallet_id = v_run.wallet_id)
        or (v_run.scope = 'user' and s.user_id = v_run.user_id)
      )
      and s.status in ('active', 'watch', 'restricted')
      and not exists (
        select 1
        from trust_score_calculations c
        where c.subject_id = s.id
          and c.trust_backfill_run_id = v_run.id
      )
    order by s.updated_at asc, s.id asc
    limit p_batch_size
    for update skip locked
  loop
    v_scanned := v_scanned + 1;

    begin
      perform recalculate_trust_score(
        v_subject.id,
        v_run.formula_version,
        null,
        v_run.id
      );

      if v_run.apply_wallet_policy_sync is true
        and v_subject.wallet_id is not null then
        perform apply_effective_trust_score_to_wallet_policy(
          v_subject.wallet_id,
          p_metadata || jsonb_build_object(
            'trigger',
            'trust_backfill_policy_sync_continue',
            'trust_backfill_run_id',
            v_run.id
          )
        );
      end if;

      v_recalculated := v_recalculated + 1;

    exception
      when others then
        v_failed := v_failed + 1;
    end;
  end loop;

  update trust_backfill_runs
  set
    status = 'completed',
    completed_at = now(),
    scanned_subject_count = scanned_subject_count + v_scanned,
    recalculated_subject_count = recalculated_subject_count + v_recalculated,
    failed_subject_count = failed_subject_count + v_failed,
    metadata = metadata || p_metadata
  where id = v_run.id;

  return v_run.id;

exception
  when others then
    update trust_backfill_runs
    set
      status = 'failed',
      failed_at = now(),
      failure_reason = sqlerrm
    where id = p_trust_backfill_run_id;

    raise;
end;
$$;

create or replace function cancel_trust_backfill_run(
  p_trust_backfill_run_id uuid,
  p_admin_user_id uuid,
  p_reason text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  if p_trust_backfill_run_id is null then
    raise exception 'trust backfill run id is required';
  end if;

  if p_admin_user_id is null then
    raise exception 'admin user id is required';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'cancel reason is required';
  end if;

  update trust_backfill_runs
  set
    status = 'cancelled',
    failed_at = now(),
    failure_reason = p_reason,
    metadata = metadata || p_metadata || jsonb_build_object(
      'cancelled_by_admin_id',
      p_admin_user_id
    )
  where id = p_trust_backfill_run_id
    and status in ('processing', 'completed');

  if not found then
    raise exception 'trust backfill run not found or not cancellable';
  end if;

  return p_trust_backfill_run_id;
end;
$$;

create or replace view trust_backfill_run_details as
select
  br.id as trust_backfill_run_id,
  br.run_type,
  br.status,
  br.formula_version,
  br.scope,
  br.subject_type,
  br.wallet_id,
  br.user_id,
  br.scanned_subject_count,
  br.recalculated_subject_count,
  br.failed_subject_count,
  br.apply_wallet_policy_sync,
  br.started_at,
  br.completed_at,
  br.failed_at,
  br.failure_reason,
  br.requested_by_admin_id,
  br.admin_case_id,

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

from trust_backfill_runs br
left join trust_score_calculations c
  on c.trust_backfill_run_id = br.id
group by br.id;

create or replace view trust_backfill_subject_preview as
select
  s.id as subject_id,
  s.subject_type,
  s.subject_id as subject_entity_id,
  s.user_id,
  s.wallet_id,
  s.status as subject_status,

  c.trust_score,
  c.risk_score,
  c.confidence_score,
  c.trust_tier,
  c.risk_tier,
  c.override_status,

  c.sample_count,
  c.last_event_at,
  c.last_calculated_at,

  count(e.id) as signal_count,
  max(e.occurred_at) as latest_signal_at

from trust_score_subjects s
left join trust_score_current c
  on c.subject_id = s.id
left join trust_signal_events e
  on e.subject_id = s.id
group by s.id, c.subject_id;
