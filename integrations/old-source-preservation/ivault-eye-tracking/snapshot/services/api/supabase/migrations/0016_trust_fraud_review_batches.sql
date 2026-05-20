create table if not exists trust_fraud_review_batches (
  batch_id uuid primary key default gen_random_uuid(),

  batch_scope text not null,
  status text not null,
  severity text not null,

  batch_date date not null,
  period_start timestamptz not null,
  period_end timestamptz not null,

  user_count integer not null default 0,
  wallet_count integer not null default 0,
  wallet_account_count integer not null default 0,
  ledger_entry_count integer not null default 0,
  alphabet_event_count integer not null default 0,
  trust_event_count integer not null default 0,
  u_value_event_count integer not null default 0,
  reward_event_count integer not null default 0,
  payout_count integer not null default 0,
  campaign_count integer not null default 0,
  device_signal_count integer not null default 0,
  presence_signal_count integer not null default 0,
  policy_decision_count integer not null default 0,
  admin_review_case_count integer not null default 0,
  operational_alert_count integer not null default 0,

  finding_count integer not null default 0,
  critical_finding_count integer not null default 0,
  fraud_finding_count integer not null default 0,
  wallet_finding_count integer not null default 0,
  payout_finding_count integer not null default 0,
  campaign_finding_count integer not null default 0,
  identity_finding_count integer not null default 0,
  device_finding_count integer not null default 0,
  reward_finding_count integer not null default 0,
  presence_finding_count integer not null default 0,
  age_policy_finding_count integer not null default 0,

  batch_risk_score numeric not null default 0,
  batch_confidence_score numeric not null default 0,
  action_urgency_score numeric not null default 0,

  findings jsonb not null default '[]'::jsonb,
  recommended_actions jsonb not null default '[]'::jsonb,
  breakdown jsonb not null default '{}'::jsonb,

  source_event_ids uuid[] not null default '{}',
  created_alert_ids uuid[] not null default '{}',
  created_review_case_ids uuid[] not null default '{}',

  reason_codes text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,

  generated_by text not null default 'scheduled_job',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trust_fraud_review_batches_date_idx
  on trust_fraud_review_batches(batch_date desc);

create index if not exists trust_fraud_review_batches_scope_idx
  on trust_fraud_review_batches(batch_scope);

create index if not exists trust_fraud_review_batches_status_idx
  on trust_fraud_review_batches(status);

create index if not exists trust_fraud_review_batches_severity_idx
  on trust_fraud_review_batches(severity);

create index if not exists trust_fraud_review_batches_created_at_idx
  on trust_fraud_review_batches(created_at desc);

alter table trust_fraud_review_batches enable row level security;

create policy "service role full access trust fraud review batches"
on trust_fraud_review_batches
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
