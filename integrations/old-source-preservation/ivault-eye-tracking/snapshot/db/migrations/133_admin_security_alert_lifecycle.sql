-- Step 9.18 — Admin security alert acknowledgment / resolution workflow.
-- Runs after 132_admin_alert_delivery_provider_boundary.sql.

create or replace function acknowledge_admin_security_alert(
  p_admin_auth_user_id uuid,
  p_admin_security_alert_event_id uuid,
  p_note text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_alert admin_security_alert_events%rowtype;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_admin_security_alert_event_id is null then
    raise exception 'admin security alert event id is required';
  end if;

  if admin_has_permission(p_admin_auth_user_id, 'admin.read') is not true then
    perform record_admin_action(
      p_admin_auth_user_id,
      'acknowledge_admin_security_alert',
      'admin.read',
      'admin_security_alert_event',
      p_admin_security_alert_event_id,
      p_request_id,
      null,
      null,
      'denied',
      'missing admin.read permission',
      p_metadata
    );

    raise exception 'missing required permission: admin.read';
  end if;

  select *
  into v_alert
  from admin_security_alert_events
  where id = p_admin_security_alert_event_id
  for update;

  if v_alert.id is null then
    raise exception 'admin security alert event not found: %', p_admin_security_alert_event_id;
  end if;

  if v_alert.status not in ('open') then
    raise exception 'admin security alert cannot be acknowledged from status: %', v_alert.status;
  end if;

  update admin_security_alert_events
  set
    status = 'acknowledged',
    acknowledged_by_auth_user_id = p_admin_auth_user_id,
    acknowledged_at = now(),
    metadata = metadata || p_metadata || jsonb_build_object(
      'acknowledgement_note',
      p_note,
      'request_id',
      p_request_id
    ),
    updated_at = now()
  where id = v_alert.id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'acknowledge_admin_security_alert',
    'admin.read',
    'admin_security_alert_event',
    v_alert.id,
    p_request_id,
    null,
    null,
    'allowed',
    coalesce(p_note, 'security alert acknowledged'),
    p_metadata || jsonb_build_object(
      'alert_key',
      v_alert.alert_key,
      'severity',
      v_alert.severity
    )
  );

  return v_alert.id;
end;
$$;

create or replace function resolve_admin_security_alert(
  p_admin_auth_user_id uuid,
  p_admin_security_alert_event_id uuid,
  p_resolution_note text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_alert admin_security_alert_events%rowtype;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_admin_security_alert_event_id is null then
    raise exception 'admin security alert event id is required';
  end if;

  if p_resolution_note is null or length(trim(p_resolution_note)) = 0 then
    raise exception 'resolution note is required';
  end if;

  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    perform record_admin_action(
      p_admin_auth_user_id,
      'resolve_admin_security_alert',
      'admin.write',
      'admin_security_alert_event',
      p_admin_security_alert_event_id,
      p_request_id,
      null,
      null,
      'denied',
      'missing admin.write permission',
      p_metadata
    );

    raise exception 'missing required permission: admin.write';
  end if;

  select *
  into v_alert
  from admin_security_alert_events
  where id = p_admin_security_alert_event_id
  for update;

  if v_alert.id is null then
    raise exception 'admin security alert event not found: %', p_admin_security_alert_event_id;
  end if;

  if v_alert.status not in ('open', 'acknowledged') then
    raise exception 'admin security alert cannot be resolved from status: %', v_alert.status;
  end if;

  update admin_security_alert_events
  set
    status = 'resolved',
    resolved_by_auth_user_id = p_admin_auth_user_id,
    resolved_at = now(),
    resolution_note = p_resolution_note,
    metadata = metadata || p_metadata || jsonb_build_object(
      'request_id',
      p_request_id
    ),
    updated_at = now()
  where id = v_alert.id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'resolve_admin_security_alert',
    'admin.write',
    'admin_security_alert_event',
    v_alert.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_resolution_note,
    p_metadata || jsonb_build_object(
      'alert_key',
      v_alert.alert_key,
      'severity',
      v_alert.severity
    )
  );

  return v_alert.id;
