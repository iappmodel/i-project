do $$
declare
  v_policy_count integer;
  v_rule_count integer;
begin
  select count(*)
  into v_policy_count
  from admin_security_governance_policies
  where status = 'active';

  if v_policy_count < 8 then
    raise exception 'expected active governance policies';
  end if;

  select count(*)
  into v_rule_count
  from admin_security_governance_policy_rules
  where status = 'active';

  if v_rule_count < 5 then
    raise exception 'expected active governance policy rules';
  end if;
end $$;
