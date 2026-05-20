-- Trust Command Center v2 — sync, refresh, lifecycle, views, scheduled jobs, errors, RLS, grants.

create or replace function sync_admin_security_trust_command_center_queue(
  p_customer_name text default null,
  p_customer_domain text default null,
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
      and (p_customer_name is null or customer_name = p_customer_name)
      and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''))
    order by created_at desc
    limit p_batch_size
  loop
    perform upsert_admin_security_trust_command_queue_item(
      'incident',
      case when v_row.severity = 'critical' then 'critical' when v_row.severity = 'high' then 'high' else 'medium' end,
      v_row.title,
      coalesce(v_row.summary, 'Open trust incident requires review.'),
      'incidents',
      'admin_security_trust_incidents',
      v_row.id,
      v_row.incident_key,
      v_row.severity,
      v_row.customer_name,
      v_row.customer_domain,
      now() + interval '4 hours',
      '/admin/security-trust-incidents/' || v_row.id::text,
      'Open incident',
      jsonb_build_object(
        'incidentKey', v_row.incident_key,
        'incidentType', v_row.incident_type,
        'status', v_row.status
      ),
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    v_count := v_count + 1;
  end loop;

  for v_row in
    select *
    from admin_security_trust_ai_findings
    where status in ('open', 'acknowledged', 'investigating')
      and (p_customer_name is null or customer_name = p_customer_name)
      and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''))
    order by created_at desc
    limit p_batch_size
  loop
    perform upsert_admin_security_trust_command_queue_item(
      'ai_finding',
      case when v_row.severity = 'critical' then 'critical' when v_row.severity = 'high' then 'high' else 'medium' end,
      v_row.finding_title,
      v_row.finding_summary,
      'ai_analyst',
      'admin_security_trust_ai_findings',
      v_row.id,
      v_row.finding_key,
      v_row.severity,
      v_row.customer_name,
      v_row.customer_domain,
      now() + interval '8 hours',
      '/admin/security-trust-ai-analyst/findings/' || v_row.id::text,
      'Review finding',
      jsonb_build_object(
        'findingType', v_row.finding_type,
        'detectorFamily', v_row.detector_family,
        'confidence', v_row.confidence
      ),
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    v_count := v_count + 1;
  end loop;

  for v_row in
    select *
    from admin_security_trust_ai_recommended_actions
    where status = 'open'
      and (p_customer_name is null or customer_name = p_customer_name)
      and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''))
    order by created_at desc
    limit p_batch_size
  loop
    perform upsert_admin_security_trust_command_queue_item(
      'recommended_action',
      v_row.action_priority,
      v_row.title,
      v_row.summary,
      'ai_analyst',
      'admin_security_trust_ai_recommended_actions',
      v_row.id,
      v_row.recommended_action_key,
      case when v_row.action_priority = 'critical' then 'critical' when v_row.action_priority = 'high' then 'high' else 'medium' end,
      v_row.customer_name,
      v_row.customer_domain,
      now() + interval '12 hours',
      '/admin/security-trust-ai-analyst/recommended-actions/' || v_row.id::text,
      'Review action',
      jsonb_build_object(
        'actionType', v_row.action_type,
        'requiresApproval', v_row.requires_approval
      ),
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    v_count := v_count + 1;
  end loop;

  for v_row in
    select distinct on (customer_name, customer_domain) *
    from admin_security_customer_trust_risk_scores
    where risk_level in ('high', 'critical')
      and computed_at >= now() - interval '24 hours'
      and (p_customer_name is null or customer_name = p_customer_name)
      and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''))
    order by customer_name, customer_domain, computed_at desc
    limit p_batch_size
  loop
    perform upsert_admin_security_trust_command_queue_item(
      'customer_risk',
      case when v_row.risk_level = 'critical' then 'critical' else 'high' end,
      'High customer trust risk: ' || v_row.customer_name,
      'Customer trust risk score is ' || round(v_row.overall_risk_score, 1)::text || '.',
      'risk_scores',
      'admin_security_customer_trust_risk_scores',
      v_row.id,
      v_row.risk_score_key,
      case when v_row.risk_level = 'critical' then 'critical' else 'high' end,
      v_row.customer_name,
      v_row.customer_domain,
      now() + interval '12 hours',
      '/admin/security-trust-ai-analyst/risk-scores/' || v_row.id::text,
      'Review customer risk',
      jsonb_build_object(
        'riskLevel', v_row.risk_level,
        'overallRiskScore', v_row.overall_risk_score
      ),
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    v_count := v_count + 1;
  end loop;

  for v_row in
    select d.*
    from admin_security_trust_webhook_deliveries d
    where d.status = 'dead_lettered'
      and d.created_at >= now() - interval '24 hours'
      and (p_customer_name is null or d.customer_name = p_customer_name)
      and (p_customer_domain is null or coalesce(d.customer_domain, '') = coalesce(p_customer_domain, ''))
    order by d.dead_lettered_at desc nulls last
    limit p_batch_size
  loop
    perform upsert_admin_security_trust_command_queue_item(
      'integration_failure',
      'medium',
      'Webhook delivery dead-lettered',
      coalesce(v_row.last_error, 'Webhook delivery failed after maximum attempts.'),
      'integrations',
      'admin_security_trust_webhook_deliveries',
      v_row.id,
      v_row.webhook_delivery_key,
      'medium',
      v_row.customer_name,
      v_row.customer_domain,
      now() + interval '24 hours',
      '/admin/security-trust-integrations/deliveries/' || v_row.id::text,
      'Review delivery',
      jsonb_build_object(
        'eventType', v_row.event_namespace || '.' || v_row.event_type
      ),
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'queueItemsSynced',
    v_count
  );
end;
$$;

create or replace function sync_admin_security_trust_command_center_timeline(
  p_customer_name text default null,
  p_customer_domain text default null,
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
    where created_at >= now() - interval '7 days'
      and (p_customer_name is null or customer_name = p_customer_name)
      and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''))
    order by created_at desc
    limit p_batch_size
  loop
    perform create_admin_security_trust_command_timeline_item(
      'incident.' || v_row.status,
      'incident',
      v_row.title,
      coalesce(v_row.summary, v_row.incident_type),
      v_row.severity,
      v_row.customer_name,
      v_row.customer_domain,
      'incidents',
      'admin_security_trust_incidents',
      v_row.id,
      v_row.incident_key,
      v_row.created_at,
      'system',
      null,
      null,
      null,
      jsonb_build_object(
        'incidentType', v_row.incident_type,
        'status', v_row.status
      ),
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    v_count := v_count + 1;
  end loop;

  for v_row in
    select *
    from admin_security_trust_ai_findings
    where created_at >= now() - interval '7 days'
      and (p_customer_name is null or customer_name = p_customer_name)
      and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''))
    order by created_at desc
    limit p_batch_size
  loop
    perform create_admin_security_trust_command_timeline_item(
      'ai_finding.' || v_row.finding_type,
      'ai',
      v_row.finding_title,
      v_row.finding_summary,
      v_row.severity,
      v_row.customer_name,
      v_row.customer_domain,
      'ai_analyst',
      'admin_security_trust_ai_findings',
      v_row.id,
      v_row.finding_key,
      v_row.created_at,
      'system',
      null,
      null,
      null,
      jsonb_build_object(
        'detectorFamily', v_row.detector_family,
        'confidence', v_row.confidence
      ),
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    v_count := v_count + 1;
  end loop;

  for v_row in
    select *
    from admin_security_trust_webhook_deliveries
    where status = 'dead_lettered'
      and dead_lettered_at >= now() - interval '7 days'
      and (p_customer_name is null or customer_name = p_customer_name)
      and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''))
    order by dead_lettered_at desc
    limit p_batch_size
  loop
    perform create_admin_security_trust_command_timeline_item(
      'integration.webhook_dead_lettered',
      'integration',
      'Webhook delivery dead-lettered',
      coalesce(v_row.last_error, 'Delivery failed after maximum attempts.'),
      'medium',
      v_row.customer_name,
      v_row.customer_domain,
      'integrations',
      'admin_security_trust_webhook_deliveries',
      v_row.id,
      v_row.webhook_delivery_key,
      coalesce(v_row.dead_lettered_at, v_row.created_at),
      'system',
      null,
      null,
      null,
      jsonb_build_object(
        'eventType', v_row.event_namespace || '.' || v_row.event_type
      ),
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'timelineItemsSynced',
    v_count
  );
