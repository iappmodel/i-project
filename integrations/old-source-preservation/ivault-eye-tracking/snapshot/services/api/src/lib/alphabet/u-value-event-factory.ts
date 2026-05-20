import type { CoinCode } from "../../types/alphabet/coin.types";
import type { ConversionExecutionResult } from "../../types/alphabet/conversion-engine.types";
import type { RewardIssuanceResult } from "../../types/alphabet/reward.types";
import type {
  UValueImpactCategory,
  UValueImpactEvent,
  UValueImpactEventType,
  UValueImpactSeverity
} from "../../types/alphabet/u-value.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function createUValueImpactEvent(params: {
  userId: string;
  eventType: UValueImpactEventType;
  category: UValueImpactCategory;
  severity: UValueImpactSeverity;
  coinCode?: CoinCode | null;
  sourceEventId?: string | null;
  objectType?: string | null;
  objectId?: string | null;
  confidence: number;
  metadata?: Record<string, unknown>;
}): UValueImpactEvent {
  return {
    eventId: createId("uvalue_event"),
    userId: params.userId,
    eventType: params.eventType,
    category: params.category,
    severity: params.severity,
    coinCode: params.coinCode ?? null,
    sourceEventId: params.sourceEventId ?? null,
    objectType: params.objectType ?? null,
    objectId: params.objectId ?? null,
    confidence: params.confidence,
    metadata: params.metadata ?? {},
    createdAt: new Date().toISOString()
  };
}

function mapCoinToPositiveEvent(coinCode?: CoinCode | null): {
  eventType: UValueImpactEventType;
  category: UValueImpactCategory;
  severity: UValueImpactSeverity;
  confidence: number;
} {
  switch (coinCode) {
    case "A":
      return {
        eventType: "attention_verified",
        category: "attention",
        severity: "positive_small",
        confidence: 0.75
      };
    case "E":
      return {
        eventType: "engagement_meaningful",
        category: "engagement",
        severity: "positive_small",
        confidence: 0.75
      };
    case "B":
      return {
        eventType: "belonging_constructive",
        category: "belonging",
        severity: "positive_medium",
        confidence: 0.75
      };
    case "C":
      return {
        eventType: "creation_valid",
        category: "creation",
        severity: "positive_medium",
        confidence: 0.8
      };
    case "O":
      return {
        eventType: "originality_verified",
        category: "originality",
        severity: "positive_large",
        confidence: 0.8
      };
    case "L":
      return {
        eventType: "learning_verified",
        category: "learning",
        severity: "positive_medium",
        confidence: 0.8
      };
    case "K":
      return {
        eventType: "knowledge_verified",
        category: "knowledge",
        severity: "positive_medium",
        confidence: 0.8
      };
    case "G":
      return {
        eventType: "growth_verified",
        category: "growth",
        severity: "positive_medium",
        confidence: 0.8
      };
    case "H":
      return {
        eventType: "help_verified",
        category: "help",
        severity: "positive_large",
        confidence: 0.8
      };
    case "N":
      return {
        eventType: "noble_action_verified",
        category: "nobility",
        severity: "positive_rare",
        confidence: 0.85
      };
    case "S":
      return {
        eventType: "safety_contribution_verified",
        category: "safety",
        severity: "positive_large",
        confidence: 0.85
      };
    case "W":
      return {
        eventType: "work_completed",
        category: "work",
        severity: "positive_medium",
        confidence: 0.8
      };
    case "X":
      return {
        eventType: "exchange_clean",
        category: "exchange",
        severity: "positive_medium",
        confidence: 0.75
      };
    case "Y":
      return {
        eventType: "yield_detected",
        category: "yield",
        severity: "positive_large",
        confidence: 0.8
      };
    case "Z":
      return {
        eventType: "zenith_awarded",
        category: "zenith",
        severity: "positive_rare",
        confidence: 0.95
      };
    default:
      return {
        eventType: "alphabet_coin_earned",
        category: "system",
        severity: "positive_small",
        confidence: 0.5
      };
  }
}

