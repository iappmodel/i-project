-- Step 9.30 — Build post-incident review workflow for critical admin events.
-- Runs after 144_admin_break_glass_recovery.sql.

create table if not exists admin_incident_reviews (
  id uuid primary key default gen_random_uuid(),
  review_key text not null unique,
  source_type text not null,
  source_id uuid not null,
  status text not null default 'open',
  severity text not null default 'critical',
  title text not null,
  summary text not null,
  assigned_to_auth_user_id uuid,
  assigned_to_admin_user_id uuid references admin_users(id),
  assigned_at timestamptz,
  opened_by_auth_user_id uuid,
  opened_by_admin_user_id uuid references admin_users(id),
  opened_at timestamptz not null default now(),
  closed_by_auth_user_id uuid,
  closed_by_admin_user_id uuid references admin_users(id),
  closed_at timestamptz,
  closure_reason text,
  findings text,
  corrective_actions text,
  due_at timestamptz not null default (now() + interval '24 hours'),
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_incident_reviews_source_type_check
  check (
    source_type in (
      'admin_security_alert_event',
      'admin_break_glass_request',
      'admin_action_risk_evaluation',
      'admin_mfa_recovery_code',
      'admin_session_control',
      'admin_device'
    )
  ),
  constraint admin_incident_reviews_status_check
  check (
    status in (
      'open',
      'assigned',
      'investigating',
      'closed',
      'dismissed',
      'overdue'
    )
  ),
  constraint admin_incident_reviews_severity_check
  check (severity in ('high', 'critical'))
);

create index if not exists admin_incident_reviews_status_idx
on admin_incident_reviews (status, due_at asc);

create index if not exists admin_incident_reviews_source_idx
on admin_incident_reviews (source_type, source_id);

create index if not exists admin_incident_reviews_assignee_idx
on admin_incident_reviews (assigned_to_auth_user_id, status, due_at asc);

drop trigger if exists admin_incident_reviews_set_updated_at
on admin_incident_reviews;

create trigger admin_incident_reviews_set_updated_at
before update on admin_incident_reviews
for each row
execute function set_updated_at();

