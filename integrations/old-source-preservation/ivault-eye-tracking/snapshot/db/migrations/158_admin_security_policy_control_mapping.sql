-- Step 9.43 — Build policy control mapping for SOC2, ISO 27001, GDPR, internal controls, and audit evidence.
-- Runs after 157_admin_security_policy_simulation_engine.sql.

create table if not exists admin_security_control_frameworks (
  id uuid primary key default gen_random_uuid(),

  framework_key text not null unique,
  framework_name text not null,

  status text not null default 'active',

  version text,
  authority text,

  description text not null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_control_frameworks_status_check
  check (
    status in (
      'active',
      'paused',
      'archived'
    )
  )
);

create index if not exists admin_security_control_frameworks_status_idx
on admin_security_control_frameworks (status, framework_key);

drop trigger if exists admin_security_control_frameworks_set_updated_at
on admin_security_control_frameworks;

create trigger admin_security_control_frameworks_set_updated_at
before update on admin_security_control_frameworks
for each row
execute function set_updated_at();

create table if not exists admin_security_controls (
  id uuid primary key default gen_random_uuid(),

  framework_id uuid not null references admin_security_control_frameworks(id) on delete cascade,

  control_key text not null,
  control_name text not null,

  status text not null default 'active',

  domain text not null,
  control_type text not null default 'preventive',
  severity text not null default 'high',

  description text not null,
  expected_evidence text not null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (framework_id, control_key),

  constraint admin_security_controls_status_check
  check (
    status in (
      'active',
      'paused',
      'archived'
    )
  ),

  constraint admin_security_controls_type_check
  check (
    control_type in (
      'preventive',
      'detective',
      'corrective',
      'deterrent',
      'compensating'
    )
  ),

  constraint admin_security_controls_severity_check
  check (
    severity in (
      'medium',
      'high',
      'critical'
    )
  )
);

create index if not exists admin_security_controls_framework_idx
on admin_security_controls (framework_id, status);

create index if not exists admin_security_controls_domain_idx
on admin_security_controls (domain, status);

drop trigger if exists admin_security_controls_set_updated_at
on admin_security_controls;

create trigger admin_security_controls_set_updated_at
before update on admin_security_controls
for each row
execute function set_updated_at();

create table if not exists admin_security_policy_control_mappings (
  id uuid primary key default gen_random_uuid(),

  admin_security_governance_policy_id uuid not null
    references admin_security_governance_policies(id)
    on delete cascade,

  admin_security_control_id uuid not null
    references admin_security_controls(id)
    on delete cascade,

  status text not null default 'active',
  mapping_strength text not null default 'primary',

  rationale text not null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (
    admin_security_governance_policy_id,
    admin_security_control_id
  ),

  constraint admin_security_policy_control_mappings_status_check
  check (
    status in (
      'active',
      'paused',
      'archived'
    )
  ),

  constraint admin_security_policy_control_mappings_strength_check
  check (
    mapping_strength in (
      'primary',
      'supporting',
      'partial'
    )
  )
);

create index if not exists admin_security_policy_control_mappings_policy_idx
on admin_security_policy_control_mappings (
  admin_security_governance_policy_id,
  status
);

create index if not exists admin_security_policy_control_mappings_control_idx
on admin_security_policy_control_mappings (
  admin_security_control_id,
  status
);

drop trigger if exists admin_security_policy_control_mappings_set_updated_at
on admin_security_policy_control_mappings;

create trigger admin_security_policy_control_mappings_set_updated_at
before update on admin_security_policy_control_mappings
for each row
execute function set_updated_at();

create table if not exists admin_security_rule_control_mappings (
  id uuid primary key default gen_random_uuid(),

  admin_security_governance_policy_rule_id uuid not null
    references admin_security_governance_policy_rules(id)
    on delete cascade,

  admin_security_control_id uuid not null
    references admin_security_controls(id)
    on delete cascade,

  status text not null default 'active',
  mapping_strength text not null default 'primary',

  rationale text not null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (
    admin_security_governance_policy_rule_id,
    admin_security_control_id
  ),

  constraint admin_security_rule_control_mappings_status_check
  check (
    status in (
      'active',
      'paused',
      'archived'
    )
  ),

  constraint admin_security_rule_control_mappings_strength_check
  check (
    mapping_strength in (
      'primary',
      'supporting',
      'partial'
    )
  )
);

create index if not exists admin_security_rule_control_mappings_rule_idx
on admin_security_rule_control_mappings (
  admin_security_governance_policy_rule_id,
  status
);

create index if not exists admin_security_rule_control_mappings_control_idx
on admin_security_rule_control_mappings (
  admin_security_control_id,
  status
);

drop trigger if exists admin_security_rule_control_mappings_set_updated_at
on admin_security_rule_control_mappings;

create trigger admin_security_rule_control_mappings_set_updated_at
before update on admin_security_rule_control_mappings
for each row
execute function set_updated_at();

create table if not exists admin_security_control_evidence_mappings (
  id uuid primary key default gen_random_uuid(),

  admin_security_control_id uuid not null
    references admin_security_controls(id)
    on delete cascade,

  status text not null default 'active',
  evidence_key text not null,
  evidence_type text not null,

  source_type text not null,
  source_table text,
  source_view text,
  source_function text,
  source_route text,

  evidence_description text not null,

  freshness_requirement_hours integer not null default 24,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (admin_security_control_id, evidence_key),

  constraint admin_security_control_evidence_mappings_status_check
  check (
    status in (
      'active',
      'paused',
      'archived'
    )
  ),

  constraint admin_security_control_evidence_mappings_type_check
  check (
    evidence_type in (
      'table',
      'view',
      'function',
      'api',
      'report',
      'snapshot',
      'audit_hash',
      'archive',
      'manual'
    )
  ),

  constraint admin_security_control_evidence_mappings_freshness_check
  check (freshness_requirement_hours >= 0)
);

create index if not exists admin_security_control_evidence_mappings_control_idx
on admin_security_control_evidence_mappings (admin_security_control_id, status);

create index if not exists admin_security_control_evidence_mappings_source_idx
on admin_security_control_evidence_mappings (source_type, status);

drop trigger if exists admin_security_control_evidence_mappings_set_updated_at
on admin_security_control_evidence_mappings;

create trigger admin_security_control_evidence_mappings_set_updated_at
before update on admin_security_control_evidence_mappings
for each row
execute function set_updated_at();

create table if not exists admin_security_control_evidence_runs (
  id uuid primary key default gen_random_uuid(),

  run_key text not null unique,
  status text not null default 'running',

  framework_id uuid references admin_security_control_frameworks(id),
  control_id uuid references admin_security_controls(id),

  collected_by_auth_user_id uuid,
  collected_by_admin_user_id uuid references admin_users(id),

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,

  evidence_count integer not null default 0,
  missing_evidence_count integer not null default 0,
  stale_evidence_count integer not null default 0,

  summary text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_control_evidence_runs_status_check
  check (
    status in (
      'running',
      'completed',
      'warning',
      'failed'
    )
  )
);

