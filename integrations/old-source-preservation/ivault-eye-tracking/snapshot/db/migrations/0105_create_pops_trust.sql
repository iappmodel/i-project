-- Stage 14: P.O.P.S trust impacts

create extension if not exists pgcrypto;

create table if not exists pops_trust_impacts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references pops_sessions(id) on delete set null,
  judgment_id uuid references pops_judgments(id) on delete set null,
  reward_decision_id uuid references pops_reward_decisions(id) on delete set null,
  user_id uuid not null,
  source text not null default 'POPS',
  event_type text not null,
  weight numeric(8,4) not null,
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  severity text not null check (severity in ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  reason_codes text[],
  created_at timestamptz not null default now()
);

create index if not exists idx_pops_trust_impacts_user_id on pops_trust_impacts (user_id);
create index if not exists idx_pops_trust_impacts_session_id on pops_trust_impacts (session_id);
create index if not exists idx_pops_trust_impacts_created_at on pops_trust_impacts (created_at);
