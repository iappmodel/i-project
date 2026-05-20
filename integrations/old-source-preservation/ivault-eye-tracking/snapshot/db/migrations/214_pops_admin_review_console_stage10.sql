create extension if not exists pgcrypto;

create table if not exists pops_admin_review_queue (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  user_id uuid not null,
  campaign_id uuid,
  current_decision text not null check (
    current_decision in ('APPROVED', 'HELD', 'DENIED', 'PARTIAL_APPROVED')
  ),
  queue_status text not null default 'OPEN' check (
    queue_status in ('OPEN', 'IN_PROGRESS', 'WAITING_KYC', 'ESCALATED_FRAUD', 'RESOLVED')
  ),
  fraud_risk numeric(8, 6) not null check (fraud_risk >= 0 and fraud_risk <= 1),
  reason_codes text[] not null default '{}',
  priority integer not null default 50 check (priority >= 0 and priority <= 100),
  assigned_admin_user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists idx_pops_admin_review_queue_status_priority
  on pops_admin_review_queue (queue_status, priority desc, created_at asc);

create index if not exists idx_pops_admin_review_queue_session
  on pops_admin_review_queue (session_id);

create index if not exists idx_pops_admin_review_queue_user_created
  on pops_admin_review_queue (user_id, created_at desc);

create table if not exists pops_admin_actions (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid references pops_admin_review_queue(id),
  session_id uuid not null,
  user_id uuid not null,
  admin_user_id text not null,
  action_type text not null check (
    action_type in (
      'APPROVE_REWARD',
      'PARTIALLY_APPROVE_REWARD',
      'DENY_REWARD',
      'RELEASE_HOLD',
      'EXTEND_HOLD',
      'REQUEST_KYC',
      'MARK_FALSE_POSITIVE',
      'ESCALATE_FRAUD_REVIEW',
      'ADD_INTERNAL_NOTE'
    )
  ),
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_pops_admin_actions_session_created
  on pops_admin_actions (session_id, created_at desc);

create index if not exists idx_pops_admin_actions_admin_created
  on pops_admin_actions (admin_user_id, created_at desc);

create table if not exists pops_admin_notes (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid references pops_admin_review_queue(id),
  session_id uuid not null,
  user_id uuid not null,
  author_admin_user_id text not null,
  note text not null,
  is_internal boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists idx_pops_admin_notes_session_created
  on pops_admin_notes (session_id, created_at desc);

create table if not exists pops_admin_overrides (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid references pops_admin_review_queue(id),
  session_id uuid not null,
  user_id uuid not null,
  admin_user_id text not null,
  old_decision text not null check (
    old_decision in ('APPROVED', 'HELD', 'DENIED', 'PARTIAL_APPROVED')
  ),
  new_decision text not null check (
    new_decision in ('APPROVED', 'HELD', 'DENIED', 'PARTIAL_APPROVED')
  ),
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_pops_admin_overrides_session_created
  on pops_admin_overrides (session_id, created_at desc);

create index if not exists idx_pops_admin_overrides_admin_created
  on pops_admin_overrides (admin_user_id, created_at desc);
