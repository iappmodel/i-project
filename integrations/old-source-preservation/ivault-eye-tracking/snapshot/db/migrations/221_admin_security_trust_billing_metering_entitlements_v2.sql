-- Part 221a: core billing tables (plans → billing_events)

create table if not exists admin_security_trust_billing_plans (
  id uuid primary key default gen_random_uuid(),

  billing_plan_key text not null unique,

  status text not null default 'active',

  plan_code text not null unique,
  plan_name text not null,
  plan_description text,

  plan_tier text not null default 'enterprise',

  monthly_base_amount_cents integer not null default 0,
  annual_base_amount_cents integer not null default 0,
  currency text not null default 'USD',

  included_private_rooms integer not null default 1,
  included_proof_reports integer not null default 25,
  included_answer_receipts integer not null default 1000,
  included_public_verifications integer not null default 5000,
  included_qr_links integer not null default 500,
  included_audit_packages integer not null default 5,
  included_transparency_portals integer not null default 1,
  included_legal_holds integer not null default 3,
  included_admin_seats integer not null default 5,
  included_storage_gb integer not null default 25,

  overage_report_cents integer not null default 500,
  overage_receipt_cents integer not null default 1,
  overage_verification_cents integer not null default 1,
  overage_qr_link_cents integer not null default 10,
  overage_audit_package_cents integer not null default 2500,
  overage_storage_gb_cents integer not null default 100,

  feature_payload jsonb not null default '{}'::jsonb,

  allow_governance boolean not null default true,
  allow_legal_hold boolean not null default true,
  allow_audit_packages boolean not null default true,
  allow_transparency_portal boolean not null default true,
  allow_public_verification boolean not null default true,
  allow_custom_retention boolean not null default false,
  allow_custom_branding boolean not null default false,
  allow_regulator_exports boolean not null default false,
  allow_api_access boolean not null default true,
  allow_webhooks boolean not null default false,
  allow_dedicated_support boolean not null default false,

  effective_at timestamptz not null default now(),
  expires_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_trust_billing_plans_status_check
  check (
    status in (
      'draft',
      'active',
      'paused',
      'deprecated',
      'archived'
    )
  ),

  constraint admin_security_trust_billing_plans_tier_check
  check (
    plan_tier in (
      'starter',
      'growth',
      'enterprise',
      'regulated',
      'custom',
      'internal'
    )
  ),

  constraint admin_security_trust_billing_plans_currency_check
  check (currency in ('USD', 'EUR', 'GBP', 'BRL')),

  constraint admin_security_trust_billing_plans_code_check
  check (plan_code ~ '^[a-z0-9][a-z0-9_-]{2,80}$'),

  constraint admin_security_trust_billing_plans_name_check
  check (length(trim(plan_name)) > 0)
);

create index if not exists admin_security_trust_billing_plans_status_idx
on admin_security_trust_billing_plans (status, plan_tier, created_at desc);
drop trigger if exists admin_security_trust_billing_plans_set_updated_at
on admin_security_trust_billing_plans;

create trigger admin_security_trust_billing_plans_set_updated_at
before update on admin_security_trust_billing_plans
for each row
execute function set_updated_at();

insert into admin_security_trust_billing_plans (
  billing_plan_key,
  status,
  plan_code,
  plan_name,
  plan_description,
  plan_tier,
  monthly_base_amount_cents,
  annual_base_amount_cents,
  included_private_rooms,
  included_proof_reports,
  included_answer_receipts,
  included_public_verifications,
  included_qr_links,
  included_audit_packages,
  included_transparency_portals,
  included_legal_holds,
  included_admin_seats,
  included_storage_gb,
  allow_governance,
  allow_legal_hold,
  allow_audit_packages,
  allow_transparency_portal,
  allow_public_verification,
  allow_custom_retention,
  allow_custom_branding,
  allow_regulator_exports,
  allow_api_access,
  allow_webhooks,
  allow_dedicated_support,
  metadata
)
values
  (
    'trust_billing_plan:starter',
    'active',
    'trust_starter',
    'Trust Starter',
    'Entry trust infrastructure for smaller customers.',
    'starter',
    50000,
    500000,
    1,
    25,
    1000,
    5000,
    250,
    2,
    1,
    1,
    3,
    25,
    true,
    false,
    true,
    true,
    true,
    false,
    false,
    false,
    true,
    false,
    false,
    '{"seed": true}'::jsonb
  ),
  (
    'trust_billing_plan:enterprise',
    'active',
    'trust_enterprise',
    'Trust Enterprise',
    'Full enterprise proof, governance, transparency, and audit packaging.',
    'enterprise',
    250000,
    2500000,
    10,
    250,
    25000,
    100000,
    5000,
    25,
    5,
    10,
    25,
    250,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    false,
    true,
    true,
    true,
    '{"seed": true}'::jsonb
  ),
  (
    'trust_billing_plan:regulated',
    'active',
    'trust_regulated',
    'Trust Regulated',
    'Regulated enterprise plan with legal hold, regulator bundles, custom retention, and premium support.',
    'regulated',
    750000,
    7500000,
    50,
    1000,
    250000,
    1000000,
    50000,
    100,
    25,
    100,
    100,
    2000,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    '{"seed": true}'::jsonb
  )
on conflict (billing_plan_key)
do update set
  status = excluded.status,
  monthly_base_amount_cents = excluded.monthly_base_amount_cents,
  annual_base_amount_cents = excluded.annual_base_amount_cents,
  feature_payload = admin_security_trust_billing_plans.feature_payload || excluded.feature_payload,
  metadata = admin_security_trust_billing_plans.metadata || excluded.metadata,
  updated_at = now();

create table if not exists admin_security_trust_billing_accounts (
  id uuid primary key default gen_random_uuid(),

  billing_account_key text not null unique,

  status text not null default 'active',

  customer_name text not null,
  customer_domain text,

  billing_plan_id uuid references admin_security_trust_billing_plans(id) on delete set null,
  billing_plan_key text,
  plan_code text,

  billing_email text,
  billing_contact_name text,

  billing_cycle text not null default 'monthly',

  currency text not null default 'USD',

  payment_status text not null default 'current',
  collection_status text not null default 'good_standing',

  external_customer_id text,
  external_subscription_id text,
  external_payment_provider text,

  trial_starts_at timestamptz,
  trial_ends_at timestamptz,

  current_period_starts_at timestamptz not null default date_trunc('month', now()),
  current_period_ends_at timestamptz not null default (date_trunc('month', now()) + interval '1 month'),

  suspended_at timestamptz,
  cancelled_at timestamptz,

  created_by_auth_user_id uuid,
  created_by_admin_user_id uuid references admin_users(id) on delete set null,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_trust_billing_accounts_status_check
  check (
    status in (
      'active',
      'trialing',
      'past_due',
      'suspended',
      'cancelled',
      'archived'
    )
  ),

  constraint admin_security_trust_billing_accounts_cycle_check
  check (
    billing_cycle in (
      'monthly',
      'annual',
      'custom',
      'internal'
    )
  ),

  constraint admin_security_trust_billing_accounts_payment_status_check
  check (
    payment_status in (
      'current',
      'trialing',
      'past_due',
      'failed',
      'manual',
      'not_required'
    )
  ),

  constraint admin_security_trust_billing_accounts_collection_status_check
  check (
    collection_status in (
      'good_standing',
      'watch',
      'collections',
      'blocked',
      'manual_review'
    )
  ),

  constraint admin_security_trust_billing_accounts_customer_check
  check (length(trim(customer_name)) > 0)
);

create index if not exists admin_security_trust_billing_accounts_customer_idx
on admin_security_trust_billing_accounts (customer_name, customer_domain);

create index if not exists admin_security_trust_billing_accounts_status_idx
on admin_security_trust_billing_accounts (status, payment_status, collection_status);
drop trigger if exists admin_security_trust_billing_accounts_set_updated_at
on admin_security_trust_billing_accounts;

create trigger admin_security_trust_billing_accounts_set_updated_at
before update on admin_security_trust_billing_accounts
for each row
execute function set_updated_at();

