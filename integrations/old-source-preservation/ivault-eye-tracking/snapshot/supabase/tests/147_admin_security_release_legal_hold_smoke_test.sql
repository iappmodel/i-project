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
    'release-hold-admin@example.com',
    'Release Hold Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'release hold bootstrap');

  v_subject_id := register_admin_security_retention_subject(
    'other',
    v_source_id,
    'Release Hold Artifact',
    'Release hold smoke test.',
    'Release Corp',
    'release.example.com',
    'release-artifact',
    repeat('a', 64),
    repeat('b', 64),
    now() - interval '400 days',
    'release-register',
    '{"test": true}'::jsonb
  );

  update admin_security_retention_subjects
  set
    delete_after = now() - interval '1 day'
  where id = v_subject_id;

  v_hold_id := place_admin_security_legal_hold(
    v_admin_auth_user_id,
    'other',
    v_source_id,
    'legal',
    'Release legal hold test',
    'Preserve temporarily.',
    'CASE-456',
    null,
    'release-hold-place',
    '{"test": true}'::jsonb
  );

  perform release_admin_security_legal_hold(
    v_admin_auth_user_id,
    v_hold_id,
    'Legal review complete.',
    'release-hold',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_legal_holds
    where id = v_hold_id
      and status = 'released'
  ) then
    raise exception 'legal hold was not released';
  end if;

  if not exists (
    select 1
    from admin_security_retention_subjects
    where id = v_subject_id
      and status = 'deletion_eligible'
      and legal_hold_active is false
  ) then
    raise exception 'retention subject did not become deletion eligible after hold release';
  end if;
end $$;
