-- Step 9.54 — Build signed questionnaire exports and customer-room publishing.
-- Runs after 168_admin_security_ai_questionnaire_drafting.sql.

alter table if exists admin_security_questionnaire_exports
add column if not exists signature_algorithm text,
add column if not exists signing_key_version text,
add column if not exists signature text,
add column if not exists signed_at timestamptz,
add column if not exists watermark text,
add column if not exists published_to_enterprise_room_at timestamptz,
add column if not exists enterprise_review_room_document_grant_id uuid
  references admin_security_enterprise_review_room_document_grants(id)
  on delete set null;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'admin_security_questionnaire_exports'
  ) then
    alter table admin_security_questionnaire_exports
    drop constraint if exists admin_security_questionnaire_exports_signature_algorithm_check;

    alter table admin_security_questionnaire_exports
    add constraint admin_security_questionnaire_exports_signature_algorithm_check
    check (
      signature_algorithm is null
      or signature_algorithm in (
        'HMAC-SHA256',
        'ED25519',
        'RSA-PSS-SHA256'
      )
    );
  end if;
end $$;

update admin_security_questionnaire_exports e
set watermark =
  'QUESTIONNAIRE_EXPORT=' || e.export_key ||
  ';PROJECT=' || p.project_key ||
  ';CUSTOMER=' || p.customer_name ||
  ';EXPORT_FORMAT=' || e.export_format
from admin_security_questionnaire_projects p
where p.id = e.questionnaire_project_id
  and e.watermark is null;

create index if not exists admin_security_questionnaire_exports_signature_idx
on admin_security_questionnaire_exports (status, signed_at desc);

create index if not exists admin_security_questionnaire_exports_room_grant_idx
on admin_security_questionnaire_exports (enterprise_review_room_document_grant_id);

create table if not exists admin_security_questionnaire_export_signing_keys (
  id uuid primary key default gen_random_uuid(),
  key_version text not null unique,
  status text not null default 'active',
  algorithm text not null default 'HMAC-SHA256',
  description text not null,
  activated_at timestamptz not null default now(),
  retired_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_questionnaire_export_signing_keys_status_check
  check (status in ('active', 'retired', 'revoked')),
  constraint admin_security_questionnaire_export_signing_keys_algorithm_check
  check (algorithm in ('HMAC-SHA256', 'ED25519', 'RSA-PSS-SHA256'))
);

create index if not exists admin_security_questionnaire_export_signing_keys_status_idx
on admin_security_questionnaire_export_signing_keys (status, activated_at desc);

drop trigger if exists admin_security_questionnaire_export_signing_keys_set_updated_at
on admin_security_questionnaire_export_signing_keys;

create trigger admin_security_questionnaire_export_signing_keys_set_updated_at
before update on admin_security_questionnaire_export_signing_keys
for each row
execute function set_updated_at();

insert into admin_security_questionnaire_export_signing_keys (
  key_version,
  status,
  algorithm,
  description,
  metadata
)
values (
  'questionnaire-export-signing-v1',
  'active',
  'HMAC-SHA256',
  'MVP questionnaire export signing key metadata. Secret material is stored outside the database.',
  '{"secret_location": "QUESTIONNAIRE_EXPORT_SIGNING_SECRET"}'::jsonb
)
on conflict (key_version)
do update set
  status = excluded.status,
  algorithm = excluded.algorithm,
  description = excluded.description,
  metadata = admin_security_questionnaire_export_signing_keys.metadata || excluded.metadata,
  updated_at = now();

create table if not exists admin_security_questionnaire_export_verification_attempts (
  id uuid primary key default gen_random_uuid(),
  export_key text,
  checksum_sha256 text,
  signature text,
  verification_status text not null,
  export_found boolean not null default false,
  checksum_match boolean not null default false,
  signature_match boolean not null default false,
  export_valid_state boolean not null default false,
  project_approved boolean not null default false,
  hash_found boolean not null default false,
  failure_reason text,
  requester_ip inet,
  user_agent text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_security_questionnaire_export_verification_attempts_status_check
  check (
    verification_status in (
      'verified',
      'failed',
      'not_found',
      'expired',
      'revoked',
      'invalid_input'
    )
  )
);

create index if not exists admin_security_questionnaire_export_verification_attempts_export_idx
on admin_security_questionnaire_export_verification_attempts (export_key, created_at desc);

create index if not exists admin_security_questionnaire_export_verification_attempts_status_idx
on admin_security_questionnaire_export_verification_attempts (verification_status, created_at desc);

create or replace view admin_security_questionnaire_export_public_verification as
select
  e.id as questionnaire_export_id,
  e.export_key,
  e.status,
  e.export_format,
  e.checksum_sha256,
  e.payload_bytes,
  e.signature_algorithm,
  e.signing_key_version,
  e.signature,
  e.signed_at,
  e.watermark,
  e.question_count,
  e.evidence_count,
  e.generated_at,
  e.expires_at,
  e.created_at,
  p.id as questionnaire_project_id,
  p.project_key,
  p.status as project_status,
  p.customer_name,
  p.customer_domain,
  p.questionnaire_title,
  p.questionnaire_type,
  p.approved_at,
  exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_questionnaire_export'
      and ahc.source_id = e.id
  ) as hash_found
