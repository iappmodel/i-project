-- Step 5.11 — Policy-gated admin permissions.
-- Introduces admin identity/role gates, request+approval workflow, and
-- permission-gated wrappers for sensitive admin operations.

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),

  user_id uuid,
  email text not null unique,

  display_name text,

  status text not null default 'active',

  mfa_required boolean not null default true,
  mfa_verified_at timestamptz,

  last_login_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_users_status_check
  check (
    status in (
      'active',
      'suspended',
      'revoked',
      'archived'
    )
  )
);

create index if not exists admin_users_status_idx
on admin_users (status, created_at desc);

create table if not exists admin_roles (
  id uuid primary key default gen_random_uuid(),

  role_key text not null unique,
  role_name text not null,

  description text,

  status text not null default 'active',

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint admin_roles_status_check
  check (
    status in (
      'active',
      'deprecated',
      'disabled'
    )
  )
);

insert into admin_roles (
  role_key,
  role_name,
  description
)
values
  (
    'support_agent',
    'Support Agent',
    'Can inspect basic user/wallet/account state and create support tickets.'
  ),
  (
    'trust_analyst',
    'Trust Analyst',
    'Can inspect trust, attention, graph, and fraud data. Can request locks and overrides.'
  ),
  (
    'fraud_operator',
    'Fraud Operator',
    'Can apply fraud locks, clawbacks, legal holds, and risk actions within limits.'
  ),
  (
    'finance_operator',
    'Finance Operator',
    'Can inspect and reconcile wallet/campaign/payout accounting.'
  ),
  (
    'admin_manager',
    'Admin Manager',
    'Can approve high-risk admin actions and manage operational cases.'
  ),
  (
    'super_admin',
    'Super Admin',
    'Full emergency administrative control. Should be extremely limited.'
  )
on conflict (role_key)
do update set
  role_name = excluded.role_name,
  description = excluded.description;

