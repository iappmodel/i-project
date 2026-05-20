-- 43/post-MVP — canonical reward issuance from attention_verification_events:
-- eligibility + trust + fraud lock + campaign reserve + wallet pending lot + mark issued.

-- ---------------------------------------------------------------------------
-- 1. Reward issuance groups (parent for one issuance attempt)
-- ---------------------------------------------------------------------------

create table if not exists reward_issuance_groups (
  id uuid primary key default gen_random_uuid(),

  attention_event_id uuid not null references attention_verification_events(id),
  attention_session_id uuid references attention_verification_sessions(id),

  user_id uuid not null,
  wallet_id uuid not null references wallets(id),

  campaign_id uuid not null references campaigns(id),
  creative_id uuid,
  placement_id uuid,

  reward_id uuid not null,

  currency_code text not null default 'USD',
  reward_amount_minor bigint not null,

  status text not null default 'processing',

  trust_gate_decision text,
  trust_gate_reason text,

  campaign_budget_reservation_id uuid references campaign_budget_reservations(id),
  wallet_value_lot_id uuid references wallet_value_lots(id),

  idempotency_key text not null,
  operation_type text not null default 'issue_reward_from_attention_event',

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,
  failure_reason text,

  constraint reward_issuance_groups_amount_check
  check (reward_amount_minor > 0),

  constraint reward_issuance_groups_status_check
  check (
    status in (
      'processing',
      'completed',
      'failed',
      'blocked',
      'held_for_review'
    )
  ),

  constraint reward_issuance_groups_trust_gate_decision_check
  check (
    trust_gate_decision is null
    or trust_gate_decision in (
      'allow',
      'allow_with_limit',
      'hold',
      'review',
      'deny'
    )
  )
);

create unique index if not exists reward_issuance_groups_idempotency_unique
on reward_issuance_groups (operation_type, idempotency_key);

create unique index if not exists reward_issuance_groups_attention_event_unique
on reward_issuance_groups (attention_event_id);

create index if not exists reward_issuance_groups_user_idx
on reward_issuance_groups (user_id, created_at desc);

create index if not exists reward_issuance_groups_wallet_idx
on reward_issuance_groups (wallet_id, created_at desc);

create index if not exists reward_issuance_groups_campaign_idx
on reward_issuance_groups (campaign_id, created_at desc);

create index if not exists reward_issuance_groups_status_idx
on reward_issuance_groups (status, created_at desc);

-- ---------------------------------------------------------------------------
-- 2. Campaign reward rules (canonical reward amount source)
-- ---------------------------------------------------------------------------

create table if not exists campaign_reward_rules (
  id uuid primary key default gen_random_uuid(),

  campaign_id uuid not null references campaigns(id),

  reward_type text not null default 'attention_reward',
  currency_code text not null default 'USD',

  reward_amount_minor bigint not null,

  min_attention_score numeric(6, 4),
  min_confidence_score numeric(6, 4),
  max_fraud_risk_score numeric(6, 4),

  active boolean not null default true,

  valid_from timestamptz not null default now(),
  valid_until timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint campaign_reward_rules_amount_check
  check (reward_amount_minor > 0),

  constraint campaign_reward_rules_type_check
  check (
    reward_type in (
      'attention_reward',
      'bonus_attention_reward',
      'creator_reward',
      'campaign_completion_reward'
    )
  )
);

create unique index if not exists campaign_reward_rules_active_unique
on campaign_reward_rules (campaign_id, reward_type)
where active is true;

create index if not exists campaign_reward_rules_lookup_idx
on campaign_reward_rules (
  campaign_id,
  reward_type,
  active,
  valid_from,
  valid_until
);

-- ---------------------------------------------------------------------------
-- 3. Reward rule lookup
-- ---------------------------------------------------------------------------

create or replace function get_campaign_attention_reward_rule(
  p_campaign_id uuid,
  p_at timestamptz default now()
)
returns campaign_reward_rules
language plpgsql
stable
as $$
declare
  v_rule campaign_reward_rules%rowtype;
begin
  if p_campaign_id is null then
    raise exception 'campaign id is required';
  end if;

  select *
  into v_rule
  from campaign_reward_rules
  where campaign_id = p_campaign_id
    and reward_type = 'attention_reward'
    and active is true
    and valid_from <= p_at
    and (
      valid_until is null
      or valid_until > p_at
    )
  order by valid_from desc, created_at desc
  limit 1;

  if v_rule.id is null then
    raise exception 'no active attention reward rule for campaign %', p_campaign_id;
  end if;

  return v_rule;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. issue_reward_from_attention_event (production entrypoint)
-- ---------------------------------------------------------------------------

