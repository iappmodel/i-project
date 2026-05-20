import { randomUUID } from "node:crypto";
import { getOperationalAlertRule } from "@/data/alphabet/operational-alert-rules";
import { ALPHABET_SYSTEM_USER_ID } from "../db-repositories/alphabet-events.repository";
import type { AlphabetEvent } from "@/types/alphabet/event.types";
import type {
  OperationalAlertEvaluationResult,
  OperationalAlertOutcomeStatus,
  OperationalAlertPriority,
  OperationalAlertSeverity,
  OperationalAlertSignalInput,
  OperationalAlertTeam
} from "@/types/alphabet/operational-alert.types";

function createId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function firstLinkedUuid(input: OperationalAlertSignalInput): string | null {
  const ids = input.linkedObjectIds;
  const candidates = [
    ids.userId,
    ids.walletId,
    ids.walletAccountId,
    ids.ledgerEntryId,
    ids.originalLedgerEntryId,
    ids.reversalLedgerEntryId,
    ids.externalTransferId,
    ids.compensationId,
    ids.providerReconciliationId,
    ids.reviewCaseId,
    ids.policyDecisionId,
    ids.pipelineId,
    ids.sagaId,
    ids.executionRequestId,
    ids.campaignId,
    ids.notificationId,
    ids.auditRecordId,
    ids.alphabetEventId
  ];
  const re =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  for (const c of candidates) {
    if (c && re.test(c)) return c;
  }
  return null;
}

function eventUserId(input: OperationalAlertSignalInput): string {
  return firstLinkedUuid(input) ?? ALPHABET_SYSTEM_USER_ID;
}

function calculateAlertSeverityScore(input: OperationalAlertSignalInput): number {
  const score =
    input.riskScores.alertConfidenceScore * 0.18 +
    input.riskScores.financialRiskScore * 0.22 +
    input.riskScores.userImpactScore * 0.14 +
    input.riskScores.platformRiskScore * 0.18 +
    input.riskScores.exploitabilityScore * 0.12 +
    input.riskScores.urgencyScore * 0.1 +
    input.riskScores.recurrenceRiskScore * 0.06;

  return clamp(score);
}

function calculateAlertPriorityScore(input: OperationalAlertSignalInput): number {
  const score =
    input.riskScores.urgencyScore * 0.35 +
    input.riskScores.financialRiskScore * 0.25 +
    input.riskScores.userImpactScore * 0.15 +
    input.riskScores.platformRiskScore * 0.15 +
    input.riskScores.recurrenceRiskScore * 0.1;

  return clamp(score);
}

function calculateRoutingScore(input: OperationalAlertSignalInput): number {
  const hasLinkedObject = Object.values(input.linkedObjectIds).some(Boolean);

  const score =
    input.riskScores.alertConfidenceScore * 0.35 +
    input.riskScores.platformRiskScore * 0.2 +
    input.riskScores.financialRiskScore * 0.2 +
    (hasLinkedObject ? 0.15 : 0) +
    (input.sourceEventIds.length > 0 ? 0.1 : 0);

  return clamp(score);
}

function calculateDuplicateAlertRisk(input: OperationalAlertSignalInput): number {
  if (input.existingOpenAlertCount <= 0) return 0.05;
  return clamp(0.35 + input.existingOpenAlertCount * 0.22);
}

function chooseSeverity(
  score: number,
  rule: NonNullable<ReturnType<typeof getOperationalAlertRule>>
): OperationalAlertSeverity {
  if (score >= rule.criticalSeverityScore) return "critical";
  if (score >= rule.highSeverityScore) return "high";
  if (score >= rule.mediumSeverityScore) return "medium";
  return rule.defaultSeverity;
}

function choosePriority(
  score: number,
  rule: NonNullable<ReturnType<typeof getOperationalAlertRule>>
): OperationalAlertPriority {
  if (score >= rule.urgentPriorityScore) return "urgent";
  if (score >= rule.highPriorityScore) return "high";
  if (score >= rule.normalPriorityScore) return "normal";
  return rule.defaultPriority;
}

