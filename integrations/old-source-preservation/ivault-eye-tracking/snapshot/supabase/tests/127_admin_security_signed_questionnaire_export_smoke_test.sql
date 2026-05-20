do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_project_id uuid;
  v_question_id uuid;
  v_export_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'signed-questionnaire-export-admin@example.com',
    'Signed Questionnaire Export Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'signed questionnaire export bootstrap');

  v_project_id := create_admin_security_questionnaire_project(
    v_admin_auth_user_id,
    'Signed Export Corp',
    'signedexport.com',
    'signed-export-corp',
    'Signed Export Questionnaire',
    'Signed export smoke test.',
    'enterprise_security_questionnaire',
    null,
    now() + interval '14 days',
    null,
    null,
    null,
    'signed-questionnaire-project-create',
    '{"test": true}'::jsonb
  );

  v_question_id := add_admin_security_questionnaire_question(
    v_admin_auth_user_id,
    v_project_id,
    'Q-001',
    'Do you encrypt customer data at rest?',
    'Data Security',
    1,
    'yes_no_explanation',
    'encryption',
    'medium',
    'signed-questionnaire-question',
    '{"test": true}'::jsonb
  );

  perform draft_admin_security_questionnaire_question_answer(
    v_admin_auth_user_id,
    v_question_id,
    'Yes. Customer data is encrypted at rest.',
    'manual',
    0.9,
    'signed-questionnaire-draft',
    '{"test": true}'::jsonb
  );

  perform review_admin_security_questionnaire_question_answer(
    v_admin_auth_user_id,
    v_question_id,
    'approved',
    'approved answer',
    null,
    'signed-questionnaire-review',
    '{"test": true}'::jsonb
  );

  perform approve_admin_security_questionnaire_project(
    v_admin_auth_user_id,
    v_project_id,
    'approved project',
    'signed-questionnaire-project-approve',
    '{"test": true}'::jsonb
  );

  v_export_id := request_admin_security_questionnaire_export(
    v_admin_auth_user_id,
    v_project_id,
    'json',
    true,
    true,
    false,
    'signed-questionnaire-export-request',
    '{"test": true}'::jsonb
  );

  perform claim_admin_security_questionnaire_exports(
    5,
    'signed-questionnaire-worker',
    '{"test": true}'::jsonb
  );

  perform complete_admin_security_questionnaire_export(
    v_export_id,
    'file:///tmp/signed-questionnaire-export.json',
    repeat('a', 64),
    1000,
    1,
    0,
    repeat('b', 64),
    'signed-questionnaire-worker',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_questionnaire_exports
    where id = v_export_id
      and status = 'ready'
      and signature = repeat('b', 64)
      and signed_at is not null
      and signing_key_version = 'questionnaire-export-signing-v1'
  ) then
    raise exception 'signed questionnaire export was not completed';
  end if;
end $$;
