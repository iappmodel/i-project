import { getWorkerRuntimeRule } from "@/data/alphabet/worker-runtime-rules";
import type { DbExecutionRequest } from "@/types/alphabet/database.types";
import { insertAuditRecordDb } from "../db-repositories/audits.repository";
import { insertNotificationRecordDb } from "../db-repositories/notifications.repository";

/**
 * Financial mutations must not complete without inspectable audit + user-visible notification records.
 */
export async function recordFinancialAuditAndNotification(params: {
  handlerName: string;
  executionRequest: DbExecutionRequest;
  workerId: string;
  userId: string;
  publicSummary: string;
  ledgerEntryIds: string[];
}): Promise<{ auditRecordIds: string[]; notificationIds: string[] }> {
  const rule = getWorkerRuntimeRule(params.handlerName);
  const auditRecordIds: string[] = [];
  const notificationIds: string[] = [];

  if (!rule?.financialHandler) {
    return { auditRecordIds, notificationIds };
  }

  if (rule.requiresAudit) {
    const audit = await insertAuditRecordDb({
      auditType: `${params.handlerName.replace(".", "_")}_executed`,
      status: "created",
      userId: params.userId,
      policyDecisionId: params.executionRequest.source_policy_decision_id,
      executionRequestId: params.executionRequest.execution_request_id,
      sourceEventIds: params.executionRequest.source_event_ids,
      publicSummary: params.publicSummary,
      internalSummary: `Worker financial action: ${params.handlerName}`,
      evidence: {
        executionRequestId: params.executionRequest.execution_request_id,
        ledgerEntryIds: params.ledgerEntryIds
      },
      redactedEvidence: {
        executionRequestId: params.executionRequest.execution_request_id
      },
      riskSummary: {},
      metadata: { workerId: params.workerId, handlerName: params.handlerName }
    });
    auditRecordIds.push(audit.audit_record_id);
  }

  if (rule.requiresNotification) {
    const note = await insertNotificationRecordDb({
      recipientUserId: params.userId,
      sourceSystem: "execution_worker",
      sourceObjectId: params.executionRequest.execution_request_id,
      sourceEventIds: params.executionRequest.source_event_ids,
      category: "wallet",
      severity: "info",
      status: "created",
      title: "Balance update",
      body: params.publicSummary,
      explanationClass: "worker_financial",
      objectLabel: "wallet",
      internalReasonCodes: [`financial_${params.handlerName}`],
      privacySensitivity: "medium",
      dedupeKey: params.executionRequest.dedupe_key,
      metadata: {
        workerId: params.workerId,
        handlerName: params.handlerName,
        ledgerEntryIds: params.ledgerEntryIds
      }
    });
    notificationIds.push(note.notification_id);
  }

  return { auditRecordIds, notificationIds };
}
