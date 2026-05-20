-- Step 9.7 — Admin RBAC: users, roles, permissions, audit log, auth helpers.
-- Runs after 124_device_ip_session_risk.sql; before 160_scheduler_schema.sql.
--
-- Bootstrap first admin (service-role SQL / superuser only; never expose via HTTP):
--   select upsert_admin_user('<auth_user_uuid>'::uuid, 'admin@example.com', 'Local Super Admin', 'active', '{"bootstrap": true}'::jsonb);
--   select assign_admin_role('<auth_user_uuid>'::uuid, 'super_admin', null, 'local bootstrap');

-- ---------------------------------------------------------------------------
-- 2. Admin users
-- ---------------------------------------------------------------------------

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null unique,

  email text,
  display_name text,

  status text not null default 'active',

  last_seen_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_users_status_check
  check (
    status in (
      'active',
      'suspended',
      'revoked'
    )
  )
);

create index if not exists admin_users_status_idx
on admin_users (status);

create index if not exists admin_users_user_idx
on admin_users (user_id);

drop trigger if exists admin_users_set_updated_at
on admin_users;

create trigger admin_users_set_updated_at
before update on admin_users
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Admin roles
-- ---------------------------------------------------------------------------

create table if not exists admin_roles (
  id uuid primary key default gen_random_uuid(),

  role_key text not null unique,
  role_name text not null,

  description text,

  status text not null default 'active',

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_roles_status_check
  check (
    status in (
      'active',
      'archived'
    )
  )
);

create index if not exists admin_roles_status_idx
on admin_roles (status);

drop trigger if exists admin_roles_set_updated_at
on admin_roles;

create trigger admin_roles_set_updated_at
before update on admin_roles
for each row
execute function set_updated_at();

insert into admin_roles (
  role_key,
  role_name,
  description
)
values
  (
    'super_admin',
    'Super Admin',
    'Full administrative access.'
  ),
  (
    'risk_analyst',
    'Risk Analyst',
    'Can review trust, risk, devices, and withdrawal review queue.'
  ),
  (
    'finance_ops',
    'Finance Ops',
    'Can review money, withdrawals, payouts, accounting, and audit views.'
  ),
  (
    'support_admin',
    'Support Admin',
    'Can inspect user-facing wallet/reward/withdrawal state but cannot mutate risk or finance decisions.'
  ),
  (
    'readonly_admin',
    'Read-only Admin',
    'Read-only operational dashboard access.'
  )
on conflict (role_key)
do update set
  role_name = excluded.role_name,
  description = excluded.description,
  status = 'active',
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 4. Admin user roles
-- ---------------------------------------------------------------------------

create table if not exists admin_user_roles (
  id uuid primary key default gen_random_uuid(),

  admin_user_id uuid not null references admin_users(id) on delete cascade,
  admin_role_id uuid not null references admin_roles(id) on delete cascade,

  assigned_by uuid,
  assigned_reason text,

  status text not null default 'active',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (admin_user_id, admin_role_id),

  constraint admin_user_roles_status_check
  check (
    status in (
      'active',
      'revoked'
    )
  )
);

create index if not exists admin_user_roles_admin_idx
on admin_user_roles (admin_user_id, status);

create index if not exists admin_user_roles_role_idx
on admin_user_roles (admin_role_id, status);

drop trigger if exists admin_user_roles_set_updated_at
on admin_user_roles;

create trigger admin_user_roles_set_updated_at
before update on admin_user_roles
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Admin permissions
-- ---------------------------------------------------------------------------

create table if not exists admin_permissions (
  id uuid primary key default gen_random_uuid(),

  permission_key text not null unique,
  permission_name text not null,

  permission_group text not null,

  description text,

  status text not null default 'active',

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_permissions_group_check
  check (
    permission_group in (
      'system',
      'wallet',
      'reward',
      'withdrawal',
      'risk',
      'trust',
      'device',
      'finance',
      'audit',
      'scheduler',
      'admin'
    )
  ),

  constraint admin_permissions_status_check
  check (
    status in (
      'active',
      'archived'
    )
  )
);

create index if not exists admin_permissions_group_idx
on admin_permissions (permission_group, status);

drop trigger if exists admin_permissions_set_updated_at
on admin_permissions;

