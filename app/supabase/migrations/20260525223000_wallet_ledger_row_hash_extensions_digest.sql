-- wallet_ledger_row_hash_trigger used digest() without schema; on Supabase local
-- pgcrypto lives in extensions, not public search_path.

CREATE OR REPLACE FUNCTION public.wallet_ledger_row_hash_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  NEW.row_hash := encode(
    extensions.digest(
      COALESCE(NEW.id::text, '') || '|' ||
      COALESCE(NEW.user_id::text, '') || '|' ||
      COALESCE(NEW.type, '') || '|' ||
      COALESCE(NEW.amount::text, '') || '|' ||
      COALESCE(NEW.currency, '') || '|' ||
      COALESCE(NEW.ref_id, '') || '|' ||
      COALESCE(NEW.created_at::text, '') || '|' ||
      COALESCE(NEW.metadata::text, '{}'),
      'sha256'
    ),
    'hex'
  );
  RETURN NEW;
END;
$$;
