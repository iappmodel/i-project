-- Step 5.8 — External payout reconciliation
-- Reconciles internal withdrawal state against external payout processor truth.

create table if not exists external_payout_providers (
  id uuid primary key default gen_random_uuid(),

  provider_code text not null unique,
  name text not null,

  status text not null default 'active',

  supports_webhooks boolean not null default true,
  supports_reversals boolean not null default true,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint external_payout_providers_status_check
  check (
    status in (
      'active',
      'disabled',
      'sandbox',
      'deprecated'
    )
  )
);

create index if not exists external_payout_providers_status_idx
on external_payout_providers (status);

insert into external_payout_providers (
  provider_code,
  name,
  status
)
values
  ('stripe', 'Stripe', 'active'),
  ('paypal', 'PayPal', 'active'),
  ('wise', 'Wise', 'active'),
  ('bank_ach', 'Bank ACH', 'active'),
  ('crypto_payout', 'Crypto Payout', 'active'),
  ('manual_wire', 'Manual Wire', 'active')
on conflict (provider_code) do update
set
  name = excluded.name,
  status = excluded.status,
  updated_at = now();

create table if not exists external_payout_records (
  id uuid primary key default gen_random_uuid(),

  provider_id uuid not null references external_payout_providers(id),
  provider_code text not null,

  withdrawal_request_id uuid references wallet_withdrawal_requests(id),
  wallet_id uuid not null references wallets(id),
  user_id uuid not null,

  external_payout_id text not null,
  external_transfer_id text,
  external_batch_id text,

  currency_code text not null default 'USD',

  requested_amount_minor bigint not null,
  external_amount_minor bigint not null,

  external_fee_minor bigint not null default 0,
  net_amount_minor bigint generated always as (
    external_amount_minor - external_fee_minor
  ) stored,

  internal_status text not null default 'created',
  external_status text not null,

  payout_destination_type text,
  payout_destination_fingerprint text,

  initiated_at timestamptz,
  processed_at timestamptz,
  paid_at timestamptz,
  failed_at timestamptz,
  reversed_at timestamptz,
  cancelled_at timestamptz,

  failure_code text,
  failure_reason text,

  raw_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint external_payout_records_amount_check
  check (
    requested_amount_minor > 0
    and external_amount_minor >= 0
    and external_fee_minor >= 0
  ),

  constraint external_payout_records_internal_status_check
  check (
    internal_status in (
      'created',
      'submitted',
      'processing',
      'paid',
      'failed',
      'cancelled',
      'reversed',
      'unknown'
    )
  )
);

create unique index if not exists external_payout_records_provider_external_unique
on external_payout_records (provider_code, external_payout_id);

create index if not exists external_payout_records_withdrawal_idx
on external_payout_records (withdrawal_request_id);

create index if not exists external_payout_records_wallet_idx
on external_payout_records (wallet_id, created_at desc);

create index if not exists external_payout_records_status_idx
on external_payout_records (provider_code, external_status, created_at desc);

create index if not exists external_payout_records_batch_idx
on external_payout_records (external_batch_id);

create table if not exists external_payout_events (
  id uuid primary key default gen_random_uuid(),

  provider_id uuid references external_payout_providers(id),
  provider_code text not null,

  external_event_id text,
  external_payout_id text,

  external_event_type text not null,
  external_status text,

  withdrawal_request_id uuid references wallet_withdrawal_requests(id),
  external_payout_record_id uuid references external_payout_records(id),

  wallet_id uuid references wallets(id),
  user_id uuid,

  currency_code text,
  amount_minor bigint,

  idempotency_key text,

  raw_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  received_at timestamptz not null default now(),
  processed_at timestamptz,

  processing_status text not null default 'received',
  processing_error text,

  constraint external_payout_events_processing_status_check
  check (
    processing_status in (
      'received',
      'processed',
      'ignored',
      'failed'
    )
  )
);

create unique index if not exists external_payout_events_provider_event_unique
on external_payout_events (provider_code, external_event_id)
where external_event_id is not null;

create unique index if not exists external_payout_events_idempotency_unique
on external_payout_events (provider_code, idempotency_key)
where idempotency_key is not null;

create index if not exists external_payout_events_external_payout_idx
on external_payout_events (provider_code, external_payout_id, received_at desc);

create index if not exists external_payout_events_withdrawal_idx
on external_payout_events (withdrawal_request_id, received_at desc);

