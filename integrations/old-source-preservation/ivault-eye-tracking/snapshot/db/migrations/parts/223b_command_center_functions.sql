-- Trust Command Center v2 — PL/pgSQL (aligned with repo schema: webhook columns, export jobs, proof_health, verification).

create or replace function record_admin_security_trust_command_center_event(
  p_event_type text,
  p_event_action text,
  p_snapshot_id uuid default null,
  p_card_id uuid default null,
  p_queue_item_id uuid default null,
  p_timeline_item_id uuid default null,
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
    'trust_command_center_event:' ||
    p_event_type || ':' ||
    substr(encode(gen_random_bytes(12), 'hex'), 1, 24);

  insert into admin_security_trust_command_center_events (
    command_event_key,
    event_type,
    event_action,
    status,
    snapshot_id,
    card_id,
    queue_item_id,
    timeline_item_id,
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
    p_snapshot_id,
    p_card_id,
    p_queue_item_id,
    p_timeline_item_id,
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

create or replace function create_admin_security_trust_command_timeline_item(
  p_event_type text,
  p_event_group text,
  p_title text,
  p_summary text default null,
  p_severity text default 'info',
  p_customer_name text default null,
  p_customer_domain text default null,
  p_source_module text default 'system',
  p_source_table text default null,
  p_source_id uuid default null,
  p_source_key text default null,
  p_occurred_at timestamptz default now(),
  p_actor_type text default 'system',
  p_actor_auth_user_id uuid default null,
  p_actor_admin_user_id uuid default null,
  p_actor_email text default null,
  p_timeline_payload jsonb default '{}'::jsonb,
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
    'trust_command_timeline:' ||
    p_event_type || ':' ||
    coalesce(p_source_key, '') || ':' ||
    substr(encode(gen_random_bytes(8), 'hex'), 1, 16);

  insert into admin_security_trust_command_center_timeline (
    command_timeline_key,
    status,
    event_type,
    event_group,
    customer_name,
    customer_domain,
    title,
    summary,
    severity,
    source_module,
    source_table,
    source_id,
    source_key,
    occurred_at,
    actor_type,
    actor_auth_user_id,
    actor_admin_user_id,
    actor_email,
    timeline_payload,
    request_id,
    metadata
  )
  values (
    v_key,
    'visible',
    p_event_type,
    coalesce(p_event_group, 'operations'),
    p_customer_name,
    p_customer_domain,
    p_title,
    p_summary,
    coalesce(p_severity, 'info'),
    coalesce(p_source_module, 'system'),
    p_source_table,
    p_source_id,
    p_source_key,
    coalesce(p_occurred_at, now()),
    coalesce(p_actor_type, 'system'),
    p_actor_auth_user_id,
    p_actor_admin_user_id,
    p_actor_email,
    coalesce(p_timeline_payload, '{}'::jsonb),
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  perform record_admin_security_trust_command_center_event(
    'timeline_item_created',
    'created',
    null,
    null,
    null,
    v_id,
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
  );

  return v_id;
end;
$$;

create or replace function upsert_admin_security_trust_command_queue_item(
  p_queue_type text,
  p_queue_priority text,
  p_title text,
  p_summary text,
  p_source_module text,
  p_source_table text default null,
  p_source_id uuid default null,
  p_source_key text default null,
  p_severity text default 'medium',
  p_customer_name text default null,
  p_customer_domain text default null,
  p_due_at timestamptz default null,
  p_action_route text default null,
  p_action_label text default null,
  p_queue_payload jsonb default '{}'::jsonb,
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
    'trust_command_queue:' ||
    p_source_module || ':' ||
    coalesce(p_source_table, '') || ':' ||
    coalesce(p_source_id::text, '') || ':' ||
    coalesce(p_source_key, '') || ':' ||
    p_queue_type;

  insert into admin_security_trust_command_center_queue (
    command_queue_item_key,
    status,
    queue_type,
    queue_priority,
    customer_name,
    customer_domain,
    title,
    summary,
    source_module,
    source_table,
    source_id,
    source_key,
    severity,
    due_at,
    action_route,
    action_label,
    queue_payload,
    request_id,
    metadata
  )
  values (
    v_key,
    'open',
    p_queue_type,
    coalesce(p_queue_priority, 'medium'),
    p_customer_name,
    p_customer_domain,
    p_title,
    p_summary,
    p_source_module,
    p_source_table,
    p_source_id,
    p_source_key,
    coalesce(p_severity, 'medium'),
    p_due_at,
    p_action_route,
    p_action_label,
    coalesce(p_queue_payload, '{}'::jsonb),
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (command_queue_item_key)
  do update set
    status = case
      when admin_security_trust_command_center_queue.status in ('resolved', 'dismissed')
      then admin_security_trust_command_center_queue.status
      else 'open'
    end,
    queue_priority = excluded.queue_priority,
    severity = excluded.severity,
    title = excluded.title,
    summary = excluded.summary,
    due_at = excluded.due_at,
    action_route = excluded.action_route,
    action_label = excluded.action_label,
    queue_payload = excluded.queue_payload,
    metadata = admin_security_trust_command_center_queue.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_id;

  perform record_admin_security_trust_command_center_event(
    'queue_item_created',
    'created_or_updated',
    null,
    null,
    v_id,
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

  return v_id;
end;
$$;

create or replace function compute_admin_security_trust_command_center_snapshot(
  p_customer_name text default null,
  p_customer_domain text default null,
  p_worker_id text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_snapshot_id uuid;
  v_key text;

  v_open_incidents integer;
  v_critical_incidents integer;
  v_high_incidents integer;

  v_open_findings integer;
  v_critical_findings integer;
  v_high_findings integer;

  v_open_actions integer;
  v_critical_actions integer;
  v_high_actions integer;

  v_failed_verifications integer;
  v_proof_health_issues integer;

  v_risky_proofs integer;
  v_critical_notices integer;

  v_usage_warnings integer;
  v_usage_exceeded integer;
  v_overage_cents integer;

  v_dead_letters integer;
  v_due_deliveries integer;
  v_failed_exports integer;

  v_active_customers integer;
  v_high_risk_customers integer;

  v_score numeric;
  v_posture text;
  v_title text;
  v_body text;
begin
  select
    count(*),
    count(*) filter (where severity = 'critical'),
    count(*) filter (where severity = 'high')
  into v_open_incidents, v_critical_incidents, v_high_incidents
  from admin_security_trust_incidents
  where status in ('open', 'acknowledged', 'investigating', 'escalated', 'mitigating')
    and (p_customer_name is null or customer_name = p_customer_name)
    and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''));

  select
    count(*),
    count(*) filter (where severity = 'critical'),
    count(*) filter (where severity = 'high')
  into v_open_findings, v_critical_findings, v_high_findings
  from admin_security_trust_ai_findings
  where status in ('open', 'acknowledged', 'investigating')
    and (p_customer_name is null or customer_name = p_customer_name)
    and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''));

  select
    count(*),
    count(*) filter (where action_priority = 'critical'),
    count(*) filter (where action_priority = 'high')
  into v_open_actions, v_critical_actions, v_high_actions
  from admin_security_trust_ai_recommended_actions
  where status = 'open'
    and (p_customer_name is null or customer_name = p_customer_name)
    and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''));

  if p_customer_name is null and p_customer_domain is null then
    select count(*)
    into v_failed_verifications
    from admin_security_public_verification_results
    where created_at >= now() - interval '24 hours'
      and (
        verified is false
        or verification_status in ('failed')
      );
  else
    v_failed_verifications := 0;
  end if;

  select count(*)
  into v_proof_health_issues
  from admin_security_proof_health_signals
  where status = 'active'
    and (p_customer_name is null or customer_name = p_customer_name)
    and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''));

  select count(*)
  into v_risky_proofs
  from admin_security_published_proof_status
  where status = 'published'
    and proof_status in ('verification_failed', 'incident_open', 'under_review')
    and (p_customer_name is null or customer_name = p_customer_name)
    and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''));

  select count(*)
  into v_critical_notices
  from admin_security_published_trust_notices
  where status = 'published'
    and public_severity = 'critical'
    and (p_customer_name is null or customer_name = p_customer_name)
    and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''));

  select
    count(*) filter (where usage_percent >= 80 and usage_percent < 100),
    count(*) filter (where usage_percent >= 100),
    coalesce(sum(overage_amount_cents), 0)
  into v_usage_warnings, v_usage_exceeded, v_overage_cents
  from admin_security_trust_usage_rollups
  where billing_period_start = date_trunc('month', now())
    and (p_customer_name is null or customer_name = p_customer_name)
    and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''));

  select count(*)
  into v_dead_letters
  from admin_security_trust_webhook_deliveries
  where status = 'dead_lettered'
    and created_at >= now() - interval '24 hours'
    and (p_customer_name is null or customer_name = p_customer_name)
    and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''));

  select count(*)
  into v_due_deliveries
  from admin_security_trust_webhook_deliveries
  where status = 'pending'
    and created_at <= now() - interval '1 hour'
    and (p_customer_name is null or customer_name = p_customer_name)
    and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''));

  if p_customer_name is null and p_customer_domain is null then
    select count(*)
    into v_failed_exports
    from admin_security_archive_export_jobs
    where status = 'failed'
      and created_at >= now() - interval '24 hours';
  else
    v_failed_exports := 0;
  end if;

  select count(*)
  into v_active_customers
  from admin_security_customer_trust_entitlements
  where status = 'active'
    and (p_customer_name is null or customer_name = p_customer_name)
    and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''));

  select count(*)
  into v_high_risk_customers
  from admin_security_customer_trust_risk_scores
  where computed_at >= now() - interval '24 hours'
    and risk_level in ('high', 'critical')
    and (p_customer_name is null or customer_name = p_customer_name)
    and (p_customer_domain is null or coalesce(customer_domain, '') = coalesce(p_customer_domain, ''));

  v_score :=
    greatest(
      0,
      100
      - (coalesce(v_critical_incidents, 0) * 18)
      - (coalesce(v_high_incidents, 0) * 10)
      - (coalesce(v_critical_findings, 0) * 12)
      - (coalesce(v_high_findings, 0) * 7)
      - (coalesce(v_critical_actions, 0) * 8)
      - (coalesce(v_high_actions, 0) * 4)
      - least(coalesce(v_failed_verifications, 0), 100) * 0.2
      - (coalesce(v_dead_letters, 0) * 2)
      - (coalesce(v_usage_exceeded, 0) * 5)
      - (coalesce(v_high_risk_customers, 0) * 5)
    );

  v_posture :=
    case
      when v_score < 40 or coalesce(v_critical_incidents, 0) > 0 or coalesce(v_critical_findings, 0) > 0 then 'critical'
      when v_score < 70 or coalesce(v_high_incidents, 0) > 0 or coalesce(v_high_findings, 0) > 0 then 'elevated'
      when v_score < 90 or coalesce(v_open_incidents, 0) > 0 or coalesce(v_open_findings, 0) > 0 then 'watch'
      else 'healthy'
    end;

  v_title :=
    case v_posture
      when 'critical' then 'Critical trust posture'
      when 'elevated' then 'Elevated trust posture'
      when 'watch' then 'Trust posture requires monitoring'
      else 'Trust posture healthy'
    end;

  v_body :=
    'Incidents: ' || coalesce(v_open_incidents, 0)::text ||
    ', AI findings: ' || coalesce(v_open_findings, 0)::text ||
    ', recommended actions: ' || coalesce(v_open_actions, 0)::text ||
    ', failed verifications 24h: ' || coalesce(v_failed_verifications, 0)::text ||
    ', dead-lettered webhooks 24h: ' || coalesce(v_dead_letters, 0)::text || '.';

  v_key :=
    'trust_command_snapshot:' ||
    coalesce(lower(regexp_replace(p_customer_name, '[^a-zA-Z0-9]+', '-', 'g')), 'global') ||
    ':' ||
    to_char(now(), 'YYYYMMDDHH24MISS') ||
    ':' ||
    substr(encode(gen_random_bytes(6), 'hex'), 1, 12);

  insert into admin_security_trust_command_center_snapshots (
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
    snapshot_payload,
    request_id,
    metadata
  )
  values (
    v_key,
    'active',
    case when p_customer_name is null then 'global' else 'customer' end,
    p_customer_name,
    p_customer_domain,
    v_posture,
    v_score,
    coalesce(v_open_incidents, 0),
    coalesce(v_critical_incidents, 0),
    coalesce(v_high_incidents, 0),
    coalesce(v_open_findings, 0),
    coalesce(v_critical_findings, 0),
    coalesce(v_high_findings, 0),
    coalesce(v_open_actions, 0),
    coalesce(v_critical_actions, 0),
    coalesce(v_high_actions, 0),
    coalesce(v_failed_verifications, 0),
    coalesce(v_proof_health_issues, 0),
    coalesce(v_risky_proofs, 0),
    coalesce(v_critical_notices, 0),
    coalesce(v_usage_warnings, 0),
    coalesce(v_usage_exceeded, 0),
    coalesce(v_overage_cents, 0),
    coalesce(v_dead_letters, 0),
    coalesce(v_due_deliveries, 0),
    coalesce(v_failed_exports, 0),
    coalesce(v_active_customers, 0),
    coalesce(v_high_risk_customers, 0),
    v_title,
    v_body,
    jsonb_build_object(
      'computedBy', p_worker_id,
      'scope', case when p_customer_name is null then 'global' else 'customer' end
    ),
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_snapshot_id;

  update admin_security_trust_command_center_snapshots
  set status = 'superseded', updated_at = now()
  where id <> v_snapshot_id
    and snapshot_scope = case when p_customer_name is null then 'global' else 'customer' end
    and coalesce(customer_name, '') = coalesce(p_customer_name, '')
    and coalesce(customer_domain, '') = coalesce(p_customer_domain, '')
    and status = 'active';

  perform record_admin_security_trust_command_center_event(
    'snapshot_created',
    'created',
    v_snapshot_id,
    null,
    null,
    null,
    p_customer_name,
    p_customer_domain,
    'worker',
    null,
    null,
    null,
    v_title,
    v_body,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_snapshot_id;
end;
$$;

create or replace function seed_admin_security_trust_command_center_cards(
  p_snapshot_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_snapshot admin_security_trust_command_center_snapshots%rowtype;
  v_count integer := 0;
begin
  select *
  into v_snapshot
  from admin_security_trust_command_center_snapshots
  where id = p_snapshot_id;

  if v_snapshot.id is null then
    raise exception 'trust command center snapshot not found: %', p_snapshot_id;
  end if;

  insert into admin_security_trust_command_center_cards (
    command_card_key,
    status,
    snapshot_id,
    card_type,
    card_group,
    customer_name,
    customer_domain,
    title,
    subtitle,
    body,
    severity,
    priority,
    metric_value,
    metric_unit,
    metric_label,
    action_label,
    action_route,
    sort_order,
    card_payload,
    request_id,
    metadata
  )
  values
    (
      'trust_command_card:' || v_snapshot.command_snapshot_key || ':posture',
      'active',
      v_snapshot.id,
      'posture',
      'overview',
      v_snapshot.customer_name,
      v_snapshot.customer_domain,
      v_snapshot.summary_title,
      'Score ' || round(v_snapshot.posture_score, 1)::text,
      v_snapshot.summary_body,
      case
        when v_snapshot.posture_level = 'critical' then 'critical'
        when v_snapshot.posture_level = 'elevated' then 'high'
        when v_snapshot.posture_level = 'watch' then 'medium'
        else 'info'
      end,
      case
        when v_snapshot.posture_level = 'critical' then 'critical'
        when v_snapshot.posture_level = 'elevated' then 'high'
        when v_snapshot.posture_level = 'watch' then 'medium'
        else 'low'
      end,
      v_snapshot.posture_score,
      'score',
      'Posture score',
      'Open command center',
      '/admin/trust-command-center',
      10,
      jsonb_build_object('postureLevel', v_snapshot.posture_level),
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    ),
    (
      'trust_command_card:' || v_snapshot.command_snapshot_key || ':incidents',
      'active',
      v_snapshot.id,
      'incident',
      'risk',
      v_snapshot.customer_name,
      v_snapshot.customer_domain,
      'Open incidents',
      v_snapshot.critical_incident_count::text || ' critical · ' || v_snapshot.high_incident_count::text || ' high',
      'Open trust incidents requiring operational handling.',
      case when v_snapshot.critical_incident_count > 0 then 'critical' when v_snapshot.high_incident_count > 0 then 'high' when v_snapshot.open_incident_count > 0 then 'medium' else 'info' end,
      case when v_snapshot.critical_incident_count > 0 then 'critical' when v_snapshot.high_incident_count > 0 then 'high' else 'medium' end,
      v_snapshot.open_incident_count,
      'count',
      'Incidents',
      'Review incidents',
      '/admin/security-trust-incidents',
      20,
      '{}'::jsonb,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    ),
    (
      'trust_command_card:' || v_snapshot.command_snapshot_key || ':ai_findings',
      'active',
      v_snapshot.id,
      'ai_finding',
      'risk',
      v_snapshot.customer_name,
      v_snapshot.customer_domain,
      'AI findings',
      v_snapshot.critical_ai_finding_count::text || ' critical · ' || v_snapshot.high_ai_finding_count::text || ' high',
      'Open AI analyst findings and anomaly signals.',
      case when v_snapshot.critical_ai_finding_count > 0 then 'critical' when v_snapshot.high_ai_finding_count > 0 then 'high' when v_snapshot.open_ai_finding_count > 0 then 'medium' else 'info' end,
      case when v_snapshot.critical_ai_finding_count > 0 then 'critical' when v_snapshot.high_ai_finding_count > 0 then 'high' else 'medium' end,
      v_snapshot.open_ai_finding_count,
      'count',
      'AI findings',
      'Review findings',
      '/admin/security-trust-ai-analyst/findings',
      30,
      '{}'::jsonb,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    ),
    (
      'trust_command_card:' || v_snapshot.command_snapshot_key || ':recommended_actions',
      'active',
      v_snapshot.id,
      'recommended_action',
      'operations',
      v_snapshot.customer_name,
      v_snapshot.customer_domain,
      'Recommended actions',
      v_snapshot.critical_recommended_action_count::text || ' critical · ' || v_snapshot.high_recommended_action_count::text || ' high',
      'Open system-recommended operator actions.',
      case when v_snapshot.critical_recommended_action_count > 0 then 'critical' when v_snapshot.high_recommended_action_count > 0 then 'high' when v_snapshot.open_recommended_action_count > 0 then 'medium' else 'info' end,
      case when v_snapshot.critical_recommended_action_count > 0 then 'critical' when v_snapshot.high_recommended_action_count > 0 then 'high' else 'medium' end,
      v_snapshot.open_recommended_action_count,
      'count',
      'Actions',
      'Review actions',
      '/admin/security-trust-ai-analyst/recommended-actions',
      40,
      '{}'::jsonb,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    ),
    (
      'trust_command_card:' || v_snapshot.command_snapshot_key || ':verifications',
      'active',
      v_snapshot.id,
      'verification',
      'operations',
      v_snapshot.customer_name,
      v_snapshot.customer_domain,
      'Failed verifications 24h',
      'Public verification failures in the last 24 hours.',
      'High values may indicate invalid proof links, tampering, abuse, or stale artifacts.',
      case when v_snapshot.failed_verification_count_24h >= 50 then 'high' when v_snapshot.failed_verification_count_24h > 0 then 'medium' else 'info' end,
      case when v_snapshot.failed_verification_count_24h >= 50 then 'high' else 'medium' end,
      v_snapshot.failed_verification_count_24h,
      'count',
      'Failed verifications',
      'Review verification results',
      '/admin/security-public-verification',
      50,
      '{}'::jsonb,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    ),
    (
      'trust_command_card:' || v_snapshot.command_snapshot_key || ':billing',
      'active',
      v_snapshot.id,
      'billing',
      'billing',
      v_snapshot.customer_name,
      v_snapshot.customer_domain,
      'Billing usage pressure',
      v_snapshot.billing_usage_exceeded_count::text || ' exceeded · ' || v_snapshot.billing_usage_warning_count::text || ' warning',
      'Trust usage approaching or exceeding customer entitlements.',
      case when v_snapshot.billing_usage_exceeded_count > 0 then 'high' when v_snapshot.billing_usage_warning_count > 0 then 'medium' else 'info' end,
      case when v_snapshot.billing_usage_exceeded_count > 0 then 'high' else 'medium' end,
      v_snapshot.current_period_overage_cents,
      'cents',
      'Current overage',
      'Review billing usage',
      '/admin/security-trust-billing/usage-rollups',
      60,
      '{}'::jsonb,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    ),
    (
      'trust_command_card:' || v_snapshot.command_snapshot_key || ':integrations',
      'active',
      v_snapshot.id,
      'integration',
      'integrations',
      v_snapshot.customer_name,
      v_snapshot.customer_domain,
      'Integration health',
      v_snapshot.dead_lettered_webhook_delivery_count::text || ' dead-lettered · ' || v_snapshot.due_webhook_delivery_count::text || ' due',
      'Webhook and enterprise export health.',
      case when v_snapshot.dead_lettered_webhook_delivery_count > 0 or v_snapshot.failed_export_job_count_24h > 0 then 'medium' else 'info' end,
      case when v_snapshot.dead_lettered_webhook_delivery_count > 0 then 'high' else 'medium' end,
      v_snapshot.dead_lettered_webhook_delivery_count,
      'count',
      'Dead-lettered deliveries',
      'Review integrations',
      '/admin/security-trust-integrations',
      70,
      '{}'::jsonb,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    )
  on conflict (command_card_key)
  do update set
    status = excluded.status,
    title = excluded.title,
    subtitle = excluded.subtitle,
    body = excluded.body,
    severity = excluded.severity,
    priority = excluded.priority,
    metric_value = excluded.metric_value,
    action_label = excluded.action_label,
    action_route = excluded.action_route,
    card_payload = excluded.card_payload,
    updated_at = now();

  get diagnostics v_count = row_count;

  return jsonb_build_object(
    'snapshotId',
    v_snapshot.id,
    'cardsSeeded',
    v_count
  );
end;
$$;
