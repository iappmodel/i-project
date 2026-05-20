-- Campaigns + attempts + budget events (server-authoritative budget movement)

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  status text not null default 'draft',
  title text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaigns_owner_idx on public.campaigns (owner_user_id);
create index if not exists campaigns_status_idx on public.campaigns (status);

create table if not exists public.campaign_action_attempts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  actor_user_id uuid,
  action_kind text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists campaign_action_attempts_campaign_idx on public.campaign_action_attempts (campaign_id);

create table if not exists public.campaign_budget_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  idempotency_key text not null,
  kind text not null,
  amount_minor bigint not null default 0,
  currency text not null default 'USD',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists campaign_budget_events_idem_uidx on public.campaign_budget_events (idempotency_key);
create index if not exists campaign_budget_events_campaign_idx on public.campaign_budget_events (campaign_id);

comment on table public.campaign_budget_events is 'Append-only budget intent; activation/settlement via Edge + service role.';
