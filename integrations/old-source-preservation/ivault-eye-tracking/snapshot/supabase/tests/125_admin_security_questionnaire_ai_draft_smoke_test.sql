do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_answer_id uuid;
  v_project_id uuid;
  v_question_id uuid;
  v_ai_request_id uuid;
  v_claimed_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'questionnaire-ai-admin@example.com',
    'Questionnaire AI Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'questionnaire ai bootstrap');

  v_answer_id := create_admin_security_questionnaire_library_answer(
    v_admin_auth_user_id,
    'ai_mfa_admin_access',
    'authentication',
    'MFA for administrative access',
    'Do you require MFA for administrative access?',
    'Yes. Administrative access requires MFA.',
    'Yes. Administrative access is protected by multi-factor authentication and administrative controls.',
    'enterprise',
    'reasonable',
    array['soc2'],
    array['cc6.1'],
    array[]::text[],
    false,
    'questionnaire-ai-answer-create',
    '{"test": true}'::jsonb
  );

  perform approve_admin_security_questionnaire_library_answer(
    v_admin_auth_user_id,
    v_answer_id,
    'approved for AI smoke',
    'questionnaire-ai-answer-approve',
    '{"test": true}'::jsonb
  );

  v_project_id := create_admin_security_questionnaire_project(
    v_admin_auth_user_id,
    'AI Buyer',
    'aibuyer.com',
    'ai-buyer',
    'AI Buyer Security Questionnaire',
    'AI drafting smoke test.',
    'enterprise_security_questionnaire',
    null,
    now() + interval '14 days',
    null,
    null,
    null,
    'questionnaire-ai-project-create',
    '{"test": true}'::jsonb
  );

  v_question_id := add_admin_security_questionnaire_question(
    v_admin_auth_user_id,
    v_project_id,
    'Q-AI-001',
    'Do you require multi-factor authentication for administrative access?',
    'Access Control',
    1,
    'yes_no_explanation',
    'authentication',
    'medium',
    'questionnaire-ai-question',
    '{"test": true}'::jsonb
  );

  v_ai_request_id := request_admin_security_questionnaire_ai_draft(
    v_admin_auth_user_id,
    v_question_id,
    'match_then_draft',
    'questionnaire-ai-request',
    '{"test": true}'::jsonb
  );

  select ai_draft_request_id
  into v_claimed_id
  from claim_admin_security_questionnaire_ai_drafts(
    5,
    'questionnaire-ai-worker',
    '{"test": true}'::jsonb
  )
  where ai_draft_request_id = v_ai_request_id;

  if v_claimed_id is null then
    raise exception 'AI draft request was not claimed';
  end if;

  perform store_admin_security_questionnaire_ai_match_candidate(
    v_ai_request_id,
    v_answer_id,
    1,
    0.9500,
    'Strong match.',
    true,
    false,
    false,
    true,
    true,
    true,
    '{"test": true}'::jsonb
  );

  perform complete_admin_security_questionnaire_ai_draft(
    v_ai_request_id,
    v_answer_id,
    0.9500,
    0.9300,
    'Yes. Administrative access requires MFA.',
    'Generated from approved library answer.',
    '[]'::jsonb,
    'passed',
    '[]'::jsonb,
    'questionnaire-ai-worker',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_questionnaire_ai_draft_requests
    where id = v_ai_request_id
      and status = 'completed'
      and safety_status = 'passed'
  ) then
    raise exception 'AI draft request was not completed';
  end if;

  if not exists (
    select 1
    from admin_security_questionnaire_questions
    where id = v_question_id
      and answer_source = 'ai_draft'
      and status = 'drafted'
  ) then
    raise exception 'AI draft was not applied as draft';
  end if;
end $$;
