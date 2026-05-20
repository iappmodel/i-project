import type { PopsCompletionTransaction } from "./pops-repository.types";

/**
 * Supabase's PostgREST client does not provide multi-statement transaction
 * control from the client. We keep a transaction abstraction so in-memory tests
 * can roll back atomically, while Postgres stays best-effort until this flow
 * is moved to a DB function or direct pg client transaction.
 */
export class PostgresPopsTransaction implements PopsCompletionTransaction {
  async runInTransaction<T>(fn: () => Promise<T>): Promise<T> {
    return fn();
  }
}
