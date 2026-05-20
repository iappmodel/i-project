-- Step 9.89 — Trust mobile/admin alerts v2 (tables + seeds, part 1 of 224).
-- Spec filename reference: 204_admin_security_trust_mobile_admin_alerts_v2.sql
-- Depends on: admin_users, command center queue, incidents, AI findings, risk scores,
--   webhook_deliveries, billing_accounts (prior trust migrations).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Alert channels
-- ---------------------------------------------------------------------------

create table if not exists admin_security_trust_alert_channels (
  id uuid primary key default gen_random_uuid(),

  alert_channel_key text not null unique,

  status text not null default 'active',

  channel_name text not null,
  channel_description text,

  channel_type text not null,

  environment text not null default 'production',

  destination_address text,
  destination_reference text,

  provider text,
  provider_config jsonb not null default '{}'::jsonb,

  secret_hash text,
  secret_preview text,

  enabled boolean not null default true,

  rate_limit_per_minute integer not null default 60,
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  quiet_hours_timezone text default 'UTC',

  created_by_auth_user_id uuid,
  created_by_admin_user_id uuid references admin_users(id) on delete set null,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_trust_alert_channels_status_check
  check (
    status in (
      'active',
      'paused',
      'disabled',
      'failed',
      'archived'
    )
  ),

  constraint admin_security_trust_alert_channels_type_check
  check (
    channel_type in (
      'email',
      'sms',
      'mobile_push',
      'slack',
      'teams',
      'pagerduty',
      'opsgenie',
      'webhook',
      'in_app',
      'custom'
    )
  ),

  constraint admin_security_trust_alert_channels_environment_check
  check (
    environment in (
      'production',
      'staging',
      'development',
      'sandbox'
    )
  ),

  constraint admin_security_trust_alert_channels_name_check
  check (length(trim(channel_name)) > 0),

  constraint admin_security_trust_alert_channels_rate_check
  check (rate_limit_per_minute > 0)
);

create index if not exists admin_security_trust_alert_channels_status_idx
on admin_security_trust_alert_channels (status, channel_type, enabled);

create index if not exists admin_security_trust_alert_channels_type_idx
on admin_security_trust_alert_channels (channel_type, environment);

drop trigger if exists admin_security_trust_alert_channels_set_updated_at
on admin_security_trust_alert_channels;

create trigger admin_security_trust_alert_channels_set_updated_at
before update on admin_security_trust_alert_channels
for each row
execute function set_updated_at();

insert into admin_security_trust_alert_channels (
  alert_channel_key,
  status,
  channel_name,
  channel_description,
  channel_type,
  environment,
  enabled,
  provider,
  provider_config,
  metadata
)
values
  (
    'trust_alert_channel:in_app_default',
    'active',
    'Default in-app admin alerts',
    'Default in-app notification channel for trust alerts.',
    'in_app',
    'production',
    true,
    'internal',
    '{}'::jsonb,
    '{"seed": true}'::jsonb
  ),
  (
    'trust_alert_channel:email_default',
    'active',
    'Default admin email alerts',
    'Default email notification channel for trust alerts.',
    'email',
    'production',
    true,
    'internal_email',
    '{}'::jsonb,
    '{"seed": true}'::jsonb
  )
on conflict (alert_channel_key)
do update set
  status = excluded.status,
  enabled = excluded.enabled,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Alert recipients
-- ---------------------------------------------------------------------------

create table if not exists admin_security_trust_alert_recipients (
  id uuid primary key default gen_random_uuid(),

  alert_recipient_key text not null unique,

  status text not null default 'active',

  recipient_type text not null default 'admin_user',

  admin_user_id uuid references admin_users(id) on delete set null,
  auth_user_id uuid,

  team_key text,
  recipient_name text not null,
  recipient_email text,
  recipient_phone text,

  timezone text not null default 'UTC',

  severity_floor text not null default 'medium',

  allow_email boolean not null default true,
  allow_sms boolean not null default false,
  allow_mobile_push boolean not null default true,
  allow_slack boolean not null default false,
  allow_pagerduty boolean not null default false,
  allow_in_app boolean not null default true,

  on_call_enabled boolean not null default false,
  on_call_priority integer not null default 100,

  enabled boolean not null default true,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_trust_alert_recipients_status_check
  check (
    status in (
      'active',
      'paused',
      'disabled',
      'archived'
    )
  ),

  constraint admin_security_trust_alert_recipients_type_check
  check (
    recipient_type in (
      'admin_user',
      'team',
      'on_call',
      'external',
      'system'
    )
  ),

  constraint admin_security_trust_alert_recipients_severity_floor_check
  check (
    severity_floor in (
      'info',
      'low',
      'medium',
      'high',
      'critical'
    )
  ),

  constraint admin_security_trust_alert_recipients_name_check
  check (length(trim(recipient_name)) > 0),

  constraint admin_security_trust_alert_recipients_on_call_priority_check
  check (on_call_priority > 0)
);

create index if not exists admin_security_trust_alert_recipients_status_idx
on admin_security_trust_alert_recipients (status, recipient_type, enabled);

create index if not exists admin_security_trust_alert_recipients_admin_idx
on admin_security_trust_alert_recipients (admin_user_id, auth_user_id);

create index if not exists admin_security_trust_alert_recipients_team_idx
on admin_security_trust_alert_recipients (team_key, on_call_enabled, on_call_priority);

drop trigger if exists admin_security_trust_alert_recipients_set_updated_at
on admin_security_trust_alert_recipients;

create trigger admin_security_trust_alert_recipients_set_updated_at
before update on admin_security_trust_alert_recipients
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Alert policies
-- ---------------------------------------------------------------------------

