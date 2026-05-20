-- Step 6.5 — Campaign invoice reconciliation.
-- Adds advertiser-facing billing/invoice surfaces and ties them to accounting mirrors.

insert into accounting_accounts (
  account_key,
  account_name,
  account_type,
  normal_balance,
  currency_code,
  metadata
)
values
  (
    'accounts_receivable_usd',
    'Accounts Receivable USD',
    'asset',
    'debit',
    'USD',
    '{"meaning": "amounts invoiced to advertisers but not yet paid"}'::jsonb
  ),
  (
    'campaign_revenue_usd',
    'Campaign Revenue USD',
    'revenue',
    'credit',
    'USD',
    '{"meaning": "earned campaign/platform revenue"}'::jsonb
  ),
  (
    'deferred_campaign_revenue_usd',
    'Deferred Campaign Revenue USD',
    'liability',
    'credit',
    'USD',
    '{"meaning": "advertiser prepayment not yet earned"}'::jsonb
  ),
  (
    'campaign_refund_payable_usd',
    'Campaign Refund Payable USD',
    'liability',
    'credit',
    'USD',
    '{"meaning": "refunds owed back to advertiser"}'::jsonb
  )
on conflict (account_key)
do update set
  account_name = excluded.account_name,
  account_type = excluded.account_type,
  normal_balance = excluded.normal_balance,
  metadata = accounting_accounts.metadata || excluded.metadata,
  updated_at = now();

create table if not exists advertisers (
  id uuid primary key default gen_random_uuid(),

  advertiser_name text not null,

  billing_email text,
  legal_name text,
  tax_id_hash text,

  status text not null default 'active',

  default_currency_code text not null default 'USD',

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint advertisers_status_check
  check (
    status in (
      'active',
      'paused',
      'blocked',
      'archived'
    )
  )
);

create index if not exists advertisers_status_idx
on advertisers (status, created_at desc);

alter table campaign_budgets
add column if not exists advertiser_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'campaign_budgets_advertiser_fk'
  ) then
    alter table campaign_budgets
    add constraint campaign_budgets_advertiser_fk
    foreign key (advertiser_id) references advertisers(id) not valid;
  end if;
end
$$;

create index if not exists campaign_budgets_advertiser_idx
on campaign_budgets (advertiser_id);

alter table campaigns
add column if not exists advertiser_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'campaigns_advertiser_fk'
  ) then
    alter table campaigns
    add constraint campaigns_advertiser_fk
    foreign key (advertiser_id) references advertisers(id) not valid;
  end if;
end
$$;

create index if not exists campaigns_advertiser_idx
on campaigns (advertiser_id);

create table if not exists campaign_invoices (
  id uuid primary key default gen_random_uuid(),

  invoice_number text not null unique,

  advertiser_id uuid references advertisers(id),
  campaign_id uuid references campaigns(id),

  invoice_type text not null default 'campaign_usage',

  status text not null default 'draft',

  currency_code text not null default 'USD',

  gross_amount_minor bigint not null default 0,
  reward_amount_minor bigint not null default 0,
  platform_fee_minor bigint not null default 0,
  adjustment_amount_minor bigint not null default 0,
  tax_amount_minor bigint not null default 0,
  total_amount_minor bigint not null default 0,

  paid_amount_minor bigint not null default 0,
  refunded_amount_minor bigint not null default 0,
  outstanding_amount_minor bigint not null default 0,

  billing_period_start timestamptz,
  billing_period_end timestamptz,

  issued_at timestamptz,
  due_at timestamptz,
  paid_at timestamptz,
  voided_at timestamptz,

  idempotency_key text not null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint campaign_invoices_type_check
  check (
    invoice_type in (
      'campaign_usage',
      'campaign_prepay',
      'campaign_adjustment',
      'campaign_refund'
    )
  ),

  constraint campaign_invoices_status_check
  check (
    status in (
      'draft',
      'issued',
      'partially_paid',
      'paid',
      'overdue',
      'voided',
      'refunded'
    )
  ),

  constraint campaign_invoices_amount_check
  check (
    gross_amount_minor >= 0
    and reward_amount_minor >= 0
    and platform_fee_minor >= 0
    and tax_amount_minor >= 0
    and total_amount_minor >= 0
    and paid_amount_minor >= 0
    and refunded_amount_minor >= 0
    and outstanding_amount_minor >= 0
  )
);

