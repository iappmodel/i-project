-- Magic / reveal layer (Stage 2+); geometry + policy JSON blobs

create table if not exists public.studio_magic_reveals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects (id) on delete cascade,
  owner_user_id uuid not null,
  target_type text,
  timeline_start_ms bigint,
  timeline_end_ms bigint,
  geometry jsonb not null default '{}'::jsonb,
  tracking jsonb not null default '{}'::jsonb,
  hidden_render jsonb not null default '{}'::jsonb,
  reveal_type text,
  pricing jsonb,
  reward jsonb,
  eligibility jsonb not null default '{}'::jsonb,
  unlock_policy jsonb not null default '{}'::jsonb,
  settlement jsonb not null default '{}'::jsonb,
  safety jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  version int not null default 1,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_magic_reveals_project_idx on public.studio_magic_reveals (project_id);
create index if not exists studio_magic_reveals_owner_idx on public.studio_magic_reveals (owner_user_id);

-- Optional version history (append-only inserts from server/RPC recommended)
create table if not exists public.studio_magic_reveal_versions (
  id uuid primary key default gen_random_uuid(),
  reveal_id uuid not null references public.studio_magic_reveals (id) on delete cascade,
  version int not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists studio_magic_reveal_versions_reveal_idx on public.studio_magic_reveal_versions (reveal_id);

comment on table public.studio_magic_reveals is 'Draft reveals mutable until publish-bound; settlement writes via Edge only.';
