-- Step 9.35 — Build retention + archival policy for admin security logs, reports, and audit records.
-- Runs after 149_admin_security_daily_snapshots_reports.sql.

create table if not exists admin_security_retention_policies (
  id uuid primary key default gen_random_uuid(),
  policy_key text not null unique,
  status text not null default 'active',
  source_type text not null,
  hot_retention_days integer not null,
  archive_after_days integer not null,
  delete_after_days integer,
  archive_required boolean not null default true,
  deletion_allowed boolean not null default false,
  immutable boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_retention_policies_status_check
  check (status in ('active', 'paused', 'archived')),
  constraint admin_security_retention_policies_days_check
  check (
    hot_retention_days >= 0
    and archive_after_days >= hot_retention_days
    and (
      delete_after_days is null
      or delete_after_days >= archive_after_days
    )
  )
);

create index if not exists admin_security_retention_policies_source_idx
on admin_security_retention_policies (source_type, status);

drop trigger if exists admin_security_retention_policies_set_updated_at
on admin_security_retention_policies;

create trigger admin_security_retention_policies_set_updated_at
before update on admin_security_retention_policies
for each row
execute function set_updated_at();

insert into admin_security_retention_policies (
  policy_key,
  source_type,
  status,
  hot_retention_days,
  archive_after_days,
  delete_after_days,
  archive_required,
  deletion_allowed,
  immutable,
  metadata
)
values
  (
    'admin_security_alert_events_retention_v1',
    'admin_security_alert_event',
    'active',
    90,
    180,
    null,
    true,
    false,
    true,
    '{"meaning": "admin security alerts are retained indefinitely after archival"}'::jsonb
  ),
  (
    'admin_incident_reviews_retention_v1',
    'admin_incident_review',
    'active',
    180,
    365,
    null,
    true,
    false,
    true,
    '{"meaning": "incident reviews are permanent security governance records"}'::jsonb
  ),
  (
    'admin_incident_corrective_actions_retention_v1',
    'admin_incident_corrective_action',
    'active',
    180,
    365,
    null,
    true,
    false,
    true,
    '{"meaning": "corrective actions are permanent repair evidence records"}'::jsonb
  ),
  (
    'admin_break_glass_requests_retention_v1',
    'admin_break_glass_request',
    'active',
    365,
    365,
    null,
    true,
    false,
    true,
    '{"meaning": "break-glass records are permanent emergency access records"}'::jsonb
  ),
  (
    'admin_session_controls_retention_v1',
    'admin_session_control',
    'active',
    90,
    180,
    1095,
    true,
    true,
    false,
    '{"meaning": "session controls may be deleted after 3 years if archived"}'::jsonb
  ),
  (
    'admin_action_risk_evaluations_retention_v1',
    'admin_action_risk_evaluation',
    'active',
    90,
    180,
    1095,
    true,
    true,
    false,
    '{"meaning": "risk evaluations may be deleted after 3 years if archived"}'::jsonb
  ),
  (
    'admin_security_daily_snapshots_retention_v1',
    'admin_security_daily_snapshot',
    'active',
    365,
    730,
    null,
    true,
    false,
    true,
    '{"meaning": "daily security snapshots retained permanently"}'::jsonb
  ),
  (
    'admin_security_report_exports_retention_v1',
    'admin_security_report_export',
    'active',
    365,
    730,
    null,
    true,
    false,
    true,
    '{"meaning": "security reports retained permanently"}'::jsonb
  ),
  (
    'audit_hash_chain_entries_retention_v1',
    'audit_hash_chain_entry',
    'active',
    365,
    365,
    null,
    true,
    false,
    true,
    '{"meaning": "audit hash chain is permanent"}'::jsonb
  ),
  (
    'admin_security_notification_deliveries_retention_v1',
    'admin_security_notification_delivery',
    'active',
    30,
    90,
    365,
    true,
    true,
    false,
    '{"meaning": "notification deliveries may be deleted after 1 year if archived"}'::jsonb
  )
on conflict (policy_key)
do update set
  hot_retention_days = excluded.hot_retention_days,
  archive_after_days = excluded.archive_after_days,
  delete_after_days = excluded.delete_after_days,
  archive_required = excluded.archive_required,
  deletion_allowed = excluded.deletion_allowed,
  immutable = excluded.immutable,
  metadata = admin_security_retention_policies.metadata || excluded.metadata,
  updated_at = now();

