-- Step 9.88 — Trust Command Center v2 (tables, indexes, triggers).
-- Runs after 222_admin_security_trust_ai_analyst_anomaly_governance_intelligence_v2.sql.
-- Product: unified operating surface — shortest path from risk signal to accountable action.
-- IA: Trust Command Center → Overview, Global Posture, Customer Posture, Cards, Queue, Timeline, Integrity.
-- Rules: cards/queue link to source modules; global posture computed; resolved queue requires note.

create table if not exists admin_security_trust_command_center_snapshots (
  id uuid primary key default gen_random_uuid(),

  command_snapshot_key text not null unique,

  status text not null default 'active',

  snapshot_scope text not null default 'global',

  customer_name text,
  customer_domain text,

  posture_level text not null default 'healthy',
  posture_score numeric(8,4) not null default 100,

  open_incident_count integer not null default 0,
  critical_incident_count integer not null default 0,
  high_incident_count integer not null default 0,

  open_ai_finding_count integer not null default 0,
  critical_ai_finding_count integer not null default 0,
  high_ai_finding_count integer not null default 0,

  open_recommended_action_count integer not null default 0,
  critical_recommended_action_count integer not null default 0,
  high_recommended_action_count integer not null default 0,

  failed_verification_count_24h integer not null default 0,
  proof_health_issue_count integer not null default 0,

  risky_published_proof_count integer not null default 0,
  critical_published_notice_count integer not null default 0,

  billing_usage_warning_count integer not null default 0,
  billing_usage_exceeded_count integer not null default 0,
  current_period_overage_cents integer not null default 0,

  dead_lettered_webhook_delivery_count integer not null default 0,
  due_webhook_delivery_count integer not null default 0,
  failed_export_job_count_24h integer not null default 0,

  active_customer_count integer not null default 0,
  high_or_critical_customer_risk_count integer not null default 0,

  summary_title text,
  summary_body text,

  snapshot_payload jsonb not null default '{}'::jsonb,

  computed_at timestamptz not null default now(),

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_trust_command_center_snapshots_status_check
  check (
    status in (
      'active',
      'superseded',
      'archived'
    )
  ),

  constraint admin_security_trust_command_center_snapshots_scope_check
  check (
    snapshot_scope in (
      'global',
      'customer'
    )
  ),

  constraint admin_security_trust_command_center_snapshots_posture_check
  check (
    posture_level in (
      'healthy',
      'watch',
      'elevated',
      'critical'
    )
  ),

  constraint admin_security_trust_command_center_snapshots_score_check
  check (posture_score >= 0 and posture_score <= 100)
);

create index if not exists admin_security_trust_command_center_snapshots_scope_idx
on admin_security_trust_command_center_snapshots (snapshot_scope, customer_name, customer_domain, computed_at desc);

create index if not exists admin_security_trust_command_center_snapshots_posture_idx
on admin_security_trust_command_center_snapshots (posture_level, computed_at desc);

drop trigger if exists admin_security_trust_command_center_snapshots_set_updated_at
on admin_security_trust_command_center_snapshots;

create trigger admin_security_trust_command_center_snapshots_set_updated_at
before update on admin_security_trust_command_center_snapshots
for each row
execute function set_updated_at();

