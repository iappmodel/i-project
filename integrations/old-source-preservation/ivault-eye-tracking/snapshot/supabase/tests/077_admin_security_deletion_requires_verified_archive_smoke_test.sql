do $$
begin
  begin
    perform require_admin_security_deletion_allowed(
      'admin_security_notification_delivery',
      now() - interval '500 days',
      now() - interval '400 days'
    );

    raise exception 'deletion should require verified archive';
  exception
    when others then
      if sqlerrm not like '%verified archive manifest is required before deletion%' then
        raise;
      end if;
  end;
end $$;
