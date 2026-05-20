-- Step 9.57 — Build immutable disclosure packages.
-- Runs after 171_admin_security_disclosure_approval_workflow.sql.

create table if not exists admin_security_disclosure_packages (
  id uuid primary key default gen_random_uuid(),

  package_key text not null unique,
  status text not null default 'active',

  disclosure_type text not null,
  risk_level text not null default 'medium',

  source_type text not null,
  source_id uuid not null,

  approval_request_id uuid
    references admin_security_disclosure_approval_requests(id)
    on delete set null,

  publication_target_type text not null,
  publication_target_id uuid,

  customer_name text,
  customer_domain text,
  enterprise_review_room_id uuid
    references admin_security_enterprise_review_rooms(id)
    on delete set null,

  title text not null,
  summary text not null,

  artifact_key text,
  artifact_format text,

  checksum_sha256 text,
  signature_algorithm text,
  signing_key_version text,
  signature text,
  signed_at timestamptz,

  watermark text,

  artifact_status_at_disclosure text,
  approval_status_at_disclosure text,
  revocation_status_at_disclosure text not null default 'not_revoked',

  expires_at timestamptz,

  disclosed_at timestamptz not null default now(),

  disclosed_by_auth_user_id uuid not null,
  disclosed_by_admin_user_id uuid references admin_users(id),

  hash_chain_entry_id uuid,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint admin_security_disclosure_packages_status_check
  check (
    status in (
      'active',
      'superseded',
      'revoked',
      'archived'
    )
  ),

  constraint admin_security_disclosure_packages_type_check
  check (
    disclosure_type in (
      'trust_center_publication',
      'enterprise_room_publication',
      'questionnaire_export_publication',
      'compliance_report_publication',
      'security_notice_publication',
      'revocation_disclosure',
      'document_download_access',
      'other'
    )
  ),

  constraint admin_security_disclosure_packages_risk_check
  check (
    risk_level in (
      'low',
      'medium',
      'high',
      'critical'
    )
  ),

  constraint admin_security_disclosure_packages_target_check
  check (
    publication_target_type in (
      'trust_center',
      'enterprise_review_room',
      'public_verification',
      'customer_download',
      'security_notice',
      'revocation_registry',
      'admin_only',
      'other'
    )
  ),

  constraint admin_security_disclosure_packages_revocation_state_check
  check (
    revocation_status_at_disclosure in (
      'not_revoked',
      'revoked',
      'expired',
      'unknown'
    )
  ),

  constraint admin_security_disclosure_packages_title_check
  check (length(trim(title)) > 0),

  constraint admin_security_disclosure_packages_summary_check
  check (length(trim(summary)) > 0)
);

create index if not exists admin_security_disclosure_packages_source_idx
on admin_security_disclosure_packages (source_type, source_id, created_at desc);

create index if not exists admin_security_disclosure_packages_target_idx
on admin_security_disclosure_packages (publication_target_type, publication_target_id, created_at desc);

create index if not exists admin_security_disclosure_packages_customer_idx
on admin_security_disclosure_packages (customer_name, created_at desc);

create index if not exists admin_security_disclosure_packages_status_idx
on admin_security_disclosure_packages (status, disclosure_type, created_at desc);

create table if not exists admin_security_disclosure_package_items (
  id uuid primary key default gen_random_uuid(),

  disclosure_package_id uuid not null
    references admin_security_disclosure_packages(id)
    on delete cascade,

  item_type text not null,

  source_type text not null,
  source_id uuid,

  item_key text,
  display_title text not null,
  display_summary text not null,

  checksum_sha256 text,
  signature text,
  signed_at timestamptz,

  public_safe boolean not null default true,

  sort_order integer not null default 0,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint admin_security_disclosure_package_items_type_check
  check (
    item_type in (
      'primary_artifact',
      'approval_snapshot',
      'verification_snapshot',
      'revocation_snapshot',
      'evidence_reference',
      'room_grant_snapshot',
      'trust_center_snapshot',
      'public_metadata',
      'other'
    )
  ),

  constraint admin_security_disclosure_package_items_title_check
  check (length(trim(display_title)) > 0),

  constraint admin_security_disclosure_package_items_summary_check
  check (length(trim(display_summary)) > 0)
);

create index if not exists admin_security_disclosure_package_items_package_idx
on admin_security_disclosure_package_items (disclosure_package_id, sort_order);