create table if not exists admin_security_trust_command_center_cards (
  id uuid primary key default gen_random_uuid(),

  command_card_key text not null unique,

  status text not null default 'active',

  snapshot_id uuid
    references admin_security_trust_command_center_snapshots(id)
    on delete cascade,

  card_type text not null,
  card_group text not null default 'overview',

  customer_name text,
  customer_domain text,

  title text not null,
  subtitle text,
  body text,

  severity text not null default 'info',
  priority text not null default 'medium',

  metric_value numeric(18,4),
  metric_unit text,
  metric_label text,

  trend_direction text,
  trend_value numeric(18,4),

  target_table text,
  target_id uuid,
  target_key text,

  action_label text,
  action_route text,

  sort_order integer not null default 0,

  card_payload jsonb not null default '{}'::jsonb,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_trust_command_center_cards_status_check
  check (
    status in (
      'active',
      'hidden',
      'archived'
    )
  ),

  constraint admin_security_trust_command_center_cards_type_check
  check (
    card_type in (
      'posture',
      'incident',
      'ai_finding',
      'recommended_action',
      'proof_health',
      'verification',
      'transparency',
      'billing',
      'integration',
      'customer_risk',
      'system_health',
      'summary',
      'custom'
    )
  ),

  constraint admin_security_trust_command_center_cards_group_check
  check (
    card_group in (
      'overview',
      'risk',
      'operations',
      'customer',
      'billing',
      'integrations',
      'executive',
      'custom'
    )
  ),

  constraint admin_security_trust_command_center_cards_severity_check
  check (
    severity in (
      'info',
      'low',
      'medium',
      'high',
      'critical'
    )
  ),

  constraint admin_security_trust_command_center_cards_priority_check
  check (
    priority in (
      'low',
      'medium',
      'high',
      'critical'
    )
  ),

  constraint admin_security_trust_command_center_cards_trend_check
  check (
    trend_direction is null
    or trend_direction in (
      'up',
      'down',
      'flat',
      'unknown'
    )
  ),

  constraint admin_security_trust_command_center_cards_title_check
  check (length(trim(title)) > 0)
);

create index if not exists admin_security_trust_command_center_cards_snapshot_idx
on admin_security_trust_command_center_cards (snapshot_id, status, sort_order);

create index if not exists admin_security_trust_command_center_cards_group_idx
on admin_security_trust_command_center_cards (card_group, severity, priority);

create index if not exists admin_security_trust_command_center_cards_customer_idx
on admin_security_trust_command_center_cards (customer_name, customer_domain, severity);

drop trigger if exists admin_security_trust_command_center_cards_set_updated_at
on admin_security_trust_command_center_cards;

create trigger admin_security_trust_command_center_cards_set_updated_at
before update on admin_security_trust_command_center_cards
for each row
execute function set_updated_at();

create table if not exists admin_security_trust_command_center_queue (
  id uuid primary key default gen_random_uuid(),

  command_queue_item_key text not null unique,

  status text not null default 'open',

  queue_type text not null,
  queue_priority text not null default 'medium',

  customer_name text,
  customer_domain text,

  title text not null,
  summary text not null,

  source_module text not null,
  source_table text,
  source_id uuid,
  source_key text,

  severity text not null default 'medium',

  due_at timestamptz,
  escalated_at timestamptz,

  assigned_to_auth_user_id uuid,
  assigned_to_admin_user_id uuid references admin_users(id) on delete set null,

  acknowledged_at timestamptz,
  acknowledged_by_auth_user_id uuid,
  acknowledged_by_admin_user_id uuid references admin_users(id) on delete set null,

  resolved_at timestamptz,
  resolved_by_auth_user_id uuid,
  resolved_by_admin_user_id uuid references admin_users(id) on delete set null,
  resolution_note text,

  action_route text,
  action_label text,

  queue_payload jsonb not null default '{}'::jsonb,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_trust_command_center_queue_status_check
  check (
    status in (
      'open',
      'acknowledged',
      'assigned',
      'in_progress',
      'resolved',
      'dismissed',
      'archived'
    )
  ),

  constraint admin_security_trust_command_center_queue_type_check
  check (
    queue_type in (
      'incident',
      'ai_finding',
      'recommended_action',
      'customer_risk',
      'proof_health',
      'verification_failure',
      'transparency_risk',
      'billing_pressure',
      'integration_failure',
      'system_health',
      'other'
    )
  ),

  constraint admin_security_trust_command_center_queue_priority_check
  check (
    queue_priority in (
      'low',
      'medium',
      'high',
      'critical'
    )
  ),

  constraint admin_security_trust_command_center_queue_module_check
  check (
    source_module in (
      'incidents',
      'ai_analyst',
      'risk_scores',
      'proofs',
      'verification',
      'transparency',
      'billing',
      'integrations',
      'system',
      'manual'
    )
  ),

  constraint admin_security_trust_command_center_queue_severity_check
  check (
    severity in (
      'info',
      'low',
      'medium',
      'high',
      'critical'
    )
  ),

  constraint admin_security_trust_command_center_queue_title_check
  check (length(trim(title)) > 0),

  constraint admin_security_trust_command_center_queue_summary_check
  check (length(trim(summary)) > 0)
);