create table if not exists admin_security_trust_alert_policies (
  id uuid primary key default gen_random_uuid(),

  alert_policy_key text not null unique,

  status text not null default 'active',

  policy_name text not null,
  policy_description text,

  policy_scope text not null default 'global',

  customer_name text,
  customer_domain text,

  source_module text not null,
  source_event_type text not null default '*',

  min_severity text not null default 'high',

  alert_priority text not null default 'high',

  enabled boolean not null default true,

  dedupe_window_minutes integer not null default 60,
  suppression_window_minutes integer not null default 0,

  escalation_enabled boolean not null default true,
  escalation_after_minutes integer not null default 30,
  max_escalation_level integer not null default 3,

  create_in_app boolean not null default true,
  send_email boolean not null default true,
  send_mobile_push boolean not null default true,
  send_slack boolean not null default false,
  send_pagerduty boolean not null default false,
  send_webhook boolean not null default false,

  route_payload jsonb not null default '{}'::jsonb,
  policy_filter jsonb not null default '{}'::jsonb,

  created_by_auth_user_id uuid,
  created_by_admin_user_id uuid references admin_users(id) on delete set null,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_trust_alert_policies_status_check
  check (
    status in (
      'active',
      'paused',
      'disabled',
      'archived'
    )
  ),

  constraint admin_security_trust_alert_policies_scope_check
  check (
    policy_scope in (
      'global',
      'customer',
      'team',
      'module'
    )
  ),

  constraint admin_security_trust_alert_policies_source_module_check
  check (
    source_module in (
      'command_center',
      'incidents',
      'ai_analyst',
      'risk_scores',
      'verification',
      'proofs',
      'transparency',
      'billing',
      'integrations',
      'system',
      'manual'
    )
  ),

  constraint admin_security_trust_alert_policies_min_severity_check
  check (
    min_severity in (
      'info',
      'low',
      'medium',
      'high',
      'critical'
    )
  ),

  constraint admin_security_trust_alert_policies_priority_check
  check (
    alert_priority in (
      'low',
      'medium',
      'high',
      'critical'
    )
  ),

  constraint admin_security_trust_alert_policies_name_check
  check (length(trim(policy_name)) > 0),

  constraint admin_security_trust_alert_policies_dedupe_check
  check (dedupe_window_minutes >= 0),

  constraint admin_security_trust_alert_policies_escalation_check
  check (escalation_after_minutes > 0 and max_escalation_level > 0)
);

create index if not exists admin_security_trust_alert_policies_status_idx
on admin_security_trust_alert_policies (status, enabled, source_module, min_severity);

create index if not exists admin_security_trust_alert_policies_customer_idx
on admin_security_trust_alert_policies (customer_name, customer_domain, status);

drop trigger if exists admin_security_trust_alert_policies_set_updated_at
on admin_security_trust_alert_policies;

create trigger admin_security_trust_alert_policies_set_updated_at
before update on admin_security_trust_alert_policies
for each row
execute function set_updated_at();

insert into admin_security_trust_alert_policies (
  alert_policy_key,
  status,
  policy_name,
  policy_description,
  policy_scope,
  source_module,
  source_event_type,
  min_severity,
  alert_priority,
  enabled,
  dedupe_window_minutes,
  escalation_enabled,
  escalation_after_minutes,
  max_escalation_level,
  create_in_app,
  send_email,
  send_mobile_push,
  send_slack,
  send_pagerduty,
  route_payload,
  metadata
)
values
  (
    'trust_alert_policy:critical_command_queue',
    'active',
    'Critical command queue alert',
    'Alert admins when critical command queue items appear.',
    'global',
    'command_center',
    'queue_item_created',
    'critical',
    'critical',
    true,
    30,
    true,
    15,
    3,
    true,
    true,
    true,
    false,
    false,
    '{"teamKey": "trust"}'::jsonb,
    '{"seed": true}'::jsonb
  ),
  (
    'trust_alert_policy:critical_incident',
    'active',
    'Critical trust incident alert',
    'Alert admins when critical trust incidents are open.',
    'global',
    'incidents',
    '*',
    'critical',
    'critical',
    true,
    30,
    true,
    15,
    3,
    true,
    true,
    true,
    false,
    true,
    '{"teamKey": "trust"}'::jsonb,
    '{"seed": true}'::jsonb
  ),
  (
    'trust_alert_policy:high_ai_finding',
    'active',
    'High AI finding alert',
    'Alert admins when high or critical AI findings are created.',
    'global',
    'ai_analyst',
    'finding_created',
    'high',
    'high',
    true,
    60,
    true,
    30,
    2,
    true,
    true,
    true,
    false,
    false,
    '{"teamKey": "trust"}'::jsonb,
    '{"seed": true}'::jsonb
  ),
  (
    'trust_alert_policy:integration_dead_letter',
    'active',
    'Webhook dead-letter alert',
    'Alert admins when webhook deliveries dead-letter.',
    'global',
    'integrations',
    'delivery_dead_lettered',
    'medium',
    'medium',
    true,
    120,
    false,
    60,
    1,
    true,
    true,
    false,
    false,
    false,
    '{"teamKey": "integrations"}'::jsonb,
    '{"seed": true}'::jsonb
  ),
  (
    'trust_alert_policy:billing_limit_exceeded',
    'active',
    'Billing usage exceeded alert',
    'Alert admins when trust usage exceeds entitlement limits.',
    'global',
    'billing',
    'limit_exceeded',
    'medium',
    'medium',
    true,
    240,
    false,
    60,
    1,
    true,
    true,
    false,
    false,
    false,
    '{"teamKey": "billing"}'::jsonb,
    '{"seed": true}'::jsonb
  )
on conflict (alert_policy_key)
do update set
  status = excluded.status,
  enabled = excluded.enabled,
  updated_at = now();
