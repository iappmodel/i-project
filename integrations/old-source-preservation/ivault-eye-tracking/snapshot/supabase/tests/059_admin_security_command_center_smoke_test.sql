do $$
declare
  v_summary_count integer;
  v_posture_count integer;
begin
  select count(*)
  into v_summary_count
  from admin_security_command_center_summary;

  if v_summary_count <> 1 then
    raise exception 'admin security command center summary should return exactly one row';
  end if;

  select count(*)
  into v_posture_count
  from admin_security_posture_checks;

  if v_posture_count <= 0 then
    raise exception 'admin security posture checks should return rows';
  end if;
end $$;