create table if not exists admin_security_archive_manifests (
  id uuid primary key default gen_random_uuid(),
  archive_key text not null unique,
  source_type text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  record_count bigint not null default 0,
  storage_provider text not null default 'external_archive_stub',
  storage_uri text,
  checksum_sha256 text,
  status text not null default 'created',
  created_by_auth_user_id uuid,
  created_by_admin_user_id uuid references admin_users(id),
  sealed_at timestamptz,
  verified_at timestamptz,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_archive_manifests_status_check
  check (
    status in (
      'created',
      'exported',
      'sealed',
      'verified',
      'failed'
    )
  ),
  constraint admin_security_archive_manifests_period_check
  check (period_end >= period_start)
);

create index if not exists admin_security_archive_manifests_source_idx
on admin_security_archive_manifests (source_type, period_start desc, period_end desc);

create index if not exists admin_security_archive_manifests_status_idx
on admin_security_archive_manifests (status, created_at desc);

drop trigger if exists admin_security_archive_manifests_set_updated_at
on admin_security_archive_manifests;

create trigger admin_security_archive_manifests_set_updated_at
before update on admin_security_archive_manifests
for each row
execute function set_updated_at();

create or replace view admin_security_archive_candidates as
select
  'admin_security_alert_event'::text as source_type,
  ase.id as source_id,
  ase.created_at,
  p.archive_after_days,
  p.delete_after_days,
  p.archive_required,
  p.deletion_allowed,
  p.immutable
from admin_security_alert_events ase
join admin_security_retention_policies p
  on p.source_type = 'admin_security_alert_event'
 and p.status = 'active'
where ase.created_at <= now() - make_interval(days => p.archive_after_days)
union all
select
  'admin_incident_review',
  r.id,
  r.created_at,
  p.archive_after_days,
  p.delete_after_days,
  p.archive_required,
  p.deletion_allowed,
  p.immutable
from admin_incident_reviews r
join admin_security_retention_policies p
  on p.source_type = 'admin_incident_review'
 and p.status = 'active'
where r.created_at <= now() - make_interval(days => p.archive_after_days)
union all
select
  'admin_incident_corrective_action',
  ca.id,
  ca.created_at,
  p.archive_after_days,
  p.delete_after_days,
  p.archive_required,
  p.deletion_allowed,
  p.immutable
from admin_incident_corrective_actions ca
join admin_security_retention_policies p
  on p.source_type = 'admin_incident_corrective_action'
 and p.status = 'active'
where ca.created_at <= now() - make_interval(days => p.archive_after_days)
union all
select
  'admin_break_glass_request',
  bgr.id,
  bgr.created_at,
  p.archive_after_days,
  p.delete_after_days,
  p.archive_required,
  p.deletion_allowed,
  p.immutable
from admin_break_glass_requests bgr
join admin_security_retention_policies p
  on p.source_type = 'admin_break_glass_request'
 and p.status = 'active'
where bgr.created_at <= now() - make_interval(days => p.archive_after_days)
union all
select
  'admin_session_control',
  sc.id,
  sc.created_at,
  p.archive_after_days,
  p.delete_after_days,
  p.archive_required,
  p.deletion_allowed,
  p.immutable
from admin_session_controls sc
join admin_security_retention_policies p
  on p.source_type = 'admin_session_control'
 and p.status = 'active'
where sc.created_at <= now() - make_interval(days => p.archive_after_days)
union all
select
  'admin_action_risk_evaluation',
  e.id,
  e.created_at,
  p.archive_after_days,
  p.delete_after_days,
  p.archive_required,
  p.deletion_allowed,
  p.immutable
from admin_action_risk_evaluations e
join admin_security_retention_policies p
  on p.source_type = 'admin_action_risk_evaluation'
 and p.status = 'active'
where e.created_at <= now() - make_interval(days => p.archive_after_days)
union all
select
  'admin_security_daily_snapshot',
  s.id,
  s.created_at,
  p.archive_after_days,
  p.delete_after_days,
  p.archive_required,
  p.deletion_allowed,
  p.immutable
from admin_security_daily_snapshots s
join admin_security_retention_policies p
  on p.source_type = 'admin_security_daily_snapshot'
 and p.status = 'active'
where s.created_at <= now() - make_interval(days => p.archive_after_days)
union all
select
  'admin_security_report_export',
  r.id,
  r.created_at,
  p.archive_after_days,
  p.delete_after_days,
  p.archive_required,
  p.deletion_allowed,
  p.immutable
