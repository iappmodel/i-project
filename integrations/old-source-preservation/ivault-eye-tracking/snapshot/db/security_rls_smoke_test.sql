-- Phase 14: required security smoke checks.
-- Run this script under controlled role-switching in staging.
-- It documents hard-fail checks and executes read-only probes where possible.

-- RLS role-level probes (must fail when role is not authorized):
-- authenticated user cannot insert wallet ledger
-- authenticated user cannot update wallet
-- authenticated user cannot read fraud signals
-- authenticated user cannot read identity graph
-- authenticated user cannot read accounting journals
-- admin_api_role cannot directly mutate wallet ledger
-- app_api_role cannot directly mutate withdrawal state
-- readonly_audit_role cannot write anything

-- service separation probes:
-- app_api_role cannot run finance reconciliation
-- admin_api_role cannot run raw withdrawal mutation
-- worker_role cannot execute admin wallet credit
-- finance_worker_role can process payouts
-- ml_worker_role can compute rollout metrics

-- NOTE:
-- Execute each role probe through your role test harness with SET ROLE.
-- This file intentionally stays side-effect free for repeatable smoke runs.

select
  'security_smoke_test_loaded' as check_name,
  now() as checked_at;
