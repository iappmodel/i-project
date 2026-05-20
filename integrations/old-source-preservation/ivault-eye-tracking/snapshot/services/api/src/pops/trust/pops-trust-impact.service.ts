import { POPS_REWARD_DECISION_STATUS } from "../rewards/pops-reward-decision.types";
import {
  POPS_RECOMMENDED_TRUST_ACTION,
  POPS_TRUST_EVENT_TYPE,
  POPS_TRUST_SEVERITY,
  type CreatePopsTrustEventInput,
  type PopsRewardTrustEvaluationInput,
  type PopsTrustImpactResult,
  type PopsTrustIntegration,
  type TrustEvent,
  type UserTrustRisk,
  type UserTrustTier
} from "./pops-trust.types";
import { recommendedActionFor, severityFromFraudRisk, trustWeightFor } from "./pops-trust-rules";

function nowIso(): string {
  return new Date().toISOString();
}

function clampRisk(risk: number): number {
  return Math.max(0, Math.min(1, Number(risk.toFixed(6))));
}

function stableId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function isoToMillis(value: string): number {
  return new Date(value).getTime();
}

type PatternHistoryItem = {
  userId: string;
  reasonCode: string;
  createdAt: string;
};

const PATTERN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const CLEAN_SESSION_BONUS_THRESHOLD = 20;

export class PopsTrustImpactService {
  private readonly patternHistory: PatternHistoryItem[] = [];
  private readonly cleanSessionsByUser = new Map<string, Set<string>>();
  private readonly consistencyBonusIssuedByUser = new Set<string>();

  constructor(private readonly integration: PopsTrustIntegration) {}

  async createFromRewardDecision(input: PopsRewardTrustEvaluationInput): Promise<PopsTrustImpactResult> {
    const createdAt = input.createdAt ?? nowIso();
    const trustReasonCodes = [...input.reasonCodes];
    const baseEvent = this.mapRewardDecisionToEvent(input, trustReasonCodes);
    let finalEvent = baseEvent;

    const patternEscalation = this.resolvePatternEscalation(input, createdAt);
    if (patternEscalation) {
      finalEvent = patternEscalation;
      trustReasonCodes.push("TRUST_PATTERN_ESCALATION");
    }

    if (this.isCleanSession(input)) {
      this.trackCleanSession(input.userId, input.sessionId);
      if (this.shouldGrantConsistencyBonus(input.userId)) {
        finalEvent = {
          eventType: POPS_TRUST_EVENT_TYPE.CLEAN_CAMPAIGN_COMPLETION,
          severity: POPS_TRUST_SEVERITY.LOW,
          weight: trustWeightFor(POPS_TRUST_EVENT_TYPE.CLEAN_CAMPAIGN_COMPLETION, input.confidence),
          reasonCodes: ["CONSISTENCY_BONUS_20_CLEAN_SESSIONS", ...trustReasonCodes]
        };
        trustReasonCodes.push("CONSISTENCY_BONUS_20_CLEAN_SESSIONS");
        this.consistencyBonusIssuedByUser.add(input.userId);
      }
    }

    const trustEvent = await this.integration.createTrustEvent({
      userId: input.userId,
      sessionId: input.sessionId,
      source: input.source,
      eventType: finalEvent.eventType,
      weight: finalEvent.weight,
      confidence: input.confidence,
      severity: finalEvent.severity,
      reasonCodes: finalEvent.reasonCodes
    });

    return {
      trustEvent,
      trustReasonCodes,
      recommendedTrustAction: recommendedActionFor(
        trustEvent.eventType,
        trustEvent.severity,
        trustEvent.weight
      )
    };
  }