create table if not exists admin_user_roles (
  id uuid primary key default gen_random_uuid(),

  admin_user_id uuid not null references admin_users(id),
  role_id uuid not null references admin_roles(id),

  status text not null default 'active',

  assigned_by_admin_id uuid references admin_users(id),

  assigned_at timestamptz not null default now(),
  revoked_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  unique (admin_user_id, role_id),

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

create table if not exists admin_permissions (
  id uuid primary key default gen_random_uuid(),

  permission_key text not null unique,

  permission_name text not null,
  permission_group text not null,

  risk_level text not null default 'low',

  requires_mfa boolean not null default true,
  requires_case_id boolean not null default false,
  requires_approval boolean not null default false,
  requires_two_person_rule boolean not null default false,

  description text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint admin_permissions_risk_level_check
  check (
    risk_level in (
      'low',
      'medium',
      'high',
      'critical'
    )
  )
);

create index if not exists admin_permissions_group_idx
on admin_permissions (permission_group, risk_level);

insert into admin_permissions (
  permission_key,
  permission_name,
  permission_group,
  risk_level,
  requires_mfa,
  requires_case_id,
  requires_approval,
  requires_two_person_rule,
  description
)
values
  ('wallet.read', 'Read wallet details', 'wallet', 'low', true, false, false, false, 'Read wallet balances, ledger, and wallet state.'),
  ('wallet.admin_credit', 'Admin credit wallet', 'wallet', 'high', true, true, true, true, 'Create manual wallet credit.'),
  ('wallet.admin_debit', 'Admin debit wallet', 'wallet', 'high', true, true, true, true, 'Create manual wallet debit.'),
  ('wallet.fraud_lock', 'Set wallet fraud lock', 'fraud', 'high', true, true, true, false, 'Apply soft/hard/permanent fraud lock.'),
  ('wallet.clear_fraud_lock', 'Clear wallet fraud lock', 'fraud', 'high', true, true, true, true, 'Clear wallet fraud lock.'),
  ('campaign.clawback_reward', 'Campaign reward clawback', 'campaign', 'critical', true, true, true, true, 'Claw back campaign-backed reward value.'),
  ('trust.read', 'Read trust score details', 'trust', 'medium', true, false, false, false, 'Read trust score, trust signals, graph risk, and overrides.'),
  ('trust.override', 'Apply trust score override', 'trust', 'critical', true, true, true, true, 'Override computed trust/risk score.'),
  ('trust.clear_override', 'Clear trust score override', 'trust', 'high', true, true, true, true, 'Clear active trust override.'),
  ('evidence.read', 'Read attention evidence metadata', 'evidence', 'high', true, true, true, false, 'Read evidence artifact metadata and legal holds.'),
  ('evidence.export', 'Export attention evidence', 'evidence', 'critical', true, true, true, true, 'Export forensic/legal evidence bundles.'),
  ('evidence.legal_hold', 'Place/release legal hold', 'evidence', 'critical', true, true, true, true, 'Place or release evidence legal hold.'),
  ('model.revoke', 'Revoke attention model version', 'model', 'critical', true, true, true, true, 'Revoke attention model version.'),
  ('trust.backfill', 'Run trust backfill', 'trust', 'critical', true, true, true, true, 'Run trust score backfill, optionally with policy sync.'),
  ('reconciliation.resolve', 'Resolve reconciliation issue', 'finance', 'high', true, true, true, true, 'Resolve accounting reconciliation issue.')
on conflict (permission_key)
do update set
  permission_name = excluded.permission_name,
  permission_group = excluded.permission_group,
  risk_level = excluded.risk_level,
  requires_mfa = excluded.requires_mfa,
  requires_case_id = excluded.requires_case_id,
  requires_approval = excluded.requires_approval,
  requires_two_person_rule = excluded.requires_two_person_rule,
  description = excluded.description;

create table if not exists admin_role_permissions (
  id uuid primary key default gen_random_uuid(),

  role_id uuid not null references admin_roles(id),
  permission_id uuid not null references admin_permissions(id),

  status text not null default 'active',

  granted_by_admin_id uuid references admin_users(id),

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  unique (role_id, permission_id),

  constraint admin_role_permissions_status_check
  check (
    status in (
      'active',
      'revoked'
    )
  )
);

insert into admin_role_permissions (role_id, permission_id)
select r.id, p.id
from admin_roles r
join admin_permissions p
  on (
    (r.role_key = 'support_agent' and p.permission_key in ('wallet.read'))
    or
    (r.role_key = 'trust_analyst' and p.permission_key in ('wallet.read', 'trust.read', 'evidence.read'))
    or
    (r.role_key = 'fraud_operator' and p.permission_key in ('wallet.read', 'trust.read', 'wallet.fraud_lock', 'campaign.clawback_reward', 'evidence.read', 'evidence.legal_hold'))
    or
    (r.role_key = 'finance_operator' and p.permission_key in ('wallet.read', 'reconciliation.resolve'))
    or
    (r.role_key = 'admin_manager' and p.permission_key in (
      'wallet.read',
      'trust.read',
      'wallet.fraud_lock',
      'wallet.clear_fraud_lock',
      'wallet.admin_credit',
      'wallet.admin_debit',
      'trust.override',
      'trust.clear_override',
      'evidence.read',
      'evidence.export',
      'evidence.legal_hold',
      'trust.backfill',
      'reconciliation.resolve'
    ))
    or
    (r.role_key = 'super_admin')
  )
on conflict (role_id, permission_id)
do update set
  status = 'active';

create table if not exists admin_action_requests (
  id uuid primary key default gen_random_uuid(),

  permission_key text not null references admin_permissions(permission_key),

  requested_by_admin_id uuid not null references admin_users(id),
  approved_by_admin_id uuid references admin_users(id),
  executed_by_admin_id uuid references admin_users(id),

  target_type text not null,
  target_id uuid,

  user_id uuid,
  wallet_id uuid references wallets(id),
  campaign_id uuid,

  admin_case_id uuid,
  reason text not null,

  status text not null default 'requested',

  request_payload jsonb not null default '{}'::jsonb,
  approval_metadata jsonb not null default '{}'::jsonb,
  execution_metadata jsonb not null default '{}'::jsonb,

  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  rejected_at timestamptz,
  executed_at timestamptz,
  cancelled_at timestamptz,

  rejection_reason text,
  cancellation_reason text,

  constraint admin_action_requests_status_check
  check (
    status in (
      'requested',
      'approved',
      'rejected',
      'executed',
      'cancelled',
      'expired'
    )
  )
);

create index if not exists admin_action_requests_status_idx
on admin_action_requests (status, requested_at desc);

create index if not exists admin_action_requests_permission_idx
on admin_action_requests (permission_key, status, requested_at desc);

create index if not exists admin_action_requests_wallet_idx
on admin_action_requests (wallet_id, requested_at desc);

create index if not exists admin_action_requests_case_idx
on admin_action_requests (admin_case_id);

create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),

  admin_user_id uuid references admin_users(id),

  permission_key text,
  action text not null,

  decision text not null,

  target_type text,
  target_id uuid,

  user_id uuid,
  wallet_id uuid references wallets(id),
  campaign_id uuid,

  admin_case_id uuid,
  admin_action_request_id uuid references admin_action_requests(id),

  reason text,

  ip_address text,
  user_agent text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint admin_audit_log_decision_check
  check (
    decision in (
      'allowed',
      'denied',
      'requested',
      'approved',
      'rejected',
      'executed',
      'failed'
    )
  )
);