from admin_security_report_exports r
join admin_security_retention_policies p
  on p.source_type = 'admin_security_report_export'
 and p.status = 'active'
where r.created_at <= now() - make_interval(days => p.archive_after_days)
union all
select
  'admin_security_notification_delivery',
  d.id,
  d.created_at,
  p.archive_after_days,
  p.delete_after_days,
  p.archive_required,
  p.deletion_allowed,
  p.immutable
from admin_security_notification_deliveries d
join admin_security_retention_policies p
  on p.source_type = 'admin_security_notification_delivery'
 and p.status = 'active'
where d.created_at <= now() - make_interval(days => p.archive_after_days);

grant select on admin_security_archive_candidates to admin_api_role, worker_role;

create or replace view admin_security_deletion_candidates as
select
  c.*
from admin_security_archive_candidates c
where c.deletion_allowed is true
  and c.immutable is false
  and c.delete_after_days is not null
  and c.created_at <= now() - make_interval(days => c.delete_after_days)
  and exists (
    select 1
    from admin_security_archive_manifests m
    where m.source_type = c.source_type
      and m.status in ('sealed', 'verified')
      and c.created_at between m.period_start and m.period_end
  );

grant select on admin_security_deletion_candidates to admin_api_role, worker_role;

create or replace function create_admin_security_archive_manifest(
  p_source_type text,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_storage_provider text default 'external_archive_stub',
  p_storage_uri text default null,
  p_checksum_sha256 text default null,
  p_created_by_auth_user_id uuid default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_manifest_id uuid;
  v_archive_key text;
  v_record_count bigint := 0;
begin
  if p_source_type is null or length(trim(p_source_type)) = 0 then
    raise exception 'archive source type is required';
  end if;

  if p_period_start is null or p_period_end is null then
    raise exception 'archive period is required';
  end if;

  if p_period_end < p_period_start then
    raise exception 'archive period end cannot be before start';
  end if;

  if p_created_by_auth_user_id is not null then
    if admin_has_permission(p_created_by_auth_user_id, 'admin.write') is not true then
      raise exception 'missing required permission: admin.write';
    end if;

    v_admin := get_active_admin_user(p_created_by_auth_user_id);
  end if;

  select count(*)
  into v_record_count
  from admin_security_archive_candidates c
  where c.source_type = p_source_type
    and c.created_at between p_period_start and p_period_end;

  v_archive_key :=
    p_source_type || ':' ||
    to_char(p_period_start, 'YYYYMMDDHH24MISS') || ':' ||
    to_char(p_period_end, 'YYYYMMDDHH24MISS');

  insert into admin_security_archive_manifests (
    archive_key,
    source_type,
    period_start,
    period_end,
    record_count,
    storage_provider,
    storage_uri,
    checksum_sha256,
    status,
    created_by_auth_user_id,
    created_by_admin_user_id,
    request_id,
    metadata
  )
  values (
    v_archive_key,
    p_source_type,
    p_period_start,
    p_period_end,
    v_record_count,
    p_storage_provider,
    p_storage_uri,
    p_checksum_sha256,
    case
      when p_storage_uri is not null then 'exported'
      else 'created'
    end,
    p_created_by_auth_user_id,
    v_admin.id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (archive_key)
  do update set
    record_count = excluded.record_count,
    storage_provider = excluded.storage_provider,
    storage_uri = coalesce(excluded.storage_uri, admin_security_archive_manifests.storage_uri),
    checksum_sha256 = coalesce(excluded.checksum_sha256, admin_security_archive_manifests.checksum_sha256),
    metadata = admin_security_archive_manifests.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_manifest_id;

  if p_created_by_auth_user_id is not null then
    perform record_admin_action(
      p_created_by_auth_user_id,
      'create_admin_security_archive_manifest',
      'admin.write',
      'admin_security_archive_manifest',
      v_manifest_id,
      p_request_id,
      null,
      null,
      'allowed',
      'security archive manifest created',
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'source_type',
        p_source_type,
        'record_count',
        v_record_count
      )
    );
  end if;

  return v_manifest_id;
end;
$$;

create or replace function seal_admin_security_archive_manifest(
  p_admin_auth_user_id uuid,
  p_manifest_id uuid,
  p_storage_uri text,
  p_checksum_sha256 text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_manifest_id is null then
    raise exception 'archive manifest id is required';
  end if;

  if p_storage_uri is null or length(trim(p_storage_uri)) = 0 then
    raise exception 'archive storage uri is required';
  end if;

  if p_checksum_sha256 is null or length(trim(p_checksum_sha256)) = 0 then
    raise exception 'archive checksum is required';
  end if;

  update admin_security_archive_manifests
  set
    status = 'sealed',
    storage_uri = p_storage_uri,
    checksum_sha256 = p_checksum_sha256,
    sealed_at = now(),
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'seal_request_id',
      p_request_id
    ),
    updated_at = now()
  where id = p_manifest_id;

  if not found then
    raise exception 'admin security archive manifest not found: %', p_manifest_id;
  end if;

  perform record_admin_action(
    p_admin_auth_user_id,
    'seal_admin_security_archive_manifest',
    'admin.write',
    'admin_security_archive_manifest',
    p_manifest_id,
    p_request_id,
    null,
    null,
    'allowed',
    'security archive manifest sealed',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'storage_uri_present',
      true,
      'checksum_sha256_present',
      true
    )
  );

  return p_manifest_id;
