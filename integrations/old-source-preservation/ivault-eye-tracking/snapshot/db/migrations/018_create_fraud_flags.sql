-- 18/23 MVP — fraud_flags — signals from engines and admin for review and resolution.

create table fraud_flags (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references users (id),

  source text not null
    check (source in (
      'attention_engine',
      'trust_engine',
      'device_engine',
      'wallet_engine',
      'campaign_engine',
      'admin'
    )),

  signal text not null,

  severity text not null
    check (severity in ('low', 'medium', 'high', 'critical')),

  status text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),

  related_event_ids uuid[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index idx_fraud_flags_user on fraud_flags (user_id, created_at desc);
create index idx_fraud_flags_status on fraud_flags (status);
create index idx_fraud_flags_severity on fraud_flags (severity);
