-- Step 5.7 — Trust score admin overrides with durable audit and effective-score reads.

alter table trust_score_current
add column if not exists override_status text not null default 'none',
add column if not exists override_trust_score numeric(6, 4),
add column if not exists override_risk_score numeric(6, 4),
add column if not exists override_confidence_score numeric(6, 4),
add column if not exists override_reason text,
add column if not exists override_admin_user_id uuid,
add column if not exists override_expires_at timestamptz,
add column if not exists override_applied_at timestamptz,
add column if not exists override_cleared_at timestamptz,
add column if not exists override_metadata jsonb not null default '{}'::jsonb;

alter table trust_score_current
drop constraint if exists trust_score_current_override_status_check;

alter table trust_score_current
add constraint trust_score_current_override_status_check
check (
  override_status in (
    'none',
    'active',
    'expired',
    'cleared'
  )
);

alter table trust_score_current
drop constraint if exists trust_score_current_override_score_check;

alter table trust_score_current
add constraint trust_score_current_override_score_check
check (
  (override_trust_score is null or (override_trust_score >= 0 and override_trust_score <= 1))
  and
  (override_risk_score is null or (override_risk_score >= 0 and override_risk_score <= 1))
  and
  (override_confidence_score is null or (override_confidence_score >= 0 and override_confidence_score <= 1))
);

create index if not exists trust_score_current_override_idx
on trust_score_current (override_status, override_expires_at);

create table if not exists trust_score_override_events (
  id uuid primary key default gen_random_uuid(),

  subject_id uuid not null references trust_score_subjects(id),

  user_id uuid,
  wallet_id uuid references wallets(id),

  action text not null,

  previous_override_status text,
  new_override_status text not null,

  previous_trust_score numeric(6, 4),
  previous_risk_score numeric(6, 4),
  previous_confidence_score numeric(6, 4),

  override_trust_score numeric(6, 4),
  override_risk_score numeric(6, 4),
  override_confidence_score numeric(6, 4),

  reason text not null,

  admin_user_id uuid not null,
  admin_case_id uuid,

  expires_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint trust_score_override_events_action_check
  check (
    action in (
      'apply_override',
      'clear_override',
      'expire_override',
      'extend_override'
    )
  ),

  constraint trust_score_override_events_status_check
  check (
    new_override_status in (
      'none',
      'active',
      'expired',
      'cleared'
    )
  )
);

create index if not exists trust_score_override_events_subject_idx
on trust_score_override_events (subject_id, created_at desc);

create index if not exists trust_score_override_events_wallet_idx
on trust_score_override_events (wallet_id, created_at desc);

create index if not exists trust_score_override_events_admin_idx
on trust_score_override_events (admin_user_id, created_at desc);

create index if not exists trust_score_override_events_case_idx
on trust_score_override_events (admin_case_id);

create or replace view trust_score_effective_current as
select
  c.subject_id,
  c.subject_type,
  c.user_id,
  c.wallet_id,

  c.trust_score as computed_trust_score,
  c.risk_score as computed_risk_score,
  c.confidence_score as computed_confidence_score,

  case
    when c.override_status = 'active'
      and (
        c.override_expires_at is null
        or c.override_expires_at > now()
      )
      and c.override_trust_score is not null
    then c.override_trust_score
    else c.trust_score
  end as effective_trust_score,

  case
    when c.override_status = 'active'
      and (
        c.override_expires_at is null
        or c.override_expires_at > now()
      )
      and c.override_risk_score is not null
    then c.override_risk_score
    else c.risk_score
  end as effective_risk_score,

  case
    when c.override_status = 'active'
      and (
        c.override_expires_at is null
        or c.override_expires_at > now()
      )
      and c.override_confidence_score is not null
    then c.override_confidence_score
    else c.confidence_score
  end as effective_confidence_score,

  c.trust_tier as computed_trust_tier,
  c.risk_tier as computed_risk_tier,

  trust_score_to_tier(
    case
      when c.override_status = 'active'
        and (
          c.override_expires_at is null
          or c.override_expires_at > now()
        )
        and c.override_trust_score is not null
      then c.override_trust_score
      else c.trust_score
    end
  ) as effective_trust_tier,

  risk_score_to_tier(
    case
      when c.override_status = 'active'
        and (
          c.override_expires_at is null
          or c.override_expires_at > now()
        )
        and c.override_risk_score is not null
      then c.override_risk_score
      else c.risk_score
    end
  ) as effective_risk_tier,

  c.override_status,
  c.override_reason,
  c.override_admin_user_id,
  c.override_expires_at,
  c.override_applied_at,
  c.override_cleared_at,
  c.override_metadata,

  c.sample_count,
  c.positive_signal_count,
  c.negative_signal_count,
  c.last_event_at,
  c.last_calculated_at,
  c.created_at,
  c.updated_at

