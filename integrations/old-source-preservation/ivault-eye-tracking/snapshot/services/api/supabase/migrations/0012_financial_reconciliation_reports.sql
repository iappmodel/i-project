-- Mirror of repo-root supabase/migrations/0012_financial_reconciliation_reports.sql

create table if not exists financial_reconciliation_reports (
  report_id uuid primary key default gen_random_uuid(),

  report_scope text not null,
  status text not null,
  severity text not null,

  report_date date not null,
  period_start timestamptz not null,
  period_end timestamptz not null,

  coin_code text,
  provider text,
  currency_code text,

  ledger_credit_total numeric not null default 0,
  ledger_debit_total numeric not null default 0,
  ledger_net_total numeric not null default 0,
  ledger_posted_credit_total numeric not null default 0,
  ledger_posted_debit_total numeric not null default 0,
  ledger_pending_credit_total numeric not null default 0,
  ledger_pending_debit_total numeric not null default 0,
  ledger_reversal_total numeric not null default 0,

  wallet_available_total numeric not null default 0,
  wallet_pending_total numeric not null default 0,
  wallet_reserved_total numeric not null default 0,
  wallet_total_liability numeric not null default 0,

  active_value_lot_total numeric not null default 0,
  pending_value_lot_total numeric not null default 0,
  expired_value_lot_total numeric not null default 0,
  consumed_value_lot_total numeric not null default 0,

  external_transfer_requested_total numeric not null default 0,
  external_transfer_succeeded_total numeric not null default 0,
  external_transfer_failed_total numeric not null default 0,
  external_transfer_pending_total numeric not null default 0,
  external_transfer_unknown_total numeric not null default 0,

  provider_reported_succeeded_total numeric not null default 0,
  provider_reported_failed_total numeric not null default 0,
  provider_reported_pending_total numeric not null default 0,
  provider_reported_unknown_total numeric not null default 0,

  compensation_created_total numeric not null default 0,
  compensation_completed_total numeric not null default 0,
  compensation_failed_total numeric not null default 0,
  compensation_blocked_total numeric not null default 0,

  campaign_budget_total numeric not null default 0,
  campaign_reserved_total numeric not null default 0,
  campaign_spent_total numeric not null default 0,
  campaign_released_total numeric not null default 0,

  user_available_liability numeric not null default 0,
  user_pending_liability numeric not null default 0,
  user_reserved_liability numeric not null default 0,
  provider_outstanding_liability numeric not null default 0,
  campaign_outstanding_liability numeric not null default 0,
  compensation_outstanding_liability numeric not null default 0,
  total_platform_liability numeric not null default 0,

  ledger_vs_wallet_delta numeric not null default 0,
  ledger_vs_value_lot_delta numeric not null default 0,
  debit_vs_external_transfer_delta numeric not null default 0,
  provider_vs_external_transfer_delta numeric not null default 0,
  compensation_vs_reversal_delta numeric not null default 0,
  campaign_budget_vs_reserve_delta numeric not null default 0,
  liability_delta numeric not null default 0,

  anomaly_count integer not null default 0,
  critical_anomaly_count integer not null default 0,

  anomalies jsonb not null default '[]'::jsonb,
  breakdown jsonb not null default '{}'::jsonb,

  reconciliation_confidence_score numeric not null default 0,
  financial_risk_score numeric not null default 0,
  report_integrity_score numeric not null default 0,

  source_event_ids uuid[] not null default '{}',
  created_alert_ids uuid[] not null default '{}',
  created_review_case_ids uuid[] not null default '{}',

  reason_codes text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,

  generated_by text not null default 'scheduled_job',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists financial_reconciliation_reports_date_idx
  on financial_reconciliation_reports(report_date desc);

create index if not exists financial_reconciliation_reports_scope_idx
  on financial_reconciliation_reports(report_scope);

create index if not exists financial_reconciliation_reports_status_idx
  on financial_reconciliation_reports(status);

create index if not exists financial_reconciliation_reports_severity_idx
  on financial_reconciliation_reports(severity);

create index if not exists financial_reconciliation_reports_coin_idx
  on financial_reconciliation_reports(coin_code);

create index if not exists financial_reconciliation_reports_provider_idx
  on financial_reconciliation_reports(provider);

create index if not exists financial_reconciliation_reports_created_at_idx
  on financial_reconciliation_reports(created_at desc);

alter table financial_reconciliation_reports enable row level security;

create policy "service role full access financial reconciliation reports"
on financial_reconciliation_reports
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
