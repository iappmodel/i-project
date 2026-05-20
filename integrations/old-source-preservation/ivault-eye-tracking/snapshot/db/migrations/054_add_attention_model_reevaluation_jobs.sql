-- Step 6.7 — Model backfill / re-evaluation jobs
-- Original attention event rows are immutable historical truth.
-- Re-evaluation results are stored separately as auditable comparisons.

create table if not exists attention_model_reevaluation_runs (
  id uuid primary key default gen_random_uuid(),

  run_type text not null default 'manual',
  status text not null default 'processing',

  source_model_version text,
  source_pipeline_version text,
  source_scoring_formula_version text,

  target_model_version text not null references attention_model_versions(model_version),
  target_pipeline_version text not null references attention_pipeline_versions(pipeline_version),
  target_runtime_signal_schema_version text not null references runtime_signal_schema_versions(schema_version),
  target_scoring_formula_version text not null references attention_scoring_formula_versions(formula_version),

  scope text not null default 'all',

  campaign_id uuid,
  wallet_id uuid references wallets(id),
  user_id uuid,

  occurred_after timestamptz,
  occurred_before timestamptz,

  scanned_event_count integer not null default 0,
  reevaluated_event_count integer not null default 0,
  changed_decision_count integer not null default 0,
  failed_event_count integer not null default 0,

  apply_reward_actions boolean not null default false,
  apply_trust_actions boolean not null default false,

  requested_by_admin_id uuid references admin_users(id),
  admin_case_id uuid,

  metadata jsonb not null default '{}'::jsonb,

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,

  failure_reason text,

  constraint attention_model_reevaluation_runs_status_check
  check (
    status in (
      'processing',
      'completed',
      'failed',
      'cancelled'
    )
  ),

  constraint attention_model_reevaluation_runs_scope_check
  check (
    scope in (
      'all',
      'campaign',
      'wallet',
      'user',
      'model_version',
      'pipeline_version',
      'date_range'
    )
  )
);

create index if not exists attention_model_reevaluation_runs_started_idx
on attention_model_reevaluation_runs (started_at desc);

create index if not exists attention_model_reevaluation_runs_status_idx
on attention_model_reevaluation_runs (status, started_at desc);

create index if not exists attention_model_reevaluation_runs_target_idx
on attention_model_reevaluation_runs (
  target_model_version,
  target_pipeline_version,
  target_scoring_formula_version
);

create table if not exists attention_model_reevaluation_results (
  id uuid primary key default gen_random_uuid(),

  reevaluation_run_id uuid not null references attention_model_reevaluation_runs(id),

  original_attention_event_id uuid not null references attention_verification_events(id),
  original_attention_session_id uuid references attention_verification_sessions(id),

  user_id uuid not null,
  wallet_id uuid references wallets(id),
  campaign_id uuid,
  creative_id uuid,
  placement_id uuid,

  original_model_version text,
  original_pipeline_version text,
  original_scoring_formula_version text,

  target_model_version text not null,
  target_pipeline_version text not null,
  target_runtime_signal_schema_version text not null,
  target_scoring_formula_version text not null,

  original_decision text not null,
  reevaluated_decision text not null,

  decision_changed boolean not null default false,

  original_attention_score numeric(6, 4),
  reevaluated_attention_score numeric(6, 4),

  original_confidence_score numeric(6, 4),
  reevaluated_confidence_score numeric(6, 4),

  original_fraud_risk_score numeric(6, 4),
  reevaluated_fraud_risk_score numeric(6, 4),

  original_quality_score numeric(6, 4),
  reevaluated_quality_score numeric(6, 4),

  original_reward_eligible boolean,
  reevaluated_reward_eligible boolean,

  reward_action_recommendation text,
  trust_action_recommendation text,

  status text not null default 'completed',

  error_message text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint attention_model_reevaluation_results_status_check
  check (
    status in (
      'completed',
      'failed',
      'skipped'
    )
  ),

  constraint attention_model_reevaluation_results_reward_action_check
  check (
    reward_action_recommendation is null
    or reward_action_recommendation in (
      'none',
      'issue_missing_reward',
      'hold_future_rewards',
      'review_possible_overreward',
      'review_possible_underreward',
      'clawback_review'
    )
  ),

  constraint attention_model_reevaluation_results_trust_action_check
  check (
    trust_action_recommendation is null
    or trust_action_recommendation in (
      'none',
      'emit_positive_signal',
      'emit_negative_signal',
      'review_trust_score',
      'fraud_review'
    )
  )
);