create index if not exists external_payout_events_processing_idx
on external_payout_events (processing_status, received_at desc);

create table if not exists payout_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),

  provider_id uuid references external_payout_providers(id),
  provider_code text,

  run_type text not null default 'scheduled',
  status text not null default 'processing',

  scanned_payout_count integer not null default 0,
  matched_payout_count integer not null default 0,
  mismatch_count integer not null default 0,
  missing_external_count integer not null default 0,
  missing_internal_count integer not null default 0,

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,

  failure_reason text,

  metadata jsonb not null default '{}'::jsonb,

  constraint payout_reconciliation_runs_status_check
  check (
    status in (
      'processing',
      'completed',
      'failed'
    )
  )
);

create index if not exists payout_reconciliation_runs_started_idx
on payout_reconciliation_runs (started_at desc);

create index if not exists payout_reconciliation_runs_provider_idx
on payout_reconciliation_runs (provider_code, started_at desc);

create table if not exists payout_reconciliation_issues (
  id uuid primary key default gen_random_uuid(),

  payout_reconciliation_run_id uuid not null references payout_reconciliation_runs(id),

  issue_type text not null,
  severity text not null default 'warning',

  provider_code text,

  withdrawal_request_id uuid references wallet_withdrawal_requests(id),
  external_payout_record_id uuid references external_payout_records(id),

  wallet_id uuid references wallets(id),
  user_id uuid,

  currency_code text,

  internal_amount_minor bigint,
  external_amount_minor bigint,
  delta_amount_minor bigint,

  internal_status text,
  external_status text,

  status text not null default 'open',

  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by_admin_id uuid,
  resolution_note text,

  metadata jsonb not null default '{}'::jsonb,

  constraint payout_reconciliation_issues_severity_check
  check (
    severity in (
      'info',
      'warning',
      'critical'
    )
  ),

  constraint payout_reconciliation_issues_status_check
  check (
    status in (
      'open',
      'acknowledged',
      'resolved',
      'false_positive'
    )
  )
);

create index if not exists payout_reconciliation_issues_run_idx
on payout_reconciliation_issues (payout_reconciliation_run_id);

create index if not exists payout_reconciliation_issues_wallet_idx
on payout_reconciliation_issues (wallet_id, detected_at desc);

create index if not exists payout_reconciliation_issues_withdrawal_idx
on payout_reconciliation_issues (withdrawal_request_id);

create index if not exists payout_reconciliation_issues_status_idx
on payout_reconciliation_issues (status, severity, detected_at desc);

create table if not exists external_payout_status_mappings (
  id uuid primary key default gen_random_uuid(),

  provider_code text not null,
  external_status text not null,

  normalized_status text not null,

  active boolean not null default true,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint external_payout_status_mappings_normalized_check
  check (
    normalized_status in (
      'created',
      'submitted',
      'processing',
      'paid',
      'failed',
      'cancelled',
      'reversed',
      'unknown'
    )
  )
);

create unique index if not exists external_payout_status_mappings_unique
on external_payout_status_mappings (provider_code, external_status);

insert into external_payout_status_mappings (
  provider_code,
  external_status,
  normalized_status,
  metadata
)
values
  ('stripe', 'pending', 'processing', '{}'),
  ('stripe', 'in_transit', 'processing', '{}'),
  ('stripe', 'paid', 'paid', '{}'),
  ('stripe', 'failed', 'failed', '{}'),
  ('stripe', 'canceled', 'cancelled', '{}'),

  ('paypal', 'PENDING', 'processing', '{}'),
  ('paypal', 'SUCCESS', 'paid', '{}'),
  ('paypal', 'FAILED', 'failed', '{}'),
  ('paypal', 'RETURNED', 'reversed', '{}'),

  ('wise', 'processing', 'processing', '{}'),
  ('wise', 'outgoing_payment_sent', 'paid', '{}'),
  ('wise', 'funds_refunded', 'reversed', '{}'),
  ('wise', 'cancelled', 'cancelled', '{}')
on conflict (provider_code, external_status)
do update set
  normalized_status = excluded.normalized_status,
  metadata = external_payout_status_mappings.metadata || excluded.metadata;

create or replace function normalize_external_payout_status(
  p_provider_code text,
  p_external_status text
)
returns text
language sql
stable
as $$
  select coalesce(
    (
      select normalized_status
      from external_payout_status_mappings
      where provider_code = p_provider_code
        and external_status = p_external_status
        and active is true
      limit 1
    ),
    'unknown'
  );