end;
$$;

create or replace function verify_admin_security_archive_manifest(
  p_admin_auth_user_id uuid,
  p_manifest_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  update admin_security_archive_manifests
  set
    status = 'verified',
    verified_at = now(),
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'verify_request_id',
      p_request_id
    ),
    updated_at = now()
  where id = p_manifest_id
    and status in ('sealed', 'exported');

  if not found then
    raise exception 'admin security archive manifest not found or not sealable: %', p_manifest_id;
  end if;

  perform record_admin_action(
    p_admin_auth_user_id,
    'verify_admin_security_archive_manifest',
    'admin.write',
    'admin_security_archive_manifest',
    p_manifest_id,
    p_request_id,
    null,
    null,
    'allowed',
    'security archive manifest verified',
    coalesce(p_metadata, '{}'::jsonb)
  );

  return p_manifest_id;
end;
$$;

create or replace view admin_security_archive_integrity as
select
  (
    select count(*)
    from admin_security_archive_candidates
  ) as archive_candidate_count,
  (
    select count(*)
    from admin_security_deletion_candidates
  ) as deletion_candidate_count,
  (
    select count(*)
    from admin_security_archive_manifests
    where status in ('created', 'exported')
  ) as unsealed_manifest_count,
  (
    select count(*)
    from admin_security_archive_manifests
    where status = 'sealed'
  ) as sealed_manifest_count,
  (
    select count(*)
    from admin_security_archive_manifests
    where status = 'verified'
  ) as verified_manifest_count,
  (
    select count(*)
    from admin_security_retention_policies
    where status = 'active'
      and immutable is true
  ) as immutable_policy_count,
  now() as checked_at;

grant select on admin_security_archive_integrity to admin_api_role, worker_role;

create or replace view admin_security_archive_manifest_dashboard as
select
  m.id as admin_security_archive_manifest_id,
  m.archive_key,
  m.source_type,
  m.period_start,
  m.period_end,
  m.record_count,
  m.storage_provider,
  m.storage_uri,
  m.checksum_sha256,
  m.status,
  m.created_by_auth_user_id,
  au.email as created_by_email,
  au.display_name as created_by_display_name,
  m.sealed_at,
  m.verified_at,
  m.created_at,
  m.updated_at,
  m.metadata
from admin_security_archive_manifests m
left join admin_users au
  on au.id = m.created_by_admin_user_id
order by m.created_at desc;

grant select on admin_security_archive_manifest_dashboard to admin_api_role;