create unique index if not exists attention_model_reevaluation_results_unique
on attention_model_reevaluation_results (
  reevaluation_run_id,
  original_attention_event_id
);

create index if not exists attention_model_reevaluation_results_event_idx
on attention_model_reevaluation_results (original_attention_event_id);

create index if not exists attention_model_reevaluation_results_wallet_idx
on attention_model_reevaluation_results (wallet_id, created_at desc);

create index if not exists attention_model_reevaluation_results_campaign_idx
on attention_model_reevaluation_results (campaign_id, created_at desc);

create index if not exists attention_model_reevaluation_results_changed_idx
on attention_model_reevaluation_results (decision_changed, created_at desc);

create table if not exists attention_reevaluation_action_queue (
  id uuid primary key default gen_random_uuid(),

  reevaluation_result_id uuid not null references attention_model_reevaluation_results(id),
  reevaluation_run_id uuid not null references attention_model_reevaluation_runs(id),

  original_attention_event_id uuid not null references attention_verification_events(id),

  user_id uuid not null,
  wallet_id uuid references wallets(id),
  campaign_id uuid,

  action_type text not null,
  severity text not null default 'medium',

  status text not null default 'open',

  reason text not null,

  assigned_admin_user_id uuid references admin_users(id),
  resolved_by_admin_id uuid references admin_users(id),

  resolution_action text,
  resolution_note text,

  created_at timestamptz not null default now(),
  resolved_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  constraint attention_reevaluation_action_queue_action_check
  check (
    action_type in (
      'issue_missing_reward',
      'review_overreward',
      'review_underreward',
      'fraud_review',
      'trust_review',
      'model_regression_review'
    )
  ),

  constraint attention_reevaluation_action_queue_severity_check
  check (
    severity in (
      'low',
      'medium',
      'high',
      'critical'
    )
  ),

  constraint attention_reevaluation_action_queue_status_check
  check (
    status in (
      'open',
      'assigned',
      'resolved',
      'dismissed'
    )
  )
);

create index if not exists attention_reevaluation_action_queue_status_idx
on attention_reevaluation_action_queue (status, severity, created_at desc);

create index if not exists attention_reevaluation_action_queue_wallet_idx
on attention_reevaluation_action_queue (wallet_id, created_at desc);

create index if not exists attention_reevaluation_action_queue_campaign_idx
on attention_reevaluation_action_queue (campaign_id, created_at desc);

