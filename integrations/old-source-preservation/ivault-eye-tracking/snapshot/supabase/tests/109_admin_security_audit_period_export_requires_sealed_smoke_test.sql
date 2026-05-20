do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_period_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'audit-period-export-unsealed@example.com',
    'Audit Period Export Unsealed',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'audit period export unsealed bootstrap'
  );

  v_period_id := create_admin_security_audit_period(
    v_admin_auth_user_id,
    'audit_period_export_unsealed_smoke',
    'Audit Period Export Unsealed Smoke',
    'internal',
    now() - interval '30 days',
    now(),
    'Export should fail while unsealed.',
    'platform',
    'audit-period-export-unsealed-create',
    '{"test": true}'::jsonb
  );

  begin
    perform request_admin_security_audit_period_export(
      v_admin_auth_user_id,
      v_period_id,
      'full_period_bundle',
      'json',
      null,
      'audit-period-export-unsealed-request',
      '{"test": true}'::jsonb
    );

    raise exception 'audit period export should require sealed period';
  exception
    when others then
      if sqlerrm not like '%audit period export requires sealed period%' then
        raise;
      end if;
  end;
end $$;
