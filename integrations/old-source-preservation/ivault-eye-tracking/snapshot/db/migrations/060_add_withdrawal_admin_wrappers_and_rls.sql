-- Step 6.16 — Admin wrappers for withdrawal actions + withdrawal RLS policies.

insert into admin_permissions (
  permission_key,
  permission_name,
  permission_group,
  risk_level,
  requires_mfa,
  requires_case_id,
  requires_approval,
  requires_two_person_rule,
  description
)
values
  (
    'withdrawal.read',
    'Read withdrawal details',
    'withdrawal',
    'medium',
    true,
    false,
    false,
    false,
    'Read withdrawal requests, reserved lots, provider linkage, and status events.'
  ),
  (
    'withdrawal.cancel',
    'Cancel withdrawal',
    'withdrawal',
    'high',
    true,
    true,
    true,
    true,
    'Cancel a withdrawal and release funds when applicable.'
  ),
  (
    'withdrawal.force_reserve',
    'Force reserve withdrawal funds',
    'withdrawal',
    'high',
    true,
    true,
    true,
    true,
    'Manually reserve wallet funds for an approved withdrawal.'
  ),
  (
    'withdrawal.force_submit',
    'Force submit withdrawal to provider',
    'withdrawal',
    'high',
    true,
    true,
    true,
    true,
    'Manually create/attach an external payout for a reserved withdrawal.'
  ),
  (
    'withdrawal.mark_failed_release',
    'Mark withdrawal failed and release funds',
    'withdrawal',
    'critical',
    true,
    true,
    true,
    true,
    'Fail a withdrawal and release reserved funds back to wallet.'
  ),
  (
    'withdrawal.resolve_reversal',
    'Resolve withdrawal reversal review',
    'withdrawal',
    'critical',
    true,
    true,
    true,
    true,
    'Resolve payout reversal review, including wallet recredit or fraud lock.'
  )
on conflict (permission_key)
do update set
  permission_name = excluded.permission_name,
  permission_group = excluded.permission_group,
  risk_level = excluded.risk_level,
  requires_mfa = excluded.requires_mfa,
  requires_case_id = excluded.requires_case_id,
  requires_approval = excluded.requires_approval,
  requires_two_person_rule = excluded.requires_two_person_rule,
  description = excluded.description;

insert into admin_role_permissions (role_id, permission_id)
select r.id, p.id
from admin_roles r
join admin_permissions p
  on (
    (r.role_key = 'support_agent' and p.permission_key in (
      'withdrawal.read'
    ))
    or
    (r.role_key = 'trust_analyst' and p.permission_key in (
      'withdrawal.read'
    ))
    or
    (r.role_key = 'fraud_operator' and p.permission_key in (
      'withdrawal.read',
      'withdrawal.cancel',
      'withdrawal.mark_failed_release',
      'withdrawal.resolve_reversal'
    ))
    or
    (r.role_key = 'finance_operator' and p.permission_key in (
      'withdrawal.read',
      'withdrawal.cancel',
      'withdrawal.force_reserve',
      'withdrawal.force_submit',
      'withdrawal.mark_failed_release',
      'withdrawal.resolve_reversal'
    ))
    or
    (r.role_key = 'admin_manager' and p.permission_key in (
      'withdrawal.read',
      'withdrawal.cancel',
      'withdrawal.force_reserve',
      'withdrawal.force_submit',
      'withdrawal.mark_failed_release',
      'withdrawal.resolve_reversal'
    ))
    or
    (r.role_key = 'super_admin')
  )
on conflict (role_id, permission_id)
do update set
  status = 'active';

