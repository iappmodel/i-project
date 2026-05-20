create table if not exists reward_issuance_groups (
  id uuid primary key default gen_random_uuid(),

  attention_event_id uuid not null references attention_verification_events(id),

  user_id uuid not null,
  wallet_id uuid not null references wallets(id),

  campaign_id uuid,
  creative_id uuid,
  placement_id uuid,

  campaign_budget_reservation_id uuid references campaign_budget_reservations(id),
  wallet_value_lot_id uuid references wallet_value_lots(id),
  wallet_ledger_entry_id uuid references wallet_ledger_entries(id),

  currency_code text not null default 'USD',
  reward_amount_minor bigint not null,

  status text not null default 'pending',

  failure_reason text,

  idempotency_key text not null,

  queued_at timestamptz not null default now(),
  processing_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint reward_issuance_groups_currency_check
  check (currency_code in ('USD')),

  constraint reward_issuance_groups_amount_check
  check (reward_amount_minor > 0),

  constraint reward_issuance_groups_status_check
  check (
    status in (
      'pending',
      'processing',
      'completed',
      'failed',
      'cancelled',
      'clawed_back'
    )
  )
);

create unique index if not exists reward_issuance_groups_attention_event_unique
on reward_issuance_groups (attention_event_id);

create unique index if not exists reward_issuance_groups_idempotency_unique
on reward_issuance_groups (idempotency_key);

create index if not exists reward_issuance_groups_wallet_idx
on reward_issuance_groups (wallet_id, created_at desc);

create index if not exists reward_issuance_groups_campaign_idx
on reward_issuance_groups (campaign_id, created_at desc);

create index if not exists reward_issuance_groups_status_idx
on reward_issuance_groups (status, created_at asc);

drop trigger if exists reward_issuance_groups_set_updated_at
on reward_issuance_groups;

create trigger reward_issuance_groups_set_updated_at
before update on reward_issuance_groups
for each row
execute function set_updated_at();

create table if not exists reward_policies (
  id uuid primary key default gen_random_uuid(),

  policy_key text not null unique,

  status text not null default 'active',

  currency_code text not null default 'USD',

  default_reward_amount_minor bigint not null default 100,

  min_attention_score numeric(6, 4) not null default 0.7500,
  min_confidence_score numeric(6, 4) not null default 0.6000,
  max_fraud_risk_score numeric(6, 4) not null default 0.6500,
  min_quality_score numeric(6, 4) not null default 0.6000,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint reward_policies_status_check
  check (
    status in (
      'active',
      'paused',
      'archived'
    )
  ),

  constraint reward_policies_currency_check
  check (currency_code in ('USD')),

  constraint reward_policies_amount_check
  check (default_reward_amount_minor > 0)
);

create index if not exists reward_policies_status_idx
on reward_policies (status);

drop trigger if exists reward_policies_set_updated_at
on reward_policies;

create trigger reward_policies_set_updated_at
before update on reward_policies
for each row
execute function set_updated_at();

insert into reward_policies (
  policy_key,
  status,
  currency_code,
  default_reward_amount_minor,
  metadata
)
values (
  'default_attention_reward_v1',
  'active',
  'USD',
  100,
  '{"meaning": "default reward for verified attention event"}'::jsonb
)
on conflict (policy_key)
do update set
  status = excluded.status,
  default_reward_amount_minor = excluded.default_reward_amount_minor,
  metadata = reward_policies.metadata || excluded.metadata,
  updated_at = now();

