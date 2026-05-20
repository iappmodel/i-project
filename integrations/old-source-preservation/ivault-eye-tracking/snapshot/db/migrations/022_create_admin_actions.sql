-- 22/23 MVP — admin_actions — auditable record of admin operations on targets (optional link to system_events).

create table admin_actions (
  id uuid primary key default gen_random_uuid(),

  admin_user_id uuid not null references users (id),

  action_type text not null,
  target_type text not null,
  target_id uuid not null,

  reason text,
  notes text,

  source_event_id uuid references system_events (id),

  created_at timestamptz not null default now()
);

create index idx_admin_actions_admin on admin_actions (admin_user_id, created_at desc);
create index idx_admin_actions_target on admin_actions (target_type, target_id);