create or replace function create_admin_incident_review(
  p_source_type text,
  p_source_id uuid,
  p_severity text,
  p_title text,
  p_summary text,
  p_opened_by_auth_user_id uuid default null,
  p_assigned_to_auth_user_id uuid default null,
  p_due_at timestamptz default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_review_id uuid;
  v_review_key text;
  v_opened_by_admin admin_users%rowtype;
  v_assigned_to_admin admin_users%rowtype;
begin
  if p_source_type is null or length(trim(p_source_type)) = 0 then
    raise exception 'incident review source type is required';
  end if;

  if p_source_id is null then
    raise exception 'incident review source id is required';
  end if;

  if p_severity not in ('high', 'critical') then
    raise exception 'invalid incident review severity: %', p_severity;
  end if;

  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'incident review title is required';
  end if;

  if p_summary is null or length(trim(p_summary)) = 0 then
    raise exception 'incident review summary is required';
  end if;

  if p_opened_by_auth_user_id is not null then
    select *
    into v_opened_by_admin
    from admin_users
    where user_id = p_opened_by_auth_user_id
    order by created_at desc
    limit 1;
  end if;

  if p_assigned_to_auth_user_id is not null then
    select *
    into v_assigned_to_admin
    from admin_users
    where user_id = p_assigned_to_auth_user_id
      and status = 'active'
    order by created_at desc
    limit 1;

    if v_assigned_to_admin.id is null then
      raise exception 'assigned admin user not found or inactive';
    end if;
  end if;

  v_review_key := p_source_type || ':' || p_source_id::text;

  insert into admin_incident_reviews (
    review_key,
    source_type,
    source_id,
    status,
    severity,
    title,
    summary,
    opened_by_auth_user_id,
    opened_by_admin_user_id,
    assigned_to_auth_user_id,
    assigned_to_admin_user_id,
    assigned_at,
    due_at,
    request_id,
    metadata
  )
  values (
    v_review_key,
    p_source_type,
    p_source_id,
    case when p_assigned_to_auth_user_id is not null then 'assigned' else 'open' end,
    p_severity,
    p_title,
    p_summary,
    p_opened_by_auth_user_id,
    v_opened_by_admin.id,
    p_assigned_to_auth_user_id,
    v_assigned_to_admin.id,
    case when p_assigned_to_auth_user_id is not null then now() else null end,
    coalesce(p_due_at, now() + interval '24 hours'),
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (review_key)
  do update set
    severity = excluded.severity,
    title = excluded.title,
    summary = excluded.summary,
    metadata = admin_incident_reviews.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_review_id;

  return v_review_id;
end;
$$;

create or replace function create_incident_reviews_from_critical_alerts(
  p_batch_size integer default 500,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_alert record;
begin
  if p_batch_size <= 0 or p_batch_size > 5000 then
    raise exception 'batch size must be between 1 and 5000';
  end if;

  for v_alert in
    select *
    from admin_security_alert_events ase
    where ase.severity = 'critical'
      and not exists (
        select 1
        from admin_incident_reviews r
        where r.source_type = 'admin_security_alert_event'
          and r.source_id = ase.id
      )
    order by ase.created_at asc
    limit p_batch_size
  loop
    perform create_admin_incident_review(
      'admin_security_alert_event',
      v_alert.id,
      'critical',
      'Critical admin security alert: ' || v_alert.alert_key,
      coalesce(v_alert.message, 'Critical admin security alert requires review.'),
      null,
      null,
      now() + interval '24 hours',
      null,
      p_metadata || jsonb_build_object(
        'run_id',
        v_run_id,
        'alert_key',
        v_alert.alert_key,
        'action_key',
        v_alert.action_key,
        'actor_auth_user_id',
        v_alert.actor_auth_user_id,
        'target_auth_user_id',
        v_alert.target_auth_user_id
      )
    );
  end loop;

  return v_run_id;
end;
$$;

create or replace function create_incident_reviews_from_break_glass(
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
  if p_batch_size <= 0 or p_batch_size > 5000 then
    raise exception 'batch size must be between 1 and 5000';
  end if;

  for v_request in
    select *
    from admin_break_glass_requests bgr
    where bgr.status in ('executed', 'revoked', 'expired')
      and not exists (
        select 1
        from admin_incident_reviews r
        where r.source_type = 'admin_break_glass_request'
          and r.source_id = bgr.id
      )
    order by bgr.created_at asc
    limit p_batch_size
  loop
    perform create_admin_incident_review(
      'admin_break_glass_request',
      v_request.id,
      'critical',
      'Break-glass admin access review',
      'Emergency break-glass admin access requires post-incident review.',
      null,
      null,
      now() + interval '24 hours',
      null,
      p_metadata || jsonb_build_object(
        'run_id',
        v_run_id,
        'target_auth_user_id',
        v_request.target_auth_user_id,
        'requested_by_auth_user_id',
        v_request.requested_by_auth_user_id,
        'status',
        v_request.status
      )
    );
  end loop;

  return v_run_id;
end;
$$;

create or replace function run_admin_incident_review_creation_job(
  p_batch_size integer default 500,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_alert_run_id uuid;
  v_break_glass_run_id uuid;
begin
  v_alert_run_id := create_incident_reviews_from_critical_alerts(
    p_batch_size,
    p_metadata || jsonb_build_object(
      'incident_review_creation_run_id',
      v_run_id,
      'source',
      'critical_alerts'
    )
  );

  v_break_glass_run_id := create_incident_reviews_from_break_glass(
    p_batch_size,
    p_metadata || jsonb_build_object(
      'incident_review_creation_run_id',
      v_run_id,
      'source',
      'break_glass'
    )
  );

  return v_run_id;
end;
$$;

create or replace function mark_overdue_admin_incident_reviews(
  p_batch_size integer default 500,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_review record;
begin
  for v_review in
    select *
    from admin_incident_reviews
    where status in ('open', 'assigned', 'investigating')
      and due_at <= now()
    order by due_at asc
    limit p_batch_size
    for update skip locked
  loop
    update admin_incident_reviews
    set
      status = 'overdue',
      metadata = metadata || p_metadata || jsonb_build_object(
        'overdue_run_id',
        v_run_id,
        'marked_overdue_at',
        now()
      ),
      updated_at = now()
    where id = v_review.id;

    perform create_admin_security_alert(
      'admin_incident_review_overdue',
      'critical',
      null,
      v_review.assigned_to_auth_user_id,
      'mark_overdue_admin_incident_reviews',
      null,
      'Admin incident review is overdue.',
      p_metadata || jsonb_build_object(
        'run_id',
        v_run_id,
        'admin_incident_review_id',
        v_review.id,
        'source_type',
        v_review.source_type,
        'source_id',
        v_review.source_id,
        'due_at',
        v_review.due_at
      )
    );
  end loop;

  return v_run_id;
end;
$$;

create or replace function assign_admin_incident_review(
  p_admin_auth_user_id uuid,
  p_incident_review_id uuid,
  p_assigned_to_auth_user_id uuid,
  p_note text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_review admin_incident_reviews%rowtype;
  v_assignee admin_users%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_incident_review_id is null then
    raise exception 'incident review id is required';
  end if;

  if p_assigned_to_auth_user_id is null then
    raise exception 'assigned to auth user id is required';
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
    raise exception 'incident review cannot be assigned from status: %', v_review.status;
  end if;

  select *
  into v_assignee
  from admin_users
  where user_id = p_assigned_to_auth_user_id
    and status = 'active'
  order by created_at desc
  limit 1;

  if v_assignee.id is null then
    raise exception 'assigned admin user not found or inactive';
  end if;

  update admin_incident_reviews
  set
    status = 'assigned',
    assigned_to_auth_user_id = p_assigned_to_auth_user_id,
    assigned_to_admin_user_id = v_assignee.id,
    assigned_at = now(),
    metadata = metadata || p_metadata || jsonb_build_object(
      'assignment_note',
      p_note,
      'assignment_request_id',
      p_request_id
    ),
    updated_at = now()
  where id = v_review.id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'assign_admin_incident_review',
    'admin.write',
    'admin_incident_review',
    v_review.id,
    p_request_id,
    null,
    null,
    'allowed',
    coalesce(p_note, 'incident review assigned'),
    p_metadata || jsonb_build_object('assigned_to_auth_user_id', p_assigned_to_auth_user_id)
  );

  return v_review.id;
end;
$$;

create or replace function start_admin_incident_review_investigation(
  p_admin_auth_user_id uuid,
  p_incident_review_id uuid,
  p_note text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_review admin_incident_reviews%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.read') is not true then
    raise exception 'missing required permission: admin.read';
  end if;

  select *
  into v_review
  from admin_incident_reviews
  where id = p_incident_review_id
  for update;

  if v_review.id is null then
    raise exception 'admin incident review not found: %', p_incident_review_id;
  end if;

  if v_review.status not in ('open', 'assigned', 'overdue') then
    raise exception 'incident review cannot start investigation from status: %', v_review.status;
  end if;

  update admin_incident_reviews
  set
    status = 'investigating',
    assigned_to_auth_user_id = coalesce(assigned_to_auth_user_id, p_admin_auth_user_id),
    assigned_to_admin_user_id = coalesce(
      assigned_to_admin_user_id,
      (
        select id
        from admin_users
        where user_id = p_admin_auth_user_id
        order by created_at desc
        limit 1
      )
    ),
    assigned_at = coalesce(assigned_at, now()),
    metadata = metadata || p_metadata || jsonb_build_object(
      'investigation_started_at',
      now(),
      'investigation_note',
      p_note,
      'investigation_request_id',
      p_request_id
    ),
    updated_at = now()
  where id = v_review.id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'start_admin_incident_review_investigation',
    'admin.read',
    'admin_incident_review',
    v_review.id,
    p_request_id,
    null,
    null,
    'allowed',
    coalesce(p_note, 'incident review investigation started'),
    p_metadata
  );

  return v_review.id;
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

create or replace function dismiss_admin_incident_review(
  p_admin_auth_user_id uuid,
  p_incident_review_id uuid,
  p_dismissal_reason text,
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

  if p_dismissal_reason is null or length(trim(p_dismissal_reason)) = 0 then
    raise exception 'dismissal reason is required';
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

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  update admin_incident_reviews
  set
    status = 'dismissed',
    closed_by_auth_user_id = p_admin_auth_user_id,
    closed_by_admin_user_id = v_admin.id,
    closed_at = now(),
    closure_reason = p_dismissal_reason,
    findings = coalesce(findings, 'Dismissed as duplicate/noise.'),
    corrective_actions = coalesce(corrective_actions, 'No corrective action required.'),
    metadata = metadata || p_metadata || jsonb_build_object('dismissal_request_id', p_request_id),
    updated_at = now()
  where id = v_review.id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'dismiss_admin_incident_review',
    'admin.write',
    'admin_incident_review',
    v_review.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_dismissal_reason,
    p_metadata
  );

  return v_review.id;
end;
$$;

create or replace view admin_incident_review_dashboard as
select
  r.id as admin_incident_review_id,
  r.review_key,
  r.source_type,
  r.source_id,
  r.status,
  r.severity,
  r.title,
  r.summary,
  r.assigned_to_auth_user_id,
  assignee.email as assigned_to_email,
  assignee.display_name as assigned_to_display_name,
  r.assigned_at,
  r.opened_by_auth_user_id,
  opener.email as opened_by_email,
  r.opened_at,
  r.closed_by_auth_user_id,
  closer.email as closed_by_email,
  r.closed_at,
  r.closure_reason,
  r.findings,
  r.corrective_actions,
  r.due_at,
  case
    when r.status in ('open', 'assigned', 'investigating', 'overdue')
      and r.due_at <= now()
    then true
    else false
  end as is_overdue,
  r.created_at,
  r.updated_at,
  r.metadata
from admin_incident_reviews r
left join admin_users assignee
  on assignee.id = r.assigned_to_admin_user_id
left join admin_users opener
  on opener.id = r.opened_by_admin_user_id
left join admin_users closer
  on closer.id = r.closed_by_admin_user_id
order by r.due_at asc, r.created_at desc;

create or replace view admin_incident_review_integrity as
select
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
    from admin_incident_reviews
    where severity = 'critical'
      and status in ('open', 'assigned', 'investigating', 'overdue')
  ) as open_critical_incident_review_count,
  (
    select count(*)
    from admin_incident_reviews
    where closed_at >= now() - interval '24 hours'
  ) as closed_incident_review_count_24h,
  now() as checked_at;

create or replace function hash_admin_incident_review(
  p_admin_incident_review_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_review admin_incident_reviews%rowtype;
  v_payload jsonb;
begin
  select *
  into v_review
  from admin_incident_reviews
  where id = p_admin_incident_review_id;

  if v_review.id is null then
    raise exception 'admin incident review not found: %', p_admin_incident_review_id;
  end if;

  v_payload := jsonb_build_object(
    'source_type', 'admin_incident_review',
    'source_id', v_review.id,
    'review_key', v_review.review_key,
    'incident_source_type', v_review.source_type,
    'incident_source_id', v_review.source_id,
    'status', v_review.status,
    'severity', v_review.severity,
    'title', v_review.title,
    'summary', v_review.summary,
    'assigned_to_auth_user_id', v_review.assigned_to_auth_user_id,
    'opened_by_auth_user_id', v_review.opened_by_auth_user_id,
    'closed_by_auth_user_id', v_review.closed_by_auth_user_id,
    'closed_at', v_review.closed_at,
    'closure_reason', v_review.closure_reason,
    'findings', v_review.findings,
    'corrective_actions', v_review.corrective_actions,
    'due_at', v_review.due_at,
    'created_at', v_review.created_at,
    'updated_at', v_review.updated_at
  );

  return append_audit_hash_chain_entry(
    'admin_incident_review',
    v_review.id,
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
  'admin_incident_reviews_create_every_5_minutes',
  'Create admin incident reviews from critical events',
  'admin',
  true,
  '*/5 * * * *',
  'run_admin_incident_review_creation_job',
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
  'admin_incident_reviews_overdue_every_15_minutes',
  'Mark overdue admin incident reviews',
  'admin',
  true,
  '*/15 * * * *',
  'mark_overdue_admin_incident_reviews',
  '{"batch_size": 500}'::jsonb,
  180,
  300,
  '{"priority": "high"}'::jsonb
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
    set last_status = 'disabled', last_run_id = v_run_id, updated_at = now()
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
    set last_status = 'skipped_locked', last_run_id = v_run_id, updated_at = now()
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
  elsif v_job.function_name = 'run_admin_incident_review_creation_job' then
    v_uuid_result := run_admin_incident_review_creation_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'mark_overdue_admin_incident_reviews' then
    v_uuid_result := mark_overdue_admin_incident_reviews(
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

alter table admin_incident_reviews enable row level security;

drop policy if exists admin_incident_reviews_no_user_direct_access
on admin_incident_reviews;
create policy admin_incident_reviews_no_user_direct_access
on admin_incident_reviews
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_api_all_admin_incident_reviews
on admin_incident_reviews;
create policy admin_api_all_admin_incident_reviews
on admin_incident_reviews
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists worker_all_admin_incident_reviews
on admin_incident_reviews;
create policy worker_all_admin_incident_reviews
on admin_incident_reviews
for all
to worker_role
using (true)
with check (true);

grant select on admin_incident_review_dashboard to admin_api_role;
grant select on admin_incident_review_integrity to admin_api_role;

grant execute on function create_admin_incident_review(
  text, uuid, text, text, text, uuid, uuid, timestamptz, text, jsonb
) to admin_api_role, worker_role;
grant execute on function create_incident_reviews_from_critical_alerts(integer, jsonb) to worker_role;
grant execute on function create_incident_reviews_from_break_glass(integer, jsonb) to worker_role;
grant execute on function run_admin_incident_review_creation_job(integer, jsonb) to worker_role;
grant execute on function mark_overdue_admin_incident_reviews(integer, jsonb) to worker_role;
grant execute on function assign_admin_incident_review(uuid, uuid, uuid, text, text, jsonb) to admin_api_role;
grant execute on function start_admin_incident_review_investigation(uuid, uuid, text, text, jsonb) to admin_api_role;
grant execute on function close_admin_incident_review(uuid, uuid, text, text, text, text, jsonb) to admin_api_role;
grant execute on function dismiss_admin_incident_review(uuid, uuid, text, text, jsonb) to admin_api_role;
grant execute on function hash_admin_incident_review(uuid, jsonb) to worker_role, admin_api_role;

alter function create_admin_incident_review(
  text, uuid, text, text, text, uuid, uuid, timestamptz, text, jsonb
) security definer;
alter function create_admin_incident_review(
  text, uuid, text, text, text, uuid, uuid, timestamptz, text, jsonb
) set search_path = public;

alter function create_incident_reviews_from_critical_alerts(integer, jsonb) security definer;
alter function create_incident_reviews_from_critical_alerts(integer, jsonb) set search_path = public;
alter function create_incident_reviews_from_break_glass(integer, jsonb) security definer;
alter function create_incident_reviews_from_break_glass(integer, jsonb) set search_path = public;
alter function run_admin_incident_review_creation_job(integer, jsonb) security definer;
alter function run_admin_incident_review_creation_job(integer, jsonb) set search_path = public;
alter function mark_overdue_admin_incident_reviews(integer, jsonb) security definer;
alter function mark_overdue_admin_incident_reviews(integer, jsonb) set search_path = public;
alter function assign_admin_incident_review(uuid, uuid, uuid, text, text, jsonb) security definer;
alter function assign_admin_incident_review(uuid, uuid, uuid, text, text, jsonb) set search_path = public;
alter function start_admin_incident_review_investigation(uuid, uuid, text, text, jsonb) security definer;
alter function start_admin_incident_review_investigation(uuid, uuid, text, text, jsonb) set search_path = public;
alter function close_admin_incident_review(uuid, uuid, text, text, text, text, jsonb) security definer;
alter function close_admin_incident_review(uuid, uuid, text, text, text, text, jsonb) set search_path = public;
alter function dismiss_admin_incident_review(uuid, uuid, text, text, jsonb) security definer;
alter function dismiss_admin_incident_review(uuid, uuid, text, text, jsonb) set search_path = public;
alter function hash_admin_incident_review(uuid, jsonb) security definer;
alter function hash_admin_incident_review(uuid, jsonb) set search_path = public;

alter table system_health_snapshots
add column if not exists open_incident_review_count bigint not null default 0,
add column if not exists overdue_incident_review_count bigint not null default 0,
add column if not exists open_critical_incident_review_count bigint not null default 0,
add column if not exists closed_incident_review_count_24h bigint not null default 0;

create or replace function enrich_system_health_snapshot_with_incident_reviews()
returns trigger
language plpgsql
as $$
declare
  v_integrity admin_incident_review_integrity%rowtype;
begin
  select *
  into v_integrity
  from admin_incident_review_integrity;

  new.open_incident_review_count := coalesce(v_integrity.open_incident_review_count, 0);
  new.overdue_incident_review_count := coalesce(v_integrity.overdue_incident_review_count, 0);
  new.open_critical_incident_review_count := coalesce(v_integrity.open_critical_incident_review_count, 0);
  new.closed_incident_review_count_24h := coalesce(v_integrity.closed_incident_review_count_24h, 0);

  if new.overdue_incident_review_count > 0
    or new.open_critical_incident_review_count > 0 then
    new.status := 'critical';
  elsif new.open_incident_review_count > 0
    and new.status = 'healthy' then
    new.status := 'warning';
  end if;

  return new;
end;
$$;

drop trigger if exists system_health_snapshots_enrich_incident_reviews
on system_health_snapshots;

create trigger system_health_snapshots_enrich_incident_reviews
before insert on system_health_snapshots
for each row
execute function enrich_system_health_snapshot_with_incident_reviews();

create or replace view admin_system_command_center as
select
  pod.latest_snapshot_id,
  pod.system_status,
  pod.snapshot_at,
  pod.wallet_count,
  pod.active_wallet_count,
  pod.total_available_balance_minor,
  pod.total_pending_balance_minor,
  pod.total_locked_balance_minor,
  pod.total_wallet_balance_minor,
  pod.reward_pending_count,
  pod.reward_completed_count_24h,
  pod.reward_failed_count_24h,
  pod.attention_event_count_1h,
  pod.attention_passed_count_1h,
  pod.attention_fraud_suspected_count_1h,
  pod.unbalanced_journal_count,
  pod.missing_reward_mirror_count,
  pod.wallet_accounting_delta_minor,
  pod.audit_missing_hash_record_count,
  pod.audit_broken_verification_count_24h,
  pod.failed_scheduled_job_count_24h,
  pod.critical_error_count_1h,
  pod.high_error_count_1h,
  pod.withdrawal_requested_count,
  pod.withdrawal_reserved_count,
  pod.withdrawal_submitted_count,
  pod.withdrawal_paid_count_24h,
  pod.withdrawal_failed_count_24h,
  pod.withdrawal_integrity_issue_count,
  pod.active_admin_session_count,
  pod.reauth_required_admin_session_count,
  pod.revoked_admin_session_count_24h,
  pod.expired_admin_session_count_24h,
  pod.idle_active_admin_session_count,
  shs.open_incident_review_count,
  shs.overdue_incident_review_count,
  shs.open_critical_incident_review_count,
  shs.closed_incident_review_count_24h,
  pod.metrics,
  pod.job_alerts,
  pod.error_summary,
  pod.active_alerts
from platform_operations_dashboard pod
join system_health_snapshots shs
  on shs.id = pod.latest_snapshot_id;

insert into error_catalog (
  error_code, category, severity, http_status, retryable, user_visible, user_message, internal_message, owner_team
)
values
  ('ADMIN_INCIDENT_REVIEW_NOT_FOUND', 'validation', 'medium', 404, false, true, 'Incident review not found.', 'Admin incident review not found.', 'platform'),
  ('ADMIN_INCIDENT_REVIEW_INVALID_STATE', 'validation', 'medium', 409, false, true, 'Incident review cannot be updated from its current state.', 'Admin incident review invalid lifecycle state.', 'platform'),
  ('ADMIN_INCIDENT_REVIEW_REQUIRED_FIELDS', 'validation', 'medium', 400, false, true, 'Incident review closure requires reason, findings, and corrective actions.', 'Admin incident review closure required fields missing.', 'platform')
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

insert into error_mapping_rules (match_pattern, error_code, priority, metadata)
values
  ('admin incident review not found', 'ADMIN_INCIDENT_REVIEW_NOT_FOUND', 5, '{}'),
  ('incident review cannot be assigned from status', 'ADMIN_INCIDENT_REVIEW_INVALID_STATE', 5, '{}'),
  ('incident review cannot start investigation from status', 'ADMIN_INCIDENT_REVIEW_INVALID_STATE', 5, '{}'),
  ('incident review already closed', 'ADMIN_INCIDENT_REVIEW_INVALID_STATE', 5, '{}'),
  ('closure reason is required', 'ADMIN_INCIDENT_REVIEW_REQUIRED_FIELDS', 5, '{}'),
  ('findings are required', 'ADMIN_INCIDENT_REVIEW_REQUIRED_FIELDS', 5, '{}'),
  ('corrective actions are required', 'ADMIN_INCIDENT_REVIEW_REQUIRED_FIELDS', 5, '{}')
on conflict do nothing;
