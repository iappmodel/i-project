do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_project_id uuid;
  v_question_id uuid;
  v_ai_request_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'questionnaire-ai-blocked-admin@example.com',
    'Questionnaire AI Blocked Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'questionnaire ai blocked bootstrap');

  v_project_id := create_admin_security_questionnaire_project(
    v_admin_auth_user_id,
    'Blocked Buyer',
    'blockedbuyer.com',
    'blocked-buyer',
    'Blocked Buyer Security Questionnaire',
    'Blocked AI drafting smoke test.',
    'enterprise_security_questionnaire',
    null,
    now() + interval '14 days',
    null,
    null,
    null,
    'questionnaire-ai-blocked-project',
    '{"test": true}'::jsonb
  );

  v_question_id := add_admin_security_questionnaire_question(
    v_admin_auth_user_id,
    v_project_id,
    'Q-BLOCKED',
    'Can your system ever be breached?',
    'Security',
    1,
    'text',
    'application_security',
    'high',
    'questionnaire-ai-blocked-question',
    '{"test": true}'::jsonb
  );

  v_ai_request_id := request_admin_security_questionnaire_ai_draft(
    v_admin_auth_user_id,
    v_question_id,
    'draft_only',
    'questionnaire-ai-blocked-request',
    '{"test": true}'::jsonb
  );

  perform claim_admin_security_questionnaire_ai_drafts(
    5,
    'questionnaire-ai-worker',
    '{"test": true}'::jsonb
  );

  perform complete_admin_security_questionnaire_ai_draft(
    v_ai_request_id,
    null,
    null,
    0.1000,
    'Our system is 100% secure and impossible to breach.',
    'Bad draft for guardrail test.',
    '[]'::jsonb,
    'blocked',
    '[{"guardrailKey":"no_absolute_security_claims"}]'::jsonb,
    'questionnaire-ai-worker',
    '{"test": true}'::jsonb
  );

  begin
    perform accept_admin_security_questionnaire_ai_draft(
      v_admin_auth_user_id,
      v_ai_request_id,
      'should fail',
      'questionnaire-ai-blocked-accept',
      '{"test": true}'::jsonb
    );

    raise exception 'blocked AI draft should not be accepted';
  exception
    when others then
      if sqlerrm not like '%blocked AI questionnaire draft cannot be accepted%' then
        raise;
      end if;
  end;
end $$;
