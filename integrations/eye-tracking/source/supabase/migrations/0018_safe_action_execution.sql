-- Alphabet admin: safe action executions + supporting tables

create table if not exists alphabet_events (
  event_id uuid primary key default gen_random_uuid(),
  user_id uuid,
  coin_code text not null default 'J',
  event_type text not null,
  object_type text not null,
  object_id text not null,
  source_context text not null,
  raw_score numeric,
  quality_score numeric,
  trust_score_at_event numeric,
  risk_score numeric,
  age_band text,
  verification_status text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table alphabet_events enable row level security;

create policy "service role full access alphabet events"
on alphabet_events
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create table if not exists execution_requests (
  execution_request_id uuid primary key default gen_random_uuid(),
  request_type text not null,
  target_system text not null,
  target_object_type text,
  target_object_id text,
  status text not null default 'execution_created',
  source_object_type text,
  source_object_id text,
  actor_admin_id uuid not null,
  idempotency_key text not null,
  dedupe_key text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(idempotency_key),
  unique(dedupe_key)
);

create index if not exists execution_requests_source_idx
  on execution_requests(source_object_type, source_object_id);

alter table execution_requests enable row level security;

create policy "service role full access execution requests"
on execution_requests
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create table if not exists admin_command_decisions (
  command_decision_id uuid primary key default gen_random_uuid(),
  command_item_id uuid,
  actor_admin_id uuid not null,
  actor_role text,
  executable_action text,
  decision_type text,
  decision_status text,
  requested_action text,
  approved_action text,
  reason_codes text[] not null default '{}',
  evidence_summary text,
  linked_object_ids jsonb not null default '{}'::jsonb,
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  idempotency_key text,
  dedupe_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table admin_command_decisions enable row level security;

create policy "service role full access admin command decisions"
on admin_command_decisions
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create table if not exists safe_action_executions (
  safe_action_execution_id uuid primary key default gen_random_uuid(),

  safe_action_type text not null,
  requested_action text not null,
  normalized_action text not null,

  status text not null,
  severity text not null,
  execution_mode text not null,

  command_item_id uuid,
  command_decision_id uuid,
  review_case_id uuid,
  alert_id uuid,

  actor_admin_id uuid not null,
  approver_admin_id uuid,

  user_id uuid,
  creator_id uuid,
  wallet_id uuid,
  wallet_account_id uuid,
  campaign_id uuid,
  payout_id uuid,
  external_transfer_id uuid,
  ledger_entry_id uuid,
  policy_decision_id uuid,
  compensation_id uuid,
  execution_request_id uuid,

  target_object_type text,
  target_object_id text,

  policy_allowed boolean not null default false,
  policy_blocked boolean not null default false,
  policy_requires_approval boolean not null default false,
  policy_requires_manual_execution boolean not null default false,
  policy_reason_codes text[] not null default '{}',

  idempotency_key text not null,
  dedupe_key text not null,
  idempotency_status text not null default 'idempotency_pending',

  execution_steps jsonb not null default '[]'::jsonb,
  current_step text,
  completed_steps text[] not null default '{}',
  failed_step text,

  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,

  evidence jsonb not null default '{}'::jsonb,
  redacted_evidence jsonb not null default '{}'::jsonb,

  result_payload jsonb not null default '{}'::jsonb,
  error_payload jsonb not null default '{}'::jsonb,

  execution_risk_score numeric not null default 0,
  confidence_score numeric not null default 0,

  source_event_ids uuid[] not null default '{}',
  audit_record_ids uuid[] not null default '{}',

  reason_codes text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,

  approved_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(idempotency_key),
  unique(dedupe_key)
);

create index if not exists safe_action_executions_type_idx
  on safe_action_executions(safe_action_type);

create index if not exists safe_action_executions_status_idx
  on safe_action_executions(status);

create index if not exists safe_action_executions_mode_idx
  on safe_action_executions(execution_mode);

create index if not exists safe_action_executions_severity_idx
  on safe_action_executions(severity);

create index if not exists safe_action_executions_command_item_idx
  on safe_action_executions(command_item_id);

create index if not exists safe_action_executions_command_decision_idx
  on safe_action_executions(command_decision_id);

create index if not exists safe_action_executions_user_idx
  on safe_action_executions(user_id);

create index if not exists safe_action_executions_wallet_idx
  on safe_action_executions(wallet_id);

create index if not exists safe_action_executions_campaign_idx
  on safe_action_executions(campaign_id);

create index if not exists safe_action_executions_external_transfer_idx
  on safe_action_executions(external_transfer_id);

create index if not exists safe_action_executions_target_idx
  on safe_action_executions(target_object_type, target_object_id);

create index if not exists safe_action_executions_created_idx
  on safe_action_executions(created_at desc);

alter table safe_action_executions enable row level security;

create policy "service role full access safe action executions"
on safe_action_executions
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
