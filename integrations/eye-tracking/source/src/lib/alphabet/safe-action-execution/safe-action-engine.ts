import { getSafeActionRule } from "@/data/alphabet/safe-action-execution-rules";
import type { AlphabetEvent } from "@/types/alphabet/event.types";
import type { Json } from "@/types/alphabet/database.types";
import type {
  SafeActionEvaluationResult,
  SafeActionSeverity,
  SafeActionSourceLinks,
  SafeActionLinkedObjectIds,
  SafeActionSignalInput,
  SafeActionStatus
} from "@/types/alphabet/safe-action-execution.types";
import {
  actionNeedsTarget,
  isDirectMoneyMutationForbidden
} from "./safe-action-normalizers";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function calculateExecutionRiskScore(input: SafeActionSignalInput): number {
  let score = 0;

  if (input.severity === "critical") score += 0.45;
  if (input.severity === "danger") score += 0.3;
  if (input.severity === "warning") score += 0.12;

  if (input.executionMode === "approval_required") score += 0.2;
  if (input.executionMode === "external_system_required") score += 0.25;
  if (input.executionMode === "manual_only") score += 0.18;

  if (!input.sourceLinks.commandDecisionId) score += 0.2;
  if (!input.sourceLinks.actorAdminId) score += 0.2;
  if (!input.idempotencyKey || !input.dedupeKey) score += 0.2;

  if (isDirectMoneyMutationForbidden(input.safeActionType)) score += 0.12;

  return clamp(score);
}

function calculateConfidenceScore(input: SafeActionSignalInput): number {
  let score = 0.7;

  if (input.sourceLinks.commandDecisionId) score += 0.08;
  if (input.sourceLinks.commandItemId) score += 0.04;
  if (input.sourceLinks.actorAdminId) score += 0.04;
  if (input.idempotencyKey && input.dedupeKey) score += 0.06;
  if (input.evidence) score += 0.04;
  if (input.targetObjectId || !actionNeedsTarget(input.safeActionType)) score += 0.04;

  return clamp(score);
}

function chooseSeverity(input: SafeActionSignalInput): SafeActionSeverity {
  const rule = getSafeActionRule(input.safeActionType);
  return rule?.defaultSeverity ?? input.severity;
}

function decideOutcome(params: {
  input: SafeActionSignalInput;
  riskScore: number;
  confidenceScore: number;
  reasons: string[];
}): SafeActionEvaluationResult["outcome"] {
  const rule = getSafeActionRule(params.input.safeActionType);

  if (!rule) {
    params.reasons.push("safe_action_no_active_rule");
    return "safe_action_block";
  }

  if (params.confidenceScore < rule.minConfidenceScore) {
    params.reasons.push("safe_action_confidence_below_minimum");
    return "safe_action_block";
  }

  if (!params.input.sourceLinks.actorAdminId) {
    params.reasons.push("safe_action_missing_actor_admin");
    return "safe_action_block";
  }

  if (rule.requiresApprovedDecision && !params.input.sourceLinks.commandDecisionId) {
    params.reasons.push("safe_action_missing_approved_command_decision");
    return "safe_action_block";
  }

  if (!params.input.idempotencyKey || !params.input.dedupeKey) {
    params.reasons.push("safe_action_missing_idempotency_or_dedupe");
    return "safe_action_block";
  }

  if (actionNeedsTarget(params.input.safeActionType) && !params.input.targetObjectId) {
    params.reasons.push("safe_action_missing_target_object");
    return "safe_action_block";
  }

  if (params.riskScore >= rule.blockRiskScore) {
    params.reasons.push("safe_action_block_risk_threshold");
    return "safe_action_block";
  }

  if (rule.requiresManualExecution || params.input.policyResult.requiresManualExecution) {
    params.reasons.push("safe_action_manual_execution_required");
    return "safe_action_manual";
  }

  if (rule.requiresApprovedDecision && !params.input.sourceLinks.approverAdminId) {
    params.reasons.push("safe_action_waiting_for_approval");
    return "safe_action_wait_approval";
  }

  if (params.input.policyResult.blocked || !params.input.policyResult.allowed) {
    params.reasons.push("safe_action_policy_blocked");
    return "safe_action_block";
  }

  if (params.input.executionMode === "manual_only") {
    params.reasons.push("safe_action_manual_mode");
    return "safe_action_manual";
  }

  params.reasons.push("safe_action_executable");
  return "safe_action_execute";
}

function statusFromOutcome(outcome: SafeActionEvaluationResult["outcome"]): SafeActionStatus {
  if (outcome === "safe_action_block") return "safe_action_policy_blocked";
  if (outcome === "safe_action_wait_approval") return "safe_action_waiting_approval";
  if (outcome === "safe_action_manual") return "safe_action_requires_manual_execution";
  if (outcome === "safe_action_execute") return "safe_action_approved";
  if (outcome === "safe_action_fail") return "safe_action_failed";
  return "safe_action_created";
}

function toJsonSafeSourceLinks(sourceLinks: SafeActionSourceLinks): Json {
  return {
    commandItemId: sourceLinks.commandItemId ?? null,
    commandDecisionId: sourceLinks.commandDecisionId ?? null,
    reviewCaseId: sourceLinks.reviewCaseId ?? null,
    alertId: sourceLinks.alertId ?? null,
    actorAdminId: sourceLinks.actorAdminId,
    approverAdminId: sourceLinks.approverAdminId ?? null
  };
}