create trigger admin_permissions_set_updated_at
before update on admin_permissions
for each row
execute function set_updated_at();

insert into admin_permissions (
  permission_key,
  permission_name,
  permission_group,
  description
)
values
  ('system.read', 'Read system dashboard', 'system', 'Can read system command center.'),
  ('wallet.read', 'Read wallets', 'wallet', 'Can read wallet operational data.'),
  ('reward.read', 'Read rewards', 'reward', 'Can read reward operational data.'),

  ('withdrawal.read', 'Read withdrawals', 'withdrawal', 'Can read withdrawal data.'),
  ('withdrawal.review', 'Review withdrawals', 'withdrawal', 'Can approve or block reviewed withdrawals.'),
  ('withdrawal.provider.read', 'Read payout provider events', 'withdrawal', 'Can read payout provider event data.'),

  ('risk.read', 'Read risk', 'risk', 'Can read risk sessions and network observations.'),
  ('device.read', 'Read devices', 'device', 'Can read device risk data.'),
  ('device.write', 'Update device status', 'device', 'Can mark devices active/trusted/suspicious/blocked.'),

  ('trust.read', 'Read trust', 'trust', 'Can read trust scores and components.'),
  ('trust.write', 'Write trust components', 'trust', 'Can add manual trust score components.'),

  ('finance.read', 'Read finance', 'finance', 'Can read accounting and money integrity data.'),
  ('audit.read', 'Read audit', 'audit', 'Can read audit hash/integrity data.'),

  ('scheduler.read', 'Read scheduler', 'scheduler', 'Can read scheduler jobs and runs.'),
  ('scheduler.run', 'Run scheduler jobs', 'scheduler', 'Can manually trigger worker jobs.'),

  ('admin.read', 'Read admin users', 'admin', 'Can read admin user/role data.'),
  ('admin.write', 'Manage admin users', 'admin', 'Can assign/revoke admin roles.')
on conflict (permission_key)
do update set
  permission_name = excluded.permission_name,
  permission_group = excluded.permission_group,
  description = excluded.description,
  status = 'active',
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 6. Role-permission mapping
-- ---------------------------------------------------------------------------

create table if not exists admin_role_permissions (
  id uuid primary key default gen_random_uuid(),

  admin_role_id uuid not null references admin_roles(id) on delete cascade,
  admin_permission_id uuid not null references admin_permissions(id) on delete cascade,

  status text not null default 'active',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (admin_role_id, admin_permission_id),

  constraint admin_role_permissions_status_check
  check (
    status in (
      'active',
      'revoked'
    )
  )
);

create index if not exists admin_role_permissions_role_idx
on admin_role_permissions (admin_role_id, status);

drop trigger if exists admin_role_permissions_set_updated_at
on admin_role_permissions;

create trigger admin_role_permissions_set_updated_at
before update on admin_role_permissions
for each row
execute function set_updated_at();

insert into admin_role_permissions (
  admin_role_id,
  admin_permission_id
)
select
  r.id,
  p.id
from admin_roles r
cross join admin_permissions p
where r.role_key = 'super_admin'
on conflict (admin_role_id, admin_permission_id)
do nothing;

insert into admin_role_permissions (
  admin_role_id,
  admin_permission_id
)
select
  r.id,
  p.id
from admin_roles r
join admin_permissions p
  on p.permission_key in (
    'system.read',
    'wallet.read',
    'withdrawal.read',
    'withdrawal.review',
    'withdrawal.provider.read',
    'risk.read',
    'device.read',
    'device.write',
    'trust.read',
    'trust.write'
  )
where r.role_key = 'risk_analyst'
on conflict (admin_role_id, admin_permission_id)
do nothing;

insert into admin_role_permissions (
  admin_role_id,
  admin_permission_id
)
select
  r.id,
  p.id
from admin_roles r
join admin_permissions p
  on p.permission_key in (
    'system.read',
    'wallet.read',
    'reward.read',
    'withdrawal.read',
    'withdrawal.review',
    'withdrawal.provider.read',
    'finance.read',
    'audit.read',
    'scheduler.read'
  )
where r.role_key = 'finance_ops'
on conflict (admin_role_id, admin_permission_id)
do nothing;

insert into admin_role_permissions (
  admin_role_id,
  admin_permission_id
)
select
  r.id,
  p.id