create index if not exists admin_security_trust_command_center_queue_status_idx
on admin_security_trust_command_center_queue (status, queue_priority, created_at desc);

create index if not exists admin_security_trust_command_center_queue_customer_idx
on admin_security_trust_command_center_queue (customer_name, customer_domain, status, queue_priority);

create index if not exists admin_security_trust_command_center_queue_source_idx
on admin_security_trust_command_center_queue (source_module, source_table, source_id);

drop trigger if exists admin_security_trust_command_center_queue_set_updated_at
on admin_security_trust_command_center_queue;

create trigger admin_security_trust_command_center_queue_set_updated_at
before update on admin_security_trust_command_center_queue
for each row
execute function set_updated_at();

create table if not exists admin_security_trust_command_center_timeline (
  id uuid primary key default gen_random_uuid(),

  command_timeline_key text not null unique,

  status text not null default 'visible',

  event_type text not null,
  event_group text not null default 'operations',

  customer_name text,
  customer_domain text,

  title text not null,
  summary text,

  severity text not null default 'info',

  source_module text not null,
  source_table text,
  source_id uuid,
  source_key text,

  occurred_at timestamptz not null default now(),

  actor_type text not null default 'system',
  actor_auth_user_id uuid,
  actor_admin_user_id uuid references admin_users(id) on delete set null,
  actor_email text,

  timeline_payload jsonb not null default '{}'::jsonb,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint admin_security_trust_command_center_timeline_status_check
  check (
    status in (
      'visible',
      'hidden',
      'archived'
    )
  ),

  constraint admin_security_trust_command_center_timeline_group_check
  check (
    event_group in (
      'operations',
      'risk',
      'incident',
      'proof',
      'verification',
      'transparency',
      'billing',
      'integration',
      'ai',
      'system',
      'custom'
    )
  ),

  constraint admin_security_trust_command_center_timeline_module_check
  check (
    source_module in (
      'incidents',
      'ai_analyst',
      'risk_scores',
      'proofs',
      'verification',
      'transparency',
      'billing',
      'integrations',
      'system',
      'manual'
    )
  ),

  constraint admin_security_trust_command_center_timeline_severity_check
  check (
    severity in (
      'info',
      'low',
      'medium',
      'high',
      'critical'
    )
  ),

  constraint admin_security_trust_command_center_timeline_title_check
  check (length(trim(title)) > 0)
);

create index if not exists admin_security_trust_command_center_timeline_time_idx
on admin_security_trust_command_center_timeline (occurred_at desc);

create index if not exists admin_security_trust_command_center_timeline_customer_idx
on admin_security_trust_command_center_timeline (customer_name, customer_domain, occurred_at desc);

create index if not exists admin_security_trust_command_center_timeline_source_idx
on admin_security_trust_command_center_timeline (source_module, source_table, source_id);

create table if not exists admin_security_trust_command_center_events (
  id uuid primary key default gen_random_uuid(),

  command_event_key text not null unique,

  event_type text not null,
  event_action text not null,

  status text not null default 'recorded',

  snapshot_id uuid references admin_security_trust_command_center_snapshots(id) on delete set null,
  card_id uuid references admin_security_trust_command_center_cards(id) on delete set null,
  queue_item_id uuid references admin_security_trust_command_center_queue(id) on delete set null,
  timeline_item_id uuid references admin_security_trust_command_center_timeline(id) on delete set null,

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

  constraint admin_security_trust_command_center_events_type_check
  check (
    event_type in (
      'snapshot_created',
      'card_created',
      'queue_item_created',
      'queue_item_acknowledged',
      'queue_item_resolved',
      'timeline_item_created',
      'summary_generated',
      'command_action_executed',
      'other'
    )
  ),

  constraint admin_security_trust_command_center_events_status_check
  check (
    status in (
      'recorded',
      'failed',
      'archived'
    )
  )
);

create index if not exists admin_security_trust_command_center_events_type_idx
on admin_security_trust_command_center_events (event_type, created_at desc);

create index if not exists admin_security_trust_command_center_events_customer_idx
on admin_security_trust_command_center_events (customer_name, customer_domain, created_at desc);