create or replace function simulate_attention_reevaluation_score(
  p_attention_event_id uuid,
  p_target_scoring_formula_version text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
stable
as $$
declare
  v_event attention_verification_events%rowtype;

  v_attention_score numeric;
  v_confidence_score numeric;
  v_fraud_risk_score numeric;
  v_quality_score numeric;

  v_decision text;
  v_reward_eligible boolean;
begin
  select *
  into v_event
  from attention_verification_events
  where id = p_attention_event_id;

  if v_event.id is null then
    raise exception 'attention event not found: %', p_attention_event_id;
  end if;

  v_attention_score := least(
    greatest(
      coalesce(v_event.gaze_score, v_event.attention_score, 0) * 0.30
      + coalesce(v_event.fixation_score, v_event.attention_score, 0) * 0.25
      + coalesce(v_event.liveness_score, v_event.confidence_score, 0) * 0.20
      + coalesce(v_event.completion_score, 1.0) * 0.15
      + coalesce(v_event.quality_score, 0) * 0.10,
      0.0000
    ),
    1.0000
  );

  v_confidence_score := least(
    greatest(
      coalesce(v_event.confidence_score, 0),
      0.0000
    ),
    1.0000
  );

  v_fraud_risk_score := least(
    greatest(
      coalesce(v_event.fraud_risk_score, 0),
      0.0000
    ),
    1.0000
  );

  v_quality_score := least(
    greatest(
      coalesce(v_event.quality_score, 0),
      0.0000
    ),
    1.0000
  );

  v_decision :=
    case
      when v_fraud_risk_score >= 0.8500 then 'fraud_suspected'
      when v_attention_score >= 0.7500
        and v_confidence_score >= 0.6000
        and v_quality_score >= 0.6000
      then 'passed'
      when v_attention_score < 0.5000 then 'failed'
      else 'inconclusive'
    end;

  v_reward_eligible :=
    v_decision = 'passed'
    and v_attention_score >= 0.7500
    and v_confidence_score >= 0.6000
    and v_fraud_risk_score <= 0.6500
    and v_quality_score >= 0.6000;

  return jsonb_build_object(
    'decision', v_decision,
    'attention_score', v_attention_score,
    'confidence_score', v_confidence_score,
    'fraud_risk_score', v_fraud_risk_score,
    'quality_score', v_quality_score,
    'reward_eligible', v_reward_eligible,
    'scoring_formula_version', p_target_scoring_formula_version,
    'method', 'stored_score_simulation_v1'
  );
end;
$$;

create or replace function reevaluate_attention_event(
  p_reevaluation_run_id uuid,
  p_attention_event_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run attention_model_reevaluation_runs%rowtype;
  v_event attention_verification_events%rowtype;

  v_eval jsonb;

  v_reevaluated_decision text;
  v_reevaluated_attention_score numeric;
  v_reevaluated_confidence_score numeric;
  v_reevaluated_fraud_risk_score numeric;
  v_reevaluated_quality_score numeric;
  v_reevaluated_reward_eligible boolean;

  v_decision_changed boolean;

  v_reward_action text;
  v_trust_action text;

  v_result_id uuid;
begin
  if p_reevaluation_run_id is null then
    raise exception 'reevaluation run id is required';
  end if;

  if p_attention_event_id is null then
    raise exception 'attention event id is required';
  end if;

  select *
  into v_run
  from attention_model_reevaluation_runs
  where id = p_reevaluation_run_id;

  if v_run.id is null then
    raise exception 'reevaluation run not found: %', p_reevaluation_run_id;
  end if;

  select *
  into v_event
  from attention_verification_events
  where id = p_attention_event_id;

  if v_event.id is null then
    raise exception 'attention event not found: %', p_attention_event_id;
  end if;

  perform assert_attention_runtime_version_allowed(
    v_run.target_model_version,
    v_run.target_pipeline_version,
    v_run.target_runtime_signal_schema_version
  );

  v_eval := simulate_attention_reevaluation_score(
    v_event.id,
    v_run.target_scoring_formula_version,
    p_metadata
  );

  v_reevaluated_decision := v_eval->>'decision';
  v_reevaluated_attention_score := (v_eval->>'attention_score')::numeric;
  v_reevaluated_confidence_score := (v_eval->>'confidence_score')::numeric;
  v_reevaluated_fraud_risk_score := (v_eval->>'fraud_risk_score')::numeric;
  v_reevaluated_quality_score := (v_eval->>'quality_score')::numeric;
  v_reevaluated_reward_eligible := (v_eval->>'reward_eligible')::boolean;

  v_decision_changed := v_event.decision <> v_reevaluated_decision;

  v_reward_action :=
    case
      when v_event.reward_eligible is false
        and v_reevaluated_reward_eligible is true
      then 'review_possible_underreward'

      when v_event.reward_eligible is true
        and v_reevaluated_reward_eligible is false
        and v_event.reward_issued is true
      then 'review_possible_overreward'

      when v_event.reward_eligible is false
        and v_reevaluated_reward_eligible is true
        and v_event.reward_issued is false
      then 'issue_missing_reward'

      else 'none'
    end;

  v_trust_action :=
    case
      when v_reevaluated_decision = 'fraud_suspected'
        and v_event.decision <> 'fraud_suspected'
      then 'fraud_review'

      when v_decision_changed is true
      then 'review_trust_score'

      else 'none'
    end;

  insert into attention_model_reevaluation_results (
    reevaluation_run_id,
    original_attention_event_id,
    original_attention_session_id,
    user_id,
    wallet_id,
    campaign_id,
    creative_id,
    placement_id,

    original_model_version,
    original_pipeline_version,
    original_scoring_formula_version,

    target_model_version,
    target_pipeline_version,
    target_runtime_signal_schema_version,
    target_scoring_formula_version,

    original_decision,
    reevaluated_decision,
    decision_changed,

    original_attention_score,
    reevaluated_attention_score,

    original_confidence_score,
    reevaluated_confidence_score,

    original_fraud_risk_score,
    reevaluated_fraud_risk_score,

    original_quality_score,
    reevaluated_quality_score,

    original_reward_eligible,
    reevaluated_reward_eligible,

    reward_action_recommendation,
    trust_action_recommendation,

    status,
    metadata
  )
  values (
    v_run.id,
    v_event.id,
    v_event.attention_session_id,
    v_event.user_id,
    v_event.wallet_id,
    v_event.campaign_id,
    v_event.creative_id,
    v_event.placement_id,

    v_event.model_version,
    v_event.pipeline_version,
    v_event.scoring_formula_version,

    v_run.target_model_version,
    v_run.target_pipeline_version,
    v_run.target_runtime_signal_schema_version,
    v_run.target_scoring_formula_version,

    v_event.decision,
    v_reevaluated_decision,
    v_decision_changed,

    v_event.attention_score,
    v_reevaluated_attention_score,

    v_event.confidence_score,
    v_reevaluated_confidence_score,

    v_event.fraud_risk_score,
    v_reevaluated_fraud_risk_score,

    v_event.quality_score,
    v_reevaluated_quality_score,

    v_event.reward_eligible,
    v_reevaluated_reward_eligible,

    v_reward_action,
    v_trust_action,

    'completed',
    p_metadata || jsonb_build_object(
      'reevaluation_payload',
      v_eval
    )
  )
  on conflict (reevaluation_run_id, original_attention_event_id)
  do update set
    metadata = attention_model_reevaluation_results.metadata || excluded.metadata
  returning id into v_result_id;

  if v_reward_action <> 'none'
    or v_trust_action <> 'none' then

    insert into attention_reevaluation_action_queue (
      reevaluation_result_id,
      reevaluation_run_id,
      original_attention_event_id,
      user_id,
      wallet_id,
      campaign_id,
      action_type,
      severity,
      reason,
      metadata
    )
    values (
      v_result_id,
      v_run.id,
      v_event.id,
      v_event.user_id,
      v_event.wallet_id,
      v_event.campaign_id,
      case
        when v_reward_action = 'issue_missing_reward'
        then 'issue_missing_reward'
        when v_reward_action = 'review_possible_overreward'
        then 'review_overreward'
        when v_reward_action = 'review_possible_underreward'
        then 'review_underreward'
        when v_trust_action = 'fraud_review'
        then 'fraud_review'
        else 'trust_review'
      end,
      case
        when v_trust_action = 'fraud_review' then 'critical'
        when v_reward_action = 'review_possible_overreward' then 'high'
        else 'medium'
      end,
      'attention re-evaluation changed operational recommendation',
      p_metadata || jsonb_build_object(
        'reward_action_recommendation',
        v_reward_action,
        'trust_action_recommendation',
        v_trust_action,
        'original_decision',
        v_event.decision,
        'reevaluated_decision',
        v_reevaluated_decision
      )
    );
  end if;

  return v_result_id;

exception
  when others then
    insert into attention_model_reevaluation_results (
      reevaluation_run_id,
      original_attention_event_id,
      user_id,
      wallet_id,
      campaign_id,
      target_model_version,
      target_pipeline_version,
      target_runtime_signal_schema_version,
      target_scoring_formula_version,
      original_decision,
      reevaluated_decision,
      decision_changed,
      status,
      error_message,
      metadata
    )
    select
      p_reevaluation_run_id,
      e.id,
      e.user_id,
      e.wallet_id,
      e.campaign_id,
      coalesce(v_run.target_model_version, 'unknown'),
      coalesce(v_run.target_pipeline_version, 'unknown'),
      coalesce(v_run.target_runtime_signal_schema_version, 'unknown'),
      coalesce(v_run.target_scoring_formula_version, 'unknown'),
      e.decision,
      e.decision,
      false,
      'failed',
      sqlerrm,
      p_metadata
    from attention_verification_events e
    where e.id = p_attention_event_id
    on conflict (reevaluation_run_id, original_attention_event_id)
    do nothing;

    raise;
end;
$$;

create or replace function run_attention_model_reevaluation_job(
  p_target_model_version text,
  p_target_pipeline_version text,
  p_target_runtime_signal_schema_version text,
  p_target_scoring_formula_version text,
  p_scope text default 'all',
  p_campaign_id uuid default null,
  p_wallet_id uuid default null,
  p_user_id uuid default null,
  p_source_model_version text default null,
  p_source_pipeline_version text default null,
  p_source_scoring_formula_version text default null,
  p_occurred_after timestamptz default null,
  p_occurred_before timestamptz default null,
  p_batch_size integer default 500,
  p_apply_reward_actions boolean default false,
  p_apply_trust_actions boolean default false,
  p_requested_by_admin_id uuid default null,
  p_admin_case_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid;
  v_event record;

  v_scanned integer := 0;
  v_reevaluated integer := 0;
  v_changed integer := 0;
  v_failed integer := 0;

  v_result_id uuid;
  v_changed_result boolean;
begin
  if p_batch_size <= 0 then
    raise exception 'batch size must be positive';
  end if;

  if p_scope not in (
    'all',
    'campaign',
    'wallet',
    'user',
    'model_version',
    'pipeline_version',
    'date_range'
  ) then
    raise exception 'invalid re-evaluation scope: %', p_scope;
  end if;

  perform assert_attention_runtime_version_allowed(
    p_target_model_version,
    p_target_pipeline_version,
    p_target_runtime_signal_schema_version
  );

  insert into attention_model_reevaluation_runs (
    run_type,
    status,

    source_model_version,
    source_pipeline_version,
    source_scoring_formula_version,

    target_model_version,
    target_pipeline_version,
    target_runtime_signal_schema_version,
    target_scoring_formula_version,

    scope,
    campaign_id,
    wallet_id,
    user_id,
    occurred_after,
    occurred_before,

    apply_reward_actions,
    apply_trust_actions,

    requested_by_admin_id,
    admin_case_id,
    metadata
  )
  values (
    'manual',
    'processing',

    p_source_model_version,
    p_source_pipeline_version,
    p_source_scoring_formula_version,

    p_target_model_version,
    p_target_pipeline_version,
    p_target_runtime_signal_schema_version,
    p_target_scoring_formula_version,

    p_scope,
    p_campaign_id,
    p_wallet_id,
    p_user_id,
    p_occurred_after,
    p_occurred_before,

    p_apply_reward_actions,
    p_apply_trust_actions,

    p_requested_by_admin_id,
    p_admin_case_id,
    p_metadata
  )
  returning id into v_run_id;

  for v_event in
    select e.id
    from attention_verification_events e
    where
      (
        p_scope = 'all'
        or (p_scope = 'campaign' and e.campaign_id = p_campaign_id)
        or (p_scope = 'wallet' and e.wallet_id = p_wallet_id)
        or (p_scope = 'user' and e.user_id = p_user_id)
        or (p_scope = 'model_version' and e.model_version = p_source_model_version)
        or (p_scope = 'pipeline_version' and e.pipeline_version = p_source_pipeline_version)
        or p_scope = 'date_range'
      )
      and (p_source_model_version is null or e.model_version = p_source_model_version)
      and (p_source_pipeline_version is null or e.pipeline_version = p_source_pipeline_version)
      and (p_source_scoring_formula_version is null or e.scoring_formula_version = p_source_scoring_formula_version)
      and (p_occurred_after is null or e.occurred_at >= p_occurred_after)
      and (p_occurred_before is null or e.occurred_at < p_occurred_before)
    order by e.occurred_at asc, e.id asc
    limit p_batch_size
  loop
    v_scanned := v_scanned + 1;

    begin
      v_result_id := reevaluate_attention_event(
        v_run_id,
        v_event.id,
        p_metadata
      );

      select decision_changed
      into v_changed_result
      from attention_model_reevaluation_results
      where id = v_result_id;

      v_reevaluated := v_reevaluated + 1;

      if v_changed_result is true then
        v_changed := v_changed + 1;
      end if;

    exception
      when others then
        v_failed := v_failed + 1;
    end;
  end loop;

  update attention_model_reevaluation_runs
  set
    status = 'completed',
    completed_at = now(),
    scanned_event_count = v_scanned,
    reevaluated_event_count = v_reevaluated,
    changed_decision_count = v_changed,
    failed_event_count = v_failed
  where id = v_run_id;

  return v_run_id;

exception
  when others then
    if v_run_id is not null then
      update attention_model_reevaluation_runs
      set
        status = 'failed',
        failed_at = now(),
        failure_reason = sqlerrm
      where id = v_run_id;
    end if;

    raise;
end;
$$;

create or replace function continue_attention_model_reevaluation_job(
  p_reevaluation_run_id uuid,
  p_batch_size integer default 500,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run attention_model_reevaluation_runs%rowtype;
  v_event record;

  v_scanned integer := 0;
  v_reevaluated integer := 0;
  v_changed integer := 0;
  v_failed integer := 0;

  v_result_id uuid;
  v_changed_result boolean;
begin
  if p_reevaluation_run_id is null then
    raise exception 're-evaluation run id is required';
  end if;

  if p_batch_size <= 0 then
    raise exception 'batch size must be positive';
  end if;

  select *
  into v_run
  from attention_model_reevaluation_runs
  where id = p_reevaluation_run_id
  for update;

  if v_run.id is null then
    raise exception 're-evaluation run not found: %', p_reevaluation_run_id;
  end if;

  if v_run.status not in ('processing', 'completed') then
    raise exception 'cannot continue re-evaluation run with status %', v_run.status;
  end if;

  update attention_model_reevaluation_runs
  set status = 'processing'
  where id = v_run.id;

  for v_event in
    select e.id
    from attention_verification_events e
    where
      (
        v_run.scope = 'all'
        or (v_run.scope = 'campaign' and e.campaign_id = v_run.campaign_id)
        or (v_run.scope = 'wallet' and e.wallet_id = v_run.wallet_id)
        or (v_run.scope = 'user' and e.user_id = v_run.user_id)
        or (v_run.scope = 'model_version' and e.model_version = v_run.source_model_version)
        or (v_run.scope = 'pipeline_version' and e.pipeline_version = v_run.source_pipeline_version)
        or v_run.scope = 'date_range'
      )
      and (v_run.source_model_version is null or e.model_version = v_run.source_model_version)
      and (v_run.source_pipeline_version is null or e.pipeline_version = v_run.source_pipeline_version)
      and (v_run.source_scoring_formula_version is null or e.scoring_formula_version = v_run.source_scoring_formula_version)
      and (v_run.occurred_after is null or e.occurred_at >= v_run.occurred_after)
      and (v_run.occurred_before is null or e.occurred_at < v_run.occurred_before)
      and not exists (
        select 1
        from attention_model_reevaluation_results r
        where r.reevaluation_run_id = v_run.id
          and r.original_attention_event_id = e.id
      )
    order by e.occurred_at asc, e.id asc
    limit p_batch_size
  loop
    v_scanned := v_scanned + 1;

    begin
      v_result_id := reevaluate_attention_event(
        v_run.id,
        v_event.id,
        p_metadata
      );

      select decision_changed
      into v_changed_result
      from attention_model_reevaluation_results
      where id = v_result_id;

      v_reevaluated := v_reevaluated + 1;

      if v_changed_result is true then
        v_changed := v_changed + 1;
      end if;

    exception
      when others then
        v_failed := v_failed + 1;
    end;
  end loop;

  update attention_model_reevaluation_runs
  set
    status = 'completed',
    completed_at = now(),
    scanned_event_count = scanned_event_count + v_scanned,
    reevaluated_event_count = reevaluated_event_count + v_reevaluated,
    changed_decision_count = changed_decision_count + v_changed,
    failed_event_count = failed_event_count + v_failed,
    metadata = metadata || p_metadata
  where id = v_run.id;

  return v_run.id;

exception
  when others then
    update attention_model_reevaluation_runs
    set
      status = 'failed',
      failed_at = now(),
      failure_reason = sqlerrm
    where id = p_reevaluation_run_id;

    raise;
end;
$$;

create or replace function cancel_attention_model_reevaluation_run(
  p_reevaluation_run_id uuid,
  p_admin_user_id uuid,
  p_reason text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  if p_reevaluation_run_id is null then
    raise exception 're-evaluation run id is required';
  end if;

  if p_admin_user_id is null then
    raise exception 'admin user id is required';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'cancel reason is required';
  end if;

  update attention_model_reevaluation_runs
  set
    status = 'cancelled',
    failed_at = now(),
    failure_reason = p_reason,
    metadata = metadata || p_metadata || jsonb_build_object(
      'cancelled_by_admin_id',
      p_admin_user_id
    )
  where id = p_reevaluation_run_id
    and status in ('processing', 'completed');

  if not found then
    raise exception 're-evaluation run not found or not cancellable';
  end if;

  return p_reevaluation_run_id;
end;
$$;

create or replace view attention_model_reevaluation_run_details as
select
  r.id as reevaluation_run_id,
  r.run_type,
  r.status,

  r.source_model_version,
  r.source_pipeline_version,
  r.source_scoring_formula_version,

  r.target_model_version,
  r.target_pipeline_version,
  r.target_runtime_signal_schema_version,
  r.target_scoring_formula_version,

  r.scope,
  r.campaign_id,
  r.wallet_id,
  r.user_id,
  r.occurred_after,
  r.occurred_before,

  r.scanned_event_count,
  r.reevaluated_event_count,
  r.changed_decision_count,
  r.failed_event_count,

  count(res.id) as result_count,

  count(res.id) filter (
    where res.decision_changed is true
  ) as computed_changed_decision_count,

  count(res.id) filter (
    where res.reward_action_recommendation <> 'none'
  ) as reward_action_count,

  count(res.id) filter (
    where res.trust_action_recommendation <> 'none'
  ) as trust_action_count,

  count(q.id) filter (
    where q.status = 'open'
  ) as open_action_queue_count,

  r.apply_reward_actions,
  r.apply_trust_actions,

  r.requested_by_admin_id,
  r.admin_case_id,

  r.started_at,
  r.completed_at,
  r.failed_at,
  r.failure_reason,

  r.metadata

from attention_model_reevaluation_runs r
left join attention_model_reevaluation_results res
  on res.reevaluation_run_id = r.id
left join attention_reevaluation_action_queue q
  on q.reevaluation_run_id = r.id
group by r.id;

create or replace view attention_model_reevaluation_comparisons as
select
  res.id as reevaluation_result_id,
  res.reevaluation_run_id,

  res.original_attention_event_id,
  res.user_id,
  res.wallet_id,
  res.campaign_id,

  res.original_model_version,
  res.target_model_version,

  res.original_pipeline_version,
  res.target_pipeline_version,

  res.original_scoring_formula_version,
  res.target_scoring_formula_version,

  res.original_decision,
  res.reevaluated_decision,
  res.decision_changed,

  res.original_attention_score,
  res.reevaluated_attention_score,
  (
    res.reevaluated_attention_score - res.original_attention_score
  ) as attention_score_delta,

  res.original_confidence_score,
  res.reevaluated_confidence_score,
  (
    res.reevaluated_confidence_score - res.original_confidence_score
  ) as confidence_score_delta,

  res.original_fraud_risk_score,
  res.reevaluated_fraud_risk_score,
  (
    res.reevaluated_fraud_risk_score - res.original_fraud_risk_score
  ) as fraud_risk_score_delta,

  res.original_reward_eligible,
  res.reevaluated_reward_eligible,

  res.reward_action_recommendation,
  res.trust_action_recommendation,

  res.status,
  res.error_message,
  res.created_at,

  ave.reward_issued,
  ave.reward_id,

  rig.id as reward_issuance_group_id,
  rig.status as reward_issuance_status,
  rig.reward_amount_minor

from attention_model_reevaluation_results res
left join attention_verification_events ave
  on ave.id = res.original_attention_event_id
left join reward_issuance_groups rig
  on rig.attention_event_id = res.original_attention_event_id;

create or replace view attention_reevaluation_action_dashboard as
select
  q.id as action_queue_id,
  q.status,
  q.action_type,
  q.severity,
  q.reason,

  q.reevaluation_result_id,
  q.reevaluation_run_id,
  q.original_attention_event_id,

  q.user_id,
  q.wallet_id,
  q.campaign_id,

  c.original_model_version,
  c.target_model_version,
  c.original_decision,
  c.reevaluated_decision,
  c.decision_changed,

  c.original_attention_score,
  c.reevaluated_attention_score,
  c.attention_score_delta,

  c.original_fraud_risk_score,
  c.reevaluated_fraud_risk_score,
  c.fraud_risk_score_delta,

  c.original_reward_eligible,
  c.reevaluated_reward_eligible,

  c.reward_issued,
  c.reward_id,
  c.reward_issuance_group_id,
  c.reward_amount_minor,

  q.assigned_admin_user_id,
  q.resolved_by_admin_id,
  q.resolution_action,
  q.resolution_note,
  q.created_at,
  q.resolved_at,
  q.metadata

from attention_reevaluation_action_queue q
left join attention_model_reevaluation_comparisons c
  on c.reevaluation_result_id = q.reevaluation_result_id;

create or replace function resolve_attention_reevaluation_action(
  p_action_queue_id uuid,
  p_admin_user_id uuid,
  p_resolution_action text,
  p_resolution_note text,
  p_admin_case_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_action attention_reevaluation_action_queue%rowtype;
  v_result attention_model_reevaluation_results%rowtype;
  v_event attention_verification_events%rowtype;

  v_reward_group_id uuid;
  v_signal_id uuid;
begin
  if p_action_queue_id is null then
    raise exception 'action queue id is required';
  end if;

  if p_admin_user_id is null then
    raise exception 'admin user id is required';
  end if;

  if p_resolution_note is null or length(trim(p_resolution_note)) = 0 then
    raise exception 'resolution note is required';
  end if;

  if p_resolution_action not in (
    'dismiss',
    'issue_missing_reward',
    'send_to_fraud_review',
    'emit_trust_signal',
    'mark_reviewed'
  ) then
    raise exception 'invalid resolution action: %', p_resolution_action;
  end if;

  select *
  into v_action
  from attention_reevaluation_action_queue
  where id = p_action_queue_id
  for update;

  if v_action.id is null then
    raise exception 're-evaluation action not found: %', p_action_queue_id;
  end if;

  if v_action.status not in ('open', 'assigned') then
    raise exception 're-evaluation action is not open/assigned';
  end if;

  select *
  into v_result
  from attention_model_reevaluation_results
  where id = v_action.reevaluation_result_id;

  select *
  into v_event
  from attention_verification_events
  where id = v_action.original_attention_event_id
  for update;

  if p_resolution_action = 'issue_missing_reward' then
    if v_result.reevaluated_reward_eligible is not true then
      raise exception 'reevaluated event is not reward eligible';
    end if;

    if v_event.reward_issued is true then
      raise exception 'original event already has reward issued';
    end if;

    update attention_verification_events
    set
      reward_eligible = true,
      decision = 'passed',
      decision_reason = 'admin_approved_after_model_reevaluation',
      metadata = metadata || p_metadata || jsonb_build_object(
        'reevaluation_result_id',
        v_result.id,
        'approved_by_admin_id',
        p_admin_user_id,
        'admin_case_id',
        p_admin_case_id
      )
    where id = v_event.id;

    v_reward_group_id := issue_reward_from_attention_event(
      v_event.id,
      null,
      'reevaluation_missing_reward:' || v_event.id::text || ':' || v_result.id::text,
      p_metadata || jsonb_build_object(
        'reevaluation_result_id',
        v_result.id,
        'admin_user_id',
        p_admin_user_id,
        'admin_case_id',
        p_admin_case_id
      )
    );
  end if;

  if p_resolution_action in ('emit_trust_signal', 'send_to_fraud_review') then
    v_signal_id := record_trust_signal(
      'wallet',
      v_action.wallet_id,
      v_action.user_id,
      v_action.wallet_id,
      case
        when p_resolution_action = 'send_to_fraud_review'
        then 'model_reevaluation_fraud_review'
        else 'model_reevaluation_trust_review'
      end,
      'attention_model_reevaluation_engine',
      'negative',
      case
        when p_resolution_action = 'send_to_fraud_review'
        then 'high'
        else 'medium'
      end,
      coalesce(v_result.reevaluated_fraud_risk_score, 0.5000),
      null,
      null,
      null,
      null,
      'attention_reevaluation_action:' || v_action.id::text,
      p_metadata || jsonb_build_object(
        'reevaluation_result_id',
        v_result.id,
        'original_attention_event_id',
        v_event.id,
        'admin_user_id',
        p_admin_user_id,
        'admin_case_id',
        p_admin_case_id
      )
    );

    perform apply_effective_trust_score_to_wallet_policy(
      v_action.wallet_id,
      p_metadata || jsonb_build_object(
        'trigger',
        'attention_model_reevaluation_resolution',
        'reevaluation_action_queue_id',
        v_action.id
      )
    );
  end if;

  update attention_reevaluation_action_queue
  set
    status = 'resolved',
    resolved_by_admin_id = p_admin_user_id,
    resolved_at = now(),
    resolution_action = p_resolution_action,
    resolution_note = p_resolution_note,
    metadata = metadata || p_metadata || jsonb_build_object(
      'admin_case_id',
      p_admin_case_id,
      'reward_issuance_group_id',
      v_reward_group_id,
      'trust_signal_id',
      v_signal_id
    )
  where id = v_action.id;

  return v_action.id;
end;
$$;

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
    'attention_model_reevaluation_engine',
    'model_reevaluation_trust_review',
    'negative',
    'medium',
    1.000000,
    -0.030000,
    0.070000,
    0.030000,
    '{"meaning": "model re-evaluation indicates trust review"}'::jsonb
  ),
  (
    'trust_v1',
    'attention_model_reevaluation_engine',
    'model_reevaluation_fraud_review',
    'negative',
    'high',
    1.000000,
    -0.100000,
    0.200000,
    0.060000,
    '{"meaning": "model re-evaluation indicates possible fraud"}'::jsonb
  );
