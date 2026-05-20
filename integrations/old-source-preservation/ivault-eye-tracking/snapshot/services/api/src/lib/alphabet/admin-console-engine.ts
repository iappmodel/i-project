import { ADMIN_CONSOLE_RULES } from "../../data/alphabet/admin-console-rules";
import type { AlphabetEvent } from "../../types/alphabet/event.types";
import type {
  AdminCommandType,
  AdminConsoleEvaluationResult,
  AdminConsoleRuleSet,
  AdminConsoleSignalInput,
  AdminDecisionStatus,
  AdminExecutionInstruction
} from "../../types/alphabet/admin-console.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function findRule(input: AdminConsoleSignalInput): AdminConsoleRuleSet | undefined {
  return ADMIN_CONSOLE_RULES.find(
    (rule) => rule.active && rule.queueType === input.queueType
  );
}

function isMutationCommand(commandType: AdminCommandType): boolean {
  return !["view", "export"].includes(commandType);
}

function isDangerousCommand(commandType: AdminCommandType): boolean {
  return [
    "refund",
    "reverse",
    "lock",
    "unlock",
    "suspend",
    "remove",
    "restore",
    "approve",
    "release_hold"
  ].includes(commandType);
}

function calculateOperatorPermissionScore(
  input: AdminConsoleSignalInput,
  rule?: AdminConsoleRuleSet
): number {
  if (!rule) return 0;

  const roleAllowed = rule.allowedRoles.includes(input.operatorRole) ? 1 : 0;
  const scopeAllowed = rule.allowedPermissionScopes.includes(input.permissionScope) ? 1 : 0;

  const accessScore =
    (input.operatorHasQueueAccess ? 0.3 : 0) +
    (input.operatorHasTargetAccess ? 0.3 : 0);

  const rolePower = {
    viewer: 0.1,
    support_agent: 0.35,
    reviewer: 0.5,
    senior_reviewer: 0.7,
    safety_specialist: 0.75,
    rights_specialist: 0.75,
    payment_specialist: 0.8,
    treasury_specialist: 0.85,
    compliance_specialist: 0.9,
    admin: 0.95,
    super_admin: 1
  }[input.operatorRole];

  return clamp(roleAllowed * 0.25 + scopeAllowed * 0.25 + accessScore + rolePower * 0.2);
}

function calculateCommandRiskScore(input: AdminConsoleSignalInput): number {
  let risk =
    clamp(input.riskScore) * 0.25 +
    clamp(input.severityScore) * 0.25 +
    clamp(input.privacySensitivityScore) * 0.15 +
    (isDangerousCommand(input.commandType) ? 0.18 : 0) +
    (input.commandType === "export" ? 0.12 : 0) +
    Math.min(0.1, input.duplicateCommandCount * 0.03) +
    Math.min(0.1, input.recentFailedCommandCount * 0.04);

  if (input.operatorRole === "viewer" && isMutationCommand(input.commandType)) risk += 0.3;
  if (!input.commandReason || input.commandReason.trim().length < 8) risk += 0.12;

  return clamp(risk);
}

function calculateQueuePriorityScore(input: AdminConsoleSignalInput): number {
  const queueWeight = {
    review: 0.45,
    appeal: 0.55,
    safety: 0.75,
    rights: 0.65,
    payout: 0.7,
    withdrawal: 0.78,
    wallet: 0.65,
    campaign: 0.5,
    treasury: 0.85,
    analytics: 0.45,
    fraud: 0.9,
    compliance: 0.95,
    grant: 0.75,
    system: 0.85
  }[input.queueType];

  return clamp(
    queueWeight * 0.4 +
      clamp(input.riskScore) * 0.25 +
      clamp(input.severityScore) * 0.25 +
      clamp(input.privacySensitivityScore) * 0.1
  );
}

function calculateExecutionSafetyScore(
  input: AdminConsoleSignalInput,
  rule?: AdminConsoleRuleSet
): number {
  if (!rule) return 0;

  const permissionScore = calculateOperatorPermissionScore(input, rule);
  const commandRiskScore = calculateCommandRiskScore(input);

  const evidenceScore = clamp(input.evidenceCompletenessScore);
  const reasonScore = input.commandReason.trim().length >= 12 ? 1 : 0.4;

  const approvalScore =
    input.approvalRequired || input.twoPersonApprovalRequired
      ? input.approvedByUserId && input.approvedByUserId !== input.operatorUserId
        ? 1
        : 0.35
      : 1;

  return clamp(
    permissionScore * 0.3 +
      evidenceScore * 0.25 +
      reasonScore * 0.15 +
      approvalScore * 0.15 +
      (1 - commandRiskScore) * 0.15
  );
}