create index if not exists admin_security_disclosure_package_items_source_idx
on admin_security_disclosure_package_items (source_type, source_id);

create table if not exists admin_security_disclosure_package_verification_attempts (
  id uuid primary key default gen_random_uuid(),

  package_key text,
  checksum_sha256 text,
  signature text,

  verification_status text not null,

  package_found boolean not null default false,
  checksum_match boolean not null default false,
  signature_match boolean not null default false,
  package_active boolean not null default false,
  hash_found boolean not null default false,
  source_not_revoked boolean not null default false,

  failure_reason text,

  requester_ip inet,
  user_agent text,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint admin_security_disclosure_package_verification_attempts_status_check
  check (
    verification_status in (
      'verified',
      'failed',
      'not_found',
      'revoked',
      'expired',
      'invalid_input'
    )
  )
);

create index if not exists admin_security_disclosure_package_verification_attempts_package_idx
on admin_security_disclosure_package_verification_attempts (package_key, created_at desc);

create index if not exists admin_security_disclosure_package_verification_attempts_status_idx
on admin_security_disclosure_package_verification_attempts (verification_status, created_at desc);

create or replace view admin_security_disclosure_package_public_verification as
select
  p.id as disclosure_package_id,
  p.package_key,
  p.status,
  p.disclosure_type,
  p.risk_level,
  p.source_type,
  p.source_id,
  p.publication_target_type,
  p.publication_target_id,
  p.customer_name,
  p.customer_domain,
  p.title,
  p.summary,
  p.artifact_key,
  p.artifact_format,
  p.checksum_sha256,
  p.signature_algorithm,
  p.signing_key_version,
  p.signature,
  p.signed_at,
  p.watermark,
  p.artifact_status_at_disclosure,
  p.approval_status_at_disclosure,
  p.revocation_status_at_disclosure,
  p.expires_at,
  p.disclosed_at,
  p.created_at,
  exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_disclosure_package'
      and ahc.source_id = p.id
  ) as hash_found,
  exists (
    select 1
    from admin_security_revocation_records rr
    where rr.source_type = p.source_type
      and rr.source_id = p.source_id
      and rr.status = 'active'
  ) as source_currently_revoked
from admin_security_disclosure_packages p
where p.status in ('active', 'revoked', 'superseded');

grant select on admin_security_disclosure_package_public_verification to admin_api_role;