from trust_score_current c;

create or replace function apply_effective_trust_score_to_wallet_policy(
  p_wallet_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_subject_id uuid;
  v_current trust_score_effective_current%rowtype;
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
  from trust_score_effective_current
  where subject_id = v_subject_id;

  if v_current.subject_id is null then
    raise exception 'effective trust score current not found for wallet %', p_wallet_id;
  end if;

  return apply_wallet_risk_policy(
    p_wallet_id,
    v_current.effective_risk_score,
    v_current.effective_trust_score,
    'effective_trust_score_policy_sync',
    p_metadata || jsonb_build_object(
      'trust_subject_id',
      v_subject_id,
      'computed_trust_score',
      v_current.computed_trust_score,
      'computed_risk_score',
      v_current.computed_risk_score,
      'effective_trust_score',
      v_current.effective_trust_score,
      'effective_risk_score',
      v_current.effective_risk_score,
      'effective_confidence_score',
      v_current.effective_confidence_score,
      'override_status',
      v_current.override_status,
      'override_reason',
      v_current.override_reason
    )
  );
end;
$$;

create or replace function apply_trust_score_to_wallet_policy(
  p_wallet_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language sql
as $$
  select apply_effective_trust_score_to_wallet_policy(
    p_wallet_id,
    p_metadata
  );
$$;

create or replace function apply_trust_score_override(
  p_subject_type text,
  p_subject_entity_id uuid,
  p_user_id uuid,
  p_wallet_id uuid,
  p_override_trust_score numeric default null,
  p_override_risk_score numeric default null,
  p_override_confidence_score numeric default null,
  p_reason text default null,
  p_admin_user_id uuid default null,
  p_admin_case_id uuid default null,
  p_expires_at timestamptz default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_subject_id uuid;
  v_current trust_score_current%rowtype;
  v_event_id uuid;
begin
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'override reason is required';
  end if;

  if p_admin_user_id is null then
    raise exception 'admin user id is required';
  end if;

  if p_override_trust_score is null
    and p_override_risk_score is null
    and p_override_confidence_score is null then
    raise exception 'at least one override score is required';
  end if;

  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'override expiry must be in the future';
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
  where subject_id = v_subject_id
  for update;

  if v_current.subject_id is null then
    raise exception 'trust current row not found for subject %', v_subject_id;
  end if;

  insert into trust_score_override_events (
    subject_id,
    user_id,
    wallet_id,
    action,
    previous_override_status,
    new_override_status,
    previous_trust_score,
    previous_risk_score,
    previous_confidence_score,
    override_trust_score,
    override_risk_score,
    override_confidence_score,
    reason,
    admin_user_id,
    admin_case_id,
    expires_at,
    metadata
  )
  values (
    v_subject_id,
    coalesce(p_user_id, v_current.user_id),
    coalesce(p_wallet_id, v_current.wallet_id),
    'apply_override',
    v_current.override_status,
    'active',
    v_current.override_trust_score,
    v_current.override_risk_score,
    v_current.override_confidence_score,
    p_override_trust_score,
    p_override_risk_score,
    p_override_confidence_score,
    p_reason,
    p_admin_user_id,
    p_admin_case_id,
    p_expires_at,
    p_metadata
  )
  returning id into v_event_id;

  update trust_score_current
  set
    override_status = 'active',
    override_trust_score = p_override_trust_score,
    override_risk_score = p_override_risk_score,
    override_confidence_score = p_override_confidence_score,
    override_reason = p_reason,
    override_admin_user_id = p_admin_user_id,
    override_expires_at = p_expires_at,
    override_applied_at = now(),
    override_cleared_at = null,
    override_metadata = override_metadata || p_metadata || jsonb_build_object(
      'admin_case_id',
      p_admin_case_id,
      'override_event_id',
      v_event_id
    ),
    updated_at = now()
  where subject_id = v_subject_id;

  if coalesce(p_wallet_id, v_current.wallet_id) is not null then
    perform apply_effective_trust_score_to_wallet_policy(
      coalesce(p_wallet_id, v_current.wallet_id),
      p_metadata || jsonb_build_object(
        'trigger',
        'trust_admin_override',
        'trust_override_event_id',
        v_event_id
      )
    );
  end if;

  return v_event_id;
end;
$$;

create or replace function clear_trust_score_override(
  p_subject_type text,
  p_subject_entity_id uuid,
  p_reason text,
  p_admin_user_id uuid,
  p_admin_case_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_subject_id uuid;
  v_current trust_score_current%rowtype;
  v_event_id uuid;
begin
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'clear reason is required';
  end if;

  if p_admin_user_id is null then
    raise exception 'admin user id is required';
  end if;

  select id
  into v_subject_id
  from trust_score_subjects
  where subject_type = p_subject_type
    and subject_id = p_subject_entity_id;

  if v_subject_id is null then
    raise exception 'trust subject not found';
  end if;

  select *
  into v_current
  from trust_score_current
  where subject_id = v_subject_id
  for update;

  if v_current.subject_id is null then
    raise exception 'trust current row not found for subject %', v_subject_id;
  end if;

  insert into trust_score_override_events (
    subject_id,
    user_id,
    wallet_id,
    action,
    previous_override_status,
    new_override_status,
    previous_trust_score,
    previous_risk_score,
    previous_confidence_score,
    override_trust_score,
    override_risk_score,
    override_confidence_score,
    reason,
    admin_user_id,
    admin_case_id,
    expires_at,
    metadata
  )
  values (
    v_subject_id,
    v_current.user_id,
    v_current.wallet_id,
    'clear_override',
    v_current.override_status,
    'cleared',
    v_current.override_trust_score,
    v_current.override_risk_score,
    v_current.override_confidence_score,
    null,
    null,
    null,
    p_reason,
    p_admin_user_id,
    p_admin_case_id,
    null,
    p_metadata
  )
  returning id into v_event_id;

  update trust_score_current
  set
    override_status = 'cleared',
    override_trust_score = null,
    override_risk_score = null,
    override_confidence_score = null,
    override_reason = p_reason,
    override_admin_user_id = p_admin_user_id,
    override_expires_at = null,
    override_cleared_at = now(),
    override_metadata = override_metadata || p_metadata || jsonb_build_object(
      'cleared_by_event_id',
      v_event_id,
      'admin_case_id',
      p_admin_case_id
    ),
    updated_at = now()
  where subject_id = v_subject_id;

  if v_current.wallet_id is not null then
    perform apply_effective_trust_score_to_wallet_policy(
      v_current.wallet_id,
      p_metadata || jsonb_build_object(
        'trigger',
        'trust_override_cleared',
        'trust_override_event_id',
        v_event_id
      )
    );
  end if;

  return v_event_id;
end;
$$;

create table if not exists trust_override_expiration_runs (
  id uuid primary key default gen_random_uuid(),

  run_type text not null default 'scheduled',
  status text not null default 'processing',

  scanned_override_count integer not null default 0,
  expired_override_count integer not null default 0,

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,

  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,

  constraint trust_override_expiration_runs_status_check
  check (
    status in (
      'processing',
      'completed',
      'failed'
    )
  )
);

create index if not exists trust_override_expiration_runs_started_idx
on trust_override_expiration_runs (started_at desc);

create or replace function run_trust_override_expiration_job(
  p_batch_size integer default 500,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid;
  v_row record;
  v_scanned integer := 0;
  v_expired integer := 0;
  v_event_id uuid;
begin
  if p_batch_size <= 0 then
    raise exception 'batch size must be positive';
  end if;

  insert into trust_override_expiration_runs (
    run_type,
    status,
    metadata
  )
  values (
    'scheduled',
    'processing',
    p_metadata
  )
  returning id into v_run_id;

  for v_row in
    select *
    from trust_score_current
    where override_status = 'active'
      and override_expires_at is not null
      and override_expires_at <= now()
    order by override_expires_at asc
    limit p_batch_size
    for update skip locked
  loop
    v_scanned := v_scanned + 1;

    insert into trust_score_override_events (
      subject_id,
      user_id,
      wallet_id,
      action,
      previous_override_status,
      new_override_status,
      previous_trust_score,
      previous_risk_score,
      previous_confidence_score,
      override_trust_score,
      override_risk_score,
      override_confidence_score,
      reason,
      admin_user_id,
      expires_at,
      metadata
    )
    values (
      v_row.subject_id,
      v_row.user_id,
      v_row.wallet_id,
      'expire_override',
      v_row.override_status,
      'expired',
      v_row.override_trust_score,
      v_row.override_risk_score,
      v_row.override_confidence_score,
      null,
      null,
      null,
      'override_expired',
      coalesce(v_row.override_admin_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
      v_row.override_expires_at,
      p_metadata || jsonb_build_object(
        'trust_override_expiration_run_id',
        v_run_id
      )
    )
    returning id into v_event_id;

    update trust_score_current
    set
      override_status = 'expired',
      override_trust_score = null,
      override_risk_score = null,
      override_confidence_score = null,
      override_reason = 'override_expired',
      override_cleared_at = now(),
      override_metadata = override_metadata || p_metadata || jsonb_build_object(
        'expired_by_event_id',
        v_event_id,
        'trust_override_expiration_run_id',
        v_run_id
      ),
      updated_at = now()
    where subject_id = v_row.subject_id;

    if v_row.wallet_id is not null then
      perform apply_effective_trust_score_to_wallet_policy(
        v_row.wallet_id,
        p_metadata || jsonb_build_object(
          'trigger',
          'trust_override_expired',
          'trust_override_event_id',
          v_event_id
        )
      );
    end if;

    v_expired := v_expired + 1;
  end loop;

  update trust_override_expiration_runs
  set
    status = 'completed',
    completed_at = now(),
    scanned_override_count = v_scanned,
    expired_override_count = v_expired
  where id = v_run_id;

  return v_run_id;

exception
  when others then
    if v_run_id is not null then
      update trust_override_expiration_runs
      set
        status = 'failed',
        failed_at = now(),
        failure_reason = sqlerrm
      where id = v_run_id;
    end if;

    raise;
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
  v_current trust_score_effective_current%rowtype;
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
  from trust_score_effective_current
  where subject_id = v_subject_id;

  if v_current.subject_id is null then
    raise exception 'trust score current not found for subject %', v_subject_id;
  end if;

  if p_action_type = 'withdraw' then
    if v_current.effective_risk_score >= 0.8500 then
      v_decision := 'deny';
      v_reason := 'risk_score_too_high_for_withdrawal';
    elsif v_current.effective_trust_score < 0.4500 then
      v_decision := 'review';
      v_reason := 'trust_score_too_low_for_withdrawal';
    elsif v_current.effective_confidence_score < 0.3000 then
      v_decision := 'hold';
      v_reason := 'insufficient_trust_confidence';
    else
      v_decision := 'allow';
      v_reason := 'trust_gate_passed';
    end if;

  elsif p_action_type = 'convert' then
    if v_current.effective_risk_score >= 0.8500 then
      v_decision := 'deny';
      v_reason := 'risk_score_too_high_for_conversion';
    elsif v_current.effective_trust_score < 0.3500 then
      v_decision := 'review';
      v_reason := 'trust_score_too_low_for_conversion';
    else
      v_decision := 'allow';
      v_reason := 'trust_gate_passed';
    end if;

  elsif p_action_type in ('reward_issue', 'reward_release') then
    if v_current.effective_risk_score >= 0.9500 then
      v_decision := 'deny';
      v_reason := 'critical_risk_blocks_reward';
    elsif v_current.effective_risk_score >= 0.8500 then
      v_decision := 'hold';
      v_reason := 'high_risk_holds_reward';
    else
      v_decision := 'allow';
      v_reason := 'trust_gate_passed';
    end if;

  else
    if v_current.effective_risk_score >= 0.9500 then
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
    v_current.effective_trust_score,
    v_current.effective_risk_score,
    v_current.effective_confidence_score,
    v_current.effective_trust_tier,
    v_current.effective_risk_tier,
    p_metadata || jsonb_build_object(
      'computed_trust_score',
      v_current.computed_trust_score,
      'computed_risk_score',
      v_current.computed_risk_score,
      'override_status',
      v_current.override_status,
      'override_reason',
      v_current.override_reason
    )
  );

  return v_decision;
end;
$$;

create or replace view trust_score_override_details as
select
  s.id as trust_subject_id,
  s.subject_type,
  s.subject_id,
  s.user_id,
  s.wallet_id,

  ec.computed_trust_score,
  ec.computed_risk_score,
  ec.computed_confidence_score,

  ec.effective_trust_score,
  ec.effective_risk_score,
  ec.effective_confidence_score,

  ec.computed_trust_tier,
  ec.computed_risk_tier,
  ec.effective_trust_tier,
  ec.effective_risk_tier,

  ec.override_status,
  ec.override_reason,
  ec.override_admin_user_id,
  ec.override_expires_at,
  ec.override_applied_at,
  ec.override_cleared_at,
  ec.override_metadata,

  count(e.id) as override_event_count,

  jsonb_agg(
    jsonb_build_object(
      'override_event_id', e.id,
      'action', e.action,
      'previous_override_status', e.previous_override_status,
      'new_override_status', e.new_override_status,
      'previous_trust_score', e.previous_trust_score,
      'previous_risk_score', e.previous_risk_score,
      'previous_confidence_score', e.previous_confidence_score,
      'override_trust_score', e.override_trust_score,
      'override_risk_score', e.override_risk_score,
      'override_confidence_score', e.override_confidence_score,
      'reason', e.reason,
      'admin_user_id', e.admin_user_id,
      'admin_case_id', e.admin_case_id,
      'expires_at', e.expires_at,
      'created_at', e.created_at,
      'metadata', e.metadata
    )
    order by e.created_at desc
  ) filter (where e.id is not null) as override_events

from trust_score_subjects s
left join trust_score_effective_current ec
  on ec.subject_id = s.id
left join trust_score_override_events e
  on e.subject_id = s.id
group by
  s.id,
  ec.subject_id,
  ec.computed_trust_score,
  ec.computed_risk_score,
  ec.computed_confidence_score,
  ec.effective_trust_score,
  ec.effective_risk_score,
  ec.effective_confidence_score,
  ec.computed_trust_tier,
  ec.computed_risk_tier,
  ec.effective_trust_tier,
  ec.effective_risk_tier,
  ec.override_status,
  ec.override_reason,
  ec.override_admin_user_id,
  ec.override_expires_at,
  ec.override_applied_at,
  ec.override_cleared_at,
  ec.override_metadata;
