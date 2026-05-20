select gen_random_uuid();

select seed_demo_environment(
  'smoke_demo',
  'v1',
  '{"source": "smoke_test"}'::jsonb
);

select run_reward_issuance_job(
  500,
  '{"source": "smoke_test"}'::jsonb
);

select run_accounting_mirror_job(
  500,
  '{"source": "smoke_test"}'::jsonb
);

select run_audit_hash_backfill_job(
  1000,
  '{"source": "smoke_test"}'::jsonb
);

select verify_audit_hash_chain(
  'global_audit_chain',
  100000,
  '{"source": "smoke_test"}'::jsonb
);

select create_system_health_snapshot(
  'manual',
  '{"source": "smoke_test"}'::jsonb
);

select *
from platform_operations_dashboard;

select *
from money_integrity_dashboard;
