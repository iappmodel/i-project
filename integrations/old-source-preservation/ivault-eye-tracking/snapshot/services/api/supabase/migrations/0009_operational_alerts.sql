-- Operational alerts / risk inbox (Alphabet). Mirror of repo root supabase/migrations/0009_operational_alerts.sql

create table if not exists operational_alerts (
  alert_id uuid primary key default gen_random_uuid(),

  alert_type text not null,
  alert_source text not null,
  status text not null,

  severity text not null default 'medium',
  priority text not null default 'normal',

  assigned_team text,
  assigned_user_id uuid,
  route_reason text,

  user_id uuid,
  wallet_id uuid,
  wallet_account_id uuid,
  ledger_entry_id uuid,
  original_ledger_entry_id uuid,
  reversal_ledger_entry_id uuid,
  external_transfer_id uuid,
  compensation_id uuid,
  provider_reconciliation_id uuid,
  review_case_id uuid,
  policy_decision_id uuid,
  pipeline_id uuid,
  saga_id uuid,
  execution_request_id uuid,
  campaign_id uuid,
  notification_id uuid,
  audit_record_id uuid,
  alphabet_event_id uuid,

  source_anomaly_ids text[] not null default '{}',
  source_event_ids uuid[] not null default '{}',

  evidence jsonb not null default '{}'::jsonb,
  redacted_evidence jsonb not null default '{}'::jsonb,

  public_summary text,
  internal_summary text,

  risk_scores jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  dedupe_key text,
  idempotency_key text,

  acknowledged_by_user_id uuid,
  acknowledged_at timestamptz,

  resolved_by_user_id uuid,
  resolved_at timestamptz,
  resolution_reason_codes text[] not null default '{}',
  resolution_notes text,

  escalated_by_user_id uuid,
  escalated_at timestamptz,
  escalation_reason_codes text[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists operational_alerts_type_idx
  on operational_alerts(alert_type);

create index if not exists operational_alerts_source_idx
  on operational_alerts(alert_source);

create index if not exists operational_alerts_status_idx
  on operational_alerts(status);

create index if not exists operational_alerts_severity_idx
  on operational_alerts(severity);

create index if not exists operational_alerts_priority_idx
  on operational_alerts(priority);

create index if not exists operational_alerts_assigned_team_idx
  on operational_alerts(assigned_team);

create index if not exists operational_alerts_user_id_idx
  on operational_alerts(user_id);

create index if not exists operational_alerts_wallet_id_idx
  on operational_alerts(wallet_id);

create index if not exists operational_alerts_external_transfer_idx
  on operational_alerts(external_transfer_id);

create index if not exists operational_alerts_compensation_idx
  on operational_alerts(compensation_id);

create index if not exists operational_alerts_review_case_idx
  on operational_alerts(review_case_id);

create index if not exists operational_alerts_execution_request_idx
  on operational_alerts(execution_request_id);

create index if not exists operational_alerts_created_at_idx
  on operational_alerts(created_at desc);

create unique index if not exists operational_alerts_unique_dedupe_open_idx
  on operational_alerts(dedupe_key)
  where dedupe_key is not null
    and status in (
      'alert_created',
      'alert_open',
      'alert_acknowledged',
      'alert_investigating',
      'alert_escalated'
    );

alter table operational_alerts enable row level security;

create policy "service role full access operational alerts"
on operational_alerts
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