create or replace function gated_cancel_withdrawal_request(
  p_admin_user_id uuid,
  p_admin_action_request_id uuid,
  p_withdrawal_request_id uuid,
  p_reason text,
  p_admin_case_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request withdrawal_requests%rowtype;
  v_result uuid;
begin
  if p_withdrawal_request_id is null then
    raise exception 'withdrawal request id is required';
  end if;

  select *
  into v_request
  from withdrawal_requests
  where id = p_withdrawal_request_id;

  if v_request.id is null then
    raise exception 'withdrawal request not found: %', p_withdrawal_request_id;
  end if;

  perform assert_admin_permission(
    p_admin_user_id,
    'withdrawal.cancel',
    p_admin_case_id,
    p_admin_action_request_id,
    'withdrawal_request',
    p_withdrawal_request_id,
    v_request.wallet_id,
    v_request.user_id,
    null,
    p_reason,
    p_metadata
  );

  v_result := cancel_withdrawal_request(
    p_withdrawal_request_id,
    p_reason,
    p_admin_user_id,
    p_admin_case_id,
    p_metadata || jsonb_build_object(
      'admin_action_request_id',
      p_admin_action_request_id
    )
  );

  perform mark_admin_action_executed(
    p_admin_action_request_id,
    p_admin_user_id,
    jsonb_build_object(
      'withdrawal_request_id',
      p_withdrawal_request_id,
      'action',
      'cancel_withdrawal'
    )
  );

  perform emit_platform_event(
    'admin_withdrawal_cancelled',
    'withdrawal',
    'high',
    'admin_api',
    v_request.user_id,
    v_request.wallet_id,
    null,
    null,
    p_admin_user_id,
    'withdrawal_request',
    p_withdrawal_request_id,
    null,
    null,
    'Admin cancelled withdrawal',
    jsonb_build_object(
      'admin_case_id', p_admin_case_id
    ),
    p_metadata
  );

  return v_result;
end;
$$;

create or replace function gated_reserve_wallet_funds_for_withdrawal(
  p_admin_user_id uuid,
  p_admin_action_request_id uuid,
  p_withdrawal_request_id uuid,
  p_reason text,
  p_admin_case_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request withdrawal_requests%rowtype;
  v_result uuid;
begin
  if p_withdrawal_request_id is null then
    raise exception 'withdrawal request id is required';
  end if;

  select *
  into v_request
  from withdrawal_requests
  where id = p_withdrawal_request_id;

  if v_request.id is null then
    raise exception 'withdrawal request not found: %', p_withdrawal_request_id;
  end if;

  perform assert_admin_permission(
    p_admin_user_id,
    'withdrawal.force_reserve',
    p_admin_case_id,
    p_admin_action_request_id,
    'withdrawal_request',
    p_withdrawal_request_id,
    v_request.wallet_id,
    v_request.user_id,
    null,
    p_reason,
    p_metadata
  );

  v_result := reserve_wallet_funds_for_withdrawal(
    p_withdrawal_request_id,
    p_metadata || jsonb_build_object(
      'admin_user_id',
      p_admin_user_id,
      'admin_case_id',
      p_admin_case_id,
      'admin_action_request_id',
      p_admin_action_request_id,
      'reason',
      p_reason
    )
  );

  perform mark_admin_action_executed(
    p_admin_action_request_id,
    p_admin_user_id,
    jsonb_build_object(
      'withdrawal_request_id',
      p_withdrawal_request_id,
      'action',
      'force_reserve_withdrawal'
    )
  );

  perform emit_platform_event(
    'admin_withdrawal_reserved',
    'withdrawal',
    'high',
    'admin_api',
    v_request.user_id,
    v_request.wallet_id,
    null,
    null,
    p_admin_user_id,
    'withdrawal_request',
    p_withdrawal_request_id,
    null,
    null,
    'Admin forced withdrawal reserve',
    jsonb_build_object(
      'admin_case_id', p_admin_case_id
    ),
    p_metadata
  );

  return v_result;
end;
$$;

create or replace function gated_submit_withdrawal_to_provider(
  p_admin_user_id uuid,
  p_admin_action_request_id uuid,
  p_withdrawal_request_id uuid,
  p_provider_key text,
  p_provider_payout_id text default null,
  p_provider_transfer_id text default null,
  p_processor_reference text default null,
  p_reason text default null,
  p_admin_case_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request withdrawal_requests%rowtype;
  v_external_payout_id uuid;
begin
  if p_withdrawal_request_id is null then
    raise exception 'withdrawal request id is required';
  end if;

  select *
  into v_request
  from withdrawal_requests
  where id = p_withdrawal_request_id;

  if v_request.id is null then
    raise exception 'withdrawal request not found: %', p_withdrawal_request_id;
  end if;

  perform assert_admin_permission(
    p_admin_user_id,
    'withdrawal.force_submit',
    p_admin_case_id,
    p_admin_action_request_id,
    'withdrawal_request',
    p_withdrawal_request_id,
    v_request.wallet_id,
    v_request.user_id,
    null,
    p_reason,
    p_metadata
  );

  v_external_payout_id := submit_withdrawal_to_provider(
    p_withdrawal_request_id,
    p_provider_key,
    p_provider_payout_id,
    p_provider_transfer_id,
    p_processor_reference,
    p_metadata || jsonb_build_object(
      'admin_user_id',
      p_admin_user_id,
      'admin_case_id',
      p_admin_case_id,
      'admin_action_request_id',
      p_admin_action_request_id,
      'reason',
      p_reason
    )
  );

  perform mark_admin_action_executed(
    p_admin_action_request_id,
    p_admin_user_id,
    jsonb_build_object(
      'withdrawal_request_id',
      p_withdrawal_request_id,
      'external_payout_id',
      v_external_payout_id,
      'action',
      'force_submit_withdrawal'
    )
  );

  perform emit_platform_event(
    'admin_withdrawal_submitted',
    'withdrawal',
    'high',
    'admin_api',
    v_request.user_id,
    v_request.wallet_id,
    null,
    null,
    p_admin_user_id,
    'withdrawal_request',
    p_withdrawal_request_id,
    null,
    null,
    'Admin forced withdrawal provider submission',
    jsonb_build_object(
      'external_payout_id', v_external_payout_id,
      'provider_key', p_provider_key,
      'admin_case_id', p_admin_case_id
    ),
    p_metadata
  );

  return v_external_payout_id;
end;
$$;

create or replace function gated_mark_withdrawal_failed_and_release(
  p_admin_user_id uuid,
  p_admin_action_request_id uuid,
  p_withdrawal_request_id uuid,
  p_failure_reason text,
  p_external_payout_id uuid default null,
  p_admin_case_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request withdrawal_requests%rowtype;
  v_result uuid;
begin
  if p_withdrawal_request_id is null then
    raise exception 'withdrawal request id is required';
  end if;

  select *
  into v_request
  from withdrawal_requests
  where id = p_withdrawal_request_id;

  if v_request.id is null then
    raise exception 'withdrawal request not found: %', p_withdrawal_request_id;
  end if;

  perform assert_admin_permission(
    p_admin_user_id,
    'withdrawal.mark_failed_release',
    p_admin_case_id,
    p_admin_action_request_id,
    'withdrawal_request',
    p_withdrawal_request_id,
    v_request.wallet_id,
    v_request.user_id,
    null,
    p_failure_reason,
    p_metadata
  );

  v_result := mark_withdrawal_failed_and_release(
    p_withdrawal_request_id,
    p_failure_reason,
    p_external_payout_id,
    p_metadata || jsonb_build_object(
      'admin_user_id',
      p_admin_user_id,
      'admin_case_id',
      p_admin_case_id,
      'admin_action_request_id',
      p_admin_action_request_id
    )
  );

  perform mark_admin_action_executed(
    p_admin_action_request_id,
    p_admin_user_id,
    jsonb_build_object(
      'withdrawal_request_id',
      p_withdrawal_request_id,
      'external_payout_id',
      p_external_payout_id,
      'action',
      'mark_failed_release'
    )
  );

  perform emit_platform_event(
    'admin_withdrawal_failed_released',
    'withdrawal',
    'critical',
    'admin_api',
    v_request.user_id,
    v_request.wallet_id,
    null,
    null,
    p_admin_user_id,
    'withdrawal_request',
    p_withdrawal_request_id,
    null,
    null,
    'Admin failed withdrawal and released funds',
    jsonb_build_object(
      'external_payout_id', p_external_payout_id,
      'admin_case_id', p_admin_case_id
    ),
    p_metadata
  );

  return v_result;
end;
$$;

create or replace function gated_resolve_withdrawal_reversal_review(
  p_admin_user_id uuid,
  p_admin_action_request_id uuid,
  p_review_id uuid,
  p_resolution_action text,
  p_resolution_note text,
  p_admin_case_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_review withdrawal_reversal_review_queue%rowtype;
  v_result uuid;
begin
  if p_review_id is null then
    raise exception 'withdrawal reversal review id is required';
  end if;

  select *
  into v_review
  from withdrawal_reversal_review_queue
  where id = p_review_id;

  if v_review.id is null then
    raise exception 'withdrawal reversal review not found: %', p_review_id;
  end if;

  perform assert_admin_permission(
    p_admin_user_id,
    'withdrawal.resolve_reversal',
    p_admin_case_id,
    p_admin_action_request_id,
    'withdrawal_reversal_review',
    p_review_id,
    v_review.wallet_id,
    v_review.user_id,
    null,
    p_resolution_note,
    p_metadata
  );

  v_result := resolve_withdrawal_reversal_review(
    p_review_id,
    p_admin_user_id,
    p_resolution_action,
    p_resolution_note,
    p_admin_case_id,
    p_metadata || jsonb_build_object(
      'admin_action_request_id',
      p_admin_action_request_id
    )
  );

  perform mark_admin_action_executed(
    p_admin_action_request_id,
    p_admin_user_id,
    jsonb_build_object(
      'withdrawal_reversal_review_id',
      p_review_id,
      'resolution_action',
      p_resolution_action
    )
  );

  perform emit_platform_event(
    'admin_withdrawal_reversal_resolved',
    'withdrawal',
    'critical',
    'admin_api',
    v_review.user_id,
    v_review.wallet_id,
    null,
    null,
    p_admin_user_id,
    'withdrawal_reversal_review',
    p_review_id,
    null,
    null,
    'Admin resolved withdrawal reversal review',
    jsonb_build_object(
      'resolution_action', p_resolution_action,
      'admin_case_id', p_admin_case_id
    ),
    p_metadata
  );

  return v_result;
end;
$$;

create or replace view admin_withdrawal_dashboard as
select
  wr.id as withdrawal_request_id,
  wr.wallet_id,
  wr.user_id,
  wr.currency_code,
  wr.requested_amount_minor,
  wr.processor_fee_minor,
  wr.net_amount_minor,
  wr.status,
  wr.trust_gate_decision,
  wr.provider_key,
  wr.external_payout_id,
  wr.requested_at,
  wr.approved_at,
  wr.reserved_at,
  wr.submitted_at,
  wr.paid_at,
  wr.failed_at,
  wr.cancelled_at,
  wr.reversed_at,
  wr.failure_reason,
  wr.cancellation_reason,

  ep.status as external_payout_status,
  ep.provider_payout_id,
  ep.provider_transfer_id,
  ep.processor_reference,
  ep.paid_at as external_paid_at,
  ep.failed_at as external_failed_at,
  ep.reversed_at as external_reversed_at,

  count(wrl.id) as reserved_lot_count,

  coalesce(sum(wrl.reserved_amount_minor) filter (where wrl.status = 'reserved'), 0)::bigint
    as currently_reserved_minor,

  coalesce(sum(wrl.reserved_amount_minor) filter (where wrl.status = 'consumed'), 0)::bigint
    as consumed_reserved_minor,

  coalesce(sum(wrl.reserved_amount_minor) filter (where wrl.status = 'released'), 0)::bigint
    as released_reserved_minor,

  (
    select count(*)
    from withdrawal_status_events wse
    where wse.withdrawal_request_id = wr.id
  ) as status_event_count,

  wr.metadata

from withdrawal_requests wr
left join external_payouts ep
  on ep.id = wr.external_payout_id
left join withdrawal_reserved_lots wrl
  on wrl.withdrawal_request_id = wr.id
group by wr.id, ep.id;

grant select on admin_withdrawal_dashboard to admin_api_role;
grant select on admin_withdrawal_dashboard to readonly_audit_role;
grant select on admin_withdrawal_dashboard to finance_worker_role;
grant select on admin_withdrawal_dashboard to worker_role;

alter table withdrawal_requests enable row level security;
alter table withdrawal_reserved_lots enable row level security;
alter table withdrawal_status_events enable row level security;
alter table withdrawal_reversal_groups enable row level security;
alter table withdrawal_reversal_review_queue enable row level security;
alter table withdrawal_maintenance_runs enable row level security;
alter table withdrawal_reversal_runs enable row level security;

drop policy if exists withdrawal_requests_user_read_own on withdrawal_requests;
create policy withdrawal_requests_user_read_own
on withdrawal_requests
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists withdrawal_status_events_user_read_own on withdrawal_status_events;
create policy withdrawal_status_events_user_read_own
on withdrawal_status_events
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists withdrawal_reserved_lots_no_user_access on withdrawal_reserved_lots;
create policy withdrawal_reserved_lots_no_user_access
on withdrawal_reserved_lots
for all
to authenticated
using (false)
with check (false);

drop policy if exists withdrawal_reversal_groups_no_user_access on withdrawal_reversal_groups;
create policy withdrawal_reversal_groups_no_user_access
on withdrawal_reversal_groups
for all
to authenticated
using (false)
with check (false);

drop policy if exists withdrawal_reversal_review_queue_no_user_access on withdrawal_reversal_review_queue;
create policy withdrawal_reversal_review_queue_no_user_access
on withdrawal_reversal_review_queue
for all
to authenticated
using (false)
with check (false);

drop policy if exists withdrawal_requests_no_user_insert on withdrawal_requests;
create policy withdrawal_requests_no_user_insert
on withdrawal_requests
for insert
to authenticated
with check (false);

drop policy if exists withdrawal_requests_no_user_update on withdrawal_requests;
create policy withdrawal_requests_no_user_update
on withdrawal_requests
for update
to authenticated
using (false)
with check (false);

drop policy if exists withdrawal_requests_no_user_delete on withdrawal_requests;
create policy withdrawal_requests_no_user_delete
on withdrawal_requests
for delete
to authenticated
using (false);

drop policy if exists app_api_read_withdrawal_requests on withdrawal_requests;
create policy app_api_read_withdrawal_requests
on withdrawal_requests
for select
to app_api_role
using (true);

drop policy if exists app_api_read_withdrawal_status_events on withdrawal_status_events;
create policy app_api_read_withdrawal_status_events
on withdrawal_status_events
for select
to app_api_role
using (true);

drop policy if exists app_api_no_direct_withdrawal_write on withdrawal_requests;
create policy app_api_no_direct_withdrawal_write
on withdrawal_requests
for all
to app_api_role
using (false)
with check (false);

drop policy if exists app_api_no_direct_withdrawal_lot_write on withdrawal_reserved_lots;
create policy app_api_no_direct_withdrawal_lot_write
on withdrawal_reserved_lots
for all
to app_api_role
using (false)
with check (false);

drop policy if exists app_api_no_direct_withdrawal_event_write on withdrawal_status_events;
create policy app_api_no_direct_withdrawal_event_write
on withdrawal_status_events
for all
to app_api_role
using (false)
with check (false);

drop policy if exists admin_api_read_withdrawal_requests on withdrawal_requests;
create policy admin_api_read_withdrawal_requests
on withdrawal_requests
for select
to admin_api_role
using (true);

drop policy if exists admin_api_read_withdrawal_reserved_lots on withdrawal_reserved_lots;
create policy admin_api_read_withdrawal_reserved_lots
on withdrawal_reserved_lots
for select
to admin_api_role
using (true);

drop policy if exists admin_api_read_withdrawal_status_events on withdrawal_status_events;
create policy admin_api_read_withdrawal_status_events
on withdrawal_status_events
for select
to admin_api_role
using (true);

drop policy if exists admin_api_read_withdrawal_reversal_groups on withdrawal_reversal_groups;
create policy admin_api_read_withdrawal_reversal_groups
on withdrawal_reversal_groups
for select
to admin_api_role
using (true);

drop policy if exists admin_api_read_withdrawal_reversal_review_queue on withdrawal_reversal_review_queue;
create policy admin_api_read_withdrawal_reversal_review_queue
on withdrawal_reversal_review_queue
for select
to admin_api_role
using (true);

drop policy if exists admin_api_no_direct_withdrawal_request_write on withdrawal_requests;
create policy admin_api_no_direct_withdrawal_request_write
on withdrawal_requests
for all
to admin_api_role
using (false)
with check (false);

drop policy if exists admin_api_no_direct_withdrawal_reserved_lot_write on withdrawal_reserved_lots;
create policy admin_api_no_direct_withdrawal_reserved_lot_write
on withdrawal_reserved_lots
for all
to admin_api_role
using (false)
with check (false);

drop policy if exists admin_api_no_direct_withdrawal_status_event_write on withdrawal_status_events;
create policy admin_api_no_direct_withdrawal_status_event_write
on withdrawal_status_events
for all
to admin_api_role
using (false)
with check (false);

drop policy if exists admin_api_no_direct_withdrawal_reversal_write on withdrawal_reversal_groups;
create policy admin_api_no_direct_withdrawal_reversal_write
on withdrawal_reversal_groups
for all
to admin_api_role
using (false)
with check (false);

drop policy if exists admin_api_no_direct_withdrawal_reversal_review_write on withdrawal_reversal_review_queue;
create policy admin_api_no_direct_withdrawal_reversal_review_write
on withdrawal_reversal_review_queue
for all
to admin_api_role
using (false)
with check (false);

drop policy if exists finance_worker_all_withdrawal_requests on withdrawal_requests;
create policy finance_worker_all_withdrawal_requests
on withdrawal_requests
for all
to finance_worker_role
using (true)
with check (true);

drop policy if exists finance_worker_all_withdrawal_reserved_lots on withdrawal_reserved_lots;
create policy finance_worker_all_withdrawal_reserved_lots
on withdrawal_reserved_lots
for all
to finance_worker_role
using (true)
with check (true);

drop policy if exists finance_worker_all_withdrawal_status_events on withdrawal_status_events;
create policy finance_worker_all_withdrawal_status_events
on withdrawal_status_events
for all
to finance_worker_role
using (true)
with check (true);

drop policy if exists finance_worker_all_withdrawal_reversal_groups on withdrawal_reversal_groups;
create policy finance_worker_all_withdrawal_reversal_groups
on withdrawal_reversal_groups
for all
to finance_worker_role
using (true)
with check (true);

drop policy if exists finance_worker_all_withdrawal_reversal_review_queue on withdrawal_reversal_review_queue;
create policy finance_worker_all_withdrawal_reversal_review_queue
on withdrawal_reversal_review_queue
for all
to finance_worker_role
using (true)
with check (true);

drop policy if exists finance_worker_all_withdrawal_maintenance_runs on withdrawal_maintenance_runs;
create policy finance_worker_all_withdrawal_maintenance_runs
on withdrawal_maintenance_runs
for all
to finance_worker_role
using (true)
with check (true);

drop policy if exists finance_worker_all_withdrawal_reversal_runs on withdrawal_reversal_runs;
create policy finance_worker_all_withdrawal_reversal_runs
on withdrawal_reversal_runs
for all
to finance_worker_role
using (true)
with check (true);

drop policy if exists worker_read_withdrawal_requests on withdrawal_requests;
create policy worker_read_withdrawal_requests
on withdrawal_requests
for select
to worker_role
using (true);

drop policy if exists worker_read_withdrawal_status_events on withdrawal_status_events;
create policy worker_read_withdrawal_status_events
on withdrawal_status_events
for select
to worker_role
using (true);

drop policy if exists readonly_audit_read_withdrawal_requests on withdrawal_requests;
create policy readonly_audit_read_withdrawal_requests
on withdrawal_requests
for select
to readonly_audit_role
using (true);

drop policy if exists readonly_audit_read_withdrawal_reserved_lots on withdrawal_reserved_lots;
create policy readonly_audit_read_withdrawal_reserved_lots
on withdrawal_reserved_lots
for select
to readonly_audit_role
using (true);

drop policy if exists readonly_audit_read_withdrawal_status_events on withdrawal_status_events;
create policy readonly_audit_read_withdrawal_status_events
on withdrawal_status_events
for select
to readonly_audit_role
using (true);

drop policy if exists readonly_audit_read_withdrawal_reversal_groups on withdrawal_reversal_groups;
create policy readonly_audit_read_withdrawal_reversal_groups
on withdrawal_reversal_groups
for select
to readonly_audit_role
using (true);

drop policy if exists readonly_audit_read_withdrawal_reversal_review_queue on withdrawal_reversal_review_queue;
create policy readonly_audit_read_withdrawal_reversal_review_queue
on withdrawal_reversal_review_queue
for select
to readonly_audit_role
using (true);

grant execute on function create_withdrawal_request(
  uuid,
  uuid,
  bigint,
  text,
  bigint,
  text,
  text,
  jsonb
) to app_api_role;

grant execute on function reserve_wallet_funds_for_withdrawal(uuid, jsonb)
to finance_worker_role;

grant execute on function submit_withdrawal_to_provider(
  uuid,
  text,
  text,
  text,
  text,
  jsonb
) to finance_worker_role;

grant execute on function mark_withdrawal_paid(
  uuid,
  uuid,
  text,
  jsonb
) to finance_worker_role;

grant execute on function mark_withdrawal_failed_and_release(
  uuid,
  text,
  uuid,
  jsonb
) to finance_worker_role;

grant execute on function sync_withdrawal_from_external_payout(uuid, jsonb)
to finance_worker_role;

grant execute on function run_withdrawal_reversal_detection_job(integer, jsonb)
to finance_worker_role;

grant execute on function run_withdrawal_maintenance_job(integer, jsonb)
to finance_worker_role;

grant execute on function gated_cancel_withdrawal_request(
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  jsonb
) to admin_api_role;

grant execute on function gated_reserve_wallet_funds_for_withdrawal(
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  jsonb
) to admin_api_role;

grant execute on function gated_submit_withdrawal_to_provider(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  uuid,
  jsonb
) to admin_api_role;

grant execute on function gated_mark_withdrawal_failed_and_release(
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  uuid,
  jsonb
) to admin_api_role;

grant execute on function gated_resolve_withdrawal_reversal_review(
  uuid,
  uuid,
  uuid,
  text,
  text,
  uuid,
  jsonb
) to admin_api_role;

revoke execute on function reserve_wallet_funds_for_withdrawal(uuid, jsonb)
from admin_api_role;

revoke execute on function submit_withdrawal_to_provider(
  uuid,
  text,
  text,
  text,
  text,
  jsonb
) from admin_api_role;

revoke execute on function mark_withdrawal_paid(
  uuid,
  uuid,
  text,
  jsonb
) from admin_api_role;

revoke execute on function mark_withdrawal_failed_and_release(
  uuid,
  text,
  uuid,
  jsonb
) from admin_api_role;

revoke execute on function resolve_withdrawal_reversal_review(
  uuid,
  uuid,
  text,
  text,
  uuid,
  jsonb
) from admin_api_role;

alter function gated_cancel_withdrawal_request(
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  jsonb
) security definer;

alter function gated_cancel_withdrawal_request(
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  jsonb
) set search_path = public;

alter function gated_reserve_wallet_funds_for_withdrawal(
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  jsonb
) security definer;

alter function gated_reserve_wallet_funds_for_withdrawal(
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  jsonb
) set search_path = public;

alter function gated_submit_withdrawal_to_provider(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  uuid,
  jsonb
) security definer;

alter function gated_submit_withdrawal_to_provider(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  uuid,
  jsonb
) set search_path = public;

alter function gated_mark_withdrawal_failed_and_release(
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  uuid,
  jsonb
) security definer;

alter function gated_mark_withdrawal_failed_and_release(
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  uuid,
  jsonb
) set search_path = public;

alter function gated_resolve_withdrawal_reversal_review(
  uuid,
  uuid,
  uuid,
  text,
  text,
  uuid,
  jsonb
) security definer;

alter function gated_resolve_withdrawal_reversal_review(
  uuid,
  uuid,
  uuid,
  text,
  text,
  uuid,
  jsonb
) set search_path = public;

create or replace view user_withdrawal_summary as
select
  id as withdrawal_request_id,
  user_id,
  wallet_id,
  currency_code,
  requested_amount_minor,
  processor_fee_minor,
  net_amount_minor,
  status,
  requested_at,
  approved_at,
  submitted_at,
  paid_at,
  failed_at,
  cancelled_at,
  reversed_at,
  case
    when status = 'failed' then failure_reason
    when status = 'cancelled' then cancellation_reason
    else null
  end as visible_status_reason,
  created_at,
  updated_at
from withdrawal_requests;

grant select on user_withdrawal_summary to authenticated;

do $$
begin
  begin
    execute 'alter view user_withdrawal_summary set (security_invoker = true)';
  exception
    when others then
      null;
  end;
end
$$;
