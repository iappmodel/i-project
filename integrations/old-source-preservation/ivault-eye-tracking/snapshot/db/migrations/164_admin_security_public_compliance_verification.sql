-- Step 9.49 — Build public verification endpoint.
-- Runs after 163_admin_security_signed_compliance_reports.sql.

create table if not exists admin_security_compliance_report_verification_attempts (
  id uuid primary key default gen_random_uuid(),

  report_key text,
  checksum_sha256 text,
  signature text,
  period_seal_checksum_sha256 text,

  verification_status text not null,

  report_found boolean not null default false,
  checksum_match boolean not null default false,
  signature_match boolean not null default false,
  period_seal_match boolean not null default false,
  report_hash_found boolean not null default false,
  period_hash_found boolean not null default false,
  report_valid_state boolean not null default false,

  failure_reason text,

  requester_ip inet,
  user_agent text,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint admin_security_compliance_report_verification_attempts_status_check
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

create index if not exists admin_security_compliance_report_verification_attempts_report_idx
on admin_security_compliance_report_verification_attempts (report_key, created_at desc);

create index if not exists admin_security_compliance_report_verification_attempts_status_idx
on admin_security_compliance_report_verification_attempts (verification_status, created_at desc);

create or replace view admin_security_compliance_report_public_verification as
select
  r.id as compliance_report_request_id,
  r.report_key,

  r.status,
  r.report_type,
  r.report_format,
  r.report_title,
  r.report_audience,

  p.period_key,
  p.period_name,
  p.audit_type,
  p.period_start,
  p.period_end,
  p.status as audit_period_status,
  p.sealed_at as audit_period_sealed_at,
  p.seal_checksum_sha256 as period_seal_checksum_sha256,

  r.checksum_sha256 as report_checksum_sha256,
  r.signature_algorithm,
  r.signing_key_version,
  r.signature,
  r.signed_at,

  r.watermark,

  r.section_count,
  r.evidence_item_count,

  r.generated_at,
  r.expires_at,
  r.created_at,

  exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_compliance_report'
      and ahc.source_id = r.id
  ) as report_hash_found,

  exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_audit_period'
      and ahc.source_id = p.id
  ) as period_hash_found

from admin_security_compliance_report_requests r
join admin_security_audit_periods p
  on p.id = r.audit_period_id
where r.status in ('ready', 'expired', 'revoked');

grant select on admin_security_compliance_report_public_verification to admin_api_role;

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
        and (
          v_report.expires_at is null
          or v_report.expires_at > now()
        );

      if v_report.status = 'revoked' then
        v_status := 'revoked';
        v_failure_reason := 'report was revoked';
      elsif v_report.status = 'expired'
        or (
          v_report.expires_at is not null
          and v_report.expires_at <= now()
        )
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
    )
  );
end;
$$;

grant execute on function verify_admin_security_compliance_report_public(
  text,
  text,
  text,
  text,
  boolean,
  inet,
  text,
  text,
  jsonb
) to admin_api_role;

alter function verify_admin_security_compliance_report_public(
  text,
  text,
  text,
  text,
  boolean,
  inet,
  text,
  text,
  jsonb
) security definer;

alter function verify_admin_security_compliance_report_public(
  text,
  text,
  text,
  text,
  boolean,
  inet,
  text,
  text,
  jsonb
) set search_path = public;

create or replace view admin_security_compliance_report_verification_integrity as
select
  (
    select count(*)
    from admin_security_compliance_report_verification_attempts
    where created_at >= now() - interval '24 hours'
  ) as verification_attempt_count_24h,

  (
    select count(*)
    from admin_security_compliance_report_verification_attempts
    where verification_status = 'verified'
      and created_at >= now() - interval '24 hours'
  ) as verified_count_24h,

  (
    select count(*)
    from admin_security_compliance_report_verification_attempts
    where verification_status = 'failed'
      and created_at >= now() - interval '24 hours'
  ) as failed_count_24h,

  (
    select count(*)
    from admin_security_compliance_report_verification_attempts
    where verification_status = 'not_found'
      and created_at >= now() - interval '24 hours'
  ) as not_found_count_24h,

  (
    select count(*)
    from admin_security_compliance_report_verification_attempts
    where verification_status in ('failed', 'not_found', 'invalid_input')
      and created_at >= now() - interval '1 hour'
  ) as suspicious_verification_count_1h,

  now() as checked_at;

grant select on admin_security_compliance_report_verification_integrity to admin_api_role;

alter table admin_security_compliance_report_verification_attempts enable row level security;

drop policy if exists admin_security_compliance_report_verification_attempts_no_user_direct_access
on admin_security_compliance_report_verification_attempts;
create policy admin_security_compliance_report_verification_attempts_no_user_direct_access
on admin_security_compliance_report_verification_attempts
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_api_read_admin_security_compliance_report_verification_attempts
on admin_security_compliance_report_verification_attempts;
create policy admin_api_read_admin_security_compliance_report_verification_attempts
on admin_security_compliance_report_verification_attempts
for select
to admin_api_role
using (true);

drop policy if exists admin_api_insert_admin_security_compliance_report_verification_attempts
on admin_security_compliance_report_verification_attempts;
create policy admin_api_insert_admin_security_compliance_report_verification_attempts
on admin_security_compliance_report_verification_attempts
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
    'PUBLIC_COMPLIANCE_VERIFICATION_FAILED',
    'validation',
    'medium',
    200,
    false,
    true,
    'Compliance report verification failed.',
    'Public compliance report verification failed.',
    'platform'
  ),
  (
    'PUBLIC_COMPLIANCE_VERIFICATION_INVALID_INPUT',
    'validation',
    'medium',
    400,
    false,
    true,
    'Invalid verification input.',
    'Public compliance verification input invalid.',
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
  ('report key is required', 'PUBLIC_COMPLIANCE_VERIFICATION_INVALID_INPUT', 5, '{}'),
  ('checksum is required', 'PUBLIC_COMPLIANCE_VERIFICATION_INVALID_INPUT', 5, '{}'),
  ('signature is required', 'PUBLIC_COMPLIANCE_VERIFICATION_INVALID_INPUT', 5, '{}'),
  ('period seal checksum is required', 'PUBLIC_COMPLIANCE_VERIFICATION_INVALID_INPUT', 5, '{}')
on conflict do nothing;