function commandToInstruction(input: AdminConsoleSignalInput): AdminExecutionInstruction {
  return {
    targetSystem: input.targetSystem,
    targetObjectId: input.targetObjectId,
    action: input.commandType,
    reasonCode: "admin_command_authorized",
    payload: {
      adminCommandId: input.adminCommandId,
      operatorUserId: input.operatorUserId,
      operatorRole: input.operatorRole,
      commandReason: input.commandReason,
      sourceReviewCaseId: input.sourceReviewCaseId ?? null,
      sourceAuditId: input.sourceAuditId ?? null,
      ...input.executionPayload
    }
  };
}

function decideAdminCommandStatus(params: {
  input: AdminConsoleSignalInput;
  rule: AdminConsoleRuleSet;
  operatorPermissionScore: number;
  commandRiskScore: number;
  executionSafetyScore: number;
  reasons: string[];
}): AdminDecisionStatus {
  const { input, rule, operatorPermissionScore, commandRiskScore, executionSafetyScore, reasons } =
    params;

  if (input.cancelRequested) {
    reasons.push("admin_command_canceled");
    return "admin_command_failed";
  }

  if (input.operatorRole === "viewer" && isMutationCommand(input.commandType)) {
    reasons.push("viewer_cannot_execute_mutation");
    return "admin_command_denied";
  }

  if (!rule.allowedRoles.includes(input.operatorRole)) {
    reasons.push("operator_role_not_allowed_for_queue");
    return "admin_command_denied";
  }

  if (!rule.allowedPermissionScopes.includes(input.permissionScope)) {
    reasons.push("permission_scope_not_allowed_for_queue");
    return "admin_command_denied";
  }

  if (!input.operatorHasQueueAccess) {
    reasons.push("operator_missing_queue_access");
    return "admin_command_denied";
  }

  if (!input.operatorHasTargetAccess) {
    reasons.push("operator_missing_target_access");
    return "admin_command_denied";
  }

  if (input.commandType === "export") {
    if (rule.exportRequiresAdmin && !["admin", "super_admin"].includes(input.operatorRole)) {
      reasons.push("export_requires_admin_role");
      return "admin_command_denied";
    }

    if (!input.operatorHasExportPermission) {
      reasons.push("operator_missing_export_permission");
      return "admin_command_denied";
    }

    if (input.privacySensitivityScore > rule.maxPrivacySensitivityForExport) {
      reasons.push("privacy_sensitivity_too_high_for_export");
      return "admin_command_denied";
    }
  }

  if (operatorPermissionScore < rule.minOperatorPermissionScore) {
    reasons.push("operator_permission_score_below_minimum");
    return "admin_command_denied";
  }

  if (
    isMutationCommand(input.commandType) &&
    input.evidenceCompletenessScore < rule.minEvidenceCompletenessForMutation
  ) {
    reasons.push("evidence_completeness_below_mutation_minimum");
    return "admin_command_requires_approval";
  }

  if (commandRiskScore > rule.maxCommandRiskScore) {
    reasons.push("command_risk_score_above_maximum");
    return "admin_command_requires_approval";
  }

  const approvalNeeded =
    input.approvalRequired ||
    (rule.mutationCommandsRequireApproval && isMutationCommand(input.commandType)) ||
    input.riskScore > rule.maxRiskScoreWithoutApproval ||
    input.severityScore > rule.maxSeverityScoreWithoutApproval;

  const twoPersonNeeded =
    input.twoPersonApprovalRequired ||
    (rule.dangerousCommandsRequireTwoPersonApproval && isDangerousCommand(input.commandType));

  if (
    twoPersonNeeded &&
    (!input.approvedByUserId || input.approvedByUserId === input.operatorUserId)
  ) {
    reasons.push("two_person_approval_required");
    return "admin_command_requires_approval";
  }

  if (approvalNeeded && !input.approvedByUserId) {
    reasons.push("approval_required");
    return "admin_command_requires_approval";
  }

  if (executionSafetyScore < rule.minExecutionSafetyScore) {
    reasons.push("execution_safety_score_below_minimum");
    return "admin_command_requires_approval";
  }

  if (input.currentCommandStatus === "command_failed") {
    reasons.push("command_previously_failed");
    return "admin_command_failed";
  }

  if (input.executionRequested) {
    reasons.push("admin_command_executed");
    return "admin_command_executed";
  }

  reasons.push("admin_command_allowed");
  return "admin_command_allowed";
}

