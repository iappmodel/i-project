/**
 * Server action / Edge boundary (Stage 9 stub).
 *
 * HARD RULES (see docs/backend/studio-security-boundaries.md):
 * - Client must not own ledger, verification pass, fraud finality, settlement release, or dispute resolution with money effect.
 * - Callers here should be server-only (Next.js server actions, Edge Functions, workers) — not imported from UI hot paths.
 */

import { apiError, type ApiResponse } from "./studioApiTypes";

export type StudioServerActionName =
  | "ledger.append"
  | "publish.commit"
  | "verification.update"
  | "fraud.assess"
  | "settlement.release";

/**
 * Placeholder — wire to HTTP/Edge in Stage 10+. Always fails from this stub export.
 */
export async function invokeStudioServerAction(
  _name: StudioServerActionName,
  _payload: Record<string, unknown>
): Promise<ApiResponse<{ ok: true }>> {
  return apiError(
    "NOT_IMPLEMENTED",
    "Server actions are not wired in Stage 9. Use Edge Functions + service role from trusted backend only."
  );
}
