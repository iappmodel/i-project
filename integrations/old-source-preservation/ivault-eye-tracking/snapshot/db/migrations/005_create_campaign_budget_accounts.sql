-- 5/23 MVP — campaign_budget_accounts — authoritative funded / reserved / spent / released.

create table campaign_budget_accounts (
  id uuid primary key default gen_random_uuid(),

  campaign_id uuid not null unique references campaigns (id),

  currency currency_code not null,

  funded_minor bigint not null default 0 check (funded_minor >= 0),
  reserved_minor bigint not null default 0 check (reserved_minor >= 0),
  spent_minor bigint not null default 0 check (spent_minor >= 0),
  released_minor bigint not null default 0 check (released_minor >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz,

  check (reserved_minor + spent_minor <= funded_minor)
);

create index idx_campaign_budget_accounts_currency on campaign_budget_accounts (currency);
