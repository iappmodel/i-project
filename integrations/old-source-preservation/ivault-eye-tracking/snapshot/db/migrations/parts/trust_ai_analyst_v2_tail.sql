-- ---------------------------------------------------------------------------
-- 17) Run all AI detectors
-- ---------------------------------------------------------------------------

create or replace function run_admin_security_trust_ai_analyst(
  p_run_type text default 'scheduled',
  p_detector_family text default null,
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
  v_run_id uuid;
  v_run_key text;
  v_detector record;
  v_lookback_start timestamptz;
  v_lookback_end timestamptz := now();
  v_findings integer := 0;
  v_total_findings integer := 0;
  v_detectors integer := 0;
  v_critical integer := 0;
  v_high integer := 0;
begin
  v_run_key :=
    'trust_ai_analyst_run:' ||
    coalesce(p_detector_family, 'all') || ':' ||
    substr(encode(gen_random_bytes(12), 'hex'), 1, 24);

  insert into admin_security_trust_ai_analyst_runs (
    analyst_run_key,
    status,
    run_type,
    run_scope,
    detector_family,
    customer_name,
    customer_domain,
    lookback_start,
    lookback_end,
    worker_id,
    request_id,
    metadata
  )
  values (
    v_run_key,
    'running',
    coalesce(p_run_type, 'scheduled'),
    case
      when p_customer_name is not null then 'customer'
      when p_detector_family is not null then 'detector_family'
      else 'global'
    end,
    p_detector_family,
    p_customer_name,
    p_customer_domain,
    now() - interval '24 hours',
    v_lookback_end,
    p_worker_id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_run_id;

  perform record_admin_security_trust_ai_analyst_event(
    'analyst_run_started',
    'started',
    v_run_id,
    null,
    null,
    null,
    null,
    p_customer_name,
    p_customer_domain,
    'worker',
    null,
    null,
    null,
    'Trust AI analyst run started',
    coalesce(p_detector_family, 'all detectors'),
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  for v_detector in
    select *
    from admin_security_trust_ai_detectors
    where status = 'active'
      and default_enabled is true
      and (p_detector_family is null or detector_family = p_detector_family)
    order by detector_family, detector_key
  loop
    v_detectors := v_detectors + 1;
    v_lookback_start := v_lookback_end - v_detector.lookback_interval;

    if v_detector.detector_key = 'trust_ai_detector:proof_hash_mismatch_cluster' then
      v_findings := run_trust_ai_detector_proof_hash_mismatch_cluster(
        v_run_id,
        v_detector.id,
        v_lookback_start,
        v_lookback_end,
        p_request_id,
        p_metadata
      );
    elsif v_detector.detector_key = 'trust_ai_detector:verification_failure_spike' then
      v_findings := run_trust_ai_detector_verification_failure_spike(
        v_run_id,
        v_detector.id,
        v_lookback_start,
        v_lookback_end,
        p_request_id,
        p_metadata
      );
    elsif v_detector.detector_key = 'trust_ai_detector:governance_denial_drift' then
      v_findings := run_trust_ai_detector_governance_denial_drift(
        v_run_id,
        v_detector.id,
        v_lookback_start,
        v_lookback_end,
        p_request_id,
        p_metadata
      );
    elsif v_detector.detector_key = 'trust_ai_detector:incident_repeat_pattern' then
      v_findings := run_trust_ai_detector_incident_repeat_pattern(
        v_run_id,
        v_detector.id,
        v_lookback_start,
        v_lookback_end,
        p_request_id,
        p_metadata
      );
    elsif v_detector.detector_key = 'trust_ai_detector:usage_limit_pressure' then
      v_findings := run_trust_ai_detector_usage_limit_pressure(
        v_run_id,
        v_detector.id,
        v_lookback_start,
        v_lookback_end,
        p_request_id,
        p_metadata
      );
    elsif v_detector.detector_key = 'trust_ai_detector:webhook_dead_letter_cluster' then
      v_findings := run_trust_ai_detector_webhook_dead_letter_cluster(
        v_run_id,
        v_detector.id,
        v_lookback_start,
        v_lookback_end,
        p_request_id,
        p_metadata
      );
    else
      v_findings := 0;
    end if;

    v_total_findings := v_total_findings + coalesce(v_findings, 0);

    perform record_admin_security_trust_ai_analyst_event(
      'detector_evaluated',
      'evaluated',
      v_run_id,
      v_detector.id,
      null,
      null,
      null,
      p_customer_name,
      p_customer_domain,
      'worker',
      null,
      null,
      null,
      'Detector evaluated',
      v_detector.detector_key || ': ' || coalesce(v_findings, 0)::text || ' findings',
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );
  end loop;

  select
    count(*) filter (where severity = 'critical'),
    count(*) filter (where severity = 'high')
  into v_critical, v_high
  from admin_security_trust_ai_findings
  where analyst_run_id = v_run_id;

  update admin_security_trust_ai_analyst_runs
  set
    status = 'completed',
    detectors_evaluated = v_detectors,
    findings_created = v_total_findings,
    critical_findings = coalesce(v_critical, 0),
    high_findings = coalesce(v_high, 0),
    completed_at = now(),
    updated_at = now()
  where id = v_run_id;

  perform record_admin_security_trust_ai_analyst_event(
    'analyst_run_completed',
    'completed',
    v_run_id,
    null,
    null,
    null,
    null,
    p_customer_name,
    p_customer_domain,
    'worker',
    null,
    null,
    null,
    'Trust AI analyst run completed',
    v_total_findings::text || ' finding(s) created.',
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_run_id;

exception
  when others then
    if v_run_id is not null then
      update admin_security_trust_ai_analyst_runs
      set
        status = 'failed',
        failed_at = now(),
        last_error = sqlerrm,
        updated_at = now()
      where id = v_run_id;

      perform record_admin_security_trust_ai_analyst_event(
        'analyst_run_failed',
        'failed',
        v_run_id,
        null,
        null,
        null,
        null,
        p_customer_name,
        p_customer_domain,
        'worker',
        null,
        null,
        null,
        'Trust AI analyst run failed',
        sqlerrm,
        p_request_id,
        coalesce(p_metadata, '{}'::jsonb)
      );
    end if;

    raise;
end;
$$;

-- ---------------------------------------------------------------------------
-- 18) Compute customer risk scores
-- ---------------------------------------------------------------------------

create or replace function compute_admin_security_customer_trust_risk_scores(
  p_period_start timestamptz default (now() - interval '7 days'),
  p_period_end timestamptz default now(),
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
  v_open_findings integer;
  v_critical_findings integer;
  v_high_findings integer;
  v_open_incidents integer;
  v_failed_verifications integer;
  v_dead_letters integer;
  v_usage_exceeded integer;
  v_overall numeric;
  v_risk_level text;
  v_score_id uuid;
begin
  for v_customer in
    select customer_name, customer_domain
    from (
      select customer_name, customer_domain from admin_security_customer_trust_entitlements where customer_name is not null
      union
      select customer_name, customer_domain from admin_security_trust_ai_findings where customer_name is not null
      union
      select customer_name, customer_domain from admin_security_trust_incidents where customer_name is not null
      union
      select customer_name, customer_domain from admin_security_trust_webhook_deliveries where customer_name is not null
    ) c
  loop
    select
      count(*) filter (where status in ('open', 'acknowledged', 'investigating')),
      count(*) filter (where status in ('open', 'acknowledged', 'investigating') and severity = 'critical'),
      count(*) filter (where status in ('open', 'acknowledged', 'investigating') and severity = 'high')
    into v_open_findings, v_critical_findings, v_high_findings
    from admin_security_trust_ai_findings
    where customer_name = v_customer.customer_name
      and coalesce(customer_domain, '') = coalesce(v_customer.customer_domain, '')
      and created_at >= p_period_start
      and created_at < p_period_end;

    select count(*)
    into v_open_incidents
    from admin_security_trust_incidents
    where customer_name = v_customer.customer_name
      and coalesce(customer_domain, '') = coalesce(v_customer.customer_domain, '')
      and status in ('open', 'acknowledged', 'investigating', 'escalated', 'mitigating');

    select count(*)
    into v_failed_verifications
    from admin_security_public_verification_results
    where customer_name = v_customer.customer_name
      and coalesce(customer_domain, '') = coalesce(v_customer.customer_domain, '')
      and created_at >= p_period_start
      and created_at < p_period_end
      and (
        verified is false
        or verification_status in ('failed', 'invalid', 'hash_mismatch')
      );

    select count(*)
    into v_dead_letters
    from admin_security_trust_webhook_deliveries
    where customer_name = v_customer.customer_name
      and coalesce(customer_domain, '') = coalesce(v_customer.customer_domain, '')
      and status = 'dead_lettered'
      and created_at >= p_period_start
      and created_at < p_period_end;

    select count(*)
    into v_usage_exceeded
    from admin_security_trust_usage_rollups
    where customer_name = v_customer.customer_name
      and coalesce(customer_domain, '') = coalesce(v_customer.customer_domain, '')
      and billing_period_start >= date_trunc('month', p_period_end)
      and usage_percent is not null
      and usage_percent >= 100;

    v_overall :=
      least(
        100,
        (coalesce(v_critical_findings, 0) * 25)
        + (coalesce(v_high_findings, 0) * 15)
        + (greatest(coalesce(v_open_findings, 0) - coalesce(v_high_findings, 0) - coalesce(v_critical_findings, 0), 0) * 5)
        + (coalesce(v_open_incidents, 0) * 20)
        + (least(coalesce(v_failed_verifications, 0), 50) * 0.5)
        + (coalesce(v_dead_letters, 0) * 3)
        + (coalesce(v_usage_exceeded, 0) * 10)
      );

    v_risk_level :=
      case
        when v_overall >= 80 then 'critical'
        when v_overall >= 50 then 'high'
        when v_overall >= 25 then 'medium'
        else 'low'
      end;

    insert into admin_security_customer_trust_risk_scores (
      risk_score_key,
      status,
      customer_name,
      customer_domain,
      score_period_start,
      score_period_end,
      overall_risk_score,
      risk_level,
      proof_health_score,
      verification_integrity_score,
      governance_stability_score,
      incident_pressure_score,
      billing_usage_pressure_score,
      integration_health_score,
      transparency_risk_score,
      open_finding_count,
      critical_finding_count,
      high_finding_count,
      open_incident_count,
      failed_verification_count,
      dead_lettered_delivery_count,
      usage_exceeded_count,
      score_payload,
      request_id,
      metadata
    )
    values (
      'customer_trust_risk_score:' ||
      lower(regexp_replace(v_customer.customer_name, '[^a-zA-Z0-9]+', '-', 'g')) || ':' ||
      p_period_start::date::text || ':' ||
      p_period_end::date::text,
      'active',
      v_customer.customer_name,
      v_customer.customer_domain,
      p_period_start,
      p_period_end,
      v_overall,
      v_risk_level,
      greatest(0, 100 - (coalesce(v_failed_verifications, 0) * 1)),
      greatest(0, 100 - (coalesce(v_failed_verifications, 0) * 2)),
      greatest(0, 100 - (coalesce(v_open_findings, 0) * 3)),
      least(100, coalesce(v_open_incidents, 0) * 20),
      least(100, coalesce(v_usage_exceeded, 0) * 40),
      greatest(0, 100 - (coalesce(v_dead_letters, 0) * 5)),
      least(100, coalesce(v_open_findings, 0) * 5),
      coalesce(v_open_findings, 0),
      coalesce(v_critical_findings, 0),
      coalesce(v_high_findings, 0),
      coalesce(v_open_incidents, 0),
      coalesce(v_failed_verifications, 0),
      coalesce(v_dead_letters, 0),
      coalesce(v_usage_exceeded, 0),
      jsonb_build_object(
        'runId', v_run_id,
        'computedBy', p_worker_id
      ),
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    )
    on conflict (customer_name, customer_domain, score_period_start, score_period_end)
    do update set
      status = 'active',
      overall_risk_score = excluded.overall_risk_score,
      risk_level = excluded.risk_level,
      proof_health_score = excluded.proof_health_score,
      verification_integrity_score = excluded.verification_integrity_score,
      governance_stability_score = excluded.governance_stability_score,
      incident_pressure_score = excluded.incident_pressure_score,
      billing_usage_pressure_score = excluded.billing_usage_pressure_score,
      integration_health_score = excluded.integration_health_score,
      transparency_risk_score = excluded.transparency_risk_score,
      open_finding_count = excluded.open_finding_count,
      critical_finding_count = excluded.critical_finding_count,
      high_finding_count = excluded.high_finding_count,
      open_incident_count = excluded.open_incident_count,
      failed_verification_count = excluded.failed_verification_count,
      dead_lettered_delivery_count = excluded.dead_lettered_delivery_count,
      usage_exceeded_count = excluded.usage_exceeded_count,
      score_payload = excluded.score_payload,
      computed_at = now(),
      metadata = admin_security_customer_trust_risk_scores.metadata || excluded.metadata,
      updated_at = now()
    returning id into v_score_id;

    perform record_admin_security_trust_ai_analyst_event(
      'risk_score_computed',
      'computed',
      null,
      null,
      null,
      v_score_id,
      null,
      v_customer.customer_name,
      v_customer.customer_domain,
      'worker',
      null,
      null,
      null,
      'Customer trust risk score computed',
      'Risk level: ' || v_risk_level,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('risk_score_run_id', v_run_id)
    );

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'runId',
    v_run_id,
    'riskScoresComputed',
    v_count
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 19) Acknowledge / resolve / suppress findings
-- ---------------------------------------------------------------------------

create or replace function acknowledge_admin_security_trust_ai_finding(
  p_admin_auth_user_id uuid,
  p_finding_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_finding admin_security_trust_ai_findings%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  update admin_security_trust_ai_findings
  set
    status = 'acknowledged',
    acknowledged_at = now(),
    acknowledged_by_auth_user_id = p_admin_auth_user_id,
    acknowledged_by_admin_user_id = v_admin.id,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = p_finding_id
    and status = 'open'
  returning * into v_finding;

  if v_finding.id is null then
    raise exception 'trust ai finding not found or not open: %', p_finding_id;
  end if;

  perform record_admin_security_trust_ai_analyst_event(
    'finding_acknowledged',
    'acknowledged',
    v_finding.analyst_run_id,
    v_finding.detector_id,
    v_finding.id,
    null,
    null,
    v_finding.customer_name,
    v_finding.customer_domain,
    'admin',
    p_admin_auth_user_id,
    v_admin.id,
    v_admin.email,
    'Trust AI finding acknowledged',
    v_finding.finding_title,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_finding.id;
end;
$$;

create or replace function resolve_admin_security_trust_ai_finding(
  p_admin_auth_user_id uuid,
  p_finding_id uuid,
  p_resolution_note text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_finding admin_security_trust_ai_findings%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_resolution_note is null or length(trim(p_resolution_note)) = 0 then
    raise exception 'trust ai finding resolution note is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  update admin_security_trust_ai_findings
  set
    status = 'resolved',
    resolved_at = now(),
    resolved_by_auth_user_id = p_admin_auth_user_id,
    resolved_by_admin_user_id = v_admin.id,
    resolution_note = p_resolution_note,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = p_finding_id
    and status in ('open', 'acknowledged', 'investigating')
  returning * into v_finding;

  if v_finding.id is null then
    raise exception 'trust ai finding not found or not resolvable: %', p_finding_id;
  end if;

  perform record_admin_security_trust_ai_analyst_event(
    'finding_resolved',
    'resolved',
    v_finding.analyst_run_id,
    v_finding.detector_id,
    v_finding.id,
    null,
    null,
    v_finding.customer_name,
    v_finding.customer_domain,
    'admin',
    p_admin_auth_user_id,
    v_admin.id,
    v_admin.email,
    'Trust AI finding resolved',
    p_resolution_note,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_finding.id;
end;
$$;

create or replace function suppress_admin_security_trust_ai_finding(
  p_admin_auth_user_id uuid,
  p_finding_id uuid,
  p_suppression_reason text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_finding admin_security_trust_ai_findings%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_suppression_reason is null or length(trim(p_suppression_reason)) = 0 then
    raise exception 'trust ai finding suppression reason is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  update admin_security_trust_ai_findings
  set
    status = 'suppressed',
    suppressed_at = now(),
    suppressed_by_auth_user_id = p_admin_auth_user_id,
    suppressed_by_admin_user_id = v_admin.id,
    suppression_reason = p_suppression_reason,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = p_finding_id
    and status in ('open', 'acknowledged', 'investigating')
  returning * into v_finding;

  if v_finding.id is null then
    raise exception 'trust ai finding not found or not suppressible: %', p_finding_id;
  end if;

  perform record_admin_security_trust_ai_analyst_event(
    'finding_suppressed',
    'suppressed',
    v_finding.analyst_run_id,
    v_finding.detector_id,
    v_finding.id,
    null,
    null,
    v_finding.customer_name,
    v_finding.customer_domain,
    'admin',
    p_admin_auth_user_id,
    v_admin.id,
    v_admin.email,
    'Trust AI finding suppressed',
    p_suppression_reason,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_finding.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 20) Dashboard views
-- ---------------------------------------------------------------------------

create or replace view admin_security_trust_ai_detector_dashboard as
select
  d.id as admin_security_trust_ai_detector_id,
  d.detector_key,
  d.status,
  d.detector_name,
  d.detector_description,
  d.detector_family,
  d.detector_type,
  d.severity_floor,
  d.default_enabled,
  d.lookback_interval,
  d.min_signal_count,
  d.confidence_threshold,
  d.run_frequency_minutes,
  d.owner_team,
  (
    select count(*)
    from admin_security_trust_ai_findings f
    where f.detector_id = d.id
      and f.status in ('open', 'acknowledged', 'investigating')
  ) as open_finding_count,
  (
    select max(created_at)
    from admin_security_trust_ai_analyst_events e
    where e.detector_id = d.id
      and e.event_type = 'detector_evaluated'
  ) as last_evaluated_at,
  d.created_at,
  d.updated_at,
  d.metadata
from admin_security_trust_ai_detectors d
order by d.detector_family, d.detector_name;

create or replace view admin_security_trust_ai_finding_dashboard as
select
  f.id as admin_security_trust_ai_finding_id,
  f.finding_key,
  f.status,
  f.analyst_run_id,
  r.analyst_run_key,
  f.detector_id,
  d.detector_name,
  f.detector_key,
  f.detector_family,
  f.finding_type,
  f.finding_title,
  f.finding_summary,
  f.severity,
  f.confidence,
  f.customer_name,
  f.customer_domain,
  f.private_room_id,
  pr.private_room_key,
  f.proof_type,
  f.proof_key,
  f.proof_hash_sha256,
  f.source_table,
  f.source_id,
  f.source_key,
  f.related_incident_id,
  i.incident_key as related_incident_key,
  f.related_billing_account_id,
  ba.billing_account_key as related_billing_account_key,
  f.related_webhook_endpoint_id,
  wh.webhook_endpoint_key as related_webhook_endpoint_key,
  f.related_transparency_portal_id,
  tp.transparency_portal_key as related_transparency_portal_key,
  f.signal_count,
  f.recommended_action,
  f.auto_incident_candidate,
  f.auto_governance_review_candidate,
  f.customer_visible_candidate,
  f.first_seen_at,
  f.last_seen_at,
  f.acknowledged_at,
  ack.email as acknowledged_by_email,
  f.resolved_at,
  resolver.email as resolved_by_email,
  f.resolution_note,
  f.suppressed_at,
  suppressor.email as suppressed_by_email,
  f.suppression_reason,
  (
    select count(*)
    from admin_security_trust_ai_recommended_actions a
    where a.finding_id = f.id
      and a.status = 'open'
  ) as open_recommended_action_count,
  f.created_at,
  f.updated_at,
  f.metadata
from admin_security_trust_ai_findings f
left join admin_security_trust_ai_analyst_runs r
  on r.id = f.analyst_run_id
left join admin_security_trust_ai_detectors d
  on d.id = f.detector_id
left join admin_security_private_trust_rooms pr
  on pr.id = f.private_room_id
left join admin_security_trust_incidents i
  on i.id = f.related_incident_id
left join admin_security_trust_billing_accounts ba
  on ba.id = f.related_billing_account_id
left join admin_security_trust_webhook_endpoints wh
  on wh.id = f.related_webhook_endpoint_id
left join admin_security_trust_transparency_portals tp
  on tp.id = f.related_transparency_portal_id
left join admin_users ack
  on ack.id = f.acknowledged_by_admin_user_id
left join admin_users resolver
  on resolver.id = f.resolved_by_admin_user_id
left join admin_users suppressor
  on suppressor.id = f.suppressed_by_admin_user_id
order by f.created_at desc;

create or replace view admin_security_customer_trust_risk_score_dashboard as
select
  r.id as admin_security_customer_trust_risk_score_id,
  r.risk_score_key,
  r.status,
  r.customer_name,
  r.customer_domain,
  r.score_period_start,
  r.score_period_end,
  r.overall_risk_score,
  r.risk_level,
  r.proof_health_score,
  r.verification_integrity_score,
  r.governance_stability_score,
  r.incident_pressure_score,
  r.billing_usage_pressure_score,
  r.integration_health_score,
  r.transparency_risk_score,
  r.open_finding_count,
  r.critical_finding_count,
  r.high_finding_count,
  r.open_incident_count,
  r.failed_verification_count,
  r.dead_lettered_delivery_count,
  r.usage_exceeded_count,
  r.computed_at,
  r.created_at,
  r.updated_at,
  r.metadata
from admin_security_customer_trust_risk_scores r
order by r.computed_at desc;

create or replace view admin_security_trust_ai_recommended_action_dashboard as
select
  a.id as admin_security_trust_ai_recommended_action_id,
  a.recommended_action_key,
  a.status,
  a.finding_id,
  f.finding_key,
  f.finding_title,
  f.severity as finding_severity,
  a.risk_score_id,
  rs.risk_score_key,
  a.action_type,
  a.action_priority,
  a.customer_name,
  a.customer_domain,
  a.title,
  a.summary,
  a.target_table,
  a.target_id,
  a.target_key,
  a.requires_approval,
  a.auto_executable,
  a.approved_at,
  approver.email as approved_by_email,
  a.executed_at,
  executor.email as executed_by_email,
  a.execution_result,
  a.dismissed_at,
  dismisser.email as dismissed_by_email,
  a.dismissal_reason,
  a.created_at,
  a.updated_at,
  a.metadata
from admin_security_trust_ai_recommended_actions a
left join admin_security_trust_ai_findings f
  on f.id = a.finding_id
left join admin_security_customer_trust_risk_scores rs
  on rs.id = a.risk_score_id
left join admin_users approver
  on approver.id = a.approved_by_admin_user_id
left join admin_users executor
  on executor.id = a.executed_by_admin_user_id
left join admin_users dismisser
  on dismisser.id = a.dismissed_by_admin_user_id
order by a.created_at desc;

create or replace view admin_security_trust_ai_integrity as
select
  (
    select count(*)
    from admin_security_trust_ai_detectors
    where status = 'active'
      and default_enabled is true
  ) as active_detector_count,

  (
    select count(*)
    from admin_security_trust_ai_analyst_runs
    where status = 'failed'
      and created_at >= now() - interval '24 hours'
  ) as failed_analyst_run_count_24h,

  (
    select count(*)
    from admin_security_trust_ai_findings
    where status in ('open', 'acknowledged', 'investigating')
  ) as open_finding_count,

  (
    select count(*)
    from admin_security_trust_ai_findings
    where status in ('open', 'acknowledged', 'investigating')
      and severity = 'critical'
  ) as open_critical_finding_count,

  (
    select count(*)
    from admin_security_trust_ai_findings
    where status in ('open', 'acknowledged', 'investigating')
      and severity = 'high'
  ) as open_high_finding_count,

  (
    select count(*)
    from admin_security_trust_ai_recommended_actions
    where status = 'open'
  ) as open_recommended_action_count,

  (
    select count(*)
    from admin_security_customer_trust_risk_scores
    where computed_at >= now() - interval '24 hours'
      and risk_level in ('high', 'critical')
  ) as high_or_critical_customer_risk_count_24h,

  now() as checked_at;

grant select on admin_security_trust_ai_detector_dashboard to admin_api_role;
grant select on admin_security_trust_ai_finding_dashboard to admin_api_role;
grant select on admin_security_customer_trust_risk_score_dashboard to admin_api_role;
grant select on admin_security_trust_ai_recommended_action_dashboard to admin_api_role;
grant select on admin_security_trust_ai_integrity to admin_api_role;

-- ---------------------------------------------------------------------------
-- 21) Scheduled jobs
-- ---------------------------------------------------------------------------

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
    'admin_security_trust_ai_analyst_every_15m',
    'Run trust AI analyst',
    'admin',
    true,
    '*/15 * * * *',
    'run_admin_security_trust_ai_analyst',
    '{}'::jsonb,
    300,
    600,
    '{"priority": "high"}'::jsonb
  ),
  (
    'admin_security_customer_trust_risk_scores_hourly',
    'Compute customer trust risk scores',
    'admin',
    true,
    '11 * * * *',
    'compute_admin_security_customer_trust_risk_scores',
    '{}'::jsonb,
    300,
    600,
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

-- ---------------------------------------------------------------------------
-- 22) Error catalog + mapping
-- ---------------------------------------------------------------------------

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
    'TRUST_AI_ANALYST_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Trust AI analyst record not found.',
    'Trust AI analyst record not found.',
    'platform'
  ),
  (
    'TRUST_AI_ANALYST_INVALID_STATE',
    'validation',
    'medium',
    409,
    true,
    true,
    'Trust AI analyst record is not in a valid state.',
    'Trust AI analyst invalid state.',
    'platform'
  ),
  (
    'TRUST_AI_ANALYST_REQUIRED_FIELDS',
    'validation',
    'medium',
    400,
    false,
    true,
    'Trust AI analyst request requires complete fields.',
    'Trust AI analyst required fields missing.',
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
  ('trust ai detector not found', 'TRUST_AI_ANALYST_NOT_FOUND', 5, '{}'),
  ('trust ai finding not found', 'TRUST_AI_ANALYST_NOT_FOUND', 5, '{}'),
  ('trust ai finding not found or not open', 'TRUST_AI_ANALYST_INVALID_STATE', 5, '{}'),
  ('trust ai finding not found or not resolvable', 'TRUST_AI_ANALYST_INVALID_STATE', 5, '{}'),
  ('trust ai finding not found or not suppressible', 'TRUST_AI_ANALYST_INVALID_STATE', 5, '{}'),
  ('trust ai finding resolution note is required', 'TRUST_AI_ANALYST_REQUIRED_FIELDS', 5, '{}'),
  ('trust ai finding suppression reason is required', 'TRUST_AI_ANALYST_REQUIRED_FIELDS', 5, '{}')
on conflict (match_pattern)
do update set
  error_code = excluded.error_code,
  priority = excluded.priority,
  metadata = error_mapping_rules.metadata || excluded.metadata,
  active = true;

-- ---------------------------------------------------------------------------
-- 23) RLS + grants + security definer
-- ---------------------------------------------------------------------------

alter table admin_security_trust_ai_detectors enable row level security;
alter table admin_security_trust_ai_analyst_runs enable row level security;
alter table admin_security_trust_ai_findings enable row level security;
alter table admin_security_customer_trust_risk_scores enable row level security;
alter table admin_security_trust_ai_recommended_actions enable row level security;
alter table admin_security_trust_ai_analyst_events enable row level security;

drop policy if exists admin_api_all_trust_ai_detectors on admin_security_trust_ai_detectors;
create policy admin_api_all_trust_ai_detectors
on admin_security_trust_ai_detectors
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_trust_ai_analyst_runs on admin_security_trust_ai_analyst_runs;
create policy admin_api_all_trust_ai_analyst_runs
on admin_security_trust_ai_analyst_runs
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_trust_ai_findings on admin_security_trust_ai_findings;
create policy admin_api_all_trust_ai_findings
on admin_security_trust_ai_findings
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_customer_trust_risk_scores on admin_security_customer_trust_risk_scores;
create policy admin_api_all_customer_trust_risk_scores
on admin_security_customer_trust_risk_scores
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_trust_ai_recommended_actions on admin_security_trust_ai_recommended_actions;
create policy admin_api_all_trust_ai_recommended_actions
on admin_security_trust_ai_recommended_actions
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_trust_ai_analyst_events on admin_security_trust_ai_analyst_events;
create policy admin_api_all_trust_ai_analyst_events
on admin_security_trust_ai_analyst_events
for all to admin_api_role
using (true)
with check (true);

drop policy if exists worker_all_trust_ai_detectors on admin_security_trust_ai_detectors;
create policy worker_all_trust_ai_detectors
on admin_security_trust_ai_detectors
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_trust_ai_analyst_runs on admin_security_trust_ai_analyst_runs;
create policy worker_all_trust_ai_analyst_runs
on admin_security_trust_ai_analyst_runs
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_trust_ai_findings on admin_security_trust_ai_findings;
create policy worker_all_trust_ai_findings
on admin_security_trust_ai_findings
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_customer_trust_risk_scores on admin_security_customer_trust_risk_scores;
create policy worker_all_customer_trust_risk_scores
on admin_security_customer_trust_risk_scores
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_trust_ai_recommended_actions on admin_security_trust_ai_recommended_actions;
create policy worker_all_trust_ai_recommended_actions
on admin_security_trust_ai_recommended_actions
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_trust_ai_analyst_events on admin_security_trust_ai_analyst_events;
create policy worker_all_trust_ai_analyst_events
on admin_security_trust_ai_analyst_events
for all to worker_role
using (true)
with check (true);

grant execute on function record_admin_security_trust_ai_analyst_event(
  text,text,uuid,uuid,uuid,uuid,uuid,text,text,text,uuid,uuid,text,text,text,text,jsonb
) to admin_api_role, worker_role;

grant execute on function create_admin_security_trust_ai_finding(
  uuid,uuid,text,text,text,text,numeric,text,text,uuid,text,text,text,text,uuid,text,integer,jsonb,jsonb,text,jsonb,boolean,boolean,boolean,text,jsonb
) to admin_api_role, worker_role;

grant execute on function create_admin_security_trust_ai_recommended_action(
  uuid,text,text,text,text,text,uuid,text,jsonb,boolean,boolean,text,jsonb
) to admin_api_role, worker_role;

grant execute on function run_trust_ai_detector_proof_hash_mismatch_cluster(uuid,uuid,timestamptz,timestamptz,text,jsonb)
to admin_api_role, worker_role;

grant execute on function run_trust_ai_detector_verification_failure_spike(uuid,uuid,timestamptz,timestamptz,text,jsonb)
to admin_api_role, worker_role;

grant execute on function run_trust_ai_detector_governance_denial_drift(uuid,uuid,timestamptz,timestamptz,text,jsonb)
to admin_api_role, worker_role;

grant execute on function run_trust_ai_detector_incident_repeat_pattern(uuid,uuid,timestamptz,timestamptz,text,jsonb)
to admin_api_role, worker_role;

grant execute on function run_trust_ai_detector_usage_limit_pressure(uuid,uuid,timestamptz,timestamptz,text,jsonb)
to admin_api_role, worker_role;

grant execute on function run_trust_ai_detector_webhook_dead_letter_cluster(uuid,uuid,timestamptz,timestamptz,text,jsonb)
to admin_api_role, worker_role;

grant execute on function run_admin_security_trust_ai_analyst(text,text,text,text,text,text,jsonb)
to admin_api_role, worker_role;

grant execute on function compute_admin_security_customer_trust_risk_scores(timestamptz,timestamptz,text,text,jsonb)
to admin_api_role, worker_role;

grant execute on function acknowledge_admin_security_trust_ai_finding(uuid,uuid,text,jsonb)
to admin_api_role;

grant execute on function resolve_admin_security_trust_ai_finding(uuid,uuid,text,text,jsonb)
to admin_api_role;

grant execute on function suppress_admin_security_trust_ai_finding(uuid,uuid,text,text,jsonb)
to admin_api_role;

alter function run_admin_security_trust_ai_analyst(text,text,text,text,text,text,jsonb) security definer;
alter function run_admin_security_trust_ai_analyst(text,text,text,text,text,text,jsonb) set search_path = public;

alter function compute_admin_security_customer_trust_risk_scores(timestamptz,timestamptz,text,text,jsonb) security definer;
alter function compute_admin_security_customer_trust_risk_scores(timestamptz,timestamptz,text,text,jsonb) set search_path = public;

alter function acknowledge_admin_security_trust_ai_finding(uuid,uuid,text,jsonb) security definer;
alter function acknowledge_admin_security_trust_ai_finding(uuid,uuid,text,jsonb) set search_path = public;

alter function resolve_admin_security_trust_ai_finding(uuid,uuid,text,text,jsonb) security definer;
alter function resolve_admin_security_trust_ai_finding(uuid,uuid,text,text,jsonb) set search_path = public;

alter function suppress_admin_security_trust_ai_finding(uuid,uuid,text,text,jsonb) security definer;
alter function suppress_admin_security_trust_ai_finding(uuid,uuid,text,text,jsonb) set search_path = public;
