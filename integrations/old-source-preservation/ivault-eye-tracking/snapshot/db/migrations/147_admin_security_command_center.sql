-- Step 9.32 — Build unified admin security command center cockpit.
-- Runs after 146_admin_incident_corrective_actions.sql.

create or replace view admin_security_command_center_summary as
select
  now() as checked_at,

  (
    select count(*)
    from admin_security_alert_events
    where status in ('open', 'acknowledged')
  ) as open_alert_count,

  (
    select count(*)
    from admin_security_alert_events
    where severity = 'critical'
      and status in ('open', 'acknowledged')
  ) as open_critical_alert_count,

  (
    select count(*)
    from admin_security_alert_escalation_events
    where created_at >= now() - interval '24 hours'
  ) as alert_escalation_count_24h,

  (
    select count(*)
    from admin_incident_reviews
    where status in ('open', 'assigned', 'investigating', 'overdue')
  ) as open_incident_review_count,

  (
    select count(*)
    from admin_incident_reviews
    where status = 'overdue'
      or (
        status in ('open', 'assigned', 'investigating')
        and due_at <= now()
      )
  ) as overdue_incident_review_count,

  (
    select count(*)
    from admin_incident_corrective_actions
    where status in ('open', 'assigned', 'in_progress', 'overdue')
  ) as open_corrective_action_count,

  (
    select count(*)
    from admin_incident_corrective_actions
    where status = 'overdue'
      or (
        status in ('open', 'assigned', 'in_progress')
        and due_at <= now()
      )
  ) as overdue_corrective_action_count,

  (
    select count(*)
    from admin_session_controls
    where status = 'active'
  ) as active_session_count,

  (
    select count(*)
    from admin_session_controls
    where status = 'reauth_required'
  ) as reauth_required_session_count,

  (
    select count(*)
    from admin_session_controls
    where status = 'revoked'
      and revoked_at >= now() - interval '24 hours'
  ) as revoked_session_count_24h,

  (
    select count(*)
    from admin_devices
    where status = 'unknown'
  ) as unknown_device_count,

  (
    select count(*)
    from admin_devices
    where status = 'suspicious'
  ) as suspicious_device_count,

  (
    select count(*)
    from admin_devices
    where status in ('blocked', 'revoked')
  ) as blocked_or_revoked_device_count,

  (
    select count(*)
    from admin_users au
    where au.status = 'active'
      and exists (
        select 1
        from admin_role_assignments ara
        join admin_roles ar
          on ar.id = ara.admin_role_id
        where ara.admin_user_id = au.id
          and ara.status = 'active'
          and ar.role_key = 'super_admin'
          and (ara.expires_at is null or ara.expires_at > now())
      )
      and admin_has_active_mfa_factor(au.user_id) is not true
  ) as super_admin_without_active_mfa_count,

  (
    select count(*)
    from admin_mfa_recovery_codes
    where status = 'active'
  ) as active_recovery_code_count,

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
    from audit_hash_missing_records
  ) as audit_hash_missing_count,

  case
    when (
      (
        select count(*)
        from admin_security_alert_events
        where severity = 'critical'
          and status in ('open', 'acknowledged')
      ) > 0
      or (
        select count(*)
        from admin_incident_reviews
        where status = 'overdue'
          or (
            status in ('open', 'assigned', 'investigating')
            and due_at <= now()
          )
      ) > 0
      or (
        select count(*)
        from admin_incident_corrective_actions
        where status = 'overdue'
          or (
            status in ('open', 'assigned', 'in_progress')
            and due_at <= now()
          )
      ) > 0
      or (
        select count(*)
        from admin_break_glass_requests
        where status = 'executed'
          and expires_at > now()
      ) > 0
      or (
        select count(*)
        from audit_hash_missing_records
      ) > 0
    )
    then 'critical'

    when (
      (
        select count(*)
        from admin_security_alert_events
        where status in ('open', 'acknowledged')
      ) > 0
      or (
        select count(*)
        from admin_devices
        where status in ('unknown', 'suspicious')
      ) > 0
      or (
        select count(*)
        from admin_session_controls
        where status = 'reauth_required'
      ) > 0
    )
    then 'warning'

    else 'healthy'
  end as security_status;

