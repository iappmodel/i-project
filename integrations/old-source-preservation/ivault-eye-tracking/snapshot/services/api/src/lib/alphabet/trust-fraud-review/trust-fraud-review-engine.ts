import { getTrustFraudReviewRule } from "@/data/alphabet/trust-fraud-review-rules";
import type { AlphabetEvent } from "@/types/alphabet/event.types";
import type {
  TrustFraudRecommendedAction,
  TrustFraudReviewEvaluationResult,
  TrustFraudReviewSeverity,
  TrustFraudReviewSignalInput,
  TrustFraudReviewStatus
} from "@/types/alphabet/trust-fraud-review.types";
import { ALPHABET_SYSTEM_USER_ID } from "../db-repositories/alphabet-events.repository";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clampScore(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function maxFindingScore(input: TrustFraudReviewSignalInput): number {
  if (!input.findings.length) return 0;

  return Math.max(
    ...input.findings.map((finding) =>
      Math.max(
        finding.scores.trustRiskScore,
        finding.scores.fraudRiskScore,
        finding.scores.walletRiskScore,
        finding.scores.payoutRiskScore,
        finding.scores.campaignRiskScore,
        finding.scores.agePolicyRiskScore,
        finding.scores.identityRiskScore,
        finding.scores.deviceRiskScore,
        finding.scores.rewardAbuseRiskScore,
        finding.scores.presenceRiskScore
      )
    )
  );
}

function calculateBatchRiskScore(input: TrustFraudReviewSignalInput): number {
  let score = 0;

  const critical = input.findings.filter((finding) => finding.severity === "critical").length;
  const danger = input.findings.filter((finding) => finding.severity === "danger").length;
  const money = input.findings.filter(
    (finding) => finding.category === "wallet" || finding.category === "payout"
  ).length;
  const fraud = input.findings.filter((finding) => finding.category === "fraud").length;
  const agePolicy = input.findings.filter((finding) => finding.category === "age_policy").length;

  score += maxFindingScore(input) * 0.35;
  score += Math.min(0.25, critical * 0.08);
  score += Math.min(0.18, danger * 0.04);
  score += Math.min(0.14, money * 0.04);
  score += Math.min(0.12, fraud * 0.035);
  score += Math.min(0.12, agePolicy * 0.04);

  return clampScore(score);
}

function calculateBatchConfidenceScore(input: TrustFraudReviewSignalInput): number {
  if (!input.findings.length) return 0.95;

  const avgConfidence =
    input.findings.reduce((sum, finding) => sum + finding.scores.confidenceScore, 0) /
    input.findings.length;

  let score = avgConfidence * 0.85;

  score += input.periodStart && input.periodEnd ? 0.05 : 0;
  score += input.batchDate ? 0.05 : 0;
  score += input.sourceEventIds.length > 0 ? 0.05 : 0;

  return clampScore(score);
}

function calculateActionUrgencyScore(input: TrustFraudReviewSignalInput): number {
  if (!input.findings.length) return 0;

  let score = 0;

  score += input.findings.some((finding) =>
    finding.recommendedActions.includes("restrict_withdrawals")
  )
    ? 0.22
    : 0;
  score += input.findings.some((finding) =>
    finding.recommendedActions.includes("freeze_wallet_review")
  )
    ? 0.22
    : 0;
  score += input.findings.some((finding) =>
    finding.recommendedActions.includes("escalate_to_compliance")
  )
    ? 0.18
    : 0;
  score += input.findings.some((finding) =>
    finding.recommendedActions.includes("pause_rewards_review")
  )
    ? 0.12
    : 0;
  score += input.findings.some((finding) => finding.severity === "critical") ? 0.2 : 0;
  score += input.findings.length > 10 ? 0.06 : 0;

  return clampScore(score);
}

function chooseSeverity(params: {
  input: TrustFraudReviewSignalInput;
  riskScore: number;
}): TrustFraudReviewSeverity {
  const rule = getTrustFraudReviewRule(params.input.batchScope);

  if (!rule) return "danger";

  if (params.input.findings.some((finding) => finding.severity === "critical")) {
    return "critical";
  }

  if (params.riskScore >= rule.criticalRiskScore) return "critical";
  if (params.riskScore >= rule.dangerRiskScore) return "danger";
  if (params.riskScore >= rule.warningRiskScore) return "warning";

  return "info";
}

function collectRecommendedActions(
  input: TrustFraudReviewSignalInput
): TrustFraudRecommendedAction[] {
  const actions = new Set<TrustFraudRecommendedAction>();

  for (const finding of input.findings) {
    for (const action of finding.recommendedActions) {
      actions.add(action);
    }
  }

  if (!actions.size) actions.add("no_action");

  return [...actions];
}

function decideOutcome(params: {
  input: TrustFraudReviewSignalInput;
  confidenceScore: number;
  riskScore: number;
  urgencyScore: number;
  reasons: string[];
}): TrustFraudReviewEvaluationResult["status"] {
  const rule = getTrustFraudReviewRule(params.input.batchScope);

  if (!rule) {
    params.reasons.push("trust_fraud_review_no_active_rule");
    return "trust_fraud_failed";
  }

  if (params.confidenceScore < rule.minConfidenceScore) {
    params.reasons.push("trust_fraud_review_confidence_below_minimum");
    return "trust_fraud_failed";
  }

  if (
    params.input.findings.some(
      (finding) =>
        finding.severity === "critical" &&
        (finding.category === "wallet" ||
          finding.category === "payout" ||
          finding.category === "age_policy" ||
          finding.category === "identity" ||
          finding.findingType === "sybil_cluster_candidate")
    )
  ) {
    params.reasons.push("trust_fraud_review_critical_finding_requires_review");
    return "trust_fraud_requires_review";
  }

  if (params.riskScore >= rule.criticalRiskScore) {
    params.reasons.push("trust_fraud_review_critical_risk");
    return "trust_fraud_critical";
  }

  if (params.riskScore >= rule.dangerRiskScore) {
    params.reasons.push("trust_fraud_review_danger_risk");
    return "trust_fraud_failed";
  }

  if (params.riskScore >= rule.warningRiskScore || params.urgencyScore > 0.2) {
    params.reasons.push("trust_fraud_review_warning_risk");
    return "trust_fraud_warning";
  }

  params.reasons.push("trust_fraud_review_clean");
  return "trust_fraud_clean";
}

function dbStatusFromOutcome(status: TrustFraudReviewEvaluationResult["status"]): TrustFraudReviewStatus {
  if (status === "trust_fraud_clean") return "trust_fraud_batch_completed";
  if (status === "trust_fraud_warning") return "trust_fraud_batch_completed_with_warnings";
  if (status === "trust_fraud_requires_review") return "trust_fraud_batch_requires_review";
  return "trust_fraud_batch_failed";
}

function createTrustFraudReviewEvent(params: {
  input: TrustFraudReviewSignalInput;
  eventType: AlphabetEvent["eventType"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: ALPHABET_SYSTEM_USER_ID,
    coinCode: "J",
    eventType: params.eventType,
    objectType: "trust_fraud_review_batch",
    objectId: params.input.batchObjectId,
    sourceContext: "trust_fraud_review",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: "unknown",
    verificationStatus: params.verificationStatus,
    metadata: {
      batchScope: params.input.batchScope,
      batchDate: params.input.batchDate,
      ...params.metadata,
      ...((params.input.metadata as Record<string, unknown> | undefined) ?? {})
    },
    createdAt: new Date().toISOString()
  };
}

function shouldOpenOperationalAlert(params: {
  rule: ReturnType<typeof getTrustFraudReviewRule>;
  severity: TrustFraudReviewSeverity;
  clean: boolean;
  failed: boolean;
  critical: boolean;
  requiresReview: boolean;
}): boolean {
  if (!params.rule?.createsOperationalAlert) return false;
  if (params.clean) return false;
  return (
    params.failed ||
    params.critical ||
    params.requiresReview ||
    params.severity === "danger" ||
    params.severity === "critical"
  );
}

function shouldOpenReviewCases(params: {
  rule: ReturnType<typeof getTrustFraudReviewRule>;
  requiresReview: boolean;
  findings: TrustFraudReviewSignalInput["findings"];
}): boolean {
  if (!params.rule?.createsReviewCase) return false;
  if (params.requiresReview) return true;
  return params.findings.some(
    (finding) =>
      finding.severity === "critical" &&
      (finding.category === "wallet" ||
        finding.category === "payout" ||
        finding.category === "age_policy" ||
        finding.category === "identity" ||
        finding.findingType === "sybil_cluster_candidate")
  );
}

export function evaluateTrustFraudReview(
  input: TrustFraudReviewSignalInput
): TrustFraudReviewEvaluationResult {
  const reasons: string[] = [];
  const rule = getTrustFraudReviewRule(input.batchScope);

  const batchRiskScore = calculateBatchRiskScore(input);
  const batchConfidenceScore = calculateBatchConfidenceScore(input);
  const actionUrgencyScore = calculateActionUrgencyScore(input);

  const status = decideOutcome({
    input,
    confidenceScore: batchConfidenceScore,
    riskScore: batchRiskScore,
    urgencyScore: actionUrgencyScore,
    reasons
  });

  const severity = chooseSeverity({
    input,
    riskScore: batchRiskScore
  });

  const findingCount = input.findings.length;
  const criticalFindingCount = input.findings.filter((finding) => finding.severity === "critical").length;
  const fraudFindingCount = input.findings.filter((finding) => finding.category === "fraud").length;
  const walletFindingCount = input.findings.filter((finding) => finding.category === "wallet").length;
  const payoutFindingCount = input.findings.filter((finding) => finding.category === "payout").length;
  const campaignFindingCount = input.findings.filter((finding) => finding.category === "campaign").length;
  const identityFindingCount = input.findings.filter((finding) => finding.category === "identity").length;
  const deviceFindingCount = input.findings.filter((finding) => finding.category === "device").length;
  const rewardFindingCount = input.findings.filter((finding) => finding.category === "reward").length;
  const presenceFindingCount = input.findings.filter((finding) => finding.category === "presence").length;
  const agePolicyFindingCount = input.findings.filter((finding) => finding.category === "age_policy").length;

  const clean = status === "trust_fraud_clean";
  const warning = status === "trust_fraud_warning";
  const failed = status === "trust_fraud_failed";
  const critical = status === "trust_fraud_critical";
  const requiresReview = status === "trust_fraud_requires_review";

  const shouldCreateOperationalAlert = shouldOpenOperationalAlert({
    rule,
    severity,
    clean,
    failed,
    critical,
    requiresReview
  });

  const shouldCreateReviewCase = shouldOpenReviewCases({
    rule,
    requiresReview,
    findings: input.findings
  });

  const recommendedActions = collectRecommendedActions(input);

  const verificationStatus: AlphabetEvent["verificationStatus"] =
    clean || warning ? "verified" : "rejected";

  const base = {
    rawScore: batchConfidenceScore,
    qualityScore: 1 - batchRiskScore,
    riskScore: batchRiskScore,
    verificationStatus,
    metadata: {
      status,
      severity,
      findingCount,
      criticalFindingCount,
      recommendedActions,
      reasons
    }
  };

  const trustFraudReviewStartedEvent = createTrustFraudReviewEvent({
    input,
    eventType: "trust_fraud_review_started",
    ...base
  });

  const trustFraudReviewCompletedEvent = clean
    ? createTrustFraudReviewEvent({
        input,
        eventType: "trust_fraud_review_completed",
        ...base,
        verificationStatus: "verified"
      })
    : null;

  const trustFraudReviewWarningEvent = warning
    ? createTrustFraudReviewEvent({
        input,
        eventType: "trust_fraud_review_warning",
        ...base,
        verificationStatus: "verified"
      })
    : null;

  const trustFraudReviewFailedEvent = failed
    ? createTrustFraudReviewEvent({
        input,
        eventType: "trust_fraud_review_failed",
        ...base,
        verificationStatus: "rejected"
      })
    : null;

  const trustFraudReviewCriticalEvent = critical
    ? createTrustFraudReviewEvent({
        input,
        eventType: "trust_fraud_review_critical",
        ...base,
        verificationStatus: "rejected"
      })
    : null;

  const trustFraudReviewRequiredEvent = requiresReview
    ? createTrustFraudReviewEvent({
        input,
        eventType: "trust_fraud_review_required",
        ...base,
        verificationStatus: "rejected"
      })
    : null;

  return {
    status,
    dbStatus: dbStatusFromOutcome(status),
    severity,
    batchScope: input.batchScope,
    batchDate: input.batchDate,
    findingCount,
    criticalFindingCount,
    fraudFindingCount,
    walletFindingCount,
    payoutFindingCount,
    campaignFindingCount,
    identityFindingCount,
    deviceFindingCount,
    rewardFindingCount,
    presenceFindingCount,
    agePolicyFindingCount,
    batchRiskScore,
    batchConfidenceScore,
    actionUrgencyScore,
    clean,
    warning,
    failed,
    critical,
    requiresReview,
    shouldCreateOperationalAlert,
    shouldCreateReviewCase,
    recommendedActions,
    reasons,
    trustFraudReviewStartedEvent,
    trustFraudReviewCompletedEvent,
    trustFraudReviewWarningEvent,
    trustFraudReviewFailedEvent,
    trustFraudReviewCriticalEvent,
    trustFraudReviewRequiredEvent,
    metadata: {
      ruleBatchScope: rule?.batchScope ?? null,
      ...((input.metadata as Record<string, unknown>) ?? {})
    }
  };
}
