-- 38/post-MVP schema — wallet + campaign reconciliation and drift detection.

create table if not exists wallet_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),

  run_type text not null default 'scheduled',
  scope text not null default 'wallet',
  status text not null default 'processing',

  wallet_id uuid references wallets(id),
  user_id uuid,
  campaign_id uuid,

  checked_wallet_count integer not null default 0,
  checked_campaign_count integer not null default 0,
  issue_count integer not null default 0,

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,

  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,

  constraint wallet_reconciliation_runs_scope_check
  check (
    scope in (
      'wallet',
      'campaign',
      'global'
    )
  ),

  constraint wallet_reconciliation_runs_status_check
  check (
    status in (
      'processing',
      'completed',
      'failed'
    )
  )
);

create index if not exists wallet_reconciliation_runs_started_idx
on wallet_reconciliation_runs (started_at desc);

create index if not exists wallet_reconciliation_runs_wallet_idx
on wallet_reconciliation_runs (wallet_id, started_at desc);

create index if not exists wallet_reconciliation_runs_campaign_idx
on wallet_reconciliation_runs (campaign_id, started_at desc);

create table if not exists wallet_reconciliation_issues (
  id uuid primary key default gen_random_uuid(),

  reconciliation_run_id uuid not null references wallet_reconciliation_runs(id),

  issue_type text not null,
  severity text not null default 'warning',

  wallet_id uuid references wallets(id),
  user_id uuid,
  campaign_id uuid,
  campaign_budget_id uuid,

  currency_code text,

  expected_amount_minor bigint,
  actual_amount_minor bigint,
  delta_amount_minor bigint,

  entity_type text,
  entity_id uuid,

  status text not null default 'open',

  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by_admin_id uuid,
  resolution_note text,

  metadata jsonb not null default '{}'::jsonb,

  constraint wallet_reconciliation_issues_severity_check
  check (
    severity in (
      'info',
      'warning',
      'critical'
    )
  ),

  constraint wallet_reconciliation_issues_status_check
  check (
    status in (
      'open',
      'acknowledged',
      'resolved',
      'false_positive'
    )
  )
);

create index if not exists wallet_reconciliation_issues_run_idx
on wallet_reconciliation_issues (reconciliation_run_id);

create index if not exists wallet_reconciliation_issues_wallet_idx
on wallet_reconciliation_issues (wallet_id, detected_at desc);

create index if not exists wallet_reconciliation_issues_campaign_idx
on wallet_reconciliation_issues (campaign_id, detected_at desc);

create index if not exists wallet_reconciliation_issues_status_idx
on wallet_reconciliation_issues (status, severity, detected_at desc);

create or replace view wallet_ledger_balances as
select
  wallet_id,
  user_id,
  currency_code,

  coalesce(sum(pending_impact_minor), 0)::bigint as ledger_pending_minor,
  coalesce(sum(available_impact_minor), 0)::bigint as ledger_available_minor,
  coalesce(sum(locked_impact_minor), 0)::bigint as ledger_locked_minor,

  coalesce(
    sum(
      pending_impact_minor
      + available_impact_minor
      + locked_impact_minor
    ),
    0
  )::bigint as ledger_total_minor,

  max(created_at) as last_ledger_entry_at

from wallet_ledger_entries
where status = 'posted'
group by wallet_id, user_id, currency_code;

create or replace view wallet_lot_reconciliation_balances as
with lots as (
  select
    wallet_id,
    user_id,
    currency_code,

    coalesce(sum(remaining_amount_minor) filter (
      where status = 'pending'
    ), 0)::bigint as lot_pending_minor,

    coalesce(sum(remaining_amount_minor) filter (
      where status = 'available'
    ), 0)::bigint as lot_available_minor,

    coalesce(sum(remaining_amount_minor), 0)::bigint as lot_liquid_minor

  from wallet_value_lots
  where remaining_amount_minor > 0
  group by wallet_id, user_id, currency_code
),

reservations as (
  select
    wallet_id,
    user_id,
    currency_code,

    coalesce(
      sum(
        reserved_amount_minor
        - consumed_amount_minor
        - released_amount_minor
      ),
      0
    )::bigint as lot_locked_minor

  from wallet_lot_reservations
  where status = 'reserved'
  group by wallet_id, user_id, currency_code
)

