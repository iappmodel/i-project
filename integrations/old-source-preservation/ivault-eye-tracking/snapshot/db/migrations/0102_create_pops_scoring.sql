-- Stage 14: P.O.P.S scoring and judgments

create extension if not exists pgcrypto;

create table if not exists pops_judgments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references pops_sessions(id) on delete cascade,
  user_id uuid not null,
  judgment_layer text not null check (judgment_layer in ('LAYER_1_PRESENCE', 'LAYER_2_ATTENTION', 'LAYER_3_INTENT', 'LAYER_4_CONTINUITY', 'LAYER_5_REWARD')),
  session_state text not null,
  presence_confidence numeric(5,4) not null check (presence_confidence >= 0 and presence_confidence <= 1),
  attention_confidence numeric(5,4) not null check (attention_confidence >= 0 and attention_confidence <= 1),
  intent_confidence numeric(5,4) not null check (intent_confidence >= 0 and intent_confidence <= 1),
  continuity_confidence numeric(5,4) not null check (continuity_confidence >= 0 and continuity_confidence <= 1),
  fraud_risk numeric(5,4) not null check (fraud_risk >= 0 and fraud_risk <= 1),
  reward_eligibility text not null check (reward_eligibility in ('NOT_ELIGIBLE', 'ELIGIBLE_PENDING', 'ELIGIBLE_PARTIAL', 'ELIGIBLE_FULL', 'HELD_FOR_REVIEW', 'DENIED')),
  trust_impact text not null check (trust_impact in ('NONE', 'POSITIVE_LOW', 'POSITIVE_MEDIUM', 'POSITIVE_HIGH', 'NEGATIVE_LOW', 'NEGATIVE_MEDIUM', 'NEGATIVE_HIGH')),
  recommended_action text not null,
  reason_codes text[],
  model_version text not null,
  rule_version text not null,
  input_summary jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_pops_judgments_session_id on pops_judgments (session_id);
create index if not exists idx_pops_judgments_user_id on pops_judgments (user_id);
create index if not exists idx_pops_judgments_reward_eligibility on pops_judgments (reward_eligibility);
create index if not exists idx_pops_judgments_fraud_risk on pops_judgments (fraud_risk);
create index if not exists idx_pops_judgments_created_at on pops_judgments (created_at);

create table if not exists pops_judgment_reason_code_links (
  judgment_id uuid not null references pops_judgments(id) on delete cascade,
  reason_code text not null references pops_reason_codes(code),
  created_at timestamptz not null default now(),
  primary key (judgment_id, reason_code)
);
