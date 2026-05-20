-- 3/23 MVP — system_events — canonical append-only event log (after identity; before campaigns).

create table system_events (
  id uuid primary key default gen_random_uuid(),

  event_type text not null,
  event_version int not null default 1,

  actor_type text not null,
  actor_id uuid,

  subject_type text not null,
  subject_id uuid not null,

  user_id uuid references users (id),
  campaign_id uuid,
  session_id uuid,

  payload jsonb not null default '{}'::jsonb,

  policy_version text,
  idempotency_key text,
  correlation_id uuid,
  causation_id uuid references system_events (id),

  created_at timestamptz not null default now(),

  unique (idempotency_key)
);

create index idx_events_type_created on system_events (event_type, created_at desc);
create index idx_events_user_created on system_events (user_id, created_at desc);
create index idx_events_campaign_created on system_events (campaign_id, created_at desc);
create index idx_events_session_id on system_events (session_id);
create index idx_events_correlation_id on system_events (correlation_id);
create index idx_events_payload_gin on system_events using gin (payload);
