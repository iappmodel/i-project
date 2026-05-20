do $$
begin
  begin
    perform require_admin_security_deletion_allowed(
      'admin_break_glass_request',
      now() - interval '500 days',
      now() - interval '400 days'
    );

    raise exception 'immutable source deletion should fail';
  exception
    when others then
      if sqlerrm not like '%source type is immutable and cannot be deleted%' then
        raise;
      end if;
  end;
end $$;
