do $$
declare
  v_count integer;
begin
  select count(*)
  into v_count
  from admin_security_governance_policy_integrity;

  if v_count <> 1 then
    raise exception 'governance policy integrity should return exactly one row';
  end if;

  if exists (
    select 1
    from admin_security_governance_policy_integrity
    where active_policy_without_rules_count > 10
  ) then
    raise exception 'too many active policies without rules';
  end if;
end $$;
