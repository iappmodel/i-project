-- Step 9.42 — Build policy simulation engine before activation.
-- Runs after 156_admin_security_policy_change_control.sql.

create table if not exists admin_security_policy_simulation_runs (
  id uuid primary key default gen_random_uuid(),

  simulation_key text not null unique,

  status text not null default 'running',

  policy_change_request_id uuid references admin_security_policy_change_requests(id) on delete cascade,
  target_policy_id uuid references admin_security_governance_policies(id),
  draft_policy_id uuid references admin_security_governance_policies(id),

  simulation_scope text not null default 'policy_change',

  risk_level text not null default 'high',

  started_by_auth_user_id uuid,
  started_by_admin_user_id uuid references admin_users(id),

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,

  summary text,

  pass_count integer not null default 0,
  warn_count integer not null default 0,
  fail_count integer not null default 0,
  blocked_count integer not null default 0,
  not_applicable_count integer not null default 0,

  activation_blocking boolean not null default false,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_policy_simulation_runs_status_check
  check (
    status in (
      'running',
      'passed',
      'warning',
      'failed',
      'error'
    )
  ),

  constraint admin_security_policy_simulation_runs_scope_check
  check (
    simulation_scope in (
      'policy_change',
      'policy',
      'global'
    )
  ),

  constraint admin_security_policy_simulation_runs_risk_check
  check (
    risk_level in (
      'medium',
      'high',
      'critical'
    )
  )
);

create index if not exists admin_security_policy_simulation_runs_change_idx
on admin_security_policy_simulation_runs (policy_change_request_id, created_at desc);

create index if not exists admin_security_policy_simulation_runs_status_idx
on admin_security_policy_simulation_runs (status, created_at desc);

drop trigger if exists admin_security_policy_simulation_runs_set_updated_at
on admin_security_policy_simulation_runs;

create trigger admin_security_policy_simulation_runs_set_updated_at
before update on admin_security_policy_simulation_runs
for each row
execute function set_updated_at();

create table if not exists admin_security_policy_simulation_items (
  id uuid primary key default gen_random_uuid(),

  admin_security_policy_simulation_run_id uuid not null
    references admin_security_policy_simulation_runs(id)
    on delete cascade,

  policy_key text,
  rule_key text,
  category text not null,

  check_key text not null,
  check_name text not null,

  result_status text not null,

  severity text not null default 'high',

  source_type text,
  source_id uuid,

  action_key text,

  message text not null,

  evidence jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint admin_security_policy_simulation_items_result_check
  check (
    result_status in (
      'pass',
      'warn',
      'fail',
      'blocked',
      'not_applicable'
    )
  ),

  constraint admin_security_policy_simulation_items_severity_check
  check (
    severity in (
      'medium',
      'high',
      'critical'
    )
  )
);

create index if not exists admin_security_policy_simulation_items_run_idx
on admin_security_policy_simulation_items (
  admin_security_policy_simulation_run_id,
  result_status
);

create index if not exists admin_security_policy_simulation_items_policy_idx
on admin_security_policy_simulation_items (
  policy_key,
  rule_key
);