export function createUValueEventFromRewardResult(
  result: RewardIssuanceResult
): UValueImpactEvent | null {
  const userId = result.event.userId;

  if (result.issued) {
    const mapped = mapCoinToPositiveEvent(result.targetCoin);

    return createUValueImpactEvent({
      userId,
      eventType: mapped.eventType,
      category: mapped.category,
      severity: mapped.severity,
      coinCode: result.targetCoin ?? null,
      sourceEventId: result.event.eventId,
      objectType: result.event.objectType ?? null,
      objectId: result.event.objectId ?? null,
      confidence: mapped.confidence,
      metadata: {
        finalAmount: result.finalAmount,
        rewardRuleId: result.rule?.rewardRuleId
      }
    });
  }

  const reason = result.reason?.toLowerCase() ?? "";

  if (reason.includes("risk") || reason.includes("fraud")) {
    return createUValueImpactEvent({
      userId,
      eventType: "fraud_detected",
      category: "system",
      severity: "negative_severe",
      coinCode: result.targetCoin ?? null,
      sourceEventId: result.event.eventId,
      confidence: 0.7,
      metadata: {
        reason: result.reason
      }
    });
  }

  if (reason.includes("quality")) {
    return createUValueImpactEvent({
      userId,
      eventType: "low_quality_farming_detected",
      category: "quality",
      severity: "negative_medium",
      coinCode: result.targetCoin ?? null,
      sourceEventId: result.event.eventId,
      confidence: 0.55,
      metadata: {
        reason: result.reason
      }
    });
  }

  return null;
}

export function createUValueEventFromConversionResult(params: {
  userId: string;
  result: ConversionExecutionResult;
}): UValueImpactEvent | null {
  const { userId, result } = params;

  if (result.converted) {
    return createUValueImpactEvent({
      userId,
      eventType: "alphabet_coin_converted",
      category: "value",
      severity: "positive_small",
      coinCode: result.targetCoin ?? null,
      sourceEventId: result.conversion?.conversionId ?? null,
      confidence: 0.6,
      metadata: {
        sourceCoin: result.sourceCoin,
        targetCoin: result.targetCoin,
        sourceAmount: result.sourceAmount,
        targetAmount: result.targetAmount
      }
    });
  }

  const reason = result.reason?.toLowerCase() ?? "";

  if (reason.includes("risk")) {
    return createUValueImpactEvent({
      userId,
      eventType: "payment_abuse_detected",
      category: "value",
      severity: "negative_large",
      coinCode: result.sourceCoin ?? null,
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

export function createUValueEventFromTrustEvent(params: {
  userId: string;
  trustEventType: string;
  sourceEventId?: string | null;
}): UValueImpactEvent | null {
  switch (params.trustEventType) {
    case "identity_verified":
      return createUValueImpactEvent({
        userId: params.userId,
        eventType: "identity_verified",
        category: "identity",
        severity: "positive_medium",
        sourceEventId: params.sourceEventId ?? null,
        confidence: 0.9
      });
    case "minor_safety_violation":
      return createUValueImpactEvent({
        userId: params.userId,
        eventType: "minor_safety_violation",
        category: "safety",
        severity: "catastrophic",
        sourceEventId: params.sourceEventId ?? null,
        confidence: 0.95
      });
    case "chargeback_received":
      return createUValueImpactEvent({
        userId: params.userId,
        eventType: "chargeback_received",
        category: "value",
        severity: "negative_large",
        sourceEventId: params.sourceEventId ?? null,
        confidence: 0.9
      });
    case "plagiarism_detected":
      return createUValueImpactEvent({
        userId: params.userId,
        eventType: "plagiarism_detected",
        category: "creation",
        severity: "negative_large",
        sourceEventId: params.sourceEventId ?? null,
        confidence: 0.85
      });
    default:
      return null;
  }
}
