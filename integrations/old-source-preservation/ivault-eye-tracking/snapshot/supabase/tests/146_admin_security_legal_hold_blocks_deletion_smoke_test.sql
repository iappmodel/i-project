do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_source_id uuid := gen_random_uuid();
  v_subject_id uuid;
  v_hold_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'legal-hold-admin@example.com',
    'Legal Hold Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'legal hold bootstrap');

  v_subject_id := register_admin_security_retention_subject(
    'other',
    v_source_id,
    'Legal Hold Artifact',
    'Legal hold smoke test.',
    'Legal Corp',
    'legal.example.com',
    'legal-artifact',
    repeat('a', 64),
    repeat('b', 64),
    now() - interval '400 days',
    'legal-register',
    '{"test": true}'::jsonb
  );

  update admin_security_retention_subjects
  set
    status = 'deletion_eligible',
    deletion_eligible_at = now(),
    delete_after = now() - interval '1 day'
  where id = v_subject_id;

  v_hold_id := place_admin_security_legal_hold(
    v_admin_auth_user_id,
    'other',
    v_source_id,
    'legal',
    'Legal hold test',
    'Preserve for legal review.',
    'CASE-123',
    null,
    'legal-hold-place',
    '{"test": true}'::jsonb
  );

  begin
    perform execute_admin_security_retention_deletion(
      v_admin_auth_user_id,
      v_subject_id,
      'delete after retention',
      null,
      'legal-delete-attempt',
      '{"test": true}'::jsonb
    );

    raise exception 'deletion should have been blocked by legal hold';
  exception
    when others then
      if sqlerrm not like '%cannot delete retention subject under legal hold%' then
        raise;
      end if;
  end;

  if not exists (
    select 1
    from admin_security_legal_holds
    where id = v_hold_id
      and status = 'active'
  ) then
    raise exception 'legal hold was not active';
  end if;
end $$;