create index if not exists admin_security_control_evidence_runs_status_idx
on admin_security_control_evidence_runs (status, created_at desc);

create index if not exists admin_security_control_evidence_runs_control_idx
on admin_security_control_evidence_runs (control_id, created_at desc);

drop trigger if exists admin_security_control_evidence_runs_set_updated_at
on admin_security_control_evidence_runs;

create trigger admin_security_control_evidence_runs_set_updated_at
before update on admin_security_control_evidence_runs
for each row
execute function set_updated_at();

create table if not exists admin_security_control_evidence_items (
  id uuid primary key default gen_random_uuid(),

  admin_security_control_evidence_run_id uuid not null
    references admin_security_control_evidence_runs(id)
    on delete cascade,

  admin_security_control_id uuid not null
    references admin_security_controls(id)
    on delete cascade,

  evidence_mapping_id uuid references admin_security_control_evidence_mappings(id),

  evidence_key text not null,
  status text not null,
  source_type text not null,
  source_id uuid,

  evidence_uri text,
  evidence_payload jsonb not null default '{}'::jsonb,

  collected_at timestamptz not null default now(),

  freshness_requirement_hours integer not null default 24,
  stale boolean not null default false,

  message text,

  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint admin_security_control_evidence_items_status_check
  check (
    status in (
      'present',
      'missing',
      'stale',
      'manual_required',
      'error'
    )
  )
);

create index if not exists admin_security_control_evidence_items_run_idx
on admin_security_control_evidence_items (
  admin_security_control_evidence_run_id,
  status
);

create index if not exists admin_security_control_evidence_items_control_idx
on admin_security_control_evidence_items (
  admin_security_control_id,
  status
);

insert into admin_security_control_frameworks (
  framework_key,
  framework_name,
  status,
  version,
  authority,
  description,
  metadata
)
values
  (
    'soc2',
    'SOC 2',
    'active',
    'trust_services_criteria',
    'AICPA',
    'SOC 2 control framework mapping for security, availability, confidentiality, processing integrity, and privacy.',
    '{}'::jsonb
  ),
  (
    'iso27001',
    'ISO/IEC 27001',
    'active',
    '2022',
    'ISO',
    'ISO/IEC 27001 information security management control mapping.',
    '{}'::jsonb
  ),
  (
    'gdpr',
    'GDPR',
    'active',
    '2016/679',
    'European Union',
    'GDPR privacy and data protection obligation mapping.',
    '{}'::jsonb
  ),
  (
    'internal_security',
    'Internal Security Controls',
    'active',
    'v1',
    'platform',
    'Internal platform security governance controls.',
    '{}'::jsonb
  )
on conflict (framework_key)
do update set
  framework_name = excluded.framework_name,
  status = excluded.status,
  version = excluded.version,
  authority = excluded.authority,
  description = excluded.description,
  metadata = admin_security_control_frameworks.metadata || excluded.metadata,
  updated_at = now();

insert into admin_security_controls (
  framework_id,
  control_key,
  control_name,
  status,
  domain,
  control_type,
  severity,
  description,
  expected_evidence,
  metadata
)
select
  f.id,
  x.control_key,
  x.control_name,
  'active',
  x.domain,
  x.control_type,
  x.severity,
  x.description,
  x.expected_evidence,
  '{}'::jsonb
from admin_security_control_frameworks f
cross join (
  values
    (
      'CC6.1',
      'Logical access security',
      'access_control',
      'preventive',
      'critical',
      'Logical access to administrative functions is restricted and controlled.',
      'Admin MFA records, admin session controls, role assignments, privileged action logs.'
    ),
    (
      'CC7.2',
      'Security monitoring',
      'monitoring',
      'detective',
      'critical',
      'Security events are monitored, evaluated, and escalated.',
      'Security alerts, incident reviews, notification deliveries, command center snapshots.'
    ),
    (
      'CC7.3',
      'Incident response',
      'incident_response',
      'corrective',
      'critical',
      'Security incidents are evaluated, reviewed, and remediated.',
      'Incident reviews, corrective actions, closure evidence, audit hash records.'
    ),
    (
      'CC8.1',
      'Change management',
      'change_management',
      'preventive',
      'high',
      'System and policy changes are authorized, reviewed, tested, and approved.',
      'Policy change requests, reviews, approvals, simulations, activations.'
    )
) as x(
  control_key,
  control_name,
  domain,
  control_type,
  severity,
  description,
  expected_evidence
)
where f.framework_key = 'soc2'
on conflict (framework_id, control_key)
do update set
  control_name = excluded.control_name,
  domain = excluded.domain,
  control_type = excluded.control_type,
  severity = excluded.severity,
  description = excluded.description,
  expected_evidence = excluded.expected_evidence,
  updated_at = now();

insert into admin_security_controls (
  framework_id,
  control_key,
  control_name,
  status,
  domain,
  control_type,
  severity,
  description,
  expected_evidence,
  metadata
)
select
  f.id,
  x.control_key,
  x.control_name,
  'active',
  x.domain,
  x.control_type,
  x.severity,
  x.description,
  x.expected_evidence,
  '{}'::jsonb
from admin_security_control_frameworks f
cross join (
  values
    (
      'A.5.15',
      'Access control',
      'access_control',
      'preventive',
      'critical',
      'Access to information and systems is controlled based on business and security requirements.',
      'Admin permissions, MFA, sessions, access revocation, break-glass records.'
    ),
    (
      'A.5.24',
      'Incident management planning',
      'incident_response',
      'corrective',
      'critical',
      'Information security incidents are managed through documented procedures.',
      'Incident review workflow, corrective actions, security alerts.'
    ),
    (
      'A.5.28',
      'Collection of evidence',
      'audit',
      'detective',
      'high',
      'Evidence related to information security events is collected and preserved.',
      'Audit hash chain, archive manifests, verified archive records.'
    ),
    (
      'A.8.15',
      'Logging',
      'audit',
      'detective',
      'critical',
      'Logs are produced, stored, protected, and reviewed.',
      'Admin actions, security alerts, audit hash chain, daily snapshots.'
    )
) as x(
  control_key,
  control_name,
  domain,
  control_type,
  severity,
  description,
  expected_evidence
)
where f.framework_key = 'iso27001'
on conflict (framework_id, control_key)
do update set
  control_name = excluded.control_name,
  domain = excluded.domain,
  control_type = excluded.control_type,
  severity = excluded.severity,
  description = excluded.description,
  expected_evidence = excluded.expected_evidence,
  updated_at = now();

