import { getAdminReviewHookRule } from "@/data/alphabet/admin-review-hook-rules";
import type { AlphabetEvent } from "@/types/alphabet/event.types";
import type {
  AdminReviewHookEvaluationResult,
  AdminReviewHookInput,
  AdminReviewHookOutcomeStatus,
  AdminReviewHookRuleSet
} from "@/types/alphabet/admin-review-hooks.types";
import type { AdminReviewPriority, AdminReviewSeverity } from "@/types/alphabet/admin-review.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

export function buildIdempotencyKeyFromInput(input: AdminReviewHookInput): string {
  return [
    "review-hook",
    input.hookSource,
    input.hookTrigger,
    input.sourceObjectType,
    input.sourceObjectId
  ].join(":");
}

export function buildDedupeKeyFromInput(input: AdminReviewHookInput): string {
  const subject =
    input.subjectIds.externalTransferId ??
    input.subjectIds.compensationId ??
    input.subjectIds.providerReconciliationId ??
    input.subjectIds.pipelineId ??
    input.subjectIds.executionRequestId ??
    input.subjectIds.walletId ??
    input.subjectIds.userId ??
    input.sourceObjectId;

  return ["review-case", input.hookTrigger, subject].join(":");
}

function calculateHookRiskScore(input: AdminReviewHookInput): number {
  let score = 0;

  score += input.riskScore * 0.35;
  score += input.uncertaintyScore * 0.25;
  score += input.platformImpactScore * 0.2;
  score += input.userImpactScore * 0.1;
  score += input.paymentUncertainty ? 0.08 : 0;
  score += input.fraudSuspected ? 0.08 : 0;

  return clamp(score);
}

function calculateReviewNecessityScore(input: AdminReviewHookInput): number {
  let score = 0;

  score += input.riskScore * 0.25;
  score += input.uncertaintyScore * 0.25;
  score += input.moneyMovementPossible ? 0.18 : 0;
  score += input.paymentUncertainty ? 0.18 : 0;
  score += input.fraudSuspected ? 0.16 : 0;
  score += input.userVisible ? 0.06 : 0;
  score += input.sourceEventIds.length > 0 ? 0.04 : 0;

  return clamp(score);
}

function calculateDuplicateCaseRisk(input: AdminReviewHookInput): number {
  if (input.existingOpenReviewCaseCount <= 0) return 0.05;
  return clamp(0.35 + input.existingOpenReviewCaseCount * 0.2);
}

function chooseSeverity(input: AdminReviewHookInput, rule: AdminReviewHookRuleSet): AdminReviewSeverity {
  if (input.fraudSuspected && input.riskScore >= 0.7) return "critical";
  if (input.paymentUncertainty && input.moneyMovementPossible) return "critical";
  if (input.riskScore >= 0.75 || input.uncertaintyScore >= 0.75) return "critical";
  if (input.riskScore >= 0.55 || input.uncertaintyScore >= 0.55) return "high";
  if (input.riskScore >= 0.35 || input.uncertaintyScore >= 0.35) return "medium";
  return rule.defaultSeverity;
}

function choosePriority(severity: AdminReviewSeverity, rule: AdminReviewHookRuleSet): AdminReviewPriority {
  if (severity === "critical") return "urgent";
  if (severity === "high") return "high";
  if (severity === "medium") return rule.defaultPriority;
  return "normal";
}

function calculateDueAt(params: {
  now: string;
  severity: AdminReviewSeverity;
  rule: AdminReviewHookRuleSet;
}): string {
  const minutes =
    params.severity === "critical"
      ? params.rule.dueInMinutesCritical
      : params.severity === "high"
        ? params.rule.dueInMinutesHigh
        : params.severity === "medium"
          ? params.rule.dueInMinutesMedium
          : params.rule.dueInMinutesLow;

  return new Date(new Date(params.now).getTime() + minutes * 60_000).toISOString();
}

