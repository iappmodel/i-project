import { WORK_RULES } from "../../data/alphabet/work-rules";
import type { AlphabetEvent } from "../../types/alphabet/event.types";
import type {
  WorkRuleSet,
  WorkSignalInput,
  WorkVerificationResult,
  WorkVerificationStatus
} from "../../types/alphabet/work.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function findRule(input: WorkSignalInput): WorkRuleSet | undefined {
  return WORK_RULES.find((rule) => rule.active && rule.context === input.context);
}

function isUnder13(ageBand: string): boolean {
  return ageBand === "under_13";
}

function isTeen(ageBand: string): boolean {
  return ageBand === "13_15" || ageBand === "16_17";
}

function calculateQualityScore(input: WorkSignalInput): number {
  const score =
    clamp(input.clientSatisfactionScore) * 0.22 +
    clamp(input.deliveryQualityScore) * 0.28 +
    clamp(input.requirementMatchScore) * 0.25 +
    clamp(input.timelinessScore) * 0.15 +
    clamp(input.revisionScore) * 0.1;

  return clamp(score);
}

function calculateWorkScore(input: WorkSignalInput): number {
  const qualityScore = calculateQualityScore(input);
  const durationScore = clamp(input.deliveryDurationMs / (60 * 60 * 1000));

  const clientMultiplier = input.clientConfirmed ? 1 : 0.75;
  const deliveredMultiplier = input.delivered ? 1 : 0;

  const score =
    qualityScore * 0.45 +
    clamp(input.requirementMatchScore) * 0.2 +
    clamp(input.independentVerificationScore) * 0.15 +
    clamp(input.systemValidationScore) * 0.12 +
    durationScore * 0.08;

  return clamp(score * clientMultiplier * deliveredMultiplier);
}

function calculateExchangeScore(input: WorkSignalInput): number {
  const escrowScore = input.escrowClean ? 1 : 0.35;
  const paymentScore = input.paymentClean ? 1 : 0.25;
  const noDisputeScore =
    input.disputeStatus === "none" || input.disputeStatus === "resolved_clean"
      ? 1
      : 0.3;

  const score =
    escrowScore * 0.25 +
    paymentScore * 0.3 +
    noDisputeScore * 0.2 +
    clamp(input.clientSatisfactionScore) * 0.15 +
    clamp(input.systemValidationScore) * 0.1;

  return clamp(score);
}

function calculateRiskScore(input: WorkSignalInput): number {
  let risk =
    clamp(input.fraudRisk) * 0.25 +
    clamp(input.taskFarmingRisk) * 0.2 +
    clamp(input.collusionRisk) * 0.2 +
    clamp(input.chargebackRisk) * 0.15 +
    clamp(input.refundAbuseRisk) * 0.12 +
    (input.deviceIntegrityScore < 0.5 ? 0.08 : 0);

  if (!input.delivered) risk += 0.15;
  if (!input.paymentClean) risk += 0.1;
  if (!input.escrowClean) risk += 0.08;
  if (input.disputeStatus === "worker_fault") risk += 0.15;
  if (input.disputeStatus === "unresolved") risk += 0.1;

  return clamp(risk);
}

