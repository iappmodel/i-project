-- Expand audit_integrity_reports for daily evidence reconciliation. Requires pgcrypto.

alter table audit_integrity_reports
  add column if not exists ledger_gap_count integer not null default 0,
  add column if not exists reversal_gap_count integer not null default 0,
  add column if not exists transfer_gap_count integer not null default 0,
  add column if not exists compensation_gap_count integer not null default 0,
  add column if not exists provider_gap_count integer not null default 0,
  add column if not exists reconciliation_report_gap_count integer not null default 0,
  add column if not exists scheduled_job_gap_count integer not null default 0,
  add column if not exists alphabet_event_gap_count integer not null default 0,
  add column if not exists trust_evidence_gap_count integer not null default 0,
  add column if not exists chain_break_gap_count integer not null default 0,
  add column if not exists risk_score numeric not null default 0,
  add column if not exists compliance_score numeric not null default 0,
  add column if not exists trust_score numeric not null default 0,
  add column if not exists safety_score numeric not null default 0,
  add column if not exists created_alert_ids uuid[] not null default '{}',
  add column if not exists created_review_case_ids uuid[] not null default '{}',
  add column if not exists reason_codes text[] not null default '{}',
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists generated_by text,
  add column if not exists updated_at timestamptz;

update audit_integrity_reports
set updated_at = coalesce(updated_at, created_at)
where updated_at is null;

create index if not exists audit_integrity_reports_report_date_scope_idx
  on audit_integrity_reports(report_date desc, report_scope);