create unique index if not exists campaign_invoices_idempotency_unique
on campaign_invoices (idempotency_key);

create index if not exists campaign_invoices_advertiser_idx
on campaign_invoices (advertiser_id, created_at desc);

create index if not exists campaign_invoices_campaign_idx
on campaign_invoices (campaign_id, created_at desc);

create index if not exists campaign_invoices_status_idx
on campaign_invoices (status, due_at);

create table if not exists campaign_invoice_lines (
  id uuid primary key default gen_random_uuid(),

  campaign_invoice_id uuid not null references campaign_invoices(id) on delete cascade,

  campaign_id uuid references campaigns(id),
  advertiser_id uuid references advertisers(id),

  line_type text not null,

  description text not null,

  currency_code text not null default 'USD',

  quantity numeric(18, 6) not null default 1,
  unit_amount_minor bigint not null default 0,
  amount_minor bigint not null,

  related_reward_issuance_group_id uuid references reward_issuance_groups(id),
  related_campaign_budget_reservation_id uuid references campaign_budget_reservations(id),
  related_campaign_budget_refund_group_id uuid references campaign_budget_refund_groups(id),

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint campaign_invoice_lines_type_check
  check (
    line_type in (
      'verified_attention_reward',
      'platform_fee',
      'budget_prepay',
      'adjustment',
      'clawback_credit',
      'refund',
      'tax'
    )
  ),

  constraint campaign_invoice_lines_amount_check
  check (
    quantity >= 0
    and unit_amount_minor >= 0
  )
);

create index if not exists campaign_invoice_lines_invoice_idx
on campaign_invoice_lines (campaign_invoice_id);

create index if not exists campaign_invoice_lines_campaign_idx
on campaign_invoice_lines (campaign_id, created_at desc);

create index if not exists campaign_invoice_lines_reward_idx
on campaign_invoice_lines (related_reward_issuance_group_id);

create table if not exists campaign_invoice_payments (
  id uuid primary key default gen_random_uuid(),

  campaign_invoice_id uuid not null references campaign_invoices(id),

  advertiser_id uuid references advertisers(id),

  provider_key text,
  provider_payment_id text,
  processor_reference text,

  currency_code text not null default 'USD',

  amount_minor bigint not null,

  status text not null default 'received',

  received_at timestamptz not null default now(),

  idempotency_key text not null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint campaign_invoice_payments_amount_check
  check (amount_minor > 0),

  constraint campaign_invoice_payments_status_check
  check (
    status in (
      'received',
      'failed',
      'reversed',
      'refunded'
    )
  )
);

create unique index if not exists campaign_invoice_payments_idempotency_unique
on campaign_invoice_payments (idempotency_key);

create index if not exists campaign_invoice_payments_invoice_idx
on campaign_invoice_payments (campaign_invoice_id, created_at desc);

create index if not exists campaign_invoice_payments_advertiser_idx
on campaign_invoice_payments (advertiser_id, created_at desc);

create table if not exists campaign_invoice_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),

  run_type text not null default 'scheduled',

  campaign_id uuid references campaigns(id),
  advertiser_id uuid references advertisers(id),

  status text not null default 'processing',

  scanned_invoice_count integer not null default 0,
  issue_count integer not null default 0,
  corrected_count integer not null default 0,
  failed_correction_count integer not null default 0,

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,

  failure_reason text,

  metadata jsonb not null default '{}'::jsonb,

  constraint campaign_invoice_reconciliation_runs_status_check
  check (
    status in (
      'processing',
      'completed',
      'failed'
    )
  )
);