grant select on admin_security_command_center_summary to admin_api_role;

create or replace view admin_security_priority_queue as
select
  'break_glass'::text as item_type,
  bgr.id as item_id,
  'critical'::text as severity,
  1000 as priority_score,
  'active_break_glass_access'::text as reason_code,
  'Active break-glass access is live.'::text as title,
  bgr.reason as summary,
  bgr.target_auth_user_id as target_auth_user_id,
  bgr.requested_by_auth_user_id as actor_auth_user_id,
  bgr.created_at,
  bgr.expires_at as due_at,
  jsonb_build_object(
    'status', bgr.status,
    'expires_at', bgr.expires_at
  ) as metadata
from admin_break_glass_requests bgr
where bgr.status = 'executed'
  and bgr.expires_at > now()

union all

select
  'incident_review'::text as item_type,
  r.id as item_id,
  r.severity,
  case when r.severity = 'critical' then 950 else 850 end as priority_score,
  'incident_review_overdue'::text as reason_code,
  r.title,
  r.summary,
  r.assigned_to_auth_user_id as target_auth_user_id,
  r.opened_by_auth_user_id as actor_auth_user_id,
  r.created_at,
  r.due_at,
  jsonb_build_object(
    'status', r.status,
    'source_type', r.source_type,
    'source_id', r.source_id
  ) as metadata
from admin_incident_reviews r
where r.status = 'overdue'
   or (
    r.status in ('open', 'assigned', 'investigating')
    and r.due_at <= now()
   )

union all

select
  'corrective_action'::text as item_type,
  ca.id as item_id,
  case when ca.priority = 'critical' then 'critical' else 'high' end as severity,
  case when ca.priority = 'critical' then 925 else 825 end as priority_score,
  'corrective_action_overdue'::text as reason_code,
  ca.title,
  ca.description as summary,
  ca.assigned_to_auth_user_id as target_auth_user_id,
  ca.created_by_auth_user_id as actor_auth_user_id,
  ca.created_at,
  ca.due_at,
  jsonb_build_object(
    'status', ca.status,
    'priority', ca.priority,
    'admin_incident_review_id', ca.admin_incident_review_id
  ) as metadata
from admin_incident_corrective_actions ca
where ca.status = 'overdue'
   or (
    ca.status in ('open', 'assigned', 'in_progress')
    and ca.due_at <= now()
   )

union all

select
  'security_alert'::text as item_type,
  ase.id as item_id,
  ase.severity,
  900 as priority_score,
  'open_critical_alert'::text as reason_code,
  ase.alert_key as title,
  ase.message as summary,
  ase.target_auth_user_id,
  ase.actor_auth_user_id,
  ase.created_at,
  null::timestamptz as due_at,
  jsonb_build_object(
    'status', ase.status,
    'action_key', ase.action_key
  ) as metadata
from admin_security_alert_events ase
where ase.severity = 'critical'
  and ase.status in ('open', 'acknowledged')

union all

select
  'mfa_gap'::text as item_type,
  au.id as item_id,
  'critical'::text as severity,
  875 as priority_score,
  'super_admin_without_active_mfa'::text as reason_code,
  'Super admin without active MFA'::text as title,
  'An active super_admin has no active MFA factor.'::text as summary,
  au.user_id as target_auth_user_id,
  null::uuid as actor_auth_user_id,
  au.created_at,
  null::timestamptz as due_at,
  jsonb_build_object(
    'email', au.email,
    'display_name', au.display_name
  ) as metadata
from admin_users au
where au.status = 'active'
  and exists (
    select 1
    from admin_role_assignments ara
    join admin_roles ar
      on ar.id = ara.admin_role_id
    where ara.admin_user_id = au.id
      and ara.status = 'active'
      and ar.role_key = 'super_admin'
      and (ara.expires_at is null or ara.expires_at > now())
  )
  and admin_has_active_mfa_factor(au.user_id) is not true

