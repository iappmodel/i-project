do $$
declare
  v_evaluation_id uuid;
begin
  v_evaluation_id := record_admin_security_policy_evaluation(
    'legal_hold_overrides_retention_and_deletion',
    'block_deletion_under_legal_hold',
    'legal_hold',
    'blocked',
    null,
    null,
    'admin_security_notification_delivery',
    gen_random_uuid(),
    'smoke_policy_eval',
    'policy-eval-smoke',
    'Smoke policy evaluation.',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_policy_evaluations
    where id = v_evaluation_id
      and evaluation_status = 'blocked'
      and policy_key = 'legal_hold_overrides_retention_and_deletion'
  ) then
    raise exception 'policy evaluation was not recorded';
  end if;
end $$;
