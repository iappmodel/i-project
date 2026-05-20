# Step 6.15 — Ordered Migration Sequence

This repository currently contains many iterative migrations and patch files.  
Use this canonical sequence as the source of truth for a clean, buildable pass.

## Naming Convention

```text
000_enable_extensions.sql
010_core_wallet_schema.sql
020_campaign_budget_schema.sql
030_attention_runtime_schema.sql
040_attention_verification_schema.sql
050_reward_issuance_schema.sql
090_accounting_schema.sql
100_audit_hash_chain_schema.sql
120_withdrawal_schema.sql
160_scheduler_schema.sql
170_error_taxonomy_schema.sql
180_observability_schema.sql
190_rls_and_role_grants.sql
200_views.sql
210_seed_dev_fixtures.sql
```

Core ordering rules:

1. Tables before functions.
2. Base ledgers before engines.
3. Engines before wrappers.
4. Wrappers before RLS/grants.
5. Views after referenced tables/functions.
6. Fixtures last.

## Canonical dependency chain

```text
extensions
  -> wallet
  -> campaign budget
  -> attention runtime
  -> attention verification
  -> reward issuance
  -> accounting
  -> audit hash chain
  -> withdrawal
  -> scheduler
  -> error taxonomy
  -> observability
  -> RLS / grants
  -> views
  -> fixtures
```

## Required patch migrations (during active development)

```text
091_accounting_account_type_patch.sql
121_patch_payout_provider_event_with_withdrawal_sync.sql
161_scheduler_dispatcher_allowlist_patch.sql
181_observability_scheduler_patch.sql
191_withdrawal_rls_patch.sql
```

Notes:

- Use patch files instead of rewriting already-deployed migrations.
- Before production hardening/squash, fold patch content into canonical numbered files.

## Execution checklist

Before run:

1. Confirm `pgcrypto` exists.
2. Confirm `gen_random_uuid()` resolves.
3. Confirm destructive scripts are not pointed at production.
4. Run in strict numeric order.
5. Stop at first failure.
6. Never skip failed migration.
7. Run smoke tests after successful migration run.

Smoke queries:

```sql
select gen_random_uuid();

select * from accounting_accounts limit 5;
select * from admin_permissions limit 5;
select * from scheduled_jobs limit 5;

select create_system_health_snapshot(
  'manual',
  '{"smoke_test": true}'::jsonb
);
```

Dev-only fixture seed:

```sql
select seed_demo_environment(
  'demo_environment',
  'v1',
  '{"smoke_test": true}'::jsonb
);
```

## Dangerous mistakes to avoid

- Do not enable RLS before service policies.
- Do not grant execute on raw admin wallet mutation functions.
- Do not run demo/super-admin fixture creation in production.
- Do not execute dynamic SQL from scheduler dispatch.
- Do not let provider webhooks mutate wallets directly.
- Do not overwrite historical attention events during re-evaluation.
- Do not auto-clawback on re-evaluation outputs.
- Do not persist raw camera evidence by default.