create or replace function hash_admin_security_disclosure_package(
  p_disclosure_package_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_package admin_security_disclosure_packages%rowtype;
  v_items jsonb;
  v_payload jsonb;
begin
  select *
  into v_package
  from admin_security_disclosure_packages
  where id = p_disclosure_package_id;

  if v_package.id is null then
    raise exception 'disclosure package not found: %', p_disclosure_package_id;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'item_id', i.id,
        'item_type', i.item_type,
        'source_type', i.source_type,
        'source_id', i.source_id,
        'item_key', i.item_key,
        'display_title', i.display_title,
        'display_summary', i.display_summary,
        'checksum_sha256', i.checksum_sha256,
        'signature', i.signature,
        'signed_at', i.signed_at,
        'public_safe', i.public_safe,
        'sort_order', i.sort_order,
        'created_at', i.created_at
      )
      order by i.sort_order, i.created_at
    ),
    '[]'::jsonb
  )
  into v_items
  from admin_security_disclosure_package_items i
  where i.disclosure_package_id = v_package.id;

  v_payload := jsonb_build_object(
    'source_type', 'admin_security_disclosure_package',
    'source_id', v_package.id,
    'package_key', v_package.package_key,
    'status', v_package.status,
    'disclosure_type', v_package.disclosure_type,
    'risk_level', v_package.risk_level,
    'artifact_source_type', v_package.source_type,
    'artifact_source_id', v_package.source_id,
    'approval_request_id', v_package.approval_request_id,
    'publication_target_type', v_package.publication_target_type,
    'publication_target_id', v_package.publication_target_id,
    'customer_name', v_package.customer_name,
    'artifact_key', v_package.artifact_key,
    'artifact_format', v_package.artifact_format,
    'checksum_sha256', v_package.checksum_sha256,
    'signature_algorithm', v_package.signature_algorithm,
    'signing_key_version', v_package.signing_key_version,
    'signature', v_package.signature,
    'signed_at', v_package.signed_at,
    'watermark', v_package.watermark,
    'artifact_status_at_disclosure', v_package.artifact_status_at_disclosure,
    'approval_status_at_disclosure', v_package.approval_status_at_disclosure,
    'revocation_status_at_disclosure', v_package.revocation_status_at_disclosure,
    'expires_at', v_package.expires_at,
    'disclosed_at', v_package.disclosed_at,
    'items', v_items,
    'created_at', v_package.created_at
  );

  return append_audit_hash_chain_entry(
    'admin_security_disclosure_package',
    v_package.id,
    v_payload,
    'global_audit_chain',
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function create_admin_security_disclosure_package(
  p_admin_auth_user_id uuid,
  p_disclosure_type text,
  p_risk_level text,
  p_source_type text,
  p_source_id uuid,
  p_publication_target_type text,
  p_publication_target_id uuid default null,
  p_title text default null,
  p_summary text default null,
  p_customer_name text default null,
  p_customer_domain text default null,
  p_enterprise_review_room_id uuid default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_package_id uuid;
  v_package_key text;
  v_approval_id uuid;
  v_approval admin_security_disclosure_approval_requests%rowtype;
  v_artifact_key text;
  v_artifact_format text;
  v_checksum text;
  v_signature_algorithm text;
  v_signing_key_version text;
  v_signature text;
  v_signed_at timestamptz;
  v_watermark text;
  v_expires_at timestamptz;
  v_artifact_status text;
  v_revocation_status text := 'not_revoked';
  v_hash_entry_id uuid;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_source_id is null then
    raise exception 'disclosure package source id is required';
  end if;

  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'disclosure package title is required';
  end if;

  if p_summary is null or length(trim(p_summary)) = 0 then
    raise exception 'disclosure package summary is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  v_approval_id := require_admin_security_disclosure_approval(
    p_source_type,
    p_source_id,
    p_disclosure_type
  );

  select *
  into v_approval
  from admin_security_disclosure_approval_requests
  where id = v_approval_id;

  if p_source_type = 'admin_security_questionnaire_export' then
    select
      export_key,
      export_format,
      checksum_sha256,
      signature_algorithm,
      signing_key_version,
      signature,
      signed_at,
      watermark,
      expires_at,
      status
    into
      v_artifact_key,
      v_artifact_format,
      v_checksum,
      v_signature_algorithm,
      v_signing_key_version,
      v_signature,
      v_signed_at,
      v_watermark,
      v_expires_at,
      v_artifact_status
    from admin_security_questionnaire_exports
    where id = p_source_id;
  elsif p_source_type = 'admin_security_compliance_report' then
    select
      report_key,
      report_format,
      checksum_sha256,
      signature_algorithm,
      signing_key_version,
      signature,
      signed_at,
      watermark,
      expires_at,
      status
    into
      v_artifact_key,
      v_artifact_format,
      v_checksum,
      v_signature_algorithm,
      v_signing_key_version,
      v_signature,
      v_signed_at,
      v_watermark,
      v_expires_at,
      v_artifact_status
    from admin_security_compliance_report_requests
    where id = p_source_id;
  elsif p_source_type = 'admin_security_enterprise_review_room_document_grant' then
    select
      id::text,
      document_type,
      null,
      null,
      null,
      null,
      null,
      null,
      access_expires_at,
      status
    into
      v_artifact_key,
      v_artifact_format,
      v_checksum,
      v_signature_algorithm,
      v_signing_key_version,
      v_signature,
      v_signed_at,
      v_watermark,
      v_expires_at,
      v_artifact_status
    from admin_security_enterprise_review_room_document_grants
    where id = p_source_id;
  elsif p_source_type = 'admin_security_revocation_record' then
    select
      revocation_key,
      revocation_type,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      status
    into
      v_artifact_key,
      v_artifact_format,
      v_checksum,
      v_signature_algorithm,
      v_signing_key_version,
      v_signature,
      v_signed_at,
      v_watermark,
      v_expires_at,
      v_artifact_status
    from admin_security_revocation_records
    where id = p_source_id;
  else
    raise exception 'unsupported disclosure package source type: %', p_source_type;
  end if;

  if v_artifact_key is null then
    raise exception 'disclosure package source artifact not found';
  end if;

  if exists (
    select 1
    from admin_security_revocation_records rr
    where rr.source_type = p_source_type
      and rr.source_id = p_source_id
      and rr.status = 'active'
  ) then
    v_revocation_status := 'revoked';
  elsif v_expires_at is not null and v_expires_at <= now() then
    v_revocation_status := 'expired';
  end if;

  v_package_key :=
    'disclosure_package:' ||
    p_disclosure_type || ':' ||
    regexp_replace(coalesce(v_artifact_key, p_source_id::text), '[^a-zA-Z0-9._:-]+', '-', 'g') ||
    ':' ||
    substr(encode(gen_random_bytes(8), 'hex'), 1, 16);

  insert into admin_security_disclosure_packages (
    package_key,
    status,
    disclosure_type,
    risk_level,
    source_type,
    source_id,
    approval_request_id,
    publication_target_type,
    publication_target_id,
    customer_name,
    customer_domain,
    enterprise_review_room_id,
    title,
    summary,
    artifact_key,
    artifact_format,
    checksum_sha256,
    signature_algorithm,
    signing_key_version,
    signature,
    signed_at,
    watermark,
    artifact_status_at_disclosure,
    approval_status_at_disclosure,
    revocation_status_at_disclosure,
    expires_at,
    disclosed_by_auth_user_id,
    disclosed_by_admin_user_id,
    request_id,
    metadata
  )
  values (
    v_package_key,
    'active',
    p_disclosure_type,
    coalesce(p_risk_level, v_approval.risk_level),
    p_source_type,
    p_source_id,
    v_approval.id,
    p_publication_target_type,
    p_publication_target_id,
    p_customer_name,
    p_customer_domain,
    p_enterprise_review_room_id,
    p_title,
    p_summary,
    v_artifact_key,
    v_artifact_format,
    v_checksum,
    v_signature_algorithm,
    v_signing_key_version,
    v_signature,
    v_signed_at,
    v_watermark,
    v_artifact_status,
    v_approval.status,
    v_revocation_status,
    v_expires_at,
    p_admin_auth_user_id,
    v_admin.id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_package_id;

  insert into admin_security_disclosure_package_items (
    disclosure_package_id,
    item_type,
    source_type,
    source_id,
    item_key,
    display_title,
    display_summary,
    checksum_sha256,
    signature,
    signed_at,
    public_safe,
    sort_order,
    metadata
  )
  values
    (
      v_package_id,
      'primary_artifact',
      p_source_type,
      p_source_id,
      v_artifact_key,
      p_title,
      p_summary,
      v_checksum,
      v_signature,
      v_signed_at,
      true,
      1,
      jsonb_build_object(
        'artifact_status_at_disclosure',
        v_artifact_status,
        'watermark',
        v_watermark
      )
    ),
    (
      v_package_id,
      'approval_snapshot',
      'admin_security_disclosure_approval_request',
      v_approval.id,
      v_approval.approval_key,
      'Disclosure approval snapshot',
      'Disclosure was approved before publication.',
      null,
      null,
      v_approval.approved_at,
      true,
      2,
      jsonb_build_object(
        'approval_status',
        v_approval.status,
        'risk_level',
        v_approval.risk_level,
        'required_security_approval',
        v_approval.required_security_approval,
        'required_legal_approval',
        v_approval.required_legal_approval,
        'required_second_admin_approval',
        v_approval.required_second_admin_approval,
        'min_required_approvals',
        v_approval.min_required_approvals
      )
    ),
    (
      v_package_id,
      'revocation_snapshot',
      p_source_type,
      p_source_id,
      v_revocation_status,
      'Revocation snapshot',
      'Revocation status at disclosure time.',
      null,
      null,
      null,
      true,
      3,
      jsonb_build_object(
        'revocation_status_at_disclosure',
        v_revocation_status
      )
    );

  v_hash_entry_id := hash_admin_security_disclosure_package(
    v_package_id,
    p_metadata || jsonb_build_object('created_by_function', 'create_admin_security_disclosure_package')
  );

  update admin_security_disclosure_packages
  set hash_chain_entry_id = v_hash_entry_id
  where id = v_package_id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'create_admin_security_disclosure_package',
    'admin.write',
    'admin_security_disclosure_package',
    v_package_id,
    p_request_id,
    null,
    null,
    'allowed',
    'immutable disclosure package created',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'package_key',
      v_package_key,
      'source_type',
      p_source_type,
      'source_id',
      p_source_id,
      'approval_request_id',
      v_approval.id
    )
  );

  return v_package_id;
