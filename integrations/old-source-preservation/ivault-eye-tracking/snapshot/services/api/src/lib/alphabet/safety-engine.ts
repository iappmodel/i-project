import { SAFETY_RULES } from "../../data/alphabet/safety-rules";
import type { AlphabetEvent } from "../../types/alphabet/event.types";
import type {
  SafetyRuleSet,
  SafetySignalInput,
  SafetyVerificationResult,
  SafetyVerificationStatus
} from "../../types/alphabet/safety.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function findRule(input: SafetySignalInput): SafetyRuleSet | undefined {
  return SAFETY_RULES.find((rule) => rule.active && rule.context === input.context);
}

function isUnder13(ageBand: string): boolean {
  return ageBand === "under_13";
}

function isTeen(ageBand: string): boolean {
  return ageBand === "13_15" || ageBand === "16_17";
}

function outcomeWeight(input: SafetySignalInput): number {
  switch (input.moderationOutcome) {
    case "no_violation":
      return 0;
    case "warning":
      return 0.45;
    case "content_removed":
      return 0.65;
    case "account_restricted":
      return 0.8;
    case "account_suspended":
      return 0.9;
    case "escalated":
      return 0.85;
    case "law_enforcement_escalation":
      return 1;
    case "pending":
    default:
      return 0.25;
  }
}

function calculateRiskScore(input: SafetySignalInput): number {
  let risk =
    clamp(input.falseReportRisk) * 0.3 +
    clamp(input.brigadingRisk) * 0.25 +
    clamp(input.retaliationRisk) * 0.2 +
    clamp(input.manipulationRisk) * 0.18 +
    (input.reporterDeviceIntegrityScore < 0.5 ? 0.07 : 0);

  if (input.appealReversed) {
    risk += 0.1;
  }

  if (!input.reportValid && input.falseReportRisk > 0.6) {
    risk += 0.15;
  }

  return clamp(risk);
}

function calculateSafetyContributionScore(input: SafetySignalInput): number {
  const validMultiplier = input.reportValid ? 1 : 0.25;
  const reversalPenalty = input.appealReversed ? 0.45 : 1;

  const score =
    clamp(input.evidenceScore) * 0.25 +
    clamp(input.reportClarityScore) * 0.15 +
    clamp(input.reporterHistoryScore) * 0.15 +
    clamp(input.harmSeverity) * 0.18 +
    clamp(input.urgencyScore) * 0.1 +
    outcomeWeight(input) * 0.17;

  return clamp(score * validMultiplier * reversalPenalty);
}

function calculateJudgmentScore(input: SafetySignalInput): number {
  const validMultiplier = input.reportValid ? 1 : 0.15;
  const reversalPenalty = input.appealReversed ? 0.3 : 1;

  const score =
    clamp(input.evidenceScore) * 0.25 +
    clamp(input.reportClarityScore) * 0.2 +
    clamp(input.reporterHistoryScore) * 0.25 +
    outcomeWeight(input) * 0.2 +
    (input.reportValid ? 0.1 : 0);

  return clamp(score * validMultiplier * reversalPenalty);
}

function decideSafetyStatus(params: {
  input: SafetySignalInput;
  rule: SafetyRuleSet;
  safetyContributionScore: number;
  judgmentScore: number;
  riskScore: number;
  reasons: string[];
}): SafetyVerificationStatus {
  const { input, rule, safetyContributionScore, judgmentScore, riskScore, reasons } =
    params;

  if (isUnder13(input.reporterAgeBand) && !rule.under13Allowed) {
    reasons.push("under_13_reporter_not_allowed_for_context");
    return "needs_review";
  }

  if (isTeen(input.reporterAgeBand) && !rule.teenAllowed) {
    reasons.push("teen_reporter_not_allowed_for_context");
    return "needs_review";
  }

  if (input.falseReportRisk > rule.maxFalseReportRisk) {
    reasons.push("false_report_risk_above_maximum");
    return input.reportValid ? "suspicious" : "false_report";
  }

  if (input.brigadingRisk > rule.maxBrigadingRisk) {
    reasons.push("brigading_risk_above_maximum");
    return "suspicious";
  }

  if (input.retaliationRisk > rule.maxRetaliationRisk) {
    reasons.push("retaliation_risk_above_maximum");
    return "suspicious";
  }

  if (riskScore > rule.maxRiskScore) {
    reasons.push("risk_score_above_maximum");
    return input.reportValid ? "needs_review" : "false_report";
  }

  if (rule.requiresStrictReview && input.moderationOutcome === "pending") {
    reasons.push("strict_review_required");
    return "needs_review";
  }

  if (!input.reportValid) {
    reasons.push("report_invalid");
    return input.falseReportRisk >= 0.5 ? "false_report" : "invalid_report";
  }

  if (input.appealReversed) {
    reasons.push("appeal_reversed_report");
    return "invalid_report";
  }

  if (input.evidenceScore < rule.minEvidenceScore) {
    reasons.push("evidence_score_below_minimum");
    return "needs_review";
  }

  if (input.reportClarityScore < rule.minReportClarityScore) {
    reasons.push("report_clarity_below_minimum");
    return "needs_review";
  }

  if (input.reporterHistoryScore < rule.minReporterHistoryScore) {
    reasons.push("reporter_history_below_minimum");
    return "valid_report";
  }

  if (judgmentScore < rule.minJudgmentScore) {
    reasons.push("judgment_score_below_minimum");
    return "valid_report";
  }

  if (
    safetyContributionScore >= rule.minSafetyContributionScore &&
    input.harmSeverity >= rule.minHarmSeverityForSafetyCoin
  ) {
    reasons.push("safety_contribution_verified");
    return "safety_contribution_verified";
  }

  reasons.push("judgment_verified");
  return "judgment_verified";
}