function createDedupeKey(input: OperationalAlertSignalInput): string {
  const subject =
    input.linkedObjectIds.externalTransferId ??
    input.linkedObjectIds.compensationId ??
    input.linkedObjectIds.ledgerEntryId ??
    input.linkedObjectIds.executionRequestId ??
    input.linkedObjectIds.walletId ??
    input.linkedObjectIds.userId ??
    "system";

  return ["operational-alert", input.alertType, subject].join(":");
}

function createIdempotencyKey(input: OperationalAlertSignalInput): string {
  return ["operational-alert", input.alertSource, input.alertType, createDedupeKey(input)].join(":");
}

function decideOutcome(params: {
  input: OperationalAlertSignalInput;
  alertSeverityScore: number;
  routingScore: number;
  duplicateAlertRisk: number;
  reasons: string[];
}): OperationalAlertOutcomeStatus {
  const rule = getOperationalAlertRule(params.input.alertType);

  if (!rule) {
    params.reasons.push("operational_alert_no_active_rule");
    return "alert_fail";
  }

  if (params.input.suppressRequested) {
    params.reasons.push("operational_alert_suppressed_requested");
    return "alert_suppress";
  }

  if (rule.suppressDuplicates && params.duplicateAlertRisk >= 0.75) {
    params.reasons.push("operational_alert_duplicate_suppressed");
    return "alert_skip_duplicate";
  }

  if (params.alertSeverityScore < rule.autoSuppressBelowSeverityScore) {
    params.reasons.push("operational_alert_auto_suppressed_low_severity");
    return "alert_suppress";
  }

  if (params.input.riskScores.alertConfidenceScore < rule.minAlertConfidenceScore) {
    params.reasons.push("operational_alert_confidence_below_minimum");
    return "alert_suppress";
  }

  if (params.alertSeverityScore < rule.minAlertSeverityScore) {
    params.reasons.push("operational_alert_severity_below_minimum");
    return "alert_suppress";
  }

  if (params.routingScore < rule.minRoutingScore) {
    params.reasons.push("operational_alert_routing_score_below_minimum");
    return "alert_fail";
  }

  if (params.alertSeverityScore >= rule.criticalSeverityScore) {
    params.reasons.push("operational_alert_escalate");
    return "alert_escalate";
  }

  params.reasons.push("operational_alert_create");
  return "alert_create";
}

