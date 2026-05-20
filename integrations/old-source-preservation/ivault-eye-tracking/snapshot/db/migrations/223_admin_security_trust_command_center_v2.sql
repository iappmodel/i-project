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
-- Trust Command Center v2 — PL/pgSQL (aligned with repo schema: webhook columns, export jobs, proof_health, verification).

create or replace function record_admin_security_trust_command_center_event(
  p_event_type text,
  p_event_action text,
  p_snapshot_id uuid default null,
  p_card_id uuid default null,
  p_queue_item_id uuid default null,
  p_timeline_item_id uuid default null,
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
    'trust_command_center_event:' ||
    p_event_type || ':' ||
    substr(encode(gen_random_bytes(12), 'hex'), 1, 24);

  insert into admin_security_trust_command_center_events (
    command_event_key,
    event_type,
    event_action,
    status,
    snapshot_id,
    card_id,
    queue_item_id,
    timeline_item_id,
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
    p_snapshot_id,
    p_card_id,
    p_queue_item_id,
    p_timeline_item_id,
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

create or replace function create_admin_security_trust_command_timeline_item(
  p_event_type text,
  p_event_group text,
  p_title text,
  p_summary text default null,
  p_severity text default 'info',
  p_customer_name text default null,
  p_customer_domain text default null,
  p_source_module text default 'system',
  p_source_table text default null,
  p_source_id uuid default null,
  p_source_key text default null,
  p_occurred_at timestamptz default now(),
  p_actor_type text default 'system',
  p_actor_auth_user_id uuid default null,
  p_actor_admin_user_id uuid default null,
  p_actor_email text default null,
  p_timeline_payload jsonb default '{}'::jsonb,
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
    'trust_command_timeline:' ||
    p_event_type || ':' ||
    coalesce(p_source_key, '') || ':' ||
    substr(encode(gen_random_bytes(8), 'hex'), 1, 16);

  insert into admin_security_trust_command_center_timeline (
    command_timeline_key,
    status,
    event_type,
    event_group,
    customer_name,
    customer_domain,
    title,
    summary,
    severity,
    source_module,
    source_table,
    source_id,
    source_key,
    occurred_at,
    actor_type,
    actor_auth_user_id,
    actor_admin_user_id,
    actor_email,
    timeline_payload,
    request_id,
    metadata
  )
  values (
    v_key,
    'visible',
    p_event_type,
    coalesce(p_event_group, 'operations'),
    p_customer_name,
    p_customer_domain,
    p_title,
    p_summary,
    coalesce(p_severity, 'info'),
    coalesce(p_source_module, 'system'),
    p_source_table,
    p_source_id,
    p_source_key,
    coalesce(p_occurred_at, now()),
    coalesce(p_actor_type, 'system'),
    p_actor_auth_user_id,
    p_actor_admin_user_id,
    p_actor_email,
    coalesce(p_timeline_payload, '{}'::jsonb),
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  perform record_admin_security_trust_command_center_event(
    'timeline_item_created',
    'created',
    null,
    null,
    null,
    v_id,
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
  );

  return v_id;
end;
$$;

create or replace function upsert_admin_security_trust_command_queue_item(
  p_queue_type text,
  p_queue_priority text,
  p_title text,
  p_summary text,
  p_source_module text,
  p_source_table text default null,
  p_source_id uuid default null,
  p_source_key text default null,
  p_severity text default 'medium',
  p_customer_name text default null,
  p_customer_domain text default null,
  p_due_at timestamptz default null,
  p_action_route text default null,
  p_action_label text default null,
  p_queue_payload jsonb default '{}'::jsonb,
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
    'trust_command_queue:' ||
    p_source_module || ':' ||
    coalesce(p_source_table, '') || ':' ||
    coalesce(p_source_id::text, '') || ':' ||
    coalesce(p_source_key, '') || ':' ||
    p_queue_type;

  insert into admin_security_trust_command_center_queue (
    command_queue_item_key,
    status,
    queue_type,
    queue_priority,
    customer_name,
    customer_domain,
    title,
    summary,
    source_module,
    source_table,
    source_id,
    source_key,
    severity,
    due_at,
    action_route,
    action_label,
    queue_payload,
    request_id,
    metadata
  )
  values (
    v_key,
    'open',
    p_queue_type,
    coalesce(p_queue_priority, 'medium'),
    p_customer_name,
    p_customer_domain,
    p_title,
    p_summary,
    p_source_module,
    p_source_table,
    p_source_id,
    p_source_key,
    coalesce(p_severity, 'medium'),
    p_due_at,
    p_action_route,
    p_action_label,
    coalesce(p_queue_payload, '{}'::jsonb),
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (command_queue_item_key)
  do update set
    status = case
      when admin_security_trust_command_center_queue.status in ('resolved', 'dismissed')
      then admin_security_trust_command_center_queue.status
      else 'open'
    end,
    queue_priority = excluded.queue_priority,
    severity = excluded.severity,
    title = excluded.title,
    summary = excluded.summary,
    due_at = excluded.due_at,
    action_route = excluded.action_route,
    action_label = excluded.action_label,
    queue_payload = excluded.queue_payload,
    metadata = admin_security_trust_command_center_queue.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_id;

  perform record_admin_security_trust_command_center_event(
    'queue_item_created',
    'created_or_updated',
    null,
    null,
    v_id,
    null,
    p_customer_name,
    p_customer_domain,
    'system',
    null,
    null,
    null,
    p_title,
    p_summary,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_id;
end;
$$;

create or replace function compute_admin_security_trust_command_center_snapshot(
  p_customer_name text default null,
  p_customer_domain text default null,
  p_worker_id text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_snapshot_id uuid;
  v_key text;

  v_open_incidents integer;
  v_critical_incidents integer;
  v_high_incidents integer;

  v_open_findings integer;
  v_critical_findings integer;
  v_high_findings integer;

  v_open_actions integer;
  v_critical_actions integer;
  v_high_actions integer;

  v_failed_verifications integer;
  v_proof_health_issues integer;

  v_risky_proofs integer;
  v_critical_notices integer;

  v_usage_warnings integer;
  v_usage_exceeded integer;
  v_overage_cents integer;

  v_dead_letters integer;
  v_due_deliveries integer;
  v_failed_exports integer;

  v_active_customers integer;
  v_high_risk_customers integer;

  v_score numeric;
  v_posture text;
  v_title text;
  v_body text;
begin
  select
    count(*),
    count(*) filter (where severity = 'critical'),
    count(*) filter (where severity = 'high')
  into v_open_incidents, v_critical_incidents, v_high_incidents
  from admin_security_trust_incidents
  where status in ('open', 'acknowledged', 'investigating', 'escalated', 'mitigating')
    and (p_customer_name is null or customer_name = p_customer_name)
    and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''));

  select
    count(*),
    count(*) filter (where severity = 'critical'),
    count(*) filter (where severity = 'high')
  into v_open_findings, v_critical_findings, v_high_findings
  from admin_security_trust_ai_findings
  where status in ('open', 'acknowledged', 'investigating')
    and (p_customer_name is null or customer_name = p_customer_name)
    and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''));

  select
    count(*),
    count(*) filter (where action_priority = 'critical'),
    count(*) filter (where action_priority = 'high')
  into v_open_actions, v_critical_actions, v_high_actions
  from admin_security_trust_ai_recommended_actions
  where status = 'open'
    and (p_customer_name is null or customer_name = p_customer_name)
    and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''));

  if p_customer_name is null and p_customer_domain is null then
    select count(*)
    into v_failed_verifications
    from admin_security_public_verification_results
    where created_at >= now() - interval '24 hours'
      and (
        verified is false
        or verification_status in ('failed')
      );
  else
    v_failed_verifications := 0;
  end if;

  select count(*)
  into v_proof_health_issues
  from admin_security_proof_health_signals
  where status = 'active'
    and (p_customer_name is null or customer_name = p_customer_name)
    and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''));

  select count(*)
  into v_risky_proofs
  from admin_security_published_proof_status
  where status = 'published'
    and proof_status in ('verification_failed', 'incident_open', 'under_review')
    and (p_customer_name is null or customer_name = p_customer_name)
    and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''));

  select count(*)
  into v_critical_notices
  from admin_security_published_trust_notices
  where status = 'published'
    and public_severity = 'critical'
    and (p_customer_name is null or customer_name = p_customer_name)
    and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''));

  select
    count(*) filter (where usage_percent >= 80 and usage_percent < 100),
    count(*) filter (where usage_percent >= 100),
    coalesce(sum(overage_amount_cents), 0)
  into v_usage_warnings, v_usage_exceeded, v_overage_cents
  from admin_security_trust_usage_rollups
  where billing_period_start = date_trunc('month', now())
    and (p_customer_name is null or customer_name = p_customer_name)
    and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''));

  select count(*)
  into v_dead_letters
  from admin_security_trust_webhook_deliveries
  where status = 'dead_lettered'
    and created_at >= now() - interval '24 hours'
    and (p_customer_name is null or customer_name = p_customer_name)
    and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''));

  select count(*)
  into v_due_deliveries
  from admin_security_trust_webhook_deliveries
  where status = 'pending'
    and created_at <= now() - interval '1 hour'
    and (p_customer_name is null or customer_name = p_customer_name)
    and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''));

  if p_customer_name is null and p_customer_domain is null then
    select count(*)
    into v_failed_exports
    from admin_security_archive_export_jobs
    where status = 'failed'
      and created_at >= now() - interval '24 hours';
  else
    v_failed_exports := 0;
  end if;

  select count(*)
  into v_active_customers
  from admin_security_customer_trust_entitlements
  where status = 'active'
    and (p_customer_name is null or customer_name = p_customer_name)
    and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''));

  select count(*)
  into v_high_risk_customers
  from admin_security_customer_trust_risk_scores
  where computed_at >= now() - interval '24 hours'
    and risk_level in ('high', 'critical')
    and (p_customer_name is null or customer_name = p_customer_name)
    and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''));

  v_score :=
    greatest(
      0,
      100
      - (coalesce(v_critical_incidents, 0) * 18)
      - (coalesce(v_high_incidents, 0) * 10)
      - (coalesce(v_critical_findings, 0) * 12)
      - (coalesce(v_high_findings, 0) * 7)
      - (coalesce(v_critical_actions, 0) * 8)
      - (coalesce(v_high_actions, 0) * 4)
      - least(coalesce(v_failed_verifications, 0), 100) * 0.2
      - (coalesce(v_dead_letters, 0) * 2)
      - (coalesce(v_usage_exceeded, 0) * 5)
      - (coalesce(v_high_risk_customers, 0) * 5)
    );

  v_posture :=
    case
      when v_score < 40 or coalesce(v_critical_incidents, 0) > 0 or coalesce(v_critical_findings, 0) > 0 then 'critical'
      when v_score < 70 or coalesce(v_high_incidents, 0) > 0 or coalesce(v_high_findings, 0) > 0 then 'elevated'
      when v_score < 90 or coalesce(v_open_incidents, 0) > 0 or coalesce(v_open_findings, 0) > 0 then 'watch'
      else 'healthy'
    end;

  v_title :=
    case v_posture
      when 'critical' then 'Critical trust posture'
      when 'elevated' then 'Elevated trust posture'
      when 'watch' then 'Trust posture requires monitoring'
      else 'Trust posture healthy'
    end;

  v_body :=
    'Incidents: ' || coalesce(v_open_incidents, 0)::text ||
    ', AI findings: ' || coalesce(v_open_findings, 0)::text ||
    ', recommended actions: ' || coalesce(v_open_actions, 0)::text ||
    ', failed verifications 24h: ' || coalesce(v_failed_verifications, 0)::text ||
    ', dead-lettered webhooks 24h: ' || coalesce(v_dead_letters, 0)::text || '.';

  v_key :=
    'trust_command_snapshot:' ||
    coalesce(lower(regexp_replace(p_customer_name, '[^a-zA-Z0-9]+', '-', 'g')), 'global') ||
    ':' ||
    to_char(now(), 'YYYYMMDDHH24MISS') ||
    ':' ||
    substr(encode(gen_random_bytes(6), 'hex'), 1, 12);

  insert into admin_security_trust_command_center_snapshots (
    command_snapshot_key,
    status,
    snapshot_scope,
    customer_name,
    customer_domain,
    posture_level,
    posture_score,
    open_incident_count,
    critical_incident_count,
    high_incident_count,
    open_ai_finding_count,
    critical_ai_finding_count,
    high_ai_finding_count,
    open_recommended_action_count,
    critical_recommended_action_count,
    high_recommended_action_count,
    failed_verification_count_24h,
    proof_health_issue_count,
    risky_published_proof_count,
    critical_published_notice_count,
    billing_usage_warning_count,
    billing_usage_exceeded_count,
    current_period_overage_cents,
    dead_lettered_webhook_delivery_count,
    due_webhook_delivery_count,
    failed_export_job_count_24h,
    active_customer_count,
    high_or_critical_customer_risk_count,
    summary_title,
    summary_body,
    snapshot_payload,
    request_id,
    metadata
  )
  values (
    v_key,
    'active',
    case when p_customer_name is null then 'global' else 'customer' end,
    p_customer_name,
    p_customer_domain,
    v_posture,
    v_score,
    coalesce(v_open_incidents, 0),
    coalesce(v_critical_incidents, 0),
    coalesce(v_high_incidents, 0),
    coalesce(v_open_findings, 0),
    coalesce(v_critical_findings, 0),
    coalesce(v_high_findings, 0),
    coalesce(v_open_actions, 0),
    coalesce(v_critical_actions, 0),
    coalesce(v_high_actions, 0),
    coalesce(v_failed_verifications, 0),
    coalesce(v_proof_health_issues, 0),
    coalesce(v_risky_proofs, 0),
    coalesce(v_critical_notices, 0),
    coalesce(v_usage_warnings, 0),
    coalesce(v_usage_exceeded, 0),
    coalesce(v_overage_cents, 0),
    coalesce(v_dead_letters, 0),
    coalesce(v_due_deliveries, 0),
    coalesce(v_failed_exports, 0),
    coalesce(v_active_customers, 0),
    coalesce(v_high_risk_customers, 0),
    v_title,
    v_body,
    jsonb_build_object(
      'computedBy', p_worker_id,
      'scope', case when p_customer_name is null then 'global' else 'customer' end
    ),
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_snapshot_id;

  update admin_security_trust_command_center_snapshots
  set status = 'superseded', updated_at = now()
  where id <> v_snapshot_id
    and snapshot_scope = case when p_customer_name is null then 'global' else 'customer' end
    and coalesce(customer_name, '') = coalesce(p_customer_name, '')
    and coalesce(customer_domain, '') = coalesce(p_customer_domain, '')
    and status = 'active';

  perform record_admin_security_trust_command_center_event(
    'snapshot_created',
    'created',
    v_snapshot_id,
    null,
    null,
    null,
    p_customer_name,
    p_customer_domain,
    'worker',
    null,
    null,
    null,
    v_title,
    v_body,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_snapshot_id;
end;
$$;

create or replace function seed_admin_security_trust_command_center_cards(
  p_snapshot_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_snapshot admin_security_trust_command_center_snapshots%rowtype;
  v_count integer := 0;
begin
  select *
  into v_snapshot
  from admin_security_trust_command_center_snapshots
  where id = p_snapshot_id;

  if v_snapshot.id is null then
    raise exception 'trust command center snapshot not found: %', p_snapshot_id;
  end if;

  insert into admin_security_trust_command_center_cards (
    command_card_key,
    status,
    snapshot_id,
    card_type,
    card_group,
    customer_name,
    customer_domain,
    title,
    subtitle,
    body,
    severity,
    priority,
    metric_value,
    metric_unit,
    metric_label,
    action_label,
    action_route,
    sort_order,
    card_payload,
    request_id,
    metadata
  )
  values
    (
      'trust_command_card:' || v_snapshot.command_snapshot_key || ':posture',
      'active',
      v_snapshot.id,
      'posture',
      'overview',
      v_snapshot.customer_name,
      v_snapshot.customer_domain,
      v_snapshot.summary_title,
      'Score ' || round(v_snapshot.posture_score, 1)::text,
      v_snapshot.summary_body,
      case
        when v_snapshot.posture_level = 'critical' then 'critical'
        when v_snapshot.posture_level = 'elevated' then 'high'
        when v_snapshot.posture_level = 'watch' then 'medium'
        else 'info'
      end,
      case
        when v_snapshot.posture_level = 'critical' then 'critical'
        when v_snapshot.posture_level = 'elevated' then 'high'
        when v_snapshot.posture_level = 'watch' then 'medium'
        else 'low'
      end,
      v_snapshot.posture_score,
      'score',
      'Posture score',
      'Open command center',
      '/admin/trust-command-center',
      10,
      jsonb_build_object('postureLevel', v_snapshot.posture_level),
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    ),
    (
      'trust_command_card:' || v_snapshot.command_snapshot_key || ':incidents',
      'active',
      v_snapshot.id,
      'incident',
      'risk',
      v_snapshot.customer_name,
      v_snapshot.customer_domain,
      'Open incidents',
      v_snapshot.critical_incident_count::text || ' critical · ' || v_snapshot.high_incident_count::text || ' high',
      'Open trust incidents requiring operational handling.',
      case when v_snapshot.critical_incident_count > 0 then 'critical' when v_snapshot.high_incident_count > 0 then 'high' when v_snapshot.open_incident_count > 0 then 'medium' else 'info' end,
      case when v_snapshot.critical_incident_count > 0 then 'critical' when v_snapshot.high_incident_count > 0 then 'high' else 'medium' end,
      v_snapshot.open_incident_count,
      'count',
      'Incidents',
      'Review incidents',
      '/admin/security-trust-incidents',
      20,
      '{}'::jsonb,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    ),
    (
      'trust_command_card:' || v_snapshot.command_snapshot_key || ':ai_findings',
      'active',
      v_snapshot.id,
      'ai_finding',
      'risk',
      v_snapshot.customer_name,
      v_snapshot.customer_domain,
      'AI findings',
      v_snapshot.critical_ai_finding_count::text || ' critical · ' || v_snapshot.high_ai_finding_count::text || ' high',
      'Open AI analyst findings and anomaly signals.',
      case when v_snapshot.critical_ai_finding_count > 0 then 'critical' when v_snapshot.high_ai_finding_count > 0 then 'high' when v_snapshot.open_ai_finding_count > 0 then 'medium' else 'info' end,
      case when v_snapshot.critical_ai_finding_count > 0 then 'critical' when v_snapshot.high_ai_finding_count > 0 then 'high' else 'medium' end,
      v_snapshot.open_ai_finding_count,
      'count',
      'AI findings',
      'Review findings',
      '/admin/security-trust-ai-analyst/findings',
      30,
      '{}'::jsonb,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    ),
    (
      'trust_command_card:' || v_snapshot.command_snapshot_key || ':recommended_actions',
      'active',
      v_snapshot.id,
      'recommended_action',
      'operations',
      v_snapshot.customer_name,
      v_snapshot.customer_domain,
      'Recommended actions',
      v_snapshot.critical_recommended_action_count::text || ' critical · ' || v_snapshot.high_recommended_action_count::text || ' high',
      'Open system-recommended operator actions.',
      case when v_snapshot.critical_recommended_action_count > 0 then 'critical' when v_snapshot.high_recommended_action_count > 0 then 'high' when v_snapshot.open_recommended_action_count > 0 then 'medium' else 'info' end,
      case when v_snapshot.critical_recommended_action_count > 0 then 'critical' when v_snapshot.high_recommended_action_count > 0 then 'high' else 'medium' end,
      v_snapshot.open_recommended_action_count,
      'count',
      'Actions',
      'Review actions',
      '/admin/security-trust-ai-analyst/recommended-actions',
      40,
      '{}'::jsonb,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    ),
    (
      'trust_command_card:' || v_snapshot.command_snapshot_key || ':verifications',
      'active',
      v_snapshot.id,
      'verification',
      'operations',
      v_snapshot.customer_name,
      v_snapshot.customer_domain,
      'Failed verifications 24h',
      'Public verification failures in the last 24 hours.',
      'High values may indicate invalid proof links, tampering, abuse, or stale artifacts.',
      case when v_snapshot.failed_verification_count_24h >= 50 then 'high' when v_snapshot.failed_verification_count_24h > 0 then 'medium' else 'info' end,
      case when v_snapshot.failed_verification_count_24h >= 50 then 'high' else 'medium' end,
      v_snapshot.failed_verification_count_24h,
      'count',
      'Failed verifications',
      'Review verification results',
      '/admin/security-public-verification',
      50,
      '{}'::jsonb,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    ),
    (
      'trust_command_card:' || v_snapshot.command_snapshot_key || ':billing',
      'active',
      v_snapshot.id,
      'billing',
      'billing',
      v_snapshot.customer_name,
      v_snapshot.customer_domain,
      'Billing usage pressure',
      v_snapshot.billing_usage_exceeded_count::text || ' exceeded · ' || v_snapshot.billing_usage_warning_count::text || ' warning',
      'Trust usage approaching or exceeding customer entitlements.',
      case when v_snapshot.billing_usage_exceeded_count > 0 then 'high' when v_snapshot.billing_usage_warning_count > 0 then 'medium' else 'info' end,
      case when v_snapshot.billing_usage_exceeded_count > 0 then 'high' else 'medium' end,
      v_snapshot.current_period_overage_cents,
      'cents',
      'Current overage',
      'Review billing usage',
      '/admin/security-trust-billing/usage-rollups',
      60,
      '{}'::jsonb,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    ),
    (
      'trust_command_card:' || v_snapshot.command_snapshot_key || ':integrations',
      'active',
      v_snapshot.id,
      'integration',
      'integrations',
      v_snapshot.customer_name,
      v_snapshot.customer_domain,
      'Integration health',
      v_snapshot.dead_lettered_webhook_delivery_count::text || ' dead-lettered · ' || v_snapshot.due_webhook_delivery_count::text || ' due',
      'Webhook and enterprise export health.',
      case when v_snapshot.dead_lettered_webhook_delivery_count > 0 or v_snapshot.failed_export_job_count_24h > 0 then 'medium' else 'info' end,
      case when v_snapshot.dead_lettered_webhook_delivery_count > 0 then 'high' else 'medium' end,
      v_snapshot.dead_lettered_webhook_delivery_count,
      'count',
      'Dead-lettered deliveries',
      'Review integrations',
      '/admin/security-trust-integrations',
      70,
      '{}'::jsonb,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    )
  on conflict (command_card_key)
  do update set
    status = excluded.status,
    title = excluded.title,
    subtitle = excluded.subtitle,
    body = excluded.body,
    severity = excluded.severity,
    priority = excluded.priority,
    metric_value = excluded.metric_value,
    action_label = excluded.action_label,
    action_route = excluded.action_route,
    card_payload = excluded.card_payload,
    updated_at = now();

  get diagnostics v_count = row_count;

  return jsonb_build_object(
    'snapshotId',
    v_snapshot.id,
    'cardsSeeded',
    v_count
  );
end;
$$;
-- Trust Command Center v2 — sync, refresh, lifecycle, views, scheduled jobs, errors, RLS, grants.

create or replace function sync_admin_security_trust_command_center_queue(
  p_customer_name text default null,
  p_customer_domain text default null,
  p_batch_size integer default 500,
  p_worker_id text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_count integer := 0;
  v_row record;
begin
  if p_batch_size <= 0 or p_batch_size > 5000 then
    raise exception 'batch size must be between 1 and 5000';
  end if;

  for v_row in
    select *
    from admin_security_trust_incidents
    where status in ('open', 'acknowledged', 'investigating', 'escalated', 'mitigating')
      and (p_customer_name is null or customer_name = p_customer_name)
      and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''))
    order by created_at desc
    limit p_batch_size
  loop
    perform upsert_admin_security_trust_command_queue_item(
      'incident',
      case when v_row.severity = 'critical' then 'critical' when v_row.severity = 'high' then 'high' else 'medium' end,
      v_row.title,
      coalesce(v_row.summary, 'Open trust incident requires review.'),
      'incidents',
      'admin_security_trust_incidents',
      v_row.id,
      v_row.incident_key,
      v_row.severity,
      v_row.customer_name,
      v_row.customer_domain,
      now() + interval '4 hours',
      '/admin/security-trust-incidents/' || v_row.id::text,
      'Open incident',
      jsonb_build_object(
        'incidentKey', v_row.incident_key,
        'incidentType', v_row.incident_type,
        'status', v_row.status
      ),
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    v_count := v_count + 1;
  end loop;

  for v_row in
    select *
    from admin_security_trust_ai_findings
    where status in ('open', 'acknowledged', 'investigating')
      and (p_customer_name is null or customer_name = p_customer_name)
      and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''))
    order by created_at desc
    limit p_batch_size
  loop
    perform upsert_admin_security_trust_command_queue_item(
      'ai_finding',
      case when v_row.severity = 'critical' then 'critical' when v_row.severity = 'high' then 'high' else 'medium' end,
      v_row.finding_title,
      v_row.finding_summary,
      'ai_analyst',
      'admin_security_trust_ai_findings',
      v_row.id,
      v_row.finding_key,
      v_row.severity,
      v_row.customer_name,
      v_row.customer_domain,
      now() + interval '8 hours',
      '/admin/security-trust-ai-analyst/findings/' || v_row.id::text,
      'Review finding',
      jsonb_build_object(
        'findingType', v_row.finding_type,
        'detectorFamily', v_row.detector_family,
        'confidence', v_row.confidence
      ),
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    v_count := v_count + 1;
  end loop;

  for v_row in
    select *
    from admin_security_trust_ai_recommended_actions
    where status = 'open'
      and (p_customer_name is null or customer_name = p_customer_name)
      and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''))
    order by created_at desc
    limit p_batch_size
  loop
    perform upsert_admin_security_trust_command_queue_item(
      'recommended_action',
      v_row.action_priority,
      v_row.title,
      v_row.summary,
      'ai_analyst',
      'admin_security_trust_ai_recommended_actions',
      v_row.id,
      v_row.recommended_action_key,
      case when v_row.action_priority = 'critical' then 'critical' when v_row.action_priority = 'high' then 'high' else 'medium' end,
      v_row.customer_name,
      v_row.customer_domain,
      now() + interval '12 hours',
      '/admin/security-trust-ai-analyst/recommended-actions/' || v_row.id::text,
      'Review action',
      jsonb_build_object(
        'actionType', v_row.action_type,
        'requiresApproval', v_row.requires_approval
      ),
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    v_count := v_count + 1;
  end loop;

  for v_row in
    select distinct on (customer_name, customer_domain) *
    from admin_security_customer_trust_risk_scores
    where risk_level in ('high', 'critical')
      and computed_at >= now() - interval '24 hours'
      and (p_customer_name is null or customer_name = p_customer_name)
      and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''))
    order by customer_name, customer_domain, computed_at desc
    limit p_batch_size
  loop
    perform upsert_admin_security_trust_command_queue_item(
      'customer_risk',
      case when v_row.risk_level = 'critical' then 'critical' else 'high' end,
      'High customer trust risk: ' || v_row.customer_name,
      'Customer trust risk score is ' || round(v_row.overall_risk_score, 1)::text || '.',
      'risk_scores',
      'admin_security_customer_trust_risk_scores',
      v_row.id,
      v_row.risk_score_key,
      case when v_row.risk_level = 'critical' then 'critical' else 'high' end,
      v_row.customer_name,
      v_row.customer_domain,
      now() + interval '12 hours',
      '/admin/security-trust-ai-analyst/risk-scores/' || v_row.id::text,
      'Review customer risk',
      jsonb_build_object(
        'riskLevel', v_row.risk_level,
        'overallRiskScore', v_row.overall_risk_score
      ),
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    v_count := v_count + 1;
  end loop;

  for v_row in
    select d.*
    from admin_security_trust_webhook_deliveries d
    where d.status = 'dead_lettered'
      and d.created_at >= now() - interval '24 hours'
      and (p_customer_name is null or d.customer_name = p_customer_name)
      and (p_customer_domain is null or coalesce(d.customer_domain, '') = coalesce(p_customer_domain, ''))
    order by d.dead_lettered_at desc nulls last
    limit p_batch_size
  loop
    perform upsert_admin_security_trust_command_queue_item(
      'integration_failure',
      'medium',
      'Webhook delivery dead-lettered',
      coalesce(v_row.last_error, 'Webhook delivery failed after maximum attempts.'),
      'integrations',
      'admin_security_trust_webhook_deliveries',
      v_row.id,
      v_row.webhook_delivery_key,
      'medium',
      v_row.customer_name,
      v_row.customer_domain,
      now() + interval '24 hours',
      '/admin/security-trust-integrations/deliveries/' || v_row.id::text,
      'Review delivery',
      jsonb_build_object(
        'eventType', v_row.event_namespace || '.' || v_row.event_type
      ),
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'queueItemsSynced',
    v_count
  );
end;
$$;

create or replace function sync_admin_security_trust_command_center_timeline(
  p_customer_name text default null,
  p_customer_domain text default null,
  p_batch_size integer default 500,
  p_worker_id text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_count integer := 0;
  v_row record;
begin
  if p_batch_size <= 0 or p_batch_size > 5000 then
    raise exception 'batch size must be between 1 and 5000';
  end if;

  for v_row in
    select *
    from admin_security_trust_incidents
    where created_at >= now() - interval '7 days'
      and (p_customer_name is null or customer_name = p_customer_name)
      and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''))
    order by created_at desc
    limit p_batch_size
  loop
    perform create_admin_security_trust_command_timeline_item(
      'incident.' || v_row.status,
      'incident',
      v_row.title,
      coalesce(v_row.summary, v_row.incident_type),
      v_row.severity,
      v_row.customer_name,
      v_row.customer_domain,
      'incidents',
      'admin_security_trust_incidents',
      v_row.id,
      v_row.incident_key,
      v_row.created_at,
      'system',
      null,
      null,
      null,
      jsonb_build_object(
        'incidentType', v_row.incident_type,
        'status', v_row.status
      ),
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    v_count := v_count + 1;
  end loop;

  for v_row in
    select *
    from admin_security_trust_ai_findings
    where created_at >= now() - interval '7 days'
      and (p_customer_name is null or customer_name = p_customer_name)
      and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''))
    order by created_at desc
    limit p_batch_size
  loop
    perform create_admin_security_trust_command_timeline_item(
      'ai_finding.' || v_row.finding_type,
      'ai',
      v_row.finding_title,
      v_row.finding_summary,
      v_row.severity,
      v_row.customer_name,
      v_row.customer_domain,
      'ai_analyst',
      'admin_security_trust_ai_findings',
      v_row.id,
      v_row.finding_key,
      v_row.created_at,
      'system',
      null,
      null,
      null,
      jsonb_build_object(
        'detectorFamily', v_row.detector_family,
        'confidence', v_row.confidence
      ),
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    v_count := v_count + 1;
  end loop;

  for v_row in
    select *
    from admin_security_trust_webhook_deliveries
    where status = 'dead_lettered'
      and dead_lettered_at >= now() - interval '7 days'
      and (p_customer_name is null or customer_name = p_customer_name)
      and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''))
    order by dead_lettered_at desc
    limit p_batch_size
  loop
    perform create_admin_security_trust_command_timeline_item(
      'integration.webhook_dead_lettered',
      'integration',
      'Webhook delivery dead-lettered',
      coalesce(v_row.last_error, 'Delivery failed after maximum attempts.'),
      'medium',
      v_row.customer_name,
      v_row.customer_domain,
      'integrations',
      'admin_security_trust_webhook_deliveries',
      v_row.id,
      v_row.webhook_delivery_key,
      coalesce(v_row.dead_lettered_at, v_row.created_at),
      'system',
      null,
      null,
      null,
      jsonb_build_object(
        'eventType', v_row.event_namespace || '.' || v_row.event_type
      ),
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'timelineItemsSynced',
    v_count
  );
