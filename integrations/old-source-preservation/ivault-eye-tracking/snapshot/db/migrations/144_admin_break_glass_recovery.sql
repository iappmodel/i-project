-- Step 9.29 — Build admin break-glass recovery process.
-- Runs after 143_admin_session_expiration_bulk_revocation.sql.

create table if not exists admin_break_glass_policies (
  id uuid primary key default gen_random_uuid(),
  policy_key text not null unique,
  status text not null default 'active',
  max_duration_seconds integer not null default 1800,
  require_second_admin_approval boolean not null default true,
  require_mfa_if_available boolean not null default true,
  auto_revoke_sessions_after_use boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_break_glass_policies_status_check
    check (status in ('active', 'paused', 'archived')),
  constraint admin_break_glass_policies_duration_check
    check (max_duration_seconds between 300 and 7200)
);

create index if not exists admin_break_glass_policies_status_idx
on admin_break_glass_policies (status);

drop trigger if exists admin_break_glass_policies_set_updated_at
on admin_break_glass_policies;

create trigger admin_break_glass_policies_set_updated_at
before update on admin_break_glass_policies
for each row
execute function set_updated_at();

insert into admin_break_glass_policies (
  policy_key,
  status,
  max_duration_seconds,
  require_second_admin_approval,
  require_mfa_if_available,
  auto_revoke_sessions_after_use,
  metadata
)
values (
  'default_admin_break_glass_policy_v1',
  'active',
  1800,
  true,
  true,
  true,
  '{"meaning": "default emergency break-glass admin recovery policy"}'::jsonb
)
on conflict (policy_key)
do update set
  status = excluded.status,
  max_duration_seconds = excluded.max_duration_seconds,
  require_second_admin_approval = excluded.require_second_admin_approval,
  require_mfa_if_available = excluded.require_mfa_if_available,
  auto_revoke_sessions_after_use = excluded.auto_revoke_sessions_after_use,
  metadata = admin_break_glass_policies.metadata || excluded.metadata,
  updated_at = now();

create table if not exists admin_break_glass_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by_auth_user_id uuid not null,
  requested_by_admin_user_id uuid references admin_users(id),
  target_auth_user_id uuid not null,
  target_admin_user_id uuid references admin_users(id),
  status text not null default 'pending',
  reason text not null,
  requested_role_key text not null default 'super_admin',
  granted_role_assignment_id uuid references admin_user_roles(id),
  token_hash text,
  token_hash_version text not null default 'sha256_v1',
  approved_by_auth_user_id uuid,
  approved_by_admin_user_id uuid references admin_users(id),
  approved_at timestamptz,
  rejected_by_auth_user_id uuid,
  rejected_by_admin_user_id uuid references admin_users(id),
  rejected_at timestamptz,
  rejection_reason text,
  executed_by_auth_user_id uuid,
  executed_by_admin_user_id uuid references admin_users(id),
  executed_at timestamptz,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_by_auth_user_id uuid,
  revoked_by_admin_user_id uuid references admin_users(id),
  revoke_reason text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_break_glass_requests_status_check
    check (status in ('pending', 'approved', 'rejected', 'executed', 'expired', 'revoked')),
  constraint admin_break_glass_requests_role_check
    check (requested_role_key in ('super_admin')),
  constraint admin_break_glass_requests_expiry_check
    check (expires_at > created_at)
);

create index if not exists admin_break_glass_requests_status_idx
on admin_break_glass_requests (status, expires_at asc);

create index if not exists admin_break_glass_requests_target_idx
on admin_break_glass_requests (target_auth_user_id, created_at desc);

create index if not exists admin_break_glass_requests_requester_idx
on admin_break_glass_requests (requested_by_auth_user_id, created_at desc);

drop trigger if exists admin_break_glass_requests_set_updated_at
on admin_break_glass_requests;

create trigger admin_break_glass_requests_set_updated_at
before update on admin_break_glass_requests
for each row
execute function set_updated_at();

create or replace function get_active_admin_break_glass_policy()
returns admin_break_glass_policies
language plpgsql
stable
as $$
declare
  v_policy admin_break_glass_policies%rowtype;
begin
  select *
  into v_policy
  from admin_break_glass_policies
  where status = 'active'
  order by updated_at desc
  limit 1;

  if v_policy.id is null then
    raise exception 'no active admin break-glass policy found';
  end if;

  return v_policy;
end;
$$;

