-- Step 9.53 — Build AI-assisted questionnaire drafting.
-- Runs after 167_admin_security_questionnaire_engine.sql.

create table if not exists admin_security_questionnaire_ai_draft_requests (
  id uuid primary key default gen_random_uuid(),
  request_key text not null unique,
  questionnaire_project_id uuid not null
    references admin_security_questionnaire_projects(id)
    on delete cascade,
  questionnaire_question_id uuid not null
    references admin_security_questionnaire_questions(id)
    on delete cascade,
  status text not null default 'pending',
  draft_mode text not null default 'match_then_draft',
  requested_by_auth_user_id uuid not null,
  requested_by_admin_user_id uuid references admin_users(id),
  claimed_by_worker_id text,
  claimed_at timestamptz,
  completed_at timestamptz,
  completed_by_worker_id text,
  selected_answer_library_id uuid
    references admin_security_questionnaire_answer_library(id)
    on delete set null,
  match_confidence numeric(5,4),
  draft_confidence numeric(5,4),
  generated_answer text,
  generated_rationale text,
  evidence_summary jsonb not null default '[]'::jsonb,
  safety_status text not null default 'unchecked',
  safety_flags jsonb not null default '[]'::jsonb,
  last_error text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_questionnaire_ai_draft_requests_status_check
    check (
      status in (
        'pending',
        'matching',
        'drafting',
        'completed',
        'failed',
        'cancelled'
      )
    ),
  constraint admin_security_questionnaire_ai_draft_requests_mode_check
    check (
      draft_mode in (
        'match_only',
        'draft_only',
        'match_then_draft',
        'evidence_summary_only'
      )
    ),
  constraint admin_security_questionnaire_ai_draft_requests_safety_check
    check (
      safety_status in (
        'unchecked',
        'passed',
        'flagged',
        'blocked'
      )
    )
);

create index if not exists admin_security_questionnaire_ai_draft_requests_project_idx
on admin_security_questionnaire_ai_draft_requests (questionnaire_project_id, created_at desc);

create index if not exists admin_security_questionnaire_ai_draft_requests_question_idx
on admin_security_questionnaire_ai_draft_requests (questionnaire_question_id, created_at desc);

create index if not exists admin_security_questionnaire_ai_draft_requests_status_idx
on admin_security_questionnaire_ai_draft_requests (status, created_at asc);

drop trigger if exists admin_security_questionnaire_ai_draft_requests_set_updated_at
on admin_security_questionnaire_ai_draft_requests;

create trigger admin_security_questionnaire_ai_draft_requests_set_updated_at
before update on admin_security_questionnaire_ai_draft_requests
for each row
execute function set_updated_at();

create table if not exists admin_security_questionnaire_ai_match_candidates (
  id uuid primary key default gen_random_uuid(),
  ai_draft_request_id uuid not null
    references admin_security_questionnaire_ai_draft_requests(id)
    on delete cascade,
  questionnaire_question_id uuid not null
    references admin_security_questionnaire_questions(id)
    on delete cascade,
  answer_library_id uuid not null
    references admin_security_questionnaire_answer_library(id)
    on delete cascade,
  rank integer not null,
  match_score numeric(5,4) not null default 0,
  match_reason text not null,
  category_match boolean not null default false,
  framework_match boolean not null default false,
  control_match boolean not null default false,
  lexical_match boolean not null default false,
  semantic_match boolean not null default false,
  recommended boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (ai_draft_request_id, answer_library_id),
  constraint admin_security_questionnaire_ai_match_candidates_rank_check
    check (rank > 0),
  constraint admin_security_questionnaire_ai_match_candidates_score_check
    check (match_score >= 0 and match_score <= 1)
);

create index if not exists admin_security_questionnaire_ai_match_candidates_request_idx
on admin_security_questionnaire_ai_match_candidates (ai_draft_request_id, rank);