from admin_security_questionnaire_exports e
join admin_security_questionnaire_projects p
  on p.id = e.questionnaire_project_id
where e.status in ('ready', 'expired', 'revoked');

grant select on admin_security_questionnaire_export_public_verification to admin_api_role;

create or replace function complete_admin_security_questionnaire_export(
  p_questionnaire_export_id uuid,
  p_storage_uri text,
  p_checksum_sha256 text,
  p_payload_bytes bigint,
  p_question_count integer,
  p_evidence_count integer,
  p_signature text default null,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_export admin_security_questionnaire_exports%rowtype;
  v_project admin_security_questionnaire_projects%rowtype;
  v_key admin_security_questionnaire_export_signing_keys%rowtype;
  v_watermark text;
begin
  if p_storage_uri is null or length(trim(p_storage_uri)) = 0 then
    raise exception 'questionnaire export storage uri is required';
  end if;

  if p_checksum_sha256 is null or length(trim(p_checksum_sha256)) = 0 then
    raise exception 'questionnaire export checksum is required';
  end if;

  if p_signature is null or length(trim(p_signature)) = 0 then
    raise exception 'questionnaire export signature is required';
  end if;

  select *
  into v_export
  from admin_security_questionnaire_exports
  where id = p_questionnaire_export_id
  for update;

  if v_export.id is null then
    raise exception 'questionnaire export not found: %', p_questionnaire_export_id;
  end if;

  if v_export.status <> 'generating' then
    raise exception 'questionnaire export cannot be completed from status: %', v_export.status;
  end if;

  select *
  into v_project
  from admin_security_questionnaire_projects
  where id = v_export.questionnaire_project_id;

  if v_project.id is null then
    raise exception 'questionnaire project not found: %', v_export.questionnaire_project_id;
  end if;

  if v_export.approved_only is true and v_project.status not in ('approved', 'exported', 'sent') then
    raise exception 'signed questionnaire export requires approved project';
  end if;

  select *
  into v_key
  from admin_security_questionnaire_export_signing_keys
  where status = 'active'
  order by activated_at desc
  limit 1;

  if v_key.id is null then
    raise exception 'active questionnaire export signing key not found';
  end if;

  v_watermark :=
    'QUESTIONNAIRE_EXPORT=' || v_export.export_key ||
    ';PROJECT=' || v_project.project_key ||
    ';CUSTOMER=' || v_project.customer_name ||
    ';FORMAT=' || v_export.export_format ||
    ';SIGNED_KEY=' || v_key.key_version;

  update admin_security_questionnaire_exports
  set
    status = 'ready',
    generated_at = now(),
    generated_by_worker_id = p_worker_id,
    storage_uri = p_storage_uri,
    checksum_sha256 = p_checksum_sha256,
    payload_bytes = p_payload_bytes,
    question_count = coalesce(p_question_count, 0),
    evidence_count = coalesce(p_evidence_count, 0),
    signature_algorithm = v_key.algorithm,
    signing_key_version = v_key.key_version,
    signature = p_signature,
    signed_at = now(),
    watermark = v_watermark,
    expires_at = now() + interval '60 days',
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = v_export.id;

  update admin_security_questionnaire_projects
  set
    status = case when status = 'approved' then 'exported' else status end,
    exported_at = now(),
    updated_at = now()
  where id = v_export.questionnaire_project_id;

  perform create_admin_security_alert(
    'admin_security_questionnaire_export_ready',
    'medium',
    null,
    v_export.requested_by_auth_user_id,
    'complete_admin_security_questionnaire_export',
    null,
    'Signed security questionnaire export is ready.',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'questionnaire_export_id',
      v_export.id,
      'export_key',
      v_export.export_key,
      'signed',
      true
    )
  );

  return v_export.id;
end;
$$;

grant execute on function complete_admin_security_questionnaire_export(
  uuid,
  text,
  text,
  bigint,
  integer,
  integer,
  text,
  text,
  jsonb
) to worker_role;

alter function complete_admin_security_questionnaire_export(
  uuid,
  text,
  text,
  bigint,
  integer,
  integer,
  text,
  text,
  jsonb
) security definer;

alter function complete_admin_security_questionnaire_export(
  uuid,
  text,
  text,
  bigint,
  integer,
  integer,
  text,
  text,
  jsonb
) set search_path = public;