create index if not exists admin_audit_log_admin_idx
on admin_audit_log (admin_user_id, created_at desc);

create index if not exists admin_audit_log_permission_idx
on admin_audit_log (permission_key, created_at desc);

create index if not exists admin_audit_log_wallet_idx
on admin_audit_log (wallet_id, created_at desc);

create index if not exists admin_audit_log_request_idx
on admin_audit_log (admin_action_request_id);

create or replace function admin_has_permission(
  p_admin_user_id uuid,
  p_permission_key text
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from admin_users au
    join admin_user_roles aur
      on aur.admin_user_id = au.id
     and aur.status = 'active'
    join admin_roles ar
      on ar.id = aur.role_id
     and ar.status = 'active'
    join admin_role_permissions arp
      on arp.role_id = ar.id
     and arp.status = 'active'
    join admin_permissions ap
      on ap.id = arp.permission_id
    where au.id = p_admin_user_id
      and au.status = 'active'
      and ap.permission_key = p_permission_key
  );
$$;

create or replace function assert_admin_permission(
  p_admin_user_id uuid,
  p_permission_key text,
  p_admin_case_id uuid default null,
  p_admin_action_request_id uuid default null,
  p_target_type text default null,
  p_target_id uuid default null,
  p_wallet_id uuid default null,
  p_user_id uuid default null,
  p_campaign_id uuid default null,
  p_reason text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_permission admin_permissions%rowtype;
  v_request admin_action_requests%rowtype;
  v_has_permission boolean;

  v_fail_reason text;
  v_action text := 'permission_check';
begin
  if p_admin_user_id is null then
    raise exception 'admin user id is required';
  end if;

  if p_permission_key is null or length(trim(p_permission_key)) = 0 then
    raise exception 'permission key is required';
  end if;

  select *
  into v_admin
  from admin_users
  where id = p_admin_user_id;

  if v_admin.id is null then
    raise exception 'admin user not found: %', p_admin_user_id;
  end if;

  select *
  into v_permission
  from admin_permissions
  where permission_key = p_permission_key;

  if v_permission.id is null then
    raise exception 'unknown permission: %', p_permission_key;
  end if;

  if v_admin.status <> 'active' then
    v_fail_reason := 'admin_not_active';
    goto denied;
  end if;

  v_has_permission := admin_has_permission(
    p_admin_user_id,
    p_permission_key
  );

  if v_has_permission is false then
    v_fail_reason := 'missing_permission';
    goto denied;
  end if;

  if v_permission.requires_mfa is true and v_admin.mfa_verified_at is null then
    v_fail_reason := 'mfa_required';
    goto denied;
  end if;

  if v_permission.requires_case_id is true and p_admin_case_id is null then
    v_fail_reason := 'case_required';
    goto denied;
  end if;

  if v_permission.requires_approval is true then
    if p_admin_action_request_id is null then
      v_fail_reason := 'approved_request_required';
      goto denied;
    end if;

    select *
    into v_request
    from admin_action_requests
    where id = p_admin_action_request_id;

    if v_request.id is null then
      v_fail_reason := 'request_not_found';
      goto denied;
    end if;

    if v_request.permission_key <> p_permission_key then
      v_fail_reason := 'request_permission_mismatch';
      goto denied;
    end if;

    if v_request.status <> 'approved' then
      v_fail_reason := 'request_not_approved';
      goto denied;
    end if;

    if v_permission.requires_two_person_rule is true
      and v_request.approved_by_admin_id = p_admin_user_id then
      v_fail_reason := 'two_person_rule_violation';
      goto denied;
    end if;
  end if;

  insert into admin_audit_log (
    admin_user_id,
    permission_key,
    action,
    decision,
    target_type,
    target_id,
    wallet_id,
    user_id,
    campaign_id,
    admin_case_id,
    admin_action_request_id,
    reason,
    metadata
  )
  values (
    p_admin_user_id,
    p_permission_key,
    v_action,
    'allowed',
    p_target_type,
    p_target_id,
    p_wallet_id,
    p_user_id,
    p_campaign_id,
    p_admin_case_id,
    p_admin_action_request_id,
    p_reason,
    p_metadata
  );

  return;

  <<denied>>
  insert into admin_audit_log (
    admin_user_id,
    permission_key,
    action,
    decision,
    target_type,
    target_id,
    wallet_id,
    user_id,
    campaign_id,
    admin_case_id,
    admin_action_request_id,
    reason,
    metadata
  )
  values (
    p_admin_user_id,
    p_permission_key,
    v_action,
    'denied',
    p_target_type,
    p_target_id,
    p_wallet_id,
    p_user_id,
    p_campaign_id,
    p_admin_case_id,
    p_admin_action_request_id,
    v_fail_reason,
    p_metadata
  );

  raise exception 'admin permission denied: %, reason: %', p_permission_key, v_fail_reason;
end;
$$;

create or replace function request_admin_action(
  p_admin_user_id uuid,
  p_permission_key text,
  p_target_type text,
  p_target_id uuid,
  p_reason text,
  p_admin_case_id uuid default null,
  p_wallet_id uuid default null,
  p_user_id uuid default null,
  p_campaign_id uuid default null,
  p_request_payload jsonb default '{}'::jsonb,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_permission admin_permissions%rowtype;
  v_request_id uuid;
begin
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'reason is required';
  end if;

  select *
  into v_permission
  from admin_permissions
  where permission_key = p_permission_key;

  if v_permission.id is null then
    raise exception 'unknown permission: %', p_permission_key;
  end if;

  if admin_has_permission(p_admin_user_id, p_permission_key) is false then
    raise exception 'admin missing permission: %', p_permission_key;
  end if;

  if v_permission.requires_case_id is true and p_admin_case_id is null then
    raise exception 'admin case id required for permission: %', p_permission_key;
  end if;

  insert into admin_action_requests (
    permission_key,
    requested_by_admin_id,
    target_type,
    target_id,
    user_id,
    wallet_id,
    campaign_id,
    admin_case_id,
    reason,
    request_payload,
    status
  )
  values (
    p_permission_key,
    p_admin_user_id,
    p_target_type,
    p_target_id,
    p_user_id,
    p_wallet_id,
    p_campaign_id,
    p_admin_case_id,
    p_reason,
    p_request_payload,
    'requested'
  )
  returning id into v_request_id;

  insert into admin_audit_log (
    admin_user_id,
    permission_key,
    action,
    decision,
    target_type,
    target_id,
    wallet_id,
    user_id,
    campaign_id,
    admin_case_id,
    admin_action_request_id,
    reason,
    metadata
  )
  values (
    p_admin_user_id,
    p_permission_key,
    'request_admin_action',
    'requested',
    p_target_type,
    p_target_id,
    p_wallet_id,
    p_user_id,
    p_campaign_id,
    p_admin_case_id,
    v_request_id,
    p_reason,
    p_metadata
  );

  return v_request_id;
end;
$$;

create or replace function approve_admin_action(
  p_admin_action_request_id uuid,
  p_approving_admin_id uuid,
  p_reason text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request admin_action_requests%rowtype;
begin
  if p_admin_action_request_id is null then
    raise exception 'admin action request id is required';
  end if;

  if p_approving_admin_id is null then
    raise exception 'approving admin id is required';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'approval reason is required';
  end if;

  select *
  into v_request
  from admin_action_requests
  where id = p_admin_action_request_id
  for update;

  if v_request.id is null then
    raise exception 'admin action request not found: %', p_admin_action_request_id;
  end if;

  if v_request.status <> 'requested' then
    raise exception 'admin action request not requestable. status %', v_request.status;
  end if;

  if v_request.requested_by_admin_id = p_approving_admin_id then
    raise exception 'two-person rule: requester cannot approve own request';
  end if;

  perform assert_admin_permission(
    p_approving_admin_id,
    v_request.permission_key,
    v_request.admin_case_id,
    null,
    v_request.target_type,
    v_request.target_id,
    v_request.wallet_id,
    v_request.user_id,
    v_request.campaign_id,
    p_reason,
    p_metadata || jsonb_build_object(
      'approval_for_request_id',
      v_request.id
    )
  );

  update admin_action_requests
  set
    status = 'approved',
    approved_by_admin_id = p_approving_admin_id,
    approved_at = now(),
    approval_metadata = approval_metadata || p_metadata || jsonb_build_object(
      'approval_reason',
      p_reason
    )
  where id = v_request.id;

  insert into admin_audit_log (
    admin_user_id,
    permission_key,
    action,
    decision,
    target_type,
    target_id,
    wallet_id,
    user_id,
    campaign_id,
    admin_case_id,
    admin_action_request_id,
    reason,
    metadata
  )
  values (
    p_approving_admin_id,
    v_request.permission_key,
    'approve_admin_action',
    'approved',
    v_request.target_type,
    v_request.target_id,
    v_request.wallet_id,
    v_request.user_id,
    v_request.campaign_id,
    v_request.admin_case_id,
    v_request.id,
    p_reason,
    p_metadata
  );

  return v_request.id;
end;
$$;

create or replace function mark_admin_action_executed(
  p_admin_action_request_id uuid,
  p_executed_by_admin_id uuid,
  p_execution_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request admin_action_requests%rowtype;
begin
  update admin_action_requests
  set
    status = 'executed',
    executed_by_admin_id = p_executed_by_admin_id,
    executed_at = now(),
    execution_metadata = execution_metadata || p_execution_metadata
  where id = p_admin_action_request_id
    and status = 'approved'
  returning * into v_request;

  if v_request.id is null then
    raise exception 'approved admin action request not found: %', p_admin_action_request_id;
  end if;

  insert into admin_audit_log (
    admin_user_id,
    permission_key,
    action,
    decision,
    target_type,
    target_id,
    wallet_id,
    user_id,
    campaign_id,
    admin_case_id,
    admin_action_request_id,
    reason,
    metadata
  )
  values (
    p_executed_by_admin_id,
    v_request.permission_key,
    'mark_admin_action_executed',
    'executed',
    v_request.target_type,
    v_request.target_id,
    v_request.wallet_id,
    v_request.user_id,
    v_request.campaign_id,
    v_request.admin_case_id,
    v_request.id,
    null,
    p_execution_metadata
  );

  return p_admin_action_request_id;
end;
$$;

create or replace function gated_admin_credit_wallet_balance(
  p_admin_user_id uuid,
  p_admin_action_request_id uuid,
  p_wallet_id uuid,
  p_user_id uuid,
  p_amount_minor bigint,
  p_currency_code text,
  p_adjustment_type text,
  p_reason text,
  p_admin_case_id uuid,
  p_idempotency_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_adjustment_group_id uuid;
begin
  perform assert_admin_permission(
    p_admin_user_id,
    'wallet.admin_credit',
    p_admin_case_id,
    p_admin_action_request_id,
    'wallet',
    p_wallet_id,
    p_wallet_id,
    p_user_id,
    null,
    p_reason,
    p_metadata
  );

  v_adjustment_group_id := admin_credit_wallet_balance(
    p_wallet_id,
    p_user_id,
    p_amount_minor,
    p_currency_code,
    p_adjustment_type,
    p_reason,
    p_admin_user_id,
    p_admin_case_id,
    p_idempotency_key,
    p_metadata || jsonb_build_object(
      'admin_action_request_id',
      p_admin_action_request_id
    )
  );

  perform mark_admin_action_executed(
    p_admin_action_request_id,
    p_admin_user_id,
    jsonb_build_object('admin_adjustment_group_id', v_adjustment_group_id)
  );

  return v_adjustment_group_id;
end;
$$;

create or replace function gated_admin_debit_wallet_balance(
  p_admin_user_id uuid,
  p_admin_action_request_id uuid,
  p_wallet_id uuid,
  p_user_id uuid,
  p_amount_minor bigint,
  p_currency_code text,
  p_adjustment_type text,
  p_reason text,
  p_admin_case_id uuid,
  p_idempotency_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_adjustment_group_id uuid;
begin
  perform assert_admin_permission(
    p_admin_user_id,
    'wallet.admin_debit',
    p_admin_case_id,
    p_admin_action_request_id,
    'wallet',
    p_wallet_id,
    p_wallet_id,
    p_user_id,
    null,
    p_reason,
    p_metadata
  );

  v_adjustment_group_id := admin_debit_wallet_balance(
    p_wallet_id,
    p_user_id,
    p_amount_minor,
    p_currency_code,
    p_adjustment_type,
    p_reason,
    p_admin_user_id,
    p_admin_case_id,
    p_idempotency_key,
    p_metadata || jsonb_build_object(
      'admin_action_request_id',
      p_admin_action_request_id
    )
  );

  perform mark_admin_action_executed(
    p_admin_action_request_id,
    p_admin_user_id,
    jsonb_build_object('admin_adjustment_group_id', v_adjustment_group_id)
  );

  return v_adjustment_group_id;
end;
$$;

create or replace function gated_apply_trust_score_override(
  p_admin_user_id uuid,
  p_admin_action_request_id uuid,
  p_subject_type text,
  p_subject_entity_id uuid,
  p_user_id uuid,
  p_wallet_id uuid,
  p_override_trust_score numeric default null,
  p_override_risk_score numeric default null,
  p_override_confidence_score numeric default null,
  p_reason text default null,
  p_admin_case_id uuid default null,
  p_expires_at timestamptz default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_override_event_id uuid;
begin
  perform assert_admin_permission(
    p_admin_user_id,
    'trust.override',
    p_admin_case_id,
    p_admin_action_request_id,
    p_subject_type,
    p_subject_entity_id,
    p_wallet_id,
    p_user_id,
    null,
    p_reason,
    p_metadata
  );

  v_override_event_id := apply_trust_score_override(
    p_subject_type,
    p_subject_entity_id,
    p_user_id,
    p_wallet_id,
    p_override_trust_score,
    p_override_risk_score,
    p_override_confidence_score,
    p_reason,
    p_admin_user_id,
    p_admin_case_id,
    p_expires_at,
    p_metadata || jsonb_build_object(
      'admin_action_request_id',
      p_admin_action_request_id
    )
  );

  perform mark_admin_action_executed(
    p_admin_action_request_id,
    p_admin_user_id,
    jsonb_build_object('trust_override_event_id', v_override_event_id)
  );

  return v_override_event_id;
end;
$$;

create or replace function gated_clear_trust_score_override(
  p_admin_user_id uuid,
  p_admin_action_request_id uuid,
  p_subject_type text,
  p_subject_entity_id uuid,
  p_reason text,
  p_admin_case_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_override_event_id uuid;
begin
  perform assert_admin_permission(
    p_admin_user_id,
    'trust.clear_override',
    p_admin_case_id,
    p_admin_action_request_id,
    p_subject_type,
    p_subject_entity_id,
    null,
    null,
    null,
    p_reason,
    p_metadata
  );

  v_override_event_id := clear_trust_score_override(
    p_subject_type,
    p_subject_entity_id,
    p_reason,
    p_admin_user_id,
    p_admin_case_id,
    p_metadata || jsonb_build_object(
      'admin_action_request_id',
      p_admin_action_request_id
    )
  );

  perform mark_admin_action_executed(
    p_admin_action_request_id,
    p_admin_user_id,
    jsonb_build_object('trust_override_event_id', v_override_event_id)
  );

  return v_override_event_id;
end;
$$;

create or replace function gated_place_attention_evidence_legal_hold(
  p_admin_user_id uuid,
  p_admin_action_request_id uuid,
  p_attention_event_id uuid,
  p_hold_reason text,
  p_hold_type text,
  p_admin_case_id uuid,
  p_expires_at timestamptz default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_event attention_verification_events%rowtype;
  v_hold_id uuid;
begin
  select *
  into v_event
  from attention_verification_events
  where id = p_attention_event_id;

  if v_event.id is null then
    raise exception 'attention event not found: %', p_attention_event_id;
  end if;

  perform assert_admin_permission(
    p_admin_user_id,
    'evidence.legal_hold',
    p_admin_case_id,
    p_admin_action_request_id,
    'attention_event',
    p_attention_event_id,
    v_event.wallet_id,
    v_event.user_id,
    v_event.campaign_id,
    p_hold_reason,
    p_metadata
  );

  execute
    'select place_attention_evidence_legal_hold($1,$2,$3,$4,$5,$6)'
  into v_hold_id
  using
    p_attention_event_id,
    p_hold_reason,
    p_hold_type,
    p_admin_user_id,
    p_expires_at,
    p_metadata || jsonb_build_object(
      'admin_action_request_id',
      p_admin_action_request_id,
      'admin_case_id',
      p_admin_case_id
    );

  perform mark_admin_action_executed(
    p_admin_action_request_id,
    p_admin_user_id,
    jsonb_build_object('legal_hold_id', v_hold_id)
  );

  return v_hold_id;
end;
$$;

create or replace function gated_revoke_attention_model_version(
  p_admin_user_id uuid,
  p_admin_action_request_id uuid,
  p_model_version text,
  p_reason text,
  p_admin_case_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns text
language plpgsql
as $$
declare
  v_model_version text;
begin
  perform assert_admin_permission(
    p_admin_user_id,
    'model.revoke',
    p_admin_case_id,
    p_admin_action_request_id,
    'model_version',
    null,
    null,
    null,
    null,
    p_reason,
    p_metadata || jsonb_build_object('model_version', p_model_version)
  );

  v_model_version := revoke_attention_model_version(
    p_model_version,
    p_reason,
    p_admin_user_id,
    p_metadata || jsonb_build_object(
      'admin_action_request_id',
      p_admin_action_request_id
    )
  );

  perform mark_admin_action_executed(
    p_admin_action_request_id,
    p_admin_user_id,
    jsonb_build_object('model_version', v_model_version)
  );

  return v_model_version;
end;
$$;

create or replace function gated_run_trust_backfill_job(
  p_admin_user_id uuid,
  p_admin_action_request_id uuid,
  p_formula_version text default null,
  p_scope text default 'all',
  p_subject_type text default null,
  p_wallet_id uuid default null,
  p_user_id uuid default null,
  p_batch_size integer default 500,
  p_apply_wallet_policy_sync boolean default false,
  p_admin_case_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid;
begin
  perform assert_admin_permission(
    p_admin_user_id,
    'trust.backfill',
    p_admin_case_id,
    p_admin_action_request_id,
    'trust_backfill',
    null,
    p_wallet_id,
    p_user_id,
    null,
    'run_trust_backfill_job',
    p_metadata
  );

  v_run_id := run_trust_backfill_job(
    p_formula_version,
    p_scope,
    p_subject_type,
    p_wallet_id,
    p_user_id,
    p_batch_size,
    p_apply_wallet_policy_sync,
    p_admin_user_id,
    p_admin_case_id,
    p_metadata || jsonb_build_object(
      'admin_action_request_id',
      p_admin_action_request_id
    )
  );

  perform mark_admin_action_executed(
    p_admin_action_request_id,
    p_admin_user_id,
    jsonb_build_object('trust_backfill_run_id', v_run_id)
  );

  return v_run_id;
end;
$$;

create or replace function gated_resolve_wallet_reconciliation_issue(
  p_admin_user_id uuid,
  p_admin_action_request_id uuid,
  p_issue_id uuid,
  p_resolution_note text,
  p_status text default 'resolved',
  p_admin_case_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_issue wallet_reconciliation_issues%rowtype;
  v_issue_id uuid;
begin
  select *
  into v_issue
  from wallet_reconciliation_issues
  where id = p_issue_id;

  if v_issue.id is null then
    raise exception 'reconciliation issue not found: %', p_issue_id;
  end if;

  perform assert_admin_permission(
    p_admin_user_id,
    'reconciliation.resolve',
    p_admin_case_id,
    p_admin_action_request_id,
    'wallet_reconciliation_issue',
    p_issue_id,
    v_issue.wallet_id,
    v_issue.user_id,
    v_issue.campaign_id,
    p_resolution_note,
    p_metadata
  );

  v_issue_id := resolve_wallet_reconciliation_issue(
    p_issue_id,
    p_admin_user_id,
    p_resolution_note,
    p_status
  );

  perform mark_admin_action_executed(
    p_admin_action_request_id,
    p_admin_user_id,
    jsonb_build_object('reconciliation_issue_id', v_issue_id)
  );

  return v_issue_id;
end;
$$;

create or replace view admin_permission_details as
select
  au.id as admin_user_id,
  au.email,
  au.display_name,
  au.status as admin_status,
  au.mfa_required,
  au.mfa_verified_at,

  ar.role_key,
  ar.role_name,

  ap.permission_key,
  ap.permission_name,
  ap.permission_group,
  ap.risk_level,
  ap.requires_mfa,
  ap.requires_case_id,
  ap.requires_approval,
  ap.requires_two_person_rule

from admin_users au
join admin_user_roles aur
  on aur.admin_user_id = au.id
 and aur.status = 'active'
join admin_roles ar
  on ar.id = aur.role_id
 and ar.status = 'active'
join admin_role_permissions arp
  on arp.role_id = ar.id
 and arp.status = 'active'
join admin_permissions ap
  on ap.id = arp.permission_id
where au.status = 'active';

create or replace view admin_action_request_dashboard as
select
  aar.id as admin_action_request_id,
  aar.permission_key,
  ap.permission_name,
  ap.permission_group,
  ap.risk_level,
  ap.requires_approval,
  ap.requires_two_person_rule,

  aar.status,

  aar.requested_by_admin_id,
  requester.email as requested_by_email,

  aar.approved_by_admin_id,
  approver.email as approved_by_email,

  aar.executed_by_admin_id,
  executor.email as executed_by_email,

  aar.target_type,
  aar.target_id,
  aar.user_id,
  aar.wallet_id,
  aar.campaign_id,
  aar.admin_case_id,
  aar.reason,

  aar.requested_at,
  aar.approved_at,
  aar.rejected_at,
  aar.executed_at,

  aar.request_payload,
  aar.approval_metadata,
  aar.execution_metadata

from admin_action_requests aar
left join admin_permissions ap
  on ap.permission_key = aar.permission_key
left join admin_users requester
  on requester.id = aar.requested_by_admin_id
left join admin_users approver
  on approver.id = aar.approved_by_admin_id
left join admin_users executor
  on executor.id = aar.executed_by_admin_id;
