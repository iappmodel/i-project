-- Trust AI analyst v2 body (included from 222 migration). Spec step 9.87; logical deps: 191, 194, 219, 220, 221.

-- ---------------------------------------------------------------------------
-- 0) Public verification results — customer columns + status values for detectors
-- ---------------------------------------------------------------------------

alter table admin_security_public_verification_results
  add column if not exists customer_name text,
  add column if not exists customer_domain text;

alter table admin_security_public_verification_results
  drop constraint if exists admin_security_public_verification_results_status_check;

alter table admin_security_public_verification_results
  add constraint admin_security_public_verification_results_status_check
  check (
    verification_status in (
      'pending',
      'passed',
      'failed',
      'expired',
      'suppressed',
      'hash_mismatch',
      'invalid'
    )
  );

-- ---------------------------------------------------------------------------
-- 0b) Webhook delivery stub (FK targets for findings + dead-letter detector)
-- ---------------------------------------------------------------------------

create table if not exists admin_security_trust_webhook_endpoints (
  id uuid primary key default gen_random_uuid(),

  webhook_endpoint_key text not null unique,
  endpoint_name text not null,

  customer_name text,
  customer_domain text,

  status text not null default 'active',

  created_at timestamptz not null default now(),
  updated_at timestamptz,

  constraint admin_security_trust_webhook_endpoints_status_check
  check (status in ('active', 'paused', 'disabled', 'archived')),

  constraint admin_security_trust_webhook_endpoints_name_check
  check (length(trim(endpoint_name)) > 0)
);

create index if not exists admin_security_trust_webhook_endpoints_customer_idx
  on admin_security_trust_webhook_endpoints (customer_name, customer_domain);

drop trigger if exists admin_security_trust_webhook_endpoints_set_updated_at
  on admin_security_trust_webhook_endpoints;

create trigger admin_security_trust_webhook_endpoints_set_updated_at
before update on admin_security_trust_webhook_endpoints
for each row
execute function set_updated_at();

create table if not exists admin_security_trust_webhook_deliveries (
  id uuid primary key default gen_random_uuid(),

  webhook_delivery_key text not null unique,
  webhook_endpoint_id uuid not null
    references admin_security_trust_webhook_endpoints(id) on delete cascade,

  customer_name text,
  customer_domain text,

  status text not null default 'pending',

  event_namespace text not null default 'trust',
  event_type text not null default 'event',

  last_error text,
  dead_lettered_at timestamptz,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz,

  constraint admin_security_trust_webhook_deliveries_status_check
  check (
    status in (
      'pending',
      'delivered',
      'failed',
      'dead_lettered',
      'cancelled',
      'archived'
    )
  )
);

create index if not exists admin_security_trust_webhook_deliveries_endpoint_idx
  on admin_security_trust_webhook_deliveries (webhook_endpoint_id, status, created_at desc);

create index if not exists admin_security_trust_webhook_deliveries_dead_letter_idx
  on admin_security_trust_webhook_deliveries (dead_lettered_at desc)
  where status = 'dead_lettered';

drop trigger if exists admin_security_trust_webhook_deliveries_set_updated_at
  on admin_security_trust_webhook_deliveries;

create trigger admin_security_trust_webhook_deliveries_set_updated_at
before update on admin_security_trust_webhook_deliveries
for each row
execute function set_updated_at();

alter table admin_security_trust_webhook_endpoints enable row level security;
alter table admin_security_trust_webhook_deliveries enable row level security;

drop policy if exists admin_api_all_trust_webhook_endpoints on admin_security_trust_webhook_endpoints;
create policy admin_api_all_trust_webhook_endpoints
on admin_security_trust_webhook_endpoints
for all to admin_api_role
using (true)
with check (true);

drop policy if exists worker_all_trust_webhook_endpoints on admin_security_trust_webhook_endpoints;
create policy worker_all_trust_webhook_endpoints
on admin_security_trust_webhook_endpoints
for all to worker_role
using (true)
with check (true);

drop policy if exists admin_api_all_trust_webhook_deliveries on admin_security_trust_webhook_deliveries;
create policy admin_api_all_trust_webhook_deliveries
on admin_security_trust_webhook_deliveries
for all to admin_api_role
using (true)
with check (true);

drop policy if exists worker_all_trust_webhook_deliveries on admin_security_trust_webhook_deliveries;
create policy worker_all_trust_webhook_deliveries
on admin_security_trust_webhook_deliveries
for all to worker_role
using (true)
with check (true);

-- ---------------------------------------------------------------------------
-- 2) AI detector registry
-- ---------------------------------------------------------------------------

create table if not exists admin_security_trust_ai_detectors (
  id uuid primary key default gen_random_uuid(),

  detector_key text not null unique,

  status text not null default 'active',

  detector_name text not null,
  detector_description text,

  detector_family text not null,
  detector_type text not null default 'rule',

  severity_floor text not null default 'info',

  default_enabled boolean not null default true,

  lookback_interval interval not null default interval '24 hours',
  min_signal_count integer not null default 1,
  confidence_threshold numeric(6,4) not null default 0.7000,

  run_frequency_minutes integer not null default 60,

  detector_config jsonb not null default '{}'::jsonb,

  owner_team text not null default 'platform',

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz,

  constraint admin_security_trust_ai_detectors_status_check
  check (
    status in (
      'active',
      'paused',
      'deprecated',
      'archived'
    )
  ),

  constraint admin_security_trust_ai_detectors_family_check
  check (
    detector_family in (
      'proof_health',
      'verification_abuse',
      'governance_drift',
      'incident_pattern',
      'billing_usage_abuse',
      'webhook_delivery_health',
      'transparency_risk',
      'entitlement_risk',
      'system_health',
      'customer_risk',
      'other'
    )
  ),

  constraint admin_security_trust_ai_detectors_type_check
  check (
    detector_type in (
      'rule',
      'statistical',
      'heuristic',
      'model',
      'hybrid'
    )
  ),

  constraint admin_security_trust_ai_detectors_severity_floor_check
  check (
    severity_floor in (
      'info',
      'low',
      'medium',
      'high',
      'critical'
    )
  ),

  constraint admin_security_trust_ai_detectors_name_check
  check (length(trim(detector_name)) > 0),

  constraint admin_security_trust_ai_detectors_confidence_check
  check (confidence_threshold >= 0 and confidence_threshold <= 1),

  constraint admin_security_trust_ai_detectors_frequency_check
  check (run_frequency_minutes > 0)
);

create index if not exists admin_security_trust_ai_detectors_status_idx
on admin_security_trust_ai_detectors (status, detector_family, default_enabled);

drop trigger if exists admin_security_trust_ai_detectors_set_updated_at
on admin_security_trust_ai_detectors;

create trigger admin_security_trust_ai_detectors_set_updated_at
before update on admin_security_trust_ai_detectors
for each row
execute function set_updated_at();

insert into admin_security_trust_ai_detectors (
  detector_key,
  status,
  detector_name,
  detector_description,
  detector_family,
  detector_type,
  severity_floor,
  default_enabled,
  lookback_interval,
  min_signal_count,
  confidence_threshold,
  run_frequency_minutes,
  detector_config,
  owner_team
)
values
  (
    'trust_ai_detector:proof_hash_mismatch_cluster',
    'active',
    'Proof hash mismatch cluster',
    'Detects repeated proof verification/hash mismatch failures.',
    'proof_health',
    'rule',
    'high',
    true,
    interval '24 hours',
    2,
    0.8000,
    30,
    '{"threshold": 2}'::jsonb,
    'trust'
  ),
  (
    'trust_ai_detector:verification_failure_spike',
    'active',
    'Verification failure spike',
    'Detects spikes in public verification failures by customer or proof key.',
    'verification_abuse',
    'statistical',
    'medium',
    true,
    interval '6 hours',
    5,
    0.7500,
    15,
    '{"failureRateThreshold": 0.25, "minimumAttempts": 20}'::jsonb,
    'trust'
  ),
  (
    'trust_ai_detector:governance_denial_drift',
    'active',
    'Governance denial drift',
    'Detects abnormal increase in governance denial or review outcomes.',
    'governance_drift',
    'heuristic',
    'medium',
    true,
    interval '24 hours',
    3,
    0.7000,
    60,
    '{"denialThreshold": 3}'::jsonb,
    'policy'
  ),
  (
    'trust_ai_detector:incident_repeat_pattern',
    'active',
    'Incident repeat pattern',
    'Detects repeated incident types for the same customer or proof domain.',
    'incident_pattern',
    'rule',
    'medium',
    true,
    interval '7 days',
    2,
    0.8000,
    60,
    '{"repeatThreshold": 2}'::jsonb,
    'trust'
  ),
  (
    'trust_ai_detector:usage_limit_pressure',
    'active',
    'Usage limit pressure',
    'Detects customers approaching or exceeding entitlement limits.',
    'billing_usage_abuse',
    'rule',
    'medium',
    true,
    interval '24 hours',
    1,
    0.9000,
    60,
    '{"warningPercent": 80, "criticalPercent": 100}'::jsonb,
    'billing'
  ),
  (
    'trust_ai_detector:webhook_dead_letter_cluster',
    'active',
    'Webhook dead-letter cluster',
    'Detects repeated webhook dead-letter failures by customer or endpoint.',
    'webhook_delivery_health',
    'rule',
    'medium',
    true,
    interval '24 hours',
    3,
    0.8500,
    30,
    '{"deadLetterThreshold": 3}'::jsonb,
    'integrations'
  )
on conflict (detector_key)
do update set
  status = excluded.status,
  detector_description = excluded.detector_description,
  detector_config = admin_security_trust_ai_detectors.detector_config || excluded.detector_config,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 3) AI analyst runs
-- ---------------------------------------------------------------------------