insert into admin_security_controls (
  framework_id,
  control_key,
  control_name,
  status,
  domain,
  control_type,
  severity,
  description,
  expected_evidence,
  metadata
)
select
  f.id,
  x.control_key,
  x.control_name,
  'active',
  x.domain,
  x.control_type,
  x.severity,
  x.description,
  x.expected_evidence,
  '{}'::jsonb
from admin_security_control_frameworks f
cross join (
  values
    (
      'Art.5.1.e',
      'Storage limitation',
      'retention',
      'preventive',
      'high',
      'Personal data should not be kept longer than necessary.',
      'Retention policies, archive records, deletion approvals, legal hold records.'
    ),
    (
      'Art.30',
      'Records of processing',
      'audit',
      'detective',
      'high',
      'Processing and governance records should be maintained.',
      'Governance policy registry, policy changes, evidence reports.'
    ),
    (
      'Art.32',
      'Security of processing',
      'security',
      'preventive',
      'critical',
      'Appropriate technical and organizational measures protect processing systems.',
      'MFA, access controls, incident workflow, audit hash chain.'
    )
) as x(
  control_key,
  control_name,
  domain,
  control_type,
  severity,
  description,
  expected_evidence
)
where f.framework_key = 'gdpr'
on conflict (framework_id, control_key)
do update set
  control_name = excluded.control_name,
  domain = excluded.domain,
  control_type = excluded.control_type,
  severity = excluded.severity,
  description = excluded.description,
  expected_evidence = excluded.expected_evidence,
  updated_at = now();

insert into admin_security_controls (
  framework_id,
  control_key,
  control_name,
  status,
  domain,
  control_type,
  severity,
  description,
  expected_evidence,
  metadata
)
select
  f.id,
  x.control_key,
  x.control_name,
  'active',
  x.domain,
  x.control_type,
  x.severity,
  x.description,
  x.expected_evidence,
  '{}'::jsonb
from admin_security_control_frameworks f
cross join (
  values
    (
      'INT-SEC-001',
      'Privileged admin actions require MFA',
      'mfa',
      'preventive',
      'critical',
      'All privileged admin actions require recent MFA.',
      'MFA factors, challenges, verifications, admin action logs.'
    ),
    (
      'INT-SEC-002',
      'Critical security events are reviewed',
      'incident_review',
      'corrective',
      'critical',
      'Critical admin security events generate incident reviews and corrective actions.',
      'Security alerts, incident reviews, corrective action records.'
    ),
    (
      'INT-SEC-003',
      'Security records are retained, archived, and verified',
      'archive',
      'detective',
      'critical',
      'Security records follow retention, archive, verification, and deletion controls.',
      'Retention policies, archive manifests, verification jobs, deletion requests.'
    ),
    (
      'INT-SEC-004',
      'Legal hold overrides deletion',
      'legal_hold',
      'preventive',
      'critical',
      'Active legal holds block deletion.',
      'Legal hold records, legal hold targets, blocked deletion evaluations.'
    ),
    (
      'INT-SEC-005',
      'Security policy changes require approval and simulation',
      'change_management',
      'preventive',
      'critical',
      'Security governance policy changes require review, approval, simulation, and activation evidence.',
      'Policy change requests, reviews, simulations, policy activation logs.'
    )
) as x(
  control_key,
  control_name,
  domain,
  control_type,
  severity,
  description,
  expected_evidence
)
where f.framework_key = 'internal_security'
on conflict (framework_id, control_key)
do update set
  control_name = excluded.control_name,
  domain = excluded.domain,
  control_type = excluded.control_type,
  severity = excluded.severity,
  description = excluded.description,
  expected_evidence = excluded.expected_evidence,
  updated_at = now();

insert into admin_security_policy_control_mappings (
  admin_security_governance_policy_id,
  admin_security_control_id,
  status,
  mapping_strength,
  rationale,
  metadata
)
select
  p.id,
  c.id,
  'active',
  'primary',
  'Policy directly enforces privileged access control.',
  '{}'::jsonb
from admin_security_governance_policies p
join admin_security_control_frameworks f
  on f.framework_key in ('soc2', 'iso27001', 'internal_security')
join admin_security_controls c
  on c.framework_id = f.id
where p.policy_key = 'admin_mfa_required_for_privileged_actions'
  and c.control_key in ('CC6.1', 'A.5.15', 'INT-SEC-001')
on conflict do nothing;

insert into admin_security_policy_control_mappings (
  admin_security_governance_policy_id,
  admin_security_control_id,
  status,
  mapping_strength,
  rationale,
  metadata
)
select
  p.id,
  c.id,
  'active',
  'primary',
  'Policy directly supports incident monitoring and response.',
  '{}'::jsonb
from admin_security_governance_policies p
join admin_security_control_frameworks f
  on f.framework_key in ('soc2', 'iso27001', 'internal_security')
join admin_security_controls c
  on c.framework_id = f.id
where p.policy_key in (
  'critical_alerts_require_incident_reviews',
  'incident_reviews_require_corrective_action_or_no_action_reason',
  'critical_admin_events_notify_external_channels'
)
and c.control_key in ('CC7.2', 'CC7.3', 'A.5.24', 'INT-SEC-002')
on conflict do nothing;

insert into admin_security_policy_control_mappings (
  admin_security_governance_policy_id,
  admin_security_control_id,
  status,
  mapping_strength,
  rationale,
  metadata
)
select
  p.id,
  c.id,
  'active',
  'primary',
  'Policy directly supports archive, retention, deletion, and evidence preservation.',
  '{}'::jsonb
from admin_security_governance_policies p
join admin_security_control_frameworks f
  on f.framework_key in ('soc2', 'iso27001', 'gdpr', 'internal_security')
join admin_security_controls c
  on c.framework_id = f.id
where p.policy_key in (
  'security_records_require_retention_policy',
  'archives_must_be_exported_sealed_and_verified',
  'deletion_requires_verified_archive_and_second_admin',
  'legal_hold_overrides_retention_and_deletion',
  'terminal_security_records_must_be_hash_chained'
)
and c.control_key in ('A.5.28', 'A.8.15', 'Art.5.1.e', 'Art.30', 'INT-SEC-003', 'INT-SEC-004')
on conflict do nothing;

insert into admin_security_policy_control_mappings (
  admin_security_governance_policy_id,
  admin_security_control_id,
  status,
  mapping_strength,
  rationale,
  metadata
)
select
  p.id,
  c.id,
  'active',
  'primary',
  'Policy directly supports security governance change management.',
  '{}'::jsonb
from admin_security_governance_policies p
join admin_security_control_frameworks f
  on f.framework_key in ('soc2', 'internal_security')
