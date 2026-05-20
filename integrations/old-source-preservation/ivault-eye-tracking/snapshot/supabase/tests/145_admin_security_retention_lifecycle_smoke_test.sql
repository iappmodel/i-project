do $$
declare
  v_source_id uuid := gen_random_uuid();
  v_subject_id uuid;
begin
  v_subject_id := register_admin_security_retention_subject(
    'other',
    v_source_id,
    'Retention Test Artifact',
    'Retention smoke test.',
    'Retention Corp',
    'retention.example.com',
    'retention-artifact',
    repeat('a', 64),
    repeat('b', 64),
    now() - interval '400 days',
    'retention-register',
    '{"test": true}'::jsonb
  );

  update admin_security_retention_subjects
  set
    archive_after = now() - interval '1 day',
    delete_after = now() + interval '10 days'
  where id = v_subject_id;

  perform run_admin_security_retention_lifecycle_job(
    100,
    'retention-worker',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_retention_subjects
    where id = v_subject_id
      and status = 'archived'
      and archived_at is not null
  ) then
    raise exception 'retention subject was not archived';
  end if;

  if not exists (
    select 1
    from admin_security_retention_decisions
    where retention_subject_id = v_subject_id
      and decision_type = 'archived'
      and hash_chain_entry_id is not null
  ) then
    raise exception 'archive decision missing or not hash chained';
  end if;
end $$;
