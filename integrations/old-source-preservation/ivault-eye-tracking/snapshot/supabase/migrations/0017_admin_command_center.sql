-- Admin Command Center (Alphabet). Unified queue + decisions + notes. Requires pgcrypto for gen_random_uuid().

create table if not exists admin_command_items (
  command_item_id uuid primary key default gen_random_uuid(),

  item_type text not null,
  queue_scope text not null,
  status text not null,
  severity text not null,
  priority text not null,

  title text not null,
  summary text not null,

  user_id uuid,
  creator_id uuid,
  wallet_id uuid,
  wallet_account_id uuid,
  campaign_id uuid,
  payout_id uuid,
  external_transfer_id uuid,
  ledger_entry_id uuid,
  policy_decision_id uuid,
  review_case_id uuid,
  alert_id uuid,
  device_cluster_id text,
  identity_cluster_id text,
  presence_session_id text,
  alphabet_event_id uuid,
  stuck_saga_result_id uuid,
  wallet_invariant_result_id uuid,
  financial_reconciliation_report_id uuid,
  audit_integrity_report_id uuid,
  trust_fraud_batch_id uuid,

  source_object_type text,
  source_object_id text,

  recommended_actions text[] not null default '{}',
  approved_actions text[] not null default '{}',
  rejected_actions text[] not null default '{}',

  evidence jsonb not null default '{}'::jsonb,
  redacted_evidence jsonb not null default '{}'::jsonb,

  source_event_ids uuid[] not null default '{}',
  linked_alert_ids uuid[] not null default '{}',
  linked_review_case_ids uuid[] not null default '{}',

  assigned_to_admin_id uuid,
  assigned_at timestamptz,
  assigned_by_admin_id uuid,

  resolved_at timestamptz,
  resolved_by_admin_id uuid,
  dismissed_at timestamptz,
  dismissed_by_admin_id uuid,
  escalated_at timestamptz,
  escalated_by_admin_id uuid,

  due_at timestamptz,

  reason_codes text[] not null default '{}',
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists admin_command_decisions (
  command_decision_id uuid primary key default gen_random_uuid(),

  command_item_id uuid not null references admin_command_items(command_item_id),

  actor_admin_id uuid not null,
  actor_role text not null,

  decision_type text not null,
  decision_status text not null,

  requested_action text,
  approved_action text,
  rejected_action text,

  reason_codes text[] not null default '{}',
  evidence_summary text not null default '',

  linked_object_ids jsonb not null default '{}'::jsonb,

  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,

  idempotency_key text not null,
  dedupe_key text not null,

  source_event_ids uuid[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  unique(idempotency_key),
  unique(dedupe_key)
);

create table if not exists admin_command_notes (
  command_note_id uuid primary key default gen_random_uuid(),

  command_item_id uuid not null references admin_command_items(command_item_id),

  actor_admin_id uuid not null,
  actor_role text not null,

  note_body text not null,
  visibility text not null default 'internal',

  evidence_refs jsonb not null default '[]'::jsonb,

  source_event_ids uuid[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists admin_command_items_type_idx
  on admin_command_items(item_type);

create index if not exists admin_command_items_scope_idx
  on admin_command_items(queue_scope);

create index if not exists admin_command_items_status_idx
  on admin_command_items(status);

create index if not exists admin_command_items_severity_idx
  on admin_command_items(severity);

create index if not exists admin_command_items_priority_idx
  on admin_command_items(priority);

create index if not exists admin_command_items_assignee_idx
  on admin_command_items(assigned_to_admin_id);

create index if not exists admin_command_items_user_idx
  on admin_command_items(user_id);

create index if not exists admin_command_items_wallet_idx
  on admin_command_items(wallet_id);

create index if not exists admin_command_items_campaign_idx
  on admin_command_items(campaign_id);

create index if not exists admin_command_items_source_idx
  on admin_command_items(source_object_type, source_object_id);

create index if not exists admin_command_items_created_idx
  on admin_command_items(created_at desc);

create index if not exists admin_command_decisions_item_idx
  on admin_command_decisions(command_item_id);

create index if not exists admin_command_decisions_actor_idx
  on admin_command_decisions(actor_admin_id);

create index if not exists admin_command_notes_item_idx
  on admin_command_notes(command_item_id);

alter table admin_command_items enable row level security;
alter table admin_command_decisions enable row level security;
alter table admin_command_notes enable row level security;

create policy "service role full access admin command items"
on admin_command_items
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "service role full access admin command decisions"
on admin_command_decisions
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "service role full access admin command notes"
on admin_command_notes
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
