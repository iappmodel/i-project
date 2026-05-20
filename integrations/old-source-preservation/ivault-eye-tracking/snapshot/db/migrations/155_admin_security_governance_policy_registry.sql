-- Step 9.40 — Build security governance policy registry.
-- Runs after 154_admin_security_legal_hold_compliance_lock.sql.

create table if not exists admin_security_governance_policies (
  id uuid primary key default gen_random_uuid(),

  policy_key text not null unique,
  policy_name text not null,

  category text not null,
  status text not null default 'active',

  version integer not null default 1,

  severity text not null default 'high',

  owner_team text not null default 'platform',
  description text not null,

  effective_at timestamptz not null default now(),
  expires_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_governance_policies_category_check
  check (
    category in (
      'mfa',
      'break_glass',
      'incident_review',
      'corrective_action',
      'notification',
      'retention',
      'archive',
      'verification',
      'deletion',
      'legal_hold',
      'audit',
      'session',
      'device',
      'general'
    )
  ),

  constraint admin_security_governance_policies_status_check
  check (
    status in (
      'draft',
      'active',
      'paused',
      'superseded',
      'archived'
    )
  ),

  constraint admin_security_governance_policies_severity_check
  check (
    severity in (
      'medium',
      'high',
      'critical'
    )
  ),

  constraint admin_security_governance_policies_expiry_check
  check (
    expires_at is null
    or expires_at > effective_at
  )
);

create index if not exists admin_security_governance_policies_category_idx
on admin_security_governance_policies (category, status);

create index if not exists admin_security_governance_policies_status_idx
on admin_security_governance_policies (status, effective_at desc);

drop trigger if exists admin_security_governance_policies_set_updated_at
on admin_security_governance_policies;

create trigger admin_security_governance_policies_set_updated_at
before update on admin_security_governance_policies
for each row
execute function set_updated_at();

create table if not exists admin_security_governance_policy_rules (
  id uuid primary key default gen_random_uuid(),

  admin_security_governance_policy_id uuid not null
    references admin_security_governance_policies(id)
    on delete cascade,

  rule_key text not null,

  status text not null default 'active',

  rule_type text not null,

  enforcement_level text not null default 'hard',

  description text not null,

  condition_expression text,
  expected_behavior text not null,

  source_table text,
  source_function text,
  source_route text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (admin_security_governance_policy_id, rule_key),

  constraint admin_security_governance_policy_rules_status_check
  check (
    status in (
      'active',
      'paused',
      'archived'
    )
  ),

  constraint admin_security_governance_policy_rules_type_check
  check (
    rule_type in (
      'require',
      'block',
      'allow',
      'notify',
      'audit',
      'hash',
      'archive',
      'verify',
      'delete',
      'escalate'
    )
  ),

  constraint admin_security_governance_policy_rules_enforcement_check
  check (
    enforcement_level in (
      'hard',
      'soft',
      'advisory'
    )
  )
);

create index if not exists admin_security_governance_policy_rules_policy_idx
on admin_security_governance_policy_rules (admin_security_governance_policy_id, status);

create index if not exists admin_security_governance_policy_rules_type_idx
on admin_security_governance_policy_rules (rule_type, enforcement_level);

drop trigger if exists admin_security_governance_policy_rules_set_updated_at
on admin_security_governance_policy_rules;

create trigger admin_security_governance_policy_rules_set_updated_at
before update on admin_security_governance_policy_rules
for each row
execute function set_updated_at();

create table if not exists admin_security_policy_evaluations (
  id uuid primary key default gen_random_uuid(),

  policy_key text not null,
  rule_key text,

  category text not null,

  evaluation_status text not null,

  actor_auth_user_id uuid,
  target_auth_user_id uuid,

  source_type text,
  source_id uuid,

  action_key text,

  request_id text,

  message text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint admin_security_policy_evaluations_status_check
  check (
    evaluation_status in (
      'pass',
      'fail',
      'warn',
      'blocked',
      'not_applicable'
    )
  )
);

create index if not exists admin_security_policy_evaluations_policy_idx
on admin_security_policy_evaluations (policy_key, created_at desc);

create index if not exists admin_security_policy_evaluations_category_idx
on admin_security_policy_evaluations (category, created_at desc);

