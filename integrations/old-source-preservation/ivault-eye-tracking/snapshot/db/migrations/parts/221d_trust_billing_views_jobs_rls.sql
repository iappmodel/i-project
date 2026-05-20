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
