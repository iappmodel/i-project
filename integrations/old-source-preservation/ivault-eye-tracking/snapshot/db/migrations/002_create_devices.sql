-- 2/23 MVP — devices — per-user device registry and trust surface.

create table devices (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references users (id),

  platform text not null
    check (platform in ('ios', 'android', 'web', 'desktop')),

  device_fingerprint_hash text not null,
  model text,
  os_version text,
  app_version text,

  trust_status text not null default 'unknown'
    check (trust_status in ('trusted', 'unknown', 'suspicious', 'blocked')),

  last_seen_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz,

  unique (user_id, device_fingerprint_hash)
);

create index idx_devices_user_id on devices (user_id);
create index idx_devices_fingerprint on devices (device_fingerprint_hash);
