-- 19/23 MVP — fraud_cases — formal fraud investigations with resolution workflow.

create table fraud_cases (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references users (id),

  severity text not null
    check (severity in ('low', 'medium', 'high', 'critical')),

  status text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved')),

  reason text not null,

  related_event_ids uuid[] not null default '{}',

  resolution text
    check (resolution in (
      'false_positive',
      'confirmed_fraud',
      'insufficient_evidence',
      'user_warned',
      'account_restricted',
      'rewards_clawed_back'
    )),

  resolved_by text check (resolved_by in ('system', 'admin')),
  resolved_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index idx_fraud_cases_user on fraud_cases (user_id, created_at desc);
create index idx_fraud_cases_status on fraud_cases (status);
create index idx_fraud_cases_severity on fraud_cases (severity);