union all

select
  'admin_device'::text as item_type,
  d.id as item_id,
  case
    when d.status in ('blocked', 'revoked') then 'critical'
    when d.status = 'suspicious' then 'high'
    else 'high'
  end as severity,
  case
    when d.status in ('blocked', 'revoked') then 850
    when d.status = 'suspicious' then 775
    else 675
  end as priority_score,
  'admin_device_attention_required'::text as reason_code,
  'Admin device requires review'::text as title,
  'Admin device status is ' || d.status || '.' as summary,
  d.admin_auth_user_id as target_auth_user_id,
  null::uuid as actor_auth_user_id,
  d.created_at,
  null::timestamptz as due_at,
  jsonb_build_object(
    'status', d.status,
    'risk_score', d.risk_score,
    'trust_score', d.trust_score
  ) as metadata
from admin_devices d
where d.status in ('unknown', 'suspicious', 'blocked', 'revoked')

union all

select
  'admin_session'::text as item_type,
  sc.id as item_id,
  'high'::text as severity,
  650 as priority_score,
  'admin_session_reauth_required'::text as reason_code,
  'Admin session requires reauthentication'::text as title,
  coalesce(sc.forced_reauth_reason, 'Admin session requires reauthentication.') as summary,
  sc.admin_auth_user_id as target_auth_user_id,
  sc.revoked_by_auth_user_id as actor_auth_user_id,
  sc.created_at,
  null::timestamptz as due_at,
  jsonb_build_object(
    'status', sc.status,
    'session_id', sc.session_id,
    'forced_reauth_required', sc.forced_reauth_required
  ) as metadata
from admin_session_controls sc
where sc.status = 'reauth_required'

union all

select
  'security_alert'::text as item_type,
  ase.id as item_id,
  ase.severity,
  600 as priority_score,
  'open_high_alert'::text as reason_code,
  ase.alert_key as title,
  ase.message as summary,
  ase.target_auth_user_id,
  ase.actor_auth_user_id,
  ase.created_at,
  null::timestamptz as due_at,
  jsonb_build_object(
    'status', ase.status,
    'action_key', ase.action_key
  ) as metadata
from admin_security_alert_events ase
where ase.severity = 'high'
  and ase.status in ('open', 'acknowledged')

order by priority_score desc, created_at asc;

grant select on admin_security_priority_queue to admin_api_role;

create or replace view admin_security_timeline as
select
  'security_alert'::text as event_type,
  ase.id as event_id,
  ase.severity,
  ase.alert_key as event_key,
  ase.message as event_message,
  ase.actor_auth_user_id,
  ase.target_auth_user_id,
  ase.action_key,
  ase.created_at,
  jsonb_build_object(
    'status', ase.status,
    'privileged_action_request_id', ase.privileged_action_request_id
  ) as metadata
from admin_security_alert_events ase

union all

select
  'alert_escalation'::text as event_type,
  e.id as event_id,
  e.severity,
  e.escalation_key as event_key,
  e.reason_message as event_message,
  null::uuid as actor_auth_user_id,
  coalesce(ase.target_auth_user_id, par.target_auth_user_id) as target_auth_user_id,
  coalesce(ase.action_key, par.action_key) as action_key,
  e.created_at,
  jsonb_build_object(
    'status', e.status,
    'reason_code', e.reason_code,
    'escalation_count', e.escalation_count
  ) as metadata
from admin_security_alert_escalation_events e
left join admin_security_alert_events ase
  on ase.id = e.admin_security_alert_event_id
left join admin_privileged_action_requests par
  on par.id = e.privileged_action_request_id

union all

select
  'incident_review'::text as event_type,
  r.id as event_id,
  r.severity,
  r.status as event_key,
  r.title as event_message,
  r.opened_by_auth_user_id as actor_auth_user_id,
  r.assigned_to_auth_user_id as target_auth_user_id,
  null::text as action_key,
  r.created_at,
  jsonb_build_object(
    'source_type', r.source_type,
    'source_id', r.source_id,
    'due_at', r.due_at,
    'status', r.status
  ) as metadata