function decideWorkStatus(params: {
  input: WorkSignalInput;
  rule: WorkRuleSet;
  workScore: number;
  exchangeScore: number;
  qualityScore: number;
  riskScore: number;
  reasons: string[];
}): WorkVerificationStatus {
  const { input, rule, workScore, exchangeScore, qualityScore, riskScore, reasons } =
    params;

  if (isUnder13(input.workerAgeBand) && !rule.allowsUnder13Worker) {
    reasons.push("under_13_worker_not_allowed_for_context");
    return "suspicious";
  }

  if (isTeen(input.workerAgeBand) && !rule.allowsTeenWorker) {
    reasons.push("teen_worker_not_allowed_for_context");
    return "suspicious";
  }

  if (input.taskValue < rule.minTaskValue) {
    reasons.push("task_value_below_minimum");
    return "rejected";
  }

  if (!input.delivered) {
    reasons.push("work_not_delivered");
    return "rejected";
  }

  if (input.deliveryDurationMs < rule.minDeliveryDurationMs) {
    reasons.push("delivery_duration_below_minimum");
    return "completed_needs_review";
  }

  if (rule.requiresClientConfirmation && !input.clientConfirmed) {
    reasons.push("client_confirmation_required");
    return "completed_needs_review";
  }

  if (input.disputeStatus === "opened" || input.disputeStatus === "unresolved") {
    reasons.push("work_dispute_opened");
    return "disputed";
  }

  if (input.disputeStatus === "worker_fault") {
    reasons.push("work_dispute_worker_fault");
    return "rejected";
  }

  if (input.fraudRisk > rule.maxFraudRisk) {
    reasons.push("fraud_risk_above_maximum");
    return "suspicious";
  }

  if (input.collusionRisk > rule.maxCollusionRisk) {
    reasons.push("collusion_risk_above_maximum");
    return "suspicious";
  }

  if (input.chargebackRisk > rule.maxChargebackRisk) {
    reasons.push("chargeback_risk_above_maximum");
    return "suspicious";
  }

  if (riskScore > rule.maxRiskScore) {
    reasons.push("risk_score_above_maximum");
    return riskScore > 0.75 ? "suspicious" : "completed_needs_review";
  }

  if (rule.requiresCleanPayment && (!input.escrowClean || !input.paymentClean)) {
    reasons.push("payment_or_escrow_not_clean");
    return "completed_needs_review";
  }

  if (input.clientSatisfactionScore < rule.minClientSatisfactionScore) {
    reasons.push("client_satisfaction_below_minimum");
    return "completed_needs_review";
  }

  if (input.deliveryQualityScore < rule.minDeliveryQualityScore) {
    reasons.push("delivery_quality_below_minimum");
    return "completed_needs_review";
  }

  if (input.requirementMatchScore < rule.minRequirementMatchScore) {
    reasons.push("requirement_match_below_minimum");
    return "completed_needs_review";
  }

  if (qualityScore < rule.minQualityScore) {
    reasons.push("quality_score_below_minimum");
    return "completed_needs_review";
  }

  if (workScore < rule.minWorkScore) {
    reasons.push("work_score_below_minimum");
    return "completed_needs_review";
  }

  if (exchangeScore >= rule.minExchangeScore) {
    reasons.push("exchange_verified");
    return "exchange_verified";
  }

  reasons.push("work_verified");
  return "work_verified";
}

function sourceContextFromWorkContext(
  context: WorkSignalInput["context"]
): AlphabetEvent["sourceContext"] {
  switch (context) {
    case "learning_task":
      return "learning";
    case "creator_service":
      return "creator";
    case "brand_task":
      return "campaign";
    case "freelance":
    case "local_service":
    case "marketplace_task":
      return "marketplace";
    case "microtask":
    case "moderation_task":
    case "general_task":
    default:
      return "marketplace";
  }
}

function createWorkAlphabetEvent(params: {
  input: WorkSignalInput;
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
    userId: params.input.workerUserId,
    coinCode: params.coinCode,
    eventType: params.eventType,
    objectType: "work_task",
    objectId: params.input.workTaskId,
    sourceContext: sourceContextFromWorkContext(params.input.context),
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: params.input.workerAgeBand,
    verificationStatus: params.verificationStatus,
    metadata: {
      workTaskId: params.input.workTaskId,
      workerUserId: params.input.workerUserId,
      clientUserId: params.input.clientUserId ?? null,
      businessId: params.input.businessId ?? null,
      context: params.input.context,
      taskValue: params.input.taskValue,
      delivered: params.input.delivered,
      clientConfirmed: params.input.clientConfirmed,
      disputeStatus: params.input.disputeStatus,
      escrowClean: params.input.escrowClean,
      paymentClean: params.input.paymentClean,
      ...params.metadata,
      ...params.input.metadata
    },
    createdAt: new Date().toISOString()
  };
}

