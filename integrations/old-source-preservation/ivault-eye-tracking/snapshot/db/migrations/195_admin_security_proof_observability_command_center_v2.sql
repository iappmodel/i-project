-- Step 9.80 — Proof observability command center v2
-- Runs after 194_admin_security_trust_incident_response_system_v2.sql

create extension if not exists pgcrypto;

create table if not exists admin_security_proof_observability_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_key text not null unique,
  status text not null default 'ready',
  snapshot_scope text not null default 'global_admin',
  customer_name text,
  customer_domain text,
  private_room_id uuid references admin_security_private_trust_rooms(id) on delete cascade,
  auditor_portal_id uuid references admin_security_auditor_portals(id) on delete cascade,
  enterprise_review_room_id uuid references admin_security_enterprise_review_rooms(id) on delete cascade,
  health_status text not null default 'healthy',
  health_score numeric(6,2) not null default 100,
  proof_object_count integer not null default 0,
  active_room_count integer not null default 0,
  ready_report_count integer not null default 0,
  verification_count_24h integer not null default 0,
  failed_verification_count_24h integer not null default 0,
  hash_mismatch_count_24h integer not null default 0,
  active_incident_count integer not null default 0,
  critical_incident_count integer not null default 0,
  unassigned_incident_count integer not null default 0,
  missing_customer_notice_count integer not null default 0,
  expiring_link_count_7d integer not null default 0,
  broken_crypto_count integer not null default 0,
  failed_job_count_1h integer not null default 0,
  pending_digest_count integer not null default 0,
  abnormal_download_signal_count_24h integer not null default 0,
  snapshot_payload jsonb not null default '{}'::jsonb,
  snapshot_hash_sha256 text,
  payload_bytes bigint,
  generated_at timestamptz not null default now(),
  expires_at timestamptz default (now() + interval '7 days'),
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_security_proof_observability_snapshots_status_check
    check (status in ('ready','failed','expired','archived')),
  constraint admin_security_proof_observability_snapshots_scope_check
    check (snapshot_scope in ('global_admin','customer','private_room','auditor_portal','enterprise_review_room')),
  constraint admin_security_proof_observability_snapshots_health_status_check
    check (health_status in ('healthy','watch','degraded','critical')),
  constraint admin_security_proof_observability_snapshots_score_check
    check (health_score >= 0 and health_score <= 100)
);

create index if not exists admin_security_proof_observability_snapshots_scope_idx
  on admin_security_proof_observability_snapshots (snapshot_scope, created_at desc);
create index if not exists admin_security_proof_observability_snapshots_health_idx
  on admin_security_proof_observability_snapshots (health_status, health_score, created_at desc);
create index if not exists admin_security_proof_observability_snapshots_private_room_idx
  on admin_security_proof_observability_snapshots (private_room_id, created_at desc);
create index if not exists admin_security_proof_observability_snapshots_customer_idx
  on admin_security_proof_observability_snapshots (customer_name, customer_domain, created_at desc);

create table if not exists admin_security_customer_trust_health (
  id uuid primary key default gen_random_uuid(),
  health_key text not null unique,
  status text not null default 'active',
  health_scope text not null,
  customer_name text,
  customer_domain text,
  private_room_id uuid references admin_security_private_trust_rooms(id) on delete cascade,
  auditor_portal_id uuid references admin_security_auditor_portals(id) on delete cascade,
  enterprise_review_room_id uuid references admin_security_enterprise_review_rooms(id) on delete cascade,
  health_status text not null default 'healthy',
  health_score numeric(6,2) not null default 100,
  risk_level text not null default 'low',
  active_incident_count integer not null default 0,
  critical_incident_count integer not null default 0,
  failed_verification_count_24h integer not null default 0,
  hash_mismatch_count_24h integer not null default 0,
  report_ready_count integer not null default 0,
  expiring_link_count_7d integer not null default 0,
  customer_notice_count integer not null default 0,
  unresolved_notice_required_count integer not null default 0,
  last_incident_at timestamptz,
  last_verification_at timestamptz,
  last_report_at timestamptz,
  last_snapshot_at timestamptz,
  health_payload jsonb not null default '{}'::jsonb,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_customer_trust_health_status_check
    check (status in ('active','inactive','archived')),
  constraint admin_security_customer_trust_health_scope_check
    check (health_scope in ('customer','private_room','auditor_portal','enterprise_review_room')),
  constraint admin_security_customer_trust_health_health_status_check
    check (health_status in ('healthy','watch','degraded','critical')),
  constraint admin_security_customer_trust_health_risk_level_check
    check (risk_level in ('low','medium','high','critical')),
  constraint admin_security_customer_trust_health_score_check
    check (health_score >= 0 and health_score <= 100)
);

create index if not exists admin_security_customer_trust_health_status_idx
  on admin_security_customer_trust_health (health_status, risk_level, updated_at desc);
create index if not exists admin_security_customer_trust_health_customer_idx
  on admin_security_customer_trust_health (customer_name, customer_domain);
create index if not exists admin_security_customer_trust_health_private_room_idx
  on admin_security_customer_trust_health (private_room_id);

drop trigger if exists admin_security_customer_trust_health_set_updated_at on admin_security_customer_trust_health;
create trigger admin_security_customer_trust_health_set_updated_at
before update on admin_security_customer_trust_health
for each row execute function set_updated_at();

create table if not exists admin_security_proof_health_signals (
  id uuid primary key default gen_random_uuid(),
  signal_key text not null unique,
  status text not null default 'active',
  signal_scope text not null default 'global_admin',
  signal_type text not null,
  severity text not null default 'info',
  title text not null,
  summary text,
  customer_name text,
  customer_domain text,
  private_room_id uuid references admin_security_private_trust_rooms(id) on delete set null,
  auditor_portal_id uuid references admin_security_auditor_portals(id) on delete set null,
  enterprise_review_room_id uuid references admin_security_enterprise_review_rooms(id) on delete set null,
  source_type text not null,
  source_id uuid,
  source_key text,
  metric_name text,
  metric_value numeric,
  proof_type text,
  proof_key text,
  observed_at timestamptz not null default now(),
  expires_at timestamptz default (now() + interval '30 days'),
  dedupe_key text not null unique,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_security_proof_health_signals_status_check
    check (status in ('active','resolved','suppressed','expired','archived')),
  constraint admin_security_proof_health_signals_scope_check
    check (signal_scope in ('global_admin','customer','private_room','auditor_portal','enterprise_review_room')),
  constraint admin_security_proof_health_signals_type_check
    check (signal_type in (
      'verification_failure_rate_high','hash_mismatch_detected','incident_backlog_high','critical_incident_open',
      'unassigned_incident','missing_customer_notice','report_job_failures','qr_job_failures','digest_backlog',
      'link_expiry_risk','download_activity_spike','crypto_integrity_gap','room_inactive','customer_health_degraded',
      'system_healthy','other'
    )),
  constraint admin_security_proof_health_signals_severity_check
    check (severity in ('info','notice','warning','critical')),
  constraint admin_security_proof_health_signals_title_check
    check (length(trim(title)) > 0)
);

