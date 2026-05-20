do $$
declare
  v_requester_auth_user_id uuid := gen_random_uuid();
  v_approver_auth_user_id uuid := gen_random_uuid();
  v_target_auth_user_id uuid := gen_random_uuid();

  v_privileged_request_id uuid;
begin
  perform upsert_admin_user(
    v_requester_auth_user_id,
    'hash-requester@example.com',
    'Hash Requester',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_requester_auth_user_id,
    'super_admin',
    null,
    'hash smoke requester'
  );

  perform upsert_admin_user(
    v_approver_auth_user_id,
    'hash-approver@example.com',
    'Hash Approver',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_approver_auth_user_id,
    'super_admin',
    null,
    'hash smoke approver'
  );

  perform upsert_admin_user(
    v_target_auth_user_id,
    'hash-target@example.com',
    'Hash Target',
    'active',
    '{"test": true}'::jsonb
  );

  v_privileged_request_id := admin_assign_admin_role(
    v_requester_auth_user_id,
    v_target_auth_user_id,
    'super_admin',
    'hash smoke super admin assignment',
    'hash-smoke-request',
    '{"test": true}'::jsonb
  );

  perform approve_admin_privileged_action(
    v_approver_auth_user_id,
    v_privileged_request_id,
    'hash smoke approval',
    'hash-smoke-approval',
    '{"test": true}'::jsonb
  );

  perform run_audit_hash_backfill_job(
    1000,
    '{"test": true, "scope": "admin_audit_hashing"}'::jsonb
  );

  perform verify_audit_hash_chain(
    'global_audit_chain',
    100000,
    '{"test": true, "scope": "admin_audit_hashing"}'::jsonb
  );

  if exists (
    select 1
    from admin_audit_hash_integrity
    where missing_admin_action_hash_count <> 0
       or missing_privileged_action_hash_count <> 0
       or missing_admin_security_alert_hash_count <> 0
  ) then
    raise exception 'admin audit hash integrity failed';
  end if;

  if not exists (
    select 1
    from audit_hash_chain_entries
    where source_type = 'admin_privileged_action_request'
      and source_id = v_privileged_request_id
  ) then
    raise exception 'privileged action was not hash chained';
  end if;
end $$;
