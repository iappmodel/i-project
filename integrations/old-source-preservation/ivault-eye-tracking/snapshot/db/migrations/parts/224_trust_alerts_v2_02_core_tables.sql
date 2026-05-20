-- Step 9.89 — Trust alerts v2: events, notifications, delivery attempts, audit (part 2).

create table if not exists admin_security_trust_alert_events (
  id uuid primary key default gen_random_uuid(),

  alert_event_key text not null unique,

  status text not null default 'open',

  source_module text not null,
  source_event_type text not null,

  severity text not null default 'medium',
  alert_priority text not null default 'medium',

  customer_name text,
  customer_domain text,

  title text not null,
  summary text not null,

  source_table text,
  source_id uuid,
  source_key text,

  command_queue_item_id uuid references admin_security_trust_command_center_queue(id) on delete set null,
  incident_id uuid references admin_security_trust_incidents(id) on delete set null,
  ai_finding_id uuid references admin_security_trust_ai_findings(id) on delete set null,
  risk_score_id uuid references admin_security_customer_trust_risk_scores(id) on delete set null,
  webhook_delivery_id uuid references admin_security_trust_webhook_deliveries(id) on delete set null,
  billing_account_id uuid references admin_security_trust_billing_accounts(id) on delete set null,

  dedupe_key text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  occurrence_count integer not null default 1,

  acknowledged_at timestamptz,
  acknowledged_by_auth_user_id uuid,
  acknowledged_by_admin_user_id uuid references admin_users(id) on delete set null,

  resolved_at timestamptz,
  resolved_by_auth_user_id uuid,
  resolved_by_admin_user_id uuid references admin_users(id) on delete set null,
  resolution_note text,

  escalated boolean not null default false,
  escalation_level integer not null default 0,
  next_escalation_at timestamptz,

  alert_payload jsonb not null default '{}'::jsonb,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_trust_alert_events_status_check
  check (
    status in (
      'open',
      'acknowledged',
      'resolved',
      'suppressed',
      'expired',
      'archived'
    )
  ),

  constraint admin_security_trust_alert_events_source_module_check
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

  constraint admin_security_trust_alert_events_severity_check
  check (
    severity in (
      'info',
      'low',
      'medium',
      'high',
      'critical'
    )
  ),

  constraint admin_security_trust_alert_events_priority_check
  check (
    alert_priority in (
      'low',
      'medium',
      'high',
      'critical'
    )
  ),

  constraint admin_security_trust_alert_events_title_check
  check (length(trim(title)) > 0),

  constraint admin_security_trust_alert_events_summary_check
  check (length(trim(summary)) > 0),

  unique (dedupe_key)
);

create index if not exists admin_security_trust_alert_events_status_idx
on admin_security_trust_alert_events (status, alert_priority, created_at desc);

create index if not exists admin_security_trust_alert_events_customer_idx
on admin_security_trust_alert_events (customer_name, customer_domain, status, severity);

create index if not exists admin_security_trust_alert_events_source_idx
on admin_security_trust_alert_events (source_module, source_table, source_id);

create index if not exists admin_security_trust_alert_events_escalation_idx
on admin_security_trust_alert_events (status, next_escalation_at, escalation_level);

drop trigger if exists admin_security_trust_alert_events_set_updated_at
on admin_security_trust_alert_events;

create trigger admin_security_trust_alert_events_set_updated_at
before update on admin_security_trust_alert_events
for each row
execute function set_updated_at();

create table if not exists admin_security_trust_alert_notifications (
  id uuid primary key default gen_random_uuid(),

  alert_notification_key text not null unique,

  status text not null default 'pending',

  alert_event_id uuid not null references admin_security_trust_alert_events(id) on delete cascade,
  alert_policy_id uuid references admin_security_trust_alert_policies(id) on delete set null,
  alert_channel_id uuid references admin_security_trust_alert_channels(id) on delete set null,
  alert_recipient_id uuid references admin_security_trust_alert_recipients(id) on delete set null,

  channel_type text not null,

  customer_name text,
  customer_domain text,

  recipient_name text,
  recipient_address text,

  title text not null,
  body text not null,

  severity text not null,
  alert_priority text not null,

  delivery_payload jsonb not null default '{}'::jsonb,
  delivery_headers jsonb not null default '{}'::jsonb,

  attempt_count integer not null default 0,
  max_attempts integer not null default 5,

  next_attempt_at timestamptz not null default now(),
  last_attempt_at timestamptz,

  delivered_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,

  response_status integer,
  response_body_preview text,
  last_error text,

  idempotency_key text not null unique,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_trust_alert_notifications_status_check
  check (
    status in (
      'pending',
      'attempting',
      'delivered',
      'retry_scheduled',
      'failed',
      'cancelled',
      'suppressed',
      'archived'
    )
  ),

  constraint admin_security_trust_alert_notifications_channel_type_check
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

  constraint admin_security_trust_alert_notifications_severity_check
  check (
    severity in (
      'info',
      'low',
      'medium',
      'high',
      'critical'
    )
  ),

  constraint admin_security_trust_alert_notifications_priority_check
  check (
    alert_priority in (
      'low',
      'medium',
      'high',
      'critical'
    )
  ),

  constraint admin_security_trust_alert_notifications_attempts_check
  check (attempt_count >= 0 and max_attempts > 0)
);

