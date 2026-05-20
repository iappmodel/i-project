do $$
declare
  v_campaign_id uuid := gen_random_uuid();
  v_budget_id uuid;
  v_reservation_id uuid;
begin
  v_budget_id := create_campaign_budget(
    v_campaign_id,
    10000,
    null,
    'USD',
    '{"test": true}'::jsonb
  );

  if v_budget_id is null then
    raise exception 'campaign budget was not created';
  end if;

  v_reservation_id := reserve_campaign_budget(
    v_campaign_id,
    2500,
    gen_random_uuid(),
    null,
    gen_random_uuid(),
    null,
    'test_campaign_reservation:' || v_campaign_id::text,
    '{"test": true}'::jsonb
  );

  if v_reservation_id is null then
    raise exception 'campaign budget reservation was not created';
  end if;

  if not exists (
    select 1
    from campaign_budget_summary
    where campaign_id = v_campaign_id
      and funded_amount_minor = 10000
      and reserved_amount_minor = 2500
      and issued_amount_minor = 0
      and available_amount_minor = 7500
  ) then
    raise exception 'campaign budget reserve math failed';
  end if;

  perform mark_campaign_budget_reservation_issued(
    v_reservation_id,
    gen_random_uuid(),
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from campaign_budget_summary
    where campaign_id = v_campaign_id
      and funded_amount_minor = 10000
      and reserved_amount_minor = 0
      and issued_amount_minor = 2500
      and available_amount_minor = 7500
  ) then
    raise exception 'campaign budget issue math failed';
  end if;

  if exists (
    select 1
    from campaign_budget_integrity_check
    where campaign_id = v_campaign_id
      and has_integrity_issue is true
  ) then
    raise exception 'campaign budget integrity check failed';
  end if;
end $$;