create table if not exists admin_security_trust_ai_analyst_runs (
  id uuid primary key default gen_random_uuid(),

  analyst_run_key text not null unique,

  status text not null default 'running',

  run_type text not null default 'scheduled',
  run_scope text not null default 'global',

  detector_family text,
  detector_id uuid references admin_security_trust_ai_detectors(id) on delete set null,

  customer_name text,
  customer_domain text,

  lookback_start timestamptz not null,
  lookback_end timestamptz not null default now(),

  detectors_evaluated integer not null default 0,
  findings_created integer not null default 0,
  critical_findings integer not null default 0,
  high_findings integer not null default 0,

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,

  worker_id text,
  last_error text,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz,

  constraint admin_security_trust_ai_analyst_runs_status_check
  check (
    status in (
      'running',
      'completed',
      'failed',
      'cancelled',
      'archived'
    )
  ),

  constraint admin_security_trust_ai_analyst_runs_type_check
  check (
    run_type in (
      'scheduled',
      'manual',
      'incident_triggered',
      'customer_triggered',
      'system_triggered'
    )
  ),

  constraint admin_security_trust_ai_analyst_runs_scope_check
  check (
    run_scope in (
      'global',
      'customer',
      'detector',
      'detector_family'
    )
  ),

  constraint admin_security_trust_ai_analyst_runs_range_check
  check (lookback_end > lookback_start)
);

create index if not exists admin_security_trust_ai_analyst_runs_status_idx
on admin_security_trust_ai_analyst_runs (status, created_at desc);

create index if not exists admin_security_trust_ai_analyst_runs_customer_idx
on admin_security_trust_ai_analyst_runs (customer_name, customer_domain, created_at desc);

drop trigger if exists admin_security_trust_ai_analyst_runs_set_updated_at
on admin_security_trust_ai_analyst_runs;

create trigger admin_security_trust_ai_analyst_runs_set_updated_at
before update on admin_security_trust_ai_analyst_runs
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 4) AI anomaly findings
-- ---------------------------------------------------------------------------

create table if not exists admin_security_trust_ai_findings (
  id uuid primary key default gen_random_uuid(),

  finding_key text not null unique,

  status text not null default 'open',

  analyst_run_id uuid
    references admin_security_trust_ai_analyst_runs(id)
    on delete set null,

  detector_id uuid
    references admin_security_trust_ai_detectors(id)
    on delete set null,

  detector_key text,
  detector_family text not null,

  finding_type text not null,
  finding_title text not null,
  finding_summary text not null,

  severity text not null default 'medium',
  confidence numeric(6,4) not null default 0.7500,

  customer_name text,
  customer_domain text,

  private_room_id uuid references admin_security_private_trust_rooms(id) on delete set null,

  proof_type text,
  proof_key text,
  proof_hash_sha256 text,

  source_table text,
  source_id uuid,
  source_key text,

  related_incident_id uuid references admin_security_trust_incidents(id) on delete set null,
  related_billing_account_id uuid references admin_security_trust_billing_accounts(id) on delete set null,
  related_webhook_endpoint_id uuid references admin_security_trust_webhook_endpoints(id) on delete set null,
  related_transparency_portal_id uuid references admin_security_trust_transparency_portals(id) on delete set null,

  signal_count integer not null default 1,
  sample_payload jsonb not null default '{}'::jsonb,
  evidence_payload jsonb not null default '{}'::jsonb,

  recommended_action text,
  recommended_action_payload jsonb not null default '{}'::jsonb,

  auto_incident_candidate boolean not null default false,
  auto_governance_review_candidate boolean not null default false,
  customer_visible_candidate boolean not null default false,

  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),

  acknowledged_at timestamptz,
  acknowledged_by_auth_user_id uuid,
  acknowledged_by_admin_user_id uuid references admin_users(id) on delete set null,

  resolved_at timestamptz,
  resolved_by_auth_user_id uuid,
  resolved_by_admin_user_id uuid references admin_users(id) on delete set null,
  resolution_note text,

  suppressed_at timestamptz,
  suppressed_by_auth_user_id uuid,
  suppressed_by_admin_user_id uuid references admin_users(id) on delete set null,
  suppression_reason text,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz,

  constraint admin_security_trust_ai_findings_status_check
  check (
    status in (
      'open',
      'acknowledged',
      'investigating',
      'resolved',
      'suppressed',
      'false_positive',
      'archived'
    )
  ),

  constraint admin_security_trust_ai_findings_severity_check
  check (
    severity in (
      'info',
      'low',
      'medium',
      'high',
      'critical'
    )
  ),

  constraint admin_security_trust_ai_findings_confidence_check
  check (confidence >= 0 and confidence <= 1),

  constraint admin_security_trust_ai_findings_title_check
  check (length(trim(finding_title)) > 0),

  constraint admin_security_trust_ai_findings_summary_check
  check (length(trim(finding_summary)) > 0)
);

create index if not exists admin_security_trust_ai_findings_status_idx
on admin_security_trust_ai_findings (status, severity, created_at desc);

create index if not exists admin_security_trust_ai_findings_customer_idx
on admin_security_trust_ai_findings (customer_name, customer_domain, severity, created_at desc);

create index if not exists admin_security_trust_ai_findings_detector_idx
on admin_security_trust_ai_findings (detector_family, finding_type, created_at desc);

create index if not exists admin_security_trust_ai_findings_source_idx
on admin_security_trust_ai_findings (source_table, source_id);

drop trigger if exists admin_security_trust_ai_findings_set_updated_at
on admin_security_trust_ai_findings;

create trigger admin_security_trust_ai_findings_set_updated_at
before update on admin_security_trust_ai_findings
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 5) Customer trust risk scores
-- ---------------------------------------------------------------------------

create table if not exists admin_security_customer_trust_risk_scores (
  id uuid primary key default gen_random_uuid(),

  risk_score_key text not null unique,

  status text not null default 'active',

  customer_name text not null,
  customer_domain text,

  score_period_start timestamptz not null,
  score_period_end timestamptz not null,

  overall_risk_score numeric(8,4) not null default 0,
  risk_level text not null default 'low',

  proof_health_score numeric(8,4) not null default 100,
  verification_integrity_score numeric(8,4) not null default 100,
  governance_stability_score numeric(8,4) not null default 100,
  incident_pressure_score numeric(8,4) not null default 0,
  billing_usage_pressure_score numeric(8,4) not null default 0,
  integration_health_score numeric(8,4) not null default 100,
  transparency_risk_score numeric(8,4) not null default 0,

  open_finding_count integer not null default 0,
  critical_finding_count integer not null default 0,
  high_finding_count integer not null default 0,

  open_incident_count integer not null default 0,
  failed_verification_count integer not null default 0,
  dead_lettered_delivery_count integer not null default 0,
  usage_exceeded_count integer not null default 0,

  score_payload jsonb not null default '{}'::jsonb,

  computed_at timestamptz not null default now(),

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz,

  unique (customer_name, customer_domain, score_period_start, score_period_end),

  constraint admin_security_customer_trust_risk_scores_status_check
  check (
    status in (
      'active',
      'superseded',
      'archived'
    )
  ),

  constraint admin_security_customer_trust_risk_scores_risk_level_check
  check (
    risk_level in (
      'low',
      'medium',
      'high',
      'critical'
    )
  ),

  constraint admin_security_customer_trust_risk_scores_range_check
  check (score_period_end > score_period_start),

  constraint admin_security_customer_trust_risk_scores_customer_check
  check (length(trim(customer_name)) > 0)
);

create index if not exists admin_security_customer_trust_risk_scores_customer_idx
on admin_security_customer_trust_risk_scores (customer_name, customer_domain, computed_at desc);

create index if not exists admin_security_customer_trust_risk_scores_level_idx
on admin_security_customer_trust_risk_scores (risk_level, computed_at desc);

drop trigger if exists admin_security_customer_trust_risk_scores_set_updated_at
on admin_security_customer_trust_risk_scores;

create trigger admin_security_customer_trust_risk_scores_set_updated_at
before update on admin_security_customer_trust_risk_scores
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 6) Recommended actions
-- ---------------------------------------------------------------------------

create table if not exists admin_security_trust_ai_recommended_actions (
  id uuid primary key default gen_random_uuid(),

  recommended_action_key text not null unique,

  status text not null default 'open',

  finding_id uuid references admin_security_trust_ai_findings(id) on delete cascade,
  risk_score_id uuid references admin_security_customer_trust_risk_scores(id) on delete set null,

  action_type text not null,
  action_priority text not null default 'medium',

  customer_name text,
  customer_domain text,

  title text not null,
  summary text not null,

  target_table text,
  target_id uuid,
  target_key text,

  proposed_payload jsonb not null default '{}'::jsonb,

  requires_approval boolean not null default true,
  auto_executable boolean not null default false,

  approved_at timestamptz,
  approved_by_auth_user_id uuid,
  approved_by_admin_user_id uuid references admin_users(id) on delete set null,

  executed_at timestamptz,
  executed_by_auth_user_id uuid,
  executed_by_admin_user_id uuid references admin_users(id) on delete set null,
  execution_result jsonb,

  dismissed_at timestamptz,
  dismissed_by_auth_user_id uuid,
  dismissed_by_admin_user_id uuid references admin_users(id) on delete set null,
  dismissal_reason text,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz,

  constraint admin_security_trust_ai_recommended_actions_status_check
  check (
    status in (
      'open',
      'approved',
      'executed',
      'dismissed',
      'failed',
      'archived'
    )
  ),

  constraint admin_security_trust_ai_recommended_actions_type_check
  check (
    action_type in (
      'open_incident',
      'escalate_incident',
      'create_governance_review',
      'pause_webhook_endpoint',
      'replay_webhook_event',
      'notify_customer',
      'publish_trust_notice',
      'request_audit_package',
      'tighten_entitlement',
      'increase_monitoring',
      'manual_review',
      'other'
    )
  ),

  constraint admin_security_trust_ai_recommended_actions_priority_check
  check (
    action_priority in (
      'low',
      'medium',
      'high',
      'critical'
    )
  ),

  constraint admin_security_trust_ai_recommended_actions_title_check
  check (length(trim(title)) > 0),

  constraint admin_security_trust_ai_recommended_actions_summary_check
  check (length(trim(summary)) > 0)
);

create index if not exists admin_security_trust_ai_recommended_actions_status_idx
on admin_security_trust_ai_recommended_actions (status, action_priority, created_at desc);