from admin_incident_reviews r

union all

select
  'corrective_action'::text as event_type,
  ca.id as event_id,
  case when ca.priority = 'critical' then 'critical' else 'high' end as severity,
  ca.status as event_key,
  ca.title as event_message,
  ca.created_by_auth_user_id as actor_auth_user_id,
  ca.assigned_to_auth_user_id as target_auth_user_id,
  null::text as action_key,
  ca.created_at,
  jsonb_build_object(
    'admin_incident_review_id', ca.admin_incident_review_id,
    'priority', ca.priority,
    'status', ca.status,
    'due_at', ca.due_at
  ) as metadata
from admin_incident_corrective_actions ca

union all

select
  'break_glass'::text as event_type,
  bgr.id as event_id,
  'critical'::text as severity,
  bgr.status as event_key,
  'Break-glass request ' || bgr.status as event_message,
  bgr.requested_by_auth_user_id as actor_auth_user_id,
  bgr.target_auth_user_id,
  'admin_break_glass'::text as action_key,
  bgr.created_at,
  jsonb_build_object(
    'expires_at', bgr.expires_at,
    'executed_at', bgr.executed_at,
    'revoked_at', bgr.revoked_at
  ) as metadata
from admin_break_glass_requests bgr

union all

select
  'admin_session_control'::text as event_type,
  sc.id as event_id,
  case
    when sc.status = 'revoked' then 'critical'
    when sc.status = 'reauth_required' then 'high'
    else 'medium'
  end as severity,
  sc.status as event_key,
  'Admin session ' || sc.status as event_message,
  sc.revoked_by_auth_user_id as actor_auth_user_id,
  sc.admin_auth_user_id as target_auth_user_id,
  'admin_session_control'::text as action_key,
  sc.updated_at as created_at,
  jsonb_build_object(
    'session_id', sc.session_id,
    'forced_reauth_required', sc.forced_reauth_required,
    'revoked_reason', sc.revoked_reason
  ) as metadata
from admin_session_controls sc

union all

select
  'admin_device'::text as event_type,
  d.id as event_id,
  case
    when d.status in ('blocked', 'revoked') then 'critical'
    when d.status = 'suspicious' then 'high'
    else 'medium'
  end as severity,
  d.status as event_key,
  'Admin device ' || d.status as event_message,
  null::uuid as actor_auth_user_id,
  d.admin_auth_user_id as target_auth_user_id,
  'admin_device_status'::text as action_key,
  d.updated_at as created_at,
  jsonb_build_object(
    'status', d.status,
    'risk_score', d.risk_score,
    'trust_score', d.trust_score
  ) as metadata
from admin_devices d

order by created_at desc;

grant select on admin_security_timeline to admin_api_role;