  private mapRewardDecisionToEvent(
    input: PopsRewardTrustEvaluationInput,
    trustReasonCodes: string[]
  ): {
    eventType: TrustEvent["eventType"];
    weight: number;
    severity: TrustEvent["severity"];
    reasonCodes: string[];
  } {
    const severity = severityFromFraudRisk(input.fraudRisk);

    if (
      input.decision === POPS_REWARD_DECISION_STATUS.APPROVED_FULL &&
      input.fraudRisk < 0.15
    ) {
      trustReasonCodes.push("TRUST_APPROVED_FULL_CLEAN");
      return {
        eventType: POPS_TRUST_EVENT_TYPE.VERIFIED_ATTENTION_SESSION,
        weight: trustWeightFor(POPS_TRUST_EVENT_TYPE.VERIFIED_ATTENTION_SESSION, input.confidence),
        severity: POPS_TRUST_SEVERITY.INFO,
        reasonCodes: trustReasonCodes
      };
    }

    if (input.decision === POPS_REWARD_DECISION_STATUS.APPROVED_PARTIAL) {
      const isMostlyClean = input.fraudRisk < 0.25 && !input.reasonCodes.includes("FRAUD_RISK_REVIEW");
      trustReasonCodes.push("TRUST_APPROVED_PARTIAL");
      return {
        eventType: isMostlyClean
          ? POPS_TRUST_EVENT_TYPE.VERIFIED_HUMAN_MOMENT
          : POPS_TRUST_EVENT_TYPE.LOW_CONFIDENCE_SESSION,
        weight: trustWeightFor(
          isMostlyClean
            ? POPS_TRUST_EVENT_TYPE.VERIFIED_HUMAN_MOMENT
            : POPS_TRUST_EVENT_TYPE.LOW_CONFIDENCE_SESSION,
          input.confidence,
          { forceNeutral: !isMostlyClean }
        ),
        severity: isMostlyClean ? POPS_TRUST_SEVERITY.INFO : POPS_TRUST_SEVERITY.LOW,
        reasonCodes: trustReasonCodes
      };
    }

    if (input.decision === POPS_REWARD_DECISION_STATUS.PENDING_REVIEW) {
      trustReasonCodes.push("TRUST_PENDING_REVIEW_MONITOR");
      return {
        eventType: POPS_TRUST_EVENT_TYPE.LOW_CONFIDENCE_SESSION,
        weight: trustWeightFor(POPS_TRUST_EVENT_TYPE.LOW_CONFIDENCE_SESSION, input.confidence, {
          forceNeutral: true
        }),
        severity: POPS_TRUST_SEVERITY.INFO,
        reasonCodes: trustReasonCodes
      };
    }

    if (input.decision === POPS_REWARD_DECISION_STATUS.HELD) {
      const eventType =
        input.fraudRisk >= 0.6
          ? POPS_TRUST_EVENT_TYPE.SUSPICIOUS_AUTOMATION_PATTERN
          : POPS_TRUST_EVENT_TYPE.REPEATED_DEGRADED_SESSION;
      trustReasonCodes.push("TRUST_HELD_SESSION");
      return {
        eventType,
        weight: trustWeightFor(eventType, input.confidence),
        severity,
        reasonCodes: trustReasonCodes
      };
    }

    if (input.decision === POPS_REWARD_DECISION_STATUS.DENIED_FRAUD_RISK) {
      trustReasonCodes.push("TRUST_DENIED_FRAUD_RISK");
      return {
        eventType: POPS_TRUST_EVENT_TYPE.HIGH_FRAUD_RISK_SESSION,
        weight: trustWeightFor(POPS_TRUST_EVENT_TYPE.HIGH_FRAUD_RISK_SESSION, input.confidence),
        severity,
        reasonCodes: trustReasonCodes
      };
    }

    if (input.reasonCodes.includes("DUPLICATE_ATTEMPT")) {
      trustReasonCodes.push("TRUST_DUPLICATE_REWARD_ATTEMPT");
      return {
        eventType: POPS_TRUST_EVENT_TYPE.DUPLICATE_REWARD_ATTEMPT,
        weight: trustWeightFor(POPS_TRUST_EVENT_TYPE.DUPLICATE_REWARD_ATTEMPT, input.confidence),
        severity: POPS_TRUST_SEVERITY.HIGH,
        reasonCodes: trustReasonCodes
      };
    }

    trustReasonCodes.push("TRUST_DECISION_MONITOR");
    return {
      eventType: POPS_TRUST_EVENT_TYPE.LOW_CONFIDENCE_SESSION,
      weight: 0,
      severity: POPS_TRUST_SEVERITY.INFO,
      reasonCodes: trustReasonCodes
    };
  }

  private resolvePatternEscalation(
    input: PopsRewardTrustEvaluationInput,
    createdAt: string
  ): { eventType: TrustEvent["eventType"]; weight: number; severity: TrustEvent["severity"]; reasonCodes: string[] } | null {
    const suspiciousReasonCodes = input.reasonCodes.filter((reasonCode) =>
      [
        "FRAUD_RISK_BLOCKED",
        "FRAUD_RISK_REVIEW",
        "DUPLICATE_ATTEMPT",
        "QUALITY_BELOW_THRESHOLD"
      ].includes(reasonCode)
    );

    if (suspiciousReasonCodes.length === 0) return null;

    const createdAtMs = isoToMillis(createdAt);
    const windowStart = createdAtMs - PATTERN_WINDOW_MS;

    this.patternHistory.push(
      ...suspiciousReasonCodes.map((reasonCode) => ({
        userId: input.userId,
        reasonCode,
        createdAt
      }))
    );

    for (const reasonCode of suspiciousReasonCodes) {
      const countInWindow = this.patternHistory.filter(
        (entry) =>
          entry.userId === input.userId &&
          entry.reasonCode === reasonCode &&
          isoToMillis(entry.createdAt) >= windowStart &&
          isoToMillis(entry.createdAt) <= createdAtMs
      ).length;

      if (countInWindow >= 3) {
        return {
          eventType: POPS_TRUST_EVENT_TYPE.REWARD_ABUSE_PATTERN,
          weight: trustWeightFor(POPS_TRUST_EVENT_TYPE.REWARD_ABUSE_PATTERN, input.confidence),
          severity: POPS_TRUST_SEVERITY.CRITICAL,
          reasonCodes: [`PATTERN_${reasonCode}_3_IN_7_DAYS`, ...input.reasonCodes]
        };
      }
    }

    return null;
  }