$$;

create or replace function upsert_external_payout_record(
  p_provider_code text,
  p_external_payout_id text,
  p_withdrawal_request_id uuid,
  p_wallet_id uuid,
  p_user_id uuid,
  p_currency_code text,
  p_requested_amount_minor bigint,
  p_external_amount_minor bigint,
  p_external_fee_minor bigint default 0,
  p_external_status text default 'unknown',
  p_external_transfer_id text default null,
  p_external_batch_id text default null,
  p_raw_payload jsonb default '{}'::jsonb,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_provider_id uuid;
  v_record_id uuid;
  v_normalized_status text;
begin
  if p_provider_code is null or length(trim(p_provider_code)) = 0 then
    raise exception 'provider code is required';
  end if;

  if p_external_payout_id is null or length(trim(p_external_payout_id)) = 0 then
    raise exception 'external payout id is required';
  end if;

  if p_wallet_id is null then
    raise exception 'wallet id is required';
  end if;

  if p_user_id is null then
    raise exception 'user id is required';
  end if;

  if p_requested_amount_minor <= 0 then
    raise exception 'requested amount must be positive';
  end if;

  if p_external_amount_minor < 0 then
    raise exception 'external amount cannot be negative';
  end if;

  select id
  into v_provider_id
  from external_payout_providers
  where provider_code = p_provider_code;

  if v_provider_id is null then
    insert into external_payout_providers (
      provider_code,
      name,
      status
    )
    values (
      p_provider_code,
      p_provider_code,
      'active'
    )
    returning id into v_provider_id;
  end if;

  v_normalized_status := normalize_external_payout_status(
    p_provider_code,
    p_external_status
  );

  insert into external_payout_records (
    provider_id,
    provider_code,
    withdrawal_request_id,
    wallet_id,
    user_id,
    external_payout_id,
    external_transfer_id,
    external_batch_id,
    currency_code,
    requested_amount_minor,
    external_amount_minor,
    external_fee_minor,
    internal_status,
    external_status,
    initiated_at,
    processed_at,
    paid_at,
    failed_at,
    reversed_at,
    cancelled_at,
    raw_payload,
    metadata
  )
  values (
    v_provider_id,
    p_provider_code,
    p_withdrawal_request_id,
    p_wallet_id,
    p_user_id,
    p_external_payout_id,
    p_external_transfer_id,
    p_external_batch_id,
    coalesce(p_currency_code, 'USD'),
    p_requested_amount_minor,
    p_external_amount_minor,
    coalesce(p_external_fee_minor, 0),
    v_normalized_status,
    p_external_status,
    case when v_normalized_status in ('submitted', 'processing', 'paid') then now() else null end,
    case when v_normalized_status in ('processing', 'paid', 'failed') then now() else null end,
    case when v_normalized_status = 'paid' then now() else null end,
    case when v_normalized_status = 'failed' then now() else null end,
    case when v_normalized_status = 'reversed' then now() else null end,
    case when v_normalized_status = 'cancelled' then now() else null end,
    p_raw_payload,
    p_metadata
  )
  on conflict (provider_code, external_payout_id)
  do update set
    withdrawal_request_id = coalesce(
      excluded.withdrawal_request_id,
      external_payout_records.withdrawal_request_id
    ),
    wallet_id = excluded.wallet_id,
    user_id = excluded.user_id,
    external_transfer_id = coalesce(
      excluded.external_transfer_id,
      external_payout_records.external_transfer_id
    ),
    external_batch_id = coalesce(
      excluded.external_batch_id,
      external_payout_records.external_batch_id
    ),
    currency_code = excluded.currency_code,
    requested_amount_minor = excluded.requested_amount_minor,
    external_amount_minor = excluded.external_amount_minor,
    external_fee_minor = excluded.external_fee_minor,
    internal_status = excluded.internal_status,
    external_status = excluded.external_status,
    initiated_at = coalesce(excluded.initiated_at, external_payout_records.initiated_at),
    processed_at = coalesce(excluded.processed_at, external_payout_records.processed_at),
    paid_at = coalesce(excluded.paid_at, external_payout_records.paid_at),
    failed_at = coalesce(excluded.failed_at, external_payout_records.failed_at),
    reversed_at = coalesce(excluded.reversed_at, external_payout_records.reversed_at),
    cancelled_at = coalesce(excluded.cancelled_at, external_payout_records.cancelled_at),
    raw_payload = external_payout_records.raw_payload || excluded.raw_payload,
    metadata = external_payout_records.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_record_id;

  return v_record_id;
end;
$$;

create or replace function record_external_payout_event(
  p_provider_code text,
  p_external_event_id text,
  p_external_event_type text,
  p_external_payout_id text,
  p_external_status text default null,
  p_currency_code text default null,
  p_amount_minor bigint default null,
  p_idempotency_key text default null,
  p_raw_payload jsonb default '{}'::jsonb,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_provider_id uuid;
  v_record external_payout_records%rowtype;
  v_event_id uuid;
begin
  if p_provider_code is null or length(trim(p_provider_code)) = 0 then
    raise exception 'provider code is required';
  end if;

  if p_external_event_type is null or length(trim(p_external_event_type)) = 0 then
    raise exception 'external event type is required';
  end if;

  select id
  into v_provider_id
  from external_payout_providers
  where provider_code = p_provider_code;

  if v_provider_id is null then
    insert into external_payout_providers (
      provider_code,
      name,
      status
    )
    values (
      p_provider_code,
      p_provider_code,
      'active'
    )
    returning id into v_provider_id;
  end if;

  select *
  into v_record
  from external_payout_records
  where provider_code = p_provider_code
    and external_payout_id = p_external_payout_id
  limit 1;

  insert into external_payout_events (
    provider_id,
    provider_code,
    external_event_id,
    external_payout_id,
    external_event_type,
    external_status,
    withdrawal_request_id,
    external_payout_record_id,
    wallet_id,
    user_id,
    currency_code,
    amount_minor,
    idempotency_key,
    raw_payload,
    metadata
  )
  values (
    v_provider_id,
    p_provider_code,
    p_external_event_id,
    p_external_payout_id,
    p_external_event_type,
    p_external_status,
    v_record.withdrawal_request_id,
    v_record.id,
    v_record.wallet_id,
    v_record.user_id,
    coalesce(p_currency_code, v_record.currency_code),
    p_amount_minor,
    p_idempotency_key,
    p_raw_payload,
    p_metadata
  )
  on conflict (provider_code, external_event_id)
  where external_event_id is not null
  do update set
    raw_payload = external_payout_events.raw_payload || excluded.raw_payload,
    metadata = external_payout_events.metadata || excluded.metadata
  returning id into v_event_id;

  return v_event_id;
end;
$$;

create or replace view payout_reconciliation_diffs as
select
  wr.id as withdrawal_request_id,
  epr.id as external_payout_record_id,

  coalesce(wr.wallet_id, epr.wallet_id) as wallet_id,
  coalesce(wr.user_id, epr.user_id) as user_id,
  coalesce(wr.currency_code, epr.currency_code) as currency_code,

  wr.requested_amount_minor as internal_amount_minor,
  wr.status as internal_withdrawal_status,

  epr.provider_code,
  epr.external_payout_id,
  epr.external_amount_minor,
  epr.external_fee_minor,
  epr.net_amount_minor,
  epr.internal_status as normalized_external_status,
  epr.external_status,

  (
    coalesce(epr.external_amount_minor, 0)
    - coalesce(wr.requested_amount_minor, 0)
  )::bigint as amount_delta_minor,

  case
    when epr.id is null then 'missing_external_payout'
    when wr.id is null then 'missing_internal_withdrawal'
    when epr.external_amount_minor <> wr.requested_amount_minor then 'amount_mismatch'
    when wr.status in ('paid', 'completed') and epr.internal_status <> 'paid' then 'internal_paid_external_not_paid'
    when wr.status in ('failed', 'cancelled') and epr.internal_status = 'paid' then 'internal_failed_external_paid'
    when wr.status in ('requested', 'reserved', 'processing') and epr.internal_status = 'paid' then 'external_paid_internal_pending'
    when epr.internal_status = 'reversed' and wr.status in ('paid', 'completed') then 'external_reversed_internal_paid'
    else 'matched'
  end as reconciliation_status

from wallet_withdrawal_requests wr
full outer join external_payout_records epr
  on epr.withdrawal_request_id = wr.id;

create or replace function reconcile_external_payout(
  p_withdrawal_request_id uuid,
  p_payout_reconciliation_run_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
as $$
declare
  v_run_id uuid;
  v_diff payout_reconciliation_diffs%rowtype;
  v_issue_count integer := 0;
begin
  if p_withdrawal_request_id is null then
    raise exception 'withdrawal request id is required';
  end if;

  select *
  into v_diff
  from payout_reconciliation_diffs
  where withdrawal_request_id = p_withdrawal_request_id
  limit 1;

  if v_diff.withdrawal_request_id is null then
    raise exception 'withdrawal request not found: %', p_withdrawal_request_id;
  end if;

  if p_payout_reconciliation_run_id is null then
    insert into payout_reconciliation_runs (
      run_type,
      status,
      provider_code,
      metadata
    )
    values (
      'manual',
      'processing',
      v_diff.provider_code,
      p_metadata
    )
    returning id into v_run_id;
  else
    v_run_id := p_payout_reconciliation_run_id;
  end if;

  if v_diff.reconciliation_status <> 'matched' then
    insert into payout_reconciliation_issues (
      payout_reconciliation_run_id,
      issue_type,
      severity,
      provider_code,
      withdrawal_request_id,
      external_payout_record_id,
      wallet_id,
      user_id,
      currency_code,
      internal_amount_minor,
      external_amount_minor,
      delta_amount_minor,
      internal_status,
      external_status,
      metadata
    )
    values (
      v_run_id,
      v_diff.reconciliation_status,
      case
        when v_diff.reconciliation_status in (
          'internal_failed_external_paid',
          'external_reversed_internal_paid',
          'amount_mismatch'
        )
        then 'critical'
        else 'warning'
      end,
      v_diff.provider_code,
      v_diff.withdrawal_request_id,
      v_diff.external_payout_record_id,
      v_diff.wallet_id,
      v_diff.user_id,
      v_diff.currency_code,
      v_diff.internal_amount_minor,
      v_diff.external_amount_minor,
      v_diff.amount_delta_minor,
      v_diff.internal_withdrawal_status,
      v_diff.normalized_external_status,
      p_metadata
    );

    v_issue_count := v_issue_count + 1;
  end if;

  if p_payout_reconciliation_run_id is null then
    update payout_reconciliation_runs
    set
      status = 'completed',
      completed_at = now(),
      scanned_payout_count = 1,
      matched_payout_count =
        case when v_issue_count = 0 then 1 else 0 end,
      mismatch_count = v_issue_count
    where id = v_run_id;
  end if;

  return v_issue_count;

exception
  when others then
    if p_payout_reconciliation_run_id is null and v_run_id is not null then
      update payout_reconciliation_runs
      set
        status = 'failed',
        failed_at = now(),
        failure_reason = sqlerrm
      where id = v_run_id;
    end if;

    raise;
end;
$$;

create or replace function run_external_payout_reconciliation_job(
  p_batch_size integer default 500,
  p_provider_code text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid;
  v_row record;

  v_scanned integer := 0;
  v_matched integer := 0;
  v_mismatch integer := 0;
  v_missing_external integer := 0;
  v_missing_internal integer := 0;

  v_issue_count integer;
begin
  if p_batch_size <= 0 then
    raise exception 'batch size must be positive';
  end if;

  insert into payout_reconciliation_runs (
    provider_code,
    run_type,
    status,
    metadata
  )
  values (
    p_provider_code,
    'scheduled',
    'processing',
    p_metadata
  )
  returning id into v_run_id;

  for v_row in
    select *
    from payout_reconciliation_diffs
    where (
      p_provider_code is null
      or provider_code = p_provider_code
    )
    order by coalesce(withdrawal_request_id, external_payout_record_id) asc
    limit p_batch_size
  loop
    v_scanned := v_scanned + 1;

    if v_row.reconciliation_status = 'missing_internal_withdrawal' then
      insert into payout_reconciliation_issues (
        payout_reconciliation_run_id,
        issue_type,
        severity,
        provider_code,
        withdrawal_request_id,
        external_payout_record_id,
        wallet_id,
        user_id,
        currency_code,
        internal_amount_minor,
        external_amount_minor,
        delta_amount_minor,
        internal_status,
        external_status,
        metadata
      )
      values (
        v_run_id,
        v_row.reconciliation_status,
        'critical',
        v_row.provider_code,
        v_row.withdrawal_request_id,
        v_row.external_payout_record_id,
        v_row.wallet_id,
        v_row.user_id,
        v_row.currency_code,
        v_row.internal_amount_minor,
        v_row.external_amount_minor,
        v_row.amount_delta_minor,
        v_row.internal_withdrawal_status,
        v_row.normalized_external_status,
        p_metadata
      );

      v_issue_count := 1;

    elsif v_row.withdrawal_request_id is not null then
      v_issue_count := reconcile_external_payout(
        v_row.withdrawal_request_id,
        v_run_id,
        p_metadata
      );
    else
      v_issue_count := 0;
    end if;

    if v_issue_count = 0 then
      v_matched := v_matched + 1;
    else
      v_mismatch := v_mismatch + v_issue_count;

      if v_row.reconciliation_status = 'missing_external_payout' then
        v_missing_external := v_missing_external + 1;
      end if;

      if v_row.reconciliation_status = 'missing_internal_withdrawal' then
        v_missing_internal := v_missing_internal + 1;
      end if;
    end if;
  end loop;

  update payout_reconciliation_runs
  set
    status = 'completed',
    completed_at = now(),
    scanned_payout_count = v_scanned,
    matched_payout_count = v_matched,
    mismatch_count = v_mismatch,
    missing_external_count = v_missing_external,
    missing_internal_count = v_missing_internal
  where id = v_run_id;

  return v_run_id;

exception
  when others then
    if v_run_id is not null then
      update payout_reconciliation_runs
      set
        status = 'failed',
        failed_at = now(),
        failure_reason = sqlerrm
      where id = v_run_id;
    end if;

    raise;
end;
$$;

create or replace function resolve_payout_reconciliation_issue(
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
    raise exception 'invalid issue status: %', p_status;
  end if;

  update payout_reconciliation_issues
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
    raise exception 'payout reconciliation issue not found: %', p_issue_id;
  end if;

  return p_issue_id;
end;
$$;

create or replace view payout_reconciliation_dashboard as
select
  r.id as payout_reconciliation_run_id,
  r.provider_code,
  r.run_type,
  r.status,
  r.scanned_payout_count,
  r.matched_payout_count,
  r.mismatch_count,
  r.missing_external_count,
  r.missing_internal_count,
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
      'provider_code', i.provider_code,
      'withdrawal_request_id', i.withdrawal_request_id,
      'external_payout_record_id', i.external_payout_record_id,
      'wallet_id', i.wallet_id,
      'user_id', i.user_id,
      'currency_code', i.currency_code,
      'internal_amount_minor', i.internal_amount_minor,
      'external_amount_minor', i.external_amount_minor,
      'delta_amount_minor', i.delta_amount_minor,
      'internal_status', i.internal_status,
      'external_status', i.external_status,
      'status', i.status,
      'detected_at', i.detected_at
    )
    order by i.detected_at desc
  ) filter (where i.id is not null) as issues

from payout_reconciliation_runs r
left join payout_reconciliation_issues i
  on i.payout_reconciliation_run_id = r.id
group by r.id;

create or replace view external_payout_details as
select
  epr.id as external_payout_record_id,
  epr.provider_code,
  epr.withdrawal_request_id,
  epr.wallet_id,
  epr.user_id,
  epr.external_payout_id,
  epr.external_transfer_id,
  epr.external_batch_id,
  epr.currency_code,
  epr.requested_amount_minor,
  epr.external_amount_minor,
  epr.external_fee_minor,
  epr.net_amount_minor,
  epr.internal_status as normalized_external_status,
  epr.external_status,
  epr.initiated_at,
  epr.processed_at,
  epr.paid_at,
  epr.failed_at,
  epr.reversed_at,
  epr.cancelled_at,
  epr.failure_code,
  epr.failure_reason,
  epr.created_at,
  epr.updated_at,

  count(e.id) as event_count,

  jsonb_agg(
    jsonb_build_object(
      'event_id', e.id,
      'external_event_id', e.external_event_id,
      'external_event_type', e.external_event_type,
      'external_status', e.external_status,
      'amount_minor', e.amount_minor,
      'processing_status', e.processing_status,
      'received_at', e.received_at,
      'processed_at', e.processed_at,
      'processing_error', e.processing_error
    )
    order by e.received_at desc
  ) filter (where e.id is not null) as events

from external_payout_records epr
left join external_payout_events e
  on e.external_payout_record_id = epr.id
group by epr.id;