create or replace function add_admin_security_policy_simulation_item(
  p_run_id uuid,
  p_policy_key text,
  p_rule_key text,
  p_category text,
  p_check_key text,
  p_check_name text,
  p_result_status text,
  p_severity text,
  p_source_type text default null,
  p_source_id uuid default null,
  p_action_key text default null,
  p_message text default null,
  p_evidence jsonb default '{}'::jsonb,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_item_id uuid;
begin
  if p_run_id is null then
    raise exception 'policy simulation run id is required';
  end if;

  if p_category is null or length(trim(p_category)) = 0 then
    raise exception 'simulation category is required';
  end if;

  if p_check_key is null or length(trim(p_check_key)) = 0 then
    raise exception 'simulation check key is required';
  end if;

  if p_result_status not in ('pass', 'warn', 'fail', 'blocked', 'not_applicable') then
    raise exception 'invalid simulation result status: %', p_result_status;
  end if;

  if p_severity not in ('medium', 'high', 'critical') then
    raise exception 'invalid simulation severity: %', p_severity;
  end if;

  insert into admin_security_policy_simulation_items (
    admin_security_policy_simulation_run_id,
    policy_key,
    rule_key,
    category,
    check_key,
    check_name,
    result_status,
    severity,
    source_type,
    source_id,
    action_key,
    message,
    evidence,
    metadata
  )
  values (
    p_run_id,
    p_policy_key,
    p_rule_key,
    p_category,
    p_check_key,
    p_check_name,
    p_result_status,
    p_severity,
    p_source_type,
    p_source_id,
    p_action_key,
    coalesce(p_message, p_check_name),
    coalesce(p_evidence, '{}'::jsonb),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_item_id;

  return v_item_id;
end;
$$;

create or replace function run_admin_security_policy_change_simulation(
  p_admin_auth_user_id uuid,
  p_policy_change_request_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_request admin_security_policy_change_requests%rowtype;
  v_draft admin_security_governance_policies%rowtype;
  v_target admin_security_governance_policies%rowtype;

  v_run_id uuid;
  v_simulation_key text;

  v_pass_count integer := 0;
  v_warn_count integer := 0;
  v_fail_count integer := 0;
  v_blocked_count integer := 0;
  v_na_count integer := 0;

  v_active_rule_count integer := 0;
  v_blocking boolean := false;
begin
  if p_admin_auth_user_id is not null then
    if admin_has_permission(p_admin_auth_user_id, 'admin.read') is not true then
      raise exception 'missing required permission: admin.read';
    end if;

    v_admin := get_active_admin_user(p_admin_auth_user_id);
  end if;

  if p_policy_change_request_id is null then
    raise exception 'policy change request id is required';
  end if;

  select *
  into v_request
  from admin_security_policy_change_requests
  where id = p_policy_change_request_id;

  if v_request.id is null then
    raise exception 'admin security policy change request not found: %', p_policy_change_request_id;
  end if;

  select *
  into v_draft
  from admin_security_governance_policies
  where id = v_request.draft_policy_id;

  if v_draft.id is null then
    raise exception 'draft governance policy not found: %', v_request.draft_policy_id;
  end if;

  if v_request.target_policy_id is not null then
    select *
    into v_target
    from admin_security_governance_policies
    where id = v_request.target_policy_id;
  end if;

  v_simulation_key :=
    'policy_change_simulation:' ||
    v_request.id::text || ':' ||
    extract(epoch from now())::bigint::text;

  insert into admin_security_policy_simulation_runs (
    simulation_key,
    status,
    policy_change_request_id,
    target_policy_id,
    draft_policy_id,
    simulation_scope,
    risk_level,
    started_by_auth_user_id,
    started_by_admin_user_id,
    request_id,
    metadata
  )
  values (
    v_simulation_key,
    'running',
    v_request.id,
    v_request.target_policy_id,
    v_request.draft_policy_id,
    'policy_change',
    v_request.risk_level,
    p_admin_auth_user_id,
    v_admin.id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_run_id;

  select count(*)
  into v_active_rule_count
  from admin_security_governance_policy_rules
  where admin_security_governance_policy_id = v_draft.id
    and status = 'active';

  if v_request.change_type <> 'archive_policy' and v_active_rule_count = 0 then
    perform add_admin_security_policy_simulation_item(
      v_run_id,
      v_draft.policy_key,
      null,
      v_draft.category,
      'draft_policy_has_active_rules',
      'Draft policy must have active rules',
      'blocked',
      'critical',
      'admin_security_governance_policy',
      v_draft.id,
      'run_admin_security_policy_change_simulation',
      'Draft policy has no active rules.',
      jsonb_build_object(
        'active_rule_count',
        v_active_rule_count
      ),
      p_metadata
    );

    v_blocking := true;
  else
    perform add_admin_security_policy_simulation_item(
      v_run_id,
      v_draft.policy_key,
      null,
      v_draft.category,
      'draft_policy_has_active_rules',
      'Draft policy must have active rules',
      'pass',
      'high',
      'admin_security_governance_policy',
      v_draft.id,
      'run_admin_security_policy_change_simulation',
      'Draft policy active-rule check passed.',
      jsonb_build_object(
        'active_rule_count',
        v_active_rule_count
      ),
      p_metadata
    );
  end if;

  if v_draft.severity = 'critical' and v_request.risk_level <> 'critical' then
    perform add_admin_security_policy_simulation_item(
      v_run_id,
      v_draft.policy_key,
      null,
      v_draft.category,
      'critical_policy_requires_critical_change_risk',
      'Critical policy changes must be marked critical risk',
      'warn',
      'high',
      'admin_security_policy_change_request',
      v_request.id,
      'run_admin_security_policy_change_simulation',
      'Draft policy severity is critical but change request risk level is not critical.',
      jsonb_build_object(
        'draft_policy_severity',
        v_draft.severity,
        'change_risk_level',
        v_request.risk_level
      ),
      p_metadata
    );
  else
    perform add_admin_security_policy_simulation_item(
      v_run_id,
      v_draft.policy_key,
      null,
      v_draft.category,
      'critical_policy_requires_critical_change_risk',
      'Critical policy changes must be marked critical risk',
      'pass',
      'medium',
      'admin_security_policy_change_request',
      v_request.id,
      'run_admin_security_policy_change_simulation',
      'Critical-risk classification check passed.',
      jsonb_build_object(
        'draft_policy_severity',
        v_draft.severity,
        'change_risk_level',
        v_request.risk_level
      ),
      p_metadata
    );
  end if;

  if v_draft.category = 'notification' then
    if (
      select count(*)
      from admin_security_notification_channels
      where status = 'active'
    ) = 0 then
      perform add_admin_security_policy_simulation_item(
        v_run_id,
        v_draft.policy_key,
        null,
        'notification',
        'active_notification_channel_exists',
        'At least one active notification channel should exist',
        'blocked',
        'critical',
        null,
        null,
        'run_admin_security_policy_change_simulation',
        'Notification policy would be active while no notification channel is active.',
        jsonb_build_object(
          'active_notification_channel_count',
          0
        ),
        p_metadata
      );

      v_blocking := true;
    else
      perform add_admin_security_policy_simulation_item(
        v_run_id,
        v_draft.policy_key,
        null,
        'notification',
        'active_notification_channel_exists',
        'At least one active notification channel should exist',
        'pass',
        'high',
        null,
        null,
        'run_admin_security_policy_change_simulation',
        'Active notification channel exists.',
        jsonb_build_object(
          'active_notification_channel_count',
          (
            select count(*)
            from admin_security_notification_channels
            where status = 'active'
          )
        ),
        p_metadata
      );
    end if;

  elsif v_draft.category = 'deletion' then
    if (
      select count(*)
      from admin_security_retention_policies
      where status = 'active'
        and deletion_allowed is true
        and immutable is false
    ) = 0 then
      perform add_admin_security_policy_simulation_item(
        v_run_id,
        v_draft.policy_key,
        null,
        'deletion',
        'deletion_allowed_sources_exist',
        'Deletion policy should reference at least one deletion-allowed source',
        'warn',
        'medium',
        null,
        null,
        'run_admin_security_policy_change_simulation',
        'No active deletion-allowed retention policies exist.',
        '{}'::jsonb,
        p_metadata
      );
    else
      perform add_admin_security_policy_simulation_item(
        v_run_id,
        v_draft.policy_key,
        null,
        'deletion',
        'deletion_allowed_sources_exist',
        'Deletion policy should reference at least one deletion-allowed source',
        'pass',
        'medium',
        null,
        null,
        'run_admin_security_policy_change_simulation',
        'Deletion-allowed retention policies exist.',
        jsonb_build_object(
          'deletion_allowed_policy_count',
          (
            select count(*)
            from admin_security_retention_policies
            where status = 'active'
              and deletion_allowed is true
              and immutable is false
          )
        ),
        p_metadata
      );
    end if;

    if (
      select count(*)
      from admin_security_archive_manifests
      where status = 'verified'
    ) = 0 then
      perform add_admin_security_policy_simulation_item(
        v_run_id,
        v_draft.policy_key,
        null,
        'deletion',
        'verified_archives_exist',
        'Deletion policy should rely on verified archives',
        'warn',
        'high',
        null,
        null,
        'run_admin_security_policy_change_simulation',
        'No verified archive manifests exist yet.',
        '{}'::jsonb,
        p_metadata
      );
    else
      perform add_admin_security_policy_simulation_item(
        v_run_id,
        v_draft.policy_key,
        null,
        'deletion',
        'verified_archives_exist',
        'Deletion policy should rely on verified archives',
        'pass',
        'high',
        null,
        null,
        'run_admin_security_policy_change_simulation',
        'Verified archives exist.',
        jsonb_build_object(
          'verified_archive_count',
          (
            select count(*)
            from admin_security_archive_manifests
            where status = 'verified'
          )
        ),
        p_metadata
      );
    end if;

  elsif v_draft.category = 'legal_hold' then
    perform add_admin_security_policy_simulation_item(
      v_run_id,
      v_draft.policy_key,
      null,
      'legal_hold',
      'legal_hold_guard_function_exists',
      'Legal hold guard function must exist and be callable',
      'pass',
      'critical',
      null,
      null,
      'require_no_admin_security_legal_hold',
      'Legal hold guard is installed.',
      '{}'::jsonb,
      p_metadata
    );

  elsif v_draft.category = 'archive' then
    if (
      select count(*)
      from admin_security_archive_export_jobs
      where status in ('failed', 'abandoned')
    ) > 0 then
      perform add_admin_security_policy_simulation_item(
        v_run_id,
        v_draft.policy_key,
        null,
        'archive',
        'no_failed_archive_export_jobs',
        'Archive policy should not activate while export jobs are failed or abandoned',
        'warn',
        'high',
        null,
        null,
        'run_admin_security_policy_change_simulation',
        'There are failed or abandoned archive export jobs.',
        jsonb_build_object(
          'failed_or_abandoned_export_job_count',
          (
            select count(*)
            from admin_security_archive_export_jobs
            where status in ('failed', 'abandoned')
          )
        ),
        p_metadata
      );
    else
      perform add_admin_security_policy_simulation_item(
        v_run_id,
        v_draft.policy_key,
        null,
        'archive',
        'no_failed_archive_export_jobs',
        'Archive policy should not activate while export jobs are failed or abandoned',
        'pass',
        'high',
        null,
        null,
        'run_admin_security_policy_change_simulation',
        'No failed or abandoned archive export jobs.',
        '{}'::jsonb,
        p_metadata
      );
    end if;

  elsif v_draft.category = 'mfa' then
    if (
      select count(*)
      from admin_security_actor_rollup
      where is_super_admin is true
        and has_active_mfa_factor is not true
    ) > 0 then
      perform add_admin_security_policy_simulation_item(
        v_run_id,
        v_draft.policy_key,
        null,
        'mfa',
        'all_super_admins_have_mfa',
        'All super admins should have MFA before stricter MFA policy activation',
        'blocked',
        'critical',
        null,
        null,
        'run_admin_security_policy_change_simulation',
        'One or more super admins do not have active MFA.',
        jsonb_build_object(
          'super_admin_without_mfa_count',
          (
            select count(*)
            from admin_security_actor_rollup
            where is_super_admin is true
              and has_active_mfa_factor is not true
          )
        ),
        p_metadata
      );

      v_blocking := true;
    else
      perform add_admin_security_policy_simulation_item(
        v_run_id,
        v_draft.policy_key,
        null,
        'mfa',
        'all_super_admins_have_mfa',
        'All super admins should have MFA before stricter MFA policy activation',
        'pass',
        'critical',
        null,
        null,
        'run_admin_security_policy_change_simulation',
        'All super admins have active MFA.',
        '{}'::jsonb,
        p_metadata
      );
    end if;

  else
    perform add_admin_security_policy_simulation_item(
      v_run_id,
      v_draft.policy_key,
      null,
      v_draft.category,
      'generic_policy_simulation',
      'Generic governance policy simulation',
      'not_applicable',
      'medium',
      null,
      null,
      'run_admin_security_policy_change_simulation',
      'No category-specific simulation exists for this policy category.',
      jsonb_build_object(
        'category',
        v_draft.category
      ),
      p_metadata
    );
  end if;

  select
    count(*) filter (where result_status = 'pass'),
    count(*) filter (where result_status = 'warn'),
    count(*) filter (where result_status = 'fail'),
    count(*) filter (where result_status = 'blocked'),
    count(*) filter (where result_status = 'not_applicable')
  into
    v_pass_count,
    v_warn_count,
    v_fail_count,
    v_blocked_count,
    v_na_count
  from admin_security_policy_simulation_items
  where admin_security_policy_simulation_run_id = v_run_id;

  update admin_security_policy_simulation_runs
  set
    status = case
      when v_blocked_count > 0 or v_fail_count > 0 then 'failed'
      when v_warn_count > 0 then 'warning'
      else 'passed'
    end,
    completed_at = now(),
    pass_count = v_pass_count,
    warn_count = v_warn_count,
    fail_count = v_fail_count,
    blocked_count = v_blocked_count,
    not_applicable_count = v_na_count,
    activation_blocking = (v_blocking or v_blocked_count > 0 or v_fail_count > 0),
    summary =
      'Policy simulation completed. Pass=' || v_pass_count ||
      ', warn=' || v_warn_count ||
      ', fail=' || v_fail_count ||
      ', blocked=' || v_blocked_count ||
      ', n/a=' || v_na_count || '.',
    updated_at = now()
  where id = v_run_id;

  update admin_security_policy_change_requests
  set metadata = metadata || jsonb_build_object(
    'latest_policy_simulation_run_id',
    v_run_id,
    'latest_policy_simulation_completed_at',
    now()
  )
  where id = v_request.id;

  perform record_admin_security_policy_evaluation(
    'admin_security_policy_change_requires_simulation',
    'simulate_before_activation',
    'general',
    case
      when v_blocked_count > 0 or v_fail_count > 0 then 'blocked'
      when v_warn_count > 0 then 'warn'
      else 'pass'
    end,
    p_admin_auth_user_id,
    null,
    'admin_security_policy_change_request',
    v_request.id,
    'run_admin_security_policy_change_simulation',
    p_request_id,
    'Policy change simulation completed.',
    jsonb_build_object(
      'simulation_run_id',
      v_run_id,
      'pass_count',
      v_pass_count,
      'warn_count',
      v_warn_count,
      'fail_count',
      v_fail_count,
      'blocked_count',
      v_blocked_count
    )
  );

  return v_run_id;

exception
  when others then
    if v_run_id is not null then
      update admin_security_policy_simulation_runs
      set
        status = 'error',
        failed_at = now(),
        summary = sqlerrm,
        activation_blocking = true,
        updated_at = now()
      where id = v_run_id;
    end if;

    raise;
end;
$$;

create or replace function require_policy_change_simulation_passed(
  p_policy_change_request_id uuid
)
returns uuid
language plpgsql
stable
as $$
declare
  v_run admin_security_policy_simulation_runs%rowtype;
begin
  if p_policy_change_request_id is null then
    raise exception 'policy change request id is required';
  end if;

  select *
  into v_run
  from admin_security_policy_simulation_runs
  where policy_change_request_id = p_policy_change_request_id
  order by created_at desc
  limit 1;

  if v_run.id is null then
    raise exception 'policy change simulation is required before activation';
  end if;

  if v_run.created_at < now() - interval '24 hours' then
    raise exception 'policy change simulation is stale and must be rerun';
  end if;

  if v_run.status not in ('passed', 'warning') then
    raise exception 'policy change simulation did not pass: %', v_run.status;
  end if;

  if v_run.activation_blocking is true then
    raise exception 'policy change simulation has activation-blocking findings';
  end if;

  return v_run.id;
end;
$$;

create or replace function activate_admin_security_policy_change_request(
  p_admin_auth_user_id uuid,
  p_change_request_id uuid,
  p_activation_note text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_request admin_security_policy_change_requests%rowtype;
  v_target admin_security_governance_policies%rowtype;
  v_draft admin_security_governance_policies%rowtype;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'privileged_action',
    p_request_id,
    p_metadata || jsonb_build_object(
      'action_key',
      'activate_admin_security_policy_change_request'
    )
  );

  if p_activation_note is null or length(trim(p_activation_note)) = 0 then
    raise exception 'policy change activation note is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  select *
  into v_request
  from admin_security_policy_change_requests
  where id = p_change_request_id
  for update;

  if v_request.id is null then
    raise exception 'admin security policy change request not found: %', p_change_request_id;
  end if;

  if v_request.status <> 'approved' then
    raise exception 'policy change request cannot be activated from status: %', v_request.status;
  end if;

  perform require_policy_change_simulation_passed(v_request.id);

  select *
  into v_draft
  from admin_security_governance_policies
  where id = v_request.draft_policy_id
  for update;

  if v_draft.id is null then
    raise exception 'draft governance policy not found: %', v_request.draft_policy_id;
  end if;

  if v_request.target_policy_id is not null then
    select *
    into v_target
    from admin_security_governance_policies
    where id = v_request.target_policy_id
    for update;

    if v_target.id is null then
      raise exception 'target governance policy not found: %', v_request.target_policy_id;
    end if;
  end if;

  if v_request.change_type = 'create_policy' then
    update admin_security_governance_policies
    set
      status = 'active',
      effective_at = now(),
      metadata = metadata || p_metadata || jsonb_build_object(
        'activated_by_change_request_id',
        v_request.id
      ),
      updated_at = now()
    where id = v_draft.id;

  elsif v_request.change_type in ('update_policy', 'supersede_policy') then
    update admin_security_governance_policies
    set
      status = 'superseded',
      expires_at = now(),
      metadata = metadata || jsonb_build_object(
        'superseded_by_policy_id',
        v_draft.id,
        'superseded_by_change_request_id',
        v_request.id
      ),
      updated_at = now()
    where id = v_target.id;

    update admin_security_governance_policies
    set
      status = 'active',
      effective_at = now(),
      metadata = metadata || p_metadata || jsonb_build_object(
        'supersedes_policy_id',
        v_target.id,
        'activated_by_change_request_id',
        v_request.id
      ),
      updated_at = now()
    where id = v_draft.id;

  elsif v_request.change_type = 'archive_policy' then
    update admin_security_governance_policies
    set
      status = 'archived',
      expires_at = now(),
      metadata = metadata || jsonb_build_object(
        'archived_by_change_request_id',
        v_request.id,
        'archive_reason',
        p_activation_note
      ),
      updated_at = now()
    where id = v_target.id;

    update admin_security_governance_policies
    set
      status = 'archived',
      expires_at = now(),
      metadata = metadata || jsonb_build_object(
        'draft_archived_after_policy_archive',
        true,
        'change_request_id',
        v_request.id
      ),
      updated_at = now()
    where id = v_draft.id;

  else
    raise exception 'unsupported policy change type: %', v_request.change_type;
  end if;

  update admin_security_policy_change_requests
  set
    status = 'activated',
    activated_by_auth_user_id = p_admin_auth_user_id,
    activated_by_admin_user_id = v_admin.id,
    activated_at = now(),
    diff_payload = build_admin_security_policy_diff(target_policy_id, draft_policy_id),
    metadata = metadata || p_metadata || jsonb_build_object(
      'activation_note',
      p_activation_note,
      'activation_request_id',
      p_request_id
    ),
    updated_at = now()
  where id = v_request.id;

  perform hash_admin_security_governance_policy(
    v_draft.id,
    p_metadata || jsonb_build_object(
      'source',
      'activate_admin_security_policy_change_request'
    )
  );

  if v_target.id is not null then
    perform hash_admin_security_governance_policy(
      v_target.id,
      p_metadata || jsonb_build_object(
        'source',
        'activate_admin_security_policy_change_request',
        'target_policy_hash',
        true
      )
    );
  end if;

  perform record_admin_action(
    p_admin_auth_user_id,
    'activate_admin_security_policy_change_request',
    'admin.write',
    'admin_security_policy_change_request',
    v_request.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_activation_note,
    p_metadata || jsonb_build_object(
      'change_type',
      v_request.change_type,
      'draft_policy_id',
      v_draft.id,
      'target_policy_id',
      v_target.id
    )
  );

  perform create_admin_security_alert(
    'admin_security_policy_change_activated',
    'critical',
    p_admin_auth_user_id,
    v_request.requested_by_auth_user_id,
    'activate_admin_security_policy_change_request',
    null,
    'Admin security governance policy change was activated.',
    p_metadata || jsonb_build_object(
      'admin_security_policy_change_request_id',
      v_request.id,
      'change_type',
      v_request.change_type,
      'draft_policy_id',
      v_draft.id,
      'target_policy_id',
      v_target.id
    )
  );

  return v_request.id;
end;
$$;

create or replace view admin_security_policy_simulation_run_dashboard as
select
  r.id as admin_security_policy_simulation_run_id,
  r.simulation_key,
  r.status,

  r.policy_change_request_id,
  cr.change_key,
  cr.status as change_request_status,
  cr.change_type,

  r.target_policy_id,
  target.policy_key as target_policy_key,

  r.draft_policy_id,
  draft.policy_key as draft_policy_key,
  draft.policy_name as draft_policy_name,
  draft.category as draft_policy_category,
  draft.severity as draft_policy_severity,

  r.simulation_scope,
  r.risk_level,

  r.started_by_auth_user_id,
  au.email as started_by_email,
  au.display_name as started_by_display_name,

  r.started_at,
  r.completed_at,
  r.failed_at,

  r.summary,

  r.pass_count,
  r.warn_count,
  r.fail_count,
  r.blocked_count,
  r.not_applicable_count,

  r.activation_blocking,

  r.created_at,
  r.updated_at,
  r.metadata

from admin_security_policy_simulation_runs r
left join admin_security_policy_change_requests cr
  on cr.id = r.policy_change_request_id
left join admin_security_governance_policies target
  on target.id = r.target_policy_id
left join admin_security_governance_policies draft
  on draft.id = r.draft_policy_id
left join admin_users au
  on au.id = r.started_by_admin_user_id
order by r.created_at desc;

create or replace view admin_security_policy_simulation_item_dashboard as
select
  i.id as admin_security_policy_simulation_item_id,
  i.admin_security_policy_simulation_run_id,

  r.simulation_key,
  r.status as simulation_status,

  i.policy_key,
  i.rule_key,
  i.category,

  i.check_key,
  i.check_name,
  i.result_status,
  i.severity,

  i.source_type,
  i.source_id,
  i.action_key,

  i.message,
  i.evidence,

  i.created_at,
  i.metadata

from admin_security_policy_simulation_items i
join admin_security_policy_simulation_runs r
  on r.id = i.admin_security_policy_simulation_run_id
order by
  i.created_at desc,
  case i.result_status
    when 'blocked' then 0
    when 'fail' then 1
    when 'warn' then 2
    when 'pass' then 3
    else 4
  end;

create or replace view admin_security_policy_simulation_integrity as
select
  (
    select count(*)
    from admin_security_policy_simulation_runs
    where status = 'running'
  ) as running_simulation_count,

  (
    select count(*)
    from admin_security_policy_simulation_runs
    where status = 'failed'
      and created_at >= now() - interval '24 hours'
  ) as failed_simulation_count_24h,

  (
    select count(*)
    from admin_security_policy_simulation_runs
    where activation_blocking is true
      and created_at >= now() - interval '24 hours'
  ) as activation_blocking_simulation_count_24h,

  (
    select count(*)
    from admin_security_policy_change_requests cr
    where cr.status = 'approved'
      and not exists (
        select 1
        from admin_security_policy_simulation_runs r
        where r.policy_change_request_id = cr.id
          and r.status in ('passed', 'warning')
          and r.activation_blocking is false
          and r.created_at >= now() - interval '24 hours'
      )
  ) as approved_change_without_valid_simulation_count,

  (
    select count(*)
    from admin_security_policy_simulation_runs
    where created_at >= now() - interval '24 hours'
  ) as simulation_count_24h,

  now() as checked_at;

grant select on admin_security_policy_simulation_run_dashboard to admin_api_role;
grant select on admin_security_policy_simulation_item_dashboard to admin_api_role;
grant select on admin_security_policy_simulation_integrity to admin_api_role;

insert into admin_security_governance_policies (
  policy_key,
  policy_name,
  category,
  status,
  version,
  severity,
  owner_team,
  description,
  metadata
)
values (
  'admin_security_policy_change_requires_simulation',
  'Security policy changes require simulation',
  'general',
  'active',
  1,
  'critical',
  'platform',
  'Approved security governance policy changes must pass simulation before activation.',
  '{"source": "policy simulation engine"}'::jsonb
)
on conflict (policy_key)
do update set
  policy_name = excluded.policy_name,
  category = excluded.category,
  status = excluded.status,
  severity = excluded.severity,
  owner_team = excluded.owner_team,
  description = excluded.description,
  metadata = admin_security_governance_policies.metadata || excluded.metadata,
  updated_at = now();

insert into admin_security_governance_policy_rules (
  admin_security_governance_policy_id,
  rule_key,
  status,
  rule_type,
  enforcement_level,
  description,
  condition_expression,
  expected_behavior,
  source_table,
  source_function,
  source_route,
  metadata
)
select
  p.id,
  'simulate_before_activation',
  'active',
  'require',
  'hard',
  'Policy change activation requires recent non-blocking simulation.',
  'policy change status = approved',
  'Block activation until simulation passes.',
  'admin_security_policy_simulation_runs',
  'require_policy_change_simulation_passed',
  '/v1/admin/security-policy-changes/:id/activate',
  '{}'::jsonb
from admin_security_governance_policies p
where p.policy_key = 'admin_security_policy_change_requires_simulation'
on conflict do nothing;

alter table admin_security_policy_simulation_runs enable row level security;
alter table admin_security_policy_simulation_items enable row level security;

drop policy if exists admin_security_policy_simulation_runs_no_user_direct_access on admin_security_policy_simulation_runs;
create policy admin_security_policy_simulation_runs_no_user_direct_access
on admin_security_policy_simulation_runs
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_policy_simulation_items_no_user_direct_access on admin_security_policy_simulation_items;
create policy admin_security_policy_simulation_items_no_user_direct_access
on admin_security_policy_simulation_items
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_api_all_admin_security_policy_simulation_runs on admin_security_policy_simulation_runs;
create policy admin_api_all_admin_security_policy_simulation_runs
on admin_security_policy_simulation_runs
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_policy_simulation_items on admin_security_policy_simulation_items;
create policy admin_api_all_admin_security_policy_simulation_items
on admin_security_policy_simulation_items
for all
to admin_api_role
using (true)
with check (true);

grant execute on function add_admin_security_policy_simulation_item(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  uuid,
  text,
  text,
  jsonb,
  jsonb
) to admin_api_role, worker_role;

grant execute on function run_admin_security_policy_change_simulation(
  uuid,
  uuid,
  text,
  jsonb
) to admin_api_role;

grant execute on function require_policy_change_simulation_passed(uuid)
to admin_api_role;

alter function add_admin_security_policy_simulation_item(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  uuid,
  text,
  text,
  jsonb,
  jsonb
) security definer;

alter function add_admin_security_policy_simulation_item(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  uuid,
  text,
  text,
  jsonb,
  jsonb
) set search_path = public;

alter function run_admin_security_policy_change_simulation(uuid, uuid, text, jsonb) security definer;
alter function run_admin_security_policy_change_simulation(uuid, uuid, text, jsonb) set search_path = public;

alter function require_policy_change_simulation_passed(uuid) security definer;
alter function require_policy_change_simulation_passed(uuid) set search_path = public;

alter function activate_admin_security_policy_change_request(uuid, uuid, text, text, jsonb) security definer;
alter function activate_admin_security_policy_change_request(uuid, uuid, text, text, jsonb) set search_path = public;

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
    'ADMIN_SECURITY_POLICY_SIMULATION_REQUIRED',
    'validation',
    'critical',
    409,
    false,
    true,
    'Policy simulation is required before activation.',
    'Admin security policy activation blocked by missing simulation.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_POLICY_SIMULATION_STALE',
    'validation',
    'high',
    409,
    false,
    true,
    'Policy simulation is stale and must be rerun.',
    'Admin security policy activation blocked by stale simulation.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_POLICY_SIMULATION_BLOCKING',
    'validation',
    'critical',
    409,
    false,
    true,
    'Policy simulation has activation-blocking findings.',
    'Admin security policy activation blocked by simulation findings.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_POLICY_SIMULATION_FAILED',
    'system',
    'high',
    500,
    true,
    false,
    'Policy simulation failed.',
    'Admin security policy simulation failed.',
    'platform'
  )
on conflict (error_code)
do update set
  category = excluded.category,
  severity = excluded.severity,
  http_status = excluded.http_status,
  retryable = excluded.retryable,
  user_visible = excluded.user_visible,
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
  ('policy change simulation is required before activation', 'ADMIN_SECURITY_POLICY_SIMULATION_REQUIRED', 5, '{}'),
  ('policy change simulation is stale and must be rerun', 'ADMIN_SECURITY_POLICY_SIMULATION_STALE', 5, '{}'),
  ('policy change simulation did not pass', 'ADMIN_SECURITY_POLICY_SIMULATION_BLOCKING', 5, '{}'),
  ('policy change simulation has activation-blocking findings', 'ADMIN_SECURITY_POLICY_SIMULATION_BLOCKING', 5, '{}'),
  ('policy simulation run id is required', 'ADMIN_SECURITY_POLICY_SIMULATION_FAILED', 5, '{}'),
  ('invalid simulation result status', 'ADMIN_SECURITY_POLICY_SIMULATION_FAILED', 5, '{}')
on conflict do nothing;