create or replace view admin_security_actor_rollup as
select
  au.id as admin_user_id,
  au.user_id as admin_auth_user_id,
  au.email,
  au.display_name,
  au.status,

  exists (
    select 1
    from admin_role_assignments ara
    join admin_roles ar
      on ar.id = ara.admin_role_id
    where ara.admin_user_id = au.id
      and ara.status = 'active'
      and ar.role_key = 'super_admin'
      and (ara.expires_at is null or ara.expires_at > now())
  ) as is_super_admin,

  admin_has_active_mfa_factor(au.user_id) as has_active_mfa_factor,

  (
    select max(v.verified_at)
    from admin_mfa_verifications v
    where v.admin_auth_user_id = au.user_id
  ) as last_mfa_verified_at,

  (
    select count(*)
    from admin_devices d
    where d.admin_auth_user_id = au.user_id
      and d.status = 'trusted'
  ) as trusted_device_count,

  (
    select count(*)
    from admin_devices d
    where d.admin_auth_user_id = au.user_id
      and d.status in ('unknown', 'suspicious', 'blocked', 'revoked')
  ) as risky_device_count,

  (
    select count(*)
    from admin_session_controls sc
    where sc.admin_auth_user_id = au.user_id
      and sc.status = 'active'
  ) as active_session_count,

  (
    select count(*)
    from admin_session_controls sc
    where sc.admin_auth_user_id = au.user_id
      and sc.status = 'reauth_required'
  ) as reauth_required_session_count,

  (
    select count(*)
    from admin_security_alert_events ase
    where (
      ase.actor_auth_user_id = au.user_id
      or ase.target_auth_user_id = au.user_id
    )
    and ase.status in ('open', 'acknowledged')
  ) as open_alert_count,

  (
    select count(*)
    from admin_security_alert_events ase
    where (
      ase.actor_auth_user_id = au.user_id
      or ase.target_auth_user_id = au.user_id
    )
    and ase.severity = 'critical'
    and ase.status in ('open', 'acknowledged')
  ) as open_critical_alert_count,

  (
    select count(*)
    from admin_incident_reviews r
    where r.assigned_to_auth_user_id = au.user_id
      and r.status in ('open', 'assigned', 'investigating', 'overdue')
  ) as assigned_open_incident_review_count,

  (
    select count(*)
    from admin_incident_corrective_actions ca
    where ca.assigned_to_auth_user_id = au.user_id
      and ca.status in ('open', 'assigned', 'in_progress', 'overdue')
  ) as assigned_open_corrective_action_count,

  (
    select count(*)
    from admin_break_glass_requests bgr
    where (
      bgr.requested_by_auth_user_id = au.user_id
      or bgr.target_auth_user_id = au.user_id
      or bgr.approved_by_auth_user_id = au.user_id
      or bgr.executed_by_auth_user_id = au.user_id
    )
    and bgr.created_at >= now() - interval '30 days'
  ) as break_glass_related_count_30d,

  case
    when exists (
      select 1
      from admin_role_assignments ara
      join admin_roles ar
        on ar.id = ara.admin_role_id
      where ara.admin_user_id = au.id
        and ara.status = 'active'
        and ar.role_key = 'super_admin'
        and (ara.expires_at is null or ara.expires_at > now())
    )
    and admin_has_active_mfa_factor(au.user_id) is not true
    then 'critical'

    when (
      select count(*)
      from admin_security_alert_events ase
      where (
        ase.actor_auth_user_id = au.user_id
        or ase.target_auth_user_id = au.user_id
      )
      and ase.severity = 'critical'
      and ase.status in ('open', 'acknowledged')
    ) > 0
    then 'critical'

    when (
      select count(*)
      from admin_devices d
      where d.admin_auth_user_id = au.user_id
        and d.status in ('suspicious', 'blocked', 'revoked')
    ) > 0
    then 'warning'

    when (
      select count(*)
      from admin_session_controls sc
      where sc.admin_auth_user_id = au.user_id
        and sc.status = 'reauth_required'
    ) > 0
    then 'warning'

    else 'healthy'
  end as posture_status

from admin_users au
where au.status in ('active', 'suspended')
order by
  case
    when au.status = 'active' then 0 else 1
  end,
  au.created_at desc;

grant select on admin_security_actor_rollup to admin_api_role;

create or replace view admin_security_posture_checks as
select
  'super_admin_mfa'::text as check_key,
  'critical'::text as severity,
  case
    when (
      select count(*)
      from admin_users au
      where au.status = 'active'
        and exists (
          select 1
          from admin_role_assignments ara
          join admin_roles ar
            on ar.id = ara.admin_role_id
          where ara.admin_user_id = au.id
            and ara.status = 'active'
            and ar.role_key = 'super_admin'
            and (ara.expires_at is null or ara.expires_at > now())
        )
        and admin_has_active_mfa_factor(au.user_id) is not true
    ) = 0
    then 'pass'
    else 'fail'
  end as status,
  'Every active super_admin must have at least one active MFA factor.'::text as description,
  (
    select count(*)
    from admin_users au
    where au.status = 'active'
      and exists (
        select 1
        from admin_role_assignments ara
        join admin_roles ar
          on ar.id = ara.admin_role_id
        where ara.admin_user_id = au.id
          and ara.status = 'active'
          and ar.role_key = 'super_admin'
          and (ara.expires_at is null or ara.expires_at > now())
      )
      and admin_has_active_mfa_factor(au.user_id) is not true
  ) as failing_count,
  now() as checked_at

