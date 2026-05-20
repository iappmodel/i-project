-- Publish pipeline + post packages (immutable after seal)

create table if not exists public.studio_export_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects (id) on delete cascade,
  owner_user_id uuid not null,
  status text not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_export_jobs_project_idx on public.studio_export_jobs (project_id);

create table if not exists public.post_packages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects (id) on delete cascade,
  owner_user_id uuid not null,
  status text not null default 'draft',
  package_hash text not null,
  snapshot jsonb not null,
  sealed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint post_packages_immutable_hash check (package_hash <> '')
);

create index if not exists post_packages_project_idx on public.post_packages (project_id);
create index if not exists post_packages_owner_idx on public.post_packages (owner_user_id);

create table if not exists public.published_posts (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.post_packages (id),
  project_id uuid not null references public.studio_projects (id) on delete cascade,
  owner_user_id uuid not null,
  status text not null default 'published',
  visibility text,
  published_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists published_posts_owner_idx on public.published_posts (owner_user_id);

create table if not exists public.post_disclosures (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.published_posts (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.post_packages is 'IMMUTABLE after seal: no snapshot/package_hash updates from client; use Edge publish-post.';