create index if not exists admin_security_questionnaire_ai_match_candidates_question_idx
on admin_security_questionnaire_ai_match_candidates (questionnaire_question_id, match_score desc);

create table if not exists admin_security_questionnaire_ai_guardrails (
  id uuid primary key default gen_random_uuid(),
  guardrail_key text not null unique,
  status text not null default 'active',
  guardrail_type text not null,
  title text not null,
  description text not null,
  severity text not null default 'high',
  block_on_violation boolean not null default true,
  match_pattern text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_questionnaire_ai_guardrails_status_check
    check (status in ('active', 'disabled', 'archived')),
  constraint admin_security_questionnaire_ai_guardrails_type_check
    check (
      guardrail_type in (
        'forbidden_claim',
        'certification_claim',
        'unverified_evidence',
        'legal_overreach',
        'security_overdisclosure',
        'secret_exposure',
        'customer_specific_risk'
      )
    ),
  constraint admin_security_questionnaire_ai_guardrails_severity_check
    check (severity in ('low', 'medium', 'high', 'critical'))
);

drop trigger if exists admin_security_questionnaire_ai_guardrails_set_updated_at
on admin_security_questionnaire_ai_guardrails;

create trigger admin_security_questionnaire_ai_guardrails_set_updated_at
before update on admin_security_questionnaire_ai_guardrails
for each row
execute function set_updated_at();

insert into admin_security_questionnaire_ai_guardrails (
  guardrail_key,
  status,
  guardrail_type,
  title,
  description,
  severity,
  block_on_violation,
  match_pattern,
  metadata
)
values
  (
    'no_false_certification_claims',
    'active',
    'certification_claim',
    'No false certification claims',
    'AI drafts must not claim SOC2, ISO27001, GDPR, HIPAA, or other certification unless backed by approved evidence.',
    'critical',
    true,
    '(certified|certification|attested|audited|compliant with)',
    '{}'::jsonb
  ),
  (
    'no_absolute_security_claims',
    'active',
    'forbidden_claim',
    'No absolute security claims',
    'AI drafts must not claim perfect, guaranteed, unbreakable, or risk-free security.',
    'critical',
    true,
    '(guarantee|guaranteed|unbreakable|impossible to breach|fully secure|100% secure|zero risk)',
    '{}'::jsonb
  ),
  (
    'no_secret_exposure',
    'active',
    'secret_exposure',
    'No secrets or internal implementation exposure',
    'AI drafts must not expose secrets, keys, raw storage URIs, worker IDs, or internal-only details.',
    'critical',
    true,
    '(secret|private key|storage_uri|file://|worker-|service_role|ciphertext)',
    '{}'::jsonb
  ),
  (
    'no_unsupported_evidence_claim',
    'active',
    'unverified_evidence',
    'No unsupported evidence claim',
    'AI drafts must not say evidence is attached, audited, verified, sealed, or signed unless evidence links exist.',
    'high',
    true,
    '(attached evidence|verified evidence|sealed evidence|signed report|audit proof)',
    '{}'::jsonb
  )
on conflict (guardrail_key)
do update set
  status = excluded.status,
  guardrail_type = excluded.guardrail_type,
  title = excluded.title,
  description = excluded.description,
  severity = excluded.severity,
  block_on_violation = excluded.block_on_violation,
  match_pattern = excluded.match_pattern,
  metadata = admin_security_questionnaire_ai_guardrails.metadata || excluded.metadata,
  updated_at = now();