function createSafetyAlphabetEvent(params: {
  input: SafetySignalInput;
  eventType: AlphabetEvent["eventType"];
  coinCode: AlphabetEvent["coinCode"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: params.input.reporterUserId,
    coinCode: params.coinCode,
    eventType: params.eventType,
    objectType: "safety_report",
    objectId: params.input.safetyReportId,
    sourceContext: "system",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: params.input.reporterAgeBand,
    verificationStatus: params.verificationStatus,
    metadata: {
      safetyReportId: params.input.safetyReportId,
      reporterUserId: params.input.reporterUserId,
      reportedUserId: params.input.reportedUserId ?? null,
      context: params.input.context,
      targetObjectType: params.input.objectType,
      targetObjectId: params.input.objectId,
      evidenceScore: params.input.evidenceScore,
      reportClarityScore: params.input.reportClarityScore,
      reporterHistoryScore: params.input.reporterHistoryScore,
      harmSeverity: params.input.harmSeverity,
      urgencyScore: params.input.urgencyScore,
      moderationOutcome: params.input.moderationOutcome,
      reportValid: params.input.reportValid,
      appealReversed: params.input.appealReversed,
      ...params.metadata,
      ...params.input.metadata
    },
    createdAt: new Date().toISOString()
  };
}

export function verifySafetyReport(input: SafetySignalInput): SafetyVerificationResult {
  const reasons: string[] = [];
  const rule = findRule(input);

  const safetyContributionScore = calculateSafetyContributionScore(input);
  const judgmentScore = calculateJudgmentScore(input);
  const riskScore = calculateRiskScore(input);

  if (!rule) {
    reasons.push("no_active_safety_rule");

    const reportSubmittedEvent = createSafetyAlphabetEvent({
      input,
      eventType: "safety_report_submitted",
      coinCode: "S",
      rawScore: safetyContributionScore,
      qualityScore: judgmentScore,
      riskScore,
      verificationStatus: "rejected",
      metadata: { reasons }
    });

    return {
      safetyReportId: input.safetyReportId,
      reporterUserId: input.reporterUserId,
      reportedUserId: input.reportedUserId ?? null,
      status: "suspicious",
      safetyContributionScore,
      judgmentScore,
      riskScore,
      reasons,
      reportSubmittedEvent,
      reportValidatedEvent: null,
      safetyContributionEvent: null,
      judgmentEvent: null,
      falseReportEvent: null,
      metadata: input.metadata ?? {}
    };
  }

  const status = decideSafetyStatus({
    input,
    rule,
    safetyContributionScore,
    judgmentScore,
    riskScore,
    reasons
  });

  const verificationStatus =
    status === "safety_contribution_verified" ||
    status === "judgment_verified" ||
    status === "valid_report"
      ? "verified"
      : "rejected";

  const reportSubmittedEvent = createSafetyAlphabetEvent({
    input,
    eventType: "safety_report_submitted",
    coinCode: "S",
    rawScore: safetyContributionScore,
    qualityScore: judgmentScore,
    riskScore,
    verificationStatus,
    metadata: { status, reasons }
  });

  const reportValidatedEvent =
    status === "safety_contribution_verified" ||
    status === "judgment_verified" ||
    status === "valid_report"
      ? createSafetyAlphabetEvent({
          input,
          eventType: "safety_report_validated",
          coinCode: "S",
          rawScore: safetyContributionScore,
          qualityScore: judgmentScore,
          riskScore,
          verificationStatus: "verified",
          metadata: { status, reasons }
        })
      : null;

  const safetyContributionEvent =
    status === "safety_contribution_verified"
      ? createSafetyAlphabetEvent({
          input,
          eventType: "safety_contribution_verified",
          coinCode: "S",
          rawScore: safetyContributionScore,
          qualityScore: judgmentScore,
          riskScore,
          verificationStatus: "verified",
          metadata: {
            status,
            safetyContributionScore,
            judgmentScore,
            reasons
          }
        })
      : null;

  const judgmentEvent =
    status === "safety_contribution_verified" || status === "judgment_verified"
      ? createSafetyAlphabetEvent({
          input,
          eventType: "judgment_verified",
          coinCode: "J",
          rawScore: judgmentScore,
          qualityScore: judgmentScore,
          riskScore,
          verificationStatus: "verified",
          metadata: {
            issueMode: "score_update",
            status,
            safetyContributionScore,
            judgmentScore,
            reasons
          }
        })
      : null;

  const falseReportEvent =
    status === "false_report"
      ? createSafetyAlphabetEvent({
          input,
          eventType: "false_report_detected",
          coinCode: "J",
          rawScore: 0,
          qualityScore: 0,
          riskScore,
          verificationStatus: "rejected",
          metadata: {
            status,
            safetyContributionScore,
            judgmentScore,
            reasons
          }
        })
      : null;

  return {
    safetyReportId: input.safetyReportId,
    reporterUserId: input.reporterUserId,
    reportedUserId: input.reportedUserId ?? null,
    status,
    safetyContributionScore,
    judgmentScore,
    riskScore,
    reasons,
    reportSubmittedEvent,
    reportValidatedEvent,
    safetyContributionEvent,
    judgmentEvent,
    falseReportEvent,
    metadata: {
      ruleContext: rule.context,
      ...input.metadata
    }
  };
}
