-- Stage 9 scaffold: core studio editor entities
-- Requires: pgcrypto for gen_random_uuid() (Supabase default)

create extension if not exists "pgcrypto";

create table if not exists public.studio_projects (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  title text not null default '',
  status text not null default 'draft',
  version int not null default 1,
  draft_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists studio_projects_owner_idx on public.studio_projects (owner_user_id);
create index if not exists studio_projects_status_idx on public.studio_projects (status);
create index if not exists studio_projects_owner_status_idx on public.studio_projects (owner_user_id, status) where deleted_at is null;

create table if not exists public.studio_project_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects (id) on delete cascade,
  version int not null,
  snapshot jsonb not null default '{}'::jsonb,
  meta jsonb not null default '{}'::jsonb,
  actor_user_id uuid not null,
  created_at timestamptz not null default now()
);

create index if not exists studio_project_snapshots_project_idx on public.studio_project_snapshots (project_id);

create table if not exists public.studio_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects (id) on delete cascade,
  owner_user_id uuid not null,
  status text not null default 'draft',
  name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists studio_assets_project_idx on public.studio_assets (project_id);
create index if not exists studio_assets_owner_idx on public.studio_assets (owner_user_id);

create table if not exists public.studio_tracks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects (id) on delete cascade,
  version int not null default 1,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_tracks_project_idx on public.studio_tracks (project_id);

create table if not exists public.studio_clips (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects (id) on delete cascade,
  track_id uuid not null references public.studio_tracks (id) on delete cascade,
  version int not null default 1,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_clips_project_idx on public.studio_clips (project_id);
create index if not exists studio_clips_track_idx on public.studio_clips (track_id);

comment on table public.studio_projects is 'User-owned draft projects; RLS in 0008. Service role for cross-tenant jobs.';
