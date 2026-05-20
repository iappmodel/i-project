-- Stage 14: P.O.P.S admin review schema

create extension if not exists pgcrypto;

create table if not exists pops_admin_review_queue (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references pops_sessions(id) on delete set null,
  reward_decision_id uuid references pops_reward_decisions(id) on delete set null,
  user_id uuid not null,
  campaign_id uuid,
  review_type text not null,
  priority text not null check (priority in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status text not null check (status in ('OPEN', 'IN_PROGRESS', 'WAITING_KYC', 'ESCALATED_FRAUD', 'RESOLVED')),
  reason_codes text[],
  assigned_to uuid,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_pops_admin_review_queue_status_priority
  on pops_admin_review_queue (status, priority, created_at);

create table if not exists pops_admin_actions (
  id uuid primary key default gen_random_uuid(),
  review_id uuid references pops_admin_review_queue(id) on delete set null,
  admin_user_id uuid not null,
  action_type text not null,
  old_status text,
  new_status text,
  reason text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_pops_admin_actions_review_id
  on pops_admin_actions (review_id, created_at);