create or replace function request_admin_security_questionnaire_ai_draft(
  p_admin_auth_user_id uuid,
  p_questionnaire_question_id uuid,
  p_draft_mode text default 'match_then_draft',
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_question admin_security_questionnaire_questions%rowtype;
  v_project admin_security_questionnaire_projects%rowtype;
  v_request_id uuid;
  v_request_key text;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;
  select * into v_question from admin_security_questionnaire_questions where id = p_questionnaire_question_id;
  if v_question.id is null then
    raise exception 'questionnaire question not found: %', p_questionnaire_question_id;
  end if;
  select * into v_project from admin_security_questionnaire_projects where id = v_question.questionnaire_project_id;
  if v_project.id is null then
    raise exception 'questionnaire project not found: %', v_question.questionnaire_project_id;
  end if;
  if v_project.status not in ('draft', 'in_progress', 'review') then
    raise exception 'cannot request AI draft for questionnaire project status: %', v_project.status;
  end if;
  if v_question.status in ('approved', 'not_applicable') then
    raise exception 'cannot request AI draft for finalized question';
  end if;
  if p_draft_mode not in ('match_only', 'draft_only', 'match_then_draft', 'evidence_summary_only') then
    raise exception 'invalid questionnaire AI draft mode: %', p_draft_mode;
  end if;
  v_admin := get_active_admin_user(p_admin_auth_user_id);
  v_request_key := 'questionnaire_ai_draft:' || v_project.project_key || ':' || v_question.question_key || ':' || extract(epoch from now())::bigint::text;
  insert into admin_security_questionnaire_ai_draft_requests (
    request_key, questionnaire_project_id, questionnaire_question_id, status, draft_mode,
    requested_by_auth_user_id, requested_by_admin_user_id, request_id, metadata
  )
  values (
    v_request_key, v_project.id, v_question.id, 'pending', p_draft_mode,
    p_admin_auth_user_id, v_admin.id, p_request_id, coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_request_id;
  perform record_admin_action(
    p_admin_auth_user_id,
    'request_admin_security_questionnaire_ai_draft',
    'admin.write',
    'admin_security_questionnaire_ai_draft_request',
    v_request_id,
    p_request_id,
    null,
    null,
    'allowed',
    'AI questionnaire draft requested',
    p_metadata || jsonb_build_object(
      'questionnaire_project_id', v_project.id,
      'questionnaire_question_id', v_question.id,
      'draft_mode', p_draft_mode
    )
  );
  return v_request_id;
end;
$$;

create or replace function claim_admin_security_questionnaire_ai_drafts(
  p_batch_size integer default 5,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  ai_draft_request_id uuid,
  request_key text,
  questionnaire_project_id uuid,
  questionnaire_question_id uuid,
  project_key text,
  customer_name text,
  questionnaire_title text,
  question_key text,
  question_text text,
  normalized_question text,
  expected_answer_type text,
  category text,
  priority text,
  draft_mode text
)
language plpgsql
as $$
begin
  if p_batch_size <= 0 or p_batch_size > 25 then
    raise exception 'batch size must be between 1 and 25';
  end if;
  return query
  with candidates as (
    select r.id
    from admin_security_questionnaire_ai_draft_requests r
    join admin_security_questionnaire_questions q on q.id = r.questionnaire_question_id
    join admin_security_questionnaire_projects p on p.id = r.questionnaire_project_id
    where r.status in ('pending', 'failed')
      and p.status in ('draft', 'in_progress', 'review')
      and q.status not in ('approved', 'not_applicable')
      and (r.status = 'pending' or (r.status = 'failed' and r.created_at >= now() - interval '7 days'))
    order by r.created_at asc
    limit p_batch_size
    for update skip locked
  ),
  updated as (
    update admin_security_questionnaire_ai_draft_requests r
    set
      status = 'matching',
      claimed_by_worker_id = p_worker_id,
      claimed_at = now(),
      last_error = null,
      metadata = r.metadata || coalesce(p_metadata, '{}'::jsonb),
      updated_at = now()
    from candidates
    where r.id = candidates.id
    returning r.*
  )
  select
    u.id,
    u.request_key,
    p.id,
    q.id,
    p.project_key,
    p.customer_name,
    p.questionnaire_title,
    q.question_key,
    q.question_text,
    q.normalized_question,
    q.expected_answer_type,
    q.category,
    q.priority,
    u.draft_mode
  from updated u
  join admin_security_questionnaire_questions q on q.id = u.questionnaire_question_id
  join admin_security_questionnaire_projects p on p.id = u.questionnaire_project_id;
end;
$$;

create or replace function store_admin_security_questionnaire_ai_match_candidate(
  p_ai_draft_request_id uuid,
  p_answer_library_id uuid,
  p_rank integer,
  p_match_score numeric,
  p_match_reason text,
  p_category_match boolean default false,
  p_framework_match boolean default false,
  p_control_match boolean default false,
  p_lexical_match boolean default false,
  p_semantic_match boolean default false,
  p_recommended boolean default false,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request admin_security_questionnaire_ai_draft_requests%rowtype;
  v_candidate_id uuid;
begin
  select * into v_request from admin_security_questionnaire_ai_draft_requests where id = p_ai_draft_request_id;
  if v_request.id is null then
    raise exception 'AI questionnaire draft request not found: %', p_ai_draft_request_id;
  end if;
  insert into admin_security_questionnaire_ai_match_candidates (
    ai_draft_request_id, questionnaire_question_id, answer_library_id, rank, match_score, match_reason,
    category_match, framework_match, control_match, lexical_match, semantic_match, recommended, metadata
  )
  values (
    v_request.id, v_request.questionnaire_question_id, p_answer_library_id, p_rank, p_match_score, p_match_reason,
    coalesce(p_category_match, false), coalesce(p_framework_match, false), coalesce(p_control_match, false),
    coalesce(p_lexical_match, false), coalesce(p_semantic_match, false), coalesce(p_recommended, false),
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (ai_draft_request_id, answer_library_id)
  do update set
    rank = excluded.rank,
    match_score = excluded.match_score,
    match_reason = excluded.match_reason,
    category_match = excluded.category_match,
    framework_match = excluded.framework_match,
    control_match = excluded.control_match,
    lexical_match = excluded.lexical_match,
    semantic_match = excluded.semantic_match,
    recommended = excluded.recommended,
    metadata = admin_security_questionnaire_ai_match_candidates.metadata || excluded.metadata
  returning id into v_candidate_id;
  return v_candidate_id;
end;
$$;

create or replace function complete_admin_security_questionnaire_ai_draft(
  p_ai_draft_request_id uuid,
  p_selected_answer_library_id uuid default null,
  p_match_confidence numeric default null,
  p_draft_confidence numeric default null,
  p_generated_answer text default null,
  p_generated_rationale text default null,
  p_evidence_summary jsonb default '[]'::jsonb,
  p_safety_status text default 'passed',
  p_safety_flags jsonb default '[]'::jsonb,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request admin_security_questionnaire_ai_draft_requests%rowtype;
  v_question admin_security_questionnaire_questions%rowtype;
begin
  select * into v_request from admin_security_questionnaire_ai_draft_requests where id = p_ai_draft_request_id for update;
  if v_request.id is null then
    raise exception 'AI questionnaire draft request not found: %', p_ai_draft_request_id;
  end if;
  if v_request.status not in ('matching', 'drafting') then
    raise exception 'AI questionnaire draft cannot complete from status: %', v_request.status;
  end if;
  if p_safety_status not in ('passed', 'flagged', 'blocked') then
    raise exception 'invalid AI questionnaire draft safety status: %', p_safety_status;
  end if;
  select * into v_question from admin_security_questionnaire_questions where id = v_request.questionnaire_question_id for update;
  if v_question.id is null then
    raise exception 'questionnaire question not found: %', v_request.questionnaire_question_id;
  end if;
  update admin_security_questionnaire_ai_draft_requests
  set
    status = 'completed',
    completed_at = now(),
    completed_by_worker_id = p_worker_id,
    selected_answer_library_id = p_selected_answer_library_id,
    match_confidence = p_match_confidence,
    draft_confidence = p_draft_confidence,
    generated_answer = p_generated_answer,
    generated_rationale = p_generated_rationale,
    evidence_summary = coalesce(p_evidence_summary, '[]'::jsonb),
    safety_status = p_safety_status,
    safety_flags = coalesce(p_safety_flags, '[]'::jsonb),
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = v_request.id;
  if p_generated_answer is not null and p_safety_status in ('passed', 'flagged') then
    update admin_security_questionnaire_questions
    set
      status = 'drafted',
      matched_answer_library_id = p_selected_answer_library_id,
      answer_source = 'ai_draft',
      draft_answer = p_generated_answer,
      confidence_score = p_draft_confidence,
      metadata = metadata || jsonb_build_object(
        'ai_draft_request_id', v_request.id,
        'ai_safety_status', p_safety_status,
        'ai_safety_flags', coalesce(p_safety_flags, '[]'::jsonb)
      ),
      updated_at = now()
    where id = v_question.id;
  end if;
  return v_request.id;
end;
$$;

create or replace function fail_admin_security_questionnaire_ai_draft(
  p_ai_draft_request_id uuid,
  p_error text,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request admin_security_questionnaire_ai_draft_requests%rowtype;
begin
  if p_error is null or length(trim(p_error)) = 0 then
    raise exception 'AI questionnaire draft error is required';
  end if;
  select * into v_request from admin_security_questionnaire_ai_draft_requests where id = p_ai_draft_request_id for update;
  if v_request.id is null then
    raise exception 'AI questionnaire draft request not found: %', p_ai_draft_request_id;
  end if;
  update admin_security_questionnaire_ai_draft_requests
  set
    status = 'failed',
    last_error = p_error,
    completed_by_worker_id = p_worker_id,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'failed_at', now(),
      'failed_by_worker_id', p_worker_id
    ),
    updated_at = now()
  where id = v_request.id;
  perform create_admin_security_alert(
    'admin_security_questionnaire_ai_draft_failed',
    'medium',
    null,
    v_request.requested_by_auth_user_id,
    'fail_admin_security_questionnaire_ai_draft',
    null,
    'AI questionnaire draft generation failed.',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'ai_draft_request_id', v_request.id,
      'error', p_error
    )
  );
  return v_request.id;
end;
$$;

create or replace function accept_admin_security_questionnaire_ai_draft(
  p_admin_auth_user_id uuid,
  p_ai_draft_request_id uuid,
  p_note text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request admin_security_questionnaire_ai_draft_requests%rowtype;
  v_question admin_security_questionnaire_questions%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;
  if p_note is null or length(trim(p_note)) = 0 then
    raise exception 'AI draft acceptance note is required';
  end if;
  select * into v_request from admin_security_questionnaire_ai_draft_requests where id = p_ai_draft_request_id;
  if v_request.id is null then
    raise exception 'AI questionnaire draft request not found: %', p_ai_draft_request_id;
  end if;
  if v_request.status <> 'completed' then
    raise exception 'AI questionnaire draft must be completed before acceptance';
  end if;
  if v_request.safety_status = 'blocked' then
    raise exception 'blocked AI questionnaire draft cannot be accepted';
  end if;
  if v_request.generated_answer is null or length(trim(v_request.generated_answer)) = 0 then
    raise exception 'AI questionnaire draft has no generated answer';
  end if;
  select * into v_question from admin_security_questionnaire_questions where id = v_request.questionnaire_question_id for update;
  if v_question.id is null then
    raise exception 'questionnaire question not found: %', v_request.questionnaire_question_id;
  end if;
  update admin_security_questionnaire_questions
  set
    status = 'needs_review',
    answer_source = 'ai_draft',
    matched_answer_library_id = v_request.selected_answer_library_id,
    draft_answer = v_request.generated_answer,
    confidence_score = v_request.draft_confidence,
    reviewer_note = p_note,
    metadata = metadata || p_metadata || jsonb_build_object(
      'accepted_ai_draft_request_id', v_request.id,
      'ai_generated_rationale', v_request.generated_rationale,
      'ai_safety_status', v_request.safety_status,
      'ai_safety_flags', v_request.safety_flags
    ),
    updated_at = now()
  where id = v_question.id;
  perform record_admin_action(
    p_admin_auth_user_id,
    'accept_admin_security_questionnaire_ai_draft',
    'admin.write',
    'admin_security_questionnaire_question',
    v_question.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_note,
    p_metadata || jsonb_build_object(
      'ai_draft_request_id', v_request.id,
      'safety_status', v_request.safety_status,
      'draft_confidence', v_request.draft_confidence
    )
  );
  return v_question.id;
end;
$$;

create or replace view admin_security_questionnaire_ai_draft_dashboard as
select
  r.id as admin_security_questionnaire_ai_draft_request_id,
  r.request_key,
  r.status,
  r.draft_mode,
  r.questionnaire_project_id,
  p.project_key,
  p.customer_name,
  p.questionnaire_title,
  r.questionnaire_question_id,
  q.question_key,
  q.question_text,
  q.status as question_status,
  q.priority,
  q.category,
  r.selected_answer_library_id,
  a.answer_key as selected_answer_key,
  r.match_confidence,
  r.draft_confidence,
  r.safety_status,
  r.safety_flags,
  r.claimed_by_worker_id,
  r.claimed_at,
  r.completed_at,
  r.completed_by_worker_id,
  r.last_error,
  requester.email as requested_by_email,
  (
    select count(*)
    from admin_security_questionnaire_ai_match_candidates c
    where c.ai_draft_request_id = r.id
  ) as match_candidate_count,
  r.created_at,
  r.updated_at,
  r.metadata
from admin_security_questionnaire_ai_draft_requests r
join admin_security_questionnaire_projects p on p.id = r.questionnaire_project_id
join admin_security_questionnaire_questions q on q.id = r.questionnaire_question_id
left join admin_security_questionnaire_answer_library a on a.id = r.selected_answer_library_id
left join admin_users requester on requester.id = r.requested_by_admin_user_id
order by r.created_at desc;

create or replace view admin_security_questionnaire_ai_match_candidate_dashboard as
select
  c.id as admin_security_questionnaire_ai_match_candidate_id,
  c.ai_draft_request_id,
  r.request_key,
  r.questionnaire_project_id,
  p.project_key,
  p.customer_name,
  c.questionnaire_question_id,
  q.question_key,
  q.question_text,
  c.answer_library_id,
  a.answer_key,
  a.category as answer_category,
  a.topic,
  a.question_pattern,
  a.short_answer,
  a.assurance_level,
  c.rank,
  c.match_score,
  c.match_reason,
  c.category_match,
  c.framework_match,
  c.control_match,
  c.lexical_match,
  c.semantic_match,
  c.recommended,
  c.created_at,
  c.metadata
from admin_security_questionnaire_ai_match_candidates c
join admin_security_questionnaire_ai_draft_requests r on r.id = c.ai_draft_request_id
join admin_security_questionnaire_projects p on p.id = r.questionnaire_project_id
join admin_security_questionnaire_questions q on q.id = c.questionnaire_question_id
join admin_security_questionnaire_answer_library a on a.id = c.answer_library_id
order by c.ai_draft_request_id, c.rank asc;

create or replace view admin_security_questionnaire_ai_integrity as
select
  (select count(*) from admin_security_questionnaire_ai_draft_requests where status = 'pending') as pending_ai_draft_count,
  (select count(*) from admin_security_questionnaire_ai_draft_requests where status in ('matching', 'drafting')) as active_ai_draft_count,
  (
    select count(*)
    from admin_security_questionnaire_ai_draft_requests
    where status = 'completed'
      and safety_status = 'passed'
      and created_at >= now() - interval '24 hours'
  ) as passed_ai_draft_count_24h,
  (
    select count(*)
    from admin_security_questionnaire_ai_draft_requests
    where safety_status = 'flagged'
      and created_at >= now() - interval '24 hours'
  ) as flagged_ai_draft_count_24h,
  (
    select count(*)
    from admin_security_questionnaire_ai_draft_requests
    where safety_status = 'blocked'
      and created_at >= now() - interval '24 hours'
  ) as blocked_ai_draft_count_24h,
  (
    select count(*)
    from admin_security_questionnaire_questions
    where answer_source = 'ai_draft'
      and status = 'approved'
  ) as approved_ai_drafted_answer_count,
  (
    select count(*)
    from admin_security_questionnaire_questions
    where answer_source = 'ai_draft'
      and status in ('drafted', 'needs_review', 'reviewed')
  ) as unapproved_ai_drafted_answer_count,
  now() as checked_at;

grant select on admin_security_questionnaire_ai_draft_dashboard to admin_api_role;
grant select on admin_security_questionnaire_ai_match_candidate_dashboard to admin_api_role;
grant select on admin_security_questionnaire_ai_integrity to admin_api_role;

alter table admin_security_questionnaire_ai_draft_requests enable row level security;
alter table admin_security_questionnaire_ai_match_candidates enable row level security;
alter table admin_security_questionnaire_ai_guardrails enable row level security;

create policy admin_security_questionnaire_ai_draft_requests_no_user_direct_access
on admin_security_questionnaire_ai_draft_requests for all to authenticated
using (false) with check (false);

create policy admin_security_questionnaire_ai_match_candidates_no_user_direct_access
on admin_security_questionnaire_ai_match_candidates for all to authenticated
using (false) with check (false);

create policy admin_security_questionnaire_ai_guardrails_no_user_direct_access
on admin_security_questionnaire_ai_guardrails for all to authenticated
using (false) with check (false);

create policy admin_api_all_admin_security_questionnaire_ai_draft_requests
on admin_security_questionnaire_ai_draft_requests for all to admin_api_role
using (true) with check (true);

create policy admin_api_all_admin_security_questionnaire_ai_match_candidates
on admin_security_questionnaire_ai_match_candidates for all to admin_api_role
using (true) with check (true);

create policy admin_api_read_admin_security_questionnaire_ai_guardrails
on admin_security_questionnaire_ai_guardrails for select to admin_api_role
using (true);

create policy worker_all_admin_security_questionnaire_ai_draft_requests
on admin_security_questionnaire_ai_draft_requests for all to worker_role
using (true) with check (true);

create policy worker_all_admin_security_questionnaire_ai_match_candidates
on admin_security_questionnaire_ai_match_candidates for all to worker_role
using (true) with check (true);

create policy worker_read_admin_security_questionnaire_ai_guardrails
on admin_security_questionnaire_ai_guardrails for select to worker_role
using (true);

grant execute on function request_admin_security_questionnaire_ai_draft(
  uuid, uuid, text, text, jsonb
) to admin_api_role;
grant execute on function claim_admin_security_questionnaire_ai_drafts(integer, text, jsonb)
to worker_role;
grant execute on function store_admin_security_questionnaire_ai_match_candidate(
  uuid, uuid, integer, numeric, text, boolean, boolean, boolean, boolean, boolean, boolean, jsonb
) to worker_role;
grant execute on function complete_admin_security_questionnaire_ai_draft(
  uuid, uuid, numeric, numeric, text, text, jsonb, text, jsonb, text, jsonb
) to worker_role;
grant execute on function fail_admin_security_questionnaire_ai_draft(uuid, text, text, jsonb)
to worker_role;
grant execute on function accept_admin_security_questionnaire_ai_draft(uuid, uuid, text, text, jsonb)
to admin_api_role;

alter function request_admin_security_questionnaire_ai_draft(
  uuid, uuid, text, text, jsonb
) security definer;
alter function request_admin_security_questionnaire_ai_draft(
  uuid, uuid, text, text, jsonb
) set search_path = public;

alter function claim_admin_security_questionnaire_ai_drafts(integer, text, jsonb) security definer;
alter function claim_admin_security_questionnaire_ai_drafts(integer, text, jsonb) set search_path = public;

alter function store_admin_security_questionnaire_ai_match_candidate(
  uuid, uuid, integer, numeric, text, boolean, boolean, boolean, boolean, boolean, boolean, jsonb
) security definer;
alter function store_admin_security_questionnaire_ai_match_candidate(
  uuid, uuid, integer, numeric, text, boolean, boolean, boolean, boolean, boolean, boolean, jsonb
) set search_path = public;

alter function complete_admin_security_questionnaire_ai_draft(
  uuid, uuid, numeric, numeric, text, text, jsonb, text, jsonb, text, jsonb
) security definer;
alter function complete_admin_security_questionnaire_ai_draft(
  uuid, uuid, numeric, numeric, text, text, jsonb, text, jsonb, text, jsonb
) set search_path = public;

alter function fail_admin_security_questionnaire_ai_draft(uuid, text, text, jsonb) security definer;
alter function fail_admin_security_questionnaire_ai_draft(uuid, text, text, jsonb) set search_path = public;

alter function accept_admin_security_questionnaire_ai_draft(uuid, uuid, text, text, jsonb) security definer;
alter function accept_admin_security_questionnaire_ai_draft(uuid, uuid, text, text, jsonb) set search_path = public;

insert into error_catalog (
  error_code, category, severity, http_status, retryable, user_visible, user_message, internal_message, owner_team
)
values
  ('QUESTIONNAIRE_AI_DRAFT_NOT_FOUND', 'validation', 'medium', 404, false, true, 'AI questionnaire draft not found.', 'AI questionnaire draft request not found.', 'platform'),
  ('QUESTIONNAIRE_AI_DRAFT_INVALID_STATE', 'validation', 'high', 409, false, true, 'AI questionnaire draft cannot move from its current state.', 'AI questionnaire draft lifecycle invalid state.', 'platform'),
  ('QUESTIONNAIRE_AI_DRAFT_BLOCKED', 'validation', 'high', 409, false, true, 'AI questionnaire draft was blocked by safety guardrails.', 'AI questionnaire draft blocked by guardrails.', 'platform'),
  ('QUESTIONNAIRE_AI_DRAFT_REQUIRED_FIELDS', 'validation', 'medium', 400, false, true, 'AI questionnaire draft requires complete fields.', 'AI questionnaire draft required fields missing.', 'platform')
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
  match_pattern, error_code, priority, metadata
)
values
  ('AI questionnaire draft request not found', 'QUESTIONNAIRE_AI_DRAFT_NOT_FOUND', 5, '{}'),
  ('cannot request AI draft for questionnaire project status', 'QUESTIONNAIRE_AI_DRAFT_INVALID_STATE', 5, '{}'),
  ('cannot request AI draft for finalized question', 'QUESTIONNAIRE_AI_DRAFT_INVALID_STATE', 5, '{}'),
  ('AI questionnaire draft cannot complete from status', 'QUESTIONNAIRE_AI_DRAFT_INVALID_STATE', 5, '{}'),
  ('AI questionnaire draft must be completed before acceptance', 'QUESTIONNAIRE_AI_DRAFT_INVALID_STATE', 5, '{}'),
  ('blocked AI questionnaire draft cannot be accepted', 'QUESTIONNAIRE_AI_DRAFT_BLOCKED', 5, '{}'),
  ('AI questionnaire draft has no generated answer', 'QUESTIONNAIRE_AI_DRAFT_REQUIRED_FIELDS', 5, '{}'),
  ('AI draft acceptance note is required', 'QUESTIONNAIRE_AI_DRAFT_REQUIRED_FIELDS', 5, '{}'),
  ('AI questionnaire draft error is required', 'QUESTIONNAIRE_AI_DRAFT_REQUIRED_FIELDS', 5, '{}')
on conflict do nothing;