create or replace function issue_reward_from_attention_event(
  p_attention_event_id uuid,
  p_reward_id uuid default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_event attention_verification_events%rowtype;
  v_rule campaign_reward_rules%rowtype;
  v_requirement campaign_attention_requirements%rowtype;

  v_reward_id uuid;
  v_idempotency_key text;

  v_group_id uuid;
  v_reservation_id uuid;
  v_value_lot_id uuid;

  v_hold_until timestamptz;
  v_expires_at timestamptz;

  v_trust_decision text;

  v_should_execute boolean;
  v_existing_result_id uuid;
  v_payload jsonb;
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

  if v_event.campaign_id is null then
    raise exception 'attention event has no campaign id: %', p_attention_event_id;
  end if;

  if v_event.wallet_id is null then
    raise exception 'attention event has no wallet id: %', p_attention_event_id;
  end if;

  if v_event.reward_eligible is not true then
    raise exception 'attention event is not reward eligible: %, reason %',
      p_attention_event_id,
      v_event.decision_reason;
  end if;

  if v_event.reward_issued is true then
    raise exception 'attention event reward already issued: %', p_attention_event_id;
  end if;

  v_rule := get_campaign_attention_reward_rule(v_event.campaign_id, now());

  select *
  into v_requirement
  from campaign_attention_requirements
  where campaign_id = v_event.campaign_id
    and requirement_type = v_event.verification_type
    and active is true
  limit 1;

  if v_rule.min_attention_score is not null
    and v_event.attention_score < v_rule.min_attention_score then
    raise exception 'attention score below reward rule minimum';
  end if;

  if v_rule.min_confidence_score is not null
    and v_event.confidence_score < v_rule.min_confidence_score then
    raise exception 'confidence score below reward rule minimum';
  end if;

  if v_rule.max_fraud_risk_score is not null
    and v_event.fraud_risk_score > v_rule.max_fraud_risk_score then
    raise exception 'fraud risk above reward rule maximum';
  end if;

  v_reward_id := coalesce(p_reward_id, gen_random_uuid());

  if p_idempotency_key is null then
    v_idempotency_key := 'issue_reward_from_attention_event:' || p_attention_event_id::text;
  else
    v_idempotency_key := p_idempotency_key;
  end if;

  v_hold_until :=
    now() + make_interval(
      secs => coalesce(v_requirement.reward_hold_seconds, 86400)
    );

  v_expires_at :=
    now() + make_interval(
      secs => coalesce(v_requirement.reward_expiry_seconds, 2592000)
    );

  v_payload := jsonb_build_object(
    'attention_event_id', p_attention_event_id,
    'attention_session_id', v_event.attention_session_id,
    'user_id', v_event.user_id,
    'wallet_id', v_event.wallet_id,
    'campaign_id', v_event.campaign_id,
    'creative_id', v_event.creative_id,
    'placement_id', v_event.placement_id,
    'reward_id', v_reward_id,
    'currency_code', v_rule.currency_code,
    'reward_amount_minor', v_rule.reward_amount_minor
  );

  select should_execute, existing_result_id
  into v_should_execute, v_existing_result_id
  from wallet_begin_idempotent_operation(
    'issue_reward_from_attention_event',
    v_idempotency_key,
    v_event.user_id,
    v_event.wallet_id,
    v_payload,
    p_metadata
  );

  if v_should_execute is false then
    return v_existing_result_id;
  end if;

  perform wallet_assert_not_fraud_locked(
    v_event.wallet_id,
    'issue_reward'
  );

  v_trust_decision := evaluate_trust_gate(
    'wallet',
    v_event.wallet_id,
    'reward_release',
    v_event.user_id,
    v_event.wallet_id,
    p_metadata || jsonb_build_object(
      'attention_event_id',
      v_event.id,
      'campaign_id',
      v_event.campaign_id
    )
  );

  insert into reward_issuance_groups (
    attention_event_id,
    attention_session_id,
    user_id,
    wallet_id,
    campaign_id,
    creative_id,
    placement_id,
    reward_id,
    currency_code,
    reward_amount_minor,
    status,
    trust_gate_decision,
    trust_gate_reason,
    idempotency_key,
    operation_type,
    metadata
  )
  values (
    v_event.id,
    v_event.attention_session_id,
    v_event.user_id,
    v_event.wallet_id,
    v_event.campaign_id,
    v_event.creative_id,
    v_event.placement_id,
    v_reward_id,
    v_rule.currency_code,
    v_rule.reward_amount_minor,
    'processing',
    v_trust_decision,
    null,
    v_idempotency_key,
    'issue_reward_from_attention_event',
    p_metadata
  )
  returning id into v_group_id;

  if v_trust_decision in ('deny', 'review', 'hold') then
    update reward_issuance_groups
    set
      status =
        case
          when v_trust_decision = 'deny' then 'blocked'
          else 'held_for_review'
        end,
      failed_at = now(),
      failure_reason = 'trust_gate_' || v_trust_decision
    where id = v_group_id;

    update wallet_idempotency_keys
    set
      status = 'failed',
      failed_at = now(),
      metadata = metadata || jsonb_build_object(
        'failed_reason',
        'trust_gate_' || v_trust_decision,
        'reward_issuance_group_id',
        v_group_id
      )
    where operation_type = 'issue_reward_from_attention_event'
      and idempotency_key = v_idempotency_key;

    return v_group_id;
  end if;

  v_reservation_id := reserve_campaign_reward_budget(
    v_event.campaign_id,
    v_event.user_id,
    v_event.wallet_id,
    v_rule.reward_amount_minor,
    v_event.id,
    v_reward_id,
    v_idempotency_key || ':reserve',
    p_metadata || jsonb_build_object(
      'reward_issuance_group_id',
      v_group_id
    )
  );

  v_value_lot_id := issue_reward_from_campaign_reservation(
    v_reservation_id,
    v_hold_until,
    v_expires_at,
    v_idempotency_key || ':issue',
    p_metadata || jsonb_build_object(
      'reward_issuance_group_id',
      v_group_id,
      'attention_event_id',
      v_event.id
    )
  );

  perform mark_attention_reward_issued(
    v_event.id,
    v_reward_id,
    v_value_lot_id,
    p_metadata || jsonb_build_object(
      'reward_issuance_group_id',
      v_group_id,
      'campaign_budget_reservation_id',
      v_reservation_id
    )
  );

  update reward_issuance_groups
  set
    status = 'completed',
    completed_at = now(),
    campaign_budget_reservation_id = v_reservation_id,
    wallet_value_lot_id = v_value_lot_id
  where id = v_group_id;

  perform wallet_complete_idempotent_operation(
    'issue_reward_from_attention_event',
    v_idempotency_key,
    'reward_issuance_group',
    v_group_id,
    jsonb_build_object(
      'reward_issuance_group_id', v_group_id,
      'attention_event_id', v_event.id,
      'reward_id', v_reward_id,
      'wallet_value_lot_id', v_value_lot_id,
      'campaign_budget_reservation_id', v_reservation_id,
      'reward_amount_minor', v_rule.reward_amount_minor,
      'currency_code', v_rule.currency_code
    )
  );

  return v_group_id;

exception
  when others then
    if v_group_id is not null then
      update reward_issuance_groups
      set
        status = 'failed',
        failed_at = now(),
        failure_reason = sqlerrm
      where id = v_group_id;
    end if;

    if v_reservation_id is not null and v_value_lot_id is null then
      begin
        perform cancel_campaign_budget_reservation(
          v_reservation_id,
          'reward_issuance_failed',
          v_idempotency_key || ':cancel',
          p_metadata || jsonb_build_object(
            'error',
            sqlerrm,
            'reward_issuance_group_id',
            v_group_id
          )
        );
      exception
        when others then
          null;
      end;
    end if;

    if v_idempotency_key is not null then
      update wallet_idempotency_keys
      set
        status = 'failed',
        failed_at = now(),
        metadata = metadata || jsonb_build_object(
          'failed_reason',
          sqlerrm,
          'reward_issuance_group_id',
          v_group_id
        )
      where operation_type = 'issue_reward_from_attention_event'
        and idempotency_key = v_idempotency_key
        and status = 'processing';
    end if;

    raise;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Batch runs + link column on groups
-- ---------------------------------------------------------------------------

create table if not exists reward_issuance_runs (
  id uuid primary key default gen_random_uuid(),

  run_type text not null default 'scheduled',
  status text not null default 'processing',

  scanned_event_count integer not null default 0,
  issued_reward_count integer not null default 0,
  held_reward_count integer not null default 0,
  failed_reward_count integer not null default 0,

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,

  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,

  constraint reward_issuance_runs_status_check
  check (
    status in (
      'processing',
      'completed',
      'failed'
    )
  )
);

create index if not exists reward_issuance_runs_started_idx
on reward_issuance_runs (started_at desc);

alter table reward_issuance_groups
add column if not exists reward_issuance_run_id uuid references reward_issuance_runs(id);

create index if not exists reward_issuance_groups_run_idx
on reward_issuance_groups (reward_issuance_run_id);

-- ---------------------------------------------------------------------------
-- 6. run_reward_issuance_job
-- ---------------------------------------------------------------------------

create or replace function run_reward_issuance_job(
  p_batch_size integer default 500,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid;
  v_event record;
  v_group_id uuid;

  v_scanned integer := 0;
  v_issued integer := 0;
  v_held integer := 0;
  v_failed integer := 0;

  v_group_status text;
begin
  if p_batch_size <= 0 then
    raise exception 'batch size must be positive';
  end if;

  insert into reward_issuance_runs (
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

  -- Lock base rows (not the eligibility view — FOR UPDATE is not valid on the joined view).
  for v_event in
    select
      ave.id as attention_event_id,
      ave.reward_id
    from attention_verification_events ave
    where ave.reward_eligible is true
      and ave.reward_issued is false
    order by ave.occurred_at asc, ave.id asc
    limit p_batch_size
    for update skip locked
  loop
    v_scanned := v_scanned + 1;

    begin
      v_group_id := issue_reward_from_attention_event(
        v_event.attention_event_id,
        coalesce(v_event.reward_id, gen_random_uuid()),
        'issue_reward_from_attention_event:' || v_event.attention_event_id::text,
        p_metadata || jsonb_build_object(
          'reward_issuance_run_id',
          v_run_id
        )
      );

      update reward_issuance_groups
      set reward_issuance_run_id = v_run_id
      where id = v_group_id
        and reward_issuance_run_id is null;

      select status
      into v_group_status
      from reward_issuance_groups
      where id = v_group_id;

      if v_group_status = 'completed' then
        v_issued := v_issued + 1;
      elsif v_group_status in ('held_for_review', 'blocked') then
        v_held := v_held + 1;
      else
        v_failed := v_failed + 1;
      end if;

    exception
      when others then
        v_failed := v_failed + 1;
    end;
  end loop;

  update reward_issuance_runs
  set
    status = 'completed',
    completed_at = now(),
    scanned_event_count = v_scanned,
    issued_reward_count = v_issued,
    held_reward_count = v_held,
    failed_reward_count = v_failed
  where id = v_run_id;

  return v_run_id;

exception
  when others then
    update reward_issuance_runs
    set
      status = 'failed',
      failed_at = now(),
      failure_reason = sqlerrm
    where id = v_run_id;

    raise;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7–8. Detail views
-- ---------------------------------------------------------------------------

create or replace view reward_issuance_details as
select
  rig.id as reward_issuance_group_id,
  rig.status,
  rig.attention_event_id,
  rig.attention_session_id,
  rig.user_id,
  rig.wallet_id,
  rig.campaign_id,
  rig.creative_id,
  rig.placement_id,
  rig.reward_id,
  rig.currency_code,
  rig.reward_amount_minor,
  rig.trust_gate_decision,
  rig.trust_gate_reason,
  rig.campaign_budget_reservation_id,
  rig.wallet_value_lot_id,
  rig.reward_issuance_run_id,
  rig.created_at,
  rig.completed_at,
  rig.failed_at,
  rig.failure_reason,

  ave.decision as attention_decision,
  ave.decision_reason as attention_decision_reason,
  ave.attention_score,
  ave.confidence_score,
  ave.fraud_risk_score,
  ave.quality_score,
  ave.reward_eligible,
  ave.reward_issued,

  cbr.status as campaign_budget_reservation_status,
  cbr.amount_minor as campaign_reserved_amount_minor,

  wl.status as wallet_value_lot_status,
  wl.remaining_amount_minor as wallet_value_lot_remaining_minor,
  wl.available_at,
  wl.expires_at,

  cb.funded_amount_minor,
  cb.reserved_amount_minor,
  cb.issued_amount_minor,
  cb.released_amount_minor,
  cb.expired_amount_minor,
  cb.refunded_amount_minor

from reward_issuance_groups rig
left join attention_verification_events ave
  on ave.id = rig.attention_event_id
left join campaign_budget_reservations cbr
  on cbr.id = rig.campaign_budget_reservation_id
left join wallet_value_lots wl
  on wl.id = rig.wallet_value_lot_id
left join campaign_budgets cb
  on cb.campaign_id = rig.campaign_id;

create or replace view reward_issuance_run_details as
select
  rr.id as reward_issuance_run_id,
  rr.run_type,
  rr.status,
  rr.scanned_event_count,
  rr.issued_reward_count,
  rr.held_reward_count,
  rr.failed_reward_count,
  rr.started_at,
  rr.completed_at,
  rr.failed_at,
  rr.failure_reason,

  count(rig.id) as group_count,

  jsonb_agg(
    jsonb_build_object(
      'reward_issuance_group_id', rig.id,
      'status', rig.status,
      'attention_event_id', rig.attention_event_id,
      'user_id', rig.user_id,
      'wallet_id', rig.wallet_id,
      'campaign_id', rig.campaign_id,
      'reward_id', rig.reward_id,
      'reward_amount_minor', rig.reward_amount_minor,
      'trust_gate_decision', rig.trust_gate_decision,
      'wallet_value_lot_id', rig.wallet_value_lot_id,
      'created_at', rig.created_at,
      'completed_at', rig.completed_at,
      'failure_reason', rig.failure_reason
    )
    order by rig.created_at asc
  ) filter (where rig.id is not null) as reward_groups

from reward_issuance_runs rr
left join reward_issuance_groups rig
  on rig.reward_issuance_run_id = rr.id
group by rr.id;