end;
$$;

create or replace function verify_admin_security_disclosure_package_public(
  p_package_key text,
  p_checksum_sha256 text default null,
  p_signature text default null,
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
  v_package admin_security_disclosure_package_public_verification%rowtype;
  v_package_found boolean := false;
  v_checksum_match boolean := false;
  v_signature_match boolean := false;
  v_package_active boolean := false;
  v_hash_found boolean := false;
  v_source_not_revoked boolean := false;
  v_status text := 'failed';
  v_failure_reason text;
begin
  if p_package_key is null or length(trim(p_package_key)) = 0 then
    v_status := 'invalid_input';
    v_failure_reason := 'disclosure package key is required';
  else
    select *
    into v_package
    from admin_security_disclosure_package_public_verification
    where package_key = p_package_key;

    if v_package.package_key is null then
      v_status := 'not_found';
      v_failure_reason := 'disclosure package not found';
    else
      v_package_found := true;
      v_checksum_match :=
        p_checksum_sha256 is null
        or v_package.checksum_sha256 is null
        or v_package.checksum_sha256 = p_checksum_sha256;
      v_signature_match :=
        p_signature is null
        or v_package.signature is null
        or (
          coalesce(p_signature_match, false)
          and v_package.signature = p_signature
        );
      v_package_active :=
        v_package.status = 'active'
        and (
          v_package.expires_at is null
          or v_package.expires_at > now()
        );
      v_hash_found := v_package.hash_found;
      v_source_not_revoked := v_package.source_currently_revoked is false;

      if v_package.status = 'revoked'
        or v_package.source_currently_revoked is true
      then
        v_status := 'revoked';
        v_failure_reason := 'disclosure package or source artifact is revoked';
      elsif v_package.expires_at is not null and v_package.expires_at <= now() then
        v_status := 'expired';
        v_failure_reason := 'disclosure package expired';
      elsif v_checksum_match
        and v_signature_match
        and v_package_active
        and v_hash_found
        and v_source_not_revoked
      then
        v_status := 'verified';
        v_failure_reason := null;
      else
        v_status := 'failed';
        v_failure_reason :=
          case
            when v_checksum_match is not true then 'checksum mismatch'
            when v_signature_match is not true then 'signature mismatch'
            when v_package_active is not true then 'disclosure package inactive'
            when v_hash_found is not true then 'disclosure package hash-chain entry missing'
            when v_source_not_revoked is not true then 'source artifact revoked'
            else 'verification failed'
          end;
      end if;
    end if;
  end if;

  insert into admin_security_disclosure_package_verification_attempts (
    package_key,
    checksum_sha256,
    signature,
    verification_status,
    package_found,
    checksum_match,
    signature_match,
    package_active,
    hash_found,
    source_not_revoked,
    failure_reason,
    requester_ip,
    user_agent,
    request_id,
    metadata
  )
  values (
    p_package_key,
    p_checksum_sha256,
    p_signature,
    v_status,
    v_package_found,
    v_checksum_match,
    v_signature_match,
    v_package_active,
    v_hash_found,
    v_source_not_revoked,
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
    'package', case
      when v_package_found then jsonb_build_object(
        'packageKey', v_package.package_key,
        'status', v_package.status,
        'disclosureType', v_package.disclosure_type,
        'riskLevel', v_package.risk_level,
        'publicationTargetType', v_package.publication_target_type,
        'customerName', v_package.customer_name,
        'title', v_package.title,
        'summary', v_package.summary,
        'artifactKey', v_package.artifact_key,
        'artifactFormat', v_package.artifact_format,
        'checksumSha256', v_package.checksum_sha256,
        'signatureAlgorithm', v_package.signature_algorithm,
        'signingKeyVersion', v_package.signing_key_version,
        'signature', v_package.signature,
        'signedAt', v_package.signed_at,
        'watermark', v_package.watermark,
        'artifactStatusAtDisclosure', v_package.artifact_status_at_disclosure,
        'approvalStatusAtDisclosure', v_package.approval_status_at_disclosure,
        'revocationStatusAtDisclosure', v_package.revocation_status_at_disclosure,
        'expiresAt', v_package.expires_at,
        'disclosedAt', v_package.disclosed_at
      )
      else null
    end,
    'checks', jsonb_build_object(
      'packageFound', v_package_found,
      'checksumMatch', v_checksum_match,
      'signatureMatch', v_signature_match,
      'packageActive', v_package_active,
      'hashFound', v_hash_found,
      'sourceNotRevoked', v_source_not_revoked
    )
  );
end;
$$;

create or replace view admin_security_disclosure_package_dashboard as
select
  p.id as admin_security_disclosure_package_id,
  p.package_key,
  p.status,
  p.disclosure_type,
  p.risk_level,
  p.source_type,
  p.source_id,
  p.approval_request_id,
  a.approval_key,
  a.status as approval_status,
  p.publication_target_type,
  p.publication_target_id,
  p.customer_name,
  p.customer_domain,
  p.enterprise_review_room_id,
  r.room_key as enterprise_review_room_key,
  p.title,
  p.summary,
  p.artifact_key,
  p.artifact_format,
  p.checksum_sha256,
  p.signature_algorithm,
  p.signing_key_version,
  p.signature,
  p.signed_at,
  p.watermark,
  p.artifact_status_at_disclosure,
  p.approval_status_at_disclosure,
  p.revocation_status_at_disclosure,
  p.expires_at,
  p.disclosed_at,
  p.hash_chain_entry_id,
  admin.email as disclosed_by_email,
  (
    select count(*)
    from admin_security_disclosure_package_items i
    where i.disclosure_package_id = p.id
  ) as item_count,
  p.created_at,
  p.metadata
from admin_security_disclosure_packages p
left join admin_security_disclosure_approval_requests a
  on a.id = p.approval_request_id
left join admin_security_enterprise_review_rooms r
  on r.id = p.enterprise_review_room_id
left join admin_users admin
  on admin.id = p.disclosed_by_admin_user_id
order by p.created_at desc;

create or replace view admin_security_disclosure_package_item_dashboard as
select
  i.id as admin_security_disclosure_package_item_id,
  i.disclosure_package_id,
  p.package_key,
  p.disclosure_type,
  p.customer_name,
  i.item_type,
  i.source_type,
  i.source_id,
  i.item_key,
  i.display_title,
  i.display_summary,
  i.checksum_sha256,
  i.signature,
  i.signed_at,
  i.public_safe,
  i.sort_order,
  i.created_at,
  i.metadata
from admin_security_disclosure_package_items i
join admin_security_disclosure_packages p
  on p.id = i.disclosure_package_id
order by p.created_at desc, i.sort_order asc;

create or replace view admin_security_disclosure_package_integrity as
select
  (
    select count(*)
    from admin_security_disclosure_packages
    where status = 'active'
  ) as active_package_count,
  (
    select count(*)
    from admin_security_disclosure_packages
    where status = 'active'
      and hash_chain_entry_id is null
  ) as active_package_missing_hash_count,
  (
    select count(*)
    from admin_security_disclosure_packages
    where status = 'active'
      and approval_status_at_disclosure <> 'approved'
  ) as active_package_without_approved_snapshot_count,
  (
    select count(*)
    from admin_security_disclosure_packages
    where status = 'active'
      and revocation_status_at_disclosure = 'revoked'
  ) as active_package_disclosed_after_revocation_count,
  (
    select count(*)
    from admin_security_disclosure_package_verification_attempts
    where created_at >= now() - interval '24 hours'
  ) as verification_attempt_count_24h,
  (
    select count(*)
    from admin_security_disclosure_package_verification_attempts
    where verification_status = 'verified'
      and created_at >= now() - interval '24 hours'
  ) as verified_count_24h,
  (
    select count(*)
    from admin_security_disclosure_package_verification_attempts
    where verification_status in ('failed', 'not_found', 'invalid_input')
      and created_at >= now() - interval '1 hour'
  ) as suspicious_verification_count_1h,
  now() as checked_at;

grant select on admin_security_disclosure_package_dashboard to admin_api_role;
grant select on admin_security_disclosure_package_item_dashboard to admin_api_role;
grant select on admin_security_disclosure_package_integrity to admin_api_role;

alter table admin_security_disclosure_packages enable row level security;
alter table admin_security_disclosure_package_items enable row level security;
alter table admin_security_disclosure_package_verification_attempts enable row level security;

drop policy if exists admin_security_disclosure_packages_no_user_direct_access
on admin_security_disclosure_packages;
create policy admin_security_disclosure_packages_no_user_direct_access
on admin_security_disclosure_packages
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_disclosure_package_items_no_user_direct_access
on admin_security_disclosure_package_items;
create policy admin_security_disclosure_package_items_no_user_direct_access
on admin_security_disclosure_package_items
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_disclosure_package_verification_attempts_no_user_direct_access
on admin_security_disclosure_package_verification_attempts;
create policy admin_security_disclosure_package_verification_attempts_no_user_direct_access
on admin_security_disclosure_package_verification_attempts
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_api_all_admin_security_disclosure_packages
on admin_security_disclosure_packages;
create policy admin_api_all_admin_security_disclosure_packages
on admin_security_disclosure_packages
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_disclosure_package_items
on admin_security_disclosure_package_items;
create policy admin_api_all_admin_security_disclosure_package_items
on admin_security_disclosure_package_items
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_insert_admin_security_disclosure_package_verification_attempts
on admin_security_disclosure_package_verification_attempts;
create policy admin_api_insert_admin_security_disclosure_package_verification_attempts
on admin_security_disclosure_package_verification_attempts
for insert
to admin_api_role
with check (true);

drop policy if exists admin_api_read_admin_security_disclosure_package_verification_attempts
on admin_security_disclosure_package_verification_attempts;
create policy admin_api_read_admin_security_disclosure_package_verification_attempts
on admin_security_disclosure_package_verification_attempts
for select
to admin_api_role
using (true);

grant execute on function create_admin_security_disclosure_package(
  uuid,
  text,
  text,
  text,
  uuid,
  text,
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  text,
  jsonb
) to admin_api_role;

grant execute on function hash_admin_security_disclosure_package(uuid, jsonb)
to admin_api_role, worker_role;

grant execute on function verify_admin_security_disclosure_package_public(
  text,
  text,
  text,
  boolean,
  inet,
  text,
  text,
  jsonb
) to admin_api_role;

alter function create_admin_security_disclosure_package(
  uuid,
  text,
  text,
  text,
  uuid,
  text,
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  text,
  jsonb
) security definer;

alter function create_admin_security_disclosure_package(
  uuid,
  text,
  text,
  text,
  uuid,
  text,
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  text,
  jsonb
) set search_path = public;

alter function hash_admin_security_disclosure_package(uuid, jsonb) security definer;
alter function hash_admin_security_disclosure_package(uuid, jsonb) set search_path = public;

alter function verify_admin_security_disclosure_package_public(
  text,
  text,
  text,
  boolean,
  inet,
  text,
  text,
  jsonb
) security definer;

alter function verify_admin_security_disclosure_package_public(
  text,
  text,
  text,
  boolean,
  inet,
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
    'DISCLOSURE_PACKAGE_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Disclosure package not found.',
    'Disclosure package not found.',
    'platform'
  ),
  (
    'DISCLOSURE_PACKAGE_REQUIRED_FIELDS',
    'validation',
    'medium',
    400,
    false,
    true,
    'Disclosure package requires complete fields.',
    'Disclosure package required fields missing.',
    'platform'
  ),
  (
    'DISCLOSURE_PACKAGE_INVALID_SOURCE',
    'validation',
    'high',
    409,
    false,
    true,
    'Disclosure package source is invalid.',
    'Disclosure package source invalid or unsupported.',
    'platform'
  ),
  (
    'DISCLOSURE_PACKAGE_VERIFICATION_FAILED',
    'validation',
    'medium',
    200,
    false,
    true,
    'Disclosure package verification failed.',
    'Public disclosure package verification failed.',
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
  ('disclosure package not found', 'DISCLOSURE_PACKAGE_NOT_FOUND', 5, '{}'),
  ('disclosure package source id is required', 'DISCLOSURE_PACKAGE_REQUIRED_FIELDS', 5, '{}'),
  ('disclosure package title is required', 'DISCLOSURE_PACKAGE_REQUIRED_FIELDS', 5, '{}'),
  ('disclosure package summary is required', 'DISCLOSURE_PACKAGE_REQUIRED_FIELDS', 5, '{}'),
  ('disclosure package key is required', 'DISCLOSURE_PACKAGE_REQUIRED_FIELDS', 5, '{}'),
  ('unsupported disclosure package source type', 'DISCLOSURE_PACKAGE_INVALID_SOURCE', 5, '{}'),
  ('disclosure package source artifact not found', 'DISCLOSURE_PACKAGE_INVALID_SOURCE', 5, '{}')
on conflict do nothing;