export function verifyWorkTask(input: WorkSignalInput): WorkVerificationResult {
  const reasons: string[] = [];
  const rule = findRule(input);

  const workScore = calculateWorkScore(input);
  const exchangeScore = calculateExchangeScore(input);
  const qualityScore = calculateQualityScore(input);
  const riskScore = calculateRiskScore(input);

  if (!rule) {
    reasons.push("no_active_work_rule");

    const workDeliveredEvent = createWorkAlphabetEvent({
      input,
      eventType: "work_delivered",
      coinCode: "W",
      rawScore: workScore,
      qualityScore,
      riskScore,
      verificationStatus: "rejected",
      metadata: { reasons }
    });

    return {
      workTaskId: input.workTaskId,
      workerUserId: input.workerUserId,
      clientUserId: input.clientUserId ?? null,
      businessId: input.businessId ?? null,
      status: "suspicious",
      workScore,
      exchangeScore,
      qualityScore,
      riskScore,
      reasons,
      workDeliveredEvent,
      workVerifiedEvent: null,
      exchangeCompletedEvent: null,
      disputeEvent: null,
      fraudEvent: null,
      metadata: input.metadata ?? {}
    };
  }

  const status = decideWorkStatus({
    input,
    rule,
    workScore,
    exchangeScore,
    qualityScore,
    riskScore,
    reasons
  });

  const verificationStatus =
    status === "work_verified" || status === "exchange_verified"
      ? "verified"
      : "rejected";

  const workDeliveredEvent = createWorkAlphabetEvent({
    input,
    eventType: "work_delivered",
    coinCode: "W",
    rawScore: workScore,
    qualityScore,
    riskScore,
    verificationStatus,
    metadata: { status, reasons }
  });

  const workVerifiedEvent =
    status === "work_verified" || status === "exchange_verified"
      ? createWorkAlphabetEvent({
          input,
          eventType: "work_verified",
          coinCode: "W",
          rawScore: workScore,
          qualityScore,
          riskScore,
          verificationStatus: "verified",
          metadata: {
            status,
            workScore,
            exchangeScore,
            reasons
          }
        })
      : null;

  const exchangeCompletedEvent =
    status === "exchange_verified"
      ? createWorkAlphabetEvent({
          input,
          eventType: "exchange_completed",
          coinCode: "X",
          rawScore: exchangeScore,
          qualityScore,
          riskScore,
          verificationStatus: "verified",
          metadata: {
            issueMode: "score_update",
            status,
            workScore,
            exchangeScore,
            reasons
          }
        })
      : null;

  const disputeEvent =
    status === "disputed"
      ? createWorkAlphabetEvent({
          input,
          eventType: "work_dispute_opened",
          coinCode: "W",
          rawScore: 0,
          qualityScore,
          riskScore,
          verificationStatus: "rejected",
          metadata: { status, reasons }
        })
      : null;

  const fraudEvent =
    status === "suspicious"
      ? createWorkAlphabetEvent({
          input,
          eventType: "work_fraud_detected",
          coinCode: "W",
          rawScore: 0,
          qualityScore: 0,
          riskScore,
          verificationStatus: "rejected",
          metadata: { status, reasons }
        })
      : null;

  return {
    workTaskId: input.workTaskId,
    workerUserId: input.workerUserId,
    clientUserId: input.clientUserId ?? null,
    businessId: input.businessId ?? null,
    status,
    workScore,
    exchangeScore,
    qualityScore,
    riskScore,
    reasons,
    workDeliveredEvent,
    workVerifiedEvent,
    exchangeCompletedEvent,
    disputeEvent,
    fraudEvent,
    metadata: {
      ruleContext: rule.context,
      ...input.metadata
    }
  };
}
