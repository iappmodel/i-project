-- 4/23 MVP — campaigns — owner-scoped campaigns; defines currency_code enum for money tables.

do $$
begin
  create type currency_code as enum (
    'USD',
    'ICOIN',
    'VCOIN',
    'RCOIN'
  );
exception
  when duplicate_object then null;
end
$$;

create table campaigns (
  id uuid primary key default gen_random_uuid(),

  owner_id uuid not null references users (id),
  owner_type text not null
    check (owner_type in ('brand', 'creator', 'local_business', 'platform')),

  name text not null,
  description text,

  campaign_type text not null
    check (campaign_type in (
      'watch',
      'engage',
      'visit',
      'install',
      'survey',
      'purchase',
      'local_offer'
    )),

  status text not null default 'draft'
    check (status in (
      'draft',
      'submitted',
      'approved',
      'active',
      'paused',
      'completed',
      'rejected',
      'cancelled'
    )),

  currency currency_code not null,

  total_budget_minor bigint not null check (total_budget_minor >= 0),

  reward_amount_minor bigint not null check (reward_amount_minor >= 0),

  starts_at timestamptz,
  ends_at timestamptz,

  targeting jsonb not null default '{}'::jsonb,
  rules jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index idx_campaigns_status on campaigns (status);
create index idx_campaigns_owner on campaigns (owner_id);
create index idx_campaigns_type on campaigns (campaign_type);
create index idx_campaigns_targeting_gin on campaigns using gin (targeting);
