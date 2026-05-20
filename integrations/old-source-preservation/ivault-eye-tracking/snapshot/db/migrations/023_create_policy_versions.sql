-- 23/23 MVP — policy_versions — versioned policy config per domain (reward, trust, etc.).

create table policy_versions (
  id uuid primary key default gen_random_uuid(),

  policy_version text not null unique,

  domain text not null
    check (domain in ('reward', 'trust', 'fraud', 'campaign', 'withdrawal', 'attention')),

  status text not null default 'draft'
    check (status in ('draft', 'active', 'retired')),

  config jsonb not null default '{}'::jsonb,

  created_by uuid references users(id),
  activated_by uuid references users(id),

  created_at timestamptz not null default now(),
  activated_at timestamptz,
  retired_at timestamptz
);

create index idx_policy_versions_domain_status on policy_versions(domain, status);