create or replace function hash_admin_security_archive_manifest(
  p_admin_security_archive_manifest_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_manifest admin_security_archive_manifests%rowtype;
  v_payload jsonb;
begin
  select *
  into v_manifest
  from admin_security_archive_manifests
  where id = p_admin_security_archive_manifest_id;

  if v_manifest.id is null then
    raise exception 'admin security archive manifest not found: %', p_admin_security_archive_manifest_id;
  end if;

  v_payload := jsonb_build_object(
    'source_type', 'admin_security_archive_manifest',
    'source_id', v_manifest.id,
    'archive_key', v_manifest.archive_key,
    'archive_source_type', v_manifest.source_type,
    'period_start', v_manifest.period_start,
    'period_end', v_manifest.period_end,
    'record_count', v_manifest.record_count,
    'storage_provider', v_manifest.storage_provider,
    'storage_uri', v_manifest.storage_uri,
    'checksum_sha256', v_manifest.checksum_sha256,
    'status', v_manifest.status,
    'sealed_at', v_manifest.sealed_at,
    'verified_at', v_manifest.verified_at,
    'created_at', v_manifest.created_at,
    'updated_at', v_manifest.updated_at
  );

  return append_audit_hash_chain_entry(
    'admin_security_archive_manifest',
    v_manifest.id,
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

alter table admin_security_retention_policies enable row level security;
alter table admin_security_archive_manifests enable row level security;

drop policy if exists admin_security_retention_policies_no_user_direct_access
on admin_security_retention_policies;
create policy admin_security_retention_policies_no_user_direct_access
on admin_security_retention_policies
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_archive_manifests_no_user_direct_access
on admin_security_archive_manifests;
create policy admin_security_archive_manifests_no_user_direct_access
on admin_security_archive_manifests
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_api_read_admin_security_retention_policies
on admin_security_retention_policies;
create policy admin_api_read_admin_security_retention_policies
on admin_security_retention_policies
for select
to admin_api_role
using (true);

drop policy if exists admin_api_all_admin_security_archive_manifests
on admin_security_archive_manifests;
create policy admin_api_all_admin_security_archive_manifests
on admin_security_archive_manifests
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists worker_read_admin_security_retention_policies
on admin_security_retention_policies;
create policy worker_read_admin_security_retention_policies
on admin_security_retention_policies
for select
to worker_role
using (true);

drop policy if exists worker_all_admin_security_archive_manifests
on admin_security_archive_manifests;
create policy worker_all_admin_security_archive_manifests
on admin_security_archive_manifests
for all
to worker_role
using (true)
with check (true);

grant execute on function create_admin_security_archive_manifest(
  text,
  timestamptz,
  timestamptz,
  text,
  text,
  text,
  uuid,
  text,
  jsonb
) to admin_api_role, worker_role;

grant execute on function seal_admin_security_archive_manifest(
  uuid,
  uuid,
  text,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function verify_admin_security_archive_manifest(
  uuid,
  uuid,
  text,
  jsonb
) to admin_api_role;

grant execute on function hash_admin_security_archive_manifest(uuid, jsonb)
to admin_api_role, worker_role;

alter function create_admin_security_archive_manifest(
  text,
  timestamptz,
  timestamptz,
  text,
  text,
  text,
  uuid,
  text,
  jsonb
) security definer;

alter function create_admin_security_archive_manifest(
  text,
  timestamptz,
  timestamptz,
  text,
  text,
  text,
  uuid,
  text,
  jsonb
) set search_path = public;

alter function seal_admin_security_archive_manifest(
  uuid,
  uuid,
  text,
  text,
  text,
  jsonb
) security definer;

alter function seal_admin_security_archive_manifest(
  uuid,
  uuid,
  text,
  text,
  text,
  jsonb
) set search_path = public;

alter function verify_admin_security_archive_manifest(
  uuid,
  uuid,
  text,
  jsonb
) security definer;

alter function verify_admin_security_archive_manifest(
  uuid,
  uuid,
  text,
  jsonb
) set search_path = public;

alter function hash_admin_security_archive_manifest(uuid, jsonb) security definer;
alter function hash_admin_security_archive_manifest(uuid, jsonb) set search_path = public;

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
    'ADMIN_SECURITY_ARCHIVE_MANIFEST_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Security archive manifest not found.',
    'Admin security archive manifest not found.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_ARCHIVE_INVALID_PERIOD',
    'validation',
    'medium',
    400,
    false,
    true,
    'Invalid archive period.',
    'Security archive period invalid.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_ARCHIVE_REQUIRED_FIELDS',
    'validation',
    'medium',
    400,
    false,
    true,
    'Archive storage URI and checksum are required.',
    'Security archive required fields missing.',
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
  ('admin security archive manifest not found', 'ADMIN_SECURITY_ARCHIVE_MANIFEST_NOT_FOUND', 5, '{}'),
  ('archive period end cannot be before start', 'ADMIN_SECURITY_ARCHIVE_INVALID_PERIOD', 5, '{}'),
  ('archive period is required', 'ADMIN_SECURITY_ARCHIVE_INVALID_PERIOD', 5, '{}'),
  ('archive storage uri is required', 'ADMIN_SECURITY_ARCHIVE_REQUIRED_FIELDS', 5, '{}'),
  ('archive checksum is required', 'ADMIN_SECURITY_ARCHIVE_REQUIRED_FIELDS', 5, '{}')
on conflict do nothing;