union all

select
  'open_critical_alerts'::text,
  'critical'::text,
  case
    when (
      select count(*)
      from admin_security_alert_events
      where severity = 'critical'
        and status in ('open', 'acknowledged')
    ) = 0
    then 'pass'
    else 'fail'
  end,
  'No critical admin security alert should remain open.'::text,
  (
    select count(*)
    from admin_security_alert_events
    where severity = 'critical'
      and status in ('open', 'acknowledged')
  ),
  now()

union all

select
  'overdue_incident_reviews'::text,
  'critical'::text,
  case
    when (
      select count(*)
      from admin_incident_reviews
      where status = 'overdue'
        or (
          status in ('open', 'assigned', 'investigating')
          and due_at <= now()
        )
    ) = 0
    then 'pass'
    else 'fail'
  end,
  'No incident review should be overdue.'::text,
  (
    select count(*)
    from admin_incident_reviews
    where status = 'overdue'
      or (
        status in ('open', 'assigned', 'investigating')
        and due_at <= now()
      )
  ),
  now()

union all

select
  'overdue_corrective_actions'::text,
  'critical'::text,
  case
    when (
      select count(*)
      from admin_incident_corrective_actions
      where status = 'overdue'
        or (
          status in ('open', 'assigned', 'in_progress')
          and due_at <= now()
        )
    ) = 0
    then 'pass'
    else 'fail'
  end,
  'No corrective action should be overdue.'::text,
  (
    select count(*)
    from admin_incident_corrective_actions
    where status = 'overdue'
      or (
        status in ('open', 'assigned', 'in_progress')
        and due_at <= now()
      )
  ),
  now()

union all

select
  'active_break_glass_access'::text,
  'critical'::text,
  case
    when (
      select count(*)
      from admin_break_glass_requests
      where status = 'executed'
        and expires_at > now()
    ) = 0
    then 'pass'
    else 'fail'
  end,
  'No break-glass access should be active outside an emergency.'::text,
  (
    select count(*)
    from admin_break_glass_requests
    where status = 'executed'
      and expires_at > now()
  ),
  now()

union all

select
  'audit_hash_missing'::text,
  'critical'::text,
  case
    when (
      select count(*)
      from audit_hash_missing_records
    ) = 0
    then 'pass'
    else 'fail'
  end,
  'All hash-required audit/security records should be in the audit hash chain.'::text,
  (
    select count(*)
    from audit_hash_missing_records
  ),
  now()

union all

select
  'unknown_admin_devices'::text,
  'high'::text,
  case
    when (
      select count(*)
      from admin_devices
      where status = 'unknown'
    ) = 0
    then 'pass'
    else 'warn'
  end,
  'Unknown admin devices should be reviewed and trusted/suspicious/blocked.'::text,
  (
    select count(*)
    from admin_devices
    where status = 'unknown'
  ),
  now()

union all

select
  'reauth_required_sessions'::text,
  'high'::text,
  case
    when (
      select count(*)
      from admin_session_controls
      where status = 'reauth_required'
    ) = 0
    then 'pass'
    else 'warn'
  end,
  'Admin sessions requiring reauthentication should be resolved.'::text,
  (
    select count(*)
    from admin_session_controls
    where status = 'reauth_required'
  ),
  now();

grant select on admin_security_posture_checks to admin_api_role;

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
    'ADMIN_SECURITY_CENTER_QUERY_FAILED',
    'system',
    'medium',
    500,
    true,
    false,
    'Security command center query failed.',
    'Admin security command center query failed.',
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
