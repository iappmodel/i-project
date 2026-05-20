-- Step 9.76 — Public verification center (minimal schema for downstream proof / digest / observability).
-- Must run before 192_admin_security_proof_qr_deeplink_system_v2.sql (FK references).

create extension if not exists pgcrypto;

create table if not exists admin_security_public_verification_submissions (
  id uuid primary key default gen_random_uuid(),
  submission_key text not null unique,
  status text not null default 'received',
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_security_public_verification_submissions_status_check
    check (status in ('received', 'processing', 'completed', 'failed', 'archived')),
  constraint admin_security_public_verification_submissions_key_check
    check (length(trim(submission_key)) > 0)
);

create index if not exists admin_security_public_verification_submissions_created_idx
  on admin_security_public_verification_submissions (created_at desc);

create table if not exists admin_security_public_verification_results (
  id uuid primary key default gen_random_uuid(),
  result_key text not null unique,
  public_verification_submission_id uuid references admin_security_public_verification_submissions(id) on delete set null,
  verification_status text not null,
  verification_type text not null default 'unknown',
  hash_match boolean,
  signature_match boolean,
  verified boolean not null default false,
  failure_reason text,
  subject_type text,
  subject_key text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_security_public_verification_results_status_check
    check (verification_status in ('pending', 'passed', 'failed', 'expired', 'suppressed')),
  constraint admin_security_public_verification_results_key_check
    check (length(trim(result_key)) > 0)
);

create index if not exists admin_security_public_verification_results_created_idx
  on admin_security_public_verification_results (created_at desc);
create index if not exists admin_security_public_verification_results_status_idx
  on admin_security_public_verification_results (verification_status, created_at desc);

create or replace view admin_security_public_verification_result_dashboard as
select
  r.id as admin_security_public_verification_result_id,
  r.result_key,
  r.verification_status,
  r.verification_type,
  r.hash_match,
  r.signature_match,
  r.verified,
  r.failure_reason,
  r.subject_type,
  r.subject_key,
  r.public_verification_submission_id,
  r.created_at,
  r.metadata
from admin_security_public_verification_results r
order by r.created_at desc;

grant select on admin_security_public_verification_result_dashboard to admin_api_role;

alter table admin_security_public_verification_submissions enable row level security;
alter table admin_security_public_verification_results enable row level security;

create policy admin_security_public_verification_submissions_no_user_direct_access
on admin_security_public_verification_submissions
for all
to authenticated
using (false)
with check (false);

create policy admin_security_public_verification_results_no_user_direct_access
on admin_security_public_verification_results
for all
to authenticated
using (false)
with check (false);

create policy admin_api_all_public_verification_submissions
on admin_security_public_verification_submissions
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_public_verification_results
on admin_security_public_verification_results
for all
to admin_api_role
using (true)
with check (true);

create policy worker_all_public_verification_submissions
on admin_security_public_verification_submissions
for all
to worker_role
using (true)
with check (true);

create policy worker_all_public_verification_results
on admin_security_public_verification_results
for all
to worker_role
using (true)
with check (true);