create table if not exists admin_security_customer_trust_entitlements (
  id uuid primary key default gen_random_uuid(),

  entitlement_key text not null unique,

  status text not null default 'active',

  billing_account_id uuid references admin_security_trust_billing_accounts(id) on delete cascade,

  customer_name text not null,
  customer_domain text,

  billing_plan_id uuid references admin_security_trust_billing_plans(id) on delete set null,
  billing_plan_key text,
  plan_code text,

  entitlement_scope text not null default 'customer',

  private_room_limit integer not null default 1,
  proof_report_limit integer not null default 25,
  answer_receipt_limit integer not null default 1000,
  public_verification_limit integer not null default 5000,
  qr_link_limit integer not null default 250,
  audit_package_limit integer not null default 2,
  transparency_portal_limit integer not null default 1,
  legal_hold_limit integer not null default 1,
  admin_seat_limit integer not null default 3,
  storage_gb_limit integer not null default 25,

  allow_governance boolean not null default true,
  allow_legal_hold boolean not null default false,
  allow_audit_packages boolean not null default true,
  allow_transparency_portal boolean not null default true,
  allow_public_verification boolean not null default true,
  allow_custom_retention boolean not null default false,
  allow_custom_branding boolean not null default false,
  allow_regulator_exports boolean not null default false,
  allow_api_access boolean not null default true,
  allow_webhooks boolean not null default false,
  allow_dedicated_support boolean not null default false,

  hard_limit_enforcement boolean not null default false,
  overage_allowed boolean not null default true,

  effective_at timestamptz not null default now(),
  expires_at timestamptz,

  entitlement_payload jsonb not null default '{}'::jsonb,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_customer_trust_entitlements_status_check
  check (
    status in (
      'active',
      'paused',
      'expired',
      'suspended',
      'archived'
    )
  ),

  constraint admin_security_customer_trust_entitlements_scope_check
  check (
    entitlement_scope in (
      'customer',
      'private_room',
      'enterprise_review_room',
      'auditor_portal'
    )
  ),

  constraint admin_security_customer_trust_entitlements_customer_check
  check (length(trim(customer_name)) > 0)
);

create index if not exists admin_security_customer_trust_entitlements_customer_idx
on admin_security_customer_trust_entitlements (customer_name, customer_domain, status);

create index if not exists admin_security_customer_trust_entitlements_billing_idx
on admin_security_customer_trust_entitlements (billing_account_id, status);
drop trigger if exists admin_security_customer_trust_entitlements_set_updated_at
on admin_security_customer_trust_entitlements;

create trigger admin_security_customer_trust_entitlements_set_updated_at
before update on admin_security_customer_trust_entitlements
for each row
execute function set_updated_at();

create table if not exists admin_security_trust_usage_meter_events (
  id uuid primary key default gen_random_uuid(),

  usage_event_key text not null unique,

  status text not null default 'recorded',

  customer_name text not null,
  customer_domain text,

  billing_account_id uuid references admin_security_trust_billing_accounts(id) on delete set null,
  entitlement_id uuid references admin_security_customer_trust_entitlements(id) on delete set null,

  meter_name text not null,
  meter_category text not null,

  quantity numeric(18,4) not null default 1,
  unit text not null default 'count',

  billable boolean not null default true,
  included_in_plan boolean not null default true,
  overage boolean not null default false,

  unit_amount_cents integer not null default 0,
  amount_cents integer not null default 0,
  currency text not null default 'USD',

  source_type text not null,
  source_id uuid,
  source_key text,

  private_room_id uuid references admin_security_private_trust_rooms(id) on delete set null,
  proof_type text,
  proof_key text,

  occurred_at timestamptz not null default now(),

  billing_period_start timestamptz not null default date_trunc('month', now()),
  billing_period_end timestamptz not null default (date_trunc('month', now()) + interval '1 month'),

  dedupe_key text not null unique,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint admin_security_trust_usage_meter_events_status_check
  check (
    status in (
      'recorded',
      'voided',
      'adjusted',
      'archived'
    )
  ),

  constraint admin_security_trust_usage_meter_events_meter_name_check
  check (
    meter_name in (
      'private_room_created',
      'proof_report_generated',
      'answer_receipt_created',
      'public_verification_completed',
      'qr_link_created',
      'audit_package_built',
      'transparency_portal_published',
      'legal_hold_created',
      'admin_seat_used',
      'storage_gb_month',
      'api_call',
      'webhook_delivery',
      'other'
    )
  ),

  constraint admin_security_trust_usage_meter_events_category_check
  check (
    meter_category in (
      'rooms',
      'proofs',
      'receipts',
      'verifications',
      'qr_links',
      'audit_packages',
      'transparency',
      'legal_hold',
      'seats',
      'storage',
      'api',
      'webhooks',
      'other'
    )
  ),

  constraint admin_security_trust_usage_meter_events_quantity_check
  check (quantity >= 0)
);

create index if not exists admin_security_trust_usage_meter_events_customer_idx
on admin_security_trust_usage_meter_events (customer_name, customer_domain, occurred_at desc);

create index if not exists admin_security_trust_usage_meter_events_period_idx
on admin_security_trust_usage_meter_events (billing_account_id, billing_period_start, billing_period_end);

create index if not exists admin_security_trust_usage_meter_events_meter_idx
on admin_security_trust_usage_meter_events (meter_name, occurred_at desc);
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
-- Part 221c: trust billing / metering functions

