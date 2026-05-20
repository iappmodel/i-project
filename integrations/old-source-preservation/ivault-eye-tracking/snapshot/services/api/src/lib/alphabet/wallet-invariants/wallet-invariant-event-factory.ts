import { ALPHABET_SYSTEM_USER_ID } from "../db-repositories/alphabet-events.repository";
import { createTrustImpactEvent } from "../trust-event-factory";
import { createUValueImpactEvent } from "../u-value-event-factory";
import type { WalletInvariantEvaluationResult } from "@/types/alphabet/wallet-invariant.types";
import type { TrustImpactEvent } from "@/types/alphabet/trust.types";
import type { UValueImpactEvent } from "@/types/alphabet/u-value.types";

function subjectUserId(result: WalletInvariantEvaluationResult): string {
  const meta = result.walletInvariantScanStartedEvent.metadata;
  if (meta && typeof meta === "object" && "linkedObjectIds" in meta) {
    const uid = (meta as { linkedObjectIds?: { userId?: string | null } }).linkedObjectIds?.userId;
    if (typeof uid === "string" && uid.length > 0) return uid;
  }
  return ALPHABET_SYSTEM_USER_ID;
}

export function createTrustEventFromWalletInvariantResult(
  result: WalletInvariantEvaluationResult
): TrustImpactEvent | null {
  if (result.passed) {
    return createTrustImpactEvent({
      userId: subjectUserId(result),
      eventType: "wallet_invariant_clean",
      category: "reputation",
      severity: "positive_small",
      sourceEventId: result.walletInvariantPassedEvent?.eventId ?? null,
      confidence: result.invariantConfidenceScore,
      metadata: {
        invariantType: result.invariantType,
        scanScope: result.scanScope
      }
    });
  }

  if (result.failed || result.critical) {
    return createTrustImpactEvent({
      userId: subjectUserId(result),
      eventType: "wallet_invariant_failed",
      category: "reputation",
      severity: result.critical ? "negative_medium" : "negative_small",
      sourceEventId:
        result.walletInvariantCriticalEvent?.eventId ??
        result.walletInvariantFailedEvent?.eventId ??
        null,
      confidence: result.invariantConfidenceScore,
      metadata: {
        invariantType: result.invariantType,
        scanScope: result.scanScope,
        reasons: result.reasons
      }
    });
  }

  return null;
}

export function createUValueEventFromWalletInvariantResult(
  result: WalletInvariantEvaluationResult
): UValueImpactEvent | null {
  if (result.passed) {
    return createUValueImpactEvent({
      userId: subjectUserId(result),
      eventType: "wallet_invariant_passed",
      category: "trust",
      severity: "positive_small",
      coinCode: "J",
      sourceEventId: result.walletInvariantPassedEvent?.eventId ?? null,
      confidence: result.invariantConfidenceScore,
      metadata: {
        invariantType: result.invariantType
      }
    });
  }

  if (result.failed || result.critical) {
    return createUValueImpactEvent({
      userId: subjectUserId(result),
      eventType: "wallet_invariant_failed",
      category: "trust",
      severity: "negative_small",
      coinCode: "J",
      sourceEventId:
        result.walletInvariantCriticalEvent?.eventId ??
        result.walletInvariantFailedEvent?.eventId ??
        null,
      confidence: result.invariantConfidenceScore,
      metadata: {
        invariantType: result.invariantType,
        reasons: result.reasons
      }
    });
  }

  return null;
}
