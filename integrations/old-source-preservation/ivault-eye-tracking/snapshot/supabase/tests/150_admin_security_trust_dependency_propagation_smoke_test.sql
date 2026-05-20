do $$
declare
  v_parent_id uuid := gen_random_uuid();
  v_package_id uuid := gen_random_uuid();
  v_dep_id uuid;
  v_queue_count integer;
  v_run_id uuid;
begin
  insert into admin_security_disclosure_packages (
    id,
    package_key,
    status,
    disclosure_type,
    risk_level,
    source_type,
    source_id,
    publication_target_type,
    title,
    summary,
    disclosed_by_auth_user_id,
    metadata
  )
  values (
    v_package_id,
    'dependency-propagation-package',
    'active',
    'other',
    'high',
    'other',
    v_parent_id,
    'other',
    'Dependency Propagation Package',
    'Dependency propagation package.',
    gen_random_uuid(),
    '{"test": true}'::jsonb
  );

  v_dep_id := upsert_admin_security_trust_artifact_dependency(
    'published_as',
    'critical',
    'other',
    v_parent_id,
    'admin_security_disclosure_package',
    v_package_id,
    'parent-artifact',
    'dependency-propagation-package',
    'Parent Artifact',
    'Dependency Propagation Package',
    'Propagation Corp',
    'propagation.example.com',
    'review_required',
    'child_revoke_required',
    'block_delete',
    'smoke-test',
    'dependency-propagation-upsert',
    '{"test": true}'::jsonb
  );

  v_queue_count := queue_admin_security_trust_artifact_propagation(
    'other',
    v_parent_id,
    'revocation',
    'parent_revoked',
    'dependency-propagation-queue',
    '{"test": true}'::jsonb
  );

  if v_queue_count <> 1 then
    raise exception 'expected 1 propagation event, got %', v_queue_count;
  end if;

  v_run_id := process_admin_security_trust_artifact_propagation_events(
    100,
    'dependency-propagation-worker',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_disclosure_packages
    where id = v_package_id
      and status = 'revoked'
  ) then
    raise exception 'child disclosure package was not revoked by propagation';
  end if;

  if not exists (
    select 1
    from admin_security_trust_artifact_propagation_events
    where dependency_id = v_dep_id
      and status = 'completed'
      and action_taken = 'child_disclosure_package_revoked'
  ) then
    raise exception 'propagation event was not completed';
  end if;
end $$;