end;
$$;

create or replace function dismiss_admin_security_alert(
  p_admin_auth_user_id uuid,
  p_admin_security_alert_event_id uuid,
  p_dismissal_reason text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_alert admin_security_alert_events%rowtype;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_admin_security_alert_event_id is null then
    raise exception 'admin security alert event id is required';
  end if;

  if p_dismissal_reason is null or length(trim(p_dismissal_reason)) = 0 then
    raise exception 'dismissal reason is required';
  end if;

  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    perform record_admin_action(
      p_admin_auth_user_id,
      'dismiss_admin_security_alert',
      'admin.write',
      'admin_security_alert_event',
      p_admin_security_alert_event_id,
      p_request_id,
      null,
      null,
      'denied',
      'missing admin.write permission',
      p_metadata
    );

    raise exception 'missing required permission: admin.write';
  end if;

  select *
  into v_alert
  from admin_security_alert_events
  where id = p_admin_security_alert_event_id
  for update;

  if v_alert.id is null then
    raise exception 'admin security alert event not found: %', p_admin_security_alert_event_id;
  end if;

  if v_alert.status not in ('open', 'acknowledged') then
    raise exception 'admin security alert cannot be dismissed from status: %', v_alert.status;
  end if;

  update admin_security_alert_events
  set
    status = 'dismissed',
    resolved_by_auth_user_id = p_admin_auth_user_id,
    resolved_at = now(),
    resolution_note = p_dismissal_reason,
    metadata = metadata || p_metadata || jsonb_build_object(
      'dismissal_reason',
      p_dismissal_reason,
      'request_id',
      p_request_id
    ),
    updated_at = now()
  where id = v_alert.id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'dismiss_admin_security_alert',
    'admin.write',
    'admin_security_alert_event',
    v_alert.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_dismissal_reason,
    p_metadata || jsonb_build_object(
      'alert_key',
      v_alert.alert_key,
      'severity',
      v_alert.severity
    )
  );

  return v_alert.id;
end;
$$;

grant execute on function acknowledge_admin_security_alert(
  uuid,
  uuid,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function resolve_admin_security_alert(
  uuid,
  uuid,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function dismiss_admin_security_alert(
  uuid,
  uuid,
  text,
  text,
  jsonb
) to admin_api_role;

alter function acknowledge_admin_security_alert(
  uuid,
  uuid,
  text,
  text,
  jsonb
) security definer;

alter function acknowledge_admin_security_alert(
  uuid,
  uuid,
  text,
  text,
  jsonb
) set search_path = public;

alter function resolve_admin_security_alert(
  uuid,
  uuid,
  text,
  text,
  jsonb
) security definer;

alter function resolve_admin_security_alert(
  uuid,
  uuid,
  text,
  text,
  jsonb
) set search_path = public;

alter function dismiss_admin_security_alert(
  uuid,
  uuid,
  text,
  text,
  jsonb
) security definer;

alter function dismiss_admin_security_alert(
  uuid,
  uuid,
  text,
  text,
  jsonb
) set search_path = public;

create or replace view admin_security_alert_dashboard as
select
  ase.id as admin_security_alert_event_id,

  ase.alert_key,
  ase.severity,
  ase.status,
  ase.message,

  ase.actor_auth_user_id,
  actor.email as actor_email,
  actor.display_name as actor_display_name,

  ase.target_auth_user_id,
  target.email as target_email,
  target.display_name as target_display_name,

  ase.action_key,
  ase.privileged_action_request_id,

  ase.acknowledged_by_auth_user_id,
  acknowledger.email as acknowledged_by_email,
  ase.acknowledged_at,

  ase.resolved_by_auth_user_id,
  resolver.email as resolved_by_email,
  ase.resolved_at,
  ase.resolution_note,

  (
    select count(*)
    from admin_security_alert_deliveries d
    where d.admin_security_alert_event_id = ase.id
  ) as delivery_count,

  (
    select count(*)
    from admin_security_alert_deliveries d
    where d.admin_security_alert_event_id = ase.id
      and d.status = 'delivered'
  ) as delivered_count,

  (
    select count(*)
    from admin_security_alert_deliveries d
    where d.admin_security_alert_event_id = ase.id
      and d.status = 'failed'
  ) as failed_delivery_count,

  ase.created_at,
  ase.updated_at,
  ase.metadata

from admin_security_alert_events ase
left join admin_users actor
  on actor.id = ase.actor_admin_user_id
left join admin_users target
  on target.id = ase.target_admin_user_id
left join admin_users acknowledger
  on acknowledger.user_id = ase.acknowledged_by_auth_user_id
left join admin_users resolver
  on resolver.user_id = ase.resolved_by_auth_user_id;

grant select on admin_security_alert_dashboard to admin_api_role;

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
where asae.status in ('resolved', 'dismissed')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_alert_event'
      and ahc.source_id = asae.id
  )

union all

select
  'admin_security_alert_delivery'::text as source_type,
  d.id as source_id,
  d.created_at
from admin_security_alert_deliveries d
where d.status in ('delivered', 'failed', 'cancelled')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_alert_delivery'
      and ahc.source_id = d.id
  );

