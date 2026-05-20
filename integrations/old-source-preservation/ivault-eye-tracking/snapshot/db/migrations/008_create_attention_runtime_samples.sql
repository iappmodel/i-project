-- 8/23 MVP — attention_runtime_samples — sampled/aggregated gaze packets (not every raw frame).

create table attention_runtime_samples (
  id uuid primary key default gen_random_uuid(),

  session_id uuid not null references attention_sessions (id) on delete cascade,
  user_id uuid not null references users (id),

  timestamp_ms int not null,

  gaze_x double precision,
  gaze_y double precision,
  confidence double precision,
  blink boolean not null default false,

  face_present boolean not null,
  tracking_state text not null
    check (tracking_state in ('valid', 'weak', 'lost')),

  created_at timestamptz not null default now()
);

create index idx_runtime_samples_session on attention_runtime_samples (session_id, timestamp_ms);