create index if not exists admin_security_trust_ai_recommended_actions_customer_idx
on admin_security_trust_ai_recommended_actions (customer_name, customer_domain, status);

create index if not exists admin_security_trust_ai_recommended_actions_finding_idx
on admin_security_trust_ai_recommended_actions (finding_id);

drop trigger if exists admin_security_trust_ai_recommended_actions_set_updated_at
on admin_security_trust_ai_recommended_actions;

create trigger admin_security_trust_ai_recommended_actions_set_updated_at
before update on admin_security_trust_ai_recommended_actions
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 7) Analyst timeline events
-- ---------------------------------------------------------------------------

create table if not exists admin_security_trust_ai_analyst_events (
  id uuid primary key default gen_random_uuid(),

  analyst_event_key text not null unique,

  event_type text not null,
  event_action text not null,

  status text not null default 'recorded',

  analyst_run_id uuid references admin_security_trust_ai_analyst_runs(id) on delete set null,
  detector_id uuid references admin_security_trust_ai_detectors(id) on delete set null,
  finding_id uuid references admin_security_trust_ai_findings(id) on delete set null,
  risk_score_id uuid references admin_security_customer_trust_risk_scores(id) on delete set null,
  recommended_action_id uuid references admin_security_trust_ai_recommended_actions(id) on delete set null,

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

  constraint admin_security_trust_ai_analyst_events_type_check
  check (
    event_type in (
      'analyst_run_started',
      'analyst_run_completed',
      'analyst_run_failed',
      'detector_evaluated',
      'finding_created',
      'finding_acknowledged',
      'finding_resolved',
      'finding_suppressed',
      'risk_score_computed',
      'recommended_action_created',
      'recommended_action_approved',
      'recommended_action_executed',
      'recommended_action_dismissed',
      'other'
    )
  ),

  constraint admin_security_trust_ai_analyst_events_status_check
  check (
    status in (
      'recorded',
      'failed',
      'archived'
    )
  )
);

create index if not exists admin_security_trust_ai_analyst_events_customer_idx
on admin_security_trust_ai_analyst_events (customer_name, customer_domain, created_at desc);

create index if not exists admin_security_trust_ai_analyst_events_type_idx
on admin_security_trust_ai_analyst_events (event_type, created_at desc);

-- ---------------------------------------------------------------------------
-- 8) Record analyst event
-- ---------------------------------------------------------------------------

