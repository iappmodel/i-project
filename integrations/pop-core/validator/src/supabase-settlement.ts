import type { PendingHoldRecord } from "@pop-core/backend";
import { SETTLEMENT_CURRENCY_V1 } from "@pop-core/backend";
import type { SettlementCurrency } from "@pop-core/backend";

export type LedgerCurrency = "icoin" | "vicoin";

/** ADR-001 boundary: POP Tier-1 labels → archive ledger coins. */
export function mapPopCurrencyToLedger(
  currency: SettlementCurrency | string | null | undefined
): LedgerCurrency {
  const normalized = String(currency ?? SETTLEMENT_CURRENCY_V1).toUpperCase();
  if (normalized === "VICOIN" || normalized === "V") return "vicoin";
  return "icoin";
}

export interface PopPendingHoldRow {
  session_id: string;
  user_id: string | null;
  local_user_ref: string;
  offer_id: string;
  content_id: string;
  artifact_id: string | null;
  review_status: string;
  amount: number;
  currency: LedgerCurrency;
  hold_status: "pending";
  release_status: string;
  ledger_ref_id: string;
}

export function pendingHoldToRow(hold: PendingHoldRecord): PopPendingHoldRow {
  const currency = mapPopCurrencyToLedger(hold.amountBreakdown?.currency);

  return {
    session_id: hold.sessionId,
    user_id: hold.userId ?? null,
    local_user_ref: hold.localUserRef,
    offer_id: hold.offerId,
    content_id: hold.contentId,
    artifact_id: hold.artifactId ?? null,
    review_status: hold.reviewAudit.reviewStatus,
    amount: hold.amount ?? 0,
    currency,
    hold_status: "pending",
    release_status: hold.releaseStatus,
    ledger_ref_id: `pop_hold_${hold.sessionId}`
  };
}

export interface SupabaseSettlementConfig {
  url: string;
  serviceRoleKey: string;
}

export function readSupabaseSettlementConfig():
  | SupabaseSettlementConfig
  | null {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) return null;
  return { url, serviceRoleKey };
}