end;
$$;

create or replace function refresh_admin_security_trust_command_center(
  p_customer_name text default null,
  p_customer_domain text default null,
  p_worker_id text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_snapshot_id uuid;
  v_cards jsonb;
  v_queue jsonb;
  v_timeline jsonb;
begin
  v_snapshot_id := compute_admin_security_trust_command_center_snapshot(
    p_customer_name,
    p_customer_domain,
    p_worker_id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  v_cards := seed_admin_security_trust_command_center_cards(
    v_snapshot_id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  v_queue := sync_admin_security_trust_command_center_queue(
    p_customer_name,
    p_customer_domain,
    500,
    p_worker_id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  v_timeline := sync_admin_security_trust_command_center_timeline(
    p_customer_name,
    p_customer_domain,
    500,
    p_worker_id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return jsonb_build_object(
    'snapshotId',
    v_snapshot_id,
    'cards',
    v_cards,
    'queue',
    v_queue,
    'timeline',
    v_timeline
  );
end;
$$;

create or replace function process_admin_security_trust_command_center_customers(
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
  v_count integer := 0;
  v_customer record;
begin
  if p_batch_size <= 0 or p_batch_size > 1000 then
    raise exception 'batch size must be between 1 and 1000';
  end if;

  for v_customer in
    select distinct customer_name, customer_domain
    from admin_security_customer_trust_entitlements
    where status = 'active'
      and customer_name is not null
    order by customer_name
    limit p_batch_size
  loop
    perform refresh_admin_security_trust_command_center(
      v_customer.customer_name,
      v_customer.customer_domain,
      p_worker_id,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'command_center_customer_run_id',
        v_run_id
      )
    );

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'runId',
    v_run_id,
    'customersProcessed',
    v_count
  );
end;
$$;

create or replace function acknowledge_admin_security_trust_command_queue_item(
  p_admin_auth_user_id uuid,
  p_queue_item_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_item admin_security_trust_command_center_queue%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  update admin_security_trust_command_center_queue
  set
    status = 'acknowledged',
    acknowledged_at = now(),
    acknowledged_by_auth_user_id = p_admin_auth_user_id,
    acknowledged_by_admin_user_id = v_admin.id,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = p_queue_item_id
    and status = 'open'
  returning * into v_item;

  if v_item.id is null then
    raise exception 'trust command queue item not found or not open: %', p_queue_item_id;
  end if;

  perform record_admin_security_trust_command_center_event(
    'queue_item_acknowledged',
    'acknowledged',
    null,
    null,
    v_item.id,
    null,
    v_item.customer_name,
    v_item.customer_domain,
    'admin',
    p_admin_auth_user_id,
    v_admin.id,
    v_admin.email,
    'Command queue item acknowledged',
    v_item.title,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_item.id;
end;
$$;

create or replace function resolve_admin_security_trust_command_queue_item(
  p_admin_auth_user_id uuid,
  p_queue_item_id uuid,
  p_resolution_note text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_item admin_security_trust_command_center_queue%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_resolution_note is null or length(trim(p_resolution_note)) = 0 then
    raise exception 'trust command queue resolution note is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  update admin_security_trust_command_center_queue
  set
    status = 'resolved',
    resolved_at = now(),
    resolved_by_auth_user_id = p_admin_auth_user_id,
    resolved_by_admin_user_id = v_admin.id,
    resolution_note = p_resolution_note,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = p_queue_item_id
    and status in ('open', 'acknowledged', 'assigned', 'in_progress')
  returning * into v_item;

  if v_item.id is null then
    raise exception 'trust command queue item not found or not resolvable: %', p_queue_item_id;
  end if;

  perform record_admin_security_trust_command_center_event(
    'queue_item_resolved',
    'resolved',
    null,
    null,
    v_item.id,
    null,
    v_item.customer_name,
    v_item.customer_domain,
    'admin',
    p_admin_auth_user_id,
    v_admin.id,
    v_admin.email,
    'Command queue item resolved',
    p_resolution_note,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_item.id;
end;
$$;

create or replace view admin_security_trust_command_center_latest_snapshot as
select distinct on (snapshot_scope, coalesce(customer_name, ''), coalesce(customer_domain, ''))
  id as admin_security_trust_command_center_snapshot_id,
  command_snapshot_key,
  status,
  snapshot_scope,
  customer_name,
  customer_domain,
  posture_level,
  posture_score,
  open_incident_count,
  critical_incident_count,
  high_incident_count,
  open_ai_finding_count,
  critical_ai_finding_count,
  high_ai_finding_count,
  open_recommended_action_count,
  critical_recommended_action_count,
  high_recommended_action_count,
  failed_verification_count_24h,
  proof_health_issue_count,
  risky_published_proof_count,
  critical_published_notice_count,
  billing_usage_warning_count,
  billing_usage_exceeded_count,
  current_period_overage_cents,
  dead_lettered_webhook_delivery_count,
  due_webhook_delivery_count,
  failed_export_job_count_24h,
  active_customer_count,
  high_or_critical_customer_risk_count,
  summary_title,
  summary_body,
  computed_at,
  created_at,
  updated_at,
  metadata
from admin_security_trust_command_center_snapshots
where status = 'active'
order by snapshot_scope, coalesce(customer_name, ''), coalesce(customer_domain, ''), computed_at desc;

create or replace view admin_security_trust_command_center_card_dashboard as
select
  c.id as admin_security_trust_command_center_card_id,
  c.command_card_key,
  c.status,
  c.snapshot_id,
  s.command_snapshot_key,
  s.snapshot_scope,
  c.card_type,
  c.card_group,
  c.customer_name,
  c.customer_domain,
  c.title,
  c.subtitle,
  c.body,
  c.severity,
  c.priority,
  c.metric_value,
  c.metric_unit,
  c.metric_label,
  c.trend_direction,
  c.trend_value,
  c.target_table,
  c.target_id,
  c.target_key,
  c.action_label,
  c.action_route,
  c.sort_order,
  c.created_at,
  c.updated_at,
  c.metadata
from admin_security_trust_command_center_cards c
left join admin_security_trust_command_center_snapshots s
  on s.id = c.snapshot_id
order by c.sort_order asc, c.created_at desc;

create or replace view admin_security_trust_command_center_queue_dashboard as
select
  q.id as admin_security_trust_command_center_queue_item_id,
  q.command_queue_item_key,
  q.status,
  q.queue_type,
  q.queue_priority,
  q.customer_name,
  q.customer_domain,
  q.title,
  q.summary,
  q.source_module,
  q.source_table,
  q.source_id,
  q.source_key,
  q.severity,
  q.due_at,
  q.escalated_at,
  assigned.email as assigned_to_email,
  q.acknowledged_at,
  acknowledger.email as acknowledged_by_email,
  q.resolved_at,
  resolver.email as resolved_by_email,
  q.resolution_note,
  q.action_route,
  q.action_label,
  q.created_at,
  q.updated_at,
  q.metadata
from admin_security_trust_command_center_queue q
left join admin_users assigned
  on assigned.id = q.assigned_to_admin_user_id
left join admin_users acknowledger
  on acknowledger.id = q.acknowledged_by_admin_user_id
left join admin_users resolver
  on resolver.id = q.resolved_by_admin_user_id
order by
  case q.queue_priority
    when 'critical' then 1
    when 'high' then 2
    when 'medium' then 3
    else 4
  end,
  q.created_at desc;

create or replace view admin_security_trust_command_center_timeline_dashboard as
select
  t.id as admin_security_trust_command_center_timeline_id,
  t.command_timeline_key,
  t.status,
  t.event_type,
  t.event_group,
  t.customer_name,
  t.customer_domain,
  t.title,
  t.summary,
  t.severity,
  t.source_module,
  t.source_table,
  t.source_id,
  t.source_key,
  t.occurred_at,
  t.actor_type,
  t.actor_email,
  t.created_at,
  t.metadata
from admin_security_trust_command_center_timeline t
where t.status = 'visible'
order by t.occurred_at desc;

create or replace view admin_security_trust_command_center_integrity as
select
  (
    select posture_level
    from admin_security_trust_command_center_latest_snapshot
    where snapshot_scope = 'global'
    limit 1
  ) as global_posture_level,

  (
    select posture_score
    from admin_security_trust_command_center_latest_snapshot
    where snapshot_scope = 'global'
    limit 1
  ) as global_posture_score,

  (
    select count(*)
    from admin_security_trust_command_center_queue
    where status in ('open', 'acknowledged', 'assigned', 'in_progress')
  ) as open_queue_item_count,

  (
    select count(*)
    from admin_security_trust_command_center_queue
    where status in ('open', 'acknowledged', 'assigned', 'in_progress')
      and queue_priority = 'critical'
  ) as critical_queue_item_count,

  (
    select count(*)
    from admin_security_trust_command_center_queue
    where status in ('open', 'acknowledged', 'assigned', 'in_progress')
      and queue_priority = 'high'
  ) as high_queue_item_count,

  (
    select count(*)
    from admin_security_trust_command_center_latest_snapshot
    where snapshot_scope = 'customer'
      and posture_level in ('elevated', 'critical')
  ) as elevated_or_critical_customer_posture_count,

  (
    select count(*)
    from admin_security_trust_command_center_timeline
    where occurred_at >= now() - interval '24 hours'
      and severity in ('high', 'critical')
  ) as high_or_critical_timeline_events_24h,

  now() as checked_at;

grant select on admin_security_trust_command_center_latest_snapshot to admin_api_role;
grant select on admin_security_trust_command_center_card_dashboard to admin_api_role;
grant select on admin_security_trust_command_center_queue_dashboard to admin_api_role;
grant select on admin_security_trust_command_center_timeline_dashboard to admin_api_role;
grant select on admin_security_trust_command_center_integrity to admin_api_role;

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
values
  (
    'admin_security_trust_command_center_global_every_5m',
    'Refresh global trust command center',
    'admin',
    true,
    '*/5 * * * *',
    'refresh_admin_security_trust_command_center',
    '{"scope": "global"}'::jsonb,
    300,
    600,
    '{"priority": "high"}'::jsonb
  ),
  (
    'admin_security_trust_command_center_customers_every_30m',
    'Refresh customer trust command centers',
    'admin',
    true,
    '*/30 * * * *',
    'process_admin_security_trust_command_center_customers',
    '{"batch_size": 500}'::jsonb,
    600,
    900,
    '{"priority": "medium"}'::jsonb
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
    'TRUST_COMMAND_CENTER_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Trust command center record not found.',
    'Trust command center record not found.',
    'platform'
  ),
  (
    'TRUST_COMMAND_CENTER_INVALID_STATE',
    'validation',
    'medium',
    409,
    true,
    true,
    'Trust command center record is not in a valid state.',
    'Trust command center invalid state.',
    'platform'
  ),
  (
    'TRUST_COMMAND_CENTER_REQUIRED_FIELDS',
    'validation',
    'medium',
    400,
    false,
    true,
    'Trust command center request requires complete fields.',
    'Trust command center required fields missing.',
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
  ('trust command center snapshot not found', 'TRUST_COMMAND_CENTER_NOT_FOUND', 5, '{}'),
  ('trust command queue item not found or not open', 'TRUST_COMMAND_CENTER_INVALID_STATE', 5, '{}'),
  ('trust command queue item not found or not resolvable', 'TRUST_COMMAND_CENTER_INVALID_STATE', 5, '{}'),
  ('trust command queue resolution note is required', 'TRUST_COMMAND_CENTER_REQUIRED_FIELDS', 5, '{}')
on conflict (match_pattern)
do update set
  error_code = excluded.error_code,
  priority = excluded.priority,
  metadata = excluded.metadata;

alter table admin_security_trust_command_center_snapshots enable row level security;
alter table admin_security_trust_command_center_cards enable row level security;
alter table admin_security_trust_command_center_queue enable row level security;
alter table admin_security_trust_command_center_timeline enable row level security;
alter table admin_security_trust_command_center_events enable row level security;

drop policy if exists admin_api_all_trust_command_center_snapshots on admin_security_trust_command_center_snapshots;
create policy admin_api_all_trust_command_center_snapshots
on admin_security_trust_command_center_snapshots
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_trust_command_center_cards on admin_security_trust_command_center_cards;
create policy admin_api_all_trust_command_center_cards
on admin_security_trust_command_center_cards
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_trust_command_center_queue on admin_security_trust_command_center_queue;
create policy admin_api_all_trust_command_center_queue
on admin_security_trust_command_center_queue
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_trust_command_center_timeline on admin_security_trust_command_center_timeline;
create policy admin_api_all_trust_command_center_timeline
on admin_security_trust_command_center_timeline
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_trust_command_center_events on admin_security_trust_command_center_events;
create policy admin_api_all_trust_command_center_events
on admin_security_trust_command_center_events
for all to admin_api_role
using (true)
with check (true);

drop policy if exists worker_all_trust_command_center_snapshots on admin_security_trust_command_center_snapshots;
create policy worker_all_trust_command_center_snapshots
on admin_security_trust_command_center_snapshots
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_trust_command_center_cards on admin_security_trust_command_center_cards;
create policy worker_all_trust_command_center_cards
on admin_security_trust_command_center_cards
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_trust_command_center_queue on admin_security_trust_command_center_queue;
create policy worker_all_trust_command_center_queue
on admin_security_trust_command_center_queue
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_trust_command_center_timeline on admin_security_trust_command_center_timeline;
create policy worker_all_trust_command_center_timeline
on admin_security_trust_command_center_timeline
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_trust_command_center_events on admin_security_trust_command_center_events;
create policy worker_all_trust_command_center_events
on admin_security_trust_command_center_events
for all to worker_role
using (true)
with check (true);

grant execute on function record_admin_security_trust_command_center_event(
  text,text,uuid,uuid,uuid,uuid,text,text,text,uuid,uuid,text,text,text,text,jsonb
) to admin_api_role, worker_role;

grant execute on function create_admin_security_trust_command_timeline_item(
  text,text,text,text,text,text,text,text,text,uuid,text,timestamptz,text,uuid,uuid,text,jsonb,text,jsonb
) to admin_api_role, worker_role;

grant execute on function upsert_admin_security_trust_command_queue_item(
  text,text,text,text,text,text,uuid,text,text,text,text,timestamptz,text,text,jsonb,text,jsonb
) to admin_api_role, worker_role;

grant execute on function compute_admin_security_trust_command_center_snapshot(text,text,text,text,jsonb)
to admin_api_role, worker_role;

grant execute on function seed_admin_security_trust_command_center_cards(uuid,text,jsonb)
to admin_api_role, worker_role;

grant execute on function sync_admin_security_trust_command_center_queue(text,text,integer,text,text,jsonb)
to admin_api_role, worker_role;

grant execute on function sync_admin_security_trust_command_center_timeline(text,text,integer,text,text,jsonb)
to admin_api_role, worker_role;

grant execute on function refresh_admin_security_trust_command_center(text,text,text,text,jsonb)
to admin_api_role, worker_role;

grant execute on function process_admin_security_trust_command_center_customers(integer,text,text,jsonb)
to admin_api_role, worker_role;

grant execute on function acknowledge_admin_security_trust_command_queue_item(uuid,uuid,text,jsonb)
to admin_api_role;

grant execute on function resolve_admin_security_trust_command_queue_item(uuid,uuid,text,text,jsonb)
to admin_api_role;

alter function compute_admin_security_trust_command_center_snapshot(text,text,text,text,jsonb) security definer;
alter function compute_admin_security_trust_command_center_snapshot(text,text,text,text,jsonb) set search_path = public;

alter function seed_admin_security_trust_command_center_cards(uuid,text,jsonb) security definer;
alter function seed_admin_security_trust_command_center_cards(uuid,text,jsonb) set search_path = public;

alter function sync_admin_security_trust_command_center_queue(text,text,integer,text,text,jsonb) security definer;
alter function sync_admin_security_trust_command_center_queue(text,text,integer,text,text,jsonb) set search_path = public;

alter function sync_admin_security_trust_command_center_timeline(text,text,integer,text,text,jsonb) security definer;
alter function sync_admin_security_trust_command_center_timeline(text,text,integer,text,text,jsonb) set search_path = public;

alter function refresh_admin_security_trust_command_center(text,text,text,text,jsonb) security definer;
alter function refresh_admin_security_trust_command_center(text,text,text,text,jsonb) set search_path = public;

alter function process_admin_security_trust_command_center_customers(integer,text,text,jsonb) security definer;
alter function process_admin_security_trust_command_center_customers(integer,text,text,jsonb) set search_path = public;

alter function acknowledge_admin_security_trust_command_queue_item(uuid,uuid,text,jsonb) security definer;
alter function acknowledge_admin_security_trust_command_queue_item(uuid,uuid,text,jsonb) set search_path = public;

alter function resolve_admin_security_trust_command_queue_item(uuid,uuid,text,text,jsonb) security definer;
alter function resolve_admin_security_trust_command_queue_item(uuid,uuid,text,text,jsonb) set search_path = public;
