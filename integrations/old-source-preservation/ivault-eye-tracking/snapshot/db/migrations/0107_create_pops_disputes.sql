-- Stage 14: P.O.P.S dispute schema

create extension if not exists pgcrypto;

create table if not exists pops_disputes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null references pops_sessions(id) on delete cascade,
  reward_decision_id uuid references pops_reward_decisions(id) on delete set null,
  wallet_reward_intent_id uuid references pops_wallet_reward_intents(id) on delete set null,
  status text not null check (status in ('CREATED', 'UNDER_REVIEW', 'NEEDS_MORE_INFO', 'APPROVED', 'PARTIALLY_APPROVED', 'DENIED', 'CLOSED')),
  reason text not null,
  user_message text,
  admin_decision text,
  admin_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_pops_disputes_user_created_at on pops_disputes (user_id, created_at);
create index if not exists idx_pops_disputes_status_created_at on pops_disputes (status, created_at);