create or replace function record_admin_security_trust_billing_event(
  p_event_type text,
  p_event_action text,
  p_billing_account_id uuid default null,
  p_entitlement_id uuid default null,
  p_usage_event_id uuid default null,
  p_usage_rollup_id uuid default null,
  p_invoice_id uuid default null,
  p_customer_name text default null,
  p_customer_domain text default null,
  p_actor_type text default 'system',
  p_actor_auth_user_id uuid default null,
  p_actor_admin_user_id uuid default null,
  p_actor_email text default null,
  p_title text default null,
  p_summary text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
  v_key text;
begin
  v_key :=
    'trust_billing_event:' ||
    p_event_type || ':' ||
    substr(encode(gen_random_bytes(12), 'hex'), 1, 24);

  insert into admin_security_trust_billing_events (
    billing_event_key,
    event_type,
    event_action,
    status,
    billing_account_id,
    entitlement_id,
    usage_event_id,
    usage_rollup_id,
    invoice_id,
    customer_name,
    customer_domain,
    actor_type,
    actor_auth_user_id,
    actor_admin_user_id,
    actor_email,
    title,
    summary,
    request_id,
    metadata
  )
  values (
    v_key,
    p_event_type,
    p_event_action,
    'recorded',
    p_billing_account_id,
    p_entitlement_id,
    p_usage_event_id,
    p_usage_rollup_id,
    p_invoice_id,
    p_customer_name,
    p_customer_domain,
    coalesce(p_actor_type, 'system'),
    p_actor_auth_user_id,
    p_actor_admin_user_id,
    p_actor_email,
    p_title,
    p_summary,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function upsert_admin_security_customer_trust_entitlements_from_account(
  p_billing_account_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_account admin_security_trust_billing_accounts%rowtype;
  v_plan admin_security_trust_billing_plans%rowtype;
  v_entitlement_id uuid;
  v_key text;
begin
  select *
  into v_account
  from admin_security_trust_billing_accounts
  where id = p_billing_account_id;

  if not found then
    raise exception 'trust billing account not found: %', p_billing_account_id;
  end if;

  select *
  into v_plan
  from admin_security_trust_billing_plans
  where id = v_account.billing_plan_id;

  if not found then
    raise exception 'trust billing plan not found for account: %', p_billing_account_id;
  end if;

  v_key := 'trust_entitlement:customer:' || v_account.billing_account_key;

  insert into admin_security_customer_trust_entitlements (
    entitlement_key,
    status,
    billing_account_id,
    customer_name,
    customer_domain,
    billing_plan_id,
    billing_plan_key,
    plan_code,
    entitlement_scope,
    private_room_limit,
    proof_report_limit,
    answer_receipt_limit,
    public_verification_limit,
    qr_link_limit,
    audit_package_limit,
    transparency_portal_limit,
    legal_hold_limit,
    admin_seat_limit,
    storage_gb_limit,
    allow_governance,
    allow_legal_hold,
    allow_audit_packages,
    allow_transparency_portal,
    allow_public_verification,
    allow_custom_retention,
    allow_custom_branding,
    allow_regulator_exports,
    allow_api_access,
    allow_webhooks,
    allow_dedicated_support,
    hard_limit_enforcement,
    overage_allowed,
    entitlement_payload,
    request_id,
    metadata
  )
  values (
    v_key,
    case when v_account.status in ('suspended', 'cancelled') then 'suspended' else 'active' end,
    v_account.id,
    v_account.customer_name,
    v_account.customer_domain,
    v_plan.id,
    v_plan.billing_plan_key,
    v_plan.plan_code,
    'customer',
    v_plan.included_private_rooms,
    v_plan.included_proof_reports,
    v_plan.included_answer_receipts,
    v_plan.included_public_verifications,
    v_plan.included_qr_links,
    v_plan.included_audit_packages,
    v_plan.included_transparency_portals,
    v_plan.included_legal_holds,
    v_plan.included_admin_seats,
    v_plan.included_storage_gb,
    v_plan.allow_governance,
    v_plan.allow_legal_hold,
    v_plan.allow_audit_packages,
    v_plan.allow_transparency_portal,
    v_plan.allow_public_verification,
    v_plan.allow_custom_retention,
    v_plan.allow_custom_branding,
    v_plan.allow_regulator_exports,
    v_plan.allow_api_access,
    v_plan.allow_webhooks,
    v_plan.allow_dedicated_support,
    false,
    true,
    v_plan.feature_payload,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (entitlement_key)
  do update set
    status = excluded.status,
    billing_plan_id = excluded.billing_plan_id,
    billing_plan_key = excluded.billing_plan_key,
    plan_code = excluded.plan_code,
    private_room_limit = excluded.private_room_limit,
    proof_report_limit = excluded.proof_report_limit,
    answer_receipt_limit = excluded.answer_receipt_limit,
    public_verification_limit = excluded.public_verification_limit,
    qr_link_limit = excluded.qr_link_limit,
    audit_package_limit = excluded.audit_package_limit,
    transparency_portal_limit = excluded.transparency_portal_limit,
    legal_hold_limit = excluded.legal_hold_limit,
    admin_seat_limit = excluded.admin_seat_limit,
    storage_gb_limit = excluded.storage_gb_limit,
    allow_governance = excluded.allow_governance,
    allow_legal_hold = excluded.allow_legal_hold,
    allow_audit_packages = excluded.allow_audit_packages,
    allow_transparency_portal = excluded.allow_transparency_portal,
    allow_public_verification = excluded.allow_public_verification,
    allow_custom_retention = excluded.allow_custom_retention,
    allow_custom_branding = excluded.allow_custom_branding,
    allow_regulator_exports = excluded.allow_regulator_exports,
    allow_api_access = excluded.allow_api_access,
    allow_webhooks = excluded.allow_webhooks,
    allow_dedicated_support = excluded.allow_dedicated_support,
    entitlement_payload = admin_security_customer_trust_entitlements.entitlement_payload || excluded.entitlement_payload,
    metadata = admin_security_customer_trust_entitlements.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_entitlement_id;

  perform record_admin_security_trust_billing_event(
    'entitlement_created',
    'upserted',
    v_account.id,
    v_entitlement_id,
    null,
    null,
    null,
    v_account.customer_name,
    v_account.customer_domain,
    'system',
    null,
    null,
    null,
    'Trust entitlements upserted',
    v_plan.plan_name,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_entitlement_id;
end;
$$;

create or replace function create_admin_security_trust_billing_account(
  p_admin_auth_user_id uuid,
  p_customer_name text,
  p_customer_domain text,
  p_plan_code text,
  p_billing_email text default null,
  p_billing_contact_name text default null,
  p_billing_cycle text default 'monthly',
  p_external_customer_id text default null,
  p_external_subscription_id text default null,
  p_external_payment_provider text default null,
  p_trial_ends_at timestamptz default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_plan admin_security_trust_billing_plans%rowtype;
  v_account_id uuid;
  v_key text;
  v_status text;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_customer_name is null or length(trim(p_customer_name)) = 0 then
    raise exception 'billing customer name is required';
  end if;

  select *
  into v_plan
  from admin_security_trust_billing_plans
  where plan_code = p_plan_code
    and status = 'active';

  if not found then
    raise exception 'trust billing plan not found: %', p_plan_code;
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  v_key :=
    'trust_billing_account:' ||
    lower(regexp_replace(trim(p_customer_name), '[^a-zA-Z0-9]+', '-', 'g')) ||
    ':' ||
    substr(encode(gen_random_bytes(8), 'hex'), 1, 16);

  v_status := case when p_trial_ends_at is not null and p_trial_ends_at > now() then 'trialing' else 'active' end;

  insert into admin_security_trust_billing_accounts (
    billing_account_key,
    status,
    customer_name,
    customer_domain,
    billing_plan_id,
    billing_plan_key,
    plan_code,
    billing_email,
    billing_contact_name,
    billing_cycle,
    currency,
    payment_status,
    collection_status,
    external_customer_id,
    external_subscription_id,
    external_payment_provider,
    trial_starts_at,
    trial_ends_at,
    created_by_auth_user_id,
    created_by_admin_user_id,
    request_id,
    metadata
  )
  values (
    v_key,
    v_status,
    p_customer_name,
    p_customer_domain,
    v_plan.id,
    v_plan.billing_plan_key,
    v_plan.plan_code,
    p_billing_email,
    p_billing_contact_name,
    coalesce(p_billing_cycle, 'monthly'),
    v_plan.currency,
    case when v_status = 'trialing' then 'trialing' else 'current' end,
    'good_standing',
    p_external_customer_id,
    p_external_subscription_id,
    p_external_payment_provider,
    case when v_status = 'trialing' then now() else null end,
    p_trial_ends_at,
    p_admin_auth_user_id,
    v_admin.id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_account_id;

  perform upsert_admin_security_customer_trust_entitlements_from_account(
    v_account_id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  perform record_admin_security_trust_billing_event(
    'billing_account_created',
    'created',
    v_account_id,
    null,
    null,
    null,
    null,
    p_customer_name,
    p_customer_domain,
    'admin',
    p_admin_auth_user_id,
    v_admin.id,
    v_admin.email,
    'Trust billing account created',
    v_plan.plan_name,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_account_id;
end;
$$;

create or replace function check_admin_security_trust_entitlement(
  p_customer_name text,
  p_customer_domain text default null,
  p_feature text default null,
  p_meter_name text default null,
  p_requested_quantity numeric default 1,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_ent admin_security_customer_trust_entitlements%rowtype;
  v_current_usage numeric := 0;
  v_limit numeric;
  v_allowed boolean := true;
  v_reason text := 'allowed';
  v_overage boolean := false;
  v_feature_allowed boolean := true;
begin
  select *
  into v_ent
  from admin_security_customer_trust_entitlements
  where customer_name = p_customer_name
    and coalesce(customer_domain, '') = coalesce(p_customer_domain, '')
    and status = 'active'
    and effective_at <= now()
    and (expires_at is null or expires_at > now())
  order by created_at desc
  limit 1;

  if not found then
    return jsonb_build_object(
      'allowed',
      false,
      'reason',
      'missing_entitlement',
      'featureAllowed',
      false,
      'overage',
      false
    );
  end if;

  v_feature_allowed :=
    case p_feature
      when 'governance' then v_ent.allow_governance
      when 'legal_hold' then v_ent.allow_legal_hold
      when 'audit_packages' then v_ent.allow_audit_packages
      when 'transparency_portal' then v_ent.allow_transparency_portal
      when 'public_verification' then v_ent.allow_public_verification
      when 'custom_retention' then v_ent.allow_custom_retention
      when 'custom_branding' then v_ent.allow_custom_branding
      when 'regulator_exports' then v_ent.allow_regulator_exports
      when 'api_access' then v_ent.allow_api_access
      when 'webhooks' then v_ent.allow_webhooks
      else true
    end;

  if v_feature_allowed is false then
    return jsonb_build_object(
      'allowed',
      false,
      'reason',
      'feature_not_entitled',
      'feature',
      p_feature,
      'featureAllowed',
      false,
      'overage',
      false,
      'entitlementId',
      v_ent.id
    );
  end if;

  v_limit :=
    case p_meter_name
      when 'private_room_created' then v_ent.private_room_limit
      when 'proof_report_generated' then v_ent.proof_report_limit
      when 'answer_receipt_created' then v_ent.answer_receipt_limit
      when 'public_verification_completed' then v_ent.public_verification_limit
      when 'qr_link_created' then v_ent.qr_link_limit
      when 'audit_package_built' then v_ent.audit_package_limit
      when 'transparency_portal_published' then v_ent.transparency_portal_limit
      when 'legal_hold_created' then v_ent.legal_hold_limit
      when 'admin_seat_used' then v_ent.admin_seat_limit
      when 'storage_gb_month' then v_ent.storage_gb_limit
      else null
    end;

  if p_meter_name is not null and v_limit is not null then
    select coalesce(sum(quantity), 0)
    into v_current_usage
    from admin_security_trust_usage_meter_events
    where entitlement_id = v_ent.id
      and meter_name = p_meter_name
      and status = 'recorded'
      and occurred_at >= date_trunc('month', now())
      and occurred_at < date_trunc('month', now()) + interval '1 month';

    if v_current_usage + coalesce(p_requested_quantity, 1) > v_limit then
      v_overage := true;

      if v_ent.hard_limit_enforcement is true or v_ent.overage_allowed is false then
        v_allowed := false;
        v_reason := 'limit_exceeded';
      else
        v_allowed := true;
        v_reason := 'overage_allowed';
      end if;
    end if;
  end if;

  if v_allowed is false then
    perform record_admin_security_trust_billing_event(
      'feature_blocked',
      'blocked',
      v_ent.billing_account_id,
      v_ent.id,
      null,
      null,
      null,
      v_ent.customer_name,
      v_ent.customer_domain,
      'system',
      null,
      null,
      null,
      'Trust entitlement blocked action',
      v_reason,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'feature',
        p_feature,
        'meterName',
        p_meter_name,
        'currentUsage',
        v_current_usage,
        'limit',
        v_limit
      )
    );
  elsif v_overage is true then
    perform record_admin_security_trust_billing_event(
      'limit_exceeded',
      'overage_allowed',
      v_ent.billing_account_id,
      v_ent.id,
      null,
      null,
      null,
      v_ent.customer_name,
      v_ent.customer_domain,
      'system',
      null,
      null,
      null,
      'Trust entitlement overage allowed',
      p_meter_name,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'currentUsage',
        v_current_usage,
        'limit',
        v_limit
      )
    );
  end if;

  return jsonb_build_object(
    'allowed',
    v_allowed,
    'reason',
    v_reason,
    'featureAllowed',
    v_feature_allowed,
    'overage',
    v_overage,
    'entitlementId',
    v_ent.id,
    'billingAccountId',
    v_ent.billing_account_id,
    'currentUsage',
    v_current_usage,
    'limit',
    v_limit,
    'requestedQuantity',
    coalesce(p_requested_quantity, 1)
  );
end;
$$;

create or replace function enforce_admin_security_trust_entitlement(
  p_customer_name text,
  p_customer_domain text,
  p_feature text,
  p_meter_name text,
  p_requested_quantity numeric default 1,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_check jsonb;
begin
  v_check := check_admin_security_trust_entitlement(
    p_customer_name,
    p_customer_domain,
    p_feature,
    p_meter_name,
    p_requested_quantity,
    p_request_id,
    p_metadata
  );

  if (v_check->>'allowed')::boolean is not true then
    raise exception 'trust entitlement denied: %', v_check->>'reason';
  end if;

  return v_check;
end;
$$;

create or replace function record_admin_security_trust_usage_meter_event(
  p_customer_name text,
  p_customer_domain text,
  p_meter_name text,
  p_meter_category text,
  p_quantity numeric default 1,
  p_source_type text default 'system',
  p_source_id uuid default null,
  p_source_key text default null,
  p_private_room_id uuid default null,
  p_proof_type text default null,
  p_proof_key text default null,
  p_occurred_at timestamptz default now(),
  p_dedupe_key text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_account admin_security_trust_billing_accounts%rowtype;
  v_ent admin_security_customer_trust_entitlements%rowtype;
  v_plan admin_security_trust_billing_plans%rowtype;
  v_usage_id uuid;
  v_key text;
  v_dedupe text;
  v_limit numeric;
  v_existing_quantity numeric := 0;
  v_overage boolean := false;
  v_unit_amount integer := 0;
  v_amount integer := 0;
  v_period_start timestamptz;
  v_period_end timestamptz;
begin
  if p_customer_name is null or length(trim(p_customer_name)) = 0 then
    raise exception 'usage customer name is required';
  end if;

  select *
  into v_ent
  from admin_security_customer_trust_entitlements
  where customer_name = p_customer_name
    and coalesce(customer_domain, '') = coalesce(p_customer_domain, '')
    and status = 'active'
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'trust entitlement not found for customer: %', p_customer_name;
  end if;

  select *
  into v_account
  from admin_security_trust_billing_accounts
  where id = v_ent.billing_account_id;

  select *
  into v_plan
  from admin_security_trust_billing_plans
  where id = v_ent.billing_plan_id;

  v_period_start := date_trunc('month', coalesce(p_occurred_at, now()));
  v_period_end := v_period_start + interval '1 month';

  v_limit :=
    case p_meter_name
      when 'private_room_created' then v_ent.private_room_limit
      when 'proof_report_generated' then v_ent.proof_report_limit
      when 'answer_receipt_created' then v_ent.answer_receipt_limit
      when 'public_verification_completed' then v_ent.public_verification_limit
      when 'qr_link_created' then v_ent.qr_link_limit
      when 'audit_package_built' then v_ent.audit_package_limit
      when 'transparency_portal_published' then v_ent.transparency_portal_limit
      when 'legal_hold_created' then v_ent.legal_hold_limit
      when 'admin_seat_used' then v_ent.admin_seat_limit
      when 'storage_gb_month' then v_ent.storage_gb_limit
      else null
    end;

  select coalesce(sum(quantity), 0)
  into v_existing_quantity
  from admin_security_trust_usage_meter_events
  where entitlement_id = v_ent.id
    and meter_name = p_meter_name
    and status = 'recorded'
    and billing_period_start = v_period_start
    and billing_period_end = v_period_end;

  v_overage := v_limit is not null and v_existing_quantity + coalesce(p_quantity, 1) > v_limit;

  v_unit_amount :=
    case p_meter_name
      when 'proof_report_generated' then v_plan.overage_report_cents
      when 'answer_receipt_created' then v_plan.overage_receipt_cents
      when 'public_verification_completed' then v_plan.overage_verification_cents
      when 'qr_link_created' then v_plan.overage_qr_link_cents
      when 'audit_package_built' then v_plan.overage_audit_package_cents
      when 'storage_gb_month' then v_plan.overage_storage_gb_cents
      else 0
    end;

  v_amount := case when v_overage then round(coalesce(p_quantity, 1) * v_unit_amount)::integer else 0 end;

  v_key :=
    'trust_usage_event:' ||
    p_meter_name || ':' ||
    substr(encode(gen_random_bytes(12), 'hex'), 1, 24);

  v_dedupe := coalesce(
    p_dedupe_key,
    p_meter_name || ':' ||
    coalesce(p_source_type, '') || ':' ||
    coalesce(p_source_id::text, '') || ':' ||
    coalesce(p_source_key, '') || ':' ||
    date_trunc('minute', coalesce(p_occurred_at, now()))::text
  );

  insert into admin_security_trust_usage_meter_events (
    usage_event_key,
    status,
    customer_name,
    customer_domain,
    billing_account_id,
    entitlement_id,
    meter_name,
    meter_category,
    quantity,
    unit,
    billable,
    included_in_plan,
    overage,
    unit_amount_cents,
    amount_cents,
    currency,
    source_type,
    source_id,
    source_key,
    private_room_id,
    proof_type,
    proof_key,
    occurred_at,
    billing_period_start,
    billing_period_end,
    dedupe_key,
    request_id,
    metadata
  )
  values (
    v_key,
    'recorded',
    p_customer_name,
    p_customer_domain,
    v_ent.billing_account_id,
    v_ent.id,
    p_meter_name,
    p_meter_category,
    coalesce(p_quantity, 1),
    case when p_meter_name = 'storage_gb_month' then 'gb_month' else 'count' end,
    true,
    not v_overage,
    v_overage,
    v_unit_amount,
    v_amount,
    coalesce(v_account.currency, 'USD'),
    coalesce(p_source_type, 'system'),
    p_source_id,
    p_source_key,
    p_private_room_id,
    p_proof_type,
    p_proof_key,
    coalesce(p_occurred_at, now()),
    v_period_start,
    v_period_end,
    v_dedupe,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (dedupe_key)
  do update set
    metadata = admin_security_trust_usage_meter_events.metadata || excluded.metadata
  returning id into v_usage_id;

  perform record_admin_security_trust_billing_event(
    'usage_metered',
    'recorded',
    v_ent.billing_account_id,
    v_ent.id,
    v_usage_id,
    null,
    null,
    p_customer_name,
    p_customer_domain,
    'system',
    null,
    null,
    null,
    'Trust usage metered',
    p_meter_name,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_usage_id;
end;
$$;

create or replace function refresh_admin_security_trust_usage_rollups(
  p_period_start timestamptz default date_trunc('month', now()),
  p_period_end timestamptz default (date_trunc('month', now()) + interval '1 month'),
  p_batch_size integer default 1000,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_count integer := 0;
  v_row record;
  v_limit numeric;
  v_usage_percent numeric;
  v_rollup_id uuid;
begin
  if p_batch_size <= 0 or p_batch_size > 5000 then
    raise exception 'batch size must be between 1 and 5000';
  end if;

  for v_row in
    select
      e.billing_account_id,
      e.entitlement_id,
      e.customer_name,
      e.customer_domain,
      e.meter_name,
      e.meter_category,
      e.currency,
      sum(e.quantity) as total_quantity,
      sum(e.quantity) filter (where e.overage is false) as included_quantity,
      sum(e.quantity) filter (where e.overage is true) as overage_quantity,
      sum(e.amount_cents) as total_amount_cents,
      sum(e.amount_cents) filter (where e.overage is false) as included_amount_cents,
      sum(e.amount_cents) filter (where e.overage is true) as overage_amount_cents,
      max(e.occurred_at) as last_event_at
    from admin_security_trust_usage_meter_events e
    where e.status = 'recorded'
      and e.billing_period_start = p_period_start
      and e.billing_period_end = p_period_end
    group by
      e.billing_account_id,
      e.entitlement_id,
      e.customer_name,
      e.customer_domain,
      e.meter_name,
      e.meter_category,
      e.currency
    limit p_batch_size
  loop
    select
      case v_row.meter_name
        when 'private_room_created' then private_room_limit
        when 'proof_report_generated' then proof_report_limit
        when 'answer_receipt_created' then answer_receipt_limit
        when 'public_verification_completed' then public_verification_limit
        when 'qr_link_created' then qr_link_limit
        when 'audit_package_built' then audit_package_limit
        when 'transparency_portal_published' then transparency_portal_limit
        when 'legal_hold_created' then legal_hold_limit
        when 'admin_seat_used' then admin_seat_limit
        when 'storage_gb_month' then storage_gb_limit
        else null
      end
    into v_limit
    from admin_security_customer_trust_entitlements
    where id = v_row.entitlement_id;

    v_usage_percent := case
      when v_limit is null or v_limit = 0 then null
      else round((coalesce(v_row.total_quantity, 0) / v_limit) * 100, 2)
    end;

    insert into admin_security_trust_usage_rollups (
      usage_rollup_key,
      status,
      customer_name,
      customer_domain,
      billing_account_id,
      entitlement_id,
      billing_period_start,
      billing_period_end,
      meter_name,
      meter_category,
      total_quantity,
      included_quantity,
      overage_quantity,
      total_amount_cents,
      included_amount_cents,
      overage_amount_cents,
      currency,
      limit_quantity,
      usage_percent,
      last_event_at,
      metadata
    )
    values (
      'trust_usage_rollup:' ||
      v_row.billing_account_id::text || ':' ||
      v_row.meter_name || ':' ||
      p_period_start::date::text,
      'active',
      v_row.customer_name,
      v_row.customer_domain,
      v_row.billing_account_id,
      v_row.entitlement_id,
      p_period_start,
      p_period_end,
      v_row.meter_name,
      v_row.meter_category,
      coalesce(v_row.total_quantity, 0),
      coalesce(v_row.included_quantity, 0),
      coalesce(v_row.overage_quantity, 0),
      coalesce(v_row.total_amount_cents, 0),
      coalesce(v_row.included_amount_cents, 0),
      coalesce(v_row.overage_amount_cents, 0),
      v_row.currency,
      v_limit,
      v_usage_percent,
      v_row.last_event_at,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('worker_id', p_worker_id, 'rollup_run_id', v_run_id)
    )
    on conflict (billing_account_id, billing_period_start, billing_period_end, meter_name)
    do update set
      total_quantity = excluded.total_quantity,
      included_quantity = excluded.included_quantity,
      overage_quantity = excluded.overage_quantity,
      total_amount_cents = excluded.total_amount_cents,
      included_amount_cents = excluded.included_amount_cents,
      overage_amount_cents = excluded.overage_amount_cents,
      limit_quantity = excluded.limit_quantity,
      usage_percent = excluded.usage_percent,
      last_event_at = excluded.last_event_at,
      metadata = admin_security_trust_usage_rollups.metadata || excluded.metadata,
      updated_at = now()
    returning id into v_rollup_id;

    perform record_admin_security_trust_billing_event(
      'usage_rollup_updated',
      'updated',
      v_row.billing_account_id,
      v_row.entitlement_id,
      null,
      v_rollup_id,
      null,
      v_row.customer_name,
      v_row.customer_domain,
      'worker',
      null,
      null,
      null,
      'Trust usage rollup updated',
      v_row.meter_name,
      null,
      jsonb_build_object('worker_id', p_worker_id, 'rollup_run_id', v_run_id)
    );

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'runId',
    v_run_id,
    'rollupsUpdated',
    v_count
  );
end;
$$;

create or replace function open_admin_security_trust_billing_period(
  p_billing_account_id uuid,
  p_period_start timestamptz default date_trunc('month', now()),
  p_period_end timestamptz default (date_trunc('month', now()) + interval '1 month'),
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_account admin_security_trust_billing_accounts%rowtype;
  v_plan admin_security_trust_billing_plans%rowtype;
  v_period_id uuid;
  v_key text;
  v_base_amount integer;
begin
  select *
  into v_account
  from admin_security_trust_billing_accounts
  where id = p_billing_account_id;

  if not found then
    raise exception 'trust billing account not found: %', p_billing_account_id;
  end if;

  select *
  into v_plan
  from admin_security_trust_billing_plans
  where id = v_account.billing_plan_id;

  if not found then
    v_base_amount := 0;
  else
    v_base_amount :=
      case v_account.billing_cycle
        when 'annual' then coalesce(v_plan.annual_base_amount_cents, 0)
        when 'internal' then 0
        else coalesce(v_plan.monthly_base_amount_cents, 0)
      end;
  end if;

  v_key :=
    'trust_billing_period:' ||
    v_account.billing_account_key || ':' ||
    p_period_start::date::text;

  insert into admin_security_trust_billing_periods (
    billing_period_key,
    status,
    billing_account_id,
    customer_name,
    customer_domain,
    period_start,
    period_end,
    currency,
    base_amount_cents,
    total_amount_cents,
    request_id,
    metadata
  )
  values (
    v_key,
    'open',
    v_account.id,
    v_account.customer_name,
    v_account.customer_domain,
    p_period_start,
    p_period_end,
    v_account.currency,
    v_base_amount,
    v_base_amount,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (billing_account_id, period_start, period_end)
  do update set
    base_amount_cents = excluded.base_amount_cents,
    total_amount_cents = excluded.base_amount_cents + admin_security_trust_billing_periods.usage_amount_cents + admin_security_trust_billing_periods.overage_amount_cents + admin_security_trust_billing_periods.adjustment_amount_cents + admin_security_trust_billing_periods.tax_amount_cents,
    metadata = admin_security_trust_billing_periods.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_period_id;

  perform record_admin_security_trust_billing_event(
    'billing_period_opened',
    'opened',
    v_account.id,
    null,
    null,
    null,
    null,
    v_account.customer_name,
    v_account.customer_domain,
    'system',
    null,
    null,
    null,
    'Trust billing period opened',
    p_period_start::date::text,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_period_id;
end;
$$;

create or replace function finalize_admin_security_trust_billing_period(
  p_billing_period_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_period admin_security_trust_billing_periods%rowtype;
  v_included_money integer;
  v_overage_money integer;
begin
  select *
  into v_period
  from admin_security_trust_billing_periods
  where id = p_billing_period_id
  for update;

  if not found then
    raise exception 'trust billing period not found: %', p_billing_period_id;
  end if;

  perform refresh_admin_security_trust_usage_rollups(
    v_period.period_start,
    v_period.period_end,
    5000,
    'billing-finalize',
    coalesce(p_metadata, '{}'::jsonb)
  );

  select
    coalesce(sum(included_amount_cents), 0),
    coalesce(sum(overage_amount_cents), 0)
  into v_included_money, v_overage_money
  from admin_security_trust_usage_rollups
  where billing_account_id = v_period.billing_account_id
    and billing_period_start = v_period.period_start
    and billing_period_end = v_period.period_end
    and status = 'active';

  update admin_security_trust_billing_periods
  set
    status = 'finalized',
    usage_amount_cents = v_included_money,
    overage_amount_cents = v_overage_money,
    total_amount_cents = base_amount_cents + v_included_money + v_overage_money + adjustment_amount_cents + tax_amount_cents,
    finalized_at = now(),
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = v_period.id;

  update admin_security_trust_usage_rollups
  set status = 'finalized', updated_at = now()
  where billing_account_id = v_period.billing_account_id
    and billing_period_start = v_period.period_start
    and billing_period_end = v_period.period_end
    and status = 'active';

  perform record_admin_security_trust_billing_event(
    'billing_period_finalized',
    'finalized',
    v_period.billing_account_id,
    null,
    null,
    null,
    null,
    v_period.customer_name,
    v_period.customer_domain,
    'system',
    null,
    null,
    null,
    'Trust billing period finalized',
    v_period.period_start::date::text,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_period.id;
end;
$$;

create or replace function create_admin_security_trust_invoice_from_period(
  p_billing_period_id uuid,
  p_due_days integer default 30,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_period admin_security_trust_billing_periods%rowtype;
  v_invoice_id uuid;
  v_invoice_key text;
  v_invoice_number text;
  v_rollup record;
  v_subtotal integer;
begin
  select *
  into v_period
  from admin_security_trust_billing_periods
  where id = p_billing_period_id
  for update;

  if not found then
    raise exception 'trust billing period not found: %', p_billing_period_id;
  end if;

  if v_period.status not in ('finalized', 'invoiced') then
    raise exception 'trust billing period must be finalized before invoice';
  end if;

  v_invoice_key :=
    'trust_invoice:' ||
    v_period.billing_period_key;

  v_invoice_number :=
    'TRUST-' ||
    to_char(v_period.period_start, 'YYYYMM') ||
    '-' ||
    substr(replace(v_period.billing_account_id::text, '-', ''), 1, 8);

  v_subtotal :=
    v_period.base_amount_cents + v_period.usage_amount_cents + v_period.overage_amount_cents + v_period.adjustment_amount_cents;

  insert into admin_security_trust_invoices (
    invoice_key,
    status,
    billing_account_id,
    billing_period_id,
    customer_name,
    customer_domain,
    invoice_number,
    currency,
    subtotal_amount_cents,
    tax_amount_cents,
    total_amount_cents,
    amount_due_cents,
    issued_at,
    due_at,
    request_id,
    metadata
  )
  values (
    v_invoice_key,
    'issued',
    v_period.billing_account_id,
    v_period.id,
    v_period.customer_name,
    v_period.customer_domain,
    v_invoice_number,
    v_period.currency,
    v_subtotal,
    v_period.tax_amount_cents,
    v_period.total_amount_cents,
    v_period.total_amount_cents,
    now(),
    now() + make_interval(days => coalesce(p_due_days, 30)),
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (invoice_key)
  do update set
    subtotal_amount_cents = excluded.subtotal_amount_cents,
    total_amount_cents = excluded.total_amount_cents,
    amount_due_cents = excluded.amount_due_cents,
    metadata = admin_security_trust_invoices.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_invoice_id;

  insert into admin_security_trust_invoice_line_items (
    invoice_line_item_key,
    invoice_id,
    billing_account_id,
    line_type,
    description,
    quantity,
    unit,
    unit_amount_cents,
    amount_cents,
    currency,
    line_payload
  )
  values (
    'trust_invoice_line:' || v_invoice_key || ':base',
    v_invoice_id,
    v_period.billing_account_id,
    'base_subscription',
    'Trust subscription base fee',
    1,
    'period',
    v_period.base_amount_cents,
    v_period.base_amount_cents,
    v_period.currency,
    jsonb_build_object('periodStart', v_period.period_start, 'periodEnd', v_period.period_end)
  )
  on conflict (invoice_line_item_key) do nothing;

  for v_rollup in
    select *
    from admin_security_trust_usage_rollups
    where billing_account_id = v_period.billing_account_id
      and billing_period_start = v_period.period_start
      and billing_period_end = v_period.period_end
      and overage_amount_cents > 0
  loop
    insert into admin_security_trust_invoice_line_items (
      invoice_line_item_key,
      invoice_id,
      billing_account_id,
      usage_rollup_id,
      line_type,
      description,
      meter_name,
      quantity,
      unit,
      unit_amount_cents,
      amount_cents,
      currency,
      line_payload
    )
    values (
      'trust_invoice_line:' || v_invoice_key || ':' || v_rollup.meter_name,
      v_invoice_id,
      v_period.billing_account_id,
      v_rollup.id,
      'usage_overage',
      'Trust usage overage: ' || v_rollup.meter_name,
      v_rollup.meter_name,
      v_rollup.overage_quantity,
      'count',
      case
        when v_rollup.overage_quantity > 0
        then round(v_rollup.overage_amount_cents / v_rollup.overage_quantity)::integer
        else 0
      end,
      v_rollup.overage_amount_cents,
      v_rollup.currency,
      jsonb_build_object(
        'meterName',
        v_rollup.meter_name,
        'totalQuantity',
        v_rollup.total_quantity,
        'includedQuantity',
        v_rollup.included_quantity,
        'overageQuantity',
        v_rollup.overage_quantity,
        'limitQuantity',
        v_rollup.limit_quantity
      )
    )
    on conflict (invoice_line_item_key) do nothing;
  end loop;

  update admin_security_trust_billing_periods
  set status = 'invoiced', invoiced_at = now(), updated_at = now()
  where id = v_period.id;

  perform record_admin_security_trust_billing_event(
    'invoice_created',
    'created',
    v_period.billing_account_id,
    null,
    null,
    null,
    v_invoice_id,
    v_period.customer_name,
    v_period.customer_domain,
    'system',
    null,
    null,
    null,
    'Trust invoice created',
    v_invoice_number,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_invoice_id;
end;
$$;

create or replace function process_admin_security_trust_billing_cycle(
  p_worker_id text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_rollups jsonb;
  v_accounts integer := 0;
  v_periods integer := 0;
  v_account record;
  v_period_id uuid;
begin
  v_rollups := refresh_admin_security_trust_usage_rollups(
    date_trunc('month', now()),
    date_trunc('month', now()) + interval '1 month',
    5000,
    p_worker_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('billing_cycle_run_id', v_run_id)
  );

  for v_account in
    select id
    from admin_security_trust_billing_accounts
    where status in ('active', 'trialing', 'past_due')
    order by created_at asc
    limit 1000
  loop
    v_period_id := open_admin_security_trust_billing_period(
      v_account.id,
      date_trunc('month', now()),
      date_trunc('month', now()) + interval '1 month',
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('billing_cycle_run_id', v_run_id)
    );

    v_accounts := v_accounts + 1;
    v_periods := v_periods + 1;
  end loop;

  return jsonb_build_object(
    'runId',
    v_run_id,
    'rollups',
    v_rollups,
    'accountsProcessed',
    v_accounts,
    'periodsOpened',
    v_periods
  );
end;
$$;
-- Part 221d: dashboard views, scheduled jobs, error taxonomy, RLS, grants

create or replace view admin_security_trust_billing_account_dashboard as
select
  a.id as admin_security_trust_billing_account_id,
  a.billing_account_key,
  a.status,
  a.customer_name,
  a.customer_domain,
  a.billing_plan_id,
  p.billing_plan_key,
  p.plan_name,
  p.plan_tier,
  a.plan_code,
  a.billing_email,
  a.billing_contact_name,
  a.billing_cycle,
  a.currency,
  a.payment_status,
  a.collection_status,
  a.external_customer_id,
  a.external_subscription_id,
  a.external_payment_provider,
  a.trial_starts_at,
  a.trial_ends_at,
  a.current_period_starts_at,
  a.current_period_ends_at,
  a.suspended_at,
  a.cancelled_at,
  creator.email as created_by_email,
  (
    select count(*)
    from admin_security_customer_trust_entitlements e
    where e.billing_account_id = a.id
      and e.status = 'active'
  ) as active_entitlement_count,
  (
    select coalesce(sum(overage_amount_cents), 0)
    from admin_security_trust_usage_rollups r
    where r.billing_account_id = a.id
      and r.billing_period_start = date_trunc('month', now())
  ) as current_period_overage_cents,
  a.created_at,
  a.updated_at,
  a.metadata
from admin_security_trust_billing_accounts a
left join admin_security_trust_billing_plans p
  on p.id = a.billing_plan_id
left join admin_users creator
  on creator.id = a.created_by_admin_user_id
order by a.created_at desc;

create or replace view admin_security_customer_trust_entitlement_dashboard as
select
  e.id as admin_security_customer_trust_entitlement_id,
  e.entitlement_key,
  e.status,
  e.billing_account_id,
  a.billing_account_key,
  e.customer_name,
  e.customer_domain,
  e.billing_plan_id,
  p.plan_name,
  p.plan_tier,
  e.plan_code,
  e.entitlement_scope,
  e.private_room_limit,
  e.proof_report_limit,
  e.answer_receipt_limit,
  e.public_verification_limit,
  e.qr_link_limit,
  e.audit_package_limit,
  e.transparency_portal_limit,
  e.legal_hold_limit,
  e.admin_seat_limit,
  e.storage_gb_limit,
  e.allow_governance,
  e.allow_legal_hold,
  e.allow_audit_packages,
  e.allow_transparency_portal,
  e.allow_public_verification,
  e.allow_custom_retention,
  e.allow_custom_branding,
  e.allow_regulator_exports,
  e.allow_api_access,
  e.allow_webhooks,
  e.allow_dedicated_support,
  e.hard_limit_enforcement,
  e.overage_allowed,
  e.effective_at,
  e.expires_at,
  e.created_at,
  e.updated_at,
  e.metadata
from admin_security_customer_trust_entitlements e
left join admin_security_trust_billing_accounts a
  on a.id = e.billing_account_id
left join admin_security_trust_billing_plans p
  on p.id = e.billing_plan_id
order by e.created_at desc;

create or replace view admin_security_trust_usage_rollup_dashboard as
select
  r.id as admin_security_trust_usage_rollup_id,
  r.usage_rollup_key,
  r.status,
  r.customer_name,
  r.customer_domain,
  r.billing_account_id,
  a.billing_account_key,
  r.entitlement_id,
  r.billing_period_start,
  r.billing_period_end,
  r.meter_name,
  r.meter_category,
  r.total_quantity,
  r.included_quantity,
  r.overage_quantity,
  r.total_amount_cents,
  r.included_amount_cents,
  r.overage_amount_cents,
  r.currency,
  r.limit_quantity,
  r.usage_percent,
  r.last_event_at,
  case
    when r.usage_percent is null then 'unknown'
    when r.usage_percent >= 100 then 'exceeded'
    when r.usage_percent >= 80 then 'warning'
    else 'healthy'
  end as usage_status,
  r.created_at,
  r.updated_at,
  r.metadata
from admin_security_trust_usage_rollups r
left join admin_security_trust_billing_accounts a
  on a.id = r.billing_account_id
order by r.billing_period_start desc, r.usage_percent desc nulls last;

create or replace view admin_security_trust_invoice_dashboard as
select
  i.id as admin_security_trust_invoice_id,
  i.invoice_key,
  i.status,
  i.billing_account_id,
  a.billing_account_key,
  i.billing_period_id,
  bp.billing_period_key,
  i.customer_name,
  i.customer_domain,
  i.invoice_number,
  i.currency,
  i.subtotal_amount_cents,
  i.discount_amount_cents,
  i.tax_amount_cents,
  i.total_amount_cents,
  i.amount_due_cents,
  i.amount_paid_cents,
  i.issued_at,
  i.due_at,
  i.paid_at,
  i.voided_at,
  i.external_invoice_id,
  i.invoice_pdf_uri,
  i.hosted_invoice_url,
  (
    select count(*)
    from admin_security_trust_invoice_line_items li
    where li.invoice_id = i.id
  ) as line_item_count,
  i.created_at,
  i.updated_at,
  i.metadata
from admin_security_trust_invoices i
left join admin_security_trust_billing_accounts a
  on a.id = i.billing_account_id
left join admin_security_trust_billing_periods bp
  on bp.id = i.billing_period_id
order by i.created_at desc;

create or replace view admin_security_trust_billing_integrity as
select
  (
    select count(*)
    from admin_security_trust_billing_accounts
    where status in ('active', 'trialing')
  ) as active_billing_account_count,

  (
    select count(*)
    from admin_security_customer_trust_entitlements
    where status = 'active'
  ) as active_entitlement_count,

  (
    select count(*)
    from admin_security_trust_billing_accounts a
    where status in ('active', 'trialing')
      and not exists (
        select 1
        from admin_security_customer_trust_entitlements e
        where e.billing_account_id = a.id
          and e.status = 'active'
      )
  ) as active_accounts_missing_entitlements_count,

  (
    select count(*)
    from admin_security_trust_usage_meter_events
    where occurred_at >= date_trunc('month', now())
      and status = 'recorded'
  ) as current_month_usage_event_count,

  (
    select count(*)
    from admin_security_trust_usage_rollups
    where billing_period_start = date_trunc('month', now())
      and usage_percent >= 80
  ) as current_month_usage_warning_count,

  (
    select count(*)
    from admin_security_trust_usage_rollups
    where billing_period_start = date_trunc('month', now())
      and usage_percent >= 100
  ) as current_month_usage_exceeded_count,

  (
    select coalesce(sum(overage_amount_cents), 0)
    from admin_security_trust_usage_rollups
    where billing_period_start = date_trunc('month', now())
  ) as current_month_overage_cents,

  (
    select count(*)
    from admin_security_trust_invoices
    where status = 'past_due'
  ) as past_due_invoice_count,

  now() as checked_at;

grant select on admin_security_trust_billing_account_dashboard to admin_api_role;
grant select on admin_security_customer_trust_entitlement_dashboard to admin_api_role;
grant select on admin_security_trust_usage_rollup_dashboard to admin_api_role;
grant select on admin_security_trust_invoice_dashboard to admin_api_role;
grant select on admin_security_trust_billing_integrity to admin_api_role;

insert into scheduled_jobs (
  job_key,
  job_name,
  job_group,
  enabled,
  schedule_cron,
  function_name,
  function_args,
  max_runtime_seconds,
  lock_ttl_seconds,
  metadata
)
values
  (
    'admin_security_trust_billing_cycle_hourly',
    'Process trust billing cycle',
    'admin',
    true,
    '18 * * * *',
    'process_admin_security_trust_billing_cycle',
    '{}'::jsonb,
    300,
    600,
    '{"priority": "medium"}'::jsonb
  ),
  (
    'admin_security_trust_usage_rollups_every_15m',
    'Refresh trust usage rollups',
    'admin',
    true,
    '*/15 * * * *',
    'refresh_admin_security_trust_usage_rollups',
    '{}'::jsonb,
    240,
    600,
    '{"priority": "medium"}'::jsonb
  )
on conflict (job_key)
do update set
  enabled = excluded.enabled,
  schedule_cron = excluded.schedule_cron,
  function_name = excluded.function_name,
  function_args = excluded.function_args,
  max_runtime_seconds = excluded.max_runtime_seconds,
  lock_ttl_seconds = excluded.lock_ttl_seconds,
  metadata = scheduled_jobs.metadata || excluded.metadata,
  updated_at = now();

insert into error_catalog (
  error_code,
  category,
  severity,
  http_status,
  retryable,
  user_visible,
  user_message,
  internal_message,
  owner_team
)
values
  (
    'TRUST_BILLING_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Trust billing record not found.',
    'Trust billing record not found.',
    'platform'
  ),
  (
    'TRUST_BILLING_INVALID_STATE',
    'validation',
    'medium',
    409,
    true,
    true,
    'Trust billing record is not in a valid state.',
    'Trust billing invalid state.',
    'platform'
  ),
  (
    'TRUST_BILLING_REQUIRED_FIELDS',
    'validation',
    'medium',
    400,
    false,
    true,
    'Trust billing request requires complete fields.',
    'Trust billing required fields missing.',
    'platform'
  ),
  (
    'TRUST_ENTITLEMENT_DENIED',
    'permission',
    'high',
    403,
    false,
    true,
    'This trust feature is not available under the current entitlement.',
    'Trust entitlement denied.',
    'platform'
  )
on conflict (error_code)
do update set
  category = excluded.category,
  severity = excluded.severity,
  http_status = excluded.http_status,
  retryable = excluded.retryable,
  user_visible = excluded.user_visible,
  user_message = excluded.user_message,
  internal_message = excluded.internal_message,
  owner_team = excluded.owner_team,
  updated_at = now();

insert into error_mapping_rules (
  match_pattern,
  error_code,
  priority,
  metadata
)
values
  ('trust billing account not found', 'TRUST_BILLING_NOT_FOUND', 5, '{}'::jsonb),
  ('trust billing plan not found', 'TRUST_BILLING_NOT_FOUND', 5, '{}'::jsonb),
  ('trust entitlement not found', 'TRUST_BILLING_NOT_FOUND', 5, '{}'::jsonb),
  ('trust billing period not found', 'TRUST_BILLING_NOT_FOUND', 5, '{}'::jsonb),
  ('trust billing period must be finalized before invoice', 'TRUST_BILLING_INVALID_STATE', 5, '{}'::jsonb),
  ('billing customer name is required', 'TRUST_BILLING_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('usage customer name is required', 'TRUST_BILLING_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('trust entitlement denied', 'TRUST_ENTITLEMENT_DENIED', 5, '{}'::jsonb)
on conflict (match_pattern)
do update set
  error_code = excluded.error_code,
  priority = excluded.priority,
  metadata = error_mapping_rules.metadata || excluded.metadata,
  active = true;

alter table admin_security_trust_billing_plans enable row level security;
alter table admin_security_trust_billing_accounts enable row level security;
alter table admin_security_customer_trust_entitlements enable row level security;
alter table admin_security_trust_usage_meter_events enable row level security;
alter table admin_security_trust_usage_rollups enable row level security;
alter table admin_security_trust_billing_periods enable row level security;
alter table admin_security_trust_invoices enable row level security;
alter table admin_security_trust_invoice_line_items enable row level security;
alter table admin_security_trust_billing_events enable row level security;

drop policy if exists admin_api_all_trust_billing_plans on admin_security_trust_billing_plans;
create policy admin_api_all_trust_billing_plans
on admin_security_trust_billing_plans
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_trust_billing_accounts on admin_security_trust_billing_accounts;
create policy admin_api_all_trust_billing_accounts
on admin_security_trust_billing_accounts
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_customer_trust_entitlements on admin_security_customer_trust_entitlements;
create policy admin_api_all_customer_trust_entitlements
on admin_security_customer_trust_entitlements
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_trust_usage_meter_events on admin_security_trust_usage_meter_events;
create policy admin_api_all_trust_usage_meter_events
on admin_security_trust_usage_meter_events
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_trust_usage_rollups on admin_security_trust_usage_rollups;
create policy admin_api_all_trust_usage_rollups
on admin_security_trust_usage_rollups
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_trust_billing_periods on admin_security_trust_billing_periods;
create policy admin_api_all_trust_billing_periods
on admin_security_trust_billing_periods
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_trust_invoices on admin_security_trust_invoices;
create policy admin_api_all_trust_invoices
on admin_security_trust_invoices
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_trust_invoice_line_items on admin_security_trust_invoice_line_items;
create policy admin_api_all_trust_invoice_line_items
on admin_security_trust_invoice_line_items
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_trust_billing_events on admin_security_trust_billing_events;
create policy admin_api_all_trust_billing_events
on admin_security_trust_billing_events
for all to admin_api_role
using (true)
with check (true);

drop policy if exists worker_read_trust_billing_plans on admin_security_trust_billing_plans;
create policy worker_read_trust_billing_plans
on admin_security_trust_billing_plans
for select to worker_role
using (true);

drop policy if exists worker_all_trust_billing_accounts on admin_security_trust_billing_accounts;
create policy worker_all_trust_billing_accounts
on admin_security_trust_billing_accounts
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_customer_trust_entitlements on admin_security_customer_trust_entitlements;
create policy worker_all_customer_trust_entitlements
on admin_security_customer_trust_entitlements
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_trust_usage_meter_events on admin_security_trust_usage_meter_events;
create policy worker_all_trust_usage_meter_events
on admin_security_trust_usage_meter_events
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_trust_usage_rollups on admin_security_trust_usage_rollups;
create policy worker_all_trust_usage_rollups
on admin_security_trust_usage_rollups
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_trust_billing_periods on admin_security_trust_billing_periods;
create policy worker_all_trust_billing_periods
on admin_security_trust_billing_periods
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_trust_invoices on admin_security_trust_invoices;
create policy worker_all_trust_invoices
on admin_security_trust_invoices
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_trust_invoice_line_items on admin_security_trust_invoice_line_items;
create policy worker_all_trust_invoice_line_items
on admin_security_trust_invoice_line_items
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_trust_billing_events on admin_security_trust_billing_events;
create policy worker_all_trust_billing_events
on admin_security_trust_billing_events
for all to worker_role
using (true)
with check (true);

grant execute on function record_admin_security_trust_billing_event(
  text,text,uuid,uuid,uuid,uuid,uuid,text,text,text,uuid,uuid,text,text,text,text,jsonb
) to admin_api_role, worker_role;

grant execute on function create_admin_security_trust_billing_account(
  uuid,text,text,text,text,text,text,text,text,text,timestamptz,text,jsonb
) to admin_api_role;

grant execute on function upsert_admin_security_customer_trust_entitlements_from_account(uuid,text,jsonb)
to admin_api_role, worker_role;

grant execute on function check_admin_security_trust_entitlement(text,text,text,text,numeric,text,jsonb)
to admin_api_role, worker_role;

grant execute on function enforce_admin_security_trust_entitlement(text,text,text,text,numeric,text,jsonb)
to admin_api_role, worker_role;

grant execute on function record_admin_security_trust_usage_meter_event(
  text,text,text,text,numeric,text,uuid,text,uuid,text,text,timestamptz,text,text,jsonb
) to admin_api_role, worker_role;

grant execute on function refresh_admin_security_trust_usage_rollups(timestamptz,timestamptz,integer,text,jsonb)
to admin_api_role, worker_role;

grant execute on function open_admin_security_trust_billing_period(uuid,timestamptz,timestamptz,text,jsonb)
to admin_api_role, worker_role;

grant execute on function finalize_admin_security_trust_billing_period(uuid,text,jsonb)
to admin_api_role, worker_role;

grant execute on function create_admin_security_trust_invoice_from_period(uuid,integer,text,jsonb)
to admin_api_role, worker_role;

grant execute on function process_admin_security_trust_billing_cycle(text,text,jsonb)
to admin_api_role, worker_role;

alter function create_admin_security_trust_billing_account(
  uuid,text,text,text,text,text,text,text,text,text,timestamptz,text,jsonb
) security definer;
alter function create_admin_security_trust_billing_account(
  uuid,text,text,text,text,text,text,text,text,text,timestamptz,text,jsonb
) set search_path = public;

alter function upsert_admin_security_customer_trust_entitlements_from_account(uuid,text,jsonb) security definer;
alter function upsert_admin_security_customer_trust_entitlements_from_account(uuid,text,jsonb) set search_path = public;

alter function check_admin_security_trust_entitlement(text,text,text,text,numeric,text,jsonb) security definer;
alter function check_admin_security_trust_entitlement(text,text,text,text,numeric,text,jsonb) set search_path = public;

alter function enforce_admin_security_trust_entitlement(text,text,text,text,numeric,text,jsonb) security definer;
alter function enforce_admin_security_trust_entitlement(text,text,text,text,numeric,text,jsonb) set search_path = public;

alter function record_admin_security_trust_usage_meter_event(
  text,text,text,text,numeric,text,uuid,text,uuid,text,text,timestamptz,text,text,jsonb
) security definer;
alter function record_admin_security_trust_usage_meter_event(
  text,text,text,text,numeric,text,uuid,text,uuid,text,text,timestamptz,text,text,jsonb
) set search_path = public;

alter function refresh_admin_security_trust_usage_rollups(timestamptz,timestamptz,integer,text,jsonb) security definer;
alter function refresh_admin_security_trust_usage_rollups(timestamptz,timestamptz,integer,text,jsonb) set search_path = public;

alter function open_admin_security_trust_billing_period(uuid,timestamptz,timestamptz,text,jsonb) security definer;
alter function open_admin_security_trust_billing_period(uuid,timestamptz,timestamptz,text,jsonb) set search_path = public;

alter function finalize_admin_security_trust_billing_period(uuid,text,jsonb) security definer;
alter function finalize_admin_security_trust_billing_period(uuid,text,jsonb) set search_path = public;

alter function create_admin_security_trust_invoice_from_period(uuid,integer,text,jsonb) security definer;
alter function create_admin_security_trust_invoice_from_period(uuid,integer,text,jsonb) set search_path = public;

alter function process_admin_security_trust_billing_cycle(text,text,jsonb) security definer;
alter function process_admin_security_trust_billing_cycle(text,text,jsonb) set search_path = public;