create index if not exists admin_security_trust_alert_notifications_due_idx
on admin_security_trust_alert_notifications (status, next_attempt_at);

create index if not exists admin_security_trust_alert_notifications_event_idx
on admin_security_trust_alert_notifications (alert_event_id, status);

create index if not exists admin_security_trust_alert_notifications_recipient_idx
on admin_security_trust_alert_notifications (alert_recipient_id, status, created_at desc);

drop trigger if exists admin_security_trust_alert_notifications_set_updated_at
on admin_security_trust_alert_notifications;

create trigger admin_security_trust_alert_notifications_set_updated_at
before update on admin_security_trust_alert_notifications
for each row
execute function set_updated_at();

create table if not exists admin_security_trust_alert_delivery_attempts (
  id uuid primary key default gen_random_uuid(),

  alert_delivery_attempt_key text not null unique,

  alert_notification_id uuid not null references admin_security_trust_alert_notifications(id) on delete cascade,
  alert_event_id uuid not null references admin_security_trust_alert_events(id) on delete cascade,

  attempt_number integer not null,

  channel_type text not null,

  status text not null default 'started',

  started_at timestamptz not null default now(),
  completed_at timestamptz,

  duration_ms integer,

  response_status integer,
  response_body_preview text,

  error_code text,
  error_message text,

  worker_id text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint admin_security_trust_alert_delivery_attempts_status_check
  check (
    status in (
      'started',
      'succeeded',
      'failed',
      'timeout',
      'cancelled'
    )
  ),

  constraint admin_security_trust_alert_delivery_attempts_channel_type_check
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

  constraint admin_security_trust_alert_delivery_attempts_number_check
  check (attempt_number > 0)
);

create index if not exists admin_security_trust_alert_delivery_attempts_notification_idx
on admin_security_trust_alert_delivery_attempts (alert_notification_id, attempt_number);

create index if not exists admin_security_trust_alert_delivery_attempts_event_idx
on admin_security_trust_alert_delivery_attempts (alert_event_id, created_at desc);

create table if not exists admin_security_trust_alert_audit_events (
  id uuid primary key default gen_random_uuid(),

  alert_audit_event_key text not null unique,

  event_type text not null,
  event_action text not null,

  status text not null default 'recorded',

  alert_event_id uuid references admin_security_trust_alert_events(id) on delete set null,
  alert_notification_id uuid references admin_security_trust_alert_notifications(id) on delete set null,
  alert_policy_id uuid references admin_security_trust_alert_policies(id) on delete set null,
  alert_channel_id uuid references admin_security_trust_alert_channels(id) on delete set null,
  alert_recipient_id uuid references admin_security_trust_alert_recipients(id) on delete set null,

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

  constraint admin_security_trust_alert_audit_events_type_check
  check (
    event_type in (
      'alert_event_created',
      'alert_event_acknowledged',
      'alert_event_resolved',
      'alert_event_escalated',
      'notification_created',
      'notification_delivered',
      'notification_failed',
      'notification_suppressed',
      'policy_created',
      'channel_created',
      'recipient_created',
      'delivery_attempt_recorded',
      'other'
    )
  ),

  constraint admin_security_trust_alert_audit_events_status_check
  check (
    status in (
      'recorded',
      'failed',
      'archived'
    )
  )
);

create index if not exists admin_security_trust_alert_audit_events_event_idx
on admin_security_trust_alert_audit_events (event_type, created_at desc);

create index if not exists admin_security_trust_alert_audit_events_alert_idx
on admin_security_trust_alert_audit_events (alert_event_id, created_at desc);