function toJsonSafeLinkedObjectIds(linkedObjectIds: SafeActionLinkedObjectIds): Json {
  return {
    userId: linkedObjectIds.userId ?? null,
    creatorId: linkedObjectIds.creatorId ?? null,
    walletId: linkedObjectIds.walletId ?? null,
    walletAccountId: linkedObjectIds.walletAccountId ?? null,
    campaignId: linkedObjectIds.campaignId ?? null,
    payoutId: linkedObjectIds.payoutId ?? null,
    externalTransferId: linkedObjectIds.externalTransferId ?? null,
    ledgerEntryId: linkedObjectIds.ledgerEntryId ?? null,
    policyDecisionId: linkedObjectIds.policyDecisionId ?? null,
    compensationId: linkedObjectIds.compensationId ?? null,
    executionRequestId: linkedObjectIds.executionRequestId ?? null
  };
}

function toJsonSafeMetadata(input: SafeActionSignalInput, metadata?: Json): Json {
  const safeInputMetadata = input.metadata ?? {};
  const safeRuntimeMetadata = metadata ?? {};

  return {
    safeActionType: input.safeActionType,
    requestedAction: input.requestedAction,
    normalizedAction: input.normalizedAction,
    executionMode: input.executionMode,
    sourceLinks: toJsonSafeSourceLinks(input.sourceLinks),
    linkedObjectIds: toJsonSafeLinkedObjectIds(input.linkedObjectIds),
    targetObjectType: input.targetObjectType ?? null,
    targetObjectId: input.targetObjectId ?? null,
    ...(typeof safeRuntimeMetadata === "object" && !Array.isArray(safeRuntimeMetadata)
      ? safeRuntimeMetadata
      : { runtimeMetadata: safeRuntimeMetadata }),
    ...(typeof safeInputMetadata === "object" && !Array.isArray(safeInputMetadata)
      ? safeInputMetadata
      : { inputMetadata: safeInputMetadata })
  };
}

function createSafeActionEvent(params: {
  input: SafeActionSignalInput;
  eventType: AlphabetEvent["eventType"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Json;
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: params.input.linkedObjectIds.userId ?? params.input.sourceLinks.actorAdminId,
    coinCode: "J",
    eventType: params.eventType,
    objectType: "safe_action_execution",
    objectId: params.input.dedupeKey,
    sourceContext: "safe_action_execution",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: "unknown",
    verificationStatus: params.verificationStatus,
    metadata: toJsonSafeMetadata(params.input, params.metadata),
    createdAt: new Date().toISOString()
  };
}

export function evaluateSafeAction(input: SafeActionSignalInput): SafeActionEvaluationResult {
  const reasons: string[] = [];

  const executionRiskScore = calculateExecutionRiskScore(input);
  const confidenceScore = calculateConfidenceScore(input);
  const outcome = decideOutcome({
    input,
    riskScore: executionRiskScore,
    confidenceScore,
    reasons
  });

  const severity = chooseSeverity(input);

  const allowed =
    outcome === "safe_action_execute" ||
    outcome === "safe_action_manual" ||
    outcome === "safe_action_wait_approval";

  const blocked = outcome === "safe_action_block";
  const waitingApproval = outcome === "safe_action_wait_approval";
  const manualRequired = outcome === "safe_action_manual";
  const executable = outcome === "safe_action_execute";
  const failed = outcome === "safe_action_fail";

  const base = {
    rawScore: confidenceScore,
    qualityScore: allowed ? 1 : 0,
    riskScore: executionRiskScore,
    verificationStatus: blocked || failed ? "rejected" : "verified",
    metadata: {
      outcome,
      severity,
      reasons
    }
  };

  const createdEvent = createSafeActionEvent({
    input,
    eventType: "safe_action_created",
    ...base
  });

  const policyAllowedEvent = executable
    ? createSafeActionEvent({
        input,
        eventType: "safe_action_policy_allowed",
        ...base,
        verificationStatus: "verified"
      })
    : null;

  const policyBlockedEvent = blocked
    ? createSafeActionEvent({
        input,
        eventType: "safe_action_policy_blocked",
        ...base,
        verificationStatus: "rejected"
      })
    : null;

  const approvalRequiredEvent = waitingApproval
    ? createSafeActionEvent({
        input,
        eventType: "safe_action_approval_required",
        ...base,
        verificationStatus: "verified"
      })
    : null;

  const manualRequiredEvent = manualRequired
    ? createSafeActionEvent({
        input,
        eventType: "safe_action_manual_required",
        ...base,
        verificationStatus: "verified"
      })
    : null;

  return {
    outcome,
    dbStatus: statusFromOutcome(outcome),
    safeActionType: input.safeActionType,
    severity,
    executionMode: input.executionMode,
    executionRiskScore,
    confidenceScore,
    allowed,
    blocked,
    waitingApproval,
    manualRequired,
    executable,
    failed,
    shouldRunNow: executable && input.executionMode === "automatic_safe",
    shouldPersistExecution: true,
    reasons,
    createdEvent,
    policyAllowedEvent,
    policyBlockedEvent,
    approvalRequiredEvent,
    manualRequiredEvent,
    metadata: {
      ruleSafeActionType: getSafeActionRule(input.safeActionType)?.safeActionType ?? null
    }
  };
}