create or replace view admin_audit_hash_integrity as
select
  (
    select count(*)
    from admin_action_audit_log aal
    where not exists (
      select 1
      from audit_hash_chain_entries ahc
      where ahc.source_type = 'admin_action_audit_log'
        and ahc.source_id = aal.id
    )
  ) as missing_admin_action_hash_count,

  (
    select count(*)
    from admin_privileged_action_requests apar
    where apar.status in ('approved', 'rejected', 'expired', 'executed', 'cancelled')
      and not exists (
        select 1
        from audit_hash_chain_entries ahc
        where ahc.source_type = 'admin_privileged_action_request'
          and ahc.source_id = apar.id
      )
  ) as missing_privileged_action_hash_count,

  (
    select count(*)
    from admin_security_alert_events asae
    where asae.status in ('resolved', 'dismissed')
      and not exists (
        select 1
        from audit_hash_chain_entries ahc
        where ahc.source_type = 'admin_security_alert_event'
          and ahc.source_id = asae.id
      )
  ) as missing_admin_security_alert_hash_count,

  now() as checked_at;

grant select on admin_audit_hash_integrity to admin_api_role, readonly_audit_role;

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
    'ADMIN_SECURITY_ALERT_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Security alert not found.',
    'Admin security alert event not found.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_ALERT_INVALID_STATE',
    'validation',
    'medium',
    409,
    false,
    true,
    'Security alert cannot be updated from its current state.',
    'Invalid admin security alert lifecycle transition.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_ALERT_RESOLUTION_REQUIRED',
    'validation',
    'medium',
    400,
    false,
    true,
    'Resolution note is required.',
    'Admin security alert resolution/dismissal note missing.',
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
  ('admin security alert event not found', 'ADMIN_SECURITY_ALERT_NOT_FOUND', 5, '{}'),
  ('admin security alert cannot be acknowledged from status', 'ADMIN_SECURITY_ALERT_INVALID_STATE', 5, '{}'),
  ('admin security alert cannot be resolved from status', 'ADMIN_SECURITY_ALERT_INVALID_STATE', 5, '{}'),
  ('admin security alert cannot be dismissed from status', 'ADMIN_SECURITY_ALERT_INVALID_STATE', 5, '{}'),
  ('resolution note is required', 'ADMIN_SECURITY_ALERT_RESOLUTION_REQUIRED', 5, '{}'),
  ('dismissal reason is required', 'ADMIN_SECURITY_ALERT_RESOLUTION_REQUIRED', 5, '{}')
on conflict do nothing;