from admin_roles r
join admin_permissions p
  on p.permission_key in (
    'system.read',
    'wallet.read',
    'reward.read',
    'withdrawal.read',
    'trust.read',
    'risk.read',
    'device.read'
  )
where r.role_key = 'support_admin'
on conflict (admin_role_id, admin_permission_id)
do nothing;

insert into admin_role_permissions (
  admin_role_id,
  admin_permission_id
)
select
  r.id,
  p.id
from admin_roles r
join admin_permissions p
  on p.permission_key in (
    'system.read',
    'wallet.read',
    'reward.read',
    'withdrawal.read',
    'risk.read',
    'device.read',
    'trust.read',
    'finance.read',
    'audit.read',
    'scheduler.read'
  )
where r.role_key = 'readonly_admin'
on conflict (admin_role_id, admin_permission_id)
do nothing;

-- ---------------------------------------------------------------------------
-- 7. Admin action audit log
-- ---------------------------------------------------------------------------

create table if not exists admin_action_audit_log (
  id uuid primary key default gen_random_uuid(),

  admin_user_id uuid references admin_users(id),
  admin_auth_user_id uuid,

  action_key text not null,
  permission_key text,

  target_type text,
  target_id uuid,

  request_id text,
  endpoint text,
  method text,

  decision text not null default 'allowed',

  reason text,

  metadata jsonb not null default '{}'::jsonb,

  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint admin_action_audit_log_decision_check
  check (
    decision in (
      'allowed',
      'denied',
      'failed'
    )
  )
);

create index if not exists admin_action_audit_log_admin_idx
on admin_action_audit_log (admin_user_id, occurred_at desc);

create index if not exists admin_action_audit_log_auth_user_idx
on admin_action_audit_log (admin_auth_user_id, occurred_at desc);

create index if not exists admin_action_audit_log_action_idx
on admin_action_audit_log (action_key, occurred_at desc);