create or replace function record_admin_security_trust_ai_analyst_event(
  p_event_type text,
  p_event_action text,
  p_analyst_run_id uuid default null,
  p_detector_id uuid default null,
  p_finding_id uuid default null,
  p_risk_score_id uuid default null,
  p_recommended_action_id uuid default null,
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
    'trust_ai_analyst_event:' ||
    p_event_type || ':' ||
    substr(encode(gen_random_bytes(12), 'hex'), 1, 24);

  insert into admin_security_trust_ai_analyst_events (
    analyst_event_key,
    event_type,
    event_action,
    status,
    analyst_run_id,
    detector_id,
    finding_id,
    risk_score_id,
    recommended_action_id,
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
    p_analyst_run_id,
    p_detector_id,
    p_finding_id,
    p_risk_score_id,
    p_recommended_action_id,
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

-- ---------------------------------------------------------------------------
-- 9–10) Create finding / recommended action helpers
-- ---------------------------------------------------------------------------

create or replace function create_admin_security_trust_ai_finding(
  p_analyst_run_id uuid,
  p_detector_id uuid,
  p_finding_type text,
  p_finding_title text,
  p_finding_summary text,
  p_severity text,
  p_confidence numeric,
  p_customer_name text default null,
  p_customer_domain text default null,
  p_private_room_id uuid default null,
  p_proof_type text default null,
  p_proof_key text default null,
  p_proof_hash_sha256 text default null,
  p_source_table text default null,
  p_source_id uuid default null,
  p_source_key text default null,
  p_signal_count integer default 1,
  p_sample_payload jsonb default '{}'::jsonb,
  p_evidence_payload jsonb default '{}'::jsonb,
  p_recommended_action text default null,
  p_recommended_action_payload jsonb default '{}'::jsonb,
  p_auto_incident_candidate boolean default false,
  p_auto_governance_review_candidate boolean default false,
  p_customer_visible_candidate boolean default false,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_detector admin_security_trust_ai_detectors%rowtype;
  v_finding_id uuid;
  v_key text;
  v_dedupe_key text;
begin
  select *
  into v_detector
  from admin_security_trust_ai_detectors
  where id = p_detector_id;

  if v_detector.id is null then
    raise exception 'trust ai detector not found: %', p_detector_id;
  end if;

  v_dedupe_key :=
    v_detector.detector_key || ':' ||
    coalesce(p_customer_name, 'global') || ':' ||
    coalesce(p_customer_domain, '') || ':' ||
    coalesce(p_source_table, '') || ':' ||
    coalesce(p_source_id::text, '') || ':' ||
    coalesce(p_source_key, '') || ':' ||
    coalesce(p_proof_key, '') || ':' ||
    p_finding_type;

  v_key :=
    'trust_ai_finding:' ||
    encode(digest(v_dedupe_key, 'sha256'), 'hex');

  insert into admin_security_trust_ai_findings (
    finding_key,
    status,
    analyst_run_id,
    detector_id,
    detector_key,
    detector_family,
    finding_type,
    finding_title,
    finding_summary,
    severity,
    confidence,
    customer_name,
    customer_domain,
    private_room_id,
    proof_type,
    proof_key,
    proof_hash_sha256,
    source_table,
    source_id,
    source_key,
    signal_count,
    sample_payload,
    evidence_payload,
    recommended_action,
    recommended_action_payload,
    auto_incident_candidate,
    auto_governance_review_candidate,
    customer_visible_candidate,
    first_seen_at,
    last_seen_at,
    request_id,
    metadata
  )
  values (
    v_key,
    'open',
    p_analyst_run_id,
    v_detector.id,
    v_detector.detector_key,
    v_detector.detector_family,
    p_finding_type,
    p_finding_title,
    p_finding_summary,
    coalesce(p_severity, v_detector.severity_floor),
    coalesce(p_confidence, v_detector.confidence_threshold),
    p_customer_name,
    p_customer_domain,
    p_private_room_id,
    p_proof_type,
    p_proof_key,
    p_proof_hash_sha256,
    p_source_table,
    p_source_id,
    p_source_key,
    coalesce(p_signal_count, 1),
    coalesce(p_sample_payload, '{}'::jsonb),
    coalesce(p_evidence_payload, '{}'::jsonb),
    p_recommended_action,
    coalesce(p_recommended_action_payload, '{}'::jsonb),
    coalesce(p_auto_incident_candidate, false),
    coalesce(p_auto_governance_review_candidate, false),
    coalesce(p_customer_visible_candidate, false),
    now(),
    now(),
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (finding_key)
  do update set
    status = case
      when admin_security_trust_ai_findings.status in ('resolved', 'suppressed', 'false_positive')
      then admin_security_trust_ai_findings.status
      else 'open'
    end,
    analyst_run_id = excluded.analyst_run_id,
    severity = excluded.severity,
    confidence = greatest(admin_security_trust_ai_findings.confidence, excluded.confidence),
    signal_count = greatest(admin_security_trust_ai_findings.signal_count, excluded.signal_count),
    sample_payload = excluded.sample_payload,
    evidence_payload = excluded.evidence_payload,
    recommended_action = excluded.recommended_action,
    recommended_action_payload = excluded.recommended_action_payload,
    last_seen_at = now(),
    metadata = admin_security_trust_ai_findings.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_finding_id;

  perform record_admin_security_trust_ai_analyst_event(
    'finding_created',
    'created_or_updated',
    p_analyst_run_id,
    v_detector.id,
    v_finding_id,
    null,
    null,
    p_customer_name,
    p_customer_domain,
    'system',
    null,
    null,
    null,
    p_finding_title,
    p_finding_summary,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_finding_id;
end;
$$;

create or replace function create_admin_security_trust_ai_recommended_action(
  p_finding_id uuid,
  p_action_type text,
  p_action_priority text,
  p_title text,
  p_summary text,
  p_target_table text default null,
  p_target_id uuid default null,
  p_target_key text default null,
  p_proposed_payload jsonb default '{}'::jsonb,
  p_requires_approval boolean default true,
  p_auto_executable boolean default false,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_finding admin_security_trust_ai_findings%rowtype;
  v_id uuid;
  v_key text;
begin
  select *
  into v_finding
  from admin_security_trust_ai_findings
  where id = p_finding_id;

  if v_finding.id is null then
    raise exception 'trust ai finding not found: %', p_finding_id;
  end if;

  v_key :=
    'trust_ai_recommended_action:' ||
    encode(digest(v_finding.finding_key || ':' || p_action_type || ':' || coalesce(p_target_key, ''), 'sha256'), 'hex');

  insert into admin_security_trust_ai_recommended_actions (
    recommended_action_key,
    status,
    finding_id,
    action_type,
    action_priority,
    customer_name,
    customer_domain,
    title,
    summary,
    target_table,
    target_id,
    target_key,
    proposed_payload,
    requires_approval,
    auto_executable,
    request_id,
    metadata
  )
  values (
    v_key,
    'open',
    v_finding.id,
    p_action_type,
    coalesce(p_action_priority, 'medium'),
    v_finding.customer_name,
    v_finding.customer_domain,
    p_title,
    p_summary,
    p_target_table,
    p_target_id,
    p_target_key,
    coalesce(p_proposed_payload, '{}'::jsonb),
    coalesce(p_requires_approval, true),
    coalesce(p_auto_executable, false),
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (recommended_action_key)
  do update set
    status = case
      when admin_security_trust_ai_recommended_actions.status in ('executed', 'dismissed')
      then admin_security_trust_ai_recommended_actions.status
      else 'open'
    end,
    action_priority = excluded.action_priority,
    summary = excluded.summary,
    proposed_payload = excluded.proposed_payload,
    metadata = admin_security_trust_ai_recommended_actions.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_id;

  perform record_admin_security_trust_ai_analyst_event(
    'recommended_action_created',
    'created_or_updated',
    v_finding.analyst_run_id,
    v_finding.detector_id,
    v_finding.id,
    null,
    v_id,
    v_finding.customer_name,
    v_finding.customer_domain,
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

-- ---------------------------------------------------------------------------
-- 11–16) Detector runners
-- ---------------------------------------------------------------------------

create or replace function run_trust_ai_detector_proof_hash_mismatch_cluster(
  p_analyst_run_id uuid,
  p_detector_id uuid,
  p_lookback_start timestamptz,
  p_lookback_end timestamptz,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
as $$
declare
  v_count integer := 0;
  v_row record;
  v_finding_id uuid;
begin
  for v_row in
    select
      coalesce(r.customer_name, 'unknown') as customer_name,
      r.customer_domain,
      r.verification_type,
      r.subject_key,
      count(*) as failure_count,
      max(r.created_at) as last_seen_at,
      jsonb_agg(
        jsonb_build_object(
          'resultKey', r.result_key,
          'status', r.verification_status,
          'createdAt', r.created_at
        )
        order by r.created_at desc
      ) as samples
    from admin_security_public_verification_results r
    where r.created_at >= p_lookback_start
      and r.created_at < p_lookback_end
      and (
        r.verification_status in ('failed', 'hash_mismatch', 'invalid')
        or r.verified is false
      )
    group by
      coalesce(r.customer_name, 'unknown'),
      r.customer_domain,
      r.verification_type,
      r.subject_key
    having count(*) >= 2
  loop
    v_finding_id := create_admin_security_trust_ai_finding(
      p_analyst_run_id,
      p_detector_id,
      'proof_hash_mismatch_cluster',
      'Repeated proof verification failures',
      'Multiple verification failures were detected for the same proof key.',
      case when v_row.failure_count >= 5 then 'critical' else 'high' end,
      least(0.99, 0.75 + (v_row.failure_count::numeric * 0.03)),
      v_row.customer_name,
      v_row.customer_domain,
      null,
      v_row.verification_type,
      v_row.subject_key,
      null,
      'admin_security_public_verification_results',
      null,
      v_row.subject_key,
      v_row.failure_count,
      jsonb_build_object('samples', v_row.samples),
      jsonb_build_object(
        'failureCount', v_row.failure_count,
        'lookbackStart', p_lookback_start,
        'lookbackEnd', p_lookback_end
      ),
      'Open incident investigation for repeated proof verification failures.',
      jsonb_build_object(
        'recommendedAction', 'open_incident',
        'incidentType', 'hash_mismatch_cluster'
      ),
      true,
      true,
      false,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    perform create_admin_security_trust_ai_recommended_action(
      v_finding_id,
      'open_incident',
      case when v_row.failure_count >= 5 then 'critical' else 'high' end,
      'Open incident for repeated verification failures',
      'Repeated proof verification failures should be investigated as a trust incident.',
      'admin_security_public_verification_results',
      null,
      v_row.subject_key,
      jsonb_build_object(
        'incidentType', 'hash_mismatch_cluster',
        'subjectKey', v_row.subject_key,
        'failureCount', v_row.failure_count
      ),
      true,
      false,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function run_trust_ai_detector_verification_failure_spike(
  p_analyst_run_id uuid,
  p_detector_id uuid,
  p_lookback_start timestamptz,
  p_lookback_end timestamptz,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
as $$
declare
  v_count integer := 0;
  v_row record;
  v_finding_id uuid;
begin
  for v_row in
    select
      coalesce(customer_name, 'unknown') as customer_name,
      customer_domain,
      count(*) as total_attempts,
      count(*) filter (
        where verified is false
           or verification_status in ('failed', 'invalid', 'hash_mismatch')
      ) as failed_attempts,
      round(
        (
          count(*) filter (
            where verified is false
               or verification_status in ('failed', 'invalid', 'hash_mismatch')
          )::numeric / greatest(count(*), 1)
        ),
        4
      ) as failure_rate
    from admin_security_public_verification_results
    where created_at >= p_lookback_start
      and created_at < p_lookback_end
    group by coalesce(customer_name, 'unknown'), customer_domain
    having count(*) >= 20
       and (
         count(*) filter (
           where verified is false
              or verification_status in ('failed', 'invalid', 'hash_mismatch')
         )::numeric / greatest(count(*), 1)
       ) >= 0.25
  loop
    v_finding_id := create_admin_security_trust_ai_finding(
      p_analyst_run_id,
      p_detector_id,
      'verification_failure_spike',
      'Verification failure spike detected',
      'Public verification failures exceeded expected safe thresholds.',
      case when v_row.failure_rate >= 0.5 then 'high' else 'medium' end,
      least(0.99, 0.70 + v_row.failure_rate),
      v_row.customer_name,
      v_row.customer_domain,
      null,
      null,
      null,
      null,
      'admin_security_public_verification_results',
      null,
      v_row.customer_name,
      v_row.failed_attempts,
      jsonb_build_object(
        'totalAttempts', v_row.total_attempts,
        'failedAttempts', v_row.failed_attempts,
        'failureRate', v_row.failure_rate
      ),
      jsonb_build_object(
        'lookbackStart', p_lookback_start,
        'lookbackEnd', p_lookback_end
      ),
      'Increase monitoring and review failed verification patterns.',
      jsonb_build_object(
        'recommendedAction', 'increase_monitoring',
        'failureRate', v_row.failure_rate
      ),
      false,
      true,
      false,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    perform create_admin_security_trust_ai_recommended_action(
      v_finding_id,
      'increase_monitoring',
      case when v_row.failure_rate >= 0.5 then 'high' else 'medium' end,
      'Increase verification monitoring',
      'Verification failure rates are elevated and should be reviewed.',
      'admin_security_public_verification_results',
      null,
      v_row.customer_name,
      jsonb_build_object(
        'totalAttempts', v_row.total_attempts,
        'failedAttempts', v_row.failed_attempts,
        'failureRate', v_row.failure_rate
      ),
      true,
      false,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function run_trust_ai_detector_governance_denial_drift(
  p_analyst_run_id uuid,
  p_detector_id uuid,
  p_lookback_start timestamptz,
  p_lookback_end timestamptz,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
as $$
declare
  v_count integer := 0;
  v_row record;
  v_finding_id uuid;
begin
  for v_row in
    select
      coalesce(customer_name, 'unknown') as customer_name,
      customer_domain,
      count(*) as decision_count,
      count(*) filter (
        where decision_result in ('deny', 'blocked', 'requires_review')
      ) as denied_or_review_count,
      jsonb_agg(
        jsonb_build_object(
          'decisionKey', decision_key,
          'decisionResult', decision_result,
          'action', action,
          'createdAt', created_at
        )
        order by created_at desc
      ) as samples
    from admin_security_proof_governance_decisions
    where created_at >= p_lookback_start
      and created_at < p_lookback_end
    group by coalesce(customer_name, 'unknown'), customer_domain
    having count(*) filter (
      where decision_result in ('deny', 'blocked', 'requires_review')
    ) >= 3
  loop
    v_finding_id := create_admin_security_trust_ai_finding(
      p_analyst_run_id,
      p_detector_id,
      'governance_denial_drift',
      'Governance denial drift detected',
      'Governance decisions show elevated denials or manual reviews.',
      case when v_row.denied_or_review_count >= 10 then 'high' else 'medium' end,
      least(0.99, 0.70 + (v_row.denied_or_review_count::numeric * 0.02)),
      v_row.customer_name,
      v_row.customer_domain,
      null,
      null,
      null,
      null,
      'admin_security_proof_governance_decisions',
      null,
      v_row.customer_name,
      v_row.denied_or_review_count,
      jsonb_build_object('samples', v_row.samples),
      jsonb_build_object(
        'decisionCount', v_row.decision_count,
        'deniedOrReviewCount', v_row.denied_or_review_count
      ),
      'Create governance review to inspect policy drift or customer behavior changes.',
      jsonb_build_object(
        'recommendedAction', 'create_governance_review',
        'deniedOrReviewCount', v_row.denied_or_review_count
      ),
      false,
      true,
      false,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    perform create_admin_security_trust_ai_recommended_action(
      v_finding_id,
      'create_governance_review',
      case when v_row.denied_or_review_count >= 10 then 'high' else 'medium' end,
      'Create governance review',
      'Elevated governance denials may indicate policy drift or abuse.',
      'admin_security_proof_governance_decisions',
      null,
      v_row.customer_name,
      jsonb_build_object(
        'deniedOrReviewCount', v_row.denied_or_review_count
      ),
      true,
      false,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function run_trust_ai_detector_incident_repeat_pattern(
  p_analyst_run_id uuid,
  p_detector_id uuid,
  p_lookback_start timestamptz,
  p_lookback_end timestamptz,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
as $$
declare
  v_count integer := 0;
  v_row record;
  v_finding_id uuid;
begin
  for v_row in
    select
      coalesce(customer_name, 'unknown') as customer_name,
      customer_domain,
      incident_type,
      count(*) as incident_count,
      max(severity) as max_severity,
      jsonb_agg(
        jsonb_build_object(
          'incidentKey', incident_key,
          'status', status,
          'severity', severity,
          'title', title,
          'createdAt', created_at
        )
        order by created_at desc
      ) as samples
    from admin_security_trust_incidents
    where created_at >= p_lookback_start
      and created_at < p_lookback_end
    group by coalesce(customer_name, 'unknown'), customer_domain, incident_type
    having count(*) >= 2
  loop
    v_finding_id := create_admin_security_trust_ai_finding(
      p_analyst_run_id,
      p_detector_id,
      'incident_repeat_pattern',
      'Repeated trust incident pattern',
      'The same incident type has repeated for this customer.',
      case when v_row.incident_count >= 5 then 'high' else 'medium' end,
      least(0.99, 0.75 + (v_row.incident_count::numeric * 0.03)),
      v_row.customer_name,
      v_row.customer_domain,
      null,
      null,
      null,
      null,
      'admin_security_trust_incidents',
      null,
      v_row.incident_type,
      v_row.incident_count,
      jsonb_build_object('samples', v_row.samples),
      jsonb_build_object(
        'incidentType', v_row.incident_type,
        'incidentCount', v_row.incident_count
      ),
      'Escalate recurring incident pattern for root-cause review.',
      jsonb_build_object(
        'recommendedAction', 'escalate_incident',
        'incidentType', v_row.incident_type
      ),
      true,
      true,
      false,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    perform create_admin_security_trust_ai_recommended_action(
      v_finding_id,
      'escalate_incident',
      case when v_row.incident_count >= 5 then 'high' else 'medium' end,
      'Escalate recurring trust incident pattern',
      'Recurring incident types need root-cause investigation.',
      'admin_security_trust_incidents',
      null,
      v_row.incident_type,
      jsonb_build_object(
        'incidentType', v_row.incident_type,
        'incidentCount', v_row.incident_count
      ),
      true,
      false,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function run_trust_ai_detector_usage_limit_pressure(
  p_analyst_run_id uuid,
  p_detector_id uuid,
  p_lookback_start timestamptz,
  p_lookback_end timestamptz,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
as $$
declare
  v_count integer := 0;
  v_row record;
  v_finding_id uuid;
begin
  for v_row in
    select *
    from admin_security_trust_usage_rollups
    where billing_period_start = date_trunc('month', now())
      and usage_percent is not null
      and usage_percent >= 80
      and status in ('active', 'finalized')
  loop
    v_finding_id := create_admin_security_trust_ai_finding(
      p_analyst_run_id,
      p_detector_id,
      'usage_limit_pressure',
      'Trust usage limit pressure',
      'Customer trust usage is approaching or exceeding entitlement limits.',
      case
        when v_row.usage_percent >= 100 then 'high'
        else 'medium'
      end,
      case
        when v_row.usage_percent >= 100 then 0.9500
        else 0.8500
      end,
      v_row.customer_name,
      v_row.customer_domain,
      null,
      null,
      null,
      null,
      'admin_security_trust_usage_rollups',
      v_row.id,
      v_row.meter_name,
      1,
      jsonb_build_object(
        'meterName', v_row.meter_name,
        'totalQuantity', v_row.total_quantity,
        'limitQuantity', v_row.limit_quantity,
        'usagePercent', v_row.usage_percent,
        'overageQuantity', v_row.overage_quantity
      ),
      jsonb_build_object(
        'billingPeriodStart', v_row.billing_period_start,
        'billingPeriodEnd', v_row.billing_period_end,
        'overageAmountCents', v_row.overage_amount_cents
      ),
      case
        when v_row.usage_percent >= 100 then 'Review overage or tighten entitlement controls.'
        else 'Notify customer before limit is exceeded.'
      end,
      jsonb_build_object(
        'recommendedAction',
        case when v_row.usage_percent >= 100 then 'tighten_entitlement' else 'notify_customer' end,
        'meterName',
        v_row.meter_name
      ),
      false,
      false,
      true,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    perform create_admin_security_trust_ai_recommended_action(
      v_finding_id,
      case when v_row.usage_percent >= 100 then 'tighten_entitlement' else 'notify_customer' end,
      case when v_row.usage_percent >= 100 then 'high' else 'medium' end,
      case when v_row.usage_percent >= 100 then 'Review exceeded usage limit' else 'Notify customer of usage pressure' end,
      'Customer trust usage is close to or above plan limits.',
      'admin_security_trust_usage_rollups',
      v_row.id,
      v_row.meter_name,
      jsonb_build_object(
        'usagePercent', v_row.usage_percent,
        'meterName', v_row.meter_name,
        'overageAmountCents', v_row.overage_amount_cents
      ),
      true,
      false,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function run_trust_ai_detector_webhook_dead_letter_cluster(
  p_analyst_run_id uuid,
  p_detector_id uuid,
  p_lookback_start timestamptz,
  p_lookback_end timestamptz,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
as $$
declare
  v_count integer := 0;
  v_row record;
  v_finding_id uuid;
begin
  for v_row in
    select
      d.customer_name,
      d.customer_domain,
      d.webhook_endpoint_id,
      e.endpoint_name,
      count(*) as dead_letter_count,
      jsonb_agg(
        jsonb_build_object(
          'deliveryKey', d.webhook_delivery_key,
          'eventType', d.event_namespace || '.' || d.event_type,
          'lastError', d.last_error,
          'deadLetteredAt', d.dead_lettered_at
        )
        order by d.dead_lettered_at desc
      ) as samples
    from admin_security_trust_webhook_deliveries d
    join admin_security_trust_webhook_endpoints e
      on e.id = d.webhook_endpoint_id
    where d.status = 'dead_lettered'
      and d.dead_lettered_at is not null
      and d.dead_lettered_at >= p_lookback_start
      and d.dead_lettered_at < p_lookback_end
    group by d.customer_name, d.customer_domain, d.webhook_endpoint_id, e.endpoint_name
    having count(*) >= 3
  loop
    v_finding_id := create_admin_security_trust_ai_finding(
      p_analyst_run_id,
      p_detector_id,
      'webhook_dead_letter_cluster',
      'Webhook dead-letter cluster',
      'Multiple webhook deliveries reached dead-letter state for the same endpoint.',
      case when v_row.dead_letter_count >= 10 then 'high' else 'medium' end,
      least(0.99, 0.80 + (v_row.dead_letter_count::numeric * 0.02)),
      v_row.customer_name,
      v_row.customer_domain,
      null,
      null,
      null,
      null,
      'admin_security_trust_webhook_deliveries',
      v_row.webhook_endpoint_id,
      v_row.endpoint_name,
      v_row.dead_letter_count,
      jsonb_build_object('samples', v_row.samples),
      jsonb_build_object(
        'deadLetterCount', v_row.dead_letter_count,
        'endpointName', v_row.endpoint_name
      ),
      'Pause or investigate webhook endpoint health.',
      jsonb_build_object(
        'recommendedAction', 'pause_webhook_endpoint',
        'webhookEndpointId', v_row.webhook_endpoint_id
      ),
      false,
      false,
      false,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    update admin_security_trust_ai_findings
    set related_webhook_endpoint_id = v_row.webhook_endpoint_id
    where id = v_finding_id;

    perform create_admin_security_trust_ai_recommended_action(
      v_finding_id,
      'pause_webhook_endpoint',
      case when v_row.dead_letter_count >= 10 then 'high' else 'medium' end,
      'Investigate webhook endpoint health',
      'Repeated dead-lettered deliveries indicate endpoint or authentication failure.',
      'admin_security_trust_webhook_endpoints',
      v_row.webhook_endpoint_id,
      v_row.endpoint_name,
      jsonb_build_object(
        'deadLetterCount', v_row.dead_letter_count,
        'webhookEndpointId', v_row.webhook_endpoint_id
      ),
      true,
      false,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- 17) Run all AI detectors
-- ---------------------------------------------------------------------------

create or replace function run_admin_security_trust_ai_analyst(
  p_run_type text default 'scheduled',
  p_detector_family text default null,
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
  v_run_id uuid;
  v_run_key text;
  v_detector record;
  v_lookback_start timestamptz;
  v_lookback_end timestamptz := now();
  v_findings integer := 0;
  v_total_findings integer := 0;
  v_detectors integer := 0;
  v_critical integer := 0;
  v_high integer := 0;
begin
  v_run_key :=
    'trust_ai_analyst_run:' ||
    coalesce(p_detector_family, 'all') || ':' ||
    substr(encode(gen_random_bytes(12), 'hex'), 1, 24);

  insert into admin_security_trust_ai_analyst_runs (
    analyst_run_key,
    status,
    run_type,
    run_scope,
    detector_family,
    customer_name,
    customer_domain,
    lookback_start,
    lookback_end,
    worker_id,
    request_id,
    metadata
  )
  values (
    v_run_key,
    'running',
    coalesce(p_run_type, 'scheduled'),
    case
      when p_customer_name is not null then 'customer'
      when p_detector_family is not null then 'detector_family'
      else 'global'
    end,
    p_detector_family,
    p_customer_name,
    p_customer_domain,
    now() - interval '24 hours',
    v_lookback_end,
    p_worker_id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_run_id;

  perform record_admin_security_trust_ai_analyst_event(
    'analyst_run_started',
    'started',
    v_run_id,
    null,
    null,
    null,
    null,
    p_customer_name,
    p_customer_domain,
    'worker',
    null,
    null,
    null,
    'Trust AI analyst run started',
    coalesce(p_detector_family, 'all detectors'),
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  for v_detector in
    select *
    from admin_security_trust_ai_detectors
    where status = 'active'
      and default_enabled is true
      and (p_detector_family is null or detector_family = p_detector_family)
    order by detector_family, detector_key
  loop
    v_detectors := v_detectors + 1;
    v_lookback_start := v_lookback_end - v_detector.lookback_interval;

    if v_detector.detector_key = 'trust_ai_detector:proof_hash_mismatch_cluster' then
      v_findings := run_trust_ai_detector_proof_hash_mismatch_cluster(
        v_run_id,
        v_detector.id,
        v_lookback_start,
        v_lookback_end,
        p_request_id,
        p_metadata
      );
    elsif v_detector.detector_key = 'trust_ai_detector:verification_failure_spike' then
      v_findings := run_trust_ai_detector_verification_failure_spike(
        v_run_id,
        v_detector.id,
        v_lookback_start,
        v_lookback_end,
        p_request_id,
        p_metadata
      );
    elsif v_detector.detector_key = 'trust_ai_detector:governance_denial_drift' then
      v_findings := run_trust_ai_detector_governance_denial_drift(
        v_run_id,
        v_detector.id,
        v_lookback_start,
        v_lookback_end,
        p_request_id,
        p_metadata
      );
    elsif v_detector.detector_key = 'trust_ai_detector:incident_repeat_pattern' then
      v_findings := run_trust_ai_detector_incident_repeat_pattern(
        v_run_id,
        v_detector.id,
        v_lookback_start,
        v_lookback_end,
        p_request_id,
        p_metadata
      );
    elsif v_detector.detector_key = 'trust_ai_detector:usage_limit_pressure' then
      v_findings := run_trust_ai_detector_usage_limit_pressure(
        v_run_id,
        v_detector.id,
        v_lookback_start,
        v_lookback_end,
        p_request_id,
        p_metadata
      );
    elsif v_detector.detector_key = 'trust_ai_detector:webhook_dead_letter_cluster' then
      v_findings := run_trust_ai_detector_webhook_dead_letter_cluster(
        v_run_id,
        v_detector.id,
        v_lookback_start,
        v_lookback_end,
        p_request_id,
        p_metadata
      );
    else
      v_findings := 0;
    end if;

    v_total_findings := v_total_findings + coalesce(v_findings, 0);

    perform record_admin_security_trust_ai_analyst_event(
      'detector_evaluated',
      'evaluated',
      v_run_id,
      v_detector.id,
      null,
      null,
      null,
      p_customer_name,
      p_customer_domain,
      'worker',
      null,
      null,
      null,
      'Detector evaluated',
      v_detector.detector_key || ': ' || coalesce(v_findings, 0)::text || ' findings',
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );
  end loop;

  select
    count(*) filter (where severity = 'critical'),
    count(*) filter (where severity = 'high')
  into v_critical, v_high
  from admin_security_trust_ai_findings
  where analyst_run_id = v_run_id;

  update admin_security_trust_ai_analyst_runs
  set
    status = 'completed',
    detectors_evaluated = v_detectors,
    findings_created = v_total_findings,
    critical_findings = coalesce(v_critical, 0),
    high_findings = coalesce(v_high, 0),
    completed_at = now(),
    updated_at = now()
  where id = v_run_id;

  perform record_admin_security_trust_ai_analyst_event(
    'analyst_run_completed',
    'completed',
    v_run_id,
    null,
    null,
    null,
    null,
    p_customer_name,
    p_customer_domain,
    'worker',
    null,
    null,
    null,
    'Trust AI analyst run completed',
    v_total_findings::text || ' finding(s) created.',
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_run_id;

exception
  when others then
    if v_run_id is not null then
      update admin_security_trust_ai_analyst_runs
      set
        status = 'failed',
        failed_at = now(),
        last_error = sqlerrm,
        updated_at = now()
      where id = v_run_id;

      perform record_admin_security_trust_ai_analyst_event(
        'analyst_run_failed',
        'failed',
        v_run_id,
        null,
        null,
        null,
        null,
        p_customer_name,
        p_customer_domain,
        'worker',
        null,
        null,
        null,
        'Trust AI analyst run failed',
        sqlerrm,
        p_request_id,
        coalesce(p_metadata, '{}'::jsonb)
      );
    end if;

    raise;
end;
$$;

-- ---------------------------------------------------------------------------
-- 18) Compute customer risk scores
-- ---------------------------------------------------------------------------

create or replace function compute_admin_security_customer_trust_risk_scores(
  p_period_start timestamptz default (now() - interval '7 days'),
  p_period_end timestamptz default now(),
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
  v_open_findings integer;
  v_critical_findings integer;
  v_high_findings integer;
  v_open_incidents integer;
  v_failed_verifications integer;
  v_dead_letters integer;
  v_usage_exceeded integer;
  v_overall numeric;
  v_risk_level text;
  v_score_id uuid;
begin
  for v_customer in
    select customer_name, customer_domain
    from (
      select customer_name, customer_domain from admin_security_customer_trust_entitlements where customer_name is not null
      union
      select customer_name, customer_domain from admin_security_trust_ai_findings where customer_name is not null
      union
      select customer_name, customer_domain from admin_security_trust_incidents where customer_name is not null
      union
      select customer_name, customer_domain from admin_security_trust_webhook_deliveries where customer_name is not null
    ) c
  loop
    select
      count(*) filter (where status in ('open', 'acknowledged', 'investigating')),
      count(*) filter (where status in ('open', 'acknowledged', 'investigating') and severity = 'critical'),
      count(*) filter (where status in ('open', 'acknowledged', 'investigating') and severity = 'high')
    into v_open_findings, v_critical_findings, v_high_findings
    from admin_security_trust_ai_findings
    where customer_name = v_customer.customer_name
      and coalesce(customer_domain, '') = coalesce(v_customer.customer_domain, '')
      and created_at >= p_period_start
      and created_at < p_period_end;

    select count(*)
    into v_open_incidents
    from admin_security_trust_incidents
    where customer_name = v_customer.customer_name
      and coalesce(customer_domain, '') = coalesce(v_customer.customer_domain, '')
      and status in ('open', 'acknowledged', 'investigating', 'escalated', 'mitigating');

    select count(*)
    into v_failed_verifications
    from admin_security_public_verification_results
    where customer_name = v_customer.customer_name
      and coalesce(customer_domain, '') = coalesce(v_customer.customer_domain, '')
      and created_at >= p_period_start
      and created_at < p_period_end
      and (
        verified is false
        or verification_status in ('failed', 'invalid', 'hash_mismatch')
      );

    select count(*)
    into v_dead_letters
    from admin_security_trust_webhook_deliveries
    where customer_name = v_customer.customer_name
      and coalesce(customer_domain, '') = coalesce(v_customer.customer_domain, '')
      and status = 'dead_lettered'
      and created_at >= p_period_start
      and created_at < p_period_end;

    select count(*)
    into v_usage_exceeded
    from admin_security_trust_usage_rollups
    where customer_name = v_customer.customer_name
      and coalesce(customer_domain, '') = coalesce(v_customer.customer_domain, '')
      and billing_period_start >= date_trunc('month', p_period_end)
      and usage_percent is not null
      and usage_percent >= 100;

    v_overall :=
      least(
        100,
        (coalesce(v_critical_findings, 0) * 25)
        + (coalesce(v_high_findings, 0) * 15)
        + (greatest(coalesce(v_open_findings, 0) - coalesce(v_high_findings, 0) - coalesce(v_critical_findings, 0), 0) * 5)
        + (coalesce(v_open_incidents, 0) * 20)
        + (least(coalesce(v_failed_verifications, 0), 50) * 0.5)
        + (coalesce(v_dead_letters, 0) * 3)
        + (coalesce(v_usage_exceeded, 0) * 10)
      );

    v_risk_level :=
      case
        when v_overall >= 80 then 'critical'
        when v_overall >= 50 then 'high'
        when v_overall >= 25 then 'medium'
        else 'low'
      end;

    insert into admin_security_customer_trust_risk_scores (
      risk_score_key,
      status,
      customer_name,
      customer_domain,
      score_period_start,
      score_period_end,
      overall_risk_score,
      risk_level,
      proof_health_score,
      verification_integrity_score,
      governance_stability_score,
      incident_pressure_score,
      billing_usage_pressure_score,
      integration_health_score,
      transparency_risk_score,
      open_finding_count,
      critical_finding_count,
      high_finding_count,
      open_incident_count,
      failed_verification_count,
      dead_lettered_delivery_count,
      usage_exceeded_count,
      score_payload,
      request_id,
      metadata
    )
    values (
      'customer_trust_risk_score:' ||
      lower(regexp_replace(v_customer.customer_name, '[^a-zA-Z0-9]+', '-', 'g')) || ':' ||
      p_period_start::date::text || ':' ||
      p_period_end::date::text,
      'active',
      v_customer.customer_name,
      v_customer.customer_domain,
      p_period_start,
      p_period_end,
      v_overall,
      v_risk_level,
      greatest(0, 100 - (coalesce(v_failed_verifications, 0) * 1)),
      greatest(0, 100 - (coalesce(v_failed_verifications, 0) * 2)),
      greatest(0, 100 - (coalesce(v_open_findings, 0) * 3)),
      least(100, coalesce(v_open_incidents, 0) * 20),
      least(100, coalesce(v_usage_exceeded, 0) * 40),
      greatest(0, 100 - (coalesce(v_dead_letters, 0) * 5)),
      least(100, coalesce(v_open_findings, 0) * 5),
      coalesce(v_open_findings, 0),
      coalesce(v_critical_findings, 0),
      coalesce(v_high_findings, 0),
      coalesce(v_open_incidents, 0),
      coalesce(v_failed_verifications, 0),
      coalesce(v_dead_letters, 0),
      coalesce(v_usage_exceeded, 0),
      jsonb_build_object(
        'runId', v_run_id,
        'computedBy', p_worker_id
      ),
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    )
    on conflict (customer_name, customer_domain, score_period_start, score_period_end)
    do update set
      status = 'active',
      overall_risk_score = excluded.overall_risk_score,
      risk_level = excluded.risk_level,
      proof_health_score = excluded.proof_health_score,
      verification_integrity_score = excluded.verification_integrity_score,
      governance_stability_score = excluded.governance_stability_score,
      incident_pressure_score = excluded.incident_pressure_score,
      billing_usage_pressure_score = excluded.billing_usage_pressure_score,
      integration_health_score = excluded.integration_health_score,
      transparency_risk_score = excluded.transparency_risk_score,
      open_finding_count = excluded.open_finding_count,
      critical_finding_count = excluded.critical_finding_count,
      high_finding_count = excluded.high_finding_count,
      open_incident_count = excluded.open_incident_count,
      failed_verification_count = excluded.failed_verification_count,
      dead_lettered_delivery_count = excluded.dead_lettered_delivery_count,
      usage_exceeded_count = excluded.usage_exceeded_count,
      score_payload = excluded.score_payload,
      computed_at = now(),
      metadata = admin_security_customer_trust_risk_scores.metadata || excluded.metadata,
      updated_at = now()
    returning id into v_score_id;

    perform record_admin_security_trust_ai_analyst_event(
      'risk_score_computed',
      'computed',
      null,
      null,
      null,
      v_score_id,
      null,
      v_customer.customer_name,
      v_customer.customer_domain,
      'worker',
      null,
      null,
      null,
      'Customer trust risk score computed',
      'Risk level: ' || v_risk_level,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('risk_score_run_id', v_run_id)
    );

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'runId',
    v_run_id,
    'riskScoresComputed',
    v_count
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 19) Acknowledge / resolve / suppress findings
-- ---------------------------------------------------------------------------

create or replace function acknowledge_admin_security_trust_ai_finding(
  p_admin_auth_user_id uuid,
  p_finding_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_finding admin_security_trust_ai_findings%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  update admin_security_trust_ai_findings
  set
    status = 'acknowledged',
    acknowledged_at = now(),
    acknowledged_by_auth_user_id = p_admin_auth_user_id,
    acknowledged_by_admin_user_id = v_admin.id,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = p_finding_id
    and status = 'open'
  returning * into v_finding;

  if v_finding.id is null then
    raise exception 'trust ai finding not found or not open: %', p_finding_id;
  end if;

  perform record_admin_security_trust_ai_analyst_event(
    'finding_acknowledged',
    'acknowledged',
    v_finding.analyst_run_id,
    v_finding.detector_id,
    v_finding.id,
    null,
    null,
    v_finding.customer_name,
    v_finding.customer_domain,
    'admin',
    p_admin_auth_user_id,
    v_admin.id,
    v_admin.email,
    'Trust AI finding acknowledged',
    v_finding.finding_title,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_finding.id;
end;
$$;

create or replace function resolve_admin_security_trust_ai_finding(
  p_admin_auth_user_id uuid,
  p_finding_id uuid,
  p_resolution_note text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_finding admin_security_trust_ai_findings%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_resolution_note is null or length(trim(p_resolution_note)) = 0 then
    raise exception 'trust ai finding resolution note is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  update admin_security_trust_ai_findings
  set
    status = 'resolved',
    resolved_at = now(),
    resolved_by_auth_user_id = p_admin_auth_user_id,
    resolved_by_admin_user_id = v_admin.id,
    resolution_note = p_resolution_note,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = p_finding_id
    and status in ('open', 'acknowledged', 'investigating')
  returning * into v_finding;

  if v_finding.id is null then
    raise exception 'trust ai finding not found or not resolvable: %', p_finding_id;
  end if;

  perform record_admin_security_trust_ai_analyst_event(
    'finding_resolved',
    'resolved',
    v_finding.analyst_run_id,
    v_finding.detector_id,
    v_finding.id,
    null,
    null,
    v_finding.customer_name,
    v_finding.customer_domain,
    'admin',
    p_admin_auth_user_id,
    v_admin.id,
    v_admin.email,
    'Trust AI finding resolved',
    p_resolution_note,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_finding.id;
end;
$$;

create or replace function suppress_admin_security_trust_ai_finding(
  p_admin_auth_user_id uuid,
  p_finding_id uuid,
  p_suppression_reason text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_finding admin_security_trust_ai_findings%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_suppression_reason is null or length(trim(p_suppression_reason)) = 0 then
    raise exception 'trust ai finding suppression reason is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  update admin_security_trust_ai_findings
  set
    status = 'suppressed',
    suppressed_at = now(),
    suppressed_by_auth_user_id = p_admin_auth_user_id,
    suppressed_by_admin_user_id = v_admin.id,
    suppression_reason = p_suppression_reason,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = p_finding_id
    and status in ('open', 'acknowledged', 'investigating')
  returning * into v_finding;

  if v_finding.id is null then
    raise exception 'trust ai finding not found or not suppressible: %', p_finding_id;
  end if;

  perform record_admin_security_trust_ai_analyst_event(
    'finding_suppressed',
    'suppressed',
    v_finding.analyst_run_id,
    v_finding.detector_id,
    v_finding.id,
    null,
    null,
    v_finding.customer_name,
    v_finding.customer_domain,
    'admin',
    p_admin_auth_user_id,
    v_admin.id,
    v_admin.email,
    'Trust AI finding suppressed',
    p_suppression_reason,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_finding.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 20) Dashboard views
-- ---------------------------------------------------------------------------

create or replace view admin_security_trust_ai_detector_dashboard as
select
  d.id as admin_security_trust_ai_detector_id,
  d.detector_key,
  d.status,
  d.detector_name,
  d.detector_description,
  d.detector_family,
  d.detector_type,
  d.severity_floor,
  d.default_enabled,
  d.lookback_interval,
  d.min_signal_count,
  d.confidence_threshold,
  d.run_frequency_minutes,
  d.owner_team,
  (
    select count(*)
    from admin_security_trust_ai_findings f
    where f.detector_id = d.id
      and f.status in ('open', 'acknowledged', 'investigating')
  ) as open_finding_count,
  (
    select max(created_at)
    from admin_security_trust_ai_analyst_events e
    where e.detector_id = d.id
      and e.event_type = 'detector_evaluated'
  ) as last_evaluated_at,
  d.created_at,
  d.updated_at,
  d.metadata
from admin_security_trust_ai_detectors d
order by d.detector_family, d.detector_name;

create or replace view admin_security_trust_ai_finding_dashboard as
select
  f.id as admin_security_trust_ai_finding_id,
  f.finding_key,
  f.status,
  f.analyst_run_id,
  r.analyst_run_key,
  f.detector_id,
  d.detector_name,
  f.detector_key,
  f.detector_family,
  f.finding_type,
  f.finding_title,
  f.finding_summary,
  f.severity,
  f.confidence,
  f.customer_name,
  f.customer_domain,
  f.private_room_id,
  pr.private_room_key,
  f.proof_type,
  f.proof_key,
  f.proof_hash_sha256,
  f.source_table,
  f.source_id,
  f.source_key,
  f.related_incident_id,
  i.incident_key as related_incident_key,
  f.related_billing_account_id,
  ba.billing_account_key as related_billing_account_key,
  f.related_webhook_endpoint_id,
  wh.webhook_endpoint_key as related_webhook_endpoint_key,
  f.related_transparency_portal_id,
  tp.transparency_portal_key as related_transparency_portal_key,
  f.signal_count,
  f.recommended_action,
  f.auto_incident_candidate,
  f.auto_governance_review_candidate,
  f.customer_visible_candidate,
  f.first_seen_at,
  f.last_seen_at,
  f.acknowledged_at,
  ack.email as acknowledged_by_email,
  f.resolved_at,
  resolver.email as resolved_by_email,
  f.resolution_note,
  f.suppressed_at,
  suppressor.email as suppressed_by_email,
  f.suppression_reason,
  (
    select count(*)
    from admin_security_trust_ai_recommended_actions a
    where a.finding_id = f.id
      and a.status = 'open'
  ) as open_recommended_action_count,
  f.created_at,
  f.updated_at,
  f.metadata
from admin_security_trust_ai_findings f
left join admin_security_trust_ai_analyst_runs r
  on r.id = f.analyst_run_id
left join admin_security_trust_ai_detectors d
  on d.id = f.detector_id
left join admin_security_private_trust_rooms pr
  on pr.id = f.private_room_id
left join admin_security_trust_incidents i
  on i.id = f.related_incident_id
left join admin_security_trust_billing_accounts ba
  on ba.id = f.related_billing_account_id
left join admin_security_trust_webhook_endpoints wh
  on wh.id = f.related_webhook_endpoint_id
left join admin_security_trust_transparency_portals tp
  on tp.id = f.related_transparency_portal_id
left join admin_users ack
  on ack.id = f.acknowledged_by_admin_user_id
left join admin_users resolver
  on resolver.id = f.resolved_by_admin_user_id
left join admin_users suppressor
  on suppressor.id = f.suppressed_by_admin_user_id
order by f.created_at desc;

create or replace view admin_security_customer_trust_risk_score_dashboard as
select
  r.id as admin_security_customer_trust_risk_score_id,
  r.risk_score_key,
  r.status,
  r.customer_name,
  r.customer_domain,
  r.score_period_start,
  r.score_period_end,
  r.overall_risk_score,
  r.risk_level,
  r.proof_health_score,
  r.verification_integrity_score,
  r.governance_stability_score,
  r.incident_pressure_score,
  r.billing_usage_pressure_score,
  r.integration_health_score,
  r.transparency_risk_score,
  r.open_finding_count,
  r.critical_finding_count,
  r.high_finding_count,
  r.open_incident_count,
  r.failed_verification_count,
  r.dead_lettered_delivery_count,
  r.usage_exceeded_count,
  r.computed_at,
  r.created_at,
  r.updated_at,
  r.metadata
from admin_security_customer_trust_risk_scores r
order by r.computed_at desc;

create or replace view admin_security_trust_ai_recommended_action_dashboard as
select
  a.id as admin_security_trust_ai_recommended_action_id,
  a.recommended_action_key,
  a.status,
  a.finding_id,
  f.finding_key,
  f.finding_title,
  f.severity as finding_severity,
  a.risk_score_id,
  rs.risk_score_key,
  a.action_type,
  a.action_priority,
  a.customer_name,
  a.customer_domain,
  a.title,
  a.summary,
  a.target_table,
  a.target_id,
  a.target_key,
  a.requires_approval,
  a.auto_executable,
  a.approved_at,
  approver.email as approved_by_email,
  a.executed_at,
  executor.email as executed_by_email,
  a.execution_result,
  a.dismissed_at,
  dismisser.email as dismissed_by_email,
  a.dismissal_reason,
  a.created_at,
  a.updated_at,
  a.metadata
from admin_security_trust_ai_recommended_actions a
left join admin_security_trust_ai_findings f
  on f.id = a.finding_id
left join admin_security_customer_trust_risk_scores rs
  on rs.id = a.risk_score_id
left join admin_users approver
  on approver.id = a.approved_by_admin_user_id
left join admin_users executor
  on executor.id = a.executed_by_admin_user_id
left join admin_users dismisser
  on dismisser.id = a.dismissed_by_admin_user_id
order by a.created_at desc;

create or replace view admin_security_trust_ai_integrity as
select
  (
    select count(*)
    from admin_security_trust_ai_detectors
    where status = 'active'
      and default_enabled is true
  ) as active_detector_count,

  (
    select count(*)
    from admin_security_trust_ai_analyst_runs
    where status = 'failed'
      and created_at >= now() - interval '24 hours'
  ) as failed_analyst_run_count_24h,

  (
    select count(*)
    from admin_security_trust_ai_findings
    where status in ('open', 'acknowledged', 'investigating')
  ) as open_finding_count,

  (
    select count(*)
    from admin_security_trust_ai_findings
    where status in ('open', 'acknowledged', 'investigating')
      and severity = 'critical'
  ) as open_critical_finding_count,

  (
    select count(*)
    from admin_security_trust_ai_findings
    where status in ('open', 'acknowledged', 'investigating')
      and severity = 'high'
  ) as open_high_finding_count,

  (
    select count(*)
    from admin_security_trust_ai_recommended_actions
    where status = 'open'
  ) as open_recommended_action_count,

  (
    select count(*)
    from admin_security_customer_trust_risk_scores
    where computed_at >= now() - interval '24 hours'
      and risk_level in ('high', 'critical')
  ) as high_or_critical_customer_risk_count_24h,

  now() as checked_at;

grant select on admin_security_trust_ai_detector_dashboard to admin_api_role;
grant select on admin_security_trust_ai_finding_dashboard to admin_api_role;
grant select on admin_security_customer_trust_risk_score_dashboard to admin_api_role;
grant select on admin_security_trust_ai_recommended_action_dashboard to admin_api_role;
grant select on admin_security_trust_ai_integrity to admin_api_role;

-- ---------------------------------------------------------------------------
-- 21) Scheduled jobs
-- ---------------------------------------------------------------------------

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
    'admin_security_trust_ai_analyst_every_15m',
    'Run trust AI analyst',
    'admin',
    true,
    '*/15 * * * *',
    'run_admin_security_trust_ai_analyst',
    '{}'::jsonb,
    300,
    600,
    '{"priority": "high"}'::jsonb
  ),
  (
    'admin_security_customer_trust_risk_scores_hourly',
    'Compute customer trust risk scores',
    'admin',
    true,
    '11 * * * *',
    'compute_admin_security_customer_trust_risk_scores',
    '{}'::jsonb,
    300,
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

-- ---------------------------------------------------------------------------
-- 22) Error catalog + mapping
-- ---------------------------------------------------------------------------

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
    'TRUST_AI_ANALYST_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Trust AI analyst record not found.',
    'Trust AI analyst record not found.',
    'platform'
  ),
  (
    'TRUST_AI_ANALYST_INVALID_STATE',
    'validation',
    'medium',
    409,
    true,
    true,
    'Trust AI analyst record is not in a valid state.',
    'Trust AI analyst invalid state.',
    'platform'
  ),
  (
    'TRUST_AI_ANALYST_REQUIRED_FIELDS',
    'validation',
    'medium',
    400,
    false,
    true,
    'Trust AI analyst request requires complete fields.',
    'Trust AI analyst required fields missing.',
    'platform'
  )
on conflict (error_code)
do update set
  category = excluded.category,
  severity = excluded.severity,
  http_status = excluded.http_status,
  retryable = excluded.retryable,
  user_visible = excluded.user_visible,
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
  ('trust ai detector not found', 'TRUST_AI_ANALYST_NOT_FOUND', 5, '{}'),
  ('trust ai finding not found', 'TRUST_AI_ANALYST_NOT_FOUND', 5, '{}'),
  ('trust ai finding not found or not open', 'TRUST_AI_ANALYST_INVALID_STATE', 5, '{}'),
  ('trust ai finding not found or not resolvable', 'TRUST_AI_ANALYST_INVALID_STATE', 5, '{}'),
  ('trust ai finding not found or not suppressible', 'TRUST_AI_ANALYST_INVALID_STATE', 5, '{}'),
  ('trust ai finding resolution note is required', 'TRUST_AI_ANALYST_REQUIRED_FIELDS', 5, '{}'),
  ('trust ai finding suppression reason is required', 'TRUST_AI_ANALYST_REQUIRED_FIELDS', 5, '{}')
on conflict (match_pattern)
do update set
  error_code = excluded.error_code,
  priority = excluded.priority,
  metadata = error_mapping_rules.metadata || excluded.metadata,
  active = true;

-- ---------------------------------------------------------------------------
-- 23) RLS + grants + security definer
-- ---------------------------------------------------------------------------

alter table admin_security_trust_ai_detectors enable row level security;
alter table admin_security_trust_ai_analyst_runs enable row level security;
alter table admin_security_trust_ai_findings enable row level security;
alter table admin_security_customer_trust_risk_scores enable row level security;
alter table admin_security_trust_ai_recommended_actions enable row level security;
alter table admin_security_trust_ai_analyst_events enable row level security;

drop policy if exists admin_api_all_trust_ai_detectors on admin_security_trust_ai_detectors;
create policy admin_api_all_trust_ai_detectors
on admin_security_trust_ai_detectors
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_trust_ai_analyst_runs on admin_security_trust_ai_analyst_runs;
create policy admin_api_all_trust_ai_analyst_runs
on admin_security_trust_ai_analyst_runs
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_trust_ai_findings on admin_security_trust_ai_findings;
create policy admin_api_all_trust_ai_findings
on admin_security_trust_ai_findings
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_customer_trust_risk_scores on admin_security_customer_trust_risk_scores;
create policy admin_api_all_customer_trust_risk_scores
on admin_security_customer_trust_risk_scores
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_trust_ai_recommended_actions on admin_security_trust_ai_recommended_actions;
create policy admin_api_all_trust_ai_recommended_actions
on admin_security_trust_ai_recommended_actions
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_trust_ai_analyst_events on admin_security_trust_ai_analyst_events;
create policy admin_api_all_trust_ai_analyst_events
on admin_security_trust_ai_analyst_events
for all to admin_api_role
using (true)
with check (true);

drop policy if exists worker_all_trust_ai_detectors on admin_security_trust_ai_detectors;
create policy worker_all_trust_ai_detectors
on admin_security_trust_ai_detectors
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_trust_ai_analyst_runs on admin_security_trust_ai_analyst_runs;
create policy worker_all_trust_ai_analyst_runs
on admin_security_trust_ai_analyst_runs
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_trust_ai_findings on admin_security_trust_ai_findings;
create policy worker_all_trust_ai_findings
on admin_security_trust_ai_findings
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_customer_trust_risk_scores on admin_security_customer_trust_risk_scores;
create policy worker_all_customer_trust_risk_scores
on admin_security_customer_trust_risk_scores
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_trust_ai_recommended_actions on admin_security_trust_ai_recommended_actions;
create policy worker_all_trust_ai_recommended_actions
on admin_security_trust_ai_recommended_actions
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_trust_ai_analyst_events on admin_security_trust_ai_analyst_events;
create policy worker_all_trust_ai_analyst_events
on admin_security_trust_ai_analyst_events
for all to worker_role
using (true)
with check (true);

grant execute on function record_admin_security_trust_ai_analyst_event(
  text,text,uuid,uuid,uuid,uuid,uuid,text,text,text,uuid,uuid,text,text,text,text,jsonb
) to admin_api_role, worker_role;

grant execute on function create_admin_security_trust_ai_finding(
  uuid,uuid,text,text,text,text,numeric,text,text,uuid,text,text,text,text,uuid,text,integer,jsonb,jsonb,text,jsonb,boolean,boolean,boolean,text,jsonb
) to admin_api_role, worker_role;

grant execute on function create_admin_security_trust_ai_recommended_action(
  uuid,text,text,text,text,text,uuid,text,jsonb,boolean,boolean,text,jsonb
) to admin_api_role, worker_role;

grant execute on function run_trust_ai_detector_proof_hash_mismatch_cluster(uuid,uuid,timestamptz,timestamptz,text,jsonb)
to admin_api_role, worker_role;

grant execute on function run_trust_ai_detector_verification_failure_spike(uuid,uuid,timestamptz,timestamptz,text,jsonb)
to admin_api_role, worker_role;

grant execute on function run_trust_ai_detector_governance_denial_drift(uuid,uuid,timestamptz,timestamptz,text,jsonb)
to admin_api_role, worker_role;

grant execute on function run_trust_ai_detector_incident_repeat_pattern(uuid,uuid,timestamptz,timestamptz,text,jsonb)
to admin_api_role, worker_role;

grant execute on function run_trust_ai_detector_usage_limit_pressure(uuid,uuid,timestamptz,timestamptz,text,jsonb)
to admin_api_role, worker_role;

grant execute on function run_trust_ai_detector_webhook_dead_letter_cluster(uuid,uuid,timestamptz,timestamptz,text,jsonb)
to admin_api_role, worker_role;

grant execute on function run_admin_security_trust_ai_analyst(text,text,text,text,text,text,jsonb)
to admin_api_role, worker_role;

grant execute on function compute_admin_security_customer_trust_risk_scores(timestamptz,timestamptz,text,text,jsonb)
to admin_api_role, worker_role;

grant execute on function acknowledge_admin_security_trust_ai_finding(uuid,uuid,text,jsonb)
to admin_api_role;

grant execute on function resolve_admin_security_trust_ai_finding(uuid,uuid,text,text,jsonb)
to admin_api_role;

grant execute on function suppress_admin_security_trust_ai_finding(uuid,uuid,text,text,jsonb)
to admin_api_role;

alter function run_admin_security_trust_ai_analyst(text,text,text,text,text,text,jsonb) security definer;
alter function run_admin_security_trust_ai_analyst(text,text,text,text,text,text,jsonb) set search_path = public;

alter function compute_admin_security_customer_trust_risk_scores(timestamptz,timestamptz,text,text,jsonb) security definer;
alter function compute_admin_security_customer_trust_risk_scores(timestamptz,timestamptz,text,text,jsonb) set search_path = public;

alter function acknowledge_admin_security_trust_ai_finding(uuid,uuid,text,jsonb) security definer;
alter function acknowledge_admin_security_trust_ai_finding(uuid,uuid,text,jsonb) set search_path = public;

alter function resolve_admin_security_trust_ai_finding(uuid,uuid,text,text,jsonb) security definer;
alter function resolve_admin_security_trust_ai_finding(uuid,uuid,text,text,jsonb) set search_path = public;

alter function suppress_admin_security_trust_ai_finding(uuid,uuid,text,text,jsonb) security definer;
alter function suppress_admin_security_trust_ai_finding(uuid,uuid,text,text,jsonb) set search_path = public;
