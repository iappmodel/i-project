do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_run_id uuid;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'control-evidence-admin@example.com',
    'Control Evidence Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'control evidence smoke bootstrap'
  );

  v_run_id := run_admin_security_control_evidence_collection(
    v_admin_auth_user_id,
    null,
    null,
    'control-evidence-smoke',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_control_evidence_runs
    where id = v_run_id
      and status in ('completed', 'warning')
      and evidence_count > 0
  ) then
    raise exception 'control evidence run did not complete';
  end if;

  if not exists (
    select 1
    from admin_security_control_evidence_items
    where admin_security_control_evidence_run_id = v_run_id
  ) then
    raise exception 'control evidence items missing';
  end if;
end $$;