create index if not exists admin_action_audit_log_target_idx
on admin_action_audit_log (target_type, target_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- 8. Admin auth helper functions
-- ---------------------------------------------------------------------------

create or replace function get_active_admin_user(
  p_auth_user_id uuid
)
returns admin_users
language plpgsql
stable
as $$
declare
  v_admin admin_users%rowtype;
begin
  if p_auth_user_id is null then
    raise exception 'auth user id is required';
  end if;

  select *
  into v_admin
  from admin_users
  where user_id = p_auth_user_id
    and status = 'active';

  return v_admin;
end;
$$;

create or replace function admin_has_permission(
  p_auth_user_id uuid,
  p_permission_key text
)
returns boolean
language plpgsql
stable
as $$
declare
  v_has_permission boolean;
begin
  if p_auth_user_id is null then
    return false;
  end if;

  if p_permission_key is null or length(trim(p_permission_key)) = 0 then
    return false;
  end if;

  select exists (
    select 1
    from admin_users au
    join admin_user_roles aur
      on aur.admin_user_id = au.id
     and aur.status = 'active'
    join admin_roles ar
      on ar.id = aur.admin_role_id
     and ar.status = 'active'
    join admin_role_permissions arp
      on arp.admin_role_id = ar.id
     and arp.status = 'active'
    join admin_permissions ap
      on ap.id = arp.admin_permission_id
     and ap.status = 'active'
    where au.user_id = p_auth_user_id
      and au.status = 'active'
      and ap.permission_key = p_permission_key
  )
  into v_has_permission;

  return coalesce(v_has_permission, false);
end;
$$;

create or replace function record_admin_action(
  p_auth_user_id uuid,
  p_action_key text,
  p_permission_key text default null,
  p_target_type text default null,
  p_target_id uuid default null,
  p_request_id text default null,
  p_endpoint text default null,
  p_method text default null,
  p_decision text default 'allowed',
  p_reason text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_log_id uuid;
begin
  v_admin := get_active_admin_user(p_auth_user_id);

  insert into admin_action_audit_log (
    admin_user_id,
    admin_auth_user_id,
    action_key,
    permission_key,
    target_type,
    target_id,
    request_id,
    endpoint,
    method,
    decision,
    reason,
    metadata
  )
  values (
    v_admin.id,
    p_auth_user_id,
    p_action_key,
    p_permission_key,
    p_target_type,
    p_target_id,
    p_request_id,
    p_endpoint,
    p_method,
    coalesce(p_decision, 'allowed'),
    p_reason,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_log_id;

  return v_log_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Admin management functions
-- ---------------------------------------------------------------------------

create or replace function upsert_admin_user(
  p_auth_user_id uuid,
  p_email text default null,
  p_display_name text default null,
  p_status text default 'active',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin_user_id uuid;
begin
  if p_auth_user_id is null then
    raise exception 'auth user id is required';
  end if;

  insert into admin_users (
    user_id,
    email,
    display_name,
    status,
    metadata
  )
  values (
    p_auth_user_id,
    p_email,
    p_display_name,
    coalesce(p_status, 'active'),
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (user_id)
  do update set
    email = coalesce(excluded.email, admin_users.email),
    display_name = coalesce(excluded.display_name, admin_users.display_name),
    status = excluded.status,
    metadata = admin_users.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_admin_user_id;

  return v_admin_user_id;
end;
$$;

create or replace function assign_admin_role(
  p_admin_auth_user_id uuid,
  p_role_key text,
  p_assigned_by uuid default null,
  p_reason text default null
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_role admin_roles%rowtype;
  v_assignment_id uuid;
begin
  v_admin := get_active_admin_user(p_admin_auth_user_id);

  if v_admin.id is null then
    raise exception 'admin user not found or inactive';
  end if;

  select *
  into v_role
  from admin_roles
  where role_key = p_role_key
    and status = 'active';

  if v_role.id is null then
    raise exception 'admin role not found: %', p_role_key;
  end if;

  insert into admin_user_roles (
    admin_user_id,
    admin_role_id,
    assigned_by,
    assigned_reason,
    status
  )
  values (
    v_admin.id,
    v_role.id,
    p_assigned_by,
    p_reason,
    'active'
  )
  on conflict (admin_user_id, admin_role_id)
  do update set
    status = 'active',
    assigned_by = excluded.assigned_by,
    assigned_reason = excluded.assigned_reason,
    updated_at = now()
  returning id into v_assignment_id;

  return v_assignment_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Admin auth views
-- ---------------------------------------------------------------------------

create or replace view admin_user_permission_detail as
select
  au.id as admin_user_id,
  au.user_id as auth_user_id,
  au.email,
  au.display_name,
  au.status as admin_status,

  ar.role_key,
  ar.role_name,

  ap.permission_key,
  ap.permission_name,
  ap.permission_group

from admin_users au
join admin_user_roles aur
  on aur.admin_user_id = au.id
 and aur.status = 'active'
join admin_roles ar
  on ar.id = aur.admin_role_id
 and ar.status = 'active'
join admin_role_permissions arp
  on arp.admin_role_id = ar.id
 and arp.status = 'active'
join admin_permissions ap
  on ap.id = arp.admin_permission_id
 and ap.status = 'active'
where au.status = 'active';

create or replace view admin_user_role_summary as
select
  au.id as admin_user_id,
  au.user_id as auth_user_id,
  au.email,
  au.display_name,
  au.status,

  jsonb_agg(
    distinct jsonb_build_object(
      'roleKey', ar.role_key,
      'roleName', ar.role_name
    )
  ) filter (where ar.role_key is not null) as roles,

  jsonb_agg(
    distinct jsonb_build_object(
      'permissionKey', ap.permission_key,
      'permissionName', ap.permission_name,
      'permissionGroup', ap.permission_group
    )
  ) filter (where ap.permission_key is not null) as permissions,

  au.last_seen_at,
  au.created_at,
  au.updated_at

from admin_users au
left join admin_user_roles aur
  on aur.admin_user_id = au.id
 and aur.status = 'active'
left join admin_roles ar
  on ar.id = aur.admin_role_id
 and ar.status = 'active'
left join admin_role_permissions arp
  on arp.admin_role_id = ar.id
 and arp.status = 'active'
left join admin_permissions ap
  on ap.id = arp.admin_permission_id
 and ap.status = 'active'
group by au.id;

-- ---------------------------------------------------------------------------
-- 11. RLS / grants
-- ---------------------------------------------------------------------------

alter table admin_users enable row level security;
alter table admin_roles enable row level security;
alter table admin_user_roles enable row level security;
alter table admin_permissions enable row level security;
alter table admin_role_permissions enable row level security;
alter table admin_action_audit_log enable row level security;

drop policy if exists admin_users_no_user_direct_access on admin_users;
create policy admin_users_no_user_direct_access
on admin_users
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_roles_no_user_direct_access on admin_roles;
create policy admin_roles_no_user_direct_access
on admin_roles
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_user_roles_no_user_direct_access on admin_user_roles;
create policy admin_user_roles_no_user_direct_access
on admin_user_roles
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_permissions_no_user_direct_access on admin_permissions;
create policy admin_permissions_no_user_direct_access
on admin_permissions
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_role_permissions_no_user_direct_access on admin_role_permissions;
create policy admin_role_permissions_no_user_direct_access
on admin_role_permissions
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_action_audit_log_no_user_direct_access on admin_action_audit_log;
create policy admin_action_audit_log_no_user_direct_access
on admin_action_audit_log
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_api_all_admin_users on admin_users;
create policy admin_api_all_admin_users
on admin_users
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_roles on admin_roles;
create policy admin_api_all_admin_roles
on admin_roles
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_user_roles on admin_user_roles;
create policy admin_api_all_admin_user_roles
on admin_user_roles
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_permissions on admin_permissions;
create policy admin_api_all_admin_permissions
on admin_permissions
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_role_permissions on admin_role_permissions;
create policy admin_api_all_admin_role_permissions
on admin_role_permissions
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_action_audit_log on admin_action_audit_log;
create policy admin_api_all_admin_action_audit_log
on admin_action_audit_log
for all
to admin_api_role
using (true)
with check (true);

grant select on admin_user_permission_detail to admin_api_role;
grant select on admin_user_role_summary to admin_api_role;

grant execute on function get_active_admin_user(uuid)
to admin_api_role;

grant execute on function admin_has_permission(uuid, text)
to admin_api_role;

grant execute on function record_admin_action(
  uuid,
  text,
  text,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function upsert_admin_user(
  uuid,
  text,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function assign_admin_role(
  uuid,
  text,
  uuid,
  text
) to admin_api_role;

alter function get_active_admin_user(uuid) security definer;
alter function get_active_admin_user(uuid) set search_path = public;

alter function admin_has_permission(uuid, text) security definer;
alter function admin_has_permission(uuid, text) set search_path = public;

alter function record_admin_action(
  uuid,
  text,
  text,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  jsonb
) security definer;

alter function record_admin_action(
  uuid,
  text,
  text,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  jsonb
) set search_path = public;

-- ---------------------------------------------------------------------------
-- 12. Error taxonomy patch
-- ---------------------------------------------------------------------------

insert into error_catalog (
  error_code,
  category,
  severity,
  http_status,
  retryable,
  user_visible,
  user_message,
  internal_message,
  owner_team
)
values
  (
    'ADMIN_AUTH_REQUIRED',
    'auth',
    'medium',
    401,
    false,
    true,
    'Admin sign-in required.',
    'Admin authentication required.',
    'platform'
  ),
  (
    'ADMIN_PERMISSION_DENIED',
    'permission',
    'high',
    403,
    false,
    true,
    'You do not have admin permission for this action.',
    'Admin permission check failed.',
    'platform'
  ),
  (
    'ADMIN_USER_NOT_FOUND',
    'permission',
    'high',
    403,
    false,
    false,
    'You do not have admin permission for this action.',
    'Admin user not found or inactive.',
    'platform'
  )
on conflict (error_code)
do update set
  category = excluded.category,
  severity = excluded.severity,
  http_status = excluded.http_status,
  retryable = excluded.retryable,
  user_visible = excluded.user_visible,
  user_message = excluded.user_message,
  internal_message = excluded.internal_message,
  owner_team = excluded.owner_team,
  updated_at = now();

insert into error_mapping_rules (
  match_pattern,
  error_code,
  priority,
  metadata
)
values
  ('user is not an active admin', 'ADMIN_USER_NOT_FOUND', 5, '{}'::jsonb),
  ('missing required permission', 'ADMIN_PERMISSION_DENIED', 5, '{}'::jsonb),
  ('admin user not found or inactive', 'ADMIN_USER_NOT_FOUND', 5, '{}'::jsonb)
on conflict (match_pattern)
do nothing;