create or replace function hash_admin_security_questionnaire_export(
  p_questionnaire_export_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_export admin_security_questionnaire_exports%rowtype;
  v_project admin_security_questionnaire_projects%rowtype;
  v_questions jsonb;
  v_payload jsonb;
begin
  select *
  into v_export
  from admin_security_questionnaire_exports
  where id = p_questionnaire_export_id;

  if v_export.id is null then
    raise exception 'questionnaire export not found: %', p_questionnaire_export_id;
  end if;

  select *
  into v_project
  from admin_security_questionnaire_projects
  where id = v_export.questionnaire_project_id;

  if v_project.id is null then
    raise exception 'questionnaire project not found: %', v_export.questionnaire_project_id;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'question_id', q.id,
        'question_key', q.question_key,
        'status', q.status,
        'answer_source', q.answer_source,
        'approved_at', q.approved_at,
        'evidence_count', (
          select count(*)
          from admin_security_questionnaire_question_evidence e
          where e.questionnaire_question_id = q.id
        )
      )
      order by q.question_order
    ),
    '[]'::jsonb
  )
  into v_questions
  from admin_security_questionnaire_questions q
  where q.questionnaire_project_id = v_project.id;

  v_payload := jsonb_build_object(
    'source_type', 'admin_security_questionnaire_export',
    'source_id', v_export.id,
    'export_key', v_export.export_key,
    'status', v_export.status,
    'project_id', v_project.id,
    'project_key', v_project.project_key,
    'project_status', v_project.status,
    'customer_name', v_project.customer_name,
    'questionnaire_title', v_project.questionnaire_title,
    'export_format', v_export.export_format,
    'checksum_sha256', v_export.checksum_sha256,
    'signature_algorithm', v_export.signature_algorithm,
    'signing_key_version', v_export.signing_key_version,
    'signature', v_export.signature,
    'signed_at', v_export.signed_at,
    'watermark', v_export.watermark,
    'question_count', v_export.question_count,
    'evidence_count', v_export.evidence_count,
    'questions', v_questions,
    'created_at', v_export.created_at,
    'updated_at', v_export.updated_at
  );

  return append_audit_hash_chain_entry(
    'admin_security_questionnaire_export',
    v_export.id,
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
  select 1 from audit_hash_chain_entries ahc
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
  select 1 from audit_hash_chain_entries ahc
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
    select 1 from audit_hash_chain_entries ahc
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
  select 1 from audit_hash_chain_entries ahc
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
    select 1 from audit_hash_chain_entries ahc
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
  select 1 from audit_hash_chain_entries ahc
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
    select 1 from audit_hash_chain_entries ahc
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
    select 1 from audit_hash_chain_entries ahc
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
    select 1 from audit_hash_chain_entries ahc
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
    select 1 from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_report_export'
      and ahc.source_id = r.id
  )
union all
select
  'admin_security_compliance_report'::text as source_type,
  r.id as source_id,
  r.created_at
from admin_security_compliance_report_requests r
where r.status in ('ready', 'expired', 'revoked')
  and not exists (
    select 1 from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_compliance_report'
      and ahc.source_id = r.id
  )
union all
select
  'admin_security_questionnaire_export'::text as source_type,
  e.id as source_id,
  e.created_at
from admin_security_questionnaire_exports e
where e.status in ('ready', 'expired', 'revoked')
  and e.signature is not null
  and not exists (
    select 1 from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_questionnaire_export'
      and ahc.source_id = e.id
  )
union all
select
  'admin_security_disclosure_package'::text as source_type,
  p.id as source_id,
  p.created_at
