-- Step 9.89 — Trust admin alerts v2: functions (part 03).
-- Requires parts 224_trust_alerts_v2_01_tables.sql and 224_trust_alerts_v2_02_core_tables.sql.

create or replace function record_admin_security_trust_alert_audit_event(
  p_event_type text,
  p_event_action text,
  p_alert_event_id uuid default null,
  p_alert_notification_id uuid default null,
  p_alert_policy_id uuid default null,
  p_alert_channel_id uuid default null,
  p_alert_recipient_id uuid default null,
  p_customer_name text default null,
  p_customer_domain text default null,
  p_actor_type text default 'system',
  p_actor_auth_user_id uuid default null,
  p_actor_admin_user_id uuid default null,
  p_actor_email text default null,
  p_title text default null,
  p_summary text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
  v_key text;
begin
  v_key :=
    'trust_alert_audit_event:' ||
    p_event_type || ':' ||
    substr(encode(gen_random_bytes(12), 'hex'), 1, 24);

  insert into admin_security_trust_alert_audit_events (
    alert_audit_event_key,
    event_type,
    event_action,
    status,
    alert_event_id,
    alert_notification_id,
    alert_policy_id,
    alert_channel_id,
    alert_recipient_id,
    customer_name,
    customer_domain,
    actor_type,
    actor_auth_user_id,
    actor_admin_user_id,
    actor_email,
    title,
    summary,
    request_id,
    metadata
  )
  values (
    v_key,
    p_event_type,
    p_event_action,
    'recorded',
    p_alert_event_id,
    p_alert_notification_id,
    p_alert_policy_id,
    p_alert_channel_id,
    p_alert_recipient_id,
    p_customer_name,
    p_customer_domain,
    coalesce(p_actor_type, 'system'),
    p_actor_auth_user_id,
    p_actor_admin_user_id,
    p_actor_email,
    p_title,
    p_summary,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function admin_security_alert_severity_rank(p_severity text)
returns integer
language sql
immutable
as $$
  select case p_severity
    when 'critical' then 5
    when 'high' then 4
    when 'medium' then 3
    when 'low' then 2
    when 'info' then 1
    else 0
  end;
$$;

create or replace function create_admin_security_trust_alert_event(
  p_source_module text,
  p_source_event_type text,
  p_severity text,
  p_alert_priority text,
  p_title text,
  p_summary text,
  p_customer_name text default null,
  p_customer_domain text default null,
  p_source_table text default null,
  p_source_id uuid default null,
  p_source_key text default null,
  p_command_queue_item_id uuid default null,
  p_incident_id uuid default null,
  p_ai_finding_id uuid default null,
  p_risk_score_id uuid default null,
  p_webhook_delivery_id uuid default null,
  p_billing_account_id uuid default null,
  p_dedupe_key text default null,
  p_alert_payload jsonb default '{}'::jsonb,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_alert_id uuid;
  v_key text;
  v_dedupe text;
begin
  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'trust alert title is required';
  end if;

  if p_summary is null or length(trim(p_summary)) = 0 then
    raise exception 'trust alert summary is required';
  end if;

  v_dedupe := coalesce(
    p_dedupe_key,
    p_source_module || ':' ||
    p_source_event_type || ':' ||
    coalesce(p_source_table, '') || ':' ||
    coalesce(p_source_id::text, '') || ':' ||
    coalesce(p_source_key, '') || ':' ||
    coalesce(p_customer_name, '') || ':' ||
    coalesce(p_customer_domain, '')
  );

  v_key := 'trust_alert_event:' || encode(digest(v_dedupe, 'sha256'), 'hex');

  insert into admin_security_trust_alert_events (
    alert_event_key,
    status,
    source_module,
    source_event_type,
    severity,
    alert_priority,
    customer_name,
    customer_domain,
    title,
    summary,
    source_table,
    source_id,
    source_key,
    command_queue_item_id,
    incident_id,
    ai_finding_id,
    risk_score_id,
    webhook_delivery_id,
    billing_account_id,
    dedupe_key,
    first_seen_at,
    last_seen_at,
    occurrence_count,
    next_escalation_at,
    alert_payload,
    request_id,
    metadata
  )
  values (
    v_key,
    'open',
    p_source_module,
    p_source_event_type,
    coalesce(p_severity, 'medium'),
    coalesce(p_alert_priority, 'medium'),
    p_customer_name,
    p_customer_domain,
    p_title,
    p_summary,
    p_source_table,
    p_source_id,
    p_source_key,
    p_command_queue_item_id,
    p_incident_id,
    p_ai_finding_id,
    p_risk_score_id,
    p_webhook_delivery_id,
    p_billing_account_id,
    v_dedupe,
    now(),
    now(),
    1,
    now() + interval '30 minutes',
    coalesce(p_alert_payload, '{}'::jsonb),
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (dedupe_key)
  do update set
    status = case
      when admin_security_trust_alert_events.status in ('resolved', 'suppressed', 'archived')
      then admin_security_trust_alert_events.status
      else 'open'
    end,
    severity = excluded.severity,
    alert_priority = excluded.alert_priority,
    title = excluded.title,
    summary = excluded.summary,
    last_seen_at = now(),
    occurrence_count = admin_security_trust_alert_events.occurrence_count + 1,
    alert_payload = excluded.alert_payload,
    metadata = admin_security_trust_alert_events.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_alert_id;

  perform record_admin_security_trust_alert_audit_event(
    'alert_event_created',
    'created_or_updated',
    v_alert_id,
    null,
    null,
    null,
    null,
    p_customer_name,
    p_customer_domain,
    'system',
    null,
    null,
    null,
    p_title,
    p_summary,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_alert_id;
end;
$$;

create or replace function build_admin_security_trust_alert_notifications(
  p_batch_size integer default 500,
  p_worker_id text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_event record;
  v_policy record;
  v_recipient record;
  v_channel record;
  v_notification_id uuid;
  v_count integer := 0;
  v_idempotency text;
begin
  if p_batch_size <= 0 or p_batch_size > 2000 then
    raise exception 'batch size must be between 1 and 2000';
  end if;

  for v_event in
    select *
    from admin_security_trust_alert_events
    where status = 'open'
    order by created_at asc
    limit p_batch_size
  loop
    for v_policy in
      select *
      from admin_security_trust_alert_policies p
      where p.status = 'active'
        and p.enabled is true
        and p.source_module = v_event.source_module
        and (p.source_event_type = '*' or p.source_event_type = v_event.source_event_type)
        and admin_security_alert_severity_rank(v_event.severity) >= admin_security_alert_severity_rank(p.min_severity)
        and (
          p.policy_scope = 'global'
          or (
            p.policy_scope = 'customer'
            and p.customer_name = v_event.customer_name
            and coalesce(p.customer_domain, '') = coalesce(v_event.customer_domain, '')
          )
        )
    loop
      for v_recipient in
        select *
        from admin_security_trust_alert_recipients r
        where r.status = 'active'
          and r.enabled is true
          and admin_security_alert_severity_rank(v_event.severity) >= admin_security_alert_severity_rank(r.severity_floor)
          and (
            (v_policy.route_payload ? 'teamKey' and r.team_key = v_policy.route_payload->>'teamKey')
            or r.recipient_type in ('on_call', 'system')
            or (v_policy.route_payload ? 'recipientEmail' and r.recipient_email = v_policy.route_payload->>'recipientEmail')
          )
      loop
        for v_channel in
          select *
          from admin_security_trust_alert_channels c
          where c.status = 'active'
            and c.enabled is true
            and (
              (c.channel_type = 'in_app' and v_policy.create_in_app is true and v_recipient.allow_in_app is true)
              or (c.channel_type = 'email' and v_policy.send_email is true and v_recipient.allow_email is true)
              or (c.channel_type = 'mobile_push' and v_policy.send_mobile_push is true and v_recipient.allow_mobile_push is true)
              or (c.channel_type = 'slack' and v_policy.send_slack is true and v_recipient.allow_slack is true)
              or (c.channel_type = 'pagerduty' and v_policy.send_pagerduty is true and v_recipient.allow_pagerduty is true)
              or (c.channel_type = 'webhook' and v_policy.send_webhook is true)
            )
        loop
          v_notification_id := null;

          v_idempotency :=
            'trust_alert_notification:' ||
            v_event.id::text || ':' ||
            v_policy.id::text || ':' ||
            v_recipient.id::text || ':' ||
            v_channel.id::text || ':' ||
            v_event.escalation_level::text;

          insert into admin_security_trust_alert_notifications (
            alert_notification_key,
            status,
            alert_event_id,
            alert_policy_id,
            alert_channel_id,
            alert_recipient_id,
            channel_type,
            customer_name,
            customer_domain,
            recipient_name,
            recipient_address,
            title,
            body,
            severity,
            alert_priority,
            delivery_payload,
            delivery_headers,
            attempt_count,
            max_attempts,
            next_attempt_at,
            idempotency_key,
            request_id,
            metadata
          )
          values (
            'trust_alert_notification:' || encode(digest(v_idempotency, 'sha256'), 'hex'),
            'pending',
            v_event.id,
            v_policy.id,
            v_channel.id,
            v_recipient.id,
            v_channel.channel_type,
            v_event.customer_name,
            v_event.customer_domain,
            v_recipient.recipient_name,
            case
              when v_channel.channel_type = 'email' then v_recipient.recipient_email
              when v_channel.channel_type = 'sms' then v_recipient.recipient_phone
              else coalesce(v_channel.destination_address, v_recipient.recipient_email)
            end,
            '[' || upper(v_event.severity) || '] ' || v_event.title,
            v_event.summary,
            v_event.severity,
            v_event.alert_priority,
            jsonb_build_object(
              'alertEventId', v_event.id,
              'alertEventKey', v_event.alert_event_key,
              'sourceModule', v_event.source_module,
              'sourceEventType', v_event.source_event_type,
              'customerName', v_event.customer_name,
              'customerDomain', v_event.customer_domain,
              'severity', v_event.severity,
              'priority', v_event.alert_priority,
              'title', v_event.title,
              'summary', v_event.summary,
              'sourceTable', v_event.source_table,
              'sourceId', v_event.source_id,
              'sourceKey', v_event.source_key,
              'payload', v_event.alert_payload
            ),
            jsonb_build_object(
              'x-i-trust-alert-event-key', v_event.alert_event_key,
              'x-i-trust-alert-severity', v_event.severity
            ),
            0,
            5,
            now(),
            v_idempotency,
            p_request_id,
            coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
              'worker_id',
              p_worker_id,
              'alert_notification_build_run_id',
              v_run_id
            )
          )
          on conflict (idempotency_key)
          do nothing
          returning id into v_notification_id;

          if v_notification_id is not null then
            v_count := v_count + 1;

            perform record_admin_security_trust_alert_audit_event(
              'notification_created',
              'created',
              v_event.id,
              v_notification_id,
              v_policy.id,
              v_channel.id,
              v_recipient.id,
              v_event.customer_name,
              v_event.customer_domain,
              'worker',
              null,
              null,
              null,
              v_event.title,
              v_channel.channel_type,
              p_request_id,
              coalesce(p_metadata, '{}'::jsonb)
            );
          end if;
        end loop;
      end loop;
    end loop;
  end loop;

  return jsonb_build_object(
    'runId',
    v_run_id,
    'notificationsCreated',
    v_count
  );
end;
$$;

create or replace function lease_due_admin_security_trust_alert_notifications(
  p_batch_size integer default 100,
  p_worker_id text default null,
  p_lease_seconds integer default 120,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  alert_notification_id uuid,
  alert_notification_key text,
  channel_type text,
  recipient_address text,
  title text,
  body text,
  delivery_payload jsonb,
  delivery_headers jsonb
)
language plpgsql
as $$
begin
  if p_batch_size <= 0 or p_batch_size > 500 then
    raise exception 'batch size must be between 1 and 500';
  end if;

  return query
  with picked as (
    select id
    from admin_security_trust_alert_notifications
    where status in ('pending', 'retry_scheduled')
      and next_attempt_at <= now()
    order by
      case alert_priority
        when 'critical' then 1
        when 'high' then 2
        when 'medium' then 3
        else 4
      end,
      next_attempt_at asc,
      created_at asc
    limit p_batch_size
    for update skip locked
  )
  update admin_security_trust_alert_notifications n
  set
    status = 'attempting',
    next_attempt_at = now() + make_interval(secs => coalesce(p_lease_seconds, 120)),
    metadata = n.metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('leased_by_worker', p_worker_id),
    updated_at = now()
  from picked p
  where n.id = p.id
  returning
    n.id,
    n.alert_notification_key,
    n.channel_type,
    n.recipient_address,
    n.title,
    n.body,
    n.delivery_payload,
    n.delivery_headers;
end;
$$;

create or replace function record_admin_security_trust_alert_notification_result(
  p_alert_notification_id uuid,
  p_success boolean,
  p_response_status integer default null,
  p_response_body_preview text default null,
  p_error_code text default null,
  p_error_message text default null,
  p_duration_ms integer default null,
  p_worker_id text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_notification admin_security_trust_alert_notifications%rowtype;
  v_attempt_id uuid;
  v_attempt_key text;
  v_next_attempt_at timestamptz;
begin
  select *
  into v_notification
  from admin_security_trust_alert_notifications
  where id = p_alert_notification_id
  for update;

  if v_notification.id is null then
    raise exception 'trust alert notification not found: %', p_alert_notification_id;
  end if;

  v_attempt_key :=
    'trust_alert_delivery_attempt:' ||
    v_notification.alert_notification_key || ':' ||
    (v_notification.attempt_count + 1)::text;

  insert into admin_security_trust_alert_delivery_attempts (
    alert_delivery_attempt_key,
    alert_notification_id,
    alert_event_id,
    attempt_number,
    channel_type,
    status,
    completed_at,
    duration_ms,
    response_status,
    response_body_preview,
    error_code,
    error_message,
    worker_id,
    request_id,
    metadata
  )
  values (
    v_attempt_key,
    v_notification.id,
    v_notification.alert_event_id,
    v_notification.attempt_count + 1,
    v_notification.channel_type,
    case when p_success then 'succeeded' else 'failed' end,
    now(),
    p_duration_ms,
    p_response_status,
    left(coalesce(p_response_body_preview, ''), 2000),
    p_error_code,
    left(coalesce(p_error_message, ''), 2000),
    p_worker_id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_attempt_id;

  if p_success is true then
    update admin_security_trust_alert_notifications
    set
      status = 'delivered',
      attempt_count = attempt_count + 1,
      last_attempt_at = now(),
      delivered_at = now(),
      response_status = p_response_status,
      response_body_preview = left(coalesce(p_response_body_preview, ''), 2000),
      last_error = null,
      updated_at = now()
    where id = v_notification.id;

    perform record_admin_security_trust_alert_audit_event(
      'notification_delivered',
      'delivered',
      v_notification.alert_event_id,
      v_notification.id,
      v_notification.alert_policy_id,
      v_notification.alert_channel_id,
      v_notification.alert_recipient_id,
      v_notification.customer_name,
      v_notification.customer_domain,
      'worker',
      null,
      null,
      null,
      v_notification.title,
      v_notification.channel_type,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );
  else
    if v_notification.attempt_count + 1 >= v_notification.max_attempts then
      update admin_security_trust_alert_notifications
      set
        status = 'failed',
        attempt_count = attempt_count + 1,
        last_attempt_at = now(),
        failed_at = now(),
        response_status = p_response_status,
        response_body_preview = left(coalesce(p_response_body_preview, ''), 2000),
        last_error = left(coalesce(p_error_message, p_error_code, 'alert delivery failed'), 2000),
        updated_at = now()
      where id = v_notification.id;

      perform record_admin_security_trust_alert_audit_event(
        'notification_failed',
        'failed',
        v_notification.alert_event_id,
        v_notification.id,
        v_notification.alert_policy_id,
        v_notification.alert_channel_id,
        v_notification.alert_recipient_id,
        v_notification.customer_name,
        v_notification.customer_domain,
        'worker',
        null,
        null,
        null,
        v_notification.title,
        left(coalesce(p_error_message, p_error_code, 'alert delivery failed'), 2000),
        p_request_id,
        coalesce(p_metadata, '{}'::jsonb)
      );
    else
      v_next_attempt_at :=
        now()
        + make_interval(
            secs => least(
              1800,
              power(2, greatest(v_notification.attempt_count, 0))::integer * 60
            )
          );

      update admin_security_trust_alert_notifications
      set
        status = 'retry_scheduled',
        attempt_count = attempt_count + 1,
        last_attempt_at = now(),
        next_attempt_at = v_next_attempt_at,
        response_status = p_response_status,
        response_body_preview = left(coalesce(p_response_body_preview, ''), 2000),
        last_error = left(coalesce(p_error_message, p_error_code, 'alert delivery failed'), 2000),
        updated_at = now()
      where id = v_notification.id;

      perform record_admin_security_trust_alert_audit_event(
        'notification_failed',
        'retry_scheduled',
        v_notification.alert_event_id,
        v_notification.id,
        v_notification.alert_policy_id,
        v_notification.alert_channel_id,
        v_notification.alert_recipient_id,
        v_notification.customer_name,
        v_notification.customer_domain,
        'worker',
        null,
        null,
        null,
        v_notification.title,
        left(coalesce(p_error_message, p_error_code, 'alert delivery failed'), 2000),
        p_request_id,
        coalesce(p_metadata, '{}'::jsonb)
      );
    end if;
  end if;

  return v_attempt_id;
end;
$$;

create or replace function sync_admin_security_trust_alert_events_from_command_center(
  p_batch_size integer default 500,
  p_worker_id text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_count integer := 0;
  v_row record;
begin
  if p_batch_size <= 0 or p_batch_size > 5000 then
    raise exception 'batch size must be between 1 and 5000';
  end if;

  for v_row in
    select *
    from admin_security_trust_command_center_queue
    where status in ('open', 'acknowledged', 'assigned', 'in_progress')
      and queue_priority in ('high', 'critical')
    order by created_at desc
    limit p_batch_size
  loop
    perform create_admin_security_trust_alert_event(
      'command_center',
      'queue_item_created',
      v_row.severity,
      v_row.queue_priority,
      v_row.title,
      v_row.summary,
      v_row.customer_name,
      v_row.customer_domain,
      'admin_security_trust_command_center_queue',
      v_row.id,
      v_row.command_queue_item_key,
      v_row.id,
      null,
      null,
      null,
      null,
      null,
      'command_queue:' || v_row.command_queue_item_key,
      jsonb_build_object(
        'queueType', v_row.queue_type,
        'queuePriority', v_row.queue_priority,
        'actionRoute', v_row.action_route,
        'actionLabel', v_row.action_label
      ),
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'alertEventsCreated',
    v_count
  );
end;
$$;

create or replace function sync_admin_security_trust_alert_events_from_ai_findings(
  p_batch_size integer default 500,
  p_worker_id text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_count integer := 0;
  v_row record;
begin
  if p_batch_size <= 0 or p_batch_size > 5000 then
    raise exception 'batch size must be between 1 and 5000';
  end if;

  for v_row in
    select *
    from admin_security_trust_ai_findings
    where status in ('open', 'acknowledged', 'investigating')
      and severity in ('high', 'critical')
    order by created_at desc
    limit p_batch_size
  loop
    perform create_admin_security_trust_alert_event(
      'ai_analyst',
      'finding_created',
      v_row.severity,
      case when v_row.severity = 'critical' then 'critical' else 'high' end,
      v_row.finding_title,
      v_row.finding_summary,
      v_row.customer_name,
      v_row.customer_domain,
      'admin_security_trust_ai_findings',
      v_row.id,
      v_row.finding_key,
      null,
      null,
      v_row.id,
      null,
      null,
      null,
      'ai_finding:' || v_row.finding_key,
      jsonb_build_object(
        'findingType', v_row.finding_type,
        'detectorFamily', v_row.detector_family,
        'confidence', v_row.confidence,
        'signalCount', v_row.signal_count
      ),
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'alertEventsCreated',
    v_count
  );
end;
$$;

create or replace function sync_admin_security_trust_alert_events_from_incidents(
  p_batch_size integer default 500,
  p_worker_id text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_count integer := 0;
  v_row record;
begin
  if p_batch_size <= 0 or p_batch_size > 5000 then
    raise exception 'batch size must be between 1 and 5000';
  end if;

  for v_row in
    select *
    from admin_security_trust_incidents
    where status in ('open', 'acknowledged', 'investigating', 'escalated', 'mitigating')
      and severity in ('high', 'critical')
    order by created_at desc
    limit p_batch_size
  loop
    perform create_admin_security_trust_alert_event(
      'incidents',
      'incident_open',
      v_row.severity,
      case when v_row.severity = 'critical' then 'critical' else 'high' end,
      v_row.title,
      coalesce(v_row.summary, 'Open trust incident requires review.'),
      v_row.customer_name,
      v_row.customer_domain,
      'admin_security_trust_incidents',
      v_row.id,
      v_row.incident_key,
      null,
      v_row.id,
      null,
      null,
      null,
      null,
      'incident:' || v_row.incident_key,
      jsonb_build_object(
        'incidentType', v_row.incident_type,
        'incidentStatus', v_row.status,
        'customerNoticeRequired', v_row.customer_notice_required
      ),
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'alertEventsCreated',
    v_count
  );
end;
$$;

create or replace function sync_admin_security_trust_alert_events_from_integrations_and_billing(
  p_batch_size integer default 500,
  p_worker_id text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_count integer := 0;
  v_row record;
begin
  if p_batch_size <= 0 or p_batch_size > 5000 then
    raise exception 'batch size must be between 1 and 5000';
  end if;

  for v_row in
    select *
    from admin_security_trust_webhook_deliveries
    where status = 'dead_lettered'
      and dead_lettered_at >= now() - interval '24 hours'
    order by dead_lettered_at desc
    limit p_batch_size
  loop
    perform create_admin_security_trust_alert_event(
      'integrations',
      'delivery_dead_lettered',
      'medium',
      'medium',
      'Webhook delivery dead-lettered',
      coalesce(v_row.last_error, 'Webhook delivery failed after maximum attempts.'),
      v_row.customer_name,
      v_row.customer_domain,
      'admin_security_trust_webhook_deliveries',
      v_row.id,
      v_row.webhook_delivery_key,
      null,
      null,
      null,
      null,
      v_row.id,
      null,
      'webhook_dead_letter:' || v_row.webhook_delivery_key,
      jsonb_build_object(
        'eventType', v_row.event_namespace || '.' || v_row.event_type,
        'lastError', v_row.last_error
      ),
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    v_count := v_count + 1;
  end loop;

  for v_row in
    select *
    from admin_security_trust_usage_rollups
    where billing_period_start = date_trunc('month', now()::timestamptz)
      and usage_percent is not null
      and usage_percent >= 100
    order by usage_percent desc
    limit p_batch_size
  loop
    perform create_admin_security_trust_alert_event(
      'billing',
      'limit_exceeded',
      'medium',
      'medium',
      'Trust usage limit exceeded',
      'Customer exceeded trust usage entitlement for meter ' || v_row.meter_name || '.',
      v_row.customer_name,
      v_row.customer_domain,
      'admin_security_trust_usage_rollups',
      v_row.id,
      v_row.meter_name,
      null,
      null,
      null,
      null,
      null,
      v_row.billing_account_id,
      'billing_limit_exceeded:' || v_row.billing_account_id::text || ':' || v_row.meter_name,
      jsonb_build_object(
        'meterName', v_row.meter_name,
        'usagePercent', v_row.usage_percent,
        'totalQuantity', v_row.total_quantity,
        'limitQuantity', v_row.limit_quantity,
        'overageAmountCents', v_row.overage_amount_cents
      ),
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'alertEventsCreated',
    v_count
  );
end;
$$;

create or replace function sync_admin_security_trust_alert_events(
  p_batch_size integer default 500,
  p_worker_id text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_command jsonb;
  v_ai jsonb;
  v_incidents jsonb;
  v_integrations_billing jsonb;
begin
  v_command := sync_admin_security_trust_alert_events_from_command_center(
    p_batch_size,
    p_worker_id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  v_ai := sync_admin_security_trust_alert_events_from_ai_findings(
    p_batch_size,
    p_worker_id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  v_incidents := sync_admin_security_trust_alert_events_from_incidents(
    p_batch_size,
    p_worker_id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  v_integrations_billing := sync_admin_security_trust_alert_events_from_integrations_and_billing(
    p_batch_size,
    p_worker_id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return jsonb_build_object(
    'commandCenter',
    v_command,
    'aiFindings',
    v_ai,
    'incidents',
    v_incidents,
    'integrationsAndBilling',
    v_integrations_billing
  );
end;
$$;

create or replace function escalate_due_admin_security_trust_alert_events(
  p_batch_size integer default 200,
  p_worker_id text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_count integer := 0;
  v_row record;
begin
  for v_row in
    select e.*
    from admin_security_trust_alert_events e
    where e.status = 'open'
      and e.next_escalation_at is not null
      and e.next_escalation_at <= now()
      and e.escalation_level < 3
    order by e.next_escalation_at asc
    limit p_batch_size
    for update skip locked
  loop
    update admin_security_trust_alert_events
    set
      escalated = true,
      escalation_level = escalation_level + 1,
      alert_priority = case
        when alert_priority = 'low' then 'medium'
        when alert_priority = 'medium' then 'high'
        else 'critical'
      end,
      next_escalation_at = now() + make_interval(mins => 30 * greatest(v_row.escalation_level + 1, 1)),
      metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'last_escalated_by',
        p_worker_id
      ),
      updated_at = now()
    where id = v_row.id;

    perform record_admin_security_trust_alert_audit_event(
      'alert_event_escalated',
      'escalated',
      v_row.id,
      null,
      null,
      null,
      null,
      v_row.customer_name,
      v_row.customer_domain,
      'worker',
      null,
      null,
      null,
      'Trust alert escalated',
      v_row.title,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'alertsEscalated',
    v_count
  );
end;
$$;

create or replace function acknowledge_admin_security_trust_alert_event(
  p_admin_auth_user_id uuid,
  p_alert_event_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_event admin_security_trust_alert_events%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  update admin_security_trust_alert_events
  set
    status = 'acknowledged',
    acknowledged_at = now(),
    acknowledged_by_auth_user_id = p_admin_auth_user_id,
    acknowledged_by_admin_user_id = v_admin.id,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = p_alert_event_id
    and status = 'open'
  returning * into v_event;

  if v_event.id is null then
    raise exception 'trust alert event not found or not open: %', p_alert_event_id;
  end if;

  perform record_admin_security_trust_alert_audit_event(
    'alert_event_acknowledged',
    'acknowledged',
    v_event.id,
    null,
    null,
    null,
    null,
    v_event.customer_name,
    v_event.customer_domain,
    'admin',
    p_admin_auth_user_id,
    v_admin.id,
    v_admin.email,
    'Trust alert acknowledged',
    v_event.title,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_event.id;
end;
$$;

create or replace function resolve_admin_security_trust_alert_event(
  p_admin_auth_user_id uuid,
  p_alert_event_id uuid,
  p_resolution_note text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_event admin_security_trust_alert_events%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_resolution_note is null or length(trim(p_resolution_note)) = 0 then
    raise exception 'trust alert resolution note is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  update admin_security_trust_alert_events
  set
    status = 'resolved',
    resolved_at = now(),
    resolved_by_auth_user_id = p_admin_auth_user_id,
    resolved_by_admin_user_id = v_admin.id,
    resolution_note = p_resolution_note,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = p_alert_event_id
    and status in ('open', 'acknowledged')
  returning * into v_event;

  if v_event.id is null then
    raise exception 'trust alert event not found or not resolvable: %', p_alert_event_id;
  end if;

  perform record_admin_security_trust_alert_audit_event(
    'alert_event_resolved',
    'resolved',
    v_event.id,
    null,
    null,
    null,
    null,
    v_event.customer_name,
    v_event.customer_domain,
    'admin',
    p_admin_auth_user_id,
    v_admin.id,
    v_admin.email,
    'Trust alert resolved',
    p_resolution_note,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_event.id;
end;
$$;
