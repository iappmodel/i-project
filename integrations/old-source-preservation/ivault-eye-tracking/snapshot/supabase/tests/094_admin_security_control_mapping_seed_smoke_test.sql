do $$
declare
  v_framework_count integer;
  v_control_count integer;
  v_mapping_count integer;
begin
  select count(*)
  into v_framework_count
  from admin_security_control_frameworks
  where status = 'active';

  if v_framework_count < 4 then
    raise exception 'expected active control frameworks';
  end if;

  select count(*)
  into v_control_count
  from admin_security_controls
  where status = 'active';

  if v_control_count < 10 then
    raise exception 'expected active controls';
  end if;

  select count(*)
  into v_mapping_count
  from admin_security_policy_control_mappings
  where status = 'active';

  if v_mapping_count < 5 then
    raise exception 'expected policy-control mappings';
  end if;
end $$;