create index if not exists campaign_invoice_reconciliation_runs_started_idx
on campaign_invoice_reconciliation_runs (started_at desc);

create table if not exists campaign_invoice_reconciliation_issues (
  id uuid primary key default gen_random_uuid(),

  campaign_invoice_reconciliation_run_id uuid references campaign_invoice_reconciliation_runs(id),

  campaign_invoice_id uuid references campaign_invoices(id),

  advertiser_id uuid references advertisers(id),
  campaign_id uuid references campaigns(id),

  issue_type text not null,
  severity text not null default 'warning',

  expected_amount_minor bigint,
  actual_amount_minor bigint,
  delta_amount_minor bigint,

  status text not null default 'open',

  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by_admin_id uuid references admin_users(id),
  resolution_note text,

  metadata jsonb not null default '{}'::jsonb,

  constraint campaign_invoice_reconciliation_issues_severity_check
  check (
    severity in (
      'info',
      'warning',
      'critical'
    )
  ),

  constraint campaign_invoice_reconciliation_issues_status_check
  check (
    status in (
      'open',
      'acknowledged',
      'resolved',
      'false_positive'
    )
  )
);

create index if not exists campaign_invoice_reconciliation_issues_run_idx
on campaign_invoice_reconciliation_issues (campaign_invoice_reconciliation_run_id);

create index if not exists campaign_invoice_reconciliation_issues_invoice_idx
on campaign_invoice_reconciliation_issues (campaign_invoice_id, detected_at desc);

create index if not exists campaign_invoice_reconciliation_issues_status_idx
on campaign_invoice_reconciliation_issues (status, severity, detected_at desc);

create or replace function generate_campaign_invoice_number()
returns text
language sql
volatile
as $$
  select 'INV-' ||
         to_char(now(), 'YYYYMMDD') ||
         '-' ||
         upper(substr(gen_random_uuid()::text, 1, 8));
$$;

