-- Verification, fraud, POPS, disputes, trust (server-sealed outcomes)

create table if not exists public.verification_records (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null,
  subject_id uuid not null,
  status text not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists verification_records_subject_idx on public.verification_records (subject_type, subject_id);

create table if not exists public.verification_gate_results (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null references public.verification_records (id) on delete cascade,
  gate text not null,
  passed boolean not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.fraud_assessments (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null,
  subject_id uuid not null,
  status text not null default 'pending',
  score numeric,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fraud_assessments_subject_idx on public.fraud_assessments (subject_type, subject_id);

create table if not exists public.fraud_signals (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.fraud_assessments (id) on delete cascade,
  signal_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.pops_challenges (
  id uuid primary key default gen_random_uuid(),
  subject_user_id uuid not null,
  status text not null default 'issued',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  opener_user_id uuid not null,
  subject_type text not null,
  subject_id uuid not null,
  status text not null default 'open',
  resolution text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists disputes_opener_idx on public.disputes (opener_user_id);

create table if not exists public.dispute_evidence (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.disputes (id) on delete cascade,
  submitted_by uuid not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists dispute_evidence_dispute_idx on public.dispute_evidence (dispute_id);

create table if not exists public.trust_impacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  source_type text not null,
  source_id uuid,
  delta int not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists trust_impacts_user_idx on public.trust_impacts (user_id);

comment on table public.verification_records is 'Client cannot set status=passed; Edge/run-verification only.';
comment on table public.fraud_assessments is 'Final fraud outcome from service role / provider worker only.';
