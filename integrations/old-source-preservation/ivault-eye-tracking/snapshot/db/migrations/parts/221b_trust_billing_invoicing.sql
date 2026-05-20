-- Part 221b: rollups, periods, invoices, line items, billing events

create table if not exists admin_security_trust_usage_rollups (
  id uuid primary key default gen_random_uuid(),

  usage_rollup_key text not null unique,

  status text not null default 'active',

  customer_name text not null,
  customer_domain text,

  billing_account_id uuid references admin_security_trust_billing_accounts(id) on delete cascade,
  entitlement_id uuid references admin_security_customer_trust_entitlements(id) on delete set null,

  billing_period_start timestamptz not null,
  billing_period_end timestamptz not null,

  meter_name text not null,
  meter_category text not null,

  total_quantity numeric(18,4) not null default 0,
  included_quantity numeric(18,4) not null default 0,
  overage_quantity numeric(18,4) not null default 0,

  total_amount_cents integer not null default 0,
  included_amount_cents integer not null default 0,
  overage_amount_cents integer not null default 0,
  currency text not null default 'USD',

  limit_quantity numeric(18,4),
  usage_percent numeric(8,2),

  last_event_at timestamptz,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (billing_account_id, billing_period_start, billing_period_end, meter_name),

  constraint admin_security_trust_usage_rollups_status_check
  check (
    status in (
      'active',
      'finalized',
      'voided',
      'archived'
    )
  )
);

create index if not exists admin_security_trust_usage_rollups_customer_idx
on admin_security_trust_usage_rollups (customer_name, customer_domain, billing_period_start desc);

create index if not exists admin_security_trust_usage_rollups_period_idx
on admin_security_trust_usage_rollups (billing_period_start, billing_period_end, meter_name);
drop trigger if exists admin_security_trust_usage_rollups_set_updated_at
on admin_security_trust_usage_rollups;

create trigger admin_security_trust_usage_rollups_set_updated_at
before update on admin_security_trust_usage_rollups
for each row
execute function set_updated_at();

create table if not exists admin_security_trust_billing_periods (
  id uuid primary key default gen_random_uuid(),

  billing_period_key text not null unique,

  status text not null default 'open',

  billing_account_id uuid not null references admin_security_trust_billing_accounts(id) on delete cascade,

  customer_name text not null,
  customer_domain text,

  period_start timestamptz not null,
  period_end timestamptz not null,

  currency text not null default 'USD',

  base_amount_cents integer not null default 0,
  usage_amount_cents integer not null default 0,
  overage_amount_cents integer not null default 0,
  adjustment_amount_cents integer not null default 0,
  tax_amount_cents integer not null default 0,
  total_amount_cents integer not null default 0,

  finalized_at timestamptz,
  invoiced_at timestamptz,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (billing_account_id, period_start, period_end),

  constraint admin_security_trust_billing_periods_status_check
  check (
    status in (
      'open',
      'finalizing',
      'finalized',
      'invoiced',
      'voided',
      'archived'
    )
  ),

  constraint admin_security_trust_billing_periods_range_check
  check (period_end > period_start)
);

create index if not exists admin_security_trust_billing_periods_account_idx
on admin_security_trust_billing_periods (billing_account_id, period_start desc);

create index if not exists admin_security_trust_billing_periods_status_idx
on admin_security_trust_billing_periods (status, period_end);
drop trigger if exists admin_security_trust_billing_periods_set_updated_at
on admin_security_trust_billing_periods;

create trigger admin_security_trust_billing_periods_set_updated_at
before update on admin_security_trust_billing_periods
for each row
execute function set_updated_at();

