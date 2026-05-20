-- Step 9.55 — Build revocation and disclosure control layer.
-- Runs after 169_admin_security_signed_questionnaire_exports.sql.

create table if not exists admin_security_revocation_records (
  id uuid primary key default gen_random_uuid(),
  revocation_key text not null unique,
  status text not null default 'active',
  source_type text not null,
  source_id uuid not null,
  revocation_type text not null,
  severity text not null default 'high',
  reason_code text not null,
  reason text not null,
  public_reason text,
  internal_note text,
  effective_at timestamptz not null default now(),
  disclose_publicly boolean not null default true,
  notify_customers boolean not null default true,
  notify_auditors boolean not null default false,
  affected_customer_name text,
  affected_room_id uuid references admin_security_enterprise_review_rooms(id) on delete set null,
  affected_participant_count integer not null default 0,
  previous_status text,
  new_status text,
  revoked_by_auth_user_id uuid not null,
  revoked_by_admin_user_id uuid references admin_users(id),
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_security_revocation_records_status_check
  check (status in ('active', 'superseded', 'rescinded', 'archived')),
  constraint admin_security_revocation_records_source_type_check
  check (
    source_type in (
      'admin_security_compliance_report',
      'admin_security_questionnaire_export',
      'admin_security_enterprise_review_room',
      'admin_security_enterprise_review_room_document_grant',
      'admin_security_trust_center_report',
      'admin_security_audit_period_export',
      'admin_security_document_request'
    )
  ),
  constraint admin_security_revocation_records_type_check
  check (
    revocation_type in (
      'revocation',
      'forced_expiry',
      'superseded',
      'access_removed',
      'public_disclosure_removed',
      'emergency_lockdown'
    )
  ),
  constraint admin_security_revocation_records_severity_check
  check (severity in ('low', 'medium', 'high', 'critical')),
  constraint admin_security_revocation_records_reason_code_check
  check (
    reason_code in (
      'incorrect_content',
      'expired',
      'superseded',
      'customer_scope_error',
      'evidence_changed',
      'signature_compromised',
      'key_rotation',
      'legal_request',
      'security_incident',
      'access_abuse',
      'published_by_mistake',
      'internal_policy',
      'other'
    )
  ),
  constraint admin_security_revocation_records_reason_check
  check (length(trim(reason)) > 0)
);

create index if not exists admin_security_revocation_records_source_idx
on admin_security_revocation_records (source_type, source_id, created_at desc);

create index if not exists admin_security_revocation_records_status_idx
on admin_security_revocation_records (status, severity, created_at desc);

create index if not exists admin_security_revocation_records_customer_idx
on admin_security_revocation_records (affected_customer_name, created_at desc);

create table if not exists admin_security_revocation_notifications (
  id uuid primary key default gen_random_uuid(),
  revocation_record_id uuid not null
    references admin_security_revocation_records(id)
    on delete cascade,
  status text not null default 'pending',
  notification_type text not null,
  recipient_type text not null,
  recipient_email text,
  recipient_auth_user_id uuid,
  recipient_label text,
  subject text not null,
  body_markdown text not null,
  claimed_by_worker_id text,
  claimed_at timestamptz,
  sent_at timestamptz,
  failed_at timestamptz,
  last_error text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_revocation_notifications_status_check
  check (status in ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  constraint admin_security_revocation_notifications_type_check
  check (
    notification_type in (
      'customer_notice',
      'auditor_notice',
      'internal_security_notice',
      'sales_owner_notice',
      'admin_notice'
    )
  ),
  constraint admin_security_revocation_notifications_recipient_type_check
  check (
    recipient_type in (
      'customer_participant',
      'auditor',
      'admin',
      'sales_owner',
      'security_owner',
      'manual'
    )
  )
);

create index if not exists admin_security_revocation_notifications_status_idx
on admin_security_revocation_notifications (status, created_at asc);

create index if not exists admin_security_revocation_notifications_revocation_idx
on admin_security_revocation_notifications (revocation_record_id, created_at desc);

drop trigger if exists admin_security_revocation_notifications_set_updated_at
on admin_security_revocation_notifications;

create trigger admin_security_revocation_notifications_set_updated_at
before update on admin_security_revocation_notifications
for each row
execute function set_updated_at();

create or replace function create_admin_security_revocation_record(
  p_admin_auth_user_id uuid,
  p_source_type text,
  p_source_id uuid,
  p_revocation_type text,
  p_severity text,
  p_reason_code text,
  p_reason text,
  p_public_reason text default null,
  p_internal_note text default null,
  p_disclose_publicly boolean default true,
  p_notify_customers boolean default true,
  p_notify_auditors boolean default false,
  p_affected_customer_name text default null,
  p_affected_room_id uuid default null,
  p_previous_status text default null,
  p_new_status text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_revocation_id uuid;
  v_revocation_key text;
  v_participant_count integer := 0;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'privileged_action',
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'action_key',
      'create_admin_security_revocation_record',
      'source_type',
      p_source_type,
      'source_id',
      p_source_id
    )
  );

  if p_source_id is null then
    raise exception 'revocation source id is required';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'revocation reason is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  if p_affected_room_id is not null then
    select count(*)
    into v_participant_count
    from admin_security_enterprise_review_room_participants
    where review_room_id = p_affected_room_id
      and status in ('active', 'invited');
  end if;

  v_revocation_key :=
    'revocation:' ||
    p_source_type || ':' ||
    p_source_id::text || ':' ||
    extract(epoch from now())::bigint::text || ':' ||
    substr(encode(gen_random_bytes(4), 'hex'), 1, 8);

  insert into admin_security_revocation_records (
    revocation_key,
    status,
    source_type,
    source_id,
    revocation_type,
    severity,
    reason_code,
    reason,
    public_reason,
    internal_note,
    effective_at,
    disclose_publicly,
    notify_customers,
    notify_auditors,
    affected_customer_name,
    affected_room_id,
    affected_participant_count,
    previous_status,
    new_status,
    revoked_by_auth_user_id,
    revoked_by_admin_user_id,
    request_id,
    metadata
  )
  values (
    v_revocation_key,
    'active',
    p_source_type,
    p_source_id,
    coalesce(p_revocation_type, 'revocation'),
    coalesce(p_severity, 'high'),
    p_reason_code,
    p_reason,
    p_public_reason,
    p_internal_note,
    now(),
    coalesce(p_disclose_publicly, true),
    coalesce(p_notify_customers, true),
    coalesce(p_notify_auditors, false),
    p_affected_customer_name,
    p_affected_room_id,
    v_participant_count,
    p_previous_status,
    p_new_status,
    p_admin_auth_user_id,
    v_admin.id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_revocation_id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'create_admin_security_revocation_record',
    'admin.write',
    'admin_security_revocation_record',
    v_revocation_id,
    p_request_id,
    null,
    null,
    'allowed',
    p_reason,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'source_type',
      p_source_type,
      'source_id',
      p_source_id,
      'reason_code',
      p_reason_code
    )
  );

  perform create_admin_security_alert(
    'admin_security_artifact_revoked',
    coalesce(p_severity, 'high'),
    p_admin_auth_user_id,
    null,
    'create_admin_security_revocation_record',
    null,
    'Security artifact was revoked.',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'revocation_record_id',
      v_revocation_id,
      'source_type',
      p_source_type,
      'source_id',
      p_source_id,
      'reason_code',
      p_reason_code
    )
  );

  return v_revocation_id;
