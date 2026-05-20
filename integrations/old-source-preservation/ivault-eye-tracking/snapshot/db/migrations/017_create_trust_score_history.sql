-- 17/23 MVP — trust_score_history — append-only audit of trust score / level transitions.

create table trust_score_history (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references users (id),

  previous_score numeric(5,2),
  new_score numeric(5,2) not null,

  previous_level text,
  new_level text not null,

  reason_codes text[] not null default '{}',

  source_event_id uuid references system_events (id),
  policy_version text not null,

  created_at timestamptz not null default now()
);

create index idx_trust_history_user on trust_score_history (user_id, created_at desc);