join admin_security_controls c
  on c.framework_id = f.id
where p.policy_key in (
  'admin_security_policy_change_requires_simulation'
)
and c.control_key in ('CC8.1', 'INT-SEC-005')
on conflict do nothing;

insert into admin_security_control_evidence_mappings (
  admin_security_control_id,
  status,
  evidence_key,
  evidence_type,
  source_type,
  source_table,
  source_view,
  source_function,
  source_route,
  evidence_description,
  freshness_requirement_hours,
  metadata
)
select
  c.id,
  'active',
  x.evidence_key,
  x.evidence_type,
  x.source_type,
  x.source_table,
  x.source_view,
  x.source_function,
  x.source_route,
  x.evidence_description,
  x.freshness_requirement_hours,
  '{}'::jsonb
from admin_security_controls c
join admin_security_control_frameworks f
  on f.id = c.framework_id
cross join (
  values
    (
      'admin_mfa_posture',
      'view',
      'admin_security_actor_rollup',
      null,
      'admin_security_actor_rollup',
      null,
      '/v1/admin/security-command-center/actors',
      'Shows admin MFA posture and super-admin MFA coverage.',
      24
    ),
    (
      'admin_security_command_center',
      'view',
      'admin_security_command_center_summary',
      null,
      'admin_security_command_center_summary',
      null,
      '/v1/admin/security-command-center/summary',
      'Shows current admin security posture.',
      24
    ),
    (
      'incident_reviews',
      'table',
      'admin_incident_review',
      'admin_incident_reviews',
      null,
      null,
      '/v1/admin/incident-reviews',
      'Shows incident review lifecycle evidence.',
      24
    ),
    (
      'corrective_actions',
      'table',
      'admin_incident_corrective_action',
      'admin_incident_corrective_actions',
      null,
      null,
      '/v1/admin/incident-corrective-actions',
      'Shows corrective action evidence.',
      24
    ),
    (
      'archive_manifests',
      'table',
      'admin_security_archive_manifest',
      'admin_security_archive_manifests',
      null,
      null,
      '/v1/admin/security-archive/manifests',
      'Shows archive manifest lifecycle evidence.',
      168
    ),
    (
      'archive_verification',
      'view',
      'admin_security_archive_verification_job_dashboard',
      null,
      'admin_security_archive_verification_job_dashboard',
      null,
      '/v1/admin/security-archive/verification-jobs',
      'Shows archive restore verification evidence.',
      168
    ),
    (
      'legal_holds',
      'view',
      'admin_security_legal_hold_dashboard',
      null,
      'admin_security_legal_hold_dashboard',
      null,
      '/v1/admin/security-legal-holds',
      'Shows legal hold lifecycle evidence.',
      24
    ),
    (
      'policy_changes',
      'view',
      'admin_security_policy_change_request_dashboard',
      null,
      'admin_security_policy_change_request_dashboard',
      null,
      '/v1/admin/security-policy-changes',
      'Shows policy change approval and activation evidence.',
      24
    ),
    (
      'policy_simulations',
      'view',
      'admin_security_policy_simulation_run_dashboard',
      null,
      'admin_security_policy_simulation_run_dashboard',
      null,
      '/v1/admin/security-policy-changes/simulations',
      'Shows policy simulation evidence.',
      24
    ),
    (
      'audit_hash_chain',
      'table',
      'audit_hash_chain_entry',
      'audit_hash_chain_entries',
      null,
      null,
      '/v1/admin/audit/hash-chain',
      'Shows tamper-evident audit hash-chain evidence.',
      24
    )
) as x(
  evidence_key,
  evidence_type,
  source_type,
  source_table,
  source_view,
  source_function,
  source_route,
  evidence_description,
  freshness_requirement_hours
)
where c.status = 'active'
  and (
    c.domain in (
      'access_control',
      'monitoring',
      'incident_response',
      'audit',
      'archive',
      'legal_hold',
      'change_management',
      'retention',
      'security'
    )
  )
on conflict (admin_security_control_id, evidence_key)
do nothing;