create index if not exists admin_security_proof_health_signals_status_idx
  on admin_security_proof_health_signals (status, severity, observed_at desc);
create index if not exists admin_security_proof_health_signals_scope_idx
  on admin_security_proof_health_signals (signal_scope, signal_type, observed_at desc);
create index if not exists admin_security_proof_health_signals_private_room_idx
  on admin_security_proof_health_signals (private_room_id, status, severity);

create or replace function record_admin_security_proof_health_signal(
  p_signal_scope text,
  p_signal_type text,
  p_severity text,
  p_title text,
  p_summary text default null,
  p_customer_name text default null,
  p_customer_domain text default null,
  p_private_room_id uuid default null,
  p_auditor_portal_id uuid default null,
  p_enterprise_review_room_id uuid default null,
  p_source_type text default 'system',
  p_source_id uuid default null,
  p_source_key text default null,
  p_metric_name text default null,
  p_metric_value numeric default null,
  p_proof_type text default null,
  p_proof_key text default null,
  p_observed_at timestamptz default now(),
  p_dedupe_key text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_signal_id uuid;
  v_signal_key text;
  v_dedupe text;
begin
  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'proof health signal title is required';
  end if;

  v_signal_key :=
    'proof_health_signal:' ||
    p_signal_type || ':' ||
    substr(encode(gen_random_bytes(12), 'hex'), 1, 24);

  v_dedupe := coalesce(
    p_dedupe_key,
    p_signal_scope || ':' ||
    p_signal_type || ':' ||
    coalesce(p_source_type, '') || ':' ||
    coalesce(p_source_id::text, '') || ':' ||
    coalesce(p_source_key, '') || ':' ||
    date_trunc('hour', coalesce(p_observed_at, now()))::text
  );

  insert into admin_security_proof_health_signals (
    signal_key, status, signal_scope, signal_type, severity, title, summary,
    customer_name, customer_domain, private_room_id, auditor_portal_id, enterprise_review_room_id,
    source_type, source_id, source_key, metric_name, metric_value, proof_type, proof_key,
    observed_at, dedupe_key, request_id, metadata
  )
  values (
    v_signal_key, 'active', p_signal_scope, p_signal_type, coalesce(p_severity, 'info'),
    p_title, p_summary, p_customer_name, p_customer_domain, p_private_room_id, p_auditor_portal_id,
    p_enterprise_review_room_id, coalesce(p_source_type, 'system'), p_source_id, p_source_key,
    p_metric_name, p_metric_value, p_proof_type, p_proof_key, coalesce(p_observed_at, now()),
    v_dedupe, p_request_id, coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (dedupe_key) do update set
    severity = excluded.severity,
    title = excluded.title,
    summary = excluded.summary,
    metric_value = excluded.metric_value,
    metadata = admin_security_proof_health_signals.metadata || excluded.metadata
  returning id into v_signal_id;

  return v_signal_id;
end;
$$;

create or replace function calculate_admin_security_proof_health_status(
  p_critical_incidents integer default 0,
  p_active_incidents integer default 0,
  p_hash_mismatches integer default 0,
  p_failed_verifications integer default 0,
  p_broken_crypto integer default 0,
  p_unassigned_incidents integer default 0,
  p_missing_notices integer default 0,
  p_failed_jobs integer default 0
)
returns jsonb
language plpgsql
as $$
declare
  v_score numeric := 100;
  v_status text := 'healthy';
  v_risk text := 'low';
begin
  v_score :=
    100
    - (coalesce(p_critical_incidents, 0) * 30)
    - (coalesce(p_hash_mismatches, 0) * 35)
    - (coalesce(p_broken_crypto, 0) * 40)
    - (coalesce(p_missing_notices, 0) * 15)
    - (coalesce(p_unassigned_incidents, 0) * 10)
    - (coalesce(p_active_incidents, 0) * 5)
    - (least(coalesce(p_failed_verifications, 0), 20) * 2)
    - (least(coalesce(p_failed_jobs, 0), 20) * 1);

  if v_score < 0 then
    v_score := 0;
  end if;

  v_status :=
    case
      when v_score < 40
        or coalesce(p_critical_incidents, 0) > 0
        or coalesce(p_hash_mismatches, 0) > 0
        or coalesce(p_broken_crypto, 0) > 0
      then 'critical'
      when v_score < 70
        or coalesce(p_active_incidents, 0) >= 3
        or coalesce(p_missing_notices, 0) > 0
      then 'degraded'
      when v_score < 90
        or coalesce(p_failed_verifications, 0) > 0
        or coalesce(p_failed_jobs, 0) > 0
      then 'watch'
      else 'healthy'
    end;

  v_risk :=
    case
      when v_status = 'critical' then 'critical'
      when v_status = 'degraded' then 'high'
      when v_status = 'watch' then 'medium'
      else 'low'
    end;

  return jsonb_build_object(
    'healthScore', round(v_score, 2),
    'healthStatus', v_status,
    'riskLevel', v_risk
  );
end;
$$;

create or replace function build_admin_security_proof_observability_snapshot(
  p_snapshot_scope text default 'global_admin',
  p_customer_name text default null,
  p_customer_domain text default null,
  p_private_room_id uuid default null,
  p_auditor_portal_id uuid default null,
  p_enterprise_review_room_id uuid default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_snapshot_id uuid;
  v_snapshot_key text;
  v_proof_object_count integer := 0;
  v_active_room_count integer := 0;
  v_ready_report_count integer := 0;
  v_verification_count_24h integer := 0;
  v_failed_verification_count_24h integer := 0;
  v_hash_mismatch_count_24h integer := 0;
  v_active_incident_count integer := 0;
  v_critical_incident_count integer := 0;
  v_unassigned_incident_count integer := 0;
  v_missing_customer_notice_count integer := 0;
  v_expiring_link_count_7d integer := 0;
  v_broken_crypto_count integer := 0;
  v_failed_job_count_1h integer := 0;
  v_pending_digest_count integer := 0;
  v_abnormal_download_signal_count_24h integer := 0;
  v_health jsonb;
  v_payload jsonb;
  v_hash text;
  v_bytes bigint;
begin
  v_snapshot_key :=
    'proof_observability_snapshot:' ||
    p_snapshot_scope || ':' ||
    substr(encode(gen_random_bytes(12), 'hex'), 1, 24);

  select count(*) into v_active_room_count
  from admin_security_private_trust_rooms r
  where r.status in ('ready', 'active')
    and (p_private_room_id is null or r.id = p_private_room_id)
    and (p_customer_name is null or r.customer_name = p_customer_name);

  select count(*) into v_ready_report_count
  from admin_security_trust_proof_reports r
  where r.status = 'ready'
    and (p_private_room_id is null or r.private_room_id = p_private_room_id)
    and (p_customer_name is null or r.customer_name = p_customer_name);

  select count(*) into v_verification_count_24h
  from admin_security_public_verification_results r
  where r.created_at >= now() - interval '24 hours';

  select count(*) into v_failed_verification_count_24h
  from admin_security_public_verification_results r
  where r.created_at >= now() - interval '24 hours'
    and r.verification_status = 'failed';

  select count(*) into v_hash_mismatch_count_24h
  from admin_security_public_verification_results r
  where r.created_at >= now() - interval '24 hours'
    and r.hash_match is false;

  select count(*) into v_active_incident_count
  from admin_security_trust_incidents i
  where i.status in ('open', 'acknowledged', 'investigating', 'escalated', 'mitigating')
    and (p_private_room_id is null or i.private_room_id = p_private_room_id)
    and (p_customer_name is null or i.customer_name = p_customer_name);

  select count(*) into v_critical_incident_count
  from admin_security_trust_incidents i
  where i.status in ('open', 'acknowledged', 'investigating', 'escalated', 'mitigating')
    and i.severity = 'critical'
    and (p_private_room_id is null or i.private_room_id = p_private_room_id)
    and (p_customer_name is null or i.customer_name = p_customer_name);

  select count(*) into v_unassigned_incident_count
  from admin_security_trust_incidents i
  where i.status in ('open', 'acknowledged', 'investigating', 'escalated', 'mitigating')
    and not exists (
      select 1 from admin_security_trust_incident_assignments a
      where a.incident_id = i.id and a.status = 'active'
    )
    and (p_private_room_id is null or i.private_room_id = p_private_room_id)
    and (p_customer_name is null or i.customer_name = p_customer_name);

  select count(*) into v_missing_customer_notice_count
  from admin_security_trust_incidents i
  where i.customer_notice_required is true
    and i.status not in ('resolved', 'closed', 'false_positive', 'archived')
    and not exists (
      select 1 from admin_security_trust_incident_customer_notices n
      where n.incident_id = i.id and n.status in ('approved', 'published', 'sent')
    )
    and (p_private_room_id is null or i.private_room_id = p_private_room_id)
    and (p_customer_name is null or i.customer_name = p_customer_name);

  select count(*) into v_expiring_link_count_7d
  from admin_security_proof_verification_links l
  where l.status = 'active'
    and l.expires_at is not null
    and l.expires_at > now()
    and l.expires_at <= now() + interval '7 days'
    and (p_private_room_id is null or l.private_room_id = p_private_room_id)
    and (p_customer_name is null or l.customer_name = p_customer_name);

  select count(*) into v_broken_crypto_count
  from admin_security_trust_incidents i
  where i.status in ('open', 'acknowledged', 'investigating', 'escalated', 'mitigating')
    and i.incident_type in ('broken_timeline_chain', 'invalid_merkle_root', 'anchor_failure')
    and (p_private_room_id is null or i.private_room_id = p_private_room_id)
    and (p_customer_name is null or i.customer_name = p_customer_name);

  select
    coalesce((select count(*) from admin_security_trust_proof_report_jobs
      where status = 'failed' and created_at >= now() - interval '1 hour'), 0)
    +
    coalesce((select count(*) from admin_security_proof_qr_code_jobs
      where status = 'failed' and created_at >= now() - interval '1 hour'), 0)
  into v_failed_job_count_1h;

  select count(*) into v_pending_digest_count
  from admin_security_proof_digest_runs
  where status = 'ready' and delivery_status = 'queued';

  select count(*) into v_abnormal_download_signal_count_24h
  from admin_security_proof_health_signals
  where signal_type = 'download_activity_spike'
    and observed_at >= now() - interval '24 hours'
    and status = 'active';

  v_proof_object_count :=
    v_ready_report_count
    + coalesce((select count(*) from admin_security_answer_receipts), 0)
    + coalesce((select count(*) from admin_security_answer_receipt_export_bundles), 0)
    + coalesce((select count(*) from admin_security_proof_verification_links), 0)
    + coalesce((select count(*) from admin_security_proof_qr_codes), 0);

  v_health := calculate_admin_security_proof_health_status(
    v_critical_incident_count,
    v_active_incident_count,
    v_hash_mismatch_count_24h,
    v_failed_verification_count_24h,
    v_broken_crypto_count,
    v_unassigned_incident_count,
    v_missing_customer_notice_count,
    v_failed_job_count_1h
  );

  v_payload := jsonb_build_object(
    'schemaVersion', 'proof-observability-snapshot-v1',
    'snapshotScope', p_snapshot_scope,
    'customerName', p_customer_name,
    'customerDomain', p_customer_domain,
    'privateRoomId', p_private_room_id,
    'generatedAt', now(),
    'health', v_health,
    'counts', jsonb_build_object(
      'proofObjectCount', v_proof_object_count,
      'activeRoomCount', v_active_room_count,
      'readyReportCount', v_ready_report_count,
      'verificationCount24h', v_verification_count_24h,
      'failedVerificationCount24h', v_failed_verification_count_24h,
      'hashMismatchCount24h', v_hash_mismatch_count_24h,
      'activeIncidentCount', v_active_incident_count,
      'criticalIncidentCount', v_critical_incident_count,
      'unassignedIncidentCount', v_unassigned_incident_count,
      'missingCustomerNoticeCount', v_missing_customer_notice_count,
      'expiringLinkCount7d', v_expiring_link_count_7d,
      'brokenCryptoCount', v_broken_crypto_count,
      'failedJobCount1h', v_failed_job_count_1h,
      'pendingDigestCount', v_pending_digest_count,
      'abnormalDownloadSignalCount24h', v_abnormal_download_signal_count_24h
    )
  );

  v_hash := encode(digest(v_payload::text, 'sha256'), 'hex');
  v_bytes := length(v_payload::text::bytea);

  insert into admin_security_proof_observability_snapshots (
    snapshot_key, status, snapshot_scope, customer_name, customer_domain,
    private_room_id, auditor_portal_id, enterprise_review_room_id,
    health_status, health_score, proof_object_count, active_room_count, ready_report_count,
    verification_count_24h, failed_verification_count_24h, hash_mismatch_count_24h,
    active_incident_count, critical_incident_count, unassigned_incident_count,
    missing_customer_notice_count, expiring_link_count_7d, broken_crypto_count,
    failed_job_count_1h, pending_digest_count, abnormal_download_signal_count_24h,
    snapshot_payload, snapshot_hash_sha256, payload_bytes, request_id, metadata
  )
  values (
    v_snapshot_key, 'ready', p_snapshot_scope, p_customer_name, p_customer_domain,
    p_private_room_id, p_auditor_portal_id, p_enterprise_review_room_id,
    v_health->>'healthStatus', (v_health->>'healthScore')::numeric,
    v_proof_object_count, v_active_room_count, v_ready_report_count,
    v_verification_count_24h, v_failed_verification_count_24h, v_hash_mismatch_count_24h,
    v_active_incident_count, v_critical_incident_count, v_unassigned_incident_count,
    v_missing_customer_notice_count, v_expiring_link_count_7d, v_broken_crypto_count,
    v_failed_job_count_1h, v_pending_digest_count, v_abnormal_download_signal_count_24h,
    v_payload, v_hash, v_bytes, p_request_id, coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_snapshot_id;

  return v_snapshot_id;
end;
$$;

create or replace function refresh_admin_security_customer_trust_health(
  p_batch_size integer default 500,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_processed integer := 0;
  v_room record;
  v_health jsonb;
  v_active_incidents integer;
  v_critical_incidents integer;
  v_failed_verifications integer;
  v_hash_mismatches integer;
  v_reports integer;
  v_expiring_links integer;
  v_notices integer;
  v_missing_notices integer;
  v_last_incident timestamptz;
  v_last_report timestamptz;
  v_last_snapshot timestamptz;
begin
  if p_batch_size <= 0 or p_batch_size > 2000 then
    raise exception 'batch size must be between 1 and 2000';
  end if;

  for v_room in
    select * from admin_security_private_trust_rooms
    where status in ('ready', 'active')
    order by updated_at desc
    limit p_batch_size
  loop
    select count(*), count(*) filter (where severity = 'critical'), max(created_at)
    into v_active_incidents, v_critical_incidents, v_last_incident
    from admin_security_trust_incidents
    where private_room_id = v_room.id
      and status in ('open', 'acknowledged', 'investigating', 'escalated', 'mitigating');

    select count(*) into v_failed_verifications
    from admin_security_public_verification_results
    where created_at >= now() - interval '24 hours'
      and verification_status = 'failed';

    select count(*) into v_hash_mismatches
    from admin_security_public_verification_results
    where created_at >= now() - interval '24 hours'
      and hash_match is false;

    select count(*), max(generated_at) into v_reports, v_last_report
    from admin_security_trust_proof_reports
    where private_room_id = v_room.id and status = 'ready';

    select count(*) into v_expiring_links
    from admin_security_proof_verification_links
    where private_room_id = v_room.id
      and status = 'active'
      and expires_at is not null
      and expires_at > now()
      and expires_at <= now() + interval '7 days';

    select count(*) into v_notices
    from admin_security_trust_incident_customer_notices
    where private_room_id = v_room.id
      and status in ('approved', 'published', 'sent');

    select count(*) into v_missing_notices
    from admin_security_trust_incidents i
    where i.private_room_id = v_room.id
      and i.customer_notice_required is true
      and i.status not in ('resolved', 'closed', 'false_positive', 'archived')
      and not exists (
        select 1 from admin_security_trust_incident_customer_notices n
        where n.incident_id = i.id and n.status in ('approved', 'published', 'sent')
      );

    select max(created_at) into v_last_snapshot
    from admin_security_proof_observability_snapshots
    where private_room_id = v_room.id;

    v_health := calculate_admin_security_proof_health_status(
      coalesce(v_critical_incidents, 0),
      coalesce(v_active_incidents, 0),
      coalesce(v_hash_mismatches, 0),
      coalesce(v_failed_verifications, 0),
      0, 0,
      coalesce(v_missing_notices, 0),
      0
    );

    insert into admin_security_customer_trust_health (
      health_key, status, health_scope, customer_name, customer_domain, private_room_id,
      health_status, health_score, risk_level,
      active_incident_count, critical_incident_count,
      failed_verification_count_24h, hash_mismatch_count_24h,
      report_ready_count, expiring_link_count_7d, customer_notice_count, unresolved_notice_required_count,
      last_incident_at, last_report_at, last_snapshot_at, health_payload, metadata
    )
    values (
      'customer_trust_health:private_room:' || v_room.id::text,
      'active', 'private_room', v_room.customer_name, v_room.customer_domain, v_room.id,
      v_health->>'healthStatus', (v_health->>'healthScore')::numeric, v_health->>'riskLevel',
      coalesce(v_active_incidents, 0), coalesce(v_critical_incidents, 0),
      coalesce(v_failed_verifications, 0), coalesce(v_hash_mismatches, 0),
      coalesce(v_reports, 0), coalesce(v_expiring_links, 0), coalesce(v_notices, 0), coalesce(v_missing_notices, 0),
      v_last_incident, v_last_report, v_last_snapshot,
      jsonb_build_object('runId', v_run_id, 'health', v_health, 'roomKey', v_room.private_room_key),
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('worker_id', p_worker_id, 'refresh_run_id', v_run_id)
    )
    on conflict (health_key) do update set
      status = 'active',
      health_status = excluded.health_status,
      health_score = excluded.health_score,
      risk_level = excluded.risk_level,
      active_incident_count = excluded.active_incident_count,
      critical_incident_count = excluded.critical_incident_count,
      failed_verification_count_24h = excluded.failed_verification_count_24h,
      hash_mismatch_count_24h = excluded.hash_mismatch_count_24h,
      report_ready_count = excluded.report_ready_count,
      expiring_link_count_7d = excluded.expiring_link_count_7d,
      customer_notice_count = excluded.customer_notice_count,
      unresolved_notice_required_count = excluded.unresolved_notice_required_count,
      last_incident_at = excluded.last_incident_at,
      last_report_at = excluded.last_report_at,
      last_snapshot_at = excluded.last_snapshot_at,
      health_payload = excluded.health_payload,
      metadata = admin_security_customer_trust_health.metadata || excluded.metadata,
      updated_at = now();

    if (v_health->>'healthStatus') in ('degraded', 'critical') then
      perform record_admin_security_proof_health_signal(
        'private_room', 'customer_health_degraded',
        case when (v_health->>'healthStatus') = 'critical' then 'critical' else 'warning' end,
        'Customer trust health degraded',
        'Trust health is ' || (v_health->>'healthStatus') || ' for this private room.',
        v_room.customer_name, v_room.customer_domain, v_room.id, null, null,
        'admin_security_customer_trust_health', null,
        'customer_trust_health:private_room:' || v_room.id::text,
        'health_score', (v_health->>'healthScore')::numeric, null, null, now(),
        'customer_health_degraded:' || v_room.id::text || ':' || date_trunc('hour', now())::text,
        null, jsonb_build_object('refresh_run_id', v_run_id)
      );
    end if;

    v_processed := v_processed + 1;
  end loop;

  return jsonb_build_object('runId', v_run_id, 'processed', v_processed);
end;
$$;

create or replace function generate_admin_security_proof_operational_health_signals(
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_count integer := 0;
  v_failed_verifications integer;
  v_hash_mismatches integer;
  v_active_incidents integer;
  v_critical_incidents integer;
  v_unassigned_incidents integer;
  v_missing_notices integer;
  v_failed_report_jobs integer;
  v_failed_qr_jobs integer;
  v_digest_backlog integer;
  v_expiring_links integer;
begin
  select count(*) into v_failed_verifications
  from admin_security_public_verification_results
  where created_at >= now() - interval '24 hours' and verification_status = 'failed';

  if v_failed_verifications > 10 then
    perform record_admin_security_proof_health_signal(
      'global_admin', 'verification_failure_rate_high', 'warning',
      'Verification failure rate is high',
      v_failed_verifications::text || ' public verifications failed in the last 24 hours.',
      null, null, null, null, null,
      'admin_security_public_verification_results', null, null,
      'failed_verifications_24h', v_failed_verifications, null, null, now(),
      'verification_failure_rate_high:' || date_trunc('hour', now())::text,
      null, jsonb_build_object('run_id', v_run_id, 'worker_id', p_worker_id)
    );
    v_count := v_count + 1;
  end if;

  select count(*) into v_hash_mismatches
  from admin_security_public_verification_results
  where created_at >= now() - interval '24 hours' and hash_match is false;

  if v_hash_mismatches > 0 then
    perform record_admin_security_proof_health_signal(
      'global_admin', 'hash_mismatch_detected', 'critical',
      'Hash mismatch detected',
      v_hash_mismatches::text || ' hash mismatch result(s) detected in the last 24 hours.',
      null, null, null, null, null,
      'admin_security_public_verification_results', null, null,
      'hash_mismatch_count_24h', v_hash_mismatches, null, null, now(),
      'hash_mismatch_detected:' || date_trunc('hour', now())::text,
      null, jsonb_build_object('run_id', v_run_id, 'worker_id', p_worker_id)
    );
    v_count := v_count + 1;
  end if;

  select count(*), count(*) filter (where severity = 'critical')
  into v_active_incidents, v_critical_incidents
  from admin_security_trust_incidents
  where status in ('open', 'acknowledged', 'investigating', 'escalated', 'mitigating');

  if v_critical_incidents > 0 then
    perform record_admin_security_proof_health_signal(
      'global_admin', 'critical_incident_open', 'critical',
      'Critical trust incident open',
      v_critical_incidents::text || ' critical trust incident(s) are active.',
      null, null, null, null, null,
      'admin_security_trust_incidents', null, null,
      'critical_incident_count', v_critical_incidents, null, null, now(),
      'critical_incident_open:' || date_trunc('hour', now())::text,
      null, jsonb_build_object('run_id', v_run_id, 'worker_id', p_worker_id)
    );
    v_count := v_count + 1;
  end if;

  if v_active_incidents > 20 then
    perform record_admin_security_proof_health_signal(
      'global_admin', 'incident_backlog_high', 'warning',
      'Trust incident backlog is high',
      v_active_incidents::text || ' trust incidents are active.',
      null, null, null, null, null,
      'admin_security_trust_incidents', null, null,
      'active_incident_count', v_active_incidents, null, null, now(),
      'incident_backlog_high:' || date_trunc('hour', now())::text,
      null, jsonb_build_object('run_id', v_run_id, 'worker_id', p_worker_id)
    );
    v_count := v_count + 1;
  end if;

  select count(*) into v_unassigned_incidents
  from admin_security_trust_incidents i
  where i.status in ('open', 'acknowledged', 'investigating', 'escalated', 'mitigating')
    and not exists (
      select 1 from admin_security_trust_incident_assignments a
      where a.incident_id = i.id and a.status = 'active'
    );

  if v_unassigned_incidents > 0 then
    perform record_admin_security_proof_health_signal(
      'global_admin', 'unassigned_incident', 'warning',
      'Active trust incidents are unassigned',
      v_unassigned_incidents::text || ' active incident(s) have no active assignment.',
      null, null, null, null, null,
      'admin_security_trust_incidents', null, null,
      'unassigned_incident_count', v_unassigned_incidents, null, null, now(),
      'unassigned_incident:' || date_trunc('hour', now())::text,
      null, jsonb_build_object('run_id', v_run_id, 'worker_id', p_worker_id)
    );
    v_count := v_count + 1;
  end if;

  select count(*) into v_missing_notices
  from admin_security_trust_incidents i
  where i.customer_notice_required is true
    and i.status not in ('resolved', 'closed', 'false_positive', 'archived')
    and not exists (
      select 1 from admin_security_trust_incident_customer_notices n
      where n.incident_id = i.id and n.status in ('approved', 'published', 'sent')
    );

  if v_missing_notices > 0 then
    perform record_admin_security_proof_health_signal(
      'global_admin', 'missing_customer_notice', 'warning',
      'Required customer notices are missing',
      v_missing_notices::text || ' incident(s) require customer notice but have no approved/published notice.',
      null, null, null, null, null,
      'admin_security_trust_incidents', null, null,
      'missing_customer_notice_count', v_missing_notices, null, null, now(),
      'missing_customer_notice:' || date_trunc('hour', now())::text,
      null, jsonb_build_object('run_id', v_run_id, 'worker_id', p_worker_id)
    );
    v_count := v_count + 1;
  end if;

  select count(*) into v_failed_report_jobs
  from admin_security_trust_proof_report_jobs
  where status = 'failed' and created_at >= now() - interval '1 hour';

  if v_failed_report_jobs > 0 then
    perform record_admin_security_proof_health_signal(
      'global_admin', 'report_job_failures', 'warning',
      'Trust report jobs are failing',
      v_failed_report_jobs::text || ' report generation job(s) failed in the last hour.',
      null, null, null, null, null,
      'admin_security_trust_proof_report_jobs', null, null,
      'failed_report_jobs_1h', v_failed_report_jobs, null, null, now(),
      'report_job_failures:' || date_trunc('hour', now())::text,
      null, jsonb_build_object('run_id', v_run_id, 'worker_id', p_worker_id)
    );
    v_count := v_count + 1;
  end if;

  select count(*) into v_failed_qr_jobs
  from admin_security_proof_qr_code_jobs
  where status = 'failed' and created_at >= now() - interval '1 hour';

  if v_failed_qr_jobs > 0 then
    perform record_admin_security_proof_health_signal(
      'global_admin', 'qr_job_failures', 'warning',
      'Proof QR jobs are failing',
      v_failed_qr_jobs::text || ' QR generation job(s) failed in the last hour.',
      null, null, null, null, null,
      'admin_security_proof_qr_code_jobs', null, null,
      'failed_qr_jobs_1h', v_failed_qr_jobs, null, null, now(),
      'qr_job_failures:' || date_trunc('hour', now())::text,
      null, jsonb_build_object('run_id', v_run_id, 'worker_id', p_worker_id)
    );
    v_count := v_count + 1;
  end if;

  select count(*) into v_digest_backlog
  from admin_security_proof_digest_runs
  where status = 'ready' and delivery_status = 'queued';

  if v_digest_backlog > 50 then
    perform record_admin_security_proof_health_signal(
      'global_admin', 'digest_backlog', 'notice',
      'Proof digest delivery backlog',
      v_digest_backlog::text || ' digest(s) are queued for delivery.',
      null, null, null, null, null,
      'admin_security_proof_digest_runs', null, null,
      'queued_digest_count', v_digest_backlog, null, null, now(),
      'digest_backlog:' || date_trunc('hour', now())::text,
      null, jsonb_build_object('run_id', v_run_id, 'worker_id', p_worker_id)
    );
    v_count := v_count + 1;
  end if;

  select count(*) into v_expiring_links
  from admin_security_proof_verification_links
  where status = 'active'
    and expires_at is not null
    and expires_at > now()
    and expires_at <= now() + interval '7 days';

  if v_expiring_links > 0 then
    perform record_admin_security_proof_health_signal(
      'global_admin', 'link_expiry_risk', 'notice',
      'Proof verification links expiring soon',
      v_expiring_links::text || ' active proof verification link(s) expire in the next 7 days.',
      null, null, null, null, null,
      'admin_security_proof_verification_links', null, null,
      'expiring_link_count_7d', v_expiring_links, null, null, now(),
      'link_expiry_risk:' || date_trunc('hour', now())::text,
      null, jsonb_build_object('run_id', v_run_id, 'worker_id', p_worker_id)
    );
    v_count := v_count + 1;
  end if;

  return jsonb_build_object('runId', v_run_id, 'signalsGenerated', v_count);
end;
$$;

create or replace function process_admin_security_proof_observability_cycle(
  p_worker_id text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_snapshot_id uuid;
  v_health_result jsonb;
  v_signal_result jsonb;
begin
  perform detect_admin_security_trust_incidents(
    1000,
    p_worker_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('source', 'proof_observability_cycle')
  );

  v_signal_result := generate_admin_security_proof_operational_health_signals(
    p_worker_id, coalesce(p_metadata, '{}'::jsonb)
  );

  v_health_result := refresh_admin_security_customer_trust_health(
    500, p_worker_id, coalesce(p_metadata, '{}'::jsonb)
  );

  v_snapshot_id := build_admin_security_proof_observability_snapshot(
    'global_admin', null, null, null, null, null,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('source', 'proof_observability_cycle')
  );

  return jsonb_build_object(
    'snapshotId', v_snapshot_id,
    'signals', v_signal_result,
    'customerHealth', v_health_result
  );
end;
$$;

create or replace function expire_admin_security_proof_observability_records(
  p_batch_size integer default 5000,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
begin
  if p_batch_size <= 0 or p_batch_size > 10000 then
    raise exception 'batch size must be between 1 and 10000';
  end if;

  update admin_security_proof_observability_snapshots
  set status = 'expired'
  where id in (
    select id from admin_security_proof_observability_snapshots
    where status = 'ready' and expires_at is not null and expires_at <= now()
    order by expires_at asc
    limit p_batch_size
    for update skip locked
  );

  update admin_security_proof_health_signals
  set status = 'expired'
  where id in (
    select id from admin_security_proof_health_signals
    where status = 'active' and expires_at is not null and expires_at <= now()
    order by expires_at asc
    limit p_batch_size
    for update skip locked
  );

  return v_run_id;
end;
$$;

create or replace view admin_security_proof_command_center_latest as
select
  s.id as admin_security_proof_observability_snapshot_id,
  s.snapshot_key, s.health_status, s.health_score, s.proof_object_count, s.active_room_count, s.ready_report_count,
  s.verification_count_24h, s.failed_verification_count_24h, s.hash_mismatch_count_24h,
  s.active_incident_count, s.critical_incident_count, s.unassigned_incident_count, s.missing_customer_notice_count,
  s.expiring_link_count_7d, s.broken_crypto_count, s.failed_job_count_1h, s.pending_digest_count,
  s.abnormal_download_signal_count_24h, s.snapshot_hash_sha256, s.generated_at, s.created_at, s.snapshot_payload, s.metadata
from admin_security_proof_observability_snapshots s
where s.snapshot_scope = 'global_admin' and s.status = 'ready'
order by s.created_at desc
limit 1;

create or replace view admin_security_customer_trust_health_dashboard as
select
  h.id as admin_security_customer_trust_health_id,
  h.health_key, h.status, h.health_scope, h.customer_name, h.customer_domain, h.private_room_id,
  pr.private_room_key, h.auditor_portal_id, ap.portal_key as auditor_portal_key,
  h.enterprise_review_room_id, er.room_key as enterprise_review_room_key,
  h.health_status, h.health_score, h.risk_level,
  h.active_incident_count, h.critical_incident_count, h.failed_verification_count_24h, h.hash_mismatch_count_24h,
  h.report_ready_count, h.expiring_link_count_7d, h.customer_notice_count, h.unresolved_notice_required_count,
  h.last_incident_at, h.last_verification_at, h.last_report_at, h.last_snapshot_at,
  h.created_at, h.updated_at, h.health_payload, h.metadata
from admin_security_customer_trust_health h
left join admin_security_private_trust_rooms pr on pr.id = h.private_room_id
left join admin_security_auditor_portals ap on ap.id = h.auditor_portal_id
left join admin_security_enterprise_review_rooms er on er.id = h.enterprise_review_room_id
order by
  case h.health_status when 'critical' then 1 when 'degraded' then 2 when 'watch' then 3 else 4 end,
  h.health_score asc, h.updated_at desc;

create or replace view admin_security_proof_health_signal_dashboard as
select
  s.id as admin_security_proof_health_signal_id,
  s.signal_key, s.status, s.signal_scope, s.signal_type, s.severity, s.title, s.summary,
  s.customer_name, s.customer_domain, s.private_room_id, pr.private_room_key,
  s.auditor_portal_id, ap.portal_key as auditor_portal_key,
  s.enterprise_review_room_id, er.room_key as enterprise_review_room_key,
  s.source_type, s.source_id, s.source_key, s.metric_name, s.metric_value, s.proof_type, s.proof_key,
  s.observed_at, s.expires_at, s.created_at, s.metadata
from admin_security_proof_health_signals s
left join admin_security_private_trust_rooms pr on pr.id = s.private_room_id
left join admin_security_auditor_portals ap on ap.id = s.auditor_portal_id
left join admin_security_enterprise_review_rooms er on er.id = s.enterprise_review_room_id
order by
  case s.severity when 'critical' then 1 when 'warning' then 2 when 'notice' then 3 else 4 end,
  s.observed_at desc;

create or replace view admin_security_proof_command_center_queues as
select
  (select count(*) from admin_security_trust_incidents
    where status in ('open', 'acknowledged', 'investigating', 'escalated', 'mitigating')) as active_incidents,
  (select count(*) from admin_security_trust_incidents
    where status in ('open', 'acknowledged', 'investigating', 'escalated', 'mitigating') and severity = 'critical') as critical_incidents,
  (select count(*) from admin_security_trust_incidents i
    where i.status in ('open', 'acknowledged', 'investigating', 'escalated', 'mitigating')
      and not exists (
        select 1 from admin_security_trust_incident_assignments a
        where a.incident_id = i.id and a.status = 'active'
      )) as unassigned_incidents,
  (select count(*) from admin_security_trust_incidents
    where status = 'open' and severity in ('high', 'critical') and created_at <= now() - interval '60 minutes') as overdue_high_incidents,
  (select count(*) from admin_security_trust_incidents i
    where i.customer_notice_required is true
      and i.status not in ('resolved', 'closed', 'false_positive', 'archived')
      and not exists (
        select 1 from admin_security_trust_incident_customer_notices n
        where n.incident_id = i.id and n.status in ('approved', 'published', 'sent')
      )) as missing_customer_notices,
  (select count(*) from admin_security_proof_digest_runs where status = 'ready' and delivery_status = 'queued') as queued_digests,
  (select count(*) from admin_security_trust_proof_report_jobs
    where status = 'failed' and created_at >= now() - interval '1 hour') as failed_report_jobs_1h,
  (select count(*) from admin_security_proof_qr_code_jobs
    where status = 'failed' and created_at >= now() - interval '1 hour') as failed_qr_jobs_1h,
  (select count(*) from admin_security_proof_verification_links
    where status = 'active' and expires_at is not null and expires_at <= now() + interval '7 days' and expires_at > now()) as expiring_links_7d,
  now() as checked_at;

create or replace view admin_security_proof_command_center_recent_activity as
select * from (
  select
    'incident'::text as activity_type, i.created_at as activity_time, i.severity, i.status, i.title, i.summary,
    i.customer_name, i.customer_domain, i.private_room_id, i.incident_key as activity_key,
    i.incident_type as activity_subtype, i.id as source_id, 'admin_security_trust_incident'::text as source_type
  from admin_security_trust_incidents i
  union all
  select
    'verification'::text, r.created_at,
    case when r.hash_match is false or r.signature_match is false then 'critical'
         when r.verified is false then 'warning' else 'info' end,
    r.verification_status, 'Public verification ' || r.verification_status, r.failure_reason,
    null::text, null::text, null::uuid, r.result_key, r.verification_type,
    r.admin_security_public_verification_result_id, 'admin_security_public_verification_result'::text
  from admin_security_public_verification_result_dashboard r
  union all
  select
    'report'::text, r.created_at,
    case when r.status = 'failed' then 'warning' else 'info' end,
    r.status, r.title, r.executive_summary, r.customer_name, r.customer_domain, r.private_room_id,
    r.report_key, r.report_type, r.admin_security_trust_proof_report_id, 'admin_security_trust_proof_report'::text
  from admin_security_trust_proof_report_dashboard r
  union all
  select
    'health_signal'::text, s.observed_at, s.severity, s.status, s.title, s.summary,
    s.customer_name, s.customer_domain, s.private_room_id, s.signal_key, s.signal_type,
    s.admin_security_proof_health_signal_id, 'admin_security_proof_health_signal'::text
  from admin_security_proof_health_signal_dashboard s
) a
order by activity_time desc
limit 200;

create or replace view admin_security_proof_observability_integrity as
select
  (select count(*) from admin_security_proof_observability_snapshots
    where snapshot_scope = 'global_admin' and status = 'ready' and created_at >= now() - interval '30 minutes') as recent_global_snapshot_count,
  (select count(*) from admin_security_customer_trust_health
    where status = 'active' and updated_at >= now() - interval '1 hour') as recently_refreshed_customer_health_count,
  (select count(*) from admin_security_proof_health_signals where status = 'active' and severity = 'critical') as active_critical_signal_count,
  (select count(*) from admin_security_customer_trust_health where status = 'active' and health_status = 'critical') as critical_customer_health_count,
  (select count(*) from admin_security_customer_trust_health where status = 'active' and health_status = 'degraded') as degraded_customer_health_count,
  (select count(*) from admin_security_proof_observability_snapshots where status = 'ready' and snapshot_hash_sha256 is null) as ready_snapshot_missing_hash_count,
  now() as checked_at;

grant select on admin_security_proof_command_center_latest to admin_api_role;
grant select on admin_security_customer_trust_health_dashboard to admin_api_role;
grant select on admin_security_proof_health_signal_dashboard to admin_api_role;
grant select on admin_security_proof_command_center_queues to admin_api_role;
grant select on admin_security_proof_command_center_recent_activity to admin_api_role;
grant select on admin_security_proof_observability_integrity to admin_api_role;

insert into scheduled_jobs (
  job_key, job_name, job_group, enabled, schedule_cron, function_name, function_args,
  max_runtime_seconds, lock_ttl_seconds, metadata
)
values
  (
    'admin_security_proof_observability_cycle_every_5m',
    'Process proof observability cycle',
    'admin',
    true,
    '*/5 * * * *',
    'process_admin_security_proof_observability_cycle',
    '{}'::jsonb,
    300,
    600,
    '{"priority": "high"}'::jsonb
  ),
  (
    'admin_security_proof_observability_expiry_daily',
    'Expire proof observability records',
    'admin',
    true,
    '35 3 * * *',
    'expire_admin_security_proof_observability_records',
    '{"batch_size": 5000}'::jsonb,
    180,
    300,
    '{"priority": "low"}'::jsonb
  )
on conflict (job_key) do update set
  enabled = excluded.enabled,
  schedule_cron = excluded.schedule_cron,
  function_name = excluded.function_name,
  function_args = excluded.function_args,
  max_runtime_seconds = excluded.max_runtime_seconds,
  lock_ttl_seconds = excluded.lock_ttl_seconds,
  metadata = scheduled_jobs.metadata || excluded.metadata,
  updated_at = now();

insert into error_catalog (
  error_code, category, severity, http_status, retryable, user_visible,
  user_message, internal_message, owner_team
)
values
  (
    'PROOF_OBSERVABILITY_REQUIRED_FIELDS',
    'validation',
    'medium',
    400,
    false,
    true,
    'Proof observability request requires complete fields.',
    'Proof observability required fields missing.',
    'platform'
  ),
  (
    'PROOF_OBSERVABILITY_INVALID_STATE',
    'validation',
    'medium',
    409,
    true,
    true,
    'Proof observability record is not in a valid state.',
    'Proof observability invalid state.',
    'platform'
  )
on conflict (error_code) do update set
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
  ('proof health signal title is required', 'PROOF_OBSERVABILITY_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('batch size must be between 1 and 2000', 'PROOF_OBSERVABILITY_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('batch size must be between 1 and 10000', 'PROOF_OBSERVABILITY_REQUIRED_FIELDS', 5, '{}'::jsonb)
on conflict do nothing;

alter table admin_security_proof_observability_snapshots enable row level security;
alter table admin_security_customer_trust_health enable row level security;
alter table admin_security_proof_health_signals enable row level security;

create policy admin_security_proof_observability_snapshots_no_user_direct_access
on admin_security_proof_observability_snapshots for all to authenticated using (false) with check (false);

create policy admin_security_customer_trust_health_no_user_direct_access
on admin_security_customer_trust_health for all to authenticated using (false) with check (false);

create policy admin_security_proof_health_signals_no_user_direct_access
on admin_security_proof_health_signals for all to authenticated using (false) with check (false);

create policy admin_api_all_proof_observability_snapshots
on admin_security_proof_observability_snapshots for all to admin_api_role using (true) with check (true);

create policy admin_api_all_customer_trust_health
on admin_security_customer_trust_health for all to admin_api_role using (true) with check (true);

create policy admin_api_all_proof_health_signals
on admin_security_proof_health_signals for all to admin_api_role using (true) with check (true);

create policy worker_all_proof_observability_snapshots
on admin_security_proof_observability_snapshots for all to worker_role using (true) with check (true);

create policy worker_all_customer_trust_health
on admin_security_customer_trust_health for all to worker_role using (true) with check (true);

create policy worker_all_proof_health_signals
on admin_security_proof_health_signals for all to worker_role using (true) with check (true);

grant execute on function record_admin_security_proof_health_signal(
  text, text, text, text, text, text, text, uuid, uuid, uuid, text, uuid, text, text, numeric, text, text, timestamptz, text, text, jsonb
) to admin_api_role, worker_role;

grant execute on function calculate_admin_security_proof_health_status(
  integer, integer, integer, integer, integer, integer, integer, integer
) to admin_api_role, worker_role;

grant execute on function build_admin_security_proof_observability_snapshot(
  text, text, text, uuid, uuid, uuid, text, jsonb
) to admin_api_role, worker_role;

grant execute on function refresh_admin_security_customer_trust_health(integer, text, jsonb)
  to admin_api_role, worker_role;

grant execute on function generate_admin_security_proof_operational_health_signals(text, jsonb)
  to admin_api_role, worker_role;

grant execute on function process_admin_security_proof_observability_cycle(text, text, jsonb)
  to admin_api_role, worker_role;

grant execute on function expire_admin_security_proof_observability_records(integer, text, jsonb)
  to admin_api_role, worker_role;

alter function record_admin_security_proof_health_signal(
  text, text, text, text, text, text, text, uuid, uuid, uuid, text, uuid, text, text, numeric, text, text, timestamptz, text, text, jsonb
) security definer;
alter function record_admin_security_proof_health_signal(
  text, text, text, text, text, text, text, uuid, uuid, uuid, text, uuid, text, text, numeric, text, text, timestamptz, text, text, jsonb
) set search_path = public;

alter function calculate_admin_security_proof_health_status(integer, integer, integer, integer, integer, integer, integer, integer)
  security definer;
alter function calculate_admin_security_proof_health_status(integer, integer, integer, integer, integer, integer, integer, integer)
  set search_path = public;

alter function build_admin_security_proof_observability_snapshot(text, text, text, uuid, uuid, uuid, text, jsonb)
  security definer;
alter function build_admin_security_proof_observability_snapshot(text, text, text, uuid, uuid, uuid, text, jsonb)
  set search_path = public;

alter function refresh_admin_security_customer_trust_health(integer, text, jsonb) security definer;
alter function refresh_admin_security_customer_trust_health(integer, text, jsonb) set search_path = public;

alter function generate_admin_security_proof_operational_health_signals(text, jsonb) security definer;
alter function generate_admin_security_proof_operational_health_signals(text, jsonb) set search_path = public;

alter function process_admin_security_proof_observability_cycle(text, text, jsonb) security definer;
alter function process_admin_security_proof_observability_cycle(text, text, jsonb) set search_path = public;

alter function expire_admin_security_proof_observability_records(integer, text, jsonb) security definer;
alter function expire_admin_security_proof_observability_records(integer, text, jsonb) set search_path = public;