export function buildAdminReviewHookAlphabetEvent(params: {
  input: AdminReviewHookInput;
  eventType: AlphabetEvent["eventType"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: params.input.subjectIds.userId ?? "system",
    coinCode: "J",
    eventType: params.eventType,
    objectType: "admin_review_hook",
    objectId: `${params.input.hookSource}:${params.input.sourceObjectId}`,
    sourceContext: "admin_review_hook",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: "unknown",
    verificationStatus: params.verificationStatus,
    metadata: {
      hookSource: params.input.hookSource,
      hookTrigger: params.input.hookTrigger,
      sourceObjectType: params.input.sourceObjectType,
      sourceObjectId: params.input.sourceObjectId,
      subjectIds: params.input.subjectIds,
      ...params.metadata,
      ...(params.input.metadata as Record<string, unknown> | undefined)
    },
    createdAt: new Date().toISOString()
  };
}

function createIdempotencyKey(input: AdminReviewHookInput): string {
  return buildIdempotencyKeyFromInput(input);
}

function createDedupeKey(input: AdminReviewHookInput): string {
  return buildDedupeKeyFromInput(input);
}

function decideHookOutcome(params: {
  input: AdminReviewHookInput;
  rule: AdminReviewHookRuleSet;
  hookRiskScore: number;
  reviewNecessityScore: number;
  duplicateCaseRisk: number;
  reasons: string[];
}): AdminReviewHookOutcomeStatus {
  const { input, rule, hookRiskScore, reviewNecessityScore, duplicateCaseRisk, reasons } = params;

  if (!rule.requiresReviewCase) {
    reasons.push("review_hook_no_case_required");
    return "review_hook_noop";
  }

  if (duplicateCaseRisk > rule.maxDuplicateCaseRisk) {
    reasons.push("review_hook_duplicate_case_risk_above_maximum");
    return "review_hook_skip_duplicate";
  }

  if (input.riskScore < rule.minRiskScore && input.uncertaintyScore < rule.minUncertaintyScore) {
    reasons.push("review_hook_risk_and_uncertainty_below_minimum");
    return "review_hook_noop";
  }

  if (reviewNecessityScore < rule.minReviewNecessityScore) {
    reasons.push("review_hook_necessity_below_minimum");
    return "review_hook_noop";
  }

  if (hookRiskScore <= 0) {
    reasons.push("review_hook_invalid_risk_score");
    return "review_hook_blocked";
  }

  reasons.push("review_hook_create_case");
  return "review_hook_create_case";
}

export function evaluateAdminReviewHook(input: AdminReviewHookInput): AdminReviewHookEvaluationResult {
  const reasons: string[] = [];
  const rule = getAdminReviewHookRule(input.hookTrigger);

  const hookRiskScore = calculateHookRiskScore(input);
  const reviewNecessityScore = calculateReviewNecessityScore(input);
  const duplicateCaseRisk = calculateDuplicateCaseRisk(input);

  const fallbackSeverity: AdminReviewSeverity = "medium";
  const fallbackPriority: AdminReviewPriority = "normal";

  if (!rule) {
    reasons.push("review_hook_no_active_rule");

    const detected = buildAdminReviewHookAlphabetEvent({
      input,
      eventType: "admin_review_hook_detected",
      rawScore: reviewNecessityScore,
      qualityScore: hookRiskScore,
      riskScore: hookRiskScore,
      verificationStatus: "rejected",
      metadata: { reasons, phase: "no_rule" }
    });

    const failed = buildAdminReviewHookAlphabetEvent({
      input,
      eventType: "admin_review_hook_failed",
      rawScore: reviewNecessityScore,
      qualityScore: hookRiskScore,
      riskScore: hookRiskScore,
      verificationStatus: "rejected",
      metadata: { reasons, phase: "no_rule" }
    });

    return {
      status: "review_hook_failed",
      hookSource: input.hookSource,
      hookTrigger: input.hookTrigger,
      reviewCaseType: null,
      reviewTrigger: null,
      severity: fallbackSeverity,
      priority: fallbackPriority,
      dueAt: null,
      hookRiskScore,
      reviewNecessityScore,
      duplicateCaseRisk,
      shouldCreateCase: false,
      skipDuplicate: false,
      blocked: false,
      failed: true,
      idempotencyKey: createIdempotencyKey(input),
      dedupeKey: createDedupeKey(input),
      reasons,
      adminReviewHookDetectedEvent: detected,
      adminReviewHookCaseCreatedEvent: null,
      adminReviewHookDuplicateSkippedEvent: null,
      adminReviewHookBlockedEvent: null,
      adminReviewHookFailedEvent: failed,
      metadata: input.metadata ?? {}
    };
  }

  const severity = chooseSeverity(input, rule);
  const priority = choosePriority(severity, rule);
  const dueAt = calculateDueAt({ now: input.now, severity, rule });

  const status = decideHookOutcome({
    input,
    rule,
    hookRiskScore,
    reviewNecessityScore,
    duplicateCaseRisk,
    reasons
  });

  const shouldCreateCase = status === "review_hook_create_case";
  const skipDuplicate = status === "review_hook_skip_duplicate";
  const blocked = status === "review_hook_blocked";
  const failed = status === "review_hook_failed";

  const detected = buildAdminReviewHookAlphabetEvent({
    input,
    eventType: "admin_review_hook_detected",
    rawScore: reviewNecessityScore,
    qualityScore: hookRiskScore,
    riskScore: hookRiskScore,
    verificationStatus: shouldCreateCase || skipDuplicate ? "verified" : "rejected",
    metadata: { status, reasons }
  });

  const created = shouldCreateCase
    ? buildAdminReviewHookAlphabetEvent({
        input,
        eventType: "admin_review_hook_case_created",
        rawScore: reviewNecessityScore,
        qualityScore: hookRiskScore,
        riskScore: hookRiskScore,
        verificationStatus: "verified",
        metadata: { status, reasons }
      })
    : null;

  const duplicate = skipDuplicate
    ? buildAdminReviewHookAlphabetEvent({
        input,
        eventType: "admin_review_hook_duplicate_skipped",
        rawScore: reviewNecessityScore,
        qualityScore: hookRiskScore,
        riskScore: hookRiskScore,
        verificationStatus: "verified",
        metadata: { status, reasons }
      })
    : null;

  const blockedEvent = blocked
    ? buildAdminReviewHookAlphabetEvent({
        input,
        eventType: "admin_review_hook_blocked",
        rawScore: reviewNecessityScore,
        qualityScore: hookRiskScore,
        riskScore: hookRiskScore,
        verificationStatus: "rejected",
        metadata: { status, reasons }
      })
    : null;

  const failedEvent = failed
    ? buildAdminReviewHookAlphabetEvent({
        input,
        eventType: "admin_review_hook_failed",
        rawScore: reviewNecessityScore,
        qualityScore: hookRiskScore,
        riskScore: hookRiskScore,
        verificationStatus: "rejected",
        metadata: { status, reasons }
      })
    : null;

  return {
    status,
    hookSource: input.hookSource,
    hookTrigger: input.hookTrigger,
    reviewCaseType: rule.reviewCaseType,
    reviewTrigger: rule.reviewTrigger,
    severity,
    priority,
    dueAt,
    hookRiskScore,
    reviewNecessityScore,
    duplicateCaseRisk,
    shouldCreateCase,
    skipDuplicate,
    blocked,
    failed,
    idempotencyKey: createIdempotencyKey(input),
    dedupeKey: createDedupeKey(input),
    reasons,
    adminReviewHookDetectedEvent: detected,
    adminReviewHookCaseCreatedEvent: created,
    adminReviewHookDuplicateSkippedEvent: duplicate,
    adminReviewHookBlockedEvent: blockedEvent,
    adminReviewHookFailedEvent: failedEvent,
    metadata: {
      ruleTrigger: rule.hookTrigger,
      failClosed: rule.failClosed,
      blocksDownstreamIfCreationFails: rule.blocksDownstreamIfCreationFails,
      ...((input.metadata as Record<string, unknown>) ?? {})
    }
  };
}