function createAdminAlphabetEvent(params: {
  input: AdminConsoleSignalInput;
  eventType: AlphabetEvent["eventType"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: params.input.operatorUserId,
    coinCode: "J",
    eventType: params.eventType,
    objectType: "admin_command",
    objectId: params.input.adminCommandId,
    sourceContext: "admin",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: "admin",
    verificationStatus: params.verificationStatus,
    metadata: {
      adminCommandId: params.input.adminCommandId,
      adminQueueItemId: params.input.adminQueueItemId ?? null,
      queueType: params.input.queueType,
      operatorUserId: params.input.operatorUserId,
      operatorRole: params.input.operatorRole,
      permissionScope: params.input.permissionScope,
      commandType: params.input.commandType,
      targetSystem: params.input.targetSystem,
      targetObjectId: params.input.targetObjectId,
      sourceReviewCaseId: params.input.sourceReviewCaseId ?? null,
      sourceAuditId: params.input.sourceAuditId ?? null,
      sourceEventIds: params.input.sourceEventIds,
      ...params.metadata,
      ...params.input.metadata
    },
    createdAt: new Date().toISOString()
  };
}

export function evaluateAdminCommand(
  input: AdminConsoleSignalInput
): AdminConsoleEvaluationResult {
  const reasons: string[] = [];
  const rule = findRule(input);

  const operatorPermissionScore = calculateOperatorPermissionScore(input, rule);
  const commandRiskScore = calculateCommandRiskScore(input);
  const queuePriorityScore = calculateQueuePriorityScore(input);
  const executionSafetyScore = calculateExecutionSafetyScore(input, rule);

  if (!rule) {
    reasons.push("no_active_admin_console_rule");

    const adminQueueItemCreatedEvent = createAdminAlphabetEvent({
      input,
      eventType: "admin_queue_item_created",
      rawScore: queuePriorityScore,
      qualityScore: operatorPermissionScore,
      riskScore: commandRiskScore,
      verificationStatus: "rejected",
      metadata: { reasons }
    });

    return {
      adminCommandId: input.adminCommandId,
      adminQueueItemId: input.adminQueueItemId ?? null,
      queueType: input.queueType,
      operatorUserId: input.operatorUserId,
      operatorRole: input.operatorRole,
      permissionScope: input.permissionScope,
      commandType: input.commandType,
      targetSystem: input.targetSystem,
      targetObjectId: input.targetObjectId,
      status: "admin_command_denied",
      operatorPermissionScore,
      commandRiskScore,
      queuePriorityScore,
      executionSafetyScore,
      commandAllowed: false,
      commandDenied: true,
      commandRequiresApproval: false,
      twoPersonApprovalRequired: false,
      commandExecuted: false,
      commandFailed: false,
      commandEscalated: false,
      executionInstructions: [],
      reasons,
      adminQueueItemCreatedEvent,
      adminCommandAllowedEvent: null,
      adminCommandDeniedEvent: adminQueueItemCreatedEvent,
      adminCommandRequiresApprovalEvent: null,
      adminCommandExecutedEvent: null,
      adminCommandFailedEvent: null,
      adminCommandEscalatedEvent: null,
      metadata: input.metadata ?? {}
    };
  }

  const status = decideAdminCommandStatus({
    input,
    rule,
    operatorPermissionScore,
    commandRiskScore,
    executionSafetyScore,
    reasons
  });

  const commandAllowed = status === "admin_command_allowed" || status === "admin_command_executed";
  const commandDenied = status === "admin_command_denied";
  const commandRequiresApproval = status === "admin_command_requires_approval";
  const commandExecuted = status === "admin_command_executed";
  const commandFailed = status === "admin_command_failed";
  const commandEscalated =
    commandRequiresApproval &&
    (input.riskScore > 0.7 || input.severityScore > 0.7 || input.privacySensitivityScore > 0.7);

  const twoPersonApprovalRequired =
    input.twoPersonApprovalRequired ||
    (rule.dangerousCommandsRequireTwoPersonApproval && isDangerousCommand(input.commandType));

  const executionInstructions = commandAllowed
    ? [
        commandToInstruction(input),
        {
          targetSystem: "audit",
          targetObjectId: input.adminCommandId,
          action: "create_audit",
          reasonCode: "admin_command_audit_required",
          payload: {
            queueType: input.queueType,
            commandType: input.commandType,
            operatorUserId: input.operatorUserId,
            targetSystem: input.targetSystem,
            targetObjectId: input.targetObjectId
          }
        } satisfies AdminExecutionInstruction
      ]
    : [];

  const verificationStatus = commandAllowed ? "verified" : "rejected";

  const adminQueueItemCreatedEvent = createAdminAlphabetEvent({
    input,
    eventType: "admin_queue_item_created",
    rawScore: queuePriorityScore,
    qualityScore: operatorPermissionScore,
    riskScore: commandRiskScore,
    verificationStatus,
    metadata: { status, reasons }
  });

  const adminCommandAllowedEvent =
    status === "admin_command_allowed"
      ? createAdminAlphabetEvent({
          input,
          eventType: "admin_command_allowed",
          rawScore: operatorPermissionScore,
          qualityScore: executionSafetyScore,
          riskScore: commandRiskScore,
          verificationStatus: "verified",
          metadata: { status, reasons }
        })
      : null;

  const adminCommandDeniedEvent = commandDenied
    ? createAdminAlphabetEvent({
        input,
        eventType: "admin_command_denied",
        rawScore: operatorPermissionScore,
        qualityScore: executionSafetyScore,
        riskScore: commandRiskScore,
        verificationStatus: "rejected",
        metadata: { status, reasons }
      })
    : null;

  const adminCommandRequiresApprovalEvent = commandRequiresApproval
    ? createAdminAlphabetEvent({
        input,
        eventType: "admin_command_requires_approval",
        rawScore: operatorPermissionScore,
        qualityScore: executionSafetyScore,
        riskScore: commandRiskScore,
        verificationStatus: "rejected",
        metadata: {
          status,
          twoPersonApprovalRequired,
          reasons
        }
      })
    : null;

  const adminCommandExecutedEvent = commandExecuted
    ? createAdminAlphabetEvent({
        input,
        eventType: "admin_command_executed",
        rawScore: operatorPermissionScore,
        qualityScore: executionSafetyScore,
        riskScore: commandRiskScore,
        verificationStatus: "verified",
        metadata: {
          status,
          executionInstructions,
          reasons
        }
      })
    : null;

  const adminCommandFailedEvent = commandFailed
    ? createAdminAlphabetEvent({
        input,
        eventType: "admin_command_failed",
        rawScore: operatorPermissionScore,
        qualityScore: executionSafetyScore,
        riskScore: commandRiskScore,
        verificationStatus: "rejected",
        metadata: { status, reasons }
      })
    : null;

  const adminCommandEscalatedEvent = commandEscalated
    ? createAdminAlphabetEvent({
        input,
        eventType: "admin_command_escalated",
        rawScore: queuePriorityScore,
        qualityScore: executionSafetyScore,
        riskScore: commandRiskScore,
        verificationStatus: "rejected",
        metadata: { status, reasons }
      })
    : null;

  return {
    adminCommandId: input.adminCommandId,
    adminQueueItemId: input.adminQueueItemId ?? null,
    queueType: input.queueType,
    operatorUserId: input.operatorUserId,
    operatorRole: input.operatorRole,
    permissionScope: input.permissionScope,
    commandType: input.commandType,
    targetSystem: input.targetSystem,
    targetObjectId: input.targetObjectId,
    status: commandEscalated ? "admin_command_escalated" : status,
    operatorPermissionScore,
    commandRiskScore,
    queuePriorityScore,
    executionSafetyScore,
    commandAllowed,
    commandDenied,
    commandRequiresApproval,
    twoPersonApprovalRequired,
    commandExecuted,
    commandFailed,
    commandEscalated,
    executionInstructions,
    reasons,
    adminQueueItemCreatedEvent,
    adminCommandAllowedEvent,
    adminCommandDeniedEvent,
    adminCommandRequiresApprovalEvent,
    adminCommandExecutedEvent,
    adminCommandFailedEvent,
    adminCommandEscalatedEvent,
    metadata: {
      ruleQueueType: rule.queueType,
      ...input.metadata
    }
  };
}
