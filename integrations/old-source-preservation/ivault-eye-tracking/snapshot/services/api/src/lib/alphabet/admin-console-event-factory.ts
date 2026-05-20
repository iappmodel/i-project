import type { AdminConsoleEvaluationResult } from "../../types/alphabet/admin-console.types";
import type { TrustImpactEvent } from "../../types/alphabet/trust.types";
import type { UValueImpactEvent } from "../../types/alphabet/u-value.types";
import { createTrustImpactEvent } from "./trust-event-factory";
import { createUValueImpactEvent } from "./u-value-event-factory";

export function createTrustEventFromAdminCommand(
  result: AdminConsoleEvaluationResult
): TrustImpactEvent | null {
  if (result.commandExecuted) {
    return createTrustImpactEvent({
      userId: result.operatorUserId,
      eventType: "admin_command_clean_execution",
      category: "reputation",
      severity: "positive_small",
      sourceEventId: result.adminCommandExecutedEvent?.eventId ?? null,
      confidence: result.executionSafetyScore,
      metadata: {
        adminCommandId: result.adminCommandId,
        queueType: result.queueType,
        commandType: result.commandType,
        targetSystem: result.targetSystem,
        targetObjectId: result.targetObjectId
      }
    });
  }

  if (result.commandDenied || result.commandFailed) {
    return createTrustImpactEvent({
      userId: result.operatorUserId,
      eventType: "admin_command_failed_or_denied",
      category: "reputation",
      severity: "negative_small",
      sourceEventId:
        result.adminCommandDeniedEvent?.eventId ?? result.adminCommandFailedEvent?.eventId ?? null,
      confidence: 0.7,
      metadata: {
        adminCommandId: result.adminCommandId,
        queueType: result.queueType,
        commandType: result.commandType,
        reasons: result.reasons
      }
    });
  }

  return null;
}

export function createUValueEventFromAdminCommand(
  result: AdminConsoleEvaluationResult
): UValueImpactEvent | null {
  if (result.commandExecuted) {
    return createUValueImpactEvent({
      userId: result.operatorUserId,
      eventType: "admin_command_executed",
      category: "trust",
      severity: "positive_small",
      coinCode: "J",
      sourceEventId: result.adminCommandExecutedEvent?.eventId ?? null,
      confidence: result.executionSafetyScore,
      metadata: {
        adminCommandId: result.adminCommandId,
        queueType: result.queueType,
        commandType: result.commandType
      }
    });
  }

  if (result.commandEscalated) {
    return createUValueImpactEvent({
      userId: result.operatorUserId,
      eventType: "admin_command_escalated",
      category: "trust",
      severity: "negative_small",
      coinCode: "J",
      sourceEventId: result.adminCommandEscalatedEvent?.eventId ?? null,
      confidence: 0.65,
      metadata: {
        adminCommandId: result.adminCommandId,
        queueType: result.queueType,
        commandType: result.commandType,
        reasons: result.reasons
      }
    });
  }

  return null;
}