create or replace function run_admin_security_control_evidence_collection(
  p_admin_auth_user_id uuid default null,
  p_framework_key text default null,
  p_control_key text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_run_id uuid;
  v_run_key text;
  v_mapping record;

  v_evidence_count integer := 0;
  v_missing_count integer := 0;
  v_stale_count integer := 0;
  v_status text := 'completed';
begin
  if p_admin_auth_user_id is not null then
    if admin_has_permission(p_admin_auth_user_id, 'admin.read') is not true then
      raise exception 'missing required permission: admin.read';
    end if;

    v_admin := get_active_admin_user(p_admin_auth_user_id);
  end if;

  if p_framework_key is not null
    and not exists (
      select 1
      from admin_security_control_frameworks f
      where f.framework_key = p_framework_key
    ) then
    raise exception 'admin security control framework not found: %', p_framework_key;
  end if;

  if p_control_key is not null
    and not exists (
      select 1
      from admin_security_controls c
      where c.control_key = p_control_key
    ) then
    raise exception 'admin security control not found: %', p_control_key;
  end if;

  v_run_key :=
    'control_evidence:' ||
    coalesce(p_framework_key, 'all') || ':' ||
    coalesce(p_control_key, 'all') || ':' ||
    extract(epoch from now())::bigint::text;

  insert into admin_security_control_evidence_runs (
    run_key,
    status,
    framework_id,
    control_id,
    collected_by_auth_user_id,
    collected_by_admin_user_id,
    request_id,
    metadata
  )
  select
    v_run_key,
    'running',
    f.id,
    c.id,
    p_admin_auth_user_id,
    v_admin.id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  from (select 1) seed
  left join admin_security_control_frameworks f
    on f.framework_key = p_framework_key
  left join admin_security_controls c
    on c.framework_id = f.id
   and c.control_key = p_control_key
  returning id into v_run_id;

  for v_mapping in
    select
      em.*,
      c.id as control_id,
      c.control_key,
      c.control_name,
      f.framework_key
    from admin_security_control_evidence_mappings em
    join admin_security_controls c
      on c.id = em.admin_security_control_id
    join admin_security_control_frameworks f
      on f.id = c.framework_id
    where em.status = 'active'
      and c.status = 'active'
      and f.status = 'active'
      and (p_framework_key is null or f.framework_key = p_framework_key)
      and (p_control_key is null or c.control_key = p_control_key)
    order by f.framework_key, c.control_key, em.evidence_key
  loop
    if v_mapping.source_type = 'admin_security_actor_rollup' then
      insert into admin_security_control_evidence_items (
        admin_security_control_evidence_run_id,
        admin_security_control_id,
        evidence_mapping_id,
        evidence_key,
        status,
        source_type,
        evidence_payload,
        freshness_requirement_hours,
        stale,
        message
      )
      select
        v_run_id,
        v_mapping.control_id,
        v_mapping.id,
        v_mapping.evidence_key,
        case when count(*) > 0 then 'present' else 'missing' end,
        v_mapping.source_type,
        jsonb_build_object(
          'row_count',
          count(*),
          'super_admin_without_mfa_count',
          count(*) filter (
            where is_super_admin is true
              and has_active_mfa_factor is not true
          )
        ),
        v_mapping.freshness_requirement_hours,
        false,
        'Collected admin MFA posture evidence.'
      from admin_security_actor_rollup;

    elsif v_mapping.source_type = 'admin_security_command_center_summary' then
      insert into admin_security_control_evidence_items (
        admin_security_control_evidence_run_id,
        admin_security_control_id,
        evidence_mapping_id,
        evidence_key,
        status,
        source_type,
        evidence_payload,
        freshness_requirement_hours,
        stale,
        message
      )
      select
        v_run_id,
        v_mapping.control_id,
        v_mapping.id,
        v_mapping.evidence_key,
        'present',
        v_mapping.source_type,
        to_jsonb(s),
        v_mapping.freshness_requirement_hours,
        false,
        'Collected command center summary evidence.'
      from admin_security_command_center_summary s
      limit 1;

    elsif v_mapping.source_type = 'admin_incident_review' then
      insert into admin_security_control_evidence_items (
        admin_security_control_evidence_run_id,
        admin_security_control_id,
        evidence_mapping_id,
        evidence_key,
        status,
        source_type,
        evidence_payload,
        freshness_requirement_hours,
        stale,
        message
      )
      select
        v_run_id,
        v_mapping.control_id,
        v_mapping.id,
        v_mapping.evidence_key,
        'present',
        v_mapping.source_type,
        jsonb_build_object(
          'review_count_30d',
          count(*) filter (where created_at >= now() - interval '30 days'),
          'open_review_count',
          count(*) filter (where status in ('open', 'in_review', 'needs_action')),
          'overdue_review_count',
          count(*) filter (where status = 'overdue')
        ),
        v_mapping.freshness_requirement_hours,
        false,
        'Collected incident review evidence.'
      from admin_incident_reviews;

    elsif v_mapping.source_type = 'admin_incident_corrective_action' then
      insert into admin_security_control_evidence_items (
        admin_security_control_evidence_run_id,
        admin_security_control_id,
        evidence_mapping_id,
        evidence_key,
        status,
        source_type,
        evidence_payload,
        freshness_requirement_hours,
        stale,
        message
      )
      select
        v_run_id,
        v_mapping.control_id,
        v_mapping.id,
        v_mapping.evidence_key,
        'present',
        v_mapping.source_type,
        jsonb_build_object(
          'corrective_action_count_30d',
          count(*) filter (where created_at >= now() - interval '30 days'),
          'open_corrective_action_count',
          count(*) filter (where status in ('open', 'assigned', 'in_progress', 'overdue')),
          'overdue_corrective_action_count',
          count(*) filter (where status = 'overdue')
        ),
        v_mapping.freshness_requirement_hours,
        false,
        'Collected corrective action evidence.'
      from admin_incident_corrective_actions;

    elsif v_mapping.source_type = 'admin_security_archive_manifest' then
      insert into admin_security_control_evidence_items (
        admin_security_control_evidence_run_id,
        admin_security_control_id,
        evidence_mapping_id,
        evidence_key,
        status,
        source_type,
        evidence_payload,
        freshness_requirement_hours,
        stale,
        message
      )
      select
        v_run_id,
        v_mapping.control_id,
        v_mapping.id,
        v_mapping.evidence_key,
        case when count(*) > 0 then 'present' else 'missing' end,
        v_mapping.source_type,
        jsonb_build_object(
          'manifest_count',
          count(*),
          'verified_manifest_count',
          count(*) filter (where status = 'verified'),
          'sealed_manifest_count',
          count(*) filter (where status = 'sealed')
        ),
        v_mapping.freshness_requirement_hours,
        false,
        'Collected archive manifest evidence.'
      from admin_security_archive_manifests;

    elsif v_mapping.source_type = 'admin_security_archive_verification_job_dashboard' then
      insert into admin_security_control_evidence_items (
        admin_security_control_evidence_run_id,
        admin_security_control_id,
        evidence_mapping_id,
        evidence_key,
        status,
        source_type,
        evidence_payload,
        freshness_requirement_hours,
        stale,
        message
      )
      select
        v_run_id,
        v_mapping.control_id,
        v_mapping.id,
        v_mapping.evidence_key,
        case when count(*) > 0 then 'present' else 'missing' end,
        v_mapping.source_type,
        jsonb_build_object(
          'verification_job_count',
          count(*),
          'passed_count',
          count(*) filter (where status = 'passed'),
          'failed_count',
          count(*) filter (where status in ('failed', 'abandoned'))
        ),
        v_mapping.freshness_requirement_hours,
        false,
        'Collected archive verification evidence.'
      from admin_security_archive_verification_job_dashboard;

    elsif v_mapping.source_type = 'admin_security_legal_hold_dashboard' then
      insert into admin_security_control_evidence_items (
        admin_security_control_evidence_run_id,
        admin_security_control_id,
        evidence_mapping_id,
        evidence_key,
        status,
        source_type,
        evidence_payload,
        freshness_requirement_hours,
        stale,
        message
      )
      select
        v_run_id,
        v_mapping.control_id,
        v_mapping.id,
        v_mapping.evidence_key,
        'present',
        v_mapping.source_type,
        jsonb_build_object(
          'active_legal_hold_count',
          count(*) filter (where status = 'active'),
          'released_legal_hold_count',
          count(*) filter (where status = 'released')
        ),
        v_mapping.freshness_requirement_hours,
        false,
        'Collected legal hold evidence.'
      from admin_security_legal_hold_dashboard;

    elsif v_mapping.source_type = 'admin_security_policy_change_request_dashboard' then
      insert into admin_security_control_evidence_items (
        admin_security_control_evidence_run_id,
        admin_security_control_id,
        evidence_mapping_id,
        evidence_key,
        status,
        source_type,
        evidence_payload,
        freshness_requirement_hours,
        stale,
        message
      )
      select
        v_run_id,
        v_mapping.control_id,
        v_mapping.id,
        v_mapping.evidence_key,
        'present',
        v_mapping.source_type,
        jsonb_build_object(
          'policy_change_count_30d',
          count(*) filter (where created_at >= now() - interval '30 days'),
          'activated_count_30d',
          count(*) filter (where status = 'activated' and activated_at >= now() - interval '30 days'),
          'open_critical_change_count',
          count(*) filter (where risk_level = 'critical' and status in ('draft', 'submitted', 'approved'))
        ),
        v_mapping.freshness_requirement_hours,
        false,
        'Collected policy change evidence.'
      from admin_security_policy_change_request_dashboard;

    elsif v_mapping.source_type = 'admin_security_policy_simulation_run_dashboard' then
      insert into admin_security_control_evidence_items (
        admin_security_control_evidence_run_id,
        admin_security_control_id,
        evidence_mapping_id,
        evidence_key,
        status,
        source_type,
        evidence_payload,
        freshness_requirement_hours,
        stale,
        message
      )
      select
        v_run_id,
        v_mapping.control_id,
        v_mapping.id,
        v_mapping.evidence_key,
        case when count(*) > 0 then 'present' else 'missing' end,
        v_mapping.source_type,
        jsonb_build_object(
          'simulation_count_30d',
          count(*) filter (where created_at >= now() - interval '30 days'),
          'activation_blocking_count_30d',
          count(*) filter (
            where activation_blocking is true
              and created_at >= now() - interval '30 days'
          )
        ),
        v_mapping.freshness_requirement_hours,
        false,
        'Collected policy simulation evidence.'
      from admin_security_policy_simulation_run_dashboard;

    elsif v_mapping.source_type = 'audit_hash_chain_entry' then
      insert into admin_security_control_evidence_items (
        admin_security_control_evidence_run_id,
        admin_security_control_id,
        evidence_mapping_id,
        evidence_key,
        status,
        source_type,
        evidence_payload,
        freshness_requirement_hours,
        stale,
        message
      )
      select
        v_run_id,
        v_mapping.control_id,
        v_mapping.id,
        v_mapping.evidence_key,
        case when count(*) > 0 then 'present' else 'missing' end,
        v_mapping.source_type,
        jsonb_build_object(
          'hash_entry_count',
          count(*),
          'hash_entry_count_30d',
          count(*) filter (where created_at >= now() - interval '30 days')
        ),
        v_mapping.freshness_requirement_hours,
        false,
        'Collected audit hash chain evidence.'
      from audit_hash_chain_entries;

    else
      insert into admin_security_control_evidence_items (
        admin_security_control_evidence_run_id,
        admin_security_control_id,
        evidence_mapping_id,
        evidence_key,
        status,
        source_type,
        evidence_payload,
        freshness_requirement_hours,
        stale,
        message
      )
      values (
        v_run_id,
        v_mapping.control_id,
        v_mapping.id,
        v_mapping.evidence_key,
        'manual_required',
        v_mapping.source_type,
        '{}'::jsonb,
        v_mapping.freshness_requirement_hours,
        false,
        'Manual evidence collection required for this mapping.'
      );
    end if;
  end loop;

  select
    count(*),
    count(*) filter (where status = 'missing'),
    count(*) filter (where status = 'stale')
  into
    v_evidence_count,
    v_missing_count,
    v_stale_count
  from admin_security_control_evidence_items
  where admin_security_control_evidence_run_id = v_run_id;

  if v_missing_count > 0 or v_stale_count > 0 then
    v_status := 'warning';
  else
    v_status := 'completed';
  end if;

  update admin_security_control_evidence_runs
  set
    status = v_status,
    completed_at = now(),
    evidence_count = v_evidence_count,
    missing_evidence_count = v_missing_count,
    stale_evidence_count = v_stale_count,
    summary =
      'Evidence collection completed. Evidence=' || v_evidence_count ||
      ', missing=' || v_missing_count ||
      ', stale=' || v_stale_count || '.',
    updated_at = now()
  where id = v_run_id;

  return v_run_id;

exception
  when others then
    if v_run_id is not null then
      update admin_security_control_evidence_runs
      set
        status = 'failed',
        failed_at = now(),
        summary = sqlerrm,
        updated_at = now()
      where id = v_run_id;
    end if;

    raise;
end;
$$;

create or replace view admin_security_control_coverage_dashboard as
select
  c.id as admin_security_control_id,
  f.framework_key,
  f.framework_name,
  f.version as framework_version,
  c.control_key,
  c.control_name,
  c.domain,
  c.control_type,
  c.severity,
  c.status,
  c.description,
  c.expected_evidence,
  (
    select count(*)
    from admin_security_policy_control_mappings pcm
    where pcm.admin_security_control_id = c.id
      and pcm.status = 'active'
  ) as mapped_policy_count,
  (
    select count(*)
    from admin_security_rule_control_mappings rcm
    where rcm.admin_security_control_id = c.id
      and rcm.status = 'active'
  ) as mapped_rule_count,
  (
    select count(*)
    from admin_security_control_evidence_mappings em
    where em.admin_security_control_id = c.id
      and em.status = 'active'
  ) as evidence_mapping_count,
  (
    select max(ei.collected_at)
    from admin_security_control_evidence_items ei
    where ei.admin_security_control_id = c.id
  ) as latest_evidence_collected_at,
  (
    select count(*)
    from admin_security_control_evidence_items ei
    where ei.admin_security_control_id = c.id
      and ei.status in ('missing', 'error')
      and ei.created_at >= now() - interval '30 days'
  ) as missing_or_error_evidence_count_30d,
  case
    when (
      select count(*)
      from admin_security_policy_control_mappings pcm
      where pcm.admin_security_control_id = c.id
        and pcm.status = 'active'
    ) = 0 then 'missing_policy_mapping'
    when (
      select count(*)
      from admin_security_control_evidence_mappings em
      where em.admin_security_control_id = c.id
        and em.status = 'active'
    ) = 0 then 'missing_evidence_mapping'
    when (
      select count(*)
      from admin_security_control_evidence_items ei
      where ei.admin_security_control_id = c.id
        and ei.status in ('missing', 'error')
        and ei.created_at >= now() - interval '30 days'
    ) > 0 then 'evidence_gap'
    else 'covered'
  end as coverage_status,
  c.created_at,
  c.updated_at,
  c.metadata
from admin_security_controls c
join admin_security_control_frameworks f
  on f.id = c.framework_id
order by f.framework_key, c.control_key;

create or replace view admin_security_policy_control_mapping_dashboard as
select
  pcm.id as admin_security_policy_control_mapping_id,
  p.policy_key,
  p.policy_name,
  p.category as policy_category,
  p.status as policy_status,
  f.framework_key,
  f.framework_name,
  c.control_key,
  c.control_name,
  c.domain,
  c.control_type,
  c.severity,
  pcm.mapping_strength,
  pcm.rationale,
  pcm.status,
  pcm.created_at,
  pcm.updated_at,
  pcm.metadata
from admin_security_policy_control_mappings pcm
join admin_security_governance_policies p
  on p.id = pcm.admin_security_governance_policy_id
join admin_security_controls c
  on c.id = pcm.admin_security_control_id
join admin_security_control_frameworks f
  on f.id = c.framework_id
order by f.framework_key, c.control_key, p.policy_key;

create or replace view admin_security_control_evidence_run_dashboard as
select
  r.id as admin_security_control_evidence_run_id,
  r.run_key,
  r.status,
  f.framework_key,
  f.framework_name,
  c.control_key,
  c.control_name,
  r.collected_by_auth_user_id,
  au.email as collected_by_email,
  au.display_name as collected_by_display_name,
  r.started_at,
  r.completed_at,
  r.failed_at,
  r.evidence_count,
  r.missing_evidence_count,
  r.stale_evidence_count,
  r.summary,
  r.created_at,
  r.updated_at,
  r.metadata
from admin_security_control_evidence_runs r
left join admin_security_control_frameworks f
  on f.id = r.framework_id
left join admin_security_controls c
  on c.id = r.control_id
left join admin_users au
  on au.id = r.collected_by_admin_user_id
order by r.created_at desc;

create or replace view admin_security_control_mapping_integrity as
select
  (
    select count(*)
    from admin_security_control_frameworks
    where status = 'active'
  ) as active_framework_count,
  (
    select count(*)
    from admin_security_controls
    where status = 'active'
  ) as active_control_count,
  (
    select count(*)
    from admin_security_control_coverage_dashboard
    where coverage_status = 'covered'
  ) as covered_control_count,
  (
    select count(*)
    from admin_security_control_coverage_dashboard
    where coverage_status <> 'covered'
  ) as uncovered_or_gap_control_count,
  (
    select count(*)
    from admin_security_control_coverage_dashboard
    where coverage_status = 'missing_policy_mapping'
  ) as missing_policy_mapping_count,
  (
    select count(*)
    from admin_security_control_coverage_dashboard
    where coverage_status = 'missing_evidence_mapping'
  ) as missing_evidence_mapping_count,
  (
    select count(*)
    from admin_security_control_evidence_runs
    where created_at >= now() - interval '30 days'
  ) as evidence_run_count_30d,
  (
    select max(created_at)
    from admin_security_control_evidence_runs
  ) as latest_evidence_run_at,
  now() as checked_at;

grant select on admin_security_control_coverage_dashboard to admin_api_role;
grant select on admin_security_policy_control_mapping_dashboard to admin_api_role;
grant select on admin_security_control_evidence_run_dashboard to admin_api_role;
grant select on admin_security_control_mapping_integrity to admin_api_role;

create or replace function hash_admin_security_control_framework(
  p_admin_security_control_framework_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_framework admin_security_control_frameworks%rowtype;
  v_controls jsonb;
  v_payload jsonb;
begin
  select *
  into v_framework
  from admin_security_control_frameworks
  where id = p_admin_security_control_framework_id;

  if v_framework.id is null then
    raise exception 'admin security control framework not found: %', p_admin_security_control_framework_id;
  end if;

  select coalesce(jsonb_agg(to_jsonb(c) order by c.control_key), '[]'::jsonb)
  into v_controls
  from admin_security_controls c
  where c.framework_id = v_framework.id;

  v_payload := jsonb_build_object(
    'source_type', 'admin_security_control_framework',
    'source_id', v_framework.id,
    'framework_key', v_framework.framework_key,
    'framework_name', v_framework.framework_name,
    'status', v_framework.status,
    'version', v_framework.version,
    'authority', v_framework.authority,
    'description', v_framework.description,
    'controls', v_controls,
    'created_at', v_framework.created_at,
    'updated_at', v_framework.updated_at
  );

  return append_audit_hash_chain_entry(
    'admin_security_control_framework',
    v_framework.id,
    v_payload,
    'global_audit_chain',
    p_metadata
  );
end;
$$;

create or replace view audit_hash_missing_records as
select
  'wallet_ledger_entry'::text as source_type,
  wle.id as source_id,
  wle.created_at
from wallet_ledger_entries wle
where not exists (
  select 1 from audit_hash_chain_entries ahc where ahc.source_type = 'wallet_ledger_entry' and ahc.source_id = wle.id
)
union all
select
  'accounting_journal_entry'::text as source_type,
  aje.id as source_id,
  aje.created_at
from accounting_journal_entries aje
where not exists (
  select 1 from audit_hash_chain_entries ahc where ahc.source_type = 'accounting_journal_entry' and ahc.source_id = aje.id
)
union all
select
  'reward_issuance_group'::text as source_type,
  rig.id as source_id,
  rig.created_at
from reward_issuance_groups rig
where rig.status = 'completed'
  and not exists (
    select 1 from audit_hash_chain_entries ahc where ahc.source_type = 'reward_issuance_group' and ahc.source_id = rig.id
  )
union all
select
  'attention_verification_event'::text as source_type,
  ave.id as source_id,
  ave.created_at
from attention_verification_events ave
where not exists (
  select 1 from audit_hash_chain_entries ahc where ahc.source_type = 'attention_verification_event' and ahc.source_id = ave.id
)
union all
select
  'withdrawal_request'::text as source_type,
  wr.id as source_id,
  wr.created_at
from withdrawal_requests wr
where wr.status in ('reserved', 'submitted', 'processing', 'paid', 'failed', 'cancelled')
  and not exists (
    select 1 from audit_hash_chain_entries ahc where ahc.source_type = 'withdrawal_request' and ahc.source_id = wr.id
  )
union all
select
  'external_payout'::text as source_type,
  ep.id as source_id,
  ep.created_at
from external_payouts ep
where not exists (
  select 1 from audit_hash_chain_entries ahc where ahc.source_type = 'external_payout' and ahc.source_id = ep.id
)
union all
select
  'payout_provider_event'::text as source_type,
  ppe.id as source_id,
  ppe.created_at
from payout_provider_events ppe
where ppe.processing_status in ('processed', 'ignored', 'failed')
  and not exists (
    select 1 from audit_hash_chain_entries ahc where ahc.source_type = 'payout_provider_event' and ahc.source_id = ppe.id
  )
union all
select
  'admin_security_control_framework'::text as source_type,
  f.id as source_id,
  f.created_at
from admin_security_control_frameworks f
where f.status in ('active', 'archived')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_control_framework'
      and ahc.source_id = f.id
  );

create or replace function run_audit_hash_backfill_job(
  p_batch_size integer default 1000,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid;
  v_row record;
  v_scanned integer := 0;
  v_hashed integer := 0;
  v_failed integer := 0;
begin
  if p_batch_size <= 0 then
    raise exception 'batch size must be positive';
  end if;

  insert into audit_hash_backfill_runs (status, metadata)
  values ('processing', coalesce(p_metadata, '{}'::jsonb))
  returning id into v_run_id;

  for v_row in
    select *
    from audit_hash_missing_records
    order by created_at asc
    limit p_batch_size
  loop
    v_scanned := v_scanned + 1;
    begin
      if v_row.source_type = 'wallet_ledger_entry' then
        perform hash_wallet_ledger_entry(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'accounting_journal_entry' then
        perform hash_accounting_journal_entry(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'reward_issuance_group' then
        perform hash_reward_issuance_group(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'attention_verification_event' then
        perform hash_attention_verification_event(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'withdrawal_request' then
        perform hash_withdrawal_request(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'external_payout' then
        perform hash_external_payout(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'payout_provider_event' then
        perform hash_payout_provider_event(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'admin_security_control_framework' then
        perform hash_admin_security_control_framework(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      end if;
      v_hashed := v_hashed + 1;
    exception
      when others then
        v_failed := v_failed + 1;
    end;
  end loop;

  update audit_hash_backfill_runs
  set
    status = 'completed',
    completed_at = now(),
    scanned_count = v_scanned,
    hashed_count = v_hashed,
    failed_count = v_failed
  where id = v_run_id;

  return v_run_id;
exception
  when others then
    if v_run_id is not null then
      update audit_hash_backfill_runs
      set
        status = 'failed',
        failed_at = now(),
        failure_reason = sqlerrm
      where id = v_run_id;
    end if;
    raise;
end;
$$;

grant execute on function hash_admin_security_control_framework(uuid, jsonb)
to worker_role, admin_api_role;

alter function hash_admin_security_control_framework(uuid, jsonb) security definer;
alter function hash_admin_security_control_framework(uuid, jsonb) set search_path = public;

alter table scheduled_jobs drop constraint if exists scheduled_jobs_group_check;
alter table scheduled_jobs add constraint scheduled_jobs_group_check
check (
  job_group in (
    'reward',
    'accounting',
    'audit',
    'wallet',
    'attention',
    'maintenance',
    'system',
    'admin'
  )
);

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
values (
  'admin_security_control_evidence_collection_daily',
  'Collect admin security control evidence',
  'admin',
  true,
  '43 1 * * *',
  'run_admin_security_control_evidence_collection',
  '{}'::jsonb,
  300,
  600,
  '{"priority": "high"}'::jsonb
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

  elsif v_job.function_name = 'run_admin_security_control_evidence_collection' then
    v_uuid_result := run_admin_security_control_evidence_collection(
      null,
      null,
      null,
      null,
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('evidence_run_id', v_uuid_result);

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

alter table admin_security_control_frameworks enable row level security;
alter table admin_security_controls enable row level security;
alter table admin_security_policy_control_mappings enable row level security;
alter table admin_security_rule_control_mappings enable row level security;
alter table admin_security_control_evidence_mappings enable row level security;
alter table admin_security_control_evidence_runs enable row level security;
alter table admin_security_control_evidence_items enable row level security;

drop policy if exists admin_security_control_frameworks_no_user_direct_access on admin_security_control_frameworks;
create policy admin_security_control_frameworks_no_user_direct_access
on admin_security_control_frameworks
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_controls_no_user_direct_access on admin_security_controls;
create policy admin_security_controls_no_user_direct_access
on admin_security_controls
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_policy_control_mappings_no_user_direct_access on admin_security_policy_control_mappings;
create policy admin_security_policy_control_mappings_no_user_direct_access
on admin_security_policy_control_mappings
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_rule_control_mappings_no_user_direct_access on admin_security_rule_control_mappings;
create policy admin_security_rule_control_mappings_no_user_direct_access
on admin_security_rule_control_mappings
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_control_evidence_mappings_no_user_direct_access on admin_security_control_evidence_mappings;
create policy admin_security_control_evidence_mappings_no_user_direct_access
on admin_security_control_evidence_mappings
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_control_evidence_runs_no_user_direct_access on admin_security_control_evidence_runs;
create policy admin_security_control_evidence_runs_no_user_direct_access
on admin_security_control_evidence_runs
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_control_evidence_items_no_user_direct_access on admin_security_control_evidence_items;
create policy admin_security_control_evidence_items_no_user_direct_access
on admin_security_control_evidence_items
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_api_all_admin_security_control_frameworks on admin_security_control_frameworks;
create policy admin_api_all_admin_security_control_frameworks
on admin_security_control_frameworks
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_controls on admin_security_controls;
create policy admin_api_all_admin_security_controls
on admin_security_controls
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_policy_control_mappings on admin_security_policy_control_mappings;
create policy admin_api_all_admin_security_policy_control_mappings
on admin_security_policy_control_mappings
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_rule_control_mappings on admin_security_rule_control_mappings;
create policy admin_api_all_admin_security_rule_control_mappings
on admin_security_rule_control_mappings
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_control_evidence_mappings on admin_security_control_evidence_mappings;
create policy admin_api_all_admin_security_control_evidence_mappings
on admin_security_control_evidence_mappings
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_control_evidence_runs on admin_security_control_evidence_runs;
create policy admin_api_all_admin_security_control_evidence_runs
on admin_security_control_evidence_runs
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_control_evidence_items on admin_security_control_evidence_items;
create policy admin_api_all_admin_security_control_evidence_items
on admin_security_control_evidence_items
for all
to admin_api_role
using (true)
with check (true);

grant execute on function run_admin_security_control_evidence_collection(
  uuid,
  text,
  text,
  text,
  jsonb
) to admin_api_role, worker_role;

alter function run_admin_security_control_evidence_collection(
  uuid,
  text,
  text,
  text,
  jsonb
) security definer;

alter function run_admin_security_control_evidence_collection(
  uuid,
  text,
  text,
  text,
  jsonb
) set search_path = public;

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
    'ADMIN_SECURITY_CONTROL_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Security control not found.',
    'Admin security control not found.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_CONTROL_EVIDENCE_COLLECTION_FAILED',
    'system',
    'high',
    500,
    true,
    false,
    'Security control evidence collection failed.',
    'Admin security control evidence collection failed.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_CONTROL_MAPPING_INVALID',
    'validation',
    'medium',
    400,
    false,
    true,
    'Invalid security control mapping.',
    'Admin security control mapping invalid.',
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
  ('admin security control framework not found', 'ADMIN_SECURITY_CONTROL_NOT_FOUND', 5, '{}'),
  ('admin security control not found', 'ADMIN_SECURITY_CONTROL_NOT_FOUND', 5, '{}'),
  ('security control evidence collection failed', 'ADMIN_SECURITY_CONTROL_EVIDENCE_COLLECTION_FAILED', 5, '{}'),
  ('control mapping invalid', 'ADMIN_SECURITY_CONTROL_MAPPING_INVALID', 5, '{}')
on conflict do nothing;
