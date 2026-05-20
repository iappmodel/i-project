-- Prereqs for Admin Security Evidence Vault (idempotent, minimal)
-- Creates required extension and helper trigger function if missing,
-- and emits notices if expected roles are not present.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  -- Check for the exact public.set_updated_at() signature to avoid matching other functions
  IF to_regprocedure('public.set_updated_at()') IS NULL THEN
    EXECUTE $f$
      CREATE FUNCTION public.set_updated_at()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        NEW.updated_at := now();
        RETURN NEW;
      END;
      $$;
    $f$;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_api_role') THEN
    RAISE NOTICE 'PREREQ: role admin_api_role not found; please create or coordinate with infra/ops before applying dependent migrations.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'worker_role') THEN
    RAISE NOTICE 'PREREQ: role worker_role not found; please create or coordinate with infra/ops before applying dependent migrations.';
  END IF;
END
$$;

