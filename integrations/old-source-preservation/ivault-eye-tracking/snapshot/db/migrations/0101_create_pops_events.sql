-- Stage 14: P.O.P.S events and signal ingestion

create extension if not exists pgcrypto;

create table if not exists pops_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references pops_sessions(id) on delete cascade,
  user_id uuid not null,
  event_id text not null,
  event_type text not null,
  source text not null,
  client_timestamp_ms bigint not null,
  client_created_at timestamptz,
  server_received_at timestamptz not null default now(),
  timestamp_delta_ms bigint,
  payload jsonb not null,
  privacy_flags jsonb,
  is_late_arrival boolean default false,
  created_at timestamptz not null default now(),
  unique (session_id, event_id)
);

create index if not exists idx_pops_events_session_id on pops_events (session_id);
create index if not exists idx_pops_events_user_id on pops_events (user_id);
create index if not exists idx_pops_events_event_type on pops_events (event_type);
create index if not exists idx_pops_events_source on pops_events (source);
create index if not exists idx_pops_events_server_received_at on pops_events (server_received_at);

create table if not exists pops_signal_batches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references pops_sessions(id) on delete cascade,
  user_id uuid not null,
  batch_id text not null,
  window_start_ms bigint,
  window_end_ms bigint,
  client_timestamp_ms bigint,
  server_received_at timestamptz not null default now(),
  screen_active_ratio numeric(5,4) check (screen_active_ratio is null or (screen_active_ratio >= 0 and screen_active_ratio <= 1)),
  app_foreground_ratio numeric(5,4) check (app_foreground_ratio is null or (app_foreground_ratio >= 0 and app_foreground_ratio <= 1)),
  content_progress_delta_pct numeric(8,4) check (content_progress_delta_pct is null or (content_progress_delta_pct >= 0 and content_progress_delta_pct <= 100)),
  touch_event_count integer check (touch_event_count is null or touch_event_count >= 0),
  tap_count integer check (tap_count is null or tap_count >= 0),
  scroll_distance numeric(12,4),
  average_scroll_velocity numeric(12,4),
  motion_stability_score numeric(5,4) check (motion_stability_score is null or (motion_stability_score >= 0 and motion_stability_score <= 1)),
  visual_presence_score numeric(5,4) check (visual_presence_score is null or (visual_presence_score >= 0 and visual_presence_score <= 1)),
  visual_quality_score numeric(5,4) check (visual_quality_score is null or (visual_quality_score >= 0 and visual_quality_score <= 1)),
  audio_distraction_score numeric(5,4) check (audio_distraction_score is null or (audio_distraction_score >= 0 and audio_distraction_score <= 1)),
  device_integrity_score numeric(5,4) check (device_integrity_score is null or (device_integrity_score >= 0 and device_integrity_score <= 1)),
  account_continuity_score numeric(5,4) check (account_continuity_score is null or (account_continuity_score >= 0 and account_continuity_score <= 1)),
  location_class_confidence numeric(5,4) check (location_class_confidence is null or (location_class_confidence >= 0 and location_class_confidence <= 1)),
  privacy jsonb,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  unique (session_id, batch_id)
);

create index if not exists idx_pops_signal_batches_session_id on pops_signal_batches (session_id);
create index if not exists idx_pops_signal_batches_user_id on pops_signal_batches (user_id);
create index if not exists idx_pops_signal_batches_server_received_at on pops_signal_batches (server_received_at);

create table if not exists pops_session_aggregates (
  id uuid primary key default gen_random_uuid(),
  session_id uuid unique not null references pops_sessions(id) on delete cascade,
  user_id uuid not null,
  total_duration_ms integer,
  active_duration_ms integer,
  background_duration_ms integer,
  interruption_count integer not null default 0,
  pause_count integer not null default 0,
  resume_count integer not null default 0,
  tap_count integer not null default 0,
  scroll_count integer not null default 0,
  content_completion_pct numeric(8,4),
  average_motion_stability numeric(5,4),
  average_visual_presence numeric(5,4),
  average_audio_distraction numeric(5,4),
  device_integrity_min numeric(5,4),
  account_continuity_avg numeric(5,4),
  reason_codes text[],
  updated_at timestamptz not null default now(),
  check (total_duration_ms is null or total_duration_ms >= 0),
  check (active_duration_ms is null or active_duration_ms >= 0),
  check (background_duration_ms is null or background_duration_ms >= 0),
  check (content_completion_pct is null or (content_completion_pct >= 0 and content_completion_pct <= 100)),
  check (average_motion_stability is null or (average_motion_stability >= 0 and average_motion_stability <= 1)),
  check (average_visual_presence is null or (average_visual_presence >= 0 and average_visual_presence <= 1)),
  check (average_audio_distraction is null or (average_audio_distraction >= 0 and average_audio_distraction <= 1)),
  check (device_integrity_min is null or (device_integrity_min >= 0 and device_integrity_min <= 1)),
  check (account_continuity_avg is null or (account_continuity_avg >= 0 and account_continuity_avg <= 1))
);

drop trigger if exists trg_pops_session_aggregates_set_updated_at on pops_session_aggregates;
create trigger trg_pops_session_aggregates_set_updated_at
before update on pops_session_aggregates
for each row
execute function pops_set_updated_at();
