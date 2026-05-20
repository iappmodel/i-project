-- Step 9.89 — Trust mobile/admin alerts v2 (orchestrator).
-- Apply the following parts in order (same DB transaction recommended):
--   db/migrations/parts/224_trust_alerts_v2_01_tables.sql
--   db/migrations/parts/224_trust_alerts_v2_02_core_tables.sql
--   db/migrations/parts/224_trust_alerts_v2_03_functions.sql
--   db/migrations/parts/224_trust_alerts_v2_04_views_jobs_rls_grants.sql
--   db/migrations/parts/224_trust_alerts_v2_05_run_scheduled_job.sql
--
-- Part 05 replaces run_scheduled_job from 223d and must run after alert RPCs exist.

select 1 as admin_security_trust_mobile_admin_alerts_v2_marker;
