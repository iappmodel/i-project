do $$
declare
  v_policy_count integer;
  v_integrity_count integer;
begin
  select count(*)
  into v_policy_count
  from admin_security_retention_policies
  where status = 'active';

  if v_policy_count < 5 then
    raise exception 'expected active retention policies';
  end if;

  select count(*)
  into v_integrity_count
  from admin_security_archive_integrity;

  if v_integrity_count <> 1 then
    raise exception 'archive integrity should return exactly one row';
  end if;
end $$;