  private isCleanSession(input: PopsRewardTrustEvaluationInput): boolean {
    return (
      input.decision === POPS_REWARD_DECISION_STATUS.APPROVED_FULL &&
      input.fraudRisk < 0.15 &&
      !input.reasonCodes.includes("FRAUD_RISK_REVIEW") &&
      !input.reasonCodes.includes("FRAUD_RISK_BLOCKED")
    );
  }

  private trackCleanSession(userId: string, sessionId: string): void {
    const sessions = this.cleanSessionsByUser.get(userId) ?? new Set<string>();
    sessions.add(sessionId);
    this.cleanSessionsByUser.set(userId, sessions);
  }

  private shouldGrantConsistencyBonus(userId: string): boolean {
    if (this.consistencyBonusIssuedByUser.has(userId)) return false;
    return (this.cleanSessionsByUser.get(userId)?.size ?? 0) >= CLEAN_SESSION_BONUS_THRESHOLD;
  }
}

export class MockPopsTrustIntegration implements PopsTrustIntegration {
  private readonly events: TrustEvent[] = [];
  private readonly trustTiers = new Map<string, UserTrustTier>();
  private readonly trustRisk = new Map<string, UserTrustRisk>();

  async createTrustEvent(input: CreatePopsTrustEventInput): Promise<TrustEvent> {
    const event: TrustEvent = {
      id: stableId("pops_trust_event"),
      userId: input.userId,
      sessionId: input.sessionId,
      source: input.source,
      eventType: input.eventType,
      weight: Number(input.weight.toFixed(6)),
      confidence: Number(input.confidence.toFixed(6)),
      severity: input.severity,
      reasonCodes: input.reasonCodes,
      createdAt: nowIso()
    };
    this.events.push(event);
    return event;
  }

  async getUserTrustTier(userId: string): Promise<UserTrustTier> {
    return this.trustTiers.get(userId) ?? { level: 2, label: "STANDARD" };
  }

  async getUserTrustRisk(userId: string): Promise<UserTrustRisk> {
    return this.trustRisk.get(userId) ?? { riskScore: 0.2, riskStatus: "LOW" };
  }

  setUserTrustTier(userId: string, tier: UserTrustTier): void {
    this.trustTiers.set(userId, tier);
  }

  setUserTrustRisk(userId: string, risk: UserTrustRisk): void {
    this.trustRisk.set(userId, { riskScore: clampRisk(risk.riskScore), riskStatus: risk.riskStatus });
  }

  getEvents(): TrustEvent[] {
    return [...this.events];
  }
}

export const popsNoopTrustIntegration: PopsTrustIntegration = {
  createTrustEvent: async (input) => ({
    id: stableId("pops_trust_event"),
    userId: input.userId,
    sessionId: input.sessionId,
    source: input.source,
    eventType: input.eventType,
    weight: input.weight,
    confidence: input.confidence,
    severity: input.severity,
    reasonCodes: input.reasonCodes,
    createdAt: nowIso()
  }),
  getUserTrustTier: async () => ({ level: 2, label: "STANDARD" }),
  getUserTrustRisk: async () => ({ riskScore: 0.25, riskStatus: "LOW" })
};

export function trustContextFromProfiles(input: {
  tier: UserTrustTier;
  risk: UserTrustRisk;
  holdRequired: boolean;
  holdProfile: "NONE" | "STANDARD" | "STRICT";
  payoutEligible: boolean;
  payoutReasonCodes?: string[];
}): PopsRewardTrustEvaluationInput["trustContext"] {
  return {
    trustTier: input.tier,
    risk: input.risk,
    rewardHoldProfile: { holdRequired: input.holdRequired, profile: input.holdProfile },
    payoutEligibilityProfile: {
      eligible: input.payoutEligible,
      reasonCodes: input.payoutReasonCodes ?? []
    }
  };
}

export function recommendedTrustActionFromEvent(
  event: TrustEvent
): PopsTrustImpactResult["recommendedTrustAction"] {
  if (event.reasonCodes.includes("TRUST_PENDING_REVIEW_MONITOR")) {
    return POPS_RECOMMENDED_TRUST_ACTION.MONITOR;
  }
  return recommendedActionFor(event.eventType, event.severity, event.weight);
}
