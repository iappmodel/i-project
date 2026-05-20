do $$
declare
  v_count integer;
begin
  select count(*)
  into v_count
  from admin_security_control_mapping_integrity;

  if v_count <> 1 then
    raise exception 'control mapping integrity should return exactly one row';
  end if;
end $$;
