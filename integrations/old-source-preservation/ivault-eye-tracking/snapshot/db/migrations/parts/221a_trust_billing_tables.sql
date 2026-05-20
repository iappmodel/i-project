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