select
  coalesce(l.wallet_id, r.wallet_id) as wallet_id,
  coalesce(l.user_id, r.user_id) as user_id,
  coalesce(l.currency_code, r.currency_code) as currency_code,

  coalesce(l.lot_pending_minor, 0)::bigint as lot_pending_minor,
  coalesce(l.lot_available_minor, 0)::bigint as lot_available_minor,
  coalesce(r.lot_locked_minor, 0)::bigint as lot_locked_minor,

  (
    coalesce(l.lot_liquid_minor, 0)
    + coalesce(r.lot_locked_minor, 0)
  )::bigint as lot_total_minor

from lots l
full outer join reservations r
  on r.wallet_id = l.wallet_id
 and r.user_id = l.user_id
 and r.currency_code = l.currency_code;

create or replace view wallet_balance_reconciliation_diffs as
select
  coalesce(lb.wallet_id, rb.wallet_id) as wallet_id,
  coalesce(lb.user_id, rb.user_id) as user_id,
  coalesce(lb.currency_code, rb.currency_code) as currency_code,

  coalesce(lb.ledger_pending_minor, 0)::bigint as ledger_pending_minor,
  coalesce(rb.lot_pending_minor, 0)::bigint as lot_pending_minor,
  (
    coalesce(lb.ledger_pending_minor, 0)
    - coalesce(rb.lot_pending_minor, 0)
  )::bigint as pending_delta_minor,

  coalesce(lb.ledger_available_minor, 0)::bigint as ledger_available_minor,
  coalesce(rb.lot_available_minor, 0)::bigint as lot_available_minor,
  (
    coalesce(lb.ledger_available_minor, 0)
    - coalesce(rb.lot_available_minor, 0)
  )::bigint as available_delta_minor,

  coalesce(lb.ledger_locked_minor, 0)::bigint as ledger_locked_minor,
  coalesce(rb.lot_locked_minor, 0)::bigint as lot_locked_minor,
  (
    coalesce(lb.ledger_locked_minor, 0)
    - coalesce(rb.lot_locked_minor, 0)
  )::bigint as locked_delta_minor,

  coalesce(lb.ledger_total_minor, 0)::bigint as ledger_total_minor,
  coalesce(rb.lot_total_minor, 0)::bigint as lot_total_minor,
  (
    coalesce(lb.ledger_total_minor, 0)
    - coalesce(rb.lot_total_minor, 0)
  )::bigint as total_delta_minor

from wallet_ledger_balances lb
full outer join wallet_lot_reconciliation_balances rb
  on rb.wallet_id = lb.wallet_id
 and rb.user_id = lb.user_id
 and rb.currency_code = lb.currency_code;

