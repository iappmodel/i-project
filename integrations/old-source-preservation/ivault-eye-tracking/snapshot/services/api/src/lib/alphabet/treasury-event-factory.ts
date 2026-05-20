import type { CoinCode } from "../../types/alphabet/coin.types";
import type { TreasuryEvaluationResult } from "../../types/alphabet/treasury.types";
import type { TrustImpactEvent } from "../../types/alphabet/trust.types";
import type { UValueImpactEvent } from "../../types/alphabet/u-value.types";
import { createTrustImpactEvent } from "./trust-event-factory";
import { createUValueImpactEvent } from "./u-value-event-factory";

export function createTrustEventFromTreasuryEvaluation(
  result: TreasuryEvaluationResult
): TrustImpactEvent | null {
  if (result.status === "healthy") {
    return createTrustImpactEvent({
      userId: "system",
      eventType: "treasury_healthy",
      category: "reputation",
      severity: "positive_small",
      sourceEventId: result.treasurySnapshotCreatedEvent.eventId,
      confidence: 0.65,
      metadata: {
        treasuryAccountId: result.treasuryAccountId,
        reserveType: result.reserveType,
        solvencyScore: result.solvencyScore,
        budgetHealthScore: result.budgetHealthScore,
        reserveCoverageRatio: result.reserveCoverageRatio
      }
    });
  }

  if (result.treasuryRiskDetectedEvent) {
    return createTrustImpactEvent({
      userId: "system",
      eventType: "treasury_risk_detected",
      category: "payment",
      severity: result.status === "critical" ? "negative_large" : "negative_medium",
      sourceEventId: result.treasuryRiskDetectedEvent.eventId,
      confidence: 0.85,
      metadata: {
        treasuryAccountId: result.treasuryAccountId,
        reserveType: result.reserveType,
        status: result.status,
        reasons: result.reasons,
        treasuryRiskScore: result.treasuryRiskScore
      }
    });
  }

  return null;
}

export function createUValueEventFromTreasuryEvaluation(
  result: TreasuryEvaluationResult
): UValueImpactEvent | null {
  if (result.budgetRejected || result.liquidityLocked || result.reserveLocked) {
    return createUValueImpactEvent({
      userId: "system",
      eventType: result.liquidityLocked
        ? "treasury_liquidity_locked"
        : "treasury_budget_blocked",
      category: "economic",
      severity: result.status === "critical" ? "negative_large" : "negative_medium",
      coinCode: result.coinCode as CoinCode,
      sourceEventId:
        result.liquidityPoolLockedEvent?.eventId ??
        result.budgetRejectedEvent?.eventId ??
        result.treasuryRiskDetectedEvent?.eventId ??
        null,
      confidence: 0.85,
      metadata: {
        treasuryAccountId: result.treasuryAccountId,
        reserveType: result.reserveType,
        status: result.status,
        reasons: result.reasons
      }
    });
  }

  return null;
}
