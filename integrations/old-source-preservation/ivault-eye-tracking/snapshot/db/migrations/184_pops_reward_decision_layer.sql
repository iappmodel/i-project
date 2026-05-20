do $$
begin
  if not exists (select 1 from pg_type where typname = 'currency_code') then
    create type currency_code as enum ('USD', 'ICOIN', 'VCOIN', 'RCOIN');
  end if;
end
$$;

create table if not exists pops_reward_decisions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  user_id uuid not null,
  campaign_id uuid not null,
  content_id uuid not null,
  coin_type currency_code not null,
  base_amount_minor bigint not null,
  final_amount_minor bigint not null,
  decision text not null,
  reward_quality numeric(5,4) not null,
  presence_confidence numeric(5,4) not null,
  attention_confidence numeric(5,4) not null,
  intent_confidence numeric(5,4) not null,
  continuity_confidence numeric(5,4) not null,
  fraud_risk numeric(5,4) not null,
  hold_required boolean not null default false,
  hold_reason text,
  reason_codes jsonb not null default '[]'::jsonb,
  wallet_transaction_intent jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_pops_reward_decisions_session
  on pops_reward_decisions (session_id, created_at desc);

create index if not exists idx_pops_reward_decisions_user
  on pops_reward_decisions (user_id, created_at desc);

create index if not exists idx_pops_reward_decisions_campaign
  on pops_reward_decisions (campaign_id, created_at desc);

create table if not exists pops_reward_holds (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references pops_reward_decisions(id),
  session_id uuid not null,
  user_id uuid not null,
  campaign_id uuid not null,
  hold_reason text not null,
  hold_status text not null default 'ACTIVE',
  hold_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_pops_reward_holds_decision
  on pops_reward_holds (decision_id, created_at desc);

create index if not exists idx_pops_reward_holds_user
  on pops_reward_holds (user_id, created_at desc);

create table if not exists pops_reward_decision_audit (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid references pops_reward_decisions(id),
  session_id uuid not null,
  user_id uuid not null,
  audit_event_type text not null,
  decision text not null,
  reason_codes jsonb not null default '[]'::jsonb,
  fraud_risk numeric(5,4),
  reward_quality numeric(5,4),
  audit_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_pops_reward_decision_audit_session
  on pops_reward_decision_audit (session_id, created_at desc);

create index if not exists idx_pops_reward_decision_audit_decision
  on pops_reward_decision_audit (decision, created_at desc);
