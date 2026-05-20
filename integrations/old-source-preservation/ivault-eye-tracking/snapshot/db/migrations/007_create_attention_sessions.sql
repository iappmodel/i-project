-- 7/23 MVP — attention_sessions — per-session attention metrics tied to user, device, and campaign.

create table attention_sessions (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references users (id),
  device_id uuid references devices (id),
  campaign_id uuid references campaigns (id),

  content_id uuid,

  placement text not null
    check (placement in ('feed', 'earn', 'igo', 'creator_page', 'campaign_detail')),

  status text not null default 'started'
    check (status in ('started', 'completed', 'abandoned', 'failed')),

  required_ms int,
  watched_ms int default 0,
  foreground_ms int default 0,
  visible_ms int default 0,

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  abandoned_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index idx_attention_sessions_user on attention_sessions (user_id, created_at desc);
create index idx_attention_sessions_campaign on attention_sessions (campaign_id);
create index idx_attention_sessions_status on attention_sessions (status);