create index if not exists admin_security_policy_evaluations_source_idx
on admin_security_policy_evaluations (source_type, source_id);

create or replace function record_admin_security_policy_evaluation(
  p_policy_key text,
  p_rule_key text,
  p_category text,
  p_evaluation_status text,
  p_actor_auth_user_id uuid default null,
  p_target_auth_user_id uuid default null,
  p_source_type text default null,
  p_source_id uuid default null,
  p_action_key text default null,
  p_request_id text default null,
  p_message text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  if p_policy_key is null or length(trim(p_policy_key)) = 0 then
    raise exception 'policy key is required';
  end if;

  if p_category is null or length(trim(p_category)) = 0 then
    raise exception 'policy category is required';
  end if;

  if p_evaluation_status not in ('pass', 'fail', 'warn', 'blocked', 'not_applicable') then
    raise exception 'invalid policy evaluation status: %', p_evaluation_status;
  end if;

  insert into admin_security_policy_evaluations (
    policy_key,
    rule_key,
    category,
    evaluation_status,
    actor_auth_user_id,
    target_auth_user_id,
    source_type,
    source_id,
    action_key,
    request_id,
    message,
    metadata
  )
  values (
    p_policy_key,
    p_rule_key,
    p_category,
    p_evaluation_status,
    p_actor_auth_user_id,
    p_target_auth_user_id,
    p_source_type,
    p_source_id,
    p_action_key,
    p_request_id,
    p_message,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

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
values
  (
    'admin_mfa_required_for_privileged_actions',
    'Admin MFA required for privileged actions',
    'mfa',
    'active',
    1,
    'critical',
    'platform',
    'Privileged admin actions require active MFA verification.',
    '{"source": "admin MFA layer"}'::jsonb
  ),
  (
    'break_glass_requires_post_incident_review',
    'Break-glass requires post-incident review',
    'break_glass',
    'active',
    1,
    'critical',
    'security',
    'Every executed break-glass access path must produce an incident review.',
    '{"source": "break-glass incident review workflow"}'::jsonb
  ),
  (
    'critical_alerts_require_incident_reviews',
    'Critical alerts require incident reviews',
    'incident_review',
    'active',
    1,
    'critical',
    'security',
    'Every critical admin security alert must generate an incident review.',
    '{"source": "incident review creation job"}'::jsonb
  ),
  (
    'incident_reviews_require_corrective_action_or_no_action_reason',
    'Incident reviews require corrective action or explicit no-action reason',
    'corrective_action',
    'active',
    1,
    'high',
    'security',
    'Incident reviews cannot close with unresolved corrective actions and must justify no-action closure.',
    '{"source": "close_admin_incident_review"}'::jsonb
  ),
  (
    'critical_admin_events_notify_external_channels',
    'Critical admin events notify external channels',
    'notification',
    'active',
    1,
    'critical',
    'security',
    'Critical admin security events must be routed to active notification channels.',
    '{"source": "security notification channels"}'::jsonb
  ),
  (
    'security_records_require_retention_policy',
    'Security records require retention policy',
    'retention',
    'active',
    1,
    'high',
    'platform',
    'Every governed admin security record type must have a retention policy.',
    '{"source": "retention policies"}'::jsonb
  ),
  (
    'archives_must_be_exported_sealed_and_verified',
    'Archives must be exported, sealed, and verified',
    'archive',
    'active',
    1,
    'critical',
    'platform',
    'Archived security records must be exported, checksummed, sealed, and restore-verified.',
    '{"source": "archive export and verification jobs"}'::jsonb
  ),
  (
    'deletion_requires_verified_archive_and_second_admin',
    'Deletion requires verified archive and second admin approval',
    'deletion',
    'active',
    1,
    'critical',
    'security',
    'Security record deletion requires retention allowance, verified archive, MFA, and second-admin approval.',
    '{"source": "deletion approval workflow"}'::jsonb
  ),
  (
    'legal_hold_overrides_retention_and_deletion',
    'Legal hold overrides retention and deletion',
    'legal_hold',
    'active',
    1,
    'critical',
    'compliance',
    'Active legal/compliance holds block deletion even when retention allows it.',
    '{"source": "legal hold compliance lock"}'::jsonb
  ),
  (
    'terminal_security_records_must_be_hash_chained',
    'Terminal security records must be hash chained',
    'audit',
    'active',
    1,
    'critical',
    'platform',
    'Terminal or immutable security records must be represented in the audit hash chain.',
    '{"source": "audit hash chain"}'::jsonb
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
  'require_mfa_for_privileged_action',
  'active',
  'require',
  'hard',
  'Admin privileged actions require recent MFA verification.',
  'admin action is privileged',
  'Block action until MFA is verified.',
  'admin_mfa_verifications',
  'require_admin_mfa',
  null,
  '{}'::jsonb
from admin_security_governance_policies p
where p.policy_key = 'admin_mfa_required_for_privileged_actions'
on conflict do nothing;

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
  'create_review_for_critical_alert',
  'active',
  'require',
  'hard',
  'Critical admin security alerts must generate incident reviews.',
  'admin_security_alert_events.severity = critical',
  'Create admin_incident_reviews row.',
  'admin_incident_reviews',
  'create_incident_reviews_from_critical_alerts',
  null,
  '{}'::jsonb
from admin_security_governance_policies p
where p.policy_key = 'critical_alerts_require_incident_reviews'
on conflict do nothing;

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
  'block_review_closure_with_open_corrective_actions',
  'active',
  'block',
  'hard',
  'Incident reviews cannot close while linked corrective actions remain open.',
  'corrective action status in open, assigned, in_progress, overdue',
  'Raise error and keep review open.',
  'admin_incident_corrective_actions',
  'close_admin_incident_review',
  '/v1/admin/incident-reviews/:id/close',
  '{}'::jsonb
from admin_security_governance_policies p
where p.policy_key = 'incident_reviews_require_corrective_action_or_no_action_reason'
on conflict do nothing;

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
  'block_deletion_without_verified_archive',
  'active',
  'block',
  'hard',
  'Deletion must be blocked unless a verified archive covers the requested period.',
  'archive manifest status != verified',
  'Raise error before deletion request creation.',
  'admin_security_archive_manifests',
  'require_admin_security_deletion_allowed',
  '/v1/admin/security-deletion',
  '{}'::jsonb
from admin_security_governance_policies p
where p.policy_key = 'deletion_requires_verified_archive_and_second_admin'
on conflict do nothing;

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
  'block_deletion_under_legal_hold',
  'active',
  'block',
  'hard',
  'Active legal holds block deletion for matching source, record, period, admin user, archive, or global target.',
  'find_active_admin_security_legal_hold returns id',
  'Raise locked error and block operation.',
  'admin_security_legal_holds',
  'require_no_admin_security_legal_hold',
  '/v1/admin/security-deletion',
  '{}'::jsonb
from admin_security_governance_policies p
where p.policy_key = 'legal_hold_overrides_retention_and_deletion'
on conflict do nothing;

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
  'hash_terminal_security_records',
  'active',
  'hash',
  'hard',
  'Terminal security records must appear in audit_hash_chain_entries.',
  'record reaches terminal or immutable state',
  'Backfill hash chain entry.',
  'audit_hash_chain_entries',
  'run_audit_hash_backfill_job',
  null,
  '{}'::jsonb
from admin_security_governance_policies p
where p.policy_key = 'terminal_security_records_must_be_hash_chained'
on conflict do nothing;

create or replace view admin_security_governance_policy_dashboard as
select
  p.id as admin_security_governance_policy_id,
  p.policy_key,
  p.policy_name,
  p.category,
  p.status,
  p.version,
  p.severity,
  p.owner_team,
  p.description,
  p.effective_at,
  p.expires_at,

  (
    select count(*)
    from admin_security_governance_policy_rules r
    where r.admin_security_governance_policy_id = p.id
      and r.status = 'active'
  ) as active_rule_count,

  (
    select count(*)
    from admin_security_policy_evaluations e
    where e.policy_key = p.policy_key
      and e.created_at >= now() - interval '24 hours'
  ) as evaluation_count_24h,

  (
    select count(*)
    from admin_security_policy_evaluations e
    where e.policy_key = p.policy_key
      and e.evaluation_status in ('fail', 'blocked')
      and e.created_at >= now() - interval '24 hours'
  ) as failed_or_blocked_evaluation_count_24h,

  p.created_at,
  p.updated_at,
  p.metadata
from admin_security_governance_policies p
order by
  case p.severity
    when 'critical' then 0
    when 'high' then 1
    else 2
  end,
  p.category,
  p.policy_key;

create or replace view admin_security_governance_policy_rule_dashboard as
select
  r.id as admin_security_governance_policy_rule_id,
  r.admin_security_governance_policy_id,

  p.policy_key,
  p.policy_name,
  p.category,
  p.severity,

  r.rule_key,
  r.status,
  r.rule_type,
  r.enforcement_level,
  r.description,
  r.condition_expression,
  r.expected_behavior,

  r.source_table,
  r.source_function,
  r.source_route,

  r.created_at,
  r.updated_at,
  r.metadata
from admin_security_governance_policy_rules r
join admin_security_governance_policies p
  on p.id = r.admin_security_governance_policy_id
order by p.category, p.policy_key, r.rule_key;

create or replace view admin_security_governance_policy_integrity as
select
  (
    select count(*)
    from admin_security_governance_policies
    where status = 'active'
  ) as active_policy_count,

  (
    select count(*)
    from admin_security_governance_policy_rules
    where status = 'active'
  ) as active_policy_rule_count,

  (
    select count(*)
    from admin_security_governance_policies p
    where p.status = 'active'
      and not exists (
        select 1
        from admin_security_governance_policy_rules r
        where r.admin_security_governance_policy_id = p.id
          and r.status = 'active'
      )
  ) as active_policy_without_rules_count,

  (
    select count(*)
    from admin_security_policy_evaluations
    where evaluation_status in ('fail', 'blocked')
      and created_at >= now() - interval '24 hours'
  ) as failed_or_blocked_policy_evaluation_count_24h,

  (
    select count(*)
    from admin_security_policy_evaluations
    where created_at >= now() - interval '24 hours'
  ) as policy_evaluation_count_24h,

  now() as checked_at;

grant select on admin_security_governance_policy_dashboard to admin_api_role;
grant select on admin_security_governance_policy_rule_dashboard to admin_api_role;
grant select on admin_security_governance_policy_integrity to admin_api_role;

create or replace function require_admin_security_deletion_allowed(
  p_source_type text,
  p_period_start timestamptz,
  p_period_end timestamptz
)
returns uuid
language plpgsql
as $$
declare
  v_policy admin_security_retention_policies%rowtype;
  v_manifest_id uuid;
begin
  if p_source_type is null or length(trim(p_source_type)) = 0 then
    perform record_admin_security_policy_evaluation(
      'deletion_requires_verified_archive_and_second_admin',
      'block_deletion_without_verified_archive',
      'deletion',
      'blocked',
      null,
      null,
      p_source_type,
      null,
      'require_admin_security_deletion_allowed',
      null,
      'Deletion blocked by retention/archive policy.',
      jsonb_build_object(
        'period_start', p_period_start,
        'period_end', p_period_end,
        'reason', 'missing_source_type'
      )
    );
    raise exception 'deletion source type is required';
  end if;

  if p_period_start is null or p_period_end is null then
    perform record_admin_security_policy_evaluation(
      'deletion_requires_verified_archive_and_second_admin',
      'block_deletion_without_verified_archive',
      'deletion',
      'blocked',
      null,
      null,
      p_source_type,
      null,
      'require_admin_security_deletion_allowed',
      null,
      'Deletion blocked by retention/archive policy.',
      jsonb_build_object(
        'period_start', p_period_start,
        'period_end', p_period_end,
        'reason', 'missing_period'
      )
    );
    raise exception 'deletion period is required';
  end if;

  if p_period_end < p_period_start then
    perform record_admin_security_policy_evaluation(
      'deletion_requires_verified_archive_and_second_admin',
      'block_deletion_without_verified_archive',
      'deletion',
      'blocked',
      null,
      null,
      p_source_type,
      null,
      'require_admin_security_deletion_allowed',
      null,
      'Deletion blocked by retention/archive policy.',
      jsonb_build_object(
        'period_start', p_period_start,
        'period_end', p_period_end,
        'reason', 'invalid_period'
      )
    );
    raise exception 'deletion period end cannot be before start';
  end if;

  select *
  into v_policy
  from admin_security_retention_policies
  where source_type = p_source_type
    and status = 'active'
  order by updated_at desc
  limit 1;

  if v_policy.id is null then
    perform record_admin_security_policy_evaluation(
      'deletion_requires_verified_archive_and_second_admin',
      'block_deletion_without_verified_archive',
      'deletion',
      'blocked',
      null,
      null,
      p_source_type,
      null,
      'require_admin_security_deletion_allowed',
      null,
      'Deletion blocked by retention/archive policy.',
      jsonb_build_object(
        'period_start', p_period_start,
        'period_end', p_period_end,
        'reason', 'missing_active_retention_policy'
      )
    );
    raise exception 'no active retention policy for source type: %', p_source_type;
  end if;

  if v_policy.immutable is true then
    perform record_admin_security_policy_evaluation(
      'deletion_requires_verified_archive_and_second_admin',
      'block_deletion_without_verified_archive',
      'deletion',
      'blocked',
      null,
      null,
      p_source_type,
      null,
      'require_admin_security_deletion_allowed',
      null,
      'Deletion blocked by retention/archive policy.',
      jsonb_build_object(
        'period_start', p_period_start,
        'period_end', p_period_end,
        'reason', 'immutable_source_type'
      )
    );
    raise exception 'source type is immutable and cannot be deleted: %', p_source_type;
  end if;

  if v_policy.deletion_allowed is not true then
    perform record_admin_security_policy_evaluation(
      'deletion_requires_verified_archive_and_second_admin',
      'block_deletion_without_verified_archive',
      'deletion',
      'blocked',
      null,
      null,
      p_source_type,
      null,
      'require_admin_security_deletion_allowed',
      null,
      'Deletion blocked by retention/archive policy.',
      jsonb_build_object(
        'period_start', p_period_start,
        'period_end', p_period_end,
        'reason', 'retention_policy_disallows_deletion'
      )
    );
    raise exception 'deletion is not allowed for source type: %', p_source_type;
  end if;

  if v_policy.delete_after_days is null then
    perform record_admin_security_policy_evaluation(
      'deletion_requires_verified_archive_and_second_admin',
      'block_deletion_without_verified_archive',
      'deletion',
      'blocked',
      null,
      null,
      p_source_type,
      null,
      'require_admin_security_deletion_allowed',
      null,
      'Deletion blocked by retention/archive policy.',
      jsonb_build_object(
        'period_start', p_period_start,
        'period_end', p_period_end,
        'reason', 'delete_after_days_not_configured'
      )
    );
    raise exception 'delete_after_days is not configured for source type: %', p_source_type;
  end if;

  if p_period_end > now() - make_interval(days => v_policy.delete_after_days) then
    perform record_admin_security_policy_evaluation(
      'deletion_requires_verified_archive_and_second_admin',
      'block_deletion_without_verified_archive',
      'deletion',
      'blocked',
      null,
      null,
      p_source_type,
      null,
      'require_admin_security_deletion_allowed',
      null,
      'Deletion blocked by retention/archive policy.',
      jsonb_build_object(
        'period_start', p_period_start,
        'period_end', p_period_end,
        'reason', 'records_not_old_enough'
      )
    );
    raise exception 'records are not old enough for deletion';
  end if;

  select m.id
  into v_manifest_id
  from admin_security_archive_manifests m
  where m.source_type = p_source_type
    and m.status = 'verified'
    and p_period_start >= m.period_start
    and p_period_end <= m.period_end
  order by m.verified_at desc nulls last
  limit 1;

  if v_manifest_id is null then
    perform record_admin_security_policy_evaluation(
      'deletion_requires_verified_archive_and_second_admin',
      'block_deletion_without_verified_archive',
      'deletion',
      'blocked',
      null,
      null,
      p_source_type,
      null,
      'require_admin_security_deletion_allowed',
      null,
      'Deletion blocked by retention/archive policy.',
      jsonb_build_object(
        'period_start', p_period_start,
        'period_end', p_period_end,
        'reason', 'missing_verified_archive_or_policy_block'
      )
    );
    raise exception 'verified archive manifest is required before deletion';
  end if;

  perform require_no_admin_security_legal_hold(
    p_source_type,
    null,
    p_period_start,
    p_period_end,
    null,
    v_manifest_id
  );

  perform record_admin_security_policy_evaluation(
    'deletion_requires_verified_archive_and_second_admin',
    'block_deletion_without_verified_archive',
    'deletion',
    'pass',
    null,
    null,
    p_source_type,
    null,
    'require_admin_security_deletion_allowed',
    null,
    'Deletion allowance passed verified archive and retention checks.',
    jsonb_build_object(
      'period_start', p_period_start,
      'period_end', p_period_end,
      'archive_manifest_id', v_manifest_id
    )
  );

  return v_manifest_id;
end;
$$;

create or replace function require_no_admin_security_legal_hold(
  p_source_type text default null,
  p_source_id uuid default null,
  p_period_start timestamptz default null,
  p_period_end timestamptz default null,
  p_admin_auth_user_id uuid default null,
  p_archive_manifest_id uuid default null
)
returns void
language plpgsql
stable
as $$
declare
  v_hold_id uuid;
begin
  v_hold_id := find_active_admin_security_legal_hold(
    p_source_type,
    p_source_id,
    p_period_start,
    p_period_end,
    p_admin_auth_user_id,
    p_archive_manifest_id
  );

  if v_hold_id is not null then
    perform record_admin_security_policy_evaluation(
      'legal_hold_overrides_retention_and_deletion',
      'block_deletion_under_legal_hold',
      'legal_hold',
      'blocked',
      p_admin_auth_user_id,
      null,
      p_source_type,
      p_source_id,
      'require_no_admin_security_legal_hold',
      null,
      'Operation blocked by active legal hold.',
      jsonb_build_object(
        'legal_hold_id', v_hold_id,
        'period_start', p_period_start,
        'period_end', p_period_end,
        'archive_manifest_id', p_archive_manifest_id
      )
    );
    raise exception 'active legal hold blocks this operation: %', v_hold_id;
  end if;
end;
$$;

create or replace function close_admin_incident_review(
  p_admin_auth_user_id uuid,
  p_incident_review_id uuid,
  p_closure_reason text,
  p_findings text,
  p_corrective_actions text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_review admin_incident_reviews%rowtype;
  v_admin admin_users%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_closure_reason is null or length(trim(p_closure_reason)) = 0 then
    raise exception 'closure reason is required';
  end if;

  if p_findings is null or length(trim(p_findings)) = 0 then
    raise exception 'findings are required';
  end if;

  if p_corrective_actions is null or length(trim(p_corrective_actions)) = 0 then
    raise exception 'corrective actions are required';
  end if;

  select *
  into v_review
  from admin_incident_reviews
  where id = p_incident_review_id
  for update;

  if v_review.id is null then
    raise exception 'admin incident review not found: %', p_incident_review_id;
  end if;

  if v_review.status in ('closed', 'dismissed') then
    raise exception 'incident review already closed';
  end if;

  if exists (
    select 1
    from admin_incident_corrective_actions ca
    where ca.admin_incident_review_id = p_incident_review_id
      and ca.status in ('open', 'assigned', 'in_progress', 'overdue')
  ) then
    perform record_admin_security_policy_evaluation(
      'incident_reviews_require_corrective_action_or_no_action_reason',
      'block_review_closure_with_open_corrective_actions',
      'corrective_action',
      'blocked',
      p_admin_auth_user_id,
      null,
      'admin_incident_review',
      p_incident_review_id,
      'close_admin_incident_review',
      p_request_id,
      'Incident review closure blocked by open corrective actions.',
      p_metadata
    );
    raise exception 'cannot close incident review with open corrective actions';
  end if;

  if not exists (
    select 1
    from admin_incident_corrective_actions ca
    where ca.admin_incident_review_id = p_incident_review_id
  )
  and lower(trim(p_corrective_actions)) not like '%no corrective action%' then
    raise exception 'incident review requires corrective actions or explicit no-action justification';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  update admin_incident_reviews
  set
    status = 'closed',
    closed_by_auth_user_id = p_admin_auth_user_id,
    closed_by_admin_user_id = v_admin.id,
    closed_at = now(),
    closure_reason = p_closure_reason,
    findings = p_findings,
    corrective_actions = p_corrective_actions,
    metadata = metadata || p_metadata || jsonb_build_object('closure_request_id', p_request_id),
    updated_at = now()
  where id = v_review.id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'close_admin_incident_review',
    'admin.write',
    'admin_incident_review',
    v_review.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_closure_reason,
    p_metadata || jsonb_build_object(
      'findings_length',
      length(p_findings),
      'corrective_actions_length',
      length(p_corrective_actions)
    )
  );

  perform create_admin_security_alert(
    'admin_incident_review_closed',
    'high',
    p_admin_auth_user_id,
    v_review.assigned_to_auth_user_id,
    'close_admin_incident_review',
    null,
    'Admin incident review was closed.',
    p_metadata || jsonb_build_object(
      'request_id',
      p_request_id,
      'admin_incident_review_id',
      v_review.id,
      'source_type',
      v_review.source_type,
      'source_id',
      v_review.source_id
    )
  );

  return v_review.id;
end;
$$;

create or replace function hash_admin_security_governance_policy(
  p_admin_security_governance_policy_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_policy admin_security_governance_policies%rowtype;
  v_rules jsonb;
  v_payload jsonb;
begin
  select *
  into v_policy
  from admin_security_governance_policies
  where id = p_admin_security_governance_policy_id;

  if v_policy.id is null then
    raise exception 'admin security governance policy not found: %', p_admin_security_governance_policy_id;
  end if;

  select coalesce(jsonb_agg(to_jsonb(r) order by r.rule_key), '[]'::jsonb)
  into v_rules
  from admin_security_governance_policy_rules r
  where r.admin_security_governance_policy_id = v_policy.id;

  v_payload := jsonb_build_object(
    'source_type', 'admin_security_governance_policy',
    'source_id', v_policy.id,
    'policy_key', v_policy.policy_key,
    'policy_name', v_policy.policy_name,
    'category', v_policy.category,
    'status', v_policy.status,
    'version', v_policy.version,
    'severity', v_policy.severity,
    'owner_team', v_policy.owner_team,
    'description', v_policy.description,
    'effective_at', v_policy.effective_at,
    'expires_at', v_policy.expires_at,
    'rules', v_rules,
    'created_at', v_policy.created_at,
    'updated_at', v_policy.updated_at
  );

  return append_audit_hash_chain_entry(
    'admin_security_governance_policy',
    v_policy.id,
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
  'admin_incident_review'::text as source_type,
  r.id as source_id,
  r.created_at
from admin_incident_reviews r
where r.status in ('closed', 'dismissed')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_incident_review'
      and ahc.source_id = r.id
  )
union all
select
  'admin_incident_corrective_action'::text as source_type,
  ca.id as source_id,
  ca.created_at
from admin_incident_corrective_actions ca
where ca.status in ('completed', 'dismissed')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_incident_corrective_action'
      and ahc.source_id = ca.id
  )
union all
select
  'admin_security_daily_snapshot'::text as source_type,
  s.id as source_id,
  s.created_at
from admin_security_daily_snapshots s
where s.snapshot_date < current_date
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_daily_snapshot'
      and ahc.source_id = s.id
  )
union all
select
  'admin_security_report_export'::text as source_type,
  r.id as source_id,
  r.created_at
from admin_security_report_exports r
where r.status in ('generated', 'exported', 'archived')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_report_export'
      and ahc.source_id = r.id
  )
union all
select
  'admin_security_archive_manifest'::text as source_type,
  m.id as source_id,
  m.created_at
from admin_security_archive_manifests m
where m.status in ('sealed', 'verified')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_archive_manifest'
      and ahc.source_id = m.id
  )
