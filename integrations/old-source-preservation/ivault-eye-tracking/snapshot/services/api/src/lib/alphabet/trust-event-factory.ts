import type { ConversionExecutionResult } from "../../types/alphabet/conversion-engine.types";
import type { RewardIssuanceResult } from "../../types/alphabet/reward.types";
import type {
  TrustImpactCategory,
  TrustImpactEvent,
  TrustImpactEventType,
  TrustImpactSeverity
} from "../../types/alphabet/trust.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function createTrustImpactEvent(params: {
  userId: string;
  eventType: TrustImpactEventType;
  category: TrustImpactCategory;
  severity: TrustImpactSeverity;
  sourceEventId?: string | null;
  objectType?: string | null;
  objectId?: string | null;
  confidence: number;
  metadata?: Record<string, unknown>;
}): TrustImpactEvent {
  return {
    eventId: createId("trust_event"),
    userId: params.userId,
    eventType: params.eventType,
    category: params.category,
    severity: params.severity,
    sourceEventId: params.sourceEventId ?? null,
    objectType: params.objectType ?? null,
    objectId: params.objectId ?? null,
    confidence: params.confidence,
    metadata: params.metadata ?? {},
    createdAt: new Date().toISOString()
  };
}

export function createTrustEventFromRewardResult(
  result: RewardIssuanceResult
): TrustImpactEvent | null {
  const userId = result.event.userId;

  if (result.issued) {
    if (result.targetCoin === "A") {
      return createTrustImpactEvent({
        userId,
        eventType: "attention_verified_clean",
        category: "attention",
        severity: "positive_small",
        sourceEventId: result.event.eventId,
        confidence: 0.8,
        metadata: { targetCoin: result.targetCoin, finalAmount: result.finalAmount }
      });
    }

    if (result.targetCoin === "E") {
      return createTrustImpactEvent({
        userId,
        eventType: "engagement_quality_positive",
        category: "engagement",
        severity: "positive_small",
        sourceEventId: result.event.eventId,
        confidence: 0.8,
        metadata: { targetCoin: result.targetCoin, finalAmount: result.finalAmount }
      });
    }

    if (result.targetCoin === "L" || result.targetCoin === "K") {
      return createTrustImpactEvent({
        userId,
        eventType: "learning_verified_clean",
        category: "learning",
        severity: "positive_small",
        sourceEventId: result.event.eventId,
        confidence: 0.75,
        metadata: { targetCoin: result.targetCoin, finalAmount: result.finalAmount }
      });
    }

    if (result.targetCoin === "W") {
      return createTrustImpactEvent({
        userId,
        eventType: "task_completed_clean",
        category: "work",
        severity: "positive_medium",
        sourceEventId: result.event.eventId,
        confidence: 0.85,
        metadata: { targetCoin: result.targetCoin, finalAmount: result.finalAmount }
      });
    }
  }

  const reason = result.reason?.toLowerCase() ?? "";

  if (
    reason.includes("fraud") ||
    reason.includes("fake") ||
    reason.includes("bot") ||
    reason.includes("sybil") ||
    reason.includes("abuse")
  ) {
    return createTrustImpactEvent({
      userId,
      eventType: "fake_attention_detected",
      category: "attention",
      severity: "negative_medium",
      sourceEventId: result.event.eventId,
      confidence: 0.7,
      metadata: { reason: result.reason }
    });
  }

  if (reason.includes("risk")) {
    return createTrustImpactEvent({
      userId,
      eventType: "fake_attention_detected",
      category: "attention",
      severity: "negative_medium",
      sourceEventId: result.event.eventId,
      confidence: 0.65,
      metadata: { reason: result.reason }
    });
  }

  if (reason.includes("quality")) {
    return createTrustImpactEvent({
      userId,
      eventType: "engagement_spam_detected",
      category: "engagement",
      severity: "negative_medium",
      sourceEventId: result.event.eventId,
      confidence: 0.5,
      metadata: { reason: result.reason }
    });
  }

  return null;
}

export function createTrustEventFromConversionResult(params: {
  userId: string;
  result: ConversionExecutionResult;
}): TrustImpactEvent | null {
  const { userId, result } = params;

  if (result.converted) {
    return createTrustImpactEvent({
      userId,
      eventType: "exchange_completed_clean",
      category: "exchange",
      severity: "positive_small",
      sourceEventId: result.conversion?.conversionId ?? null,
      confidence: 0.75,
      metadata: {
        sourceCoin: result.sourceCoin,
        targetCoin: result.targetCoin,
        sourceAmount: result.sourceAmount,
        targetAmount: result.targetAmount
      }
    });
  }

  const reason = result.reason?.toLowerCase() ?? "";

  if (
    reason.includes("fraud") ||
    reason.includes("abuse") ||
    reason.includes("chargeback") ||
    reason.includes("refund")
  ) {
    return createTrustImpactEvent({
      userId,
      eventType: "refund_abuse_detected",
      category: "payment",
      severity: "negative_large",
      sourceEventId: null,
      confidence: 0.65,
      metadata: {
        reason: result.reason,
        sourceCoin: result.sourceCoin,
        targetCoin: result.targetCoin
      }
    });
  }

  if (reason.includes("risk")) {
    return createTrustImpactEvent({
      userId,
      eventType: "refund_abuse_detected",
      category: "payment",
      severity: "negative_large",
      sourceEventId: null,
      confidence: 0.5,
      metadata: {
        reason: result.reason,
        sourceCoin: result.sourceCoin,
        targetCoin: result.targetCoin
      }
    });
  }

  return null;
}

export function createTrustEventFromWalletRiskAction(params: {
  userId: string;
  action: "lock" | "revoke";
  reason: string;
  sourceEventId?: string | null;
}): TrustImpactEvent {
  const normalizedReason = params.reason.toLowerCase();

  if (normalizedReason.includes("fraud")) {
    return createTrustImpactEvent({
      userId: params.userId,
      eventType: "task_fraud_detected",
      category: "work",
      severity: "negative_large",
      sourceEventId: params.sourceEventId ?? null,
      confidence: 0.8,
      metadata: {
        walletAction: params.action,
        reason: params.reason
      }
    });
  }

  if (normalizedReason.includes("chargeback")) {
    return createTrustImpactEvent({
      userId: params.userId,
      eventType: "chargeback_received",
      category: "payment",
      severity: "negative_severe",
      sourceEventId: params.sourceEventId ?? null,
      confidence: 0.9,
      metadata: {
        walletAction: params.action,
        reason: params.reason
      }
    });
  }

  return createTrustImpactEvent({
    userId: params.userId,
    eventType: "manual_admin_adjustment",
    category: "system",
    severity: params.action === "revoke" ? "negative_large" : "negative_medium",
    sourceEventId: params.sourceEventId ?? null,
    confidence: 0.6,
    metadata: {
      walletAction: params.action,
      reason: params.reason
    }
  });
}
