create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'pops_dispute_status') then
    create type pops_dispute_status as enum (
      'CREATED',
      'UNDER_REVIEW',
      'NEEDS_MORE_INFO',
      'APPROVED',
      'PARTIALLY_APPROVED',
      'DENIED',
      'CLOSED'
    );
  end if;
end
$$;

create table if not exists pops_disputes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null,
  reward_decision_id uuid not null,
  wallet_reward_intent_id uuid,
  status pops_dispute_status not null default 'CREATED',
  reason text not null check (
    reason in (
      'I completed the action',
      'App verification failed',
      'Reward amount is wrong',
      'Session was interrupted',
      'Location verification failed',
      'I think this was a mistake',
      'Other'
    )
  ),
  user_message text not null,
  admin_decision text,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  resolved_at timestamptz
);

create index if not exists idx_pops_disputes_user_created
  on pops_disputes (user_id, created_at desc);

create index if not exists idx_pops_disputes_reward_decision
  on pops_disputes (reward_decision_id);

create index if not exists idx_pops_disputes_status_created
  on pops_disputes (status, created_at asc);

create unique index if not exists uq_pops_disputes_open_per_reward_decision
  on pops_disputes (user_id, reward_decision_id)
  where status in ('CREATED', 'UNDER_REVIEW', 'NEEDS_MORE_INFO');

create table if not exists pops_dispute_events (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references pops_disputes(id) on delete cascade,
  user_id uuid not null,
  event_type text not null check (
    event_type in (
      'DISPUTE_CREATED',
      'STATUS_CHANGED',
      'EVIDENCE_ADDED',
      'MORE_INFO_REQUESTED',
      'ADMIN_DECISION_APPROVED',
      'ADMIN_DECISION_PARTIALLY_APPROVED',
      'ADMIN_DECISION_DENIED',
      'DISPUTE_CLOSED',
      'RATE_LIMIT_BLOCKED',
      'ABUSE_SIGNAL_CREATED',
      'POSITIVE_CORRECTION_EVENT'
    )
  ),
  actor_type text not null check (actor_type in ('USER', 'ADMIN', 'SYSTEM')),
  actor_id text,
  detail text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_pops_dispute_events_dispute_created
  on pops_dispute_events (dispute_id, created_at asc);

create index if not exists idx_pops_dispute_events_user_created
  on pops_dispute_events (user_id, created_at desc);

create table if not exists pops_dispute_attachments (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references pops_disputes(id) on delete cascade,
  user_id uuid not null,
  file_name text not null,
  file_url text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_pops_dispute_attachments_dispute
  on pops_dispute_attachments (dispute_id, created_at asc);

create index if not exists idx_pops_dispute_attachments_user_created
  on pops_dispute_attachments (user_id, created_at desc);