create table if not exists admin_security_trust_invoices (
  id uuid primary key default gen_random_uuid(),

  invoice_key text not null unique,

  status text not null default 'draft',

  billing_account_id uuid not null references admin_security_trust_billing_accounts(id) on delete cascade,
  billing_period_id uuid references admin_security_trust_billing_periods(id) on delete set null,

  customer_name text not null,
  customer_domain text,

  invoice_number text not null unique,

  currency text not null default 'USD',

  subtotal_amount_cents integer not null default 0,
  discount_amount_cents integer not null default 0,
  tax_amount_cents integer not null default 0,
  total_amount_cents integer not null default 0,
  amount_due_cents integer not null default 0,
  amount_paid_cents integer not null default 0,

  issued_at timestamptz,
  due_at timestamptz,
  paid_at timestamptz,
  voided_at timestamptz,

  external_invoice_id text,
  invoice_pdf_uri text,
  hosted_invoice_url text,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_trust_invoices_status_check
  check (
    status in (
      'draft',
      'issued',
      'paid',
      'past_due',
      'voided',
      'uncollectible',
      'archived'
    )
  )
);

create index if not exists admin_security_trust_invoices_account_idx
on admin_security_trust_invoices (billing_account_id, created_at desc);

create index if not exists admin_security_trust_invoices_status_idx
on admin_security_trust_invoices (status, due_at);
drop trigger if exists admin_security_trust_invoices_set_updated_at
on admin_security_trust_invoices;

create trigger admin_security_trust_invoices_set_updated_at
before update on admin_security_trust_invoices
for each row
execute function set_updated_at();

create table if not exists admin_security_trust_invoice_line_items (
  id uuid primary key default gen_random_uuid(),

  invoice_line_item_key text not null unique,

  invoice_id uuid not null references admin_security_trust_invoices(id) on delete cascade,

  billing_account_id uuid not null references admin_security_trust_billing_accounts(id) on delete cascade,
  usage_rollup_id uuid references admin_security_trust_usage_rollups(id) on delete set null,

  line_type text not null,
  description text not null,

  meter_name text,
  quantity numeric(18,4) not null default 1,
  unit text not null default 'count',

  unit_amount_cents integer not null default 0,
  amount_cents integer not null default 0,
  currency text not null default 'USD',

  line_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint admin_security_trust_invoice_line_items_line_type_check
  check (
    line_type in (
      'base_subscription',
      'usage_included',
      'usage_overage',
      'discount',
      'tax',
      'adjustment',
      'credit',
      'other'
    )
  )
);

create index if not exists admin_security_trust_invoice_line_items_invoice_idx
on admin_security_trust_invoice_line_items (invoice_id);

create index if not exists admin_security_trust_invoice_line_items_account_idx
on admin_security_trust_invoice_line_items (billing_account_id, created_at desc);

create table if not exists admin_security_trust_billing_events (
  id uuid primary key default gen_random_uuid(),

  billing_event_key text not null unique,

  event_type text not null,
  event_action text not null,

  status text not null default 'recorded',

  billing_account_id uuid references admin_security_trust_billing_accounts(id) on delete set null,
  entitlement_id uuid references admin_security_customer_trust_entitlements(id) on delete set null,
  usage_event_id uuid references admin_security_trust_usage_meter_events(id) on delete set null,
  usage_rollup_id uuid references admin_security_trust_usage_rollups(id) on delete set null,
  invoice_id uuid references admin_security_trust_invoices(id) on delete set null,

  customer_name text,
  customer_domain text,

  actor_type text not null default 'system',
  actor_auth_user_id uuid,
  actor_admin_user_id uuid references admin_users(id) on delete set null,
  actor_email text,

  title text,
  summary text,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint admin_security_trust_billing_events_type_check
  check (
    event_type in (
      'billing_account_created',
      'billing_account_updated',
      'entitlement_created',
      'entitlement_updated',
      'usage_metered',
      'usage_rollup_updated',
      'limit_warning',
      'limit_exceeded',
      'feature_blocked',
      'billing_period_opened',
      'billing_period_finalized',
      'invoice_created',
      'invoice_issued',
      'invoice_paid',
      'invoice_past_due',
      'account_suspended',
      'account_reactivated',
      'other'
    )
  ),

  constraint admin_security_trust_billing_events_status_check
  check (
    status in (
      'recorded',
      'failed',
      'archived'
    )
  )
);

create index if not exists admin_security_trust_billing_events_account_idx
on admin_security_trust_billing_events (billing_account_id, created_at desc);

create index if not exists admin_security_trust_billing_events_type_idx
on admin_security_trust_billing_events (event_type, created_at desc);