function createOperationalAlertEvent(params: {
  input: OperationalAlertSignalInput;
  eventType: AlphabetEvent["eventType"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  const dedupeKey = createDedupeKey(params.input);
  const objectId = firstLinkedUuid(params.input) ?? randomUUID();

  return {
    eventId: createId("alphabet_event"),
    userId: eventUserId(params.input),
    coinCode: "J",
    eventType: params.eventType,
    objectType: "operational_alert",
    objectId,
    sourceContext: "operational_alert",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: "unknown",
    verificationStatus: params.verificationStatus,
    metadata: {
      dedupeKey,
      idempotencyKey: createIdempotencyKey(params.input),
      alertType: params.input.alertType,
      alertSource: params.input.alertSource,
      linkedObjectIds: params.input.linkedObjectIds,
      ...params.metadata,
      ...(params.input.metadata as Record<string, unknown> | undefined)
    },
    createdAt: new Date().toISOString()
  };
}

export function evaluateOperationalAlert(input: OperationalAlertSignalInput): OperationalAlertEvaluationResult {
  const reasons: string[] = [];
  const rule = getOperationalAlertRule(input.alertType);

  const alertSeverityScore = calculateAlertSeverityScore(input);
  const alertPriorityScore = calculateAlertPriorityScore(input);
  const routingScore = calculateRoutingScore(input);
  const duplicateAlertRisk = calculateDuplicateAlertRisk(input);

  if (!rule) {
    reasons.push("operational_alert_no_active_rule");

    const failed = createOperationalAlertEvent({
      input,
      eventType: "operational_alert_failed",
      rawScore: alertPriorityScore,
      qualityScore: routingScore,
      riskScore: alertSeverityScore,
      verificationStatus: "rejected",
      metadata: { reasons }
    });

    return {
      status: "alert_fail",
      alertType: input.alertType,
      alertSource: input.alertSource,
      severity: "medium",
      priority: "normal",
      assignedTeam: "infra",
      routeReason: "No active alert rule.",
      alertSeverityScore,
      alertPriorityScore,
      routingScore,
      duplicateAlertRisk,
      shouldCreateAlert: false,
      shouldSkipDuplicate: false,
      shouldSuppress: false,
      shouldEscalate: false,
      failed: true,
      shouldCreateReviewCase: false,
      idempotencyKey: createIdempotencyKey(input),
      dedupeKey: createDedupeKey(input),
      reasons,
      operationalAlertCreatedEvent: failed,
      operationalAlertRoutedEvent: null,
      operationalAlertSuppressedEvent: null,
      operationalAlertFailedEvent: failed,
      metadata: input.metadata ?? {}
    };
  }

  const status = decideOutcome({
    input,
    alertSeverityScore,
    routingScore,
    duplicateAlertRisk,
    reasons
  });

  const severity = chooseSeverity(alertSeverityScore, rule);
  const priority = choosePriority(alertPriorityScore, rule);

  const shouldCreateAlert = status === "alert_create" || status === "alert_escalate";
  const shouldSkipDuplicate = status === "alert_skip_duplicate";
  const shouldSuppress = status === "alert_suppress";
  const shouldEscalate = status === "alert_escalate";
  const failed = status === "alert_fail";

  const assignedTeam: OperationalAlertTeam = rule.defaultTeam;
  const routeReason = `${input.alertType} routed to ${assignedTeam}`;

  const createdEvent = createOperationalAlertEvent({
    input,
    eventType: "operational_alert_created",
    rawScore: alertPriorityScore,
    qualityScore: routingScore,
    riskScore: alertSeverityScore,
    verificationStatus: shouldCreateAlert ? "verified" : "rejected",
    metadata: { status, severity, priority, assignedTeam, reasons }
  });

  const routedEvent = shouldCreateAlert
    ? createOperationalAlertEvent({
        input,
        eventType: "operational_alert_routed",
        rawScore: alertPriorityScore,
        qualityScore: routingScore,
        riskScore: alertSeverityScore,
        verificationStatus: "verified",
        metadata: { assignedTeam, routeReason }
      })
    : null;

  const suppressedEvent =
    shouldSuppress || shouldSkipDuplicate
      ? createOperationalAlertEvent({
          input,
          eventType: "operational_alert_suppressed",
          rawScore: alertPriorityScore,
          qualityScore: routingScore,
          riskScore: alertSeverityScore,
          verificationStatus: "verified",
          metadata: { status, reasons }
        })
      : null;

  const failedEvent = failed
    ? createOperationalAlertEvent({
        input,
        eventType: "operational_alert_failed",
        rawScore: alertPriorityScore,
        qualityScore: routingScore,
        riskScore: alertSeverityScore,
        verificationStatus: "rejected",
        metadata: { status, reasons }
      })
    : null;

  return {
    status,
    alertType: input.alertType,
    alertSource: input.alertSource,
    severity,
    priority,
    assignedTeam,
    routeReason,
    alertSeverityScore,
    alertPriorityScore,
    routingScore,
    duplicateAlertRisk,
    shouldCreateAlert,
    shouldSkipDuplicate,
    shouldSuppress,
    shouldEscalate,
    failed,
    shouldCreateReviewCase: shouldCreateAlert && rule.createReviewCase,
    idempotencyKey: createIdempotencyKey(input),
    dedupeKey: createDedupeKey(input),
    reasons,
    operationalAlertCreatedEvent: createdEvent,
    operationalAlertRoutedEvent: routedEvent,
    operationalAlertSuppressedEvent: suppressedEvent,
    operationalAlertFailedEvent: failedEvent,
    metadata: {
      ruleAlertType: rule.alertType,
      ...((input.metadata as Record<string, unknown>) ?? {})
    }
  };
}
