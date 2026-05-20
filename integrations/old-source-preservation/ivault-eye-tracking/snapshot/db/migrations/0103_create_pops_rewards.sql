-- Stage 14: P.O.P.S reward decisions and wallet intents

create extension if not exists pgcrypto;

create table if not exists pops_reward_decisions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references pops_sessions(id) on delete cascade,
  judgment_id uuid not null references pops_judgments(id) on delete cascade,
  user_id uuid not null,
  campaign_id uuid,
  content_id uuid,
  coin_type text check (coin_type in ('USD', 'ICOIN', 'VCOIN', 'RCOIN')),
  base_amount numeric(18,6) check (base_amount is null or base_amount >= 0),
  final_amount numeric(18,6) check (final_amount is null or final_amount >= 0),
  decision_status text not null check (
    decision_status in (
      'NO_REWARD',
      'PENDING',
      'PENDING_REVIEW',
      'HELD',
      'HELD_PRIVACY_RECEIPT_FAILED',
      'RELEASED',
      'PARTIALLY_RELEASED',
      'DENIED',
      'EXPIRED'
    )
  ),
  reward_quality numeric(5,4) check (reward_quality is null or (reward_quality >= 0 and reward_quality <= 1)),
  presence_confidence numeric(5,4) check (presence_confidence is null or (presence_confidence >= 0 and presence_confidence <= 1)),
  attention_confidence numeric(5,4) check (attention_confidence is null or (attention_confidence >= 0 and attention_confidence <= 1)),
  intent_confidence numeric(5,4) check (intent_confidence is null or (intent_confidence >= 0 and intent_confidence <= 1)),
  continuity_confidence numeric(5,4) check (continuity_confidence is null or (continuity_confidence >= 0 and continuity_confidence <= 1)),
  fraud_risk numeric(5,4) check (fraud_risk is null or (fraud_risk >= 0 and fraud_risk <= 1)),
  hold_required boolean default false,
  hold_reason text,
  reason_codes text[],
  wallet_intent_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_pops_reward_decisions_user_id on pops_reward_decisions (user_id);
create index if not exists idx_pops_reward_decisions_campaign_id on pops_reward_decisions (campaign_id);
create index if not exists idx_pops_reward_decisions_decision_status on pops_reward_decisions (decision_status);
create index if not exists idx_pops_reward_decisions_hold_required on pops_reward_decisions (hold_required);
create index if not exists idx_pops_reward_decisions_created_at on pops_reward_decisions (created_at);

create table if not exists pops_wallet_reward_intents (
  id uuid primary key default gen_random_uuid(),
  reward_decision_id uuid not null references pops_reward_decisions(id) on delete cascade,
  session_id uuid not null references pops_sessions(id) on delete cascade,
  user_id uuid not null,
  campaign_id uuid,
  coin_type text not null check (coin_type in ('USD', 'ICOIN', 'VCOIN', 'RCOIN')),
  amount numeric(18,6) not null check (amount >= 0),
  status text not null check (
    status in (
      'NO_REWARD',
      'PENDING',
      'PENDING_REVIEW',
      'HELD',
      'HELD_PRIVACY_RECEIPT_FAILED',
      'RELEASED',
      'PARTIALLY_RELEASED',
      'DENIED',
      'EXPIRED'
    )
  ),
  hold_reason text,
  release_eligible_at timestamptz,
  released_at timestamptz,
  denied_at timestamptz,
  expires_at timestamptz,
  wallet_transaction_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'fk_pops_reward_decisions_wallet_intent_id'
  ) then
    alter table pops_reward_decisions
      add constraint fk_pops_reward_decisions_wallet_intent_id
      foreign key (wallet_intent_id)
      references pops_wallet_reward_intents(id)
      deferrable initially deferred;
  end if;
end
$$;

drop trigger if exists trg_pops_wallet_reward_intents_set_updated_at on pops_wallet_reward_intents;
create trigger trg_pops_wallet_reward_intents_set_updated_at
before update on pops_wallet_reward_intents
for each row
execute function pops_set_updated_at();