union all
select
  'admin_security_deletion_request'::text as source_type,
  r.id as source_id,
  r.created_at
from admin_security_deletion_requests r
where r.status in ('rejected', 'executed', 'failed', 'cancelled')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_deletion_request'
      and ahc.source_id = r.id
  )
union all
select
  'admin_security_legal_hold'::text as source_type,
  h.id as source_id,
  h.created_at
from admin_security_legal_holds h
where h.status in ('released', 'expired', 'cancelled')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_legal_hold'
      and ahc.source_id = h.id
  )
union all
select
  'admin_security_governance_policy'::text as source_type,
  p.id as source_id,
  p.created_at
from admin_security_governance_policies p
where p.status in ('active', 'superseded', 'archived')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_governance_policy'
      and ahc.source_id = p.id
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

  insert into audit_hash_backfill_runs (status, metadata)
  values ('processing', coalesce(p_metadata, '{}'::jsonb))
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
        perform hash_wallet_ledger_entry(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'accounting_journal_entry' then
        perform hash_accounting_journal_entry(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'reward_issuance_group' then
        perform hash_reward_issuance_group(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'attention_verification_event' then
        perform hash_attention_verification_event(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'withdrawal_request' then
        perform hash_withdrawal_request(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'external_payout' then
        perform hash_external_payout(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'admin_incident_review' then
        perform hash_admin_incident_review(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'admin_incident_corrective_action' then
        perform hash_admin_incident_corrective_action(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      elsif v_row.source_type = 'admin_security_daily_snapshot' then
        perform hash_admin_security_daily_snapshot(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      elsif v_row.source_type = 'admin_security_report_export' then
        perform hash_admin_security_report_export(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      elsif v_row.source_type = 'admin_security_archive_manifest' then
        perform hash_admin_security_archive_manifest(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      elsif v_row.source_type = 'admin_security_deletion_request' then
        perform hash_admin_security_deletion_request(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      elsif v_row.source_type = 'admin_security_legal_hold' then
        perform hash_admin_security_legal_hold(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      elsif v_row.source_type = 'admin_security_governance_policy' then
        perform hash_admin_security_governance_policy(
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

alter table admin_security_governance_policies enable row level security;
alter table admin_security_governance_policy_rules enable row level security;
alter table admin_security_policy_evaluations enable row level security;

create policy admin_security_governance_policies_no_user_direct_access
on admin_security_governance_policies
for all
to authenticated
using (false)
with check (false);

create policy admin_security_governance_policy_rules_no_user_direct_access
on admin_security_governance_policy_rules
for all
to authenticated
using (false)
with check (false);

create policy admin_security_policy_evaluations_no_user_direct_access
on admin_security_policy_evaluations
for all
to authenticated
using (false)
with check (false);

create policy admin_api_all_admin_security_governance_policies
on admin_security_governance_policies
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_admin_security_governance_policy_rules
on admin_security_governance_policy_rules
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_read_admin_security_policy_evaluations
on admin_security_policy_evaluations
for select
to admin_api_role
using (true);

create policy worker_insert_admin_security_policy_evaluations
on admin_security_policy_evaluations
for insert
to worker_role
with check (true);

grant execute on function record_admin_security_policy_evaluation(
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  text,
  uuid,
  text,
  text,
  text,
  jsonb
) to admin_api_role, worker_role;

grant execute on function hash_admin_security_governance_policy(uuid, jsonb)
to worker_role, admin_api_role;

alter function record_admin_security_policy_evaluation(
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  text,
  uuid,
  text,
  text,
  text,
  jsonb
) security definer;

alter function record_admin_security_policy_evaluation(
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  text,
  uuid,
  text,
  text,
  text,
  jsonb
) set search_path = public;

alter function hash_admin_security_governance_policy(uuid, jsonb) security definer;
alter function hash_admin_security_governance_policy(uuid, jsonb) set search_path = public;

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
    'ADMIN_SECURITY_POLICY_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Security governance policy not found.',
    'Admin security governance policy not found.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_POLICY_EVALUATION_FAILED',
    'system',
    'high',
    500,
    true,
    false,
    'Security policy evaluation failed.',
    'Admin security policy evaluation failed.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_POLICY_INVALID',
    'validation',
    'medium',
    400,
    false,
    true,
    'Invalid security governance policy.',
    'Admin security governance policy invalid.',
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
  ('admin security governance policy not found', 'ADMIN_SECURITY_POLICY_NOT_FOUND', 5, '{}'),
  ('policy key is required', 'ADMIN_SECURITY_POLICY_INVALID', 5, '{}'),
  ('policy category is required', 'ADMIN_SECURITY_POLICY_INVALID', 5, '{}'),
  ('invalid policy evaluation status', 'ADMIN_SECURITY_POLICY_INVALID', 5, '{}')
on conflict do nothing;