create or replace function create_campaign_usage_invoice(
  p_advertiser_id uuid,
  p_campaign_id uuid,
  p_billing_period_start timestamptz,
  p_billing_period_end timestamptz,
  p_platform_fee_rate numeric default 0.000000,
  p_tax_rate numeric default 0.000000,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_invoice_id uuid;
  v_invoice_number text;
  v_idempotency_key text;

  v_reward_amount_minor bigint;
  v_platform_fee_minor bigint;
  v_tax_amount_minor bigint;
  v_total_amount_minor bigint;
begin
  if p_campaign_id is null then
    raise exception 'campaign id is required';
  end if;

  if p_billing_period_start is null or p_billing_period_end is null then
    raise exception 'billing period is required';
  end if;

  if p_billing_period_end <= p_billing_period_start then
    raise exception 'billing period end must be after start';
  end if;

  if p_platform_fee_rate < 0 or p_tax_rate < 0 then
    raise exception 'fee/tax rates cannot be negative';
  end if;

  v_idempotency_key := coalesce(
    p_idempotency_key,
    'campaign_usage_invoice:' ||
    p_campaign_id::text || ':' ||
    p_billing_period_start::text || ':' ||
    p_billing_period_end::text
  );

  if exists (
    select 1
    from campaign_invoices
    where idempotency_key = v_idempotency_key
  ) then
    select id
    into v_invoice_id
    from campaign_invoices
    where idempotency_key = v_idempotency_key;

    return v_invoice_id;
  end if;

  select coalesce(sum(reward_amount_minor), 0)::bigint
  into v_reward_amount_minor
  from reward_issuance_groups
  where campaign_id = p_campaign_id
    and status = 'completed'
    and completed_at >= p_billing_period_start
    and completed_at < p_billing_period_end;

  v_platform_fee_minor := round(v_reward_amount_minor * p_platform_fee_rate)::bigint;
  v_tax_amount_minor := round((v_reward_amount_minor + v_platform_fee_minor) * p_tax_rate)::bigint;
  v_total_amount_minor := v_reward_amount_minor + v_platform_fee_minor + v_tax_amount_minor;

  v_invoice_number := generate_campaign_invoice_number();

  insert into campaign_invoices (
    invoice_number,
    advertiser_id,
    campaign_id,
    invoice_type,
    status,
    currency_code,
    gross_amount_minor,
    reward_amount_minor,
    platform_fee_minor,
    adjustment_amount_minor,
    tax_amount_minor,
    total_amount_minor,
    outstanding_amount_minor,
    billing_period_start,
    billing_period_end,
    issued_at,
    due_at,
    idempotency_key,
    metadata
  )
  values (
    v_invoice_number,
    p_advertiser_id,
    p_campaign_id,
    'campaign_usage',
    'issued',
    'USD',
    v_reward_amount_minor + v_platform_fee_minor,
    v_reward_amount_minor,
    v_platform_fee_minor,
    0,
    v_tax_amount_minor,
    v_total_amount_minor,
    v_total_amount_minor,
    p_billing_period_start,
    p_billing_period_end,
    now(),
    now() + interval '30 days',
    v_idempotency_key,
    p_metadata
  )
  returning id into v_invoice_id;

  insert into campaign_invoice_lines (
    campaign_invoice_id,
    campaign_id,
    advertiser_id,
    line_type,
    description,
    currency_code,
    quantity,
    unit_amount_minor,
    amount_minor,
    metadata
  )
  values (
    v_invoice_id,
    p_campaign_id,
    p_advertiser_id,
    'verified_attention_reward',
    'Verified attention rewards',
    'USD',
    1,
    v_reward_amount_minor,
    v_reward_amount_minor,
    jsonb_build_object(
      'billing_period_start', p_billing_period_start,
      'billing_period_end', p_billing_period_end
    )
  );

  if v_platform_fee_minor > 0 then
    insert into campaign_invoice_lines (
      campaign_invoice_id,
      campaign_id,
      advertiser_id,
      line_type,
      description,
      currency_code,
      quantity,
      unit_amount_minor,
      amount_minor,
      metadata
    )
    values (
      v_invoice_id,
      p_campaign_id,
      p_advertiser_id,
      'platform_fee',
      'Platform fee',
      'USD',
      1,
      v_platform_fee_minor,
      v_platform_fee_minor,
      jsonb_build_object('platform_fee_rate', p_platform_fee_rate)
    );
  end if;

  if v_tax_amount_minor > 0 then
    insert into campaign_invoice_lines (
      campaign_invoice_id,
      campaign_id,
      advertiser_id,
      line_type,
      description,
      currency_code,
      quantity,
      unit_amount_minor,
      amount_minor,
      metadata
    )
    values (
      v_invoice_id,
      p_campaign_id,
      p_advertiser_id,
      'tax',
      'Tax',
      'USD',
      1,
      v_tax_amount_minor,
      v_tax_amount_minor,
      jsonb_build_object('tax_rate', p_tax_rate)
    );
  end if;

  return v_invoice_id;
end;
$$;

create or replace function mirror_accounting_campaign_invoice_issued(
  p_campaign_invoice_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_invoice campaign_invoices%rowtype;
  v_journal_id uuid;
begin
  select *
  into v_invoice
  from campaign_invoices
  where id = p_campaign_invoice_id;

  if v_invoice.id is null then
    raise exception 'campaign invoice not found: %', p_campaign_invoice_id;
  end if;

  if v_invoice.status not in ('issued', 'partially_paid', 'paid') then
    raise exception 'invoice not issued. status %', v_invoice.status;
  end if;

  if v_invoice.total_amount_minor <= 0 then
    raise exception 'invoice amount must be positive';
  end if;

  v_journal_id := create_accounting_journal_entry(
    'campaign_invoice_issued',
    'campaign_invoice',
    v_invoice.id,
    null,
    null,
    v_invoice.campaign_id,
    v_invoice.currency_code,
    'mirror_accounting_campaign_invoice_issued',
    'campaign_invoice:' || v_invoice.id::text,
    p_metadata
  );

  perform add_accounting_journal_line(
    v_journal_id,
    'accounts_receivable_usd',
    'debit',
    v_invoice.total_amount_minor,
    v_invoice.currency_code,
    null,
    null,
    null,
    p_metadata
  );

  perform add_accounting_journal_line(
    v_journal_id,
    'campaign_revenue_usd',
    'credit',
    v_invoice.total_amount_minor,
    v_invoice.currency_code,
    null,
    null,
    null,
    p_metadata
  );

  perform post_accounting_journal_entry(v_journal_id);

  perform hash_accounting_journal_entry(
    v_journal_id,
    p_metadata || jsonb_build_object(
      'trigger',
      'campaign_invoice_issued'
    )
  );

  return v_journal_id;
end;
$$;

create or replace function record_campaign_invoice_payment(
  p_campaign_invoice_id uuid,
  p_amount_minor bigint,
  p_provider_key text default null,
  p_provider_payment_id text default null,
  p_processor_reference text default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_invoice campaign_invoices%rowtype;
  v_payment_id uuid;
  v_idempotency_key text;
  v_new_paid bigint;
  v_new_outstanding bigint;
begin
  if p_campaign_invoice_id is null then
    raise exception 'campaign invoice id is required';
  end if;

  if p_amount_minor <= 0 then
    raise exception 'payment amount must be positive';
  end if;

  select *
  into v_invoice
  from campaign_invoices
  where id = p_campaign_invoice_id
  for update;

  if v_invoice.id is null then
    raise exception 'campaign invoice not found: %', p_campaign_invoice_id;
  end if;

  if v_invoice.status in ('voided', 'refunded') then
    raise exception 'cannot pay invoice with status %', v_invoice.status;
  end if;

  v_idempotency_key := coalesce(
    p_idempotency_key,
    'campaign_invoice_payment:' || p_campaign_invoice_id::text || ':' || p_amount_minor::text
  );

  insert into campaign_invoice_payments (
    campaign_invoice_id,
    advertiser_id,
    provider_key,
    provider_payment_id,
    processor_reference,
    currency_code,
    amount_minor,
    status,
    idempotency_key,
    metadata
  )
  values (
    v_invoice.id,
    v_invoice.advertiser_id,
    p_provider_key,
    p_provider_payment_id,
    p_processor_reference,
    v_invoice.currency_code,
    p_amount_minor,
    'received',
    v_idempotency_key,
    p_metadata
  )
  on conflict (idempotency_key)
  do update set
    metadata = campaign_invoice_payments.metadata || excluded.metadata
  returning id into v_payment_id;

  select coalesce(sum(amount_minor), 0)::bigint
  into v_new_paid
  from campaign_invoice_payments
  where campaign_invoice_id = v_invoice.id
    and status = 'received';

  v_new_outstanding := greatest(v_invoice.total_amount_minor - v_new_paid, 0);

  update campaign_invoices
  set
    paid_amount_minor = v_new_paid,
    outstanding_amount_minor = v_new_outstanding,
    status =
      case
        when v_new_outstanding = 0 then 'paid'
        when v_new_paid > 0 then 'partially_paid'
        else status
      end,
    paid_at =
      case
        when v_new_outstanding = 0 then now()
        else paid_at
      end,
    updated_at = now()
  where id = v_invoice.id;

  return v_payment_id;
end;
$$;

create or replace function mirror_accounting_campaign_invoice_payment(
  p_campaign_invoice_payment_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_payment campaign_invoice_payments%rowtype;
  v_invoice campaign_invoices%rowtype;
  v_journal_id uuid;
begin
  select *
  into v_payment
  from campaign_invoice_payments
  where id = p_campaign_invoice_payment_id;

  if v_payment.id is null then
    raise exception 'campaign invoice payment not found: %',
      p_campaign_invoice_payment_id;
  end if;

  if v_payment.status <> 'received' then
    raise exception 'invoice payment not received. status %', v_payment.status;
  end if;

  select *
  into v_invoice
  from campaign_invoices
  where id = v_payment.campaign_invoice_id;

  v_journal_id := create_accounting_journal_entry(
    'campaign_invoice_payment_received',
    'campaign_invoice_payment',
    v_payment.id,
    null,
    null,
    v_invoice.campaign_id,
    v_payment.currency_code,
    'mirror_accounting_campaign_invoice_payment',
    'campaign_invoice_payment:' || v_payment.id::text,
    p_metadata
  );

  perform add_accounting_journal_line(
    v_journal_id,
    'cash_platform_usd',
    'debit',
    v_payment.amount_minor,
    v_payment.currency_code,
    null,
    null,
    null,
    p_metadata
  );

  perform add_accounting_journal_line(
    v_journal_id,
    'accounts_receivable_usd',
    'credit',
    v_payment.amount_minor,
    v_payment.currency_code,
    null,
    null,
    null,
    p_metadata
  );

  perform post_accounting_journal_entry(v_journal_id);

  perform hash_accounting_journal_entry(
    v_journal_id,
    p_metadata || jsonb_build_object(
      'trigger',
      'campaign_invoice_payment'
    )
  );

  return v_journal_id;
end;
$$;

create or replace view campaign_invoice_reconciliation_diffs as
select
  ci.id as campaign_invoice_id,
  ci.invoice_number,
  ci.advertiser_id,
  ci.campaign_id,
  ci.status,
  ci.currency_code,

  ci.reward_amount_minor,
  ci.platform_fee_minor,
  ci.adjustment_amount_minor,
  ci.tax_amount_minor,
  ci.total_amount_minor,
  ci.paid_amount_minor,
  ci.refunded_amount_minor,
  ci.outstanding_amount_minor,

  coalesce(sum(cil.amount_minor), 0)::bigint as line_total_minor,

  (
    coalesce(sum(cil.amount_minor), 0)
    - ci.total_amount_minor
  )::bigint as line_delta_minor,

  (
    ci.total_amount_minor
    - ci.paid_amount_minor
    + ci.refunded_amount_minor
  )::bigint as computed_outstanding_minor,

  (
    ci.outstanding_amount_minor
    - (
      ci.total_amount_minor
      - ci.paid_amount_minor
      + ci.refunded_amount_minor
    )
  )::bigint as outstanding_delta_minor,

  case
    when coalesce(sum(cil.amount_minor), 0) <> ci.total_amount_minor
    then 'invoice_line_total_mismatch'

    when ci.outstanding_amount_minor <>
      (
        ci.total_amount_minor
        - ci.paid_amount_minor
        + ci.refunded_amount_minor
      )
    then 'invoice_outstanding_mismatch'

    when ci.status = 'paid' and ci.outstanding_amount_minor <> 0
    then 'paid_invoice_has_outstanding_balance'

    when ci.status in ('issued', 'partially_paid') and ci.due_at < now()
    then 'invoice_overdue'

    else null
  end as issue_type,

  ci.created_at,
  ci.issued_at,
  ci.due_at

from campaign_invoices ci
left join campaign_invoice_lines cil
  on cil.campaign_invoice_id = ci.id
group by ci.id;

create or replace view campaign_invoice_missing_accounting_mirrors as
select
  'campaign_invoice' as source_type,
  ci.id as source_id,
  ci.campaign_id,
  ci.advertiser_id,
  ci.total_amount_minor as amount_minor,
  ci.issued_at as source_created_at
from campaign_invoices ci
left join accounting_journal_entries aje
  on aje.source_type = 'campaign_invoice'
 and aje.source_id = ci.id
 and aje.status = 'posted'
where ci.status in ('issued', 'partially_paid', 'paid')
  and aje.id is null

union all

select
  'campaign_invoice_payment' as source_type,
  cip.id as source_id,
  ci.campaign_id,
  cip.advertiser_id,
  cip.amount_minor,
  cip.received_at
from campaign_invoice_payments cip
join campaign_invoices ci
  on ci.id = cip.campaign_invoice_id
left join accounting_journal_entries aje
  on aje.source_type = 'campaign_invoice_payment'
 and aje.source_id = cip.id
 and aje.status = 'posted'
where cip.status = 'received'
  and aje.id is null;

create or replace function run_campaign_invoice_reconciliation_job(
  p_campaign_id uuid default null,
  p_advertiser_id uuid default null,
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
  v_issues integer := 0;
begin
  if p_batch_size <= 0 then
    raise exception 'batch size must be positive';
  end if;

  insert into campaign_invoice_reconciliation_runs (
    run_type,
    campaign_id,
    advertiser_id,
    status,
    metadata
  )
  values (
    'scheduled',
    p_campaign_id,
    p_advertiser_id,
    'processing',
    p_metadata
  )
  returning id into v_run_id;

  for v_row in
    select *
    from campaign_invoice_reconciliation_diffs
    where issue_type is not null
      and (p_campaign_id is null or campaign_id = p_campaign_id)
      and (p_advertiser_id is null or advertiser_id = p_advertiser_id)
    order by created_at asc
    limit p_batch_size
  loop
    v_scanned := v_scanned + 1;

    insert into campaign_invoice_reconciliation_issues (
      campaign_invoice_reconciliation_run_id,
      campaign_invoice_id,
      advertiser_id,
      campaign_id,
      issue_type,
      severity,
      expected_amount_minor,
      actual_amount_minor,
      delta_amount_minor,
      metadata
    )
    values (
      v_run_id,
      v_row.campaign_invoice_id,
      v_row.advertiser_id,
      v_row.campaign_id,
      v_row.issue_type,
      case
        when v_row.issue_type in (
          'invoice_line_total_mismatch',
          'paid_invoice_has_outstanding_balance'
        )
        then 'critical'
        else 'warning'
      end,
      case
        when v_row.issue_type = 'invoice_line_total_mismatch'
        then v_row.total_amount_minor
        when v_row.issue_type = 'invoice_outstanding_mismatch'
        then v_row.computed_outstanding_minor
        else null
      end,
      case
        when v_row.issue_type = 'invoice_line_total_mismatch'
        then v_row.line_total_minor
        when v_row.issue_type = 'invoice_outstanding_mismatch'
        then v_row.outstanding_amount_minor
        else null
      end,
      case
        when v_row.issue_type = 'invoice_line_total_mismatch'
        then v_row.line_delta_minor
        when v_row.issue_type = 'invoice_outstanding_mismatch'
        then v_row.outstanding_delta_minor
        else null
      end,
      p_metadata
    );

    v_issues := v_issues + 1;
  end loop;

  update campaign_invoice_reconciliation_runs
  set
    status = 'completed',
    completed_at = now(),
    scanned_invoice_count = v_scanned,
    issue_count = v_issues
  where id = v_run_id;

  return v_run_id;

exception
  when others then
    if v_run_id is not null then
      update campaign_invoice_reconciliation_runs
      set
        status = 'failed',
        failed_at = now(),
        failure_reason = sqlerrm
      where id = v_run_id;
    end if;

    raise;
end;
$$;

create or replace function run_campaign_invoice_accounting_mirror_job(
  p_batch_size integer default 500,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
as $$
declare
  v_row record;
  v_mirrored integer := 0;
begin
  if p_batch_size <= 0 then
    raise exception 'batch size must be positive';
  end if;

  for v_row in
    select *
    from campaign_invoice_missing_accounting_mirrors
    order by source_created_at asc
    limit p_batch_size
  loop
    begin
      if v_row.source_type = 'campaign_invoice' then
        perform mirror_accounting_campaign_invoice_issued(
          v_row.source_id,
          p_metadata
        );

      elsif v_row.source_type = 'campaign_invoice_payment' then
        perform mirror_accounting_campaign_invoice_payment(
          v_row.source_id,
          p_metadata
        );
      end if;

      v_mirrored := v_mirrored + 1;

    exception
      when others then
        null;
    end;
  end loop;

  return v_mirrored;
end;
$$;

create or replace function resolve_campaign_invoice_reconciliation_issue(
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

  update campaign_invoice_reconciliation_issues
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
    raise exception 'campaign invoice reconciliation issue not found: %', p_issue_id;
  end if;

  return p_issue_id;
end;
$$;

create or replace view campaign_invoice_details as
select
  ci.id as campaign_invoice_id,
  ci.invoice_number,
  ci.advertiser_id,
  a.advertiser_name,
  ci.campaign_id,
  ci.invoice_type,
  ci.status,
  ci.currency_code,

  ci.gross_amount_minor,
  ci.reward_amount_minor,
  ci.platform_fee_minor,
  ci.adjustment_amount_minor,
  ci.tax_amount_minor,
  ci.total_amount_minor,
  ci.paid_amount_minor,
  ci.refunded_amount_minor,
  ci.outstanding_amount_minor,

  ci.billing_period_start,
  ci.billing_period_end,
  ci.issued_at,
  ci.due_at,
  ci.paid_at,
  ci.voided_at,

  count(distinct cil.id) as invoice_line_count,
  count(distinct cip.id) as payment_count,

  jsonb_agg(
    distinct jsonb_build_object(
      'line_id', cil.id,
      'line_type', cil.line_type,
      'description', cil.description,
      'quantity', cil.quantity,
      'unit_amount_minor', cil.unit_amount_minor,
      'amount_minor', cil.amount_minor,
      'metadata', cil.metadata
    )
  ) filter (where cil.id is not null) as lines,

  jsonb_agg(
    distinct jsonb_build_object(
      'payment_id', cip.id,
      'provider_key', cip.provider_key,
      'provider_payment_id', cip.provider_payment_id,
      'processor_reference', cip.processor_reference,
      'amount_minor', cip.amount_minor,
      'status', cip.status,
      'received_at', cip.received_at
    )
  ) filter (where cip.id is not null) as payments

from campaign_invoices ci
left join advertisers a
  on a.id = ci.advertiser_id
left join campaign_invoice_lines cil
  on cil.campaign_invoice_id = ci.id
left join campaign_invoice_payments cip
  on cip.campaign_invoice_id = ci.id
group by ci.id, a.id;

create or replace view campaign_financial_summary as
select
  cb.campaign_id,
  cb.advertiser_id,

  cb.currency_code,
  cb.funded_amount_minor,
  cb.reserved_amount_minor,
  cb.issued_amount_minor,
  cb.released_amount_minor,
  cb.expired_amount_minor,
  cb.refunded_amount_minor,

  coalesce(sum(ci.total_amount_minor), 0)::bigint as invoiced_amount_minor,
  coalesce(sum(ci.paid_amount_minor), 0)::bigint as invoice_paid_amount_minor,
  coalesce(sum(ci.outstanding_amount_minor), 0)::bigint as invoice_outstanding_amount_minor,

  (
    cb.issued_amount_minor
    - coalesce(sum(ci.reward_amount_minor), 0)
  )::bigint as issued_vs_invoiced_reward_delta_minor,

  case
    when cb.issued_amount_minor <> coalesce(sum(ci.reward_amount_minor), 0)
    then true
    else false
  end as has_reward_invoice_delta

from campaign_budgets cb
left join campaign_invoices ci
  on ci.campaign_id = cb.campaign_id
 and ci.status <> 'voided'
group by cb.campaign_id, cb.advertiser_id, cb.currency_code,
  cb.funded_amount_minor,
  cb.reserved_amount_minor,
  cb.issued_amount_minor,
  cb.released_amount_minor,
  cb.expired_amount_minor,
  cb.refunded_amount_minor;