create or replace function reconcile_wallet_balance(
  p_wallet_id uuid,
  p_reconciliation_run_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
as $$
declare
  v_run_id uuid;
  v_diff record;
  v_issue_count integer := 0;
  v_user_id uuid;
begin
  if p_wallet_id is null then
    raise exception 'wallet id is required';
  end if;

  select user_id
  into v_user_id
  from wallets
  where id = p_wallet_id;

  if v_user_id is null then
    raise exception 'wallet not found: %', p_wallet_id;
  end if;

  if p_reconciliation_run_id is null then
    insert into wallet_reconciliation_runs (
      run_type,
      scope,
      status,
      wallet_id,
      user_id,
      metadata
    )
    values (
      'manual',
      'wallet',
      'processing',
      p_wallet_id,
      v_user_id,
      p_metadata
    )
    returning id into v_run_id;
  else
    v_run_id := p_reconciliation_run_id;
  end if;

  for v_diff in
    select *
    from wallet_balance_reconciliation_diffs
    where wallet_id = p_wallet_id
      and (
        pending_delta_minor <> 0
        or available_delta_minor <> 0
        or locked_delta_minor <> 0
        or total_delta_minor <> 0
      )
  loop
    if v_diff.pending_delta_minor <> 0 then
      insert into wallet_reconciliation_issues (
        reconciliation_run_id,
        issue_type,
        severity,
        wallet_id,
        user_id,
        currency_code,
        expected_amount_minor,
        actual_amount_minor,
        delta_amount_minor,
        entity_type,
        entity_id,
        metadata
      )
      values (
        v_run_id,
        'wallet_pending_balance_mismatch',
        'critical',
        v_diff.wallet_id,
        v_diff.user_id,
        v_diff.currency_code,
        v_diff.lot_pending_minor,
        v_diff.ledger_pending_minor,
        v_diff.pending_delta_minor,
        'wallet',
        v_diff.wallet_id,
        p_metadata
      );

      v_issue_count := v_issue_count + 1;
    end if;

    if v_diff.available_delta_minor <> 0 then
      insert into wallet_reconciliation_issues (
        reconciliation_run_id,
        issue_type,
        severity,
        wallet_id,
        user_id,
        currency_code,
        expected_amount_minor,
        actual_amount_minor,
        delta_amount_minor,
        entity_type,
        entity_id,
        metadata
      )
      values (
        v_run_id,
        'wallet_available_balance_mismatch',
        'critical',
        v_diff.wallet_id,
        v_diff.user_id,
        v_diff.currency_code,
        v_diff.lot_available_minor,
        v_diff.ledger_available_minor,
        v_diff.available_delta_minor,
        'wallet',
        v_diff.wallet_id,
        p_metadata
      );

      v_issue_count := v_issue_count + 1;
    end if;

    if v_diff.locked_delta_minor <> 0 then
      insert into wallet_reconciliation_issues (
        reconciliation_run_id,
        issue_type,
        severity,
        wallet_id,
        user_id,
        currency_code,
        expected_amount_minor,
        actual_amount_minor,
        delta_amount_minor,
        entity_type,
        entity_id,
        metadata
      )
      values (
        v_run_id,
        'wallet_locked_balance_mismatch',
        'critical',
        v_diff.wallet_id,
        v_diff.user_id,
        v_diff.currency_code,
        v_diff.lot_locked_minor,
        v_diff.ledger_locked_minor,
        v_diff.locked_delta_minor,
        'wallet',
        v_diff.wallet_id,
        p_metadata
      );

      v_issue_count := v_issue_count + 1;
    end if;

    if v_diff.total_delta_minor <> 0 then
      insert into wallet_reconciliation_issues (
        reconciliation_run_id,
        issue_type,
        severity,
        wallet_id,
        user_id,
        currency_code,
        expected_amount_minor,
        actual_amount_minor,
        delta_amount_minor,
        entity_type,
        entity_id,
        metadata
      )
      values (
        v_run_id,
        'wallet_total_balance_mismatch',
        'critical',
        v_diff.wallet_id,
        v_diff.user_id,
        v_diff.currency_code,
        v_diff.lot_total_minor,
        v_diff.ledger_total_minor,
        v_diff.total_delta_minor,
        'wallet',
        v_diff.wallet_id,
        p_metadata
      );

      v_issue_count := v_issue_count + 1;
    end if;
  end loop;

  if p_reconciliation_run_id is null then
    update wallet_reconciliation_runs
    set
      status = 'completed',
      completed_at = now(),
      checked_wallet_count = 1,
      issue_count = v_issue_count
    where id = v_run_id;
  end if;

  return v_issue_count;

exception
  when others then
    if p_reconciliation_run_id is null and v_run_id is not null then
      update wallet_reconciliation_runs
      set
        status = 'failed',
        failed_at = now(),
        failure_reason = sqlerrm
      where id = v_run_id;
    end if;

    raise;
end;
$$;

create or replace view campaign_budget_reconciliation_diffs as
select
  cb.id as campaign_budget_id,
  cb.campaign_id,
  cb.advertiser_id,
  cb.currency_code,

  cb.reserved_amount_minor as stored_reserved_minor,
  coalesce(sum(cbr.amount_minor) filter (
    where cbr.status = 'reserved'
  ), 0)::bigint as computed_reserved_minor,

  (
    cb.reserved_amount_minor
    - coalesce(sum(cbr.amount_minor) filter (
      where cbr.status = 'reserved'
    ), 0)
  )::bigint as reserved_delta_minor,

  cb.issued_amount_minor as stored_issued_minor,
  coalesce(sum(cbr.amount_minor) filter (
    where cbr.status in (
      'issued',
      'released',
      'expired',
      'refunded',
      'partially_refunded'
    )
  ), 0)::bigint as computed_issued_minor,

  (
    cb.issued_amount_minor
    - coalesce(sum(cbr.amount_minor) filter (
      where cbr.status in (
        'issued',
        'released',
        'expired',
        'refunded',
        'partially_refunded'
      )
    ), 0)
  )::bigint as issued_delta_minor,

  cb.released_amount_minor as stored_released_minor,
  coalesce(sum(cbr.amount_minor) filter (
    where cbr.status = 'released'
  ), 0)::bigint as computed_released_minor,

  (
    cb.released_amount_minor
    - coalesce(sum(cbr.amount_minor) filter (
      where cbr.status = 'released'
    ), 0)
  )::bigint as released_delta_minor,

  cb.expired_amount_minor as stored_expired_minor,
  coalesce(sum(cbr.amount_minor) filter (
    where cbr.status = 'expired'
  ), 0)::bigint as computed_expired_minor,

  (
    cb.expired_amount_minor
    - coalesce(sum(cbr.amount_minor) filter (
      where cbr.status = 'expired'
    ), 0)
  )::bigint as expired_delta_minor,

  cb.refunded_amount_minor as stored_refunded_minor,
  coalesce(sum(cbr.refunded_amount_minor), 0)::bigint as computed_refunded_minor,

  (
    cb.refunded_amount_minor
    - coalesce(sum(cbr.refunded_amount_minor), 0)
  )::bigint as refunded_delta_minor

from campaign_budgets cb
left join campaign_budget_reservations cbr
  on cbr.campaign_budget_id = cb.id
group by cb.id;

create or replace function reconcile_campaign_budget(
  p_campaign_id uuid,
  p_reconciliation_run_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
as $$
declare
  v_run_id uuid;
  v_diff campaign_budget_reconciliation_diffs%rowtype;
  v_issue_count integer := 0;
begin
  if p_campaign_id is null then
    raise exception 'campaign id is required';
  end if;

  select *
  into v_diff
  from campaign_budget_reconciliation_diffs
  where campaign_id = p_campaign_id;

  if v_diff.campaign_budget_id is null then
    raise exception 'campaign budget not found for campaign %', p_campaign_id;
  end if;

  if p_reconciliation_run_id is null then
    insert into wallet_reconciliation_runs (
      run_type,
      scope,
      status,
      campaign_id,
      metadata
    )
    values (
      'manual',
      'campaign',
      'processing',
      p_campaign_id,
      p_metadata
    )
    returning id into v_run_id;
  else
    v_run_id := p_reconciliation_run_id;
  end if;

  if v_diff.reserved_delta_minor <> 0 then
    insert into wallet_reconciliation_issues (
      reconciliation_run_id,
      issue_type,
      severity,
      campaign_id,
      campaign_budget_id,
      currency_code,
      expected_amount_minor,
      actual_amount_minor,
      delta_amount_minor,
      entity_type,
      entity_id,
      metadata
    )
    values (
      v_run_id,
      'campaign_reserved_amount_mismatch',
      'critical',
      v_diff.campaign_id,
      v_diff.campaign_budget_id,
      v_diff.currency_code,
      v_diff.computed_reserved_minor,
      v_diff.stored_reserved_minor,
      v_diff.reserved_delta_minor,
      'campaign_budget',
      v_diff.campaign_budget_id,
      p_metadata
    );

    v_issue_count := v_issue_count + 1;
  end if;

  if v_diff.issued_delta_minor <> 0 then
    insert into wallet_reconciliation_issues (
      reconciliation_run_id,
      issue_type,
      severity,
      campaign_id,
      campaign_budget_id,
      currency_code,
      expected_amount_minor,
      actual_amount_minor,
      delta_amount_minor,
      entity_type,
      entity_id,
      metadata
    )
    values (
      v_run_id,
      'campaign_issued_amount_mismatch',
      'critical',
      v_diff.campaign_id,
      v_diff.campaign_budget_id,
      v_diff.currency_code,
      v_diff.computed_issued_minor,
      v_diff.stored_issued_minor,
      v_diff.issued_delta_minor,
      'campaign_budget',
      v_diff.campaign_budget_id,
      p_metadata
    );

    v_issue_count := v_issue_count + 1;
  end if;

  if v_diff.released_delta_minor <> 0 then
    insert into wallet_reconciliation_issues (
      reconciliation_run_id,
      issue_type,
      severity,
      campaign_id,
      campaign_budget_id,
      currency_code,
      expected_amount_minor,
      actual_amount_minor,
      delta_amount_minor,
      entity_type,
      entity_id,
      metadata
    )
    values (
      v_run_id,
      'campaign_released_amount_mismatch',
      'warning',
      v_diff.campaign_id,
      v_diff.campaign_budget_id,
      v_diff.currency_code,
      v_diff.computed_released_minor,
      v_diff.stored_released_minor,
      v_diff.released_delta_minor,
      'campaign_budget',
      v_diff.campaign_budget_id,
      p_metadata
    );

    v_issue_count := v_issue_count + 1;
  end if;

  if v_diff.expired_delta_minor <> 0 then
    insert into wallet_reconciliation_issues (
      reconciliation_run_id,
      issue_type,
      severity,
      campaign_id,
      campaign_budget_id,
      currency_code,
      expected_amount_minor,
      actual_amount_minor,
      delta_amount_minor,
      entity_type,
      entity_id,
      metadata
    )
    values (
      v_run_id,
      'campaign_expired_amount_mismatch',
      'warning',
      v_diff.campaign_id,
      v_diff.campaign_budget_id,
      v_diff.currency_code,
      v_diff.computed_expired_minor,
      v_diff.stored_expired_minor,
      v_diff.expired_delta_minor,
      'campaign_budget',
      v_diff.campaign_budget_id,
      p_metadata
    );

    v_issue_count := v_issue_count + 1;
  end if;

  if v_diff.refunded_delta_minor <> 0 then
    insert into wallet_reconciliation_issues (
      reconciliation_run_id,
      issue_type,
      severity,
      campaign_id,
      campaign_budget_id,
      currency_code,
      expected_amount_minor,
      actual_amount_minor,
      delta_amount_minor,
      entity_type,
      entity_id,
      metadata
    )
    values (
      v_run_id,
      'campaign_refunded_amount_mismatch',
      'warning',
      v_diff.campaign_id,
      v_diff.campaign_budget_id,
      v_diff.currency_code,
      v_diff.computed_refunded_minor,
      v_diff.stored_refunded_minor,
      v_diff.refunded_delta_minor,
      'campaign_budget',
      v_diff.campaign_budget_id,
      p_metadata
    );

    v_issue_count := v_issue_count + 1;
  end if;

  if p_reconciliation_run_id is null then
    update wallet_reconciliation_runs
    set
      status = 'completed',
      completed_at = now(),
      checked_campaign_count = 1,
      issue_count = v_issue_count
    where id = v_run_id;
  end if;

  return v_issue_count;

exception
  when others then
    if p_reconciliation_run_id is null and v_run_id is not null then
      update wallet_reconciliation_runs
      set
        status = 'failed',
        failed_at = now(),
        failure_reason = sqlerrm
      where id = v_run_id;
    end if;

    raise;
end;
$$;

create or replace function run_wallet_reconciliation_job(
  p_batch_size integer default 500,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid;
  v_wallet record;
  v_checked integer := 0;
  v_issues integer := 0;
  v_wallet_issues integer := 0;
begin
  if p_batch_size <= 0 then
    raise exception 'batch size must be positive';
  end if;

  insert into wallet_reconciliation_runs (
    run_type,
    scope,
    status,
    metadata
  )
  values (
    'scheduled',
    'wallet',
    'processing',
    p_metadata
  )
  returning id into v_run_id;

  for v_wallet in
    select id
    from wallets
    order by created_at asc, id asc
    limit p_batch_size
  loop
    v_checked := v_checked + 1;

    v_wallet_issues := reconcile_wallet_balance(
      v_wallet.id,
      v_run_id,
      p_metadata
    );

    v_issues := v_issues + v_wallet_issues;
  end loop;

  update wallet_reconciliation_runs
  set
    status = 'completed',
    completed_at = now(),
    checked_wallet_count = v_checked,
    issue_count = v_issues
  where id = v_run_id;

  return v_run_id;

exception
  when others then
    update wallet_reconciliation_runs
    set
      status = 'failed',
      failed_at = now(),
      failure_reason = sqlerrm
    where id = v_run_id;

    raise;
end;
$$;

create or replace function run_campaign_budget_reconciliation_job(
  p_batch_size integer default 500,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid;
  v_campaign record;
  v_checked integer := 0;
  v_issues integer := 0;
  v_campaign_issues integer := 0;
begin
  if p_batch_size <= 0 then
    raise exception 'batch size must be positive';
  end if;

  insert into wallet_reconciliation_runs (
    run_type,
    scope,
    status,
    metadata
  )
  values (
    'scheduled',
    'campaign',
    'processing',
    p_metadata
  )
  returning id into v_run_id;

  for v_campaign in
    select campaign_id
    from campaign_budgets
    order by created_at asc, id asc
    limit p_batch_size
  loop
    v_checked := v_checked + 1;

    v_campaign_issues := reconcile_campaign_budget(
      v_campaign.campaign_id,
      v_run_id,
      p_metadata
    );

    v_issues := v_issues + v_campaign_issues;
  end loop;

  update wallet_reconciliation_runs
  set
    status = 'completed',
    completed_at = now(),
    checked_campaign_count = v_checked,
    issue_count = v_issues
  where id = v_run_id;

  return v_run_id;

exception
  when others then
    update wallet_reconciliation_runs
    set
      status = 'failed',
      failed_at = now(),
      failure_reason = sqlerrm
    where id = v_run_id;

    raise;
end;
$$;

create or replace view wallet_reconciliation_dashboard as
select
  r.id as reconciliation_run_id,
  r.run_type,
  r.scope,
  r.status,
  r.wallet_id,
  r.user_id,
  r.campaign_id,
  r.checked_wallet_count,
  r.checked_campaign_count,
  r.issue_count,
  r.started_at,
  r.completed_at,
  r.failed_at,
  r.failure_reason,

  count(i.id) filter (where i.status = 'open') as open_issue_count,
  count(i.id) filter (where i.severity = 'critical') as critical_issue_count,
  count(i.id) filter (where i.severity = 'warning') as warning_issue_count,

  jsonb_agg(
    jsonb_build_object(
      'issue_id', i.id,
      'issue_type', i.issue_type,
      'severity', i.severity,
      'wallet_id', i.wallet_id,
      'campaign_id', i.campaign_id,
      'currency_code', i.currency_code,
      'expected_amount_minor', i.expected_amount_minor,
      'actual_amount_minor', i.actual_amount_minor,
      'delta_amount_minor', i.delta_amount_minor,
      'entity_type', i.entity_type,
      'entity_id', i.entity_id,
      'status', i.status,
      'detected_at', i.detected_at
    )
    order by i.detected_at desc
  ) filter (where i.id is not null) as issues

from wallet_reconciliation_runs r
left join wallet_reconciliation_issues i
  on i.reconciliation_run_id = r.id
group by r.id;

create or replace function resolve_wallet_reconciliation_issue(
  p_issue_id uuid,
  p_admin_user_id uuid,
  p_resolution_note text,
  p_status text default 'resolved'
)
returns uuid
language plpgsql
as $$
begin
  if p_issue_id is null then
    raise exception 'issue id is required';
  end if;

  if p_admin_user_id is null then
    raise exception 'admin user id is required';
  end if;

  if p_resolution_note is null or length(trim(p_resolution_note)) = 0 then
    raise exception 'resolution note is required';
  end if;

  if p_status not in ('resolved', 'false_positive', 'acknowledged') then
    raise exception 'invalid resolution status: %', p_status;
  end if;

  update wallet_reconciliation_issues
  set
    status = p_status,
    resolved_at =
      case
        when p_status in ('resolved', 'false_positive')
        then now()
        else resolved_at
      end,
    resolved_by_admin_id = p_admin_user_id,
    resolution_note = p_resolution_note
  where id = p_issue_id;

  if not found then
    raise exception 'reconciliation issue not found: %', p_issue_id;
  end if;

  return p_issue_id;
end;
$$;