end;
$$;

create or replace function refresh_admin_security_trust_command_center(
  p_customer_name text default null,
  p_customer_domain text default null,
  p_worker_id text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_snapshot_id uuid;
  v_cards jsonb;
  v_queue jsonb;
  v_timeline jsonb;
begin
  v_snapshot_id := compute_admin_security_trust_command_center_snapshot(
    p_customer_name,
    p_customer_domain,
    p_worker_id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  v_cards := seed_admin_security_trust_command_center_cards(
    v_snapshot_id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  v_queue := sync_admin_security_trust_command_center_queue(
    p_customer_name,
    p_customer_domain,
    500,
    p_worker_id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  v_timeline := sync_admin_security_trust_command_center_timeline(
    p_customer_name,
    p_customer_domain,
    500,
    p_worker_id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return jsonb_build_object(
    'snapshotId',
    v_snapshot_id,
    'cards',
    v_cards,
    'queue',
    v_queue,
    'timeline',
    v_timeline
  );
end;
$$;

create or replace function process_admin_security_trust_command_center_customers(
  p_batch_size integer default 500,
  p_worker_id text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_count integer := 0;
  v_customer record;
begin
  if p_batch_size <= 0 or p_batch_size > 1000 then
    raise exception 'batch size must be between 1 and 1000';
  end if;

  for v_customer in
    select distinct customer_name, customer_domain
    from admin_security_customer_trust_entitlements
    where status = 'active'
      and customer_name is not null
    order by customer_name
    limit p_batch_size
  loop
    perform refresh_admin_security_trust_command_center(
      v_customer.customer_name,
      v_customer.customer_domain,
      p_worker_id,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'command_center_customer_run_id',
        v_run_id
      )
    );

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'runId',
    v_run_id,
    'customersProcessed',
    v_count
  );
end;
$$;

create or replace function acknowledge_admin_security_trust_command_queue_item(
  p_admin_auth_user_id uuid,
  p_queue_item_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_item admin_security_trust_command_center_queue%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  update admin_security_trust_command_center_queue
  set
    status = 'acknowledged',
    acknowledged_at = now(),
    acknowledged_by_auth_user_id = p_admin_auth_user_id,
    acknowledged_by_admin_user_id = v_admin.id,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = p_queue_item_id
    and status = 'open'
  returning * into v_item;

  if v_item.id is null then
    raise exception 'trust command queue item not found or not open: %', p_queue_item_id;
  end if;

  perform record_admin_security_trust_command_center_event(
    'queue_item_acknowledged',
    'acknowledged',
    null,
    null,
    v_item.id,
    null,
    v_item.customer_name,
    v_item.customer_domain,
    'admin',
    p_admin_auth_user_id,
    v_admin.id,
    v_admin.email,
    'Command queue item acknowledged',
    v_item.title,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_item.id;
end;
$$;

create or replace function resolve_admin_security_trust_command_queue_item(
  p_admin_auth_user_id uuid,
  p_queue_item_id uuid,
  p_resolution_note text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_item admin_security_trust_command_center_queue%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_resolution_note is null or length(trim(p_resolution_note)) = 0 then
    raise exception 'trust command queue resolution note is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  update admin_security_trust_command_center_queue
  set
    status = 'resolved',
    resolved_at = now(),
    resolved_by_auth_user_id = p_admin_auth_user_id,
    resolved_by_admin_user_id = v_admin.id,
    resolution_note = p_resolution_note,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = p_queue_item_id
    and status in ('open', 'acknowledged', 'assigned', 'in_progress')
  returning * into v_item;

  if v_item.id is null then
    raise exception 'trust command queue item not found or not resolvable: %', p_queue_item_id;
  end if;

  perform record_admin_security_trust_command_center_event(
    'queue_item_resolved',
    'resolved',
    null,
    null,
    v_item.id,
    null,
    v_item.customer_name,
    v_item.customer_domain,
    'admin',
    p_admin_auth_user_id,
    v_admin.id,
    v_admin.email,
    'Command queue item resolved',
    p_resolution_note,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_item.id;
end;
$$;

create or replace view admin_security_trust_command_center_latest_snapshot as
select distinct on (snapshot_scope, coalesce(customer_name, ''), coalesce(customer_domain, ''))
  id as admin_security_trust_command_center_snapshot_id,
  command_snapshot_key,
  status,
  snapshot_scope,
  customer_name,
  customer_domain,
  posture_level,
  posture_score,
  open_incident_count,
  critical_incident_count,
  high_incident_count,
  open_ai_finding_count,
  critical_ai_finding_count,
  high_ai_finding_count,
  open_recommended_action_count,
  critical_recommended_action_count,
  high_recommended_action_count,
  failed_verification_count_24h,
  proof_health_issue_count,
  risky_published_proof_count,
  critical_published_notice_count,
  billing_usage_warning_count,
  billing_usage_exceeded_count,
  current_period_overage_cents,
  dead_lettered_webhook_delivery_count,
  due_webhook_delivery_count,
  failed_export_job_count_24h,
  active_customer_count,
  high_or_critical_customer_risk_count,
  summary_title,
  summary_body,
  computed_at,
  created_at,
  updated_at,
  metadata
from admin_security_trust_command_center_snapshots
where status = 'active'
order by snapshot_scope, coalesce(customer_name, ''), coalesce(customer_domain, ''), computed_at desc;

create or replace view admin_security_trust_command_center_card_dashboard as
select
  c.id as admin_security_trust_command_center_card_id,
  c.command_card_key,
  c.status,
  c.snapshot_id,
  s.command_snapshot_key,
  s.snapshot_scope,
  c.card_type,
  c.card_group,
  c.customer_name,
  c.customer_domain,
  c.title,
  c.subtitle,
  c.body,
  c.severity,
  c.priority,
  c.metric_value,
  c.metric_unit,
  c.metric_label,
  c.trend_direction,
  c.trend_value,
  c.target_table,
  c.target_id,
  c.target_key,
  c.action_label,
  c.action_route,
  c.sort_order,
  c.created_at,
  c.updated_at,
  c.metadata
from admin_security_trust_command_center_cards c
left join admin_security_trust_command_center_snapshots s
  on s.id = c.snapshot_id
order by c.sort_order asc, c.created_at desc;

create or replace view admin_security_trust_command_center_queue_dashboard as
select
  q.id as admin_security_trust_command_center_queue_item_id,
  q.command_queue_item_key,
  q.status,
  q.queue_type,
  q.queue_priority,
  q.customer_name,
  q.customer_domain,
  q.title,
  q.summary,
  q.source_module,
  q.source_table,
  q.source_id,
  q.source_key,
  q.severity,
  q.due_at,
  q.escalated_at,
  assigned.email as assigned_to_email,
  q.acknowledged_at,
  acknowledger.email as acknowledged_by_email,
  q.resolved_at,
  resolver.email as resolved_by_email,
  q.resolution_note,
  q.action_route,
  q.action_label,
  q.created_at,
  q.updated_at,
  q.metadata
from admin_security_trust_command_center_queue q
left join admin_users assigned
  on assigned.id = q.assigned_to_admin_user_id
left join admin_users acknowledger
  on acknowledger.id = q.acknowledged_by_admin_user_id
left join admin_users resolver
  on resolver.id = q.resolved_by_admin_user_id
order by
  case q.queue_priority
    when 'critical' then 1
    when 'high' then 2
    when 'medium' then 3
    else 4
  end,
  q.created_at desc;

create or replace view admin_security_trust_command_center_timeline_dashboard as
select
  t.id as admin_security_trust_command_center_timeline_id,
  t.command_timeline_key,
  t.status,
  t.event_type,
  t.event_group,
  t.customer_name,
  t.customer_domain,
  t.title,
  t.summary,
  t.severity,
  t.source_module,
  t.source_table,
  t.source_id,
  t.source_key,
  t.occurred_at,
  t.actor_type,
  t.actor_email,
  t.created_at,
  t.metadata
from admin_security_trust_command_center_timeline t
where t.status = 'visible'
order by t.occurred_at desc;

create or replace view admin_security_trust_command_center_integrity as
select
  (
    select posture_level
    from admin_security_trust_command_center_latest_snapshot
    where snapshot_scope = 'global'
    limit 1
  ) as global_posture_level,

  (
    select posture_score
    from admin_security_trust_command_center_latest_snapshot
    where snapshot_scope = 'global'
    limit 1
  ) as global_posture_score,

  (
    select count(*)
    from admin_security_trust_command_center_queue
    where status in ('open', 'acknowledged', 'assigned', 'in_progress')
  ) as open_queue_item_count,

  (
    select count(*)
    from admin_security_trust_command_center_queue
    where status in ('open', 'acknowledged', 'assigned', 'in_progress')
      and queue_priority = 'critical'
  ) as critical_queue_item_count,

  (
    select count(*)
    from admin_security_trust_command_center_queue
    where status in ('open', 'acknowledged', 'assigned', 'in_progress')
      and queue_priority = 'high'
  ) as high_queue_item_count,

  (
    select count(*)
    from admin_security_trust_command_center_latest_snapshot
    where snapshot_scope = 'customer'
      and posture_level in ('elevated', 'critical')
  ) as elevated_or_critical_customer_posture_count,

  (
    select count(*)
    from admin_security_trust_command_center_timeline
    where occurred_at >= now() - interval '24 hours'
      and severity in ('high', 'critical')
  ) as high_or_critical_timeline_events_24h,

  now() as checked_at;

grant select on admin_security_trust_command_center_latest_snapshot to admin_api_role;
grant select on admin_security_trust_command_center_card_dashboard to admin_api_role;
grant select on admin_security_trust_command_center_queue_dashboard to admin_api_role;
grant select on admin_security_trust_command_center_timeline_dashboard to admin_api_role;
grant select on admin_security_trust_command_center_integrity to admin_api_role;

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
    'admin_security_trust_command_center_global_every_5m',
    'Refresh global trust command center',
    'admin',
    true,
    '*/5 * * * *',
    'refresh_admin_security_trust_command_center',
    '{"scope": "global"}'::jsonb,
    300,
    600,
    '{"priority": "high"}'::jsonb
  ),
  (
    'admin_security_trust_command_center_customers_every_30m',
    'Refresh customer trust command centers',
    'admin',
    true,
    '*/30 * * * *',
    'process_admin_security_trust_command_center_customers',
    '{"batch_size": 500}'::jsonb,
    600,
    900,
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
    'TRUST_COMMAND_CENTER_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Trust command center record not found.',
    'Trust command center record not found.',
    'platform'
  ),
  (
    'TRUST_COMMAND_CENTER_INVALID_STATE',
    'validation',
    'medium',
    409,
    true,
    true,
    'Trust command center record is not in a valid state.',
    'Trust command center invalid state.',
    'platform'
  ),
  (
    'TRUST_COMMAND_CENTER_REQUIRED_FIELDS',
    'validation',
    'medium',
    400,
    false,
    true,
    'Trust command center request requires complete fields.',
    'Trust command center required fields missing.',
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
  ('trust command center snapshot not found', 'TRUST_COMMAND_CENTER_NOT_FOUND', 5, '{}'),
  ('trust command queue item not found or not open', 'TRUST_COMMAND_CENTER_INVALID_STATE', 5, '{}'),
  ('trust command queue item not found or not resolvable', 'TRUST_COMMAND_CENTER_INVALID_STATE', 5, '{}'),
  ('trust command queue resolution note is required', 'TRUST_COMMAND_CENTER_REQUIRED_FIELDS', 5, '{}')
on conflict (match_pattern)
do update set
  error_code = excluded.error_code,
  priority = excluded.priority,
  metadata = excluded.metadata;

alter table admin_security_trust_command_center_snapshots enable row level security;
alter table admin_security_trust_command_center_cards enable row level security;
alter table admin_security_trust_command_center_queue enable row level security;
alter table admin_security_trust_command_center_timeline enable row level security;
alter table admin_security_trust_command_center_events enable row level security;

drop policy if exists admin_api_all_trust_command_center_snapshots on admin_security_trust_command_center_snapshots;
create policy admin_api_all_trust_command_center_snapshots
on admin_security_trust_command_center_snapshots
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_trust_command_center_cards on admin_security_trust_command_center_cards;
create policy admin_api_all_trust_command_center_cards
on admin_security_trust_command_center_cards
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_trust_command_center_queue on admin_security_trust_command_center_queue;
create policy admin_api_all_trust_command_center_queue
on admin_security_trust_command_center_queue
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_trust_command_center_timeline on admin_security_trust_command_center_timeline;
create policy admin_api_all_trust_command_center_timeline
on admin_security_trust_command_center_timeline
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_trust_command_center_events on admin_security_trust_command_center_events;
create policy admin_api_all_trust_command_center_events
on admin_security_trust_command_center_events
for all to admin_api_role
using (true)
with check (true);

drop policy if exists worker_all_trust_command_center_snapshots on admin_security_trust_command_center_snapshots;
create policy worker_all_trust_command_center_snapshots
on admin_security_trust_command_center_snapshots
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_trust_command_center_cards on admin_security_trust_command_center_cards;
create policy worker_all_trust_command_center_cards
on admin_security_trust_command_center_cards
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_trust_command_center_queue on admin_security_trust_command_center_queue;
create policy worker_all_trust_command_center_queue
on admin_security_trust_command_center_queue
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_trust_command_center_timeline on admin_security_trust_command_center_timeline;
create policy worker_all_trust_command_center_timeline
on admin_security_trust_command_center_timeline
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_trust_command_center_events on admin_security_trust_command_center_events;
create policy worker_all_trust_command_center_events
on admin_security_trust_command_center_events
for all to worker_role
using (true)
with check (true);

grant execute on function record_admin_security_trust_command_center_event(
  text,text,uuid,uuid,uuid,uuid,text,text,text,uuid,uuid,text,text,text,text,jsonb
) to admin_api_role, worker_role;

grant execute on function create_admin_security_trust_command_timeline_item(
  text,text,text,text,text,text,text,text,text,uuid,text,timestamptz,text,uuid,uuid,text,jsonb,text,jsonb
) to admin_api_role, worker_role;

grant execute on function upsert_admin_security_trust_command_queue_item(
  text,text,text,text,text,text,uuid,text,text,text,text,timestamptz,text,text,jsonb,text,jsonb
) to admin_api_role, worker_role;

grant execute on function compute_admin_security_trust_command_center_snapshot(text,text,text,text,jsonb)
to admin_api_role, worker_role;

grant execute on function seed_admin_security_trust_command_center_cards(uuid,text,jsonb)
to admin_api_role, worker_role;

grant execute on function sync_admin_security_trust_command_center_queue(text,text,integer,text,text,jsonb)
to admin_api_role, worker_role;

grant execute on function sync_admin_security_trust_command_center_timeline(text,text,integer,text,text,jsonb)
to admin_api_role, worker_role;

grant execute on function refresh_admin_security_trust_command_center(text,text,text,text,jsonb)
to admin_api_role, worker_role;

grant execute on function process_admin_security_trust_command_center_customers(integer,text,text,jsonb)
to admin_api_role, worker_role;

grant execute on function acknowledge_admin_security_trust_command_queue_item(uuid,uuid,text,jsonb)
to admin_api_role;

grant execute on function resolve_admin_security_trust_command_queue_item(uuid,uuid,text,text,jsonb)
to admin_api_role;

alter function compute_admin_security_trust_command_center_snapshot(text,text,text,text,jsonb) security definer;
alter function compute_admin_security_trust_command_center_snapshot(text,text,text,text,jsonb) set search_path = public;

alter function seed_admin_security_trust_command_center_cards(uuid,text,jsonb) security definer;
alter function seed_admin_security_trust_command_center_cards(uuid,text,jsonb) set search_path = public;

alter function sync_admin_security_trust_command_center_queue(text,text,integer,text,text,jsonb) security definer;
alter function sync_admin_security_trust_command_center_queue(text,text,integer,text,text,jsonb) set search_path = public;

alter function sync_admin_security_trust_command_center_timeline(text,text,integer,text,text,jsonb) security definer;
alter function sync_admin_security_trust_command_center_timeline(text,text,integer,text,text,jsonb) set search_path = public;

alter function refresh_admin_security_trust_command_center(text,text,text,text,jsonb) security definer;
alter function refresh_admin_security_trust_command_center(text,text,text,text,jsonb) set search_path = public;

alter function process_admin_security_trust_command_center_customers(integer,text,text,jsonb) security definer;
alter function process_admin_security_trust_command_center_customers(integer,text,text,jsonb) set search_path = public;

alter function acknowledge_admin_security_trust_command_queue_item(uuid,uuid,text,jsonb) security definer;
alter function acknowledge_admin_security_trust_command_queue_item(uuid,uuid,text,jsonb) set search_path = public;

alter function resolve_admin_security_trust_command_queue_item(uuid,uuid,text,text,jsonb) security definer;
alter function resolve_admin_security_trust_command_queue_item(uuid,uuid,text,text,jsonb) set search_path = public;
-- ---------------------------------------------------------------------------
-- run_scheduled_job — extend allowlist for trust command center v2
-- (replaces function from migration 222; must run after command center RPCs)
-- ---------------------------------------------------------------------------

create or replace function run_scheduled_job(
  p_job_key text,
  p_locked_by text default 'scheduler',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_job scheduled_jobs%rowtype;
  v_run_id uuid;

  v_lock_acquired boolean;
  v_started_at timestamptz;

  v_uuid_result uuid;
  v_result jsonb := '{}'::jsonb;
begin
  if p_job_key is null or length(trim(p_job_key)) = 0 then
    raise exception 'job key is required';
  end if;

  select *
  into v_job
  from scheduled_jobs
  where job_key = p_job_key;

  if v_job.id is null then
    raise exception 'scheduled job not found: %', p_job_key;
  end if;

  if v_job.enabled is false then
    insert into scheduled_job_runs (
      scheduled_job_id,
      job_key,
      job_group,
      status,
      metadata
    )
    values (
      v_job.id,
      v_job.job_key,
      v_job.job_group,
      'disabled',
      p_metadata
    )
    returning id into v_run_id;

    update scheduled_jobs
    set
      last_status = 'disabled',
      last_run_id = v_run_id,
      updated_at = now()
    where id = v_job.id;

    return v_run_id;
  end if;

  v_lock_acquired := acquire_scheduled_job_lock(
    v_job.job_key,
    p_locked_by,
    v_job.lock_ttl_seconds,
    p_metadata
  );

  if v_lock_acquired is false then
    insert into scheduled_job_runs (
      scheduled_job_id,
      job_key,
      job_group,
      status,
      metadata
    )
    values (
      v_job.id,
      v_job.job_key,
      v_job.job_group,
      'skipped_locked',
      p_metadata
    )
    returning id into v_run_id;

    update scheduled_jobs
    set
      last_status = 'skipped_locked',
      last_run_id = v_run_id,
      updated_at = now()
    where id = v_job.id;

    return v_run_id;
  end if;

  v_started_at := now();

  insert into scheduled_job_runs (
    scheduled_job_id,
    job_key,
    job_group,
    status,
    started_at,
    metadata
  )
  values (
    v_job.id,
    v_job.job_key,
    v_job.job_group,
    'started',
    v_started_at,
    p_metadata
  )
  returning id into v_run_id;

  update scheduled_jobs
  set
    last_started_at = v_started_at,
    last_status = 'started',
    last_run_id = v_run_id,
    updated_at = now()
  where id = v_job.id;

  if v_job.function_name = 'run_reward_issuance_job' then
    v_uuid_result := run_reward_issuance_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'release_mature_reward_lots' then
    v_uuid_result := release_mature_reward_lots(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'run_accounting_mirror_job' then
    v_uuid_result := run_accounting_mirror_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'run_withdrawal_reserve_job' then
    v_uuid_result := run_withdrawal_reserve_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 100),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'run_audit_hash_backfill_job' then
    v_uuid_result := run_audit_hash_backfill_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'verify_audit_hash_chain' then
    v_uuid_result := verify_audit_hash_chain(
      coalesce(v_job.function_args->>'chain_key', 'global_audit_chain'),
      coalesce((v_job.function_args->>'batch_size')::integer, 100000),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'run_observability_snapshot_job' then
    v_uuid_result := run_observability_snapshot_job(
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'run_payout_provider_event_processing_job' then
    v_uuid_result := run_payout_provider_event_processing_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'expire_admin_security_evidence_answer_sessions' then
    v_uuid_result := expire_admin_security_evidence_answer_sessions(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'expire_admin_security_answer_receipt_export_bundles' then
    v_uuid_result := expire_admin_security_answer_receipt_export_bundles(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'process_due_admin_security_proof_digests' then
    v_result := process_due_admin_security_proof_digests(
      coalesce((v_job.function_args->>'batch_size')::integer, 100),
      'scheduled-job',
      v_run_id::text,
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );

  elsif v_job.function_name = 'expire_admin_security_proof_notification_events' then
    v_uuid_result := expire_admin_security_proof_notification_events(
      coalesce((v_job.function_args->>'batch_size')::integer, 5000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'process_admin_security_proof_observability_cycle' then
    v_result := process_admin_security_proof_observability_cycle(
      'scheduled-job',
      v_run_id::text,
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );

  elsif v_job.function_name = 'expire_admin_security_proof_observability_records' then
    v_uuid_result := expire_admin_security_proof_observability_records(
      coalesce((v_job.function_args->>'batch_size')::integer, 5000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'process_approved_admin_security_audit_package_requests' then
    v_result := process_approved_admin_security_audit_package_requests(
      coalesce((v_job.function_args->>'batch_size')::integer, 100),
      'scheduled-job',
      v_run_id::text,
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );

  elsif v_job.function_name = 'expire_admin_security_audit_packages' then
    v_uuid_result := expire_admin_security_audit_packages(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'process_admin_security_trust_transparency_portals' then
    v_result := process_admin_security_trust_transparency_portals(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      'scheduled-job',
      v_run_id::text,
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );

  elsif v_job.function_name = 'expire_admin_security_trust_transparency_records' then
    v_uuid_result := expire_admin_security_trust_transparency_records(
      coalesce((v_job.function_args->>'batch_size')::integer, 5000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'process_admin_security_trust_billing_cycle' then
    v_result := process_admin_security_trust_billing_cycle(
      'scheduled-job',
      v_run_id::text,
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );

  elsif v_job.function_name = 'refresh_admin_security_trust_usage_rollups' then
    v_result := refresh_admin_security_trust_usage_rollups(
      date_trunc('month', now()),
      date_trunc('month', now()) + interval '1 month',
      5000,
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );

  elsif v_job.function_name = 'run_admin_security_trust_ai_analyst' then
    v_uuid_result := run_admin_security_trust_ai_analyst(
      'scheduled',
      null,
      null,
      null,
      'scheduled-job',
      v_run_id::text,
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );

    v_result := jsonb_build_object('analyst_run_id', v_uuid_result);

  elsif v_job.function_name = 'compute_admin_security_customer_trust_risk_scores' then
    v_result := compute_admin_security_customer_trust_risk_scores(
      now() - interval '7 days',
      now(),
      'scheduled-job',
      v_run_id::text,
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );

  elsif v_job.function_name = 'refresh_admin_security_trust_command_center' then
    v_result := refresh_admin_security_trust_command_center(
      null,
      null,
      'scheduled-job',
      v_run_id::text,
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );

  elsif v_job.function_name = 'process_admin_security_trust_command_center_customers' then
    v_result := process_admin_security_trust_command_center_customers(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      'scheduled-job',
      v_run_id::text,
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );

  else
    raise exception 'scheduled function not allowlisted: %', v_job.function_name;
  end if;

  update scheduled_job_runs
  set
    status = 'completed',
    completed_at = now(),
    runtime_ms = (extract(epoch from (now() - v_started_at)) * 1000)::integer,
    result = v_result
  where id = v_run_id;

  update scheduled_jobs
  set
    last_completed_at = now(),
    last_status = 'completed',
    last_run_id = v_run_id,
    updated_at = now()
  where id = v_job.id;

  perform release_scheduled_job_lock(v_job.job_key);
  return v_run_id;

exception
  when others then
    if v_run_id is not null then
      update scheduled_job_runs
      set
        status = 'failed',
        failed_at = now(),
        runtime_ms =
          case
            when v_started_at is not null then (extract(epoch from (now() - v_started_at)) * 1000)::integer
            else null
          end,
        error_message = sqlerrm
      where id = v_run_id;
    end if;

    update scheduled_jobs
    set
      last_failed_at = now(),
      last_status = 'failed',
      last_run_id = v_run_id,
      updated_at = now()
    where job_key = p_job_key;

    perform release_scheduled_job_lock(p_job_key);
    raise;
end;
$$;