end;
$$;

create or replace function queue_admin_security_revocation_notifications(
  p_revocation_record_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
as $$
declare
  v_revocation admin_security_revocation_records%rowtype;
  v_count integer := 0;
  v_participant record;
  v_subject text;
  v_body text;
begin
  select *
  into v_revocation
  from admin_security_revocation_records
  where id = p_revocation_record_id;

  if v_revocation.id is null then
    raise exception 'revocation record not found: %', p_revocation_record_id;
  end if;

  v_subject :=
    case
      when v_revocation.severity = 'critical' then 'Critical security document revocation notice'
      else 'Security document revocation notice'
    end;

  v_body :=
    'A security/compliance artifact has been revoked.' || E'\n\n' ||
    '**Reason:** ' || coalesce(v_revocation.public_reason, v_revocation.reason) || E'\n\n' ||
    '**Effective at:** ' || v_revocation.effective_at::text || E'\n\n' ||
    'Do not rely on the previously issued artifact unless a replacement is provided.';

  if v_revocation.notify_customers is true
    and v_revocation.affected_room_id is not null
  then
    for v_participant in
      select *
      from admin_security_enterprise_review_room_participants
      where review_room_id = v_revocation.affected_room_id
        and status in ('active', 'invited')
        and email is not null
    loop
      insert into admin_security_revocation_notifications (
        revocation_record_id,
        status,
        notification_type,
        recipient_type,
        recipient_email,
        recipient_auth_user_id,
        recipient_label,
        subject,
        body_markdown,
        request_id,
        metadata
      )
      values (
        v_revocation.id,
        'pending',
        'customer_notice',
        'customer_participant',
        v_participant.email,
        v_participant.auth_user_id,
        coalesce(v_participant.display_name, v_participant.email),
        v_subject,
        v_body,
        p_request_id,
        coalesce(p_metadata, '{}'::jsonb)
      );

      v_count := v_count + 1;
    end loop;
  end if;

  if v_revocation.notify_auditors is true then
    insert into admin_security_revocation_notifications (
      revocation_record_id,
      status,
      notification_type,
      recipient_type,
      recipient_label,
      subject,
      body_markdown,
      request_id,
      metadata
    )
    values (
      v_revocation.id,
      'pending',
      'auditor_notice',
      'auditor',
      'auditor-notification-list',
      v_subject,
      v_body,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    v_count := v_count + 1;
  end if;

  insert into admin_security_revocation_notifications (
    revocation_record_id,
    status,
    notification_type,
    recipient_type,
    recipient_label,
    subject,
    body_markdown,
    request_id,
    metadata
  )
  values (
    v_revocation.id,
    'pending',
    'internal_security_notice',
    'security_owner',
    'security-owner-notification-list',
    v_subject,
    v_body,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  v_count := v_count + 1;

  return v_count;
end;
$$;

create or replace function revoke_admin_security_compliance_report(
  p_admin_auth_user_id uuid,
  p_compliance_report_request_id uuid,
  p_reason_code text,
  p_reason text,
  p_public_reason text default null,
  p_notify_customers boolean default true,
  p_notify_auditors boolean default false,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_report admin_security_compliance_report_requests%rowtype;
  v_room_id uuid;
  v_customer_name text;
  v_revocation_id uuid;
begin
  select *
  into v_report
  from admin_security_compliance_report_requests
  where id = p_compliance_report_request_id
  for update;

  if v_report.id is null then
    raise exception 'compliance report request not found: %', p_compliance_report_request_id;
  end if;

  if v_report.status = 'revoked' then
    raise exception 'compliance report is already revoked';
  end if;

  select g.review_room_id, r.customer_name
  into v_room_id, v_customer_name
  from admin_security_enterprise_review_room_document_grants g
  join admin_security_enterprise_review_rooms r
    on r.id = g.review_room_id
  where g.compliance_report_request_id = v_report.id
    and g.status = 'active'
  order by g.created_at desc
  limit 1;

  v_revocation_id := create_admin_security_revocation_record(
    p_admin_auth_user_id,
    'admin_security_compliance_report',
    v_report.id,
    'revocation',
    'high',
    p_reason_code,
    p_reason,
    p_public_reason,
    null,
    true,
    p_notify_customers,
    p_notify_auditors,
    v_customer_name,
    v_room_id,
    v_report.status,
    'revoked',
    p_request_id,
    p_metadata
  );

  update admin_security_compliance_report_requests
  set
    status = 'revoked',
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'revoked_at',
      now(),
      'revocation_record_id',
      v_revocation_id,
      'revocation_reason_code',
      p_reason_code
    ),
    updated_at = now()
  where id = v_report.id;

  update admin_security_enterprise_review_room_document_grants
  set
    status = 'revoked',
    revoked_at = now(),
    revoked_by_auth_user_id = p_admin_auth_user_id,
    revoke_reason = p_reason,
    metadata = metadata || jsonb_build_object(
      'source_revocation_record_id',
      v_revocation_id
    ),
    updated_at = now()
  where compliance_report_request_id = v_report.id
    and status = 'active';

  perform queue_admin_security_revocation_notifications(
    v_revocation_id,
    p_request_id,
    p_metadata
  );

  return v_revocation_id;
end;
$$;

create or replace function revoke_admin_security_questionnaire_export(
  p_admin_auth_user_id uuid,
  p_questionnaire_export_id uuid,
  p_reason_code text,
  p_reason text,
  p_public_reason text default null,
  p_notify_customers boolean default true,
  p_notify_auditors boolean default false,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_export admin_security_questionnaire_exports%rowtype;
  v_project admin_security_questionnaire_projects%rowtype;
  v_room_id uuid;
  v_revocation_id uuid;
begin
  select *
  into v_export
  from admin_security_questionnaire_exports
  where id = p_questionnaire_export_id
  for update;

  if v_export.id is null then
    raise exception 'questionnaire export not found: %', p_questionnaire_export_id;
  end if;

  if v_export.status = 'revoked' then
    raise exception 'questionnaire export is already revoked';
  end if;

  select *
  into v_project
  from admin_security_questionnaire_projects
  where id = v_export.questionnaire_project_id;

  select review_room_id
  into v_room_id
  from admin_security_enterprise_review_room_document_grants
  where id = v_export.enterprise_review_room_document_grant_id;

  v_revocation_id := create_admin_security_revocation_record(
    p_admin_auth_user_id,
    'admin_security_questionnaire_export',
    v_export.id,
    'revocation',
    'high',
    p_reason_code,
    p_reason,
    p_public_reason,
    null,
    true,
    p_notify_customers,
    p_notify_auditors,
    v_project.customer_name,
    v_room_id,
    v_export.status,
    'revoked',
    p_request_id,
    p_metadata
  );

  update admin_security_questionnaire_exports
  set
    status = 'revoked',
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'revoked_at',
      now(),
      'revocation_record_id',
      v_revocation_id,
      'revocation_reason_code',
      p_reason_code
    ),
    updated_at = now()
  where id = v_export.id;

  update admin_security_enterprise_review_room_document_grants
  set
    status = 'revoked',
    revoked_at = now(),
    revoked_by_auth_user_id = p_admin_auth_user_id,
    revoke_reason = p_reason,
    metadata = metadata || jsonb_build_object(
      'source_revocation_record_id',
      v_revocation_id
    ),
    updated_at = now()
  where id = v_export.enterprise_review_room_document_grant_id
    and status = 'active';

  perform queue_admin_security_revocation_notifications(
    v_revocation_id,
    p_request_id,
    p_metadata
  );

  return v_revocation_id;
end;
$$;

create or replace function revoke_admin_security_enterprise_review_room_document_grant(
  p_admin_auth_user_id uuid,
  p_document_grant_id uuid,
  p_reason_code text,
  p_reason text,
  p_public_reason text default null,
  p_notify_customers boolean default true,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_grant admin_security_enterprise_review_room_document_grants%rowtype;
  v_room admin_security_enterprise_review_rooms%rowtype;
  v_revocation_id uuid;
begin
  select *
  into v_grant
  from admin_security_enterprise_review_room_document_grants
  where id = p_document_grant_id
  for update;

  if v_grant.id is null then
    raise exception 'enterprise review room document grant not found: %', p_document_grant_id;
  end if;

  if v_grant.status = 'revoked' then
    raise exception 'enterprise review room document grant is already revoked';
  end if;

  select *
  into v_room
  from admin_security_enterprise_review_rooms
  where id = v_grant.review_room_id;

  v_revocation_id := create_admin_security_revocation_record(
    p_admin_auth_user_id,
    'admin_security_enterprise_review_room_document_grant',
    v_grant.id,
    'access_removed',
    'high',
    p_reason_code,
    p_reason,
    p_public_reason,
    null,
    true,
    p_notify_customers,
    false,
    v_room.customer_name,
    v_room.id,
    v_grant.status,
    'revoked',
    p_request_id,
    p_metadata
  );

  update admin_security_enterprise_review_room_document_grants
  set
    status = 'revoked',
    revoked_at = now(),
    revoked_by_auth_user_id = p_admin_auth_user_id,
    revoke_reason = p_reason,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'revocation_record_id',
      v_revocation_id,
      'revocation_reason_code',
      p_reason_code
    ),
    updated_at = now()
  where id = v_grant.id;

  perform queue_admin_security_revocation_notifications(
    v_revocation_id,
    p_request_id,
    p_metadata
  );

  return v_revocation_id;
end;
$$;

create or replace function revoke_admin_security_trust_center_report_publication(
  p_admin_auth_user_id uuid,
  p_trust_center_report_id uuid,
  p_reason_code text,
  p_reason text,
  p_public_reason text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_report admin_security_trust_center_reports%rowtype;
  v_revocation_id uuid;
begin
  select *
  into v_report
  from admin_security_trust_center_reports
  where id = p_trust_center_report_id
  for update;

  if v_report.id is null then
    raise exception 'trust center report publication not found: %', p_trust_center_report_id;
  end if;

  if v_report.status = 'unpublished' then
    raise exception 'trust center report publication is already unpublished';
  end if;

  v_revocation_id := create_admin_security_revocation_record(
    p_admin_auth_user_id,
    'admin_security_trust_center_report',
    v_report.id,
    'public_disclosure_removed',
    'medium',
    p_reason_code,
    p_reason,
    p_public_reason,
    null,
    true,
    false,
    false,
    null,
    null,
    v_report.status,
    'unpublished',
    p_request_id,
    p_metadata
  );

  update admin_security_trust_center_reports
  set
    status = 'unpublished',
    unpublished_at = now(),
    unpublished_by_auth_user_id = p_admin_auth_user_id,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'revocation_record_id',
      v_revocation_id,
      'unpublish_reason_code',
      p_reason_code
    ),
    updated_at = now()
  where id = v_report.id;

  perform queue_admin_security_revocation_notifications(
    v_revocation_id,
    p_request_id,
    p_metadata
  );

  return v_revocation_id;
end;
$$;

create or replace function force_expire_admin_security_artifact(
  p_admin_auth_user_id uuid,
  p_source_type text,
  p_source_id uuid,
  p_reason_code text,
  p_reason text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_revocation_id uuid;
  v_previous_status text;
begin
  if p_source_type = 'admin_security_compliance_report' then
    select status into v_previous_status
    from admin_security_compliance_report_requests
    where id = p_source_id
    for update;

    if v_previous_status is null then
      raise exception 'compliance report request not found: %', p_source_id;
    end if;

    update admin_security_compliance_report_requests
    set
      status = 'expired',
      expires_at = least(coalesce(expires_at, now()), now()),
      metadata = metadata || jsonb_build_object('force_expired_at', now()),
      updated_at = now()
    where id = p_source_id;
  elsif p_source_type = 'admin_security_questionnaire_export' then
    select status into v_previous_status
    from admin_security_questionnaire_exports
    where id = p_source_id
    for update;

    if v_previous_status is null then
      raise exception 'questionnaire export not found: %', p_source_id;
    end if;

    update admin_security_questionnaire_exports
    set
      status = 'expired',
      expires_at = least(coalesce(expires_at, now()), now()),
      metadata = metadata || jsonb_build_object('force_expired_at', now()),
      updated_at = now()
    where id = p_source_id;
  elsif p_source_type = 'admin_security_enterprise_review_room_document_grant' then
    select status into v_previous_status
    from admin_security_enterprise_review_room_document_grants
    where id = p_source_id
    for update;

    if v_previous_status is null then
      raise exception 'enterprise review room document grant not found: %', p_source_id;
    end if;

    update admin_security_enterprise_review_room_document_grants
    set
      status = 'expired',
      access_expires_at = least(coalesce(access_expires_at, now()), now()),
      metadata = metadata || jsonb_build_object('force_expired_at', now()),
      updated_at = now()
    where id = p_source_id;
  else
    raise exception 'unsupported force-expire source type: %', p_source_type;
  end if;

  v_revocation_id := create_admin_security_revocation_record(
    p_admin_auth_user_id,
    p_source_type,
    p_source_id,
    'forced_expiry',
    'medium',
    p_reason_code,
    p_reason,
    p_reason,
    null,
    true,
    true,
    false,
    null,
    null,
    v_previous_status,
    'expired',
    p_request_id,
    p_metadata
  );

  perform queue_admin_security_revocation_notifications(
    v_revocation_id,
    p_request_id,
    p_metadata
  );

  return v_revocation_id;
end;
$$;

create or replace view admin_security_public_revocation_registry as
select
  revocation_key,
  source_type,
  source_id,
  revocation_type,
  severity,
  reason_code,
  coalesce(public_reason, reason) as public_reason,
  effective_at,
  affected_customer_name,
  created_at
from admin_security_revocation_records
where status = 'active'
  and disclose_publicly is true;

grant select on admin_security_public_revocation_registry to admin_api_role;

create or replace function verify_admin_security_compliance_report_public(
  p_report_key text,
  p_checksum_sha256 text,
  p_signature text,
  p_period_seal_checksum_sha256 text,
  p_signature_match boolean default false,
  p_requester_ip inet default null,
  p_user_agent text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_report admin_security_compliance_report_public_verification%rowtype;
  v_report_found boolean := false;
  v_checksum_match boolean := false;
  v_signature_match boolean := false;
  v_period_seal_match boolean := false;
  v_report_hash_found boolean := false;
  v_period_hash_found boolean := false;
  v_report_valid_state boolean := false;
  v_status text := 'failed';
  v_failure_reason text;
begin
  if p_report_key is null or length(trim(p_report_key)) = 0 then
    v_status := 'invalid_input';
    v_failure_reason := 'report key is required';
  elsif p_checksum_sha256 is null or length(trim(p_checksum_sha256)) = 0 then
    v_status := 'invalid_input';
    v_failure_reason := 'checksum is required';
  elsif p_signature is null or length(trim(p_signature)) = 0 then
    v_status := 'invalid_input';
    v_failure_reason := 'signature is required';
  elsif p_period_seal_checksum_sha256 is null or length(trim(p_period_seal_checksum_sha256)) = 0 then
    v_status := 'invalid_input';
    v_failure_reason := 'period seal checksum is required';
  else
    select *
    into v_report
    from admin_security_compliance_report_public_verification
    where report_key = p_report_key;

    if v_report.report_key is null then
      v_status := 'not_found';
      v_failure_reason := 'report not found';
    else
      v_report_found := true;
      v_checksum_match := v_report.report_checksum_sha256 = p_checksum_sha256;
      v_signature_match := coalesce(p_signature_match, false)
        and v_report.signature = p_signature;
      v_period_seal_match :=
        v_report.period_seal_checksum_sha256 = p_period_seal_checksum_sha256;
      v_report_hash_found := v_report.report_hash_found;
      v_period_hash_found := v_report.period_hash_found;
      v_report_valid_state :=
        v_report.status = 'ready'
        and v_report.audit_period_status = 'sealed'
        and (v_report.expires_at is null or v_report.expires_at > now());

      if v_report.status = 'revoked' then
        v_status := 'revoked';
        v_failure_reason := 'report was revoked';
      elsif v_report.status = 'expired'
        or (v_report.expires_at is not null and v_report.expires_at <= now())
      then
        v_status := 'expired';
        v_failure_reason := 'report expired';
      elsif v_checksum_match
        and v_signature_match
        and v_period_seal_match
        and v_report_hash_found
        and v_period_hash_found
        and v_report_valid_state
      then
        v_status := 'verified';
        v_failure_reason := null;
      else
        v_status := 'failed';
        v_failure_reason :=
          case
            when v_checksum_match is not true then 'checksum mismatch'
            when v_signature_match is not true then 'signature mismatch'
            when v_period_seal_match is not true then 'period seal checksum mismatch'
            when v_report_hash_found is not true then 'report hash-chain entry missing'
            when v_period_hash_found is not true then 'audit period hash-chain entry missing'
            when v_report_valid_state is not true then 'report is not in valid ready state'
            else 'verification failed'
          end;
      end if;
    end if;
  end if;

  insert into admin_security_compliance_report_verification_attempts (
    report_key,
    checksum_sha256,
    signature,
    period_seal_checksum_sha256,
    verification_status,
    report_found,
    checksum_match,
    signature_match,
    period_seal_match,
    report_hash_found,
    period_hash_found,
    report_valid_state,
    failure_reason,
    requester_ip,
    user_agent,
    request_id,
    metadata
  )
  values (
    p_report_key,
    p_checksum_sha256,
    p_signature,
    p_period_seal_checksum_sha256,
    v_status,
    v_report_found,
    v_checksum_match,
    v_signature_match,
    v_period_seal_match,
    v_report_hash_found,
    v_period_hash_found,
    v_report_valid_state,
    v_failure_reason,
    p_requester_ip,
    p_user_agent,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return jsonb_build_object(
    'verificationStatus', v_status,
    'verified', v_status = 'verified',
    'failureReason', v_failure_reason,
    'report', case
      when v_report_found then jsonb_build_object(
        'reportKey', v_report.report_key,
        'reportTitle', v_report.report_title,
        'reportType', v_report.report_type,
        'reportFormat', v_report.report_format,
        'reportAudience', v_report.report_audience,
        'generatedAt', v_report.generated_at,
        'signedAt', v_report.signed_at,
        'expiresAt', v_report.expires_at,
        'watermark', v_report.watermark,
        'sectionCount', v_report.section_count,
        'evidenceItemCount', v_report.evidence_item_count
      )
      else null
    end,
    'auditPeriod', case
      when v_report_found then jsonb_build_object(
        'periodKey', v_report.period_key,
        'periodName', v_report.period_name,
        'auditType', v_report.audit_type,
        'periodStart', v_report.period_start,
        'periodEnd', v_report.period_end,
        'sealedAt', v_report.audit_period_sealed_at,
        'periodSealChecksumSha256', v_report.period_seal_checksum_sha256
      )
      else null
    end,
    'checks', jsonb_build_object(
      'reportFound', v_report_found,
      'checksumMatch', v_checksum_match,
      'signatureMatch', v_signature_match,
      'periodSealMatch', v_period_seal_match,
      'reportHashFound', v_report_hash_found,
      'periodHashFound', v_period_hash_found,
      'reportValidState', v_report_valid_state
    ),
    'revocation', (
      select jsonb_build_object(
        'revoked', true,
        'revocationKey', rr.revocation_key,
        'reasonCode', rr.reason_code,
        'publicReason', coalesce(rr.public_reason, rr.reason),
        'effectiveAt', rr.effective_at
      )
      from admin_security_revocation_records rr
      where rr.source_type = 'admin_security_compliance_report'
        and rr.source_id = v_report.compliance_report_request_id
        and rr.status = 'active'
        and rr.disclose_publicly is true
      order by rr.created_at desc
      limit 1
    )
  );
end;
$$;

create or replace function verify_admin_security_questionnaire_export_public(
  p_export_key text,
  p_checksum_sha256 text,
  p_signature text,
  p_signature_match boolean default false,
  p_requester_ip inet default null,
  p_user_agent text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_export admin_security_questionnaire_export_public_verification%rowtype;
  v_export_found boolean := false;
  v_checksum_match boolean := false;
  v_signature_match boolean := false;
  v_export_valid_state boolean := false;
  v_project_approved boolean := false;
  v_hash_found boolean := false;
  v_status text := 'failed';
  v_failure_reason text;
begin
  if p_export_key is null or length(trim(p_export_key)) = 0 then
    v_status := 'invalid_input';
    v_failure_reason := 'questionnaire export key is required';
  elsif p_checksum_sha256 is null or length(trim(p_checksum_sha256)) = 0 then
    v_status := 'invalid_input';
    v_failure_reason := 'questionnaire export checksum is required';
  elsif p_signature is null or length(trim(p_signature)) = 0 then
    v_status := 'invalid_input';
    v_failure_reason := 'questionnaire export signature is required';
  else
    select *
    into v_export
    from admin_security_questionnaire_export_public_verification
    where export_key = p_export_key;

    if v_export.export_key is null then
      v_status := 'not_found';
      v_failure_reason := 'questionnaire export not found';
    else
      v_export_found := true;
      v_checksum_match := v_export.checksum_sha256 = p_checksum_sha256;
      v_signature_match := coalesce(p_signature_match, false)
        and v_export.signature = p_signature;
      v_project_approved := v_export.project_status in ('approved', 'exported', 'sent');
      v_hash_found := v_export.hash_found;
      v_export_valid_state :=
        v_export.status = 'ready'
        and v_export.signature is not null
        and v_export.signed_at is not null
        and (v_export.expires_at is null or v_export.expires_at > now());

      if v_export.status = 'revoked' then
        v_status := 'revoked';
        v_failure_reason := 'questionnaire export was revoked';
      elsif v_export.status = 'expired'
        or (v_export.expires_at is not null and v_export.expires_at <= now())
      then
        v_status := 'expired';
        v_failure_reason := 'questionnaire export expired';
      elsif v_checksum_match
        and v_signature_match
        and v_export_valid_state
        and v_project_approved
        and v_hash_found
      then
        v_status := 'verified';
        v_failure_reason := null;
      else
        v_status := 'failed';
        v_failure_reason :=
          case
            when v_checksum_match is not true then 'checksum mismatch'
            when v_signature_match is not true then 'signature mismatch'
            when v_export_valid_state is not true then 'questionnaire export is not in valid ready state'
            when v_project_approved is not true then 'questionnaire project was not approved'
            when v_hash_found is not true then 'questionnaire export hash-chain entry missing'
            else 'verification failed'
          end;
      end if;
    end if;
  end if;

  insert into admin_security_questionnaire_export_verification_attempts (
    export_key,
    checksum_sha256,
    signature,
    verification_status,
    export_found,
    checksum_match,
    signature_match,
    export_valid_state,
    project_approved,
    hash_found,
    failure_reason,
    requester_ip,
    user_agent,
    request_id,
    metadata
  )
  values (
    p_export_key,
    p_checksum_sha256,
    p_signature,
    v_status,
    v_export_found,
    v_checksum_match,
    v_signature_match,
    v_export_valid_state,
    v_project_approved,
    v_hash_found,
    v_failure_reason,
    p_requester_ip,
    p_user_agent,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return jsonb_build_object(
    'verificationStatus', v_status,
    'verified', v_status = 'verified',
    'failureReason', v_failure_reason,
    'export', case
      when v_export_found then jsonb_build_object(
        'exportKey', v_export.export_key,
        'exportFormat', v_export.export_format,
        'checksumSha256', v_export.checksum_sha256,
        'payloadBytes', v_export.payload_bytes,
        'signatureAlgorithm', v_export.signature_algorithm,
        'signingKeyVersion', v_export.signing_key_version,
        'signature', v_export.signature,
        'signedAt', v_export.signed_at,
        'generatedAt', v_export.generated_at,
        'expiresAt', v_export.expires_at,
        'watermark', v_export.watermark,
        'questionCount', v_export.question_count,
        'evidenceCount', v_export.evidence_count
      )
      else null
    end,
    'questionnaire', case
      when v_export_found then jsonb_build_object(
        'projectKey', v_export.project_key,
        'customerName', v_export.customer_name,
        'customerDomain', v_export.customer_domain,
        'questionnaireTitle', v_export.questionnaire_title,
        'questionnaireType', v_export.questionnaire_type,
        'approvedAt', v_export.approved_at
      )
      else null
    end,
    'checks', jsonb_build_object(
      'exportFound', v_export_found,
      'checksumMatch', v_checksum_match,
      'signatureMatch', v_signature_match,
      'exportValidState', v_export_valid_state,
      'projectApproved', v_project_approved,
      'hashFound', v_hash_found
    ),
    'revocation', (
      select jsonb_build_object(
        'revoked', true,
        'revocationKey', rr.revocation_key,
        'reasonCode', rr.reason_code,
        'publicReason', coalesce(rr.public_reason, rr.reason),
        'effectiveAt', rr.effective_at
      )
      from admin_security_revocation_records rr
      where rr.source_type = 'admin_security_questionnaire_export'
        and rr.source_id = v_export.questionnaire_export_id
        and rr.status = 'active'
        and rr.disclose_publicly is true
      order by rr.created_at desc
      limit 1
    )
  );
end;
$$;

create or replace view admin_security_revocation_dashboard as
select
  r.id as admin_security_revocation_record_id,
  r.revocation_key,
  r.status,
  r.source_type,
  r.source_id,
  r.revocation_type,
  r.severity,
  r.reason_code,
  r.reason,
  r.public_reason,
  r.effective_at,
  r.disclose_publicly,
  r.notify_customers,
  r.notify_auditors,
  r.affected_customer_name,
  r.affected_room_id,
  room.room_key as affected_room_key,
  r.affected_participant_count,
  r.previous_status,
  r.new_status,
  admin.email as revoked_by_email,
  (
    select count(*)
    from admin_security_revocation_notifications n
    where n.revocation_record_id = r.id
  ) as notification_count,
  (
    select count(*)
    from admin_security_revocation_notifications n
    where n.revocation_record_id = r.id
      and n.status = 'sent'
  ) as sent_notification_count,
  (
    select count(*)
    from admin_security_revocation_notifications n
    where n.revocation_record_id = r.id
      and n.status = 'failed'
  ) as failed_notification_count,
  r.created_at,
  r.metadata
from admin_security_revocation_records r
left join admin_security_enterprise_review_rooms room
  on room.id = r.affected_room_id
left join admin_users admin
  on admin.id = r.revoked_by_admin_user_id
order by r.created_at desc;

create or replace view admin_security_revocation_notification_dashboard as
select
  n.id as admin_security_revocation_notification_id,
  n.revocation_record_id,
  r.revocation_key,
  r.source_type,
  r.source_id,
  r.severity,
  r.reason_code,
  n.status,
  n.notification_type,
  n.recipient_type,
  n.recipient_email,
  n.recipient_auth_user_id,
  n.recipient_label,
  n.subject,
  n.claimed_by_worker_id,
  n.claimed_at,
  n.sent_at,
  n.failed_at,
  n.last_error,
  n.created_at,
  n.updated_at,
  n.metadata
from admin_security_revocation_notifications n
join admin_security_revocation_records r
  on r.id = n.revocation_record_id
order by n.created_at desc;

create or replace view admin_security_revocation_integrity as
select
  (
    select count(*)
    from admin_security_revocation_records
    where status = 'active'
  ) as active_revocation_count,
  (
    select count(*)
    from admin_security_revocation_records
    where status = 'active'
      and severity = 'critical'
  ) as critical_active_revocation_count,
  (
    select count(*)
    from admin_security_revocation_records
    where status = 'active'
      and created_at >= now() - interval '24 hours'
  ) as revocation_count_24h,
  (
    select count(*)
    from admin_security_revocation_notifications
    where status = 'pending'
  ) as pending_notification_count,
  (
    select count(*)
    from admin_security_revocation_notifications
    where status = 'failed'
  ) as failed_notification_count,
  (
    select count(*)
    from admin_security_compliance_report_requests
    where status = 'revoked'
      and not exists (
        select 1
        from admin_security_revocation_records rr
        where rr.source_type = 'admin_security_compliance_report'
          and rr.source_id = admin_security_compliance_report_requests.id
          and rr.status = 'active'
      )
  ) as revoked_report_missing_record_count,
  (
    select count(*)
    from admin_security_questionnaire_exports
    where status = 'revoked'
      and not exists (
        select 1
        from admin_security_revocation_records rr
        where rr.source_type = 'admin_security_questionnaire_export'
          and rr.source_id = admin_security_questionnaire_exports.id
          and rr.status = 'active'
      )
  ) as revoked_export_missing_record_count,
  now() as checked_at;

grant select on admin_security_revocation_dashboard to admin_api_role;
grant select on admin_security_revocation_notification_dashboard to admin_api_role;
grant select on admin_security_revocation_integrity to admin_api_role;

alter table admin_security_revocation_records enable row level security;
alter table admin_security_revocation_notifications enable row level security;

drop policy if exists admin_security_revocation_records_no_user_direct_access
on admin_security_revocation_records;
create policy admin_security_revocation_records_no_user_direct_access
on admin_security_revocation_records
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_revocation_notifications_no_user_direct_access
on admin_security_revocation_notifications;
create policy admin_security_revocation_notifications_no_user_direct_access
on admin_security_revocation_notifications
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_api_all_admin_security_revocation_records
on admin_security_revocation_records;
create policy admin_api_all_admin_security_revocation_records
on admin_security_revocation_records
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_revocation_notifications
on admin_security_revocation_notifications;
create policy admin_api_all_admin_security_revocation_notifications
on admin_security_revocation_notifications
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists worker_all_admin_security_revocation_notifications
on admin_security_revocation_notifications;
create policy worker_all_admin_security_revocation_notifications
on admin_security_revocation_notifications
for all
to worker_role
using (true)
with check (true);

drop policy if exists worker_read_admin_security_revocation_records
on admin_security_revocation_records;
create policy worker_read_admin_security_revocation_records
on admin_security_revocation_records
for select
to worker_role
using (true);

grant execute on function create_admin_security_revocation_record(
  uuid,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  boolean,
  text,
  uuid,
  text,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function queue_admin_security_revocation_notifications(uuid, text, jsonb)
to admin_api_role, worker_role;

grant execute on function revoke_admin_security_compliance_report(
  uuid,
  uuid,
  text,
  text,
  text,
  boolean,
  boolean,
  text,
  jsonb
) to admin_api_role;

grant execute on function revoke_admin_security_questionnaire_export(
  uuid,
  uuid,
  text,
  text,
  text,
  boolean,
  boolean,
  text,
  jsonb
) to admin_api_role;

grant execute on function revoke_admin_security_enterprise_review_room_document_grant(
  uuid,
  uuid,
  text,
  text,
  text,
  boolean,
  text,
  jsonb
) to admin_api_role;

grant execute on function revoke_admin_security_trust_center_report_publication(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function force_expire_admin_security_artifact(
  uuid,
  text,
  uuid,
  text,
  text,
  text,
  jsonb
) to admin_api_role;

alter function create_admin_security_revocation_record(
  uuid,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  boolean,
  text,
  uuid,
  text,
  text,
  text,
  jsonb
) security definer;

alter function create_admin_security_revocation_record(
  uuid,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  boolean,
  text,
  uuid,
  text,
  text,
  text,
  jsonb
) set search_path = public;

alter function queue_admin_security_revocation_notifications(uuid, text, jsonb) security definer;
alter function queue_admin_security_revocation_notifications(uuid, text, jsonb) set search_path = public;

alter function revoke_admin_security_compliance_report(
  uuid,
  uuid,
  text,
  text,
  text,
  boolean,
  boolean,
  text,
  jsonb
) security definer;

alter function revoke_admin_security_compliance_report(
  uuid,
  uuid,
  text,
  text,
  text,
  boolean,
  boolean,
  text,
  jsonb
) set search_path = public;

alter function revoke_admin_security_questionnaire_export(
  uuid,
  uuid,
  text,
  text,
  text,
  boolean,
  boolean,
  text,
  jsonb
) security definer;

alter function revoke_admin_security_questionnaire_export(
  uuid,
  uuid,
  text,
  text,
  text,
  boolean,
  boolean,
  text,
  jsonb
) set search_path = public;

alter function revoke_admin_security_enterprise_review_room_document_grant(
  uuid,
  uuid,
  text,
  text,
  text,
  boolean,
  text,
  jsonb
) security definer;

alter function revoke_admin_security_enterprise_review_room_document_grant(
  uuid,
  uuid,
  text,
  text,
  text,
  boolean,
  text,
  jsonb
) set search_path = public;

alter function revoke_admin_security_trust_center_report_publication(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  jsonb
) security definer;

alter function revoke_admin_security_trust_center_report_publication(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  jsonb
) set search_path = public;

alter function force_expire_admin_security_artifact(
  uuid,
  text,
  uuid,
  text,
  text,
  text,
  jsonb
) security definer;

alter function force_expire_admin_security_artifact(
  uuid,
  text,
  uuid,
  text,
  text,
  text,
  jsonb
) set search_path = public;

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
    'REVOCATION_REQUIRED_FIELDS',
    'validation',
    'medium',
    400,
    false,
    true,
    'Revocation requires complete fields.',
    'Revocation request missing required fields.',
    'platform'
  ),
  (
    'REVOCATION_INVALID_STATE',
    'validation',
    'high',
    409,
    false,
    true,
    'Artifact cannot be revoked from its current state.',
    'Revocation invalid state.',
    'platform'
  ),
  (
    'REVOCATION_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Revocation target not found.',
    'Revocation target not found.',
    'platform'
  ),
  (
    'REVOCATION_MFA_REQUIRED',
    'permission',
    'critical',
    403,
    false,
    true,
    'MFA is required to revoke this artifact.',
    'Revocation requires MFA.',
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
  ('revocation source id is required', 'REVOCATION_REQUIRED_FIELDS', 5, '{}'),
  ('revocation reason is required', 'REVOCATION_REQUIRED_FIELDS', 5, '{}'),
  ('revocation record not found', 'REVOCATION_NOT_FOUND', 5, '{}'),
  ('compliance report request not found', 'REVOCATION_NOT_FOUND', 5, '{}'),
  ('questionnaire export not found', 'REVOCATION_NOT_FOUND', 5, '{}'),
  ('enterprise review room document grant not found', 'REVOCATION_NOT_FOUND', 5, '{}'),
  ('trust center report publication not found', 'REVOCATION_NOT_FOUND', 5, '{}'),
  ('compliance report is already revoked', 'REVOCATION_INVALID_STATE', 5, '{}'),
  ('questionnaire export is already revoked', 'REVOCATION_INVALID_STATE', 5, '{}'),
  ('enterprise review room document grant is already revoked', 'REVOCATION_INVALID_STATE', 5, '{}'),
  ('trust center report publication is already unpublished', 'REVOCATION_INVALID_STATE', 5, '{}'),
  ('unsupported force-expire source type', 'REVOCATION_INVALID_STATE', 5, '{}'),
  ('MFA', 'REVOCATION_MFA_REQUIRED', 3, '{}')
on conflict do nothing;