from admin_security_disclosure_packages p
where p.status in ('active', 'revoked', 'superseded')
  and not exists (
    select 1 from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_disclosure_package'
      and ahc.source_id = p.id
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
        perform hash_admin_incident_corrective_action(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'admin_security_daily_snapshot' then
        perform hash_admin_security_daily_snapshot(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'admin_security_report_export' then
        perform hash_admin_security_report_export(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'admin_security_compliance_report' then
        perform hash_admin_security_compliance_report(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'admin_security_questionnaire_export' then
        perform hash_admin_security_questionnaire_export(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      elsif v_row.source_type = 'admin_security_disclosure_package' then
        perform hash_admin_security_disclosure_package(
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

grant execute on function hash_admin_security_questionnaire_export(uuid, jsonb)
to worker_role, admin_api_role;

alter function hash_admin_security_questionnaire_export(uuid, jsonb) security definer;
alter function hash_admin_security_questionnaire_export(uuid, jsonb) set search_path = public;

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
    )
  );
end;
$$;

grant execute on function verify_admin_security_questionnaire_export_public(
  text,
  text,
  text,
  boolean,
  inet,
  text,
  text,
  jsonb
) to admin_api_role;

alter function verify_admin_security_questionnaire_export_public(
  text,
  text,
  text,
  boolean,
  inet,
  text,
  text,
  jsonb
) security definer;

alter function verify_admin_security_questionnaire_export_public(
  text,
  text,
  text,
  boolean,
  inet,
  text,
  text,
  jsonb
) set search_path = public;

create or replace function publish_admin_security_questionnaire_export_to_enterprise_room(
  p_admin_auth_user_id uuid,
  p_questionnaire_export_id uuid,
  p_enterprise_review_room_id uuid,
  p_display_title text default null,
  p_display_summary text default null,
  p_allow_download boolean default true,
  p_allow_public_verification boolean default true,
  p_access_expires_at timestamptz default null,
  p_sort_order integer default 0,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_export admin_security_questionnaire_exports%rowtype;
  v_project admin_security_questionnaire_projects%rowtype;
  v_room admin_security_enterprise_review_rooms%rowtype;
  v_grant_id uuid;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  select * into v_export
  from admin_security_questionnaire_exports
  where id = p_questionnaire_export_id
  for update;

  if v_export.id is null then
    raise exception 'questionnaire export not found: %', p_questionnaire_export_id;
  end if;

  if v_export.status <> 'ready' then
    raise exception 'only ready questionnaire exports can be published to enterprise room';
  end if;

  if v_export.signature is null or v_export.signed_at is null then
    raise exception 'cannot publish unsigned questionnaire export to enterprise room';
  end if;

  if v_export.expires_at is not null and v_export.expires_at <= now() then
    raise exception 'cannot publish expired questionnaire export to enterprise room';
  end if;

  select * into v_project
  from admin_security_questionnaire_projects
  where id = v_export.questionnaire_project_id;

  if v_project.id is null then
    raise exception 'questionnaire project not found: %', v_export.questionnaire_project_id;
  end if;

  if v_project.status not in ('approved', 'exported', 'sent') then
    raise exception 'questionnaire export publication requires approved project';
  end if;

  select * into v_room
  from admin_security_enterprise_review_rooms
  where id = p_enterprise_review_room_id
  for update;

  if v_room.id is null then
    raise exception 'enterprise review room not found: %', p_enterprise_review_room_id;
  end if;

  if v_room.status not in ('draft', 'published') then
    raise exception 'cannot publish questionnaire export to enterprise room status: %', v_room.status;
  end if;

  if v_project.customer_name <> v_room.customer_name then
    raise exception 'questionnaire customer does not match enterprise review room customer';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  insert into admin_security_enterprise_review_room_document_grants (
    review_room_id,
    status,
    document_type,
    display_title,
    display_summary,
    visibility,
    allow_download,
    allow_public_verification,
    access_starts_at,
    access_expires_at,
    sort_order,
    granted_by_auth_user_id,
    granted_by_admin_user_id,
    request_id,
    metadata
  )
  values (
    v_room.id,
    'active',
    'questionnaire_response',
    coalesce(p_display_title, v_project.questionnaire_title || ' Response'),
    coalesce(p_display_summary, 'Signed security questionnaire response for ' || v_project.customer_name || '.'),
    'room_only',
    coalesce(p_allow_download, true),
    coalesce(p_allow_public_verification, true),
    now(),
    coalesce(p_access_expires_at, least(v_room.access_expires_at, coalesce(v_export.expires_at, v_room.access_expires_at))),
    coalesce(p_sort_order, 0),
    p_admin_auth_user_id,
    v_admin.id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'questionnaire_export_id', v_export.id,
      'questionnaire_export_key', v_export.export_key,
      'questionnaire_project_id', v_project.id,
      'project_key', v_project.project_key
    )
  )
  returning id into v_grant_id;

  update admin_security_questionnaire_exports
  set
    published_to_enterprise_room_at = now(),
    enterprise_review_room_document_grant_id = v_grant_id,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'published_to_enterprise_room_id', v_room.id,
      'enterprise_review_room_document_grant_id', v_grant_id
    ),
    updated_at = now()
  where id = v_export.id;

  update admin_security_questionnaire_projects
  set
    status = case when status in ('approved', 'exported') then 'sent' else status end,
    updated_at = now()
  where id = v_project.id;

  perform create_admin_security_disclosure_package(
    p_admin_auth_user_id,
    'enterprise_room_publication',
    'high',
    'admin_security_questionnaire_export',
    v_export.id,
    'enterprise_review_room',
    v_grant_id,
    coalesce(p_display_title, v_project.questionnaire_title || ' Response'),
    coalesce(p_display_summary, 'Signed security questionnaire response for ' || v_project.customer_name || '.'),
    v_project.customer_name,
    v_project.customer_domain,
    v_room.id,
    p_request_id,
    p_metadata || jsonb_build_object(
      'enterprise_review_room_document_grant_id',
      v_grant_id,
      'enterprise_review_room_id',
      v_room.id
    )
  );

  perform record_admin_action(
    p_admin_auth_user_id,
    'publish_admin_security_questionnaire_export_to_enterprise_room',
    'admin.write',
    'admin_security_questionnaire_export',
    v_export.id,
    p_request_id,
    null,
    null,
    'allowed',
    'signed questionnaire export published to enterprise review room',
    p_metadata || jsonb_build_object(
      'questionnaire_export_id', v_export.id,
      'enterprise_review_room_id', v_room.id,
      'document_grant_id', v_grant_id
    )
  );

  return v_grant_id;
end;
$$;

grant execute on function publish_admin_security_questionnaire_export_to_enterprise_room(
  uuid,
  uuid,
  uuid,
  text,
  text,
  boolean,
  boolean,
  timestamptz,
  integer,
  text,
  jsonb
) to admin_api_role;

alter function publish_admin_security_questionnaire_export_to_enterprise_room(
  uuid,
  uuid,
  uuid,
  text,
  text,
  boolean,
  boolean,
  timestamptz,
  integer,
  text,
  jsonb
) security definer;

alter function publish_admin_security_questionnaire_export_to_enterprise_room(
  uuid,
  uuid,
  uuid,
  text,
  text,
  boolean,
  boolean,
  timestamptz,
  integer,
  text,
  jsonb
) set search_path = public;

create or replace view admin_security_enterprise_review_room_document_public as
select
  g.id as document_grant_id,
  g.review_room_id,
  r.room_key,
  g.document_type,
  g.display_title,
  g.display_summary,
  g.visibility,
  g.allow_download,
  g.allow_public_verification,
  g.compliance_report_request_id,
  cr.report_key,
  cr.report_type,
  cr.report_format,
  cr.checksum_sha256 as report_checksum_sha256,
  cr.signature_algorithm,
  cr.signing_key_version,
  cr.signature,
  cr.signed_at,
  cr.watermark as report_watermark,
  g.audit_period_export_request_id,
  ae.export_key as audit_period_export_key,
  ae.export_type as audit_period_export_type,
  ae.export_format as audit_period_export_format,
  ae.checksum_sha256 as audit_period_export_checksum_sha256,
  ae.watermark as audit_period_export_watermark,
  qe.id as questionnaire_export_id,
  qe.export_key as questionnaire_export_key,
  qe.export_format as questionnaire_export_format,
  qe.checksum_sha256 as questionnaire_export_checksum_sha256,
  qe.signature_algorithm as questionnaire_export_signature_algorithm,
  qe.signing_key_version as questionnaire_export_signing_key_version,
  qe.signature as questionnaire_export_signature,
  qe.signed_at as questionnaire_export_signed_at,
  qe.watermark as questionnaire_export_watermark,
  p.period_key,
  p.period_name,
  p.audit_type,
  p.period_start,
  p.period_end,
  p.seal_checksum_sha256 as period_seal_checksum_sha256,
  g.sort_order,
  g.access_starts_at,
  g.access_expires_at
from admin_security_enterprise_review_room_document_grants g
join admin_security_enterprise_review_rooms r
  on r.id = g.review_room_id
left join admin_security_compliance_report_requests cr
  on cr.id = g.compliance_report_request_id
left join admin_security_audit_period_export_requests ae
  on ae.id = g.audit_period_export_request_id
left join admin_security_questionnaire_exports qe
  on qe.id = nullif(g.metadata->>'questionnaire_export_id', '')::uuid
left join admin_security_audit_periods p
  on p.id = coalesce(cr.audit_period_id, ae.audit_period_id)
where g.status = 'active'
  and g.access_starts_at <= now()
  and (g.access_expires_at is null or g.access_expires_at > now())
  and r.status = 'published'
  and r.access_starts_at <= now()
  and r.access_expires_at > now()
order by g.sort_order asc, g.created_at asc;

create or replace function list_enterprise_review_room_for_participant(
  p_auth_user_id uuid,
  p_room_key text,
  p_ip_address inet default null,
  p_user_agent text default null,
  p_request_id text default null
)
returns jsonb
language plpgsql
as $$
declare
  v_participant admin_security_enterprise_review_room_participants%rowtype;
  v_room admin_security_enterprise_review_rooms%rowtype;
  v_documents jsonb;
begin
  v_participant := get_active_enterprise_review_room_participant(p_auth_user_id, p_room_key);

  select * into v_room
  from admin_security_enterprise_review_rooms
  where id = v_participant.review_room_id;

  update admin_security_enterprise_review_room_participants
  set
    last_seen_at = now(),
    updated_at = now()
  where id = v_participant.id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'documentGrantId', d.document_grant_id,
        'documentType', d.document_type,
        'displayTitle', d.display_title,
        'displaySummary', d.display_summary,
        'allowDownload', d.allow_download,
        'allowPublicVerification', d.allow_public_verification,
        'reportKey', d.report_key,
        'reportType', d.report_type,
        'reportFormat', d.report_format,
        'reportChecksumSha256', d.report_checksum_sha256,
        'signatureAlgorithm', d.signature_algorithm,
        'signingKeyVersion', d.signing_key_version,
        'signature', d.signature,
        'signedAt', d.signed_at,
        'auditPeriodExportKey', d.audit_period_export_key,
        'auditPeriodExportType', d.audit_period_export_type,
        'auditPeriodExportFormat', d.audit_period_export_format,
        'auditPeriodExportChecksumSha256', d.audit_period_export_checksum_sha256,
        'questionnaireExportId', d.questionnaire_export_id,
        'questionnaireExportKey', d.questionnaire_export_key,
        'questionnaireExportFormat', d.questionnaire_export_format,
        'questionnaireExportChecksumSha256', d.questionnaire_export_checksum_sha256,
        'questionnaireExportSignatureAlgorithm', d.questionnaire_export_signature_algorithm,
        'questionnaireExportSigningKeyVersion', d.questionnaire_export_signing_key_version,
        'questionnaireExportSignature', d.questionnaire_export_signature,
        'questionnaireExportSignedAt', d.questionnaire_export_signed_at,
        'questionnaireExportWatermark', d.questionnaire_export_watermark,
        'periodKey', d.period_key,
        'periodName', d.period_name,
        'auditType', d.audit_type,
        'periodStart', d.period_start,
        'periodEnd', d.period_end,
        'periodSealChecksumSha256', d.period_seal_checksum_sha256
      )
      order by d.sort_order
    ),
    '[]'::jsonb
  )
  into v_documents
  from admin_security_enterprise_review_room_document_public d
  where d.review_room_id = v_room.id;

  perform record_admin_security_enterprise_review_room_event(
    v_room.id,
    v_participant.id,
    p_auth_user_id,
    v_participant.email,
    'enterprise_review_room_viewed',
    'medium',
    null,
    'admin_security_enterprise_review_room',
    v_room.id,
    true,
    'review room viewed',
    p_ip_address,
    p_user_agent,
    p_request_id,
    '{}'::jsonb
  );

  return jsonb_build_object(
    'room', jsonb_build_object(
      'roomKey', v_room.room_key,
      'customerName', v_room.customer_name,
      'roomTitle', v_room.room_title,
      'roomSummary', v_room.room_summary,
      'reviewType', v_room.review_type,
      'accessStartsAt', v_room.access_starts_at,
      'accessExpiresAt', v_room.access_expires_at,
      'requireNda', v_room.require_nda
    ),
    'participant', jsonb_build_object(
      'email', v_participant.email,
      'displayName', v_participant.display_name,
      'organizationName', v_participant.organization_name,
      'participantType', v_participant.participant_type,
      'ndaStatus', v_participant.nda_status
    ),
    'documents', v_documents
  );
end;
$$;

create or replace function register_enterprise_room_questionnaire_export_download_internal(
  p_questionnaire_export_id uuid,
  p_review_room_id uuid,
  p_participant_id uuid,
  p_auth_user_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  questionnaire_export_id uuid,
  export_key text,
  storage_uri text,
  checksum_sha256 text,
  payload_bytes bigint,
  signature_algorithm text,
  signing_key_version text,
  signature text,
  watermark text,
  expires_at timestamptz
)
language plpgsql
as $$
declare
  v_export admin_security_questionnaire_exports%rowtype;
begin
  select *
  into v_export
  from admin_security_questionnaire_exports
  where id = p_questionnaire_export_id
  for update;

  if v_export.id is null then
    raise exception 'questionnaire export not found: %', p_questionnaire_export_id;
  end if;

  if v_export.status <> 'ready' then
    raise exception 'questionnaire export is not ready: %', v_export.status;
  end if;

  if v_export.signature is null then
    raise exception 'questionnaire export is unsigned';
  end if;

  if v_export.expires_at is not null and v_export.expires_at <= now() then
    raise exception 'questionnaire export has expired';
  end if;

  update admin_security_questionnaire_exports
  set
    download_count = download_count + 1,
    last_downloaded_at = now(),
    metadata = metadata || jsonb_build_object(
      'last_enterprise_room_download_request_id', p_request_id,
      'last_enterprise_room_id', p_review_room_id,
      'last_enterprise_room_participant_id', p_participant_id,
      'last_enterprise_room_download_auth_user_id', p_auth_user_id
    ),
    updated_at = now()
  where id = v_export.id;

  return query
  select
    v_export.id,
    v_export.export_key,
    v_export.storage_uri,
    v_export.checksum_sha256,
    v_export.payload_bytes,
    v_export.signature_algorithm,
    v_export.signing_key_version,
    v_export.signature,
    v_export.watermark,
    v_export.expires_at;
end;
$$;

grant execute on function register_enterprise_room_questionnaire_export_download_internal(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  jsonb
) to admin_api_role;

alter function register_enterprise_room_questionnaire_export_download_internal(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  jsonb
) security definer;

alter function register_enterprise_room_questionnaire_export_download_internal(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  jsonb
) set search_path = public;

create or replace function register_enterprise_review_room_document_download(
  p_auth_user_id uuid,
  p_room_key text,
  p_document_grant_id uuid,
  p_ip_address inet default null,
  p_user_agent text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_participant admin_security_enterprise_review_room_participants%rowtype;
  v_room admin_security_enterprise_review_rooms%rowtype;
  v_document admin_security_enterprise_review_room_document_public%rowtype;
  v_download jsonb;
begin
  v_participant := get_active_enterprise_review_room_participant(p_auth_user_id, p_room_key);

  select * into v_room
  from admin_security_enterprise_review_rooms
  where id = v_participant.review_room_id;

  select * into v_document
  from admin_security_enterprise_review_room_document_public
  where document_grant_id = p_document_grant_id
    and review_room_id = v_room.id;

  if v_document.document_grant_id is null then
    perform record_admin_security_enterprise_review_room_event(
      v_room.id, v_participant.id, p_auth_user_id, v_participant.email,
      'enterprise_review_room_document_download_denied', 'high', p_document_grant_id,
      'admin_security_enterprise_review_room_document_grant', p_document_grant_id,
      false, 'document grant not found or inactive', p_ip_address, p_user_agent,
      p_request_id, p_metadata
    );
    raise exception 'review room document grant not found';
  end if;

  if v_document.allow_download is not true or v_document.visibility = 'download_disabled' then
    perform record_admin_security_enterprise_review_room_event(
      v_room.id, v_participant.id, p_auth_user_id, v_participant.email,
      'enterprise_review_room_document_download_denied', 'high', p_document_grant_id,
      'admin_security_enterprise_review_room_document_grant', p_document_grant_id,
      false, 'document download disabled', p_ip_address, p_user_agent,
      p_request_id, p_metadata
    );
    raise exception 'review room document download disabled';
  end if;

  if v_document.compliance_report_request_id is not null then
    select to_jsonb(x) into v_download
    from register_enterprise_room_compliance_report_download_internal(
      v_document.compliance_report_request_id,
      v_room.id,
      v_participant.id,
      p_auth_user_id,
      p_request_id,
      p_metadata
    ) x;
  elsif v_document.audit_period_export_request_id is not null then
    select to_jsonb(x) into v_download
    from register_enterprise_room_audit_period_export_download_internal(
      v_document.audit_period_export_request_id,
      v_room.id,
      v_participant.id,
      p_auth_user_id,
      p_request_id,
      p_metadata
    ) x;
  elsif v_document.questionnaire_export_id is not null then
    select to_jsonb(x) into v_download
    from register_enterprise_room_questionnaire_export_download_internal(
      v_document.questionnaire_export_id,
      v_room.id,
      v_participant.id,
      p_auth_user_id,
      p_request_id,
      p_metadata
    ) x;
  else
    v_download := jsonb_build_object(
      'downloadAvailable',
      false,
      'reason',
      'manual document storage not configured'
    );
  end if;

  perform record_admin_security_enterprise_review_room_event(
    v_room.id, v_participant.id, p_auth_user_id, v_participant.email,
    'enterprise_review_room_document_downloaded', 'high', p_document_grant_id,
    'admin_security_enterprise_review_room_document_grant', p_document_grant_id,
    true, 'review room document downloaded', p_ip_address, p_user_agent,
    p_request_id, p_metadata
  );

  return jsonb_build_object(
    'documentGrantId', p_document_grant_id,
    'documentType', v_document.document_type,
    'displayTitle', v_document.display_title,
    'download', v_download
  );
end;
$$;

create or replace view admin_security_questionnaire_export_dashboard as
select
  e.id as admin_security_questionnaire_export_id,
  e.questionnaire_project_id,
  p.project_key,
  p.customer_name,
  p.questionnaire_title,
  e.export_key,
  e.status,
  e.export_format,
  e.approved_only,
  e.include_evidence,
  e.include_internal_notes,
  e.generated_at,
  e.storage_uri,
  e.checksum_sha256,
  e.payload_bytes,
  e.signature_algorithm,
  e.signing_key_version,
  e.signature,
  e.signed_at,
  e.watermark,
  e.question_count,
  e.evidence_count,
  e.expires_at,
  e.download_count,
  e.last_downloaded_at,
  e.published_to_enterprise_room_at,
  e.enterprise_review_room_document_grant_id,
  rg.review_room_id as enterprise_review_room_id,
  rr.room_key as enterprise_review_room_key,
  rr.customer_name as enterprise_review_room_customer_name,
  e.last_error,
  e.created_at,
  e.updated_at,
  e.metadata
from admin_security_questionnaire_exports e
join admin_security_questionnaire_projects p
  on p.id = e.questionnaire_project_id
left join admin_security_enterprise_review_room_document_grants rg
  on rg.id = e.enterprise_review_room_document_grant_id
left join admin_security_enterprise_review_rooms rr
  on rr.id = rg.review_room_id
order by e.created_at desc;

create or replace view admin_security_questionnaire_integrity as
select
  (select count(*) from admin_security_questionnaire_answer_library where status = 'approved') as approved_library_answer_count,
  (
    select count(*)
    from admin_security_questionnaire_answer_library a
    where a.status = 'approved'
      and a.evidence_required is true
      and not exists (
        select 1
        from admin_security_questionnaire_answer_evidence_links e
        where e.answer_library_id = a.id
          and e.status = 'active'
      )
  ) as approved_answer_missing_evidence_count,
  (
    select count(*)
    from admin_security_questionnaire_projects
    where status in ('draft', 'in_progress', 'review')
  ) as open_project_count,
  (
    select count(*)
    from admin_security_questionnaire_questions
    where status in ('unanswered', 'drafted', 'needs_review', 'rejected')
  ) as open_question_count,
  (
    select count(*)
    from admin_security_questionnaire_exports
    where status = 'failed'
  ) as failed_export_count,
  (
    select count(*)
    from admin_security_questionnaire_exports
    where status = 'ready'
      and signature is null
  ) as ready_unsigned_export_count,
  (
    select count(*)
    from admin_security_questionnaire_exports
    where status = 'ready'
      and expires_at <= now()
  ) as expired_unprocessed_export_count,
  (
    select count(*)
    from admin_security_questionnaire_exports
    where published_to_enterprise_room_at is not null
  ) as published_to_enterprise_room_export_count,
  now() as checked_at;

create or replace view admin_security_questionnaire_export_verification_integrity as
select
  (
    select count(*)
    from admin_security_questionnaire_export_verification_attempts
    where created_at >= now() - interval '24 hours'
  ) as verification_attempt_count_24h,
  (
    select count(*)
    from admin_security_questionnaire_export_verification_attempts
    where verification_status = 'verified'
      and created_at >= now() - interval '24 hours'
  ) as verified_count_24h,
  (
    select count(*)
    from admin_security_questionnaire_export_verification_attempts
    where verification_status = 'failed'
      and created_at >= now() - interval '24 hours'
  ) as failed_count_24h,
  (
    select count(*)
    from admin_security_questionnaire_export_verification_attempts
    where verification_status = 'not_found'
      and created_at >= now() - interval '24 hours'
  ) as not_found_count_24h,
  (
    select count(*)
    from admin_security_questionnaire_export_verification_attempts
    where verification_status in ('failed', 'not_found', 'invalid_input')
      and created_at >= now() - interval '1 hour'
  ) as suspicious_verification_count_1h,
  now() as checked_at;

grant select on admin_security_questionnaire_export_verification_integrity to admin_api_role;

alter table admin_security_questionnaire_export_signing_keys enable row level security;
alter table admin_security_questionnaire_export_verification_attempts enable row level security;

drop policy if exists admin_security_questionnaire_export_signing_keys_no_user_direct_access
on admin_security_questionnaire_export_signing_keys;
create policy admin_security_questionnaire_export_signing_keys_no_user_direct_access
on admin_security_questionnaire_export_signing_keys
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_questionnaire_export_verification_attempts_no_user_direct_access
on admin_security_questionnaire_export_verification_attempts;
create policy admin_security_questionnaire_export_verification_attempts_no_user_direct_access
on admin_security_questionnaire_export_verification_attempts
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_api_read_admin_security_questionnaire_export_signing_keys
on admin_security_questionnaire_export_signing_keys;
create policy admin_api_read_admin_security_questionnaire_export_signing_keys
on admin_security_questionnaire_export_signing_keys
for select
to admin_api_role
using (true);

drop policy if exists worker_read_admin_security_questionnaire_export_signing_keys
on admin_security_questionnaire_export_signing_keys;
create policy worker_read_admin_security_questionnaire_export_signing_keys
on admin_security_questionnaire_export_signing_keys
for select
to worker_role
using (true);

drop policy if exists admin_api_read_admin_security_questionnaire_export_verification_attempts
on admin_security_questionnaire_export_verification_attempts;
create policy admin_api_read_admin_security_questionnaire_export_verification_attempts
on admin_security_questionnaire_export_verification_attempts
for select
to admin_api_role
using (true);

drop policy if exists admin_api_insert_admin_security_questionnaire_export_verification_attempts
on admin_security_questionnaire_export_verification_attempts;
create policy admin_api_insert_admin_security_questionnaire_export_verification_attempts
on admin_security_questionnaire_export_verification_attempts
for insert
to admin_api_role
with check (true);

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
    'QUESTIONNAIRE_EXPORT_UNSIGNED',
    'validation',
    'critical',
    409,
    false,
    true,
    'Questionnaire export is missing signature.',
    'Ready questionnaire export is missing signature.',
    'platform'
  ),
  (
    'QUESTIONNAIRE_EXPORT_PUBLIC_VERIFICATION_FAILED',
    'validation',
    'medium',
    200,
    false,
    true,
    'Questionnaire export verification failed.',
    'Public questionnaire export verification failed.',
    'platform'
  ),
  (
    'QUESTIONNAIRE_EXPORT_PUBLISH_INVALID_STATE',
    'validation',
    'high',
    409,
    false,
    true,
    'Questionnaire export cannot be published from its current state.',
    'Questionnaire export enterprise-room publication invalid state.',
    'platform'
  ),
  (
    'QUESTIONNAIRE_EXPORT_CUSTOMER_MISMATCH',
    'validation',
    'high',
    409,
    false,
    true,
    'Questionnaire customer does not match enterprise review room customer.',
    'Questionnaire export customer mismatch during enterprise-room publish.',
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
  ('questionnaire export signature is required', 'QUESTIONNAIRE_EXPORT_UNSIGNED', 5, '{}'),
  ('questionnaire export is unsigned', 'QUESTIONNAIRE_EXPORT_UNSIGNED', 5, '{}'),
  ('cannot publish unsigned questionnaire export to enterprise room', 'QUESTIONNAIRE_EXPORT_UNSIGNED', 5, '{}'),
  ('only ready questionnaire exports can be published to enterprise room', 'QUESTIONNAIRE_EXPORT_PUBLISH_INVALID_STATE', 5, '{}'),
  ('cannot publish expired questionnaire export to enterprise room', 'QUESTIONNAIRE_EXPORT_PUBLISH_INVALID_STATE', 5, '{}'),
  ('questionnaire export publication requires approved project', 'QUESTIONNAIRE_EXPORT_PUBLISH_INVALID_STATE', 5, '{}'),
  ('cannot publish questionnaire export to enterprise room status', 'QUESTIONNAIRE_EXPORT_PUBLISH_INVALID_STATE', 5, '{}'),
  ('questionnaire customer does not match enterprise review room customer', 'QUESTIONNAIRE_EXPORT_CUSTOMER_MISMATCH', 5, '{}'),
  ('questionnaire export key is required', 'QUESTIONNAIRE_REQUIRED_FIELDS', 5, '{}'),
  ('questionnaire export checksum is required', 'QUESTIONNAIRE_REQUIRED_FIELDS', 5, '{}')
on conflict do nothing;