create or replace function get_attention_reward_amount_minor(
  p_attention_event_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
stable
as $$
declare
  v_amount bigint;
begin
  if p_attention_event_id is null then
    raise exception 'attention event id is required';
  end if;

  select default_reward_amount_minor
  into v_amount
  from reward_policies
  where policy_key = 'default_attention_reward_v1'
    and status = 'active'
  limit 1;

  if v_amount is null then
    raise exception 'no active reward policy found';
  end if;

  return v_amount;
end;
$$;

create or replace function queue_reward_from_attention_event(
  p_attention_event_id uuid,
  p_reward_amount_minor bigint default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_event attention_verification_events%rowtype;
  v_group_id uuid;
  v_reward_amount_minor bigint;
  v_idempotency_key text;
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

  if v_event.reward_eligible is not true then
    raise exception 'attention event is not reward eligible';
  end if;

  if v_event.reward_issued is true then
    select id
    into v_group_id
    from reward_issuance_groups
    where attention_event_id = v_event.id;

    if v_group_id is not null then
      return v_group_id;
    end if;

    raise exception 'attention event already marked reward issued but group not found';
  end if;

  v_reward_amount_minor := coalesce(
    p_reward_amount_minor,
    get_attention_reward_amount_minor(p_attention_event_id, p_metadata)
  );

  if v_reward_amount_minor <= 0 then
    raise exception 'reward amount must be positive';
  end if;

  v_idempotency_key := coalesce(
    p_idempotency_key,
    'reward_from_attention:' || p_attention_event_id::text
  );

  insert into reward_issuance_groups (
    attention_event_id,
    user_id,
    wallet_id,
    campaign_id,
    creative_id,
    placement_id,
    currency_code,
    reward_amount_minor,
    status,
    idempotency_key,
    metadata
  )
  values (
    v_event.id,
    v_event.user_id,
    v_event.wallet_id,
    v_event.campaign_id,
    v_event.creative_id,
    v_event.placement_id,
    'USD',
    v_reward_amount_minor,
    'pending',
    v_idempotency_key,
    p_metadata
  )
  on conflict (idempotency_key)
  do update set
    metadata = reward_issuance_groups.metadata || excluded.metadata
  returning id into v_group_id;

  return v_group_id;
end;
$$;

create or replace function issue_reward_group(
  p_reward_issuance_group_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_group reward_issuance_groups%rowtype;
  v_event attention_verification_events%rowtype;
  v_wallet wallets%rowtype;

  v_reservation_id uuid;
  v_lot_id uuid;
  v_ledger_entry_id uuid;
begin
  if p_reward_issuance_group_id is null then
    raise exception 'reward issuance group id is required';
  end if;

  select *
  into v_group
  from reward_issuance_groups
  where id = p_reward_issuance_group_id
  for update;

  if v_group.id is null then
    raise exception 'reward issuance group not found: %', p_reward_issuance_group_id;
  end if;

  if v_group.status = 'completed' then
    return v_group.id;
  end if;

  if v_group.status not in ('pending', 'processing') then
    raise exception 'reward group cannot be issued from status %', v_group.status;
  end if;

  update reward_issuance_groups
  set
    status = 'processing',
    processing_at = coalesce(processing_at, now()),
    updated_at = now()
  where id = v_group.id;

  select *
  into v_event
  from attention_verification_events
  where id = v_group.attention_event_id
  for update;

  if v_event.id is null then
    raise exception 'attention event not found: %', v_group.attention_event_id;
  end if;

  if v_event.reward_eligible is not true then
    raise exception 'attention event is not reward eligible';
  end if;

  if v_event.reward_issued is true then
    update reward_issuance_groups
    set
      status = 'completed',
      completed_at = coalesce(completed_at, now()),
      updated_at = now()
    where id = v_group.id;

    return v_group.id;
  end if;

  select *
  into v_wallet
  from wallets
  where id = v_group.wallet_id
  for update;

  if v_wallet.id is null then
    raise exception 'wallet not found: %', v_group.wallet_id;
  end if;

  if v_wallet.user_id <> v_group.user_id then
    raise exception 'wallet/user mismatch';
  end if;

  perform wallet_assert_not_fraud_locked(
    v_group.wallet_id,
    'issue_reward'
  );

  if v_group.campaign_id is null then
    raise exception 'reward group has no campaign id';
  end if;

  v_reservation_id := reserve_campaign_budget(
    v_group.campaign_id,
    v_group.reward_amount_minor,
    v_group.user_id,
    v_group.wallet_id,
    v_group.attention_event_id,
    v_group.id,
    'reward_budget_reservation:' || v_group.id::text,
    p_metadata || jsonb_build_object(
      'reward_issuance_group_id',
      v_group.id
    )
  );

  insert into wallet_value_lots (
    wallet_id,
    user_id,
    currency_code,
    original_amount_minor,
    remaining_amount_minor,
    status,
    source_type,
    source_id,
    available_at,
    expires_at,
    metadata
  )
  values (
    v_group.wallet_id,
    v_group.user_id,
    'USD',
    v_group.reward_amount_minor,
    v_group.reward_amount_minor,
    'pending',
    'reward_issuance_group',
    v_group.id,
    now() + interval '24 hours',
    null,
    p_metadata || jsonb_build_object(
      'reward_issuance_group_id',
      v_group.id,
      'attention_event_id',
      v_group.attention_event_id,
      'campaign_budget_reservation_id',
      v_reservation_id
    )
  )
  returning id into v_lot_id;

  v_ledger_entry_id := post_wallet_ledger_entry(
    v_group.wallet_id,
    v_group.user_id,
    'reward_pending',
    'reward_issuance_group',
    v_group.id,
    0,
    v_group.reward_amount_minor,
    0,
    'USD',
    'reward_pending:' || v_group.id::text,
    p_metadata || jsonb_build_object(
      'wallet_value_lot_id',
      v_lot_id,
      'attention_event_id',
      v_group.attention_event_id,
      'campaign_budget_reservation_id',
      v_reservation_id
    )
  );

  perform mark_campaign_budget_reservation_issued(
    v_reservation_id,
    v_group.id,
    p_metadata || jsonb_build_object(
      'reward_issuance_group_id',
      v_group.id
    )
  );

  update attention_verification_events
  set
    reward_issued = true,
    reward_id = v_group.id,
    metadata = metadata || jsonb_build_object(
      'reward_issuance_group_id',
      v_group.id,
      'wallet_value_lot_id',
      v_lot_id,
      'wallet_ledger_entry_id',
      v_ledger_entry_id,
      'campaign_budget_reservation_id',
      v_reservation_id
    )
  where id = v_event.id;

  update reward_issuance_groups
  set
    status = 'completed',
    campaign_budget_reservation_id = v_reservation_id,
    wallet_value_lot_id = v_lot_id,
    wallet_ledger_entry_id = v_ledger_entry_id,
    completed_at = now(),
    metadata = metadata || p_metadata,
    updated_at = now()
  where id = v_group.id;

  return v_group.id;

exception
  when others then
    update reward_issuance_groups
    set
      status = 'failed',
      failed_at = now(),
      failure_reason = sqlerrm,
      metadata = metadata || p_metadata,
      updated_at = now()
    where id = p_reward_issuance_group_id
      and status <> 'completed';

    raise;
end;
$$;

create or replace function issue_reward_from_attention_event(
  p_attention_event_id uuid,
  p_reward_amount_minor bigint default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_group_id uuid;
begin
  v_group_id := queue_reward_from_attention_event(
    p_attention_event_id,
    p_reward_amount_minor,
    p_idempotency_key,
    p_metadata
  );

  perform issue_reward_group(
    v_group_id,
    p_metadata
  );

  return v_group_id;
end;
$$;

create table if not exists reward_issuance_runs (
  id uuid primary key default gen_random_uuid(),

  run_type text not null default 'scheduled',
  status text not null default 'processing',

  scanned_event_count integer not null default 0,
  queued_count integer not null default 0,
  issued_count integer not null default 0,
  failed_count integer not null default 0,

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
  v_queued integer := 0;
  v_issued integer := 0;
  v_failed integer := 0;
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

  for v_event in
    select e.id
    from attention_verification_events e
    where e.reward_eligible is true
      and e.reward_issued is false
      and e.campaign_id is not null
      and not exists (
        select 1
        from reward_issuance_groups rig
        where rig.attention_event_id = e.id
          and rig.status = 'completed'
      )
    order by e.occurred_at asc
    limit p_batch_size
    for update skip locked
  loop
    v_scanned := v_scanned + 1;

    begin
      v_group_id := queue_reward_from_attention_event(
        v_event.id,
        null,
        'reward_from_attention:' || v_event.id::text,
        p_metadata || jsonb_build_object(
          'reward_issuance_run_id',
          v_run_id
        )
      );

      v_queued := v_queued + 1;

      perform issue_reward_group(
        v_group_id,
        p_metadata || jsonb_build_object(
          'reward_issuance_run_id',
          v_run_id
        )
      );

      v_issued := v_issued + 1;

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
    queued_count = v_queued,
    issued_count = v_issued,
    failed_count = v_failed
  where id = v_run_id;

  return v_run_id;

exception
  when others then
    if v_run_id is not null then
      update reward_issuance_runs
      set
        status = 'failed',
        failed_at = now(),
        failure_reason = sqlerrm
      where id = v_run_id;
    end if;

    raise;
end;
$$;

create table if not exists reward_release_runs (
  id uuid primary key default gen_random_uuid(),

  run_type text not null default 'scheduled',
  status text not null default 'processing',

  scanned_lot_count integer not null default 0,
  released_count integer not null default 0,
  failed_count integer not null default 0,

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,

  failure_reason text,

  metadata jsonb not null default '{}'::jsonb,

  constraint reward_release_runs_status_check
  check (
    status in (
      'processing',
      'completed',
      'failed'
    )
  )
);

create or replace function release_mature_reward_lots(
  p_batch_size integer default 500,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid;
  v_lot record;
  v_scanned integer := 0;
  v_released integer := 0;
  v_failed integer := 0;
begin
  if p_batch_size <= 0 then
    raise exception 'batch size must be positive';
  end if;

  insert into reward_release_runs (
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

  for v_lot in
    select *
    from wallet_value_lots
    where status = 'pending'
      and source_type = 'reward_issuance_group'
      and available_at <= now()
      and remaining_amount_minor > 0
    order by available_at asc
    limit p_batch_size
    for update skip locked
  loop
    v_scanned := v_scanned + 1;

    begin
      update wallet_value_lots
      set
        status = 'available',
        metadata = metadata || p_metadata || jsonb_build_object(
          'reward_release_run_id',
          v_run_id
        ),
        updated_at = now()
      where id = v_lot.id;

      perform post_wallet_ledger_entry(
        v_lot.wallet_id,
        v_lot.user_id,
        'reward_released',
        'wallet_value_lot',
        v_lot.id,
        v_lot.remaining_amount_minor,
        -v_lot.remaining_amount_minor,
        0,
        v_lot.currency_code,
        'reward_released:' || v_lot.id::text,
        p_metadata || jsonb_build_object(
          'reward_release_run_id',
          v_run_id,
          'wallet_value_lot_id',
          v_lot.id
        )
      );

      v_released := v_released + 1;

    exception
      when others then
        v_failed := v_failed + 1;
    end;
  end loop;

  update reward_release_runs
  set
    status = 'completed',
    completed_at = now(),
    scanned_lot_count = v_scanned,
    released_count = v_released,
    failed_count = v_failed
  where id = v_run_id;

  return v_run_id;

exception
  when others then
    if v_run_id is not null then
      update reward_release_runs
      set
        status = 'failed',
        failed_at = now(),
        failure_reason = sqlerrm
      where id = v_run_id;
    end if;

    raise;
end;
$$;

create or replace view reward_issuance_details as
select
  rig.id as reward_issuance_group_id,
  rig.attention_event_id,

  rig.user_id,
  rig.wallet_id,

  rig.campaign_id,
  rig.creative_id,
  rig.placement_id,

  rig.currency_code,
  rig.reward_amount_minor,

  rig.status,
  rig.failure_reason,

  rig.campaign_budget_reservation_id,
  rig.wallet_value_lot_id,
  rig.wallet_ledger_entry_id,

  ave.decision as attention_decision,
  ave.reward_eligible,
  ave.reward_issued,
  ave.attention_score,
  ave.confidence_score,
  ave.fraud_risk_score,
  ave.quality_score,

  cbr.status as campaign_budget_reservation_status,
  cbr.amount_minor as campaign_budget_reserved_minor,

  wvl.status as wallet_value_lot_status,
  wvl.remaining_amount_minor as wallet_lot_remaining_minor,
  wvl.available_at as wallet_lot_available_at,

  rig.queued_at,
  rig.processing_at,
  rig.completed_at,
  rig.failed_at,
  rig.created_at,
  rig.updated_at

from reward_issuance_groups rig
left join attention_verification_events ave
  on ave.id = rig.attention_event_id
left join campaign_budget_reservations cbr
  on cbr.id = rig.campaign_budget_reservation_id
left join wallet_value_lots wvl
  on wvl.id = rig.wallet_value_lot_id;

create or replace view reward_issuance_integrity_check as
select
  rig.id as reward_issuance_group_id,
  rig.attention_event_id,
  rig.status,

  rig.reward_amount_minor,

  ave.reward_eligible,
  ave.reward_issued,
  ave.reward_id,

  cbr.id as campaign_budget_reservation_id,
  cbr.status as reservation_status,
  cbr.amount_minor as reservation_amount_minor,

  wvl.id as wallet_value_lot_id,
  wvl.original_amount_minor as lot_original_amount_minor,
  wvl.remaining_amount_minor as lot_remaining_amount_minor,

  wle.id as wallet_ledger_entry_id,
  wle.pending_impact_minor,

  case
    when rig.status = 'completed'
      and ave.reward_issued is not true
    then true

    when rig.status = 'completed'
      and ave.reward_id <> rig.id
    then true

    when rig.status = 'completed'
      and cbr.status <> 'issued'
    then true

    when rig.status = 'completed'
      and cbr.amount_minor <> rig.reward_amount_minor
    then true

    when rig.status = 'completed'
      and wvl.original_amount_minor <> rig.reward_amount_minor
    then true

    when rig.status = 'completed'
      and wle.pending_impact_minor <> rig.reward_amount_minor
    then true

    else false
  end as has_integrity_issue

from reward_issuance_groups rig
left join attention_verification_events ave
  on ave.id = rig.attention_event_id
left join campaign_budget_reservations cbr
  on cbr.id = rig.campaign_budget_reservation_id
left join wallet_value_lots wvl
  on wvl.id = rig.wallet_value_lot_id
left join wallet_ledger_entries wle
  on wle.id = rig.wallet_ledger_entry_id;

create or replace view reward_flow_dashboard as
select
  date_trunc('hour', created_at) as bucket_hour,

  count(*) as reward_group_count,

  count(*) filter (where status = 'pending') as pending_count,
  count(*) filter (where status = 'processing') as processing_count,
  count(*) filter (where status = 'completed') as completed_count,
  count(*) filter (where status = 'failed') as failed_count,
  count(*) filter (where status = 'cancelled') as cancelled_count,

  coalesce(sum(reward_amount_minor), 0)::bigint as total_reward_amount_minor,

  coalesce(sum(reward_amount_minor) filter (where status = 'completed'), 0)::bigint
    as completed_reward_amount_minor,

  (
    count(*) filter (where status = 'failed')::numeric
    / greatest(count(*), 1)
  )::numeric(8, 6) as failure_rate

from reward_issuance_groups
group by date_trunc('hour', created_at)
order by bucket_hour desc;