create or replace function request_admin_break_glass_access(
  p_requested_by_auth_user_id uuid,
  p_target_auth_user_id uuid,
  p_reason text,
  p_token_hash text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_policy admin_break_glass_policies%rowtype;
  v_requester admin_users%rowtype;
  v_target admin_users%rowtype;
  v_request_id uuid;
begin
  if p_requested_by_auth_user_id is null then
    raise exception 'requested by auth user id is required';
  end if;
  if p_target_auth_user_id is null then
    raise exception 'target auth user id is required';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'break-glass reason is required';
  end if;
  if p_token_hash is null or length(trim(p_token_hash)) = 0 then
    raise exception 'break-glass token hash is required';
  end if;

  v_policy := get_active_admin_break_glass_policy();
  v_requester := get_active_admin_user(p_requested_by_auth_user_id);

  select *
  into v_target
  from admin_users
  where user_id = p_target_auth_user_id
  order by created_at desc
  limit 1;

  if v_target.id is null then
    raise exception 'target admin user not found';
  end if;

  if exists (
    select 1
    from admin_break_glass_requests
    where target_auth_user_id = p_target_auth_user_id
      and status in ('pending', 'approved', 'executed')
      and expires_at > now()
  ) then
    raise exception 'active break-glass request already exists for target admin';
  end if;

  insert into admin_break_glass_requests (
    requested_by_auth_user_id,
    requested_by_admin_user_id,
    target_auth_user_id,
    target_admin_user_id,
    status,
    reason,
    requested_role_key,
    token_hash,
    expires_at,
    request_id,
    metadata
  )
  values (
    p_requested_by_auth_user_id,
    v_requester.id,
    p_target_auth_user_id,
    v_target.id,
    'pending',
    p_reason,
    'super_admin',
    p_token_hash,
    now() + make_interval(secs => v_policy.max_duration_seconds),
    p_request_id,
    p_metadata
  )
  returning id into v_request_id;

  perform record_admin_action(
    p_requested_by_auth_user_id,
    'request_admin_break_glass_access',
    'admin.write',
    'admin_break_glass_request',
    v_request_id,
    p_request_id,
    null,
    null,
    'allowed',
    p_reason,
    p_metadata || jsonb_build_object('target_auth_user_id', p_target_auth_user_id)
  );

  perform create_admin_security_alert(
    'admin_break_glass_requested',
    'critical',
    p_requested_by_auth_user_id,
    p_target_auth_user_id,
    'request_admin_break_glass_access',
    null,
    'Emergency break-glass admin access was requested.',
    p_metadata || jsonb_build_object(
      'request_id',
      p_request_id,
      'admin_break_glass_request_id',
      v_request_id,
      'reason',
      p_reason
    )
  );

  return v_request_id;
end;
$$;

create or replace function approve_admin_break_glass_request(
  p_approved_by_auth_user_id uuid,
  p_break_glass_request_id uuid,
  p_reason text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_policy admin_break_glass_policies%rowtype;
  v_request admin_break_glass_requests%rowtype;
  v_approver admin_users%rowtype;
begin
  if p_approved_by_auth_user_id is null then
    raise exception 'approved by auth user id is required';
  end if;
  if p_break_glass_request_id is null then
    raise exception 'break-glass request id is required';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'approval reason is required';
  end if;

  if admin_has_permission(p_approved_by_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  perform require_admin_mfa(
    p_approved_by_auth_user_id,
    'privileged_action',
    p_request_id,
    p_metadata || jsonb_build_object(
      'action_key',
      'approve_admin_break_glass_request'
    )
  );

  v_policy := get_active_admin_break_glass_policy();
  v_approver := get_active_admin_user(p_approved_by_auth_user_id);

  select *
  into v_request
  from admin_break_glass_requests
  where id = p_break_glass_request_id
  for update;

  if v_request.id is null then
    raise exception 'admin break-glass request not found: %', p_break_glass_request_id;
  end if;
  if v_request.status <> 'pending' then
    raise exception 'break-glass request cannot be approved from status: %', v_request.status;
  end if;
  if v_request.expires_at <= now() then
    update admin_break_glass_requests
    set status = 'expired', updated_at = now()
    where id = v_request.id;
    raise exception 'break-glass request expired';
  end if;
  if v_policy.require_second_admin_approval is true
    and v_request.requested_by_auth_user_id = p_approved_by_auth_user_id then
    raise exception 'break-glass request requires approval by a second admin';
  end if;

  update admin_break_glass_requests
  set
    status = 'approved',
    approved_by_auth_user_id = p_approved_by_auth_user_id,
    approved_by_admin_user_id = v_approver.id,
    approved_at = now(),
    metadata = metadata || p_metadata || jsonb_build_object(
      'approval_reason',
      p_reason,
      'approval_request_id',
      p_request_id
    ),
    updated_at = now()
  where id = v_request.id;

  perform record_admin_action(
    p_approved_by_auth_user_id,
    'approve_admin_break_glass_request',
    'admin.write',
    'admin_break_glass_request',
    v_request.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_reason,
    p_metadata
  );

  perform create_admin_security_alert(
    'admin_break_glass_approved',
    'critical',
    p_approved_by_auth_user_id,
    v_request.target_auth_user_id,
    'approve_admin_break_glass_request',
    null,
    'Emergency break-glass admin access was approved.',
    p_metadata || jsonb_build_object(
      'request_id',
      p_request_id,
      'admin_break_glass_request_id',
      v_request.id,
      'reason',
      p_reason
    )
  );

  return v_request.id;
end;
$$;

create or replace function reject_admin_break_glass_request(
  p_rejected_by_auth_user_id uuid,
  p_break_glass_request_id uuid,
  p_rejection_reason text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request admin_break_glass_requests%rowtype;
  v_rejecter admin_users%rowtype;
begin
  if p_rejected_by_auth_user_id is null then
    raise exception 'rejected by auth user id is required';
  end if;
  if p_break_glass_request_id is null then
    raise exception 'break-glass request id is required';
  end if;
  if p_rejection_reason is null or length(trim(p_rejection_reason)) = 0 then
    raise exception 'rejection reason is required';
  end if;

  if admin_has_permission(p_rejected_by_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  v_rejecter := get_active_admin_user(p_rejected_by_auth_user_id);

  select *
  into v_request
  from admin_break_glass_requests
  where id = p_break_glass_request_id
  for update;

  if v_request.id is null then
    raise exception 'admin break-glass request not found: %', p_break_glass_request_id;
  end if;
  if v_request.status not in ('pending', 'approved') then
    raise exception 'break-glass request cannot be rejected from status: %', v_request.status;
  end if;

  update admin_break_glass_requests
  set
    status = 'rejected',
    rejected_by_auth_user_id = p_rejected_by_auth_user_id,
    rejected_by_admin_user_id = v_rejecter.id,
    rejected_at = now(),
    rejection_reason = p_rejection_reason,
    metadata = metadata || p_metadata || jsonb_build_object(
      'rejection_request_id',
      p_request_id
    ),
    updated_at = now()
  where id = v_request.id;

  perform record_admin_action(
    p_rejected_by_auth_user_id,
    'reject_admin_break_glass_request',
    'admin.write',
    'admin_break_glass_request',
    v_request.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_rejection_reason,
    p_metadata
  );

  perform create_admin_security_alert(
    'admin_break_glass_rejected',
    'high',
    p_rejected_by_auth_user_id,
    v_request.target_auth_user_id,
    'reject_admin_break_glass_request',
    null,
    'Emergency break-glass admin access was rejected.',
    p_metadata || jsonb_build_object(
      'request_id',
      p_request_id,
      'admin_break_glass_request_id',
      v_request.id,
      'reason',
      p_rejection_reason
    )
  );

  return v_request.id;
end;
$$;

create or replace function execute_admin_break_glass_request(
  p_executed_by_auth_user_id uuid,
  p_break_glass_request_id uuid,
  p_token_hash text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request admin_break_glass_requests%rowtype;
  v_executor admin_users%rowtype;
  v_assignment_id uuid;
begin
  if p_executed_by_auth_user_id is null then
    raise exception 'executed by auth user id is required';
  end if;
  if p_break_glass_request_id is null then
    raise exception 'break-glass request id is required';
  end if;
  if p_token_hash is null or length(trim(p_token_hash)) = 0 then
    raise exception 'break-glass token hash is required';
  end if;

  select *
  into v_request
  from admin_break_glass_requests
  where id = p_break_glass_request_id
  for update;

  if v_request.id is null then
    raise exception 'admin break-glass request not found: %', p_break_glass_request_id;
  end if;
  if v_request.status <> 'approved' then
    raise exception 'break-glass request cannot be executed from status: %', v_request.status;
  end if;
  if v_request.expires_at <= now() then
    update admin_break_glass_requests
    set status = 'expired', updated_at = now()
    where id = v_request.id;
    raise exception 'break-glass request expired';
  end if;
  if v_request.target_auth_user_id <> p_executed_by_auth_user_id then
    raise exception 'break-glass request can only be executed by target admin';
  end if;
  if v_request.token_hash <> p_token_hash then
    perform create_admin_security_alert(
      'admin_break_glass_invalid_token_attempt',
      'critical',
      p_executed_by_auth_user_id,
      v_request.target_auth_user_id,
      'execute_admin_break_glass_request',
      null,
      'Invalid break-glass token was used.',
      p_metadata || jsonb_build_object(
        'request_id',
        p_request_id,
        'admin_break_glass_request_id',
        v_request.id
      )
    );
    raise exception 'invalid break-glass token';
  end if;

  v_executor := get_active_admin_user(p_executed_by_auth_user_id);
  v_assignment_id := assign_admin_role(
    v_request.target_auth_user_id,
    'super_admin',
    v_executor.user_id,
    'break-glass temporary super_admin access'
  );

  update admin_break_glass_requests
  set
    status = 'executed',
    executed_by_auth_user_id = p_executed_by_auth_user_id,
    executed_by_admin_user_id = v_executor.id,
    executed_at = now(),
    granted_role_assignment_id = v_assignment_id,
    metadata = metadata || p_metadata || jsonb_build_object(
      'execution_request_id',
      p_request_id
    ),
    updated_at = now()
  where id = v_request.id;

  perform record_admin_action(
    p_executed_by_auth_user_id,
    'execute_admin_break_glass_request',
    'admin.write',
    'admin_break_glass_request',
    v_request.id,
    p_request_id,
    null,
    null,
    'allowed',
    'break-glass access executed',
    p_metadata || jsonb_build_object(
      'granted_role_assignment_id',
      v_assignment_id,
      'expires_at',
      v_request.expires_at
    )
  );

  perform create_admin_security_alert(
    'admin_break_glass_executed',
    'critical',
    p_executed_by_auth_user_id,
    v_request.target_auth_user_id,
    'execute_admin_break_glass_request',
    null,
    'Emergency break-glass admin access was executed.',
    p_metadata || jsonb_build_object(
      'request_id',
      p_request_id,
      'admin_break_glass_request_id',
      v_request.id,
      'granted_role_assignment_id',
      v_assignment_id,
      'expires_at',
      v_request.expires_at
    )
  );

  return v_request.id;
end;
$$;

create or replace function expire_admin_break_glass_requests(
  p_batch_size integer default 500,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_request record;
begin
  for v_request in
    select *
    from admin_break_glass_requests
    where status in ('pending', 'approved', 'executed')
      and expires_at <= now()
    order by expires_at asc
    limit p_batch_size
    for update skip locked
  loop
    if v_request.granted_role_assignment_id is not null then
      update admin_user_roles
      set
        status = 'revoked',
        assigned_reason = 'break-glass access expired',
        updated_at = now()
      where id = v_request.granted_role_assignment_id;
    end if;

    update admin_break_glass_requests
    set
      status =
        case
          when status = 'executed' then 'revoked'
          else 'expired'
        end,
      revoked_at =
        case
          when status = 'executed' then now()
          else revoked_at
        end,
      revoke_reason =
        case
          when status = 'executed' then 'break-glass access expired'
          else revoke_reason
        end,
      metadata = metadata || p_metadata || jsonb_build_object(
        'expire_run_id',
        v_run_id,
        'expired_at',
        now()
      ),
      updated_at = now()
    where id = v_request.id;

    perform revoke_all_admin_sessions_internal(
      v_request.target_auth_user_id,
      'break-glass access expired',
      'expire_admin_break_glass_requests',
      null,
      p_metadata || jsonb_build_object(
        'run_id',
        v_run_id,
        'admin_break_glass_request_id',
        v_request.id
      )
    );

    perform create_admin_security_alert(
      'admin_break_glass_expired',
      'critical',
      null,
      v_request.target_auth_user_id,
      'expire_admin_break_glass_requests',
      null,
      'Emergency break-glass admin access expired and was revoked.',
      p_metadata || jsonb_build_object(
        'run_id',
        v_run_id,
        'admin_break_glass_request_id',
        v_request.id
      )
    );
  end loop;

  return v_run_id;
end;
$$;

create or replace view admin_break_glass_dashboard as
select
  bgr.id as admin_break_glass_request_id,
  bgr.status,
  bgr.reason,
  bgr.requested_role_key,
  bgr.requested_by_auth_user_id,
  requester.email as requested_by_email,
  requester.display_name as requested_by_display_name,
  bgr.target_auth_user_id,
  target.email as target_email,
  target.display_name as target_display_name,
  bgr.approved_by_auth_user_id,
  approver.email as approved_by_email,
  bgr.approved_at,
  bgr.rejected_by_auth_user_id,
  rejecter.email as rejected_by_email,
  bgr.rejected_at,
  bgr.rejection_reason,
  bgr.executed_by_auth_user_id,
  executor.email as executed_by_email,
  bgr.executed_at,
  bgr.expires_at,
  bgr.revoked_at,
  bgr.revoke_reason,
  bgr.granted_role_assignment_id,
  bgr.created_at,
  bgr.updated_at,
  bgr.metadata
from admin_break_glass_requests bgr
left join admin_users requester
  on requester.id = bgr.requested_by_admin_user_id
left join admin_users target
  on target.id = bgr.target_admin_user_id
left join admin_users approver
  on approver.id = bgr.approved_by_admin_user_id
left join admin_users rejecter
  on rejecter.id = bgr.rejected_by_admin_user_id
left join admin_users executor
  on executor.id = bgr.executed_by_admin_user_id
order by bgr.created_at desc;

grant select on admin_break_glass_dashboard to admin_api_role;

create or replace view admin_break_glass_integrity as
select
  (
    select count(*)
    from admin_break_glass_requests
    where status in ('pending', 'approved')
      and expires_at > now()
  ) as open_break_glass_request_count,
  (
    select count(*)
    from admin_break_glass_requests
    where status = 'executed'
      and expires_at > now()
  ) as active_break_glass_access_count,
  (
    select count(*)
    from admin_break_glass_requests
    where created_at >= now() - interval '24 hours'
  ) as break_glass_request_count_24h,
  (
    select count(*)
    from admin_break_glass_requests
    where status in ('pending', 'approved', 'executed')
      and expires_at <= now()
  ) as expired_unprocessed_break_glass_count,
  now() as checked_at;

grant select on admin_break_glass_integrity to admin_api_role;

create or replace function hash_admin_break_glass_request(
  p_admin_break_glass_request_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request admin_break_glass_requests%rowtype;
  v_payload jsonb;
begin
  select *
  into v_request
  from admin_break_glass_requests
  where id = p_admin_break_glass_request_id;

  if v_request.id is null then
    raise exception 'admin break-glass request not found: %', p_admin_break_glass_request_id;
  end if;

  v_payload := jsonb_build_object(
    'source_type', 'admin_break_glass_request',
    'source_id', v_request.id,
    'requested_by_auth_user_id', v_request.requested_by_auth_user_id,
    'requested_by_admin_user_id', v_request.requested_by_admin_user_id,
    'target_auth_user_id', v_request.target_auth_user_id,
    'target_admin_user_id', v_request.target_admin_user_id,
    'status', v_request.status,
    'reason', v_request.reason,
    'requested_role_key', v_request.requested_role_key,
    'approved_by_auth_user_id', v_request.approved_by_auth_user_id,
    'approved_by_admin_user_id', v_request.approved_by_admin_user_id,
    'approved_at', v_request.approved_at,
    'rejected_by_auth_user_id', v_request.rejected_by_auth_user_id,
    'rejected_by_admin_user_id', v_request.rejected_by_admin_user_id,
    'rejected_at', v_request.rejected_at,
    'rejection_reason', v_request.rejection_reason,
    'executed_by_auth_user_id', v_request.executed_by_auth_user_id,
    'executed_by_admin_user_id', v_request.executed_by_admin_user_id,
    'executed_at', v_request.executed_at,
    'expires_at', v_request.expires_at,
    'revoked_at', v_request.revoked_at,
    'revoke_reason', v_request.revoke_reason,
    'granted_role_assignment_id', v_request.granted_role_assignment_id,
    'created_at', v_request.created_at,
    'updated_at', v_request.updated_at
  );

  return append_audit_hash_chain_entry(
    'admin_break_glass_request',
    v_request.id,
    v_payload,
    'global_audit_chain',
    p_metadata
  );
end;
$$;

create or replace view audit_hash_missing_records as
select
  'wallet_ledger_entry'::text as source_type,
  wle.id as source_id,
  wle.created_at
from wallet_ledger_entries wle
where not exists (
  select 1
  from audit_hash_chain_entries ahc
  where ahc.source_type = 'wallet_ledger_entry'
    and ahc.source_id = wle.id
)
union all
select
  'accounting_journal_entry'::text as source_type,
  aje.id as source_id,
  aje.created_at
from accounting_journal_entries aje
where not exists (
  select 1
  from audit_hash_chain_entries ahc
  where ahc.source_type = 'accounting_journal_entry'
    and ahc.source_id = aje.id
)
union all
select
  'reward_issuance_group'::text as source_type,
  rig.id as source_id,
  rig.created_at
from reward_issuance_groups rig
where rig.status = 'completed'
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'reward_issuance_group'
      and ahc.source_id = rig.id
  )
union all
select
  'attention_verification_event'::text as source_type,
  ave.id as source_id,
  ave.created_at
from attention_verification_events ave
where not exists (
  select 1
  from audit_hash_chain_entries ahc
  where ahc.source_type = 'attention_verification_event'
    and ahc.source_id = ave.id
)
union all
select
  'withdrawal_request'::text as source_type,
  wr.id as source_id,
  wr.created_at
from withdrawal_requests wr
where wr.status in ('reserved', 'submitted', 'processing', 'paid', 'failed', 'cancelled')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'withdrawal_request'
      and ahc.source_id = wr.id
  )
union all
select
  'external_payout'::text as source_type,
  ep.id as source_id,
  ep.created_at
from external_payouts ep
where not exists (
  select 1
  from audit_hash_chain_entries ahc
  where ahc.source_type = 'external_payout'
    and ahc.source_id = ep.id
)
union all
select
  'admin_action_audit_log'::text as source_type,
  aal.id as source_id,
  aal.created_at
from admin_action_audit_log aal
where not exists (
  select 1
  from audit_hash_chain_entries ahc
  where ahc.source_type = 'admin_action_audit_log'
    and ahc.source_id = aal.id
)
union all
select
  'admin_privileged_action_request'::text as source_type,
  apar.id as source_id,
  apar.created_at
from admin_privileged_action_requests apar
where apar.status in ('approved', 'rejected', 'expired', 'executed', 'cancelled')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_privileged_action_request'
      and ahc.source_id = apar.id
  )
union all
select
  'admin_security_alert_event'::text as source_type,
  asae.id as source_id,
  asae.created_at
from admin_security_alert_events asae
where not exists (
  select 1
  from audit_hash_chain_entries ahc
  where ahc.source_type = 'admin_security_alert_event'
    and ahc.source_id = asae.id
)
union all
select
  'admin_break_glass_request'::text as source_type,
  bgr.id as source_id,
  bgr.created_at
from admin_break_glass_requests bgr
where bgr.status in ('rejected', 'executed', 'expired', 'revoked')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_break_glass_request'
      and ahc.source_id = bgr.id
  );

create or replace function run_audit_hash_backfill_job(
  p_batch_size integer default 1000,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid;
  v_row record;
  v_scanned integer := 0;
  v_hashed integer := 0;
  v_failed integer := 0;
begin
  if p_batch_size <= 0 then
    raise exception 'batch size must be positive';
  end if;

  insert into audit_hash_backfill_runs (
    status,
    metadata
  )
  values (
    'processing',
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_run_id;

  for v_row in
    select *
    from audit_hash_missing_records
    order by created_at asc
    limit p_batch_size
  loop
    v_scanned := v_scanned + 1;

    begin
      if v_row.source_type = 'wallet_ledger_entry' then
        perform hash_wallet_ledger_entry(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      elsif v_row.source_type = 'accounting_journal_entry' then
        perform hash_accounting_journal_entry(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      elsif v_row.source_type = 'reward_issuance_group' then
        perform hash_reward_issuance_group(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      elsif v_row.source_type = 'attention_verification_event' then
        perform hash_attention_verification_event(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      elsif v_row.source_type = 'withdrawal_request' then
        perform hash_withdrawal_request(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      elsif v_row.source_type = 'external_payout' then
        perform hash_external_payout(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      elsif v_row.source_type = 'admin_action_audit_log' then
        perform hash_admin_action_audit_log(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      elsif v_row.source_type = 'admin_privileged_action_request' then
        perform hash_admin_privileged_action_request(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      elsif v_row.source_type = 'admin_security_alert_event' then
        perform hash_admin_security_alert_event(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      elsif v_row.source_type = 'admin_break_glass_request' then
        perform hash_admin_break_glass_request(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      end if;

      v_hashed := v_hashed + 1;
    exception
      when others then
        v_failed := v_failed + 1;
    end;
  end loop;

  update audit_hash_backfill_runs
  set
    status = 'completed',
    completed_at = now(),
    scanned_count = v_scanned,
    hashed_count = v_hashed,
    failed_count = v_failed
  where id = v_run_id;

  return v_run_id;
exception
  when others then
    if v_run_id is not null then
      update audit_hash_backfill_runs
      set
        status = 'failed',
        failed_at = now(),
        failure_reason = sqlerrm
      where id = v_run_id;
    end if;
    raise;
end;
$$;

insert into scheduled_jobs (
  job_key,
  job_name,
  job_group,
  enabled,
  schedule_cron,
  function_name,
  function_args,
  max_runtime_seconds,
  lock_ttl_seconds,
  metadata
)
values (
  'admin_break_glass_expire_every_minute',
  'Expire admin break-glass access',
  'admin',
  true,
  '* * * * *',
  'expire_admin_break_glass_requests',
  '{"batch_size": 500}'::jsonb,
  180,
  300,
  '{"priority": "critical"}'::jsonb
)
on conflict (job_key)
do update set
  enabled = excluded.enabled,
  schedule_cron = excluded.schedule_cron,
  function_name = excluded.function_name,
  function_args = excluded.function_args,
  max_runtime_seconds = excluded.max_runtime_seconds,
  lock_ttl_seconds = excluded.lock_ttl_seconds,
  metadata = scheduled_jobs.metadata || excluded.metadata,
  updated_at = now();

create or replace function run_scheduled_job(
  p_job_key text,
  p_locked_by text default 'scheduler',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_job scheduled_jobs%rowtype;
  v_run_id uuid;
  v_lock_acquired boolean;
  v_started_at timestamptz;
  v_uuid_result uuid;
  v_result jsonb := '{}'::jsonb;
begin
  if p_job_key is null or length(trim(p_job_key)) = 0 then
    raise exception 'job key is required';
  end if;

  select *
  into v_job
  from scheduled_jobs
  where job_key = p_job_key;

  if v_job.id is null then
    raise exception 'scheduled job not found: %', p_job_key;
  end if;

  if v_job.enabled is false then
    insert into scheduled_job_runs (scheduled_job_id, job_key, job_group, status, metadata)
    values (v_job.id, v_job.job_key, v_job.job_group, 'disabled', p_metadata)
    returning id into v_run_id;

    update scheduled_jobs
    set
      last_status = 'disabled',
      last_run_id = v_run_id,
      updated_at = now()
    where id = v_job.id;

    return v_run_id;
  end if;

  v_lock_acquired := acquire_scheduled_job_lock(
    v_job.job_key,
    p_locked_by,
    v_job.lock_ttl_seconds,
    p_metadata
  );

  if v_lock_acquired is false then
    insert into scheduled_job_runs (scheduled_job_id, job_key, job_group, status, metadata)
    values (v_job.id, v_job.job_key, v_job.job_group, 'skipped_locked', p_metadata)
    returning id into v_run_id;

    update scheduled_jobs
    set
      last_status = 'skipped_locked',
      last_run_id = v_run_id,
      updated_at = now()
    where id = v_job.id;

    return v_run_id;
  end if;

  v_started_at := now();

  insert into scheduled_job_runs (
    scheduled_job_id,
    job_key,
    job_group,
    status,
    started_at,
    metadata
  )
  values (
    v_job.id,
    v_job.job_key,
    v_job.job_group,
    'started',
    v_started_at,
    p_metadata
  )
  returning id into v_run_id;

  update scheduled_jobs
  set
    last_started_at = v_started_at,
    last_status = 'started',
    last_run_id = v_run_id,
    updated_at = now()
  where id = v_job.id;

  if v_job.function_name = 'run_reward_issuance_job' then
    v_uuid_result := run_reward_issuance_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'release_mature_reward_lots' then
    v_uuid_result := release_mature_reward_lots(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'run_accounting_mirror_job' then
    v_uuid_result := run_accounting_mirror_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'run_withdrawal_reserve_job' then
    v_uuid_result := run_withdrawal_reserve_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 100),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'run_audit_hash_backfill_job' then
    v_uuid_result := run_audit_hash_backfill_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'verify_audit_hash_chain' then
    v_uuid_result := verify_audit_hash_chain(
      coalesce(v_job.function_args->>'chain_key', 'global_audit_chain'),
      coalesce((v_job.function_args->>'batch_size')::integer, 100000),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'run_observability_snapshot_job' then
    v_uuid_result := run_observability_snapshot_job(
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'run_payout_provider_event_processing_job' then
    v_uuid_result := run_payout_provider_event_processing_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'expire_admin_sessions' then
    v_uuid_result := expire_admin_sessions(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'expire_admin_break_glass_requests' then
    v_uuid_result := expire_admin_break_glass_requests(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  else
    raise exception 'scheduled function not allowlisted: %', v_job.function_name;
  end if;

  update scheduled_job_runs
  set
    status = 'completed',
    completed_at = now(),
    runtime_ms = (extract(epoch from (now() - v_started_at)) * 1000)::integer,
    result = v_result
  where id = v_run_id;

  update scheduled_jobs
  set
    last_completed_at = now(),
    last_status = 'completed',
    last_run_id = v_run_id,
    updated_at = now()
  where id = v_job.id;

  perform release_scheduled_job_lock(v_job.job_key);
  return v_run_id;
exception
  when others then
    if v_run_id is not null then
      update scheduled_job_runs
      set
        status = 'failed',
        failed_at = now(),
        runtime_ms =
          case
            when v_started_at is not null then (extract(epoch from (now() - v_started_at)) * 1000)::integer
            else null
          end,
        error_message = sqlerrm
      where id = v_run_id;
    end if;

    update scheduled_jobs
    set
      last_failed_at = now(),
      last_status = 'failed',
      last_run_id = v_run_id,
      updated_at = now()
    where job_key = p_job_key;

    perform release_scheduled_job_lock(p_job_key);
    raise;
end;
$$;

alter table admin_break_glass_policies enable row level security;
alter table admin_break_glass_requests enable row level security;

drop policy if exists admin_break_glass_policies_no_user_direct_access
on admin_break_glass_policies;
create policy admin_break_glass_policies_no_user_direct_access
on admin_break_glass_policies
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_break_glass_requests_no_user_direct_access
on admin_break_glass_requests;
create policy admin_break_glass_requests_no_user_direct_access
on admin_break_glass_requests
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_api_read_admin_break_glass_policies
on admin_break_glass_policies;
create policy admin_api_read_admin_break_glass_policies
on admin_break_glass_policies
for select
to admin_api_role
using (true);

drop policy if exists admin_api_all_admin_break_glass_requests
on admin_break_glass_requests;
create policy admin_api_all_admin_break_glass_requests
on admin_break_glass_requests
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists worker_read_admin_break_glass_policies
on admin_break_glass_policies;
create policy worker_read_admin_break_glass_policies
on admin_break_glass_policies
for select
to worker_role
using (true);

drop policy if exists worker_all_admin_break_glass_requests
on admin_break_glass_requests;
create policy worker_all_admin_break_glass_requests
on admin_break_glass_requests
for all
to worker_role
using (true)
with check (true);

grant execute on function get_active_admin_break_glass_policy()
to admin_api_role, worker_role;

grant execute on function request_admin_break_glass_access(
  uuid,
  uuid,
  text,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function approve_admin_break_glass_request(
  uuid,
  uuid,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function reject_admin_break_glass_request(
  uuid,
  uuid,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function execute_admin_break_glass_request(
  uuid,
  uuid,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function expire_admin_break_glass_requests(integer, jsonb)
to worker_role;

grant execute on function hash_admin_break_glass_request(uuid, jsonb)
to worker_role, admin_api_role;

alter function get_active_admin_break_glass_policy() security definer;
alter function get_active_admin_break_glass_policy() set search_path = public;

alter function request_admin_break_glass_access(uuid, uuid, text, text, text, jsonb) security definer;
alter function request_admin_break_glass_access(uuid, uuid, text, text, text, jsonb) set search_path = public;

alter function approve_admin_break_glass_request(uuid, uuid, text, text, jsonb) security definer;
alter function approve_admin_break_glass_request(uuid, uuid, text, text, jsonb) set search_path = public;

alter function reject_admin_break_glass_request(uuid, uuid, text, text, jsonb) security definer;
alter function reject_admin_break_glass_request(uuid, uuid, text, text, jsonb) set search_path = public;

alter function execute_admin_break_glass_request(uuid, uuid, text, text, jsonb) security definer;
alter function execute_admin_break_glass_request(uuid, uuid, text, text, jsonb) set search_path = public;

alter function expire_admin_break_glass_requests(integer, jsonb) security definer;
alter function expire_admin_break_glass_requests(integer, jsonb) set search_path = public;

alter function hash_admin_break_glass_request(uuid, jsonb) security definer;
alter function hash_admin_break_glass_request(uuid, jsonb) set search_path = public;

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
    'ADMIN_BREAK_GLASS_POLICY_MISSING',
    'system',
    'critical',
    500,
    false,
    false,
    'Break-glass policy unavailable.',
    'No active admin break-glass policy found.',
    'platform'
  ),
  (
    'ADMIN_BREAK_GLASS_INVALID_STATE',
    'validation',
    'high',
    409,
    false,
    true,
    'Break-glass request cannot be updated from its current state.',
    'Invalid break-glass lifecycle transition.',
    'platform'
  ),
  (
    'ADMIN_BREAK_GLASS_TOKEN_INVALID',
    'permission',
    'critical',
    403,
    false,
    true,
    'Invalid break-glass token.',
    'Invalid admin break-glass token.',
    'platform'
  ),
  (
    'ADMIN_BREAK_GLASS_SECOND_APPROVER_REQUIRED',
    'permission',
    'critical',
    409,
    false,
    true,
    'Break-glass request requires approval by a second admin.',
    'Break-glass second-admin approval requirement failed.',
    'platform'
  ),
  (
    'ADMIN_BREAK_GLASS_ACTIVE_REQUEST_EXISTS',
    'validation',
    'high',
    409,
    false,
    true,
    'An active break-glass request already exists for this admin.',
    'Active break-glass request already exists.',
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
  ('no active admin break-glass policy found', 'ADMIN_BREAK_GLASS_POLICY_MISSING', 5, '{}'),
  ('break-glass request cannot be approved from status', 'ADMIN_BREAK_GLASS_INVALID_STATE', 5, '{}'),
  ('break-glass request cannot be rejected from status', 'ADMIN_BREAK_GLASS_INVALID_STATE', 5, '{}'),
  ('break-glass request cannot be executed from status', 'ADMIN_BREAK_GLASS_INVALID_STATE', 5, '{}'),
  ('invalid break-glass token', 'ADMIN_BREAK_GLASS_TOKEN_INVALID', 5, '{}'),
  ('break-glass request requires approval by a second admin', 'ADMIN_BREAK_GLASS_SECOND_APPROVER_REQUIRED', 5, '{}'),
  ('active break-glass request already exists', 'ADMIN_BREAK_GLASS_ACTIVE_REQUEST_EXISTS', 5, '{}')
on conflict do nothing;
