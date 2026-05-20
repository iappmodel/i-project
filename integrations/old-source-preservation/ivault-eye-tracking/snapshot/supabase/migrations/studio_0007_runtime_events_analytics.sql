-- Runtime feed + analytics snapshots (high-volume inserts; RLS restricts sensitive kinds)

create table if not exists public.runtime_events (
  id uuid primary key default gen_random_uuid(),
  post_id uuid,
  campaign_id uuid,
  viewer_session_id uuid,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  actor_user_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists runtime_events_post_idx on public.runtime_events (post_id);
create index if not exists runtime_events_campaign_idx on public.runtime_events (campaign_id);
create index if not exists runtime_events_type_idx on public.runtime_events (event_type);

create table if not exists public.viewer_sessions (
  id uuid primary key default gen_random_uuid(),
  viewer_user_id uuid,
  post_id uuid,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists viewer_sessions_post_idx on public.viewer_sessions (post_id);

create table if not exists public.post_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null,
  captured_at timestamptz not null default now(),
  metrics jsonb not null default '{}'::jsonb
);

create index if not exists post_metric_snapshots_post_idx on public.post_metric_snapshots (post_id);

create table if not exists public.campaign_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null,
  captured_at timestamptz not null default now(),
  metrics jsonb not null default '{}'::jsonb
);

create index if not exists campaign_metric_snapshots_campaign_idx on public.campaign_metric_snapshots (campaign_id);

create table if not exists public.creator_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null,
  captured_at timestamptz not null default now(),
  metrics jsonb not null default '{}'::jsonb
);

create index if not exists creator_metric_snapshots_creator_idx on public.creator_metric_snapshots (creator_user_id);

comment on table public.runtime_events is 'Append-only event log; sensitive financial events from service role only.';
