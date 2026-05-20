-- Step 9.79 — Trust incident response (minimal schema + detect hook for observability / digest flows).
-- Must run before 195_admin_security_proof_observability_command_center_v2.sql.

create table if not exists admin_security_trust_incidents (
  id uuid primary key default gen_random_uuid(),
  incident_key text not null unique,
  status text not null default 'open',
  severity text not null default 'medium',
  incident_type text not null default 'other',
  title text not null,
  summary text,
  customer_name text,
  customer_domain text,
  private_room_id uuid references admin_security_private_trust_rooms(id) on delete set null,
  customer_notice_required boolean not null default false,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_trust_incidents_status_check
    check (
      status in (
        'open',
        'acknowledged',
        'investigating',
        'escalated',
        'mitigating',
        'resolved',
        'closed',
        'false_positive',
        'archived'
      )
    ),
  constraint admin_security_trust_incidents_severity_check
    check (severity in ('low', 'medium', 'high', 'critical')),
  constraint admin_security_trust_incidents_type_check
    check (
      incident_type in (
        'broken_timeline_chain',
        'invalid_merkle_root',
        'anchor_failure',
        'verification_failure',
        'policy_violation',
        'other'
      )
    ),
  constraint admin_security_trust_incidents_title_check
    check (length(trim(title)) > 0)
);

create index if not exists admin_security_trust_incidents_room_idx
  on admin_security_trust_incidents (private_room_id, status, created_at desc);
create index if not exists admin_security_trust_incidents_customer_idx
  on admin_security_trust_incidents (customer_name, customer_domain, status);

drop trigger if exists admin_security_trust_incidents_set_updated_at on admin_security_trust_incidents;
create trigger admin_security_trust_incidents_set_updated_at
before update on admin_security_trust_incidents
for each row
execute function set_updated_at();

create table if not exists admin_security_trust_incident_assignments (
  id uuid primary key default gen_random_uuid(),
  assignment_key text not null unique,
  incident_id uuid not null references admin_security_trust_incidents(id) on delete cascade,
  status text not null default 'active',
  assignee_admin_user_id uuid,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_trust_incident_assignments_status_check
    check (status in ('active', 'released', 'archived'))
);

create index if not exists admin_security_trust_incident_assignments_incident_idx
  on admin_security_trust_incident_assignments (incident_id, status);

create table if not exists admin_security_trust_incident_customer_notices (
  id uuid primary key default gen_random_uuid(),
  notice_key text not null unique,
  incident_id uuid not null references admin_security_trust_incidents(id) on delete cascade,
  private_room_id uuid references admin_security_private_trust_rooms(id) on delete set null,
  status text not null default 'draft',
  title text,
  body text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_trust_incident_customer_notices_status_check
    check (status in ('draft', 'approved', 'published', 'sent', 'archived'))
);

create index if not exists admin_security_trust_incident_customer_notices_room_idx
  on admin_security_trust_incident_customer_notices (private_room_id, status);
create index if not exists admin_security_trust_incident_customer_notices_incident_idx
  on admin_security_trust_incident_customer_notices (incident_id, status);

create or replace function detect_admin_security_trust_incidents(
  p_batch_size integer default 1000,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Placeholder: production wiring would scan proof / chain / verification state and open incidents.
  perform 1;
end;
$$;

grant execute on function detect_admin_security_trust_incidents(integer, text, jsonb)
  to admin_api_role, worker_role;

alter table admin_security_trust_incidents enable row level security;
alter table admin_security_trust_incident_assignments enable row level security;
alter table admin_security_trust_incident_customer_notices enable row level security;

create policy admin_security_trust_incidents_no_user_direct_access
on admin_security_trust_incidents
for all
to authenticated
using (false)
with check (false);

create policy admin_security_trust_incident_assignments_no_user_direct_access
on admin_security_trust_incident_assignments
for all
to authenticated
using (false)
with check (false);

create policy admin_security_trust_incident_customer_notices_no_user_direct_access
on admin_security_trust_incident_customer_notices
for all
to authenticated
using (false)
with check (false);

create policy admin_api_all_trust_incidents
on admin_security_trust_incidents
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_trust_incident_assignments
on admin_security_trust_incident_assignments
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_trust_incident_customer_notices
on admin_security_trust_incident_customer_notices
for all
to admin_api_role
using (true)
with check (true);

create policy worker_all_trust_incidents
on admin_security_trust_incidents
for all
to worker_role
using (true)
with check (true);

create policy worker_all_trust_incident_assignments
on admin_security_trust_incident_assignments
for all
to worker_role
using (true)
with check (true);

create policy worker_all_trust_incident_customer_notices
on admin_security_trust_incident_customer_notices
for all
to worker_role
using (true)
with check (true);
