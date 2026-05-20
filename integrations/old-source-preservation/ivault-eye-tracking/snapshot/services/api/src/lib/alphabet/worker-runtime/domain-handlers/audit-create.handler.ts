import type { WorkerHandlerContext, WorkerHandlerResult } from "@/types/alphabet/worker-runtime.types";
import { insertAuditRecordDb } from "../../db-repositories/audits.repository";

function getPayloadValue<T>(payload: unknown, key: string): T | null {
  if (!payload || typeof payload !== "object") return null;
  return (payload as Record<string, T>)[key] ?? null;
}

export async function auditCreateHandler(
  context: WorkerHandlerContext
): Promise<WorkerHandlerResult> {
  const payload = context.executionRequest.sanitized_payload;

  const audit = await insertAuditRecordDb({
    auditType: getPayloadValue<string>(payload, "auditType") ?? "worker_audit",
    status: getPayloadValue<string>(payload, "status") ?? "created",
    userId: getPayloadValue<string>(payload, "userId"),
    policyDecisionId: context.executionRequest.source_policy_decision_id,
    executionRequestId: context.executionRequest.execution_request_id,
    sourceEventIds: context.executionRequest.source_event_ids,
    publicSummary: "Audit record created.",
    internalSummary: "Audit created by execution worker.",
    evidence: {
      executionRequestId: context.executionRequest.execution_request_id
    },
    redactedEvidence: {
      executionRequestId: context.executionRequest.execution_request_id
    },
    riskSummary: {},
    metadata: {
      workerId: context.workerId
    }
  });

  return {
    ok: true,
    status: "completed",
    resultPayload: {
      auditRecordId: audit.audit_record_id,
      status: audit.status
    },
    ledgerEntryIds: [],
    auditRecordIds: [audit.audit_record_id],
    notificationIds: [],
    eventIds: [],
    publicMessage: "Audit created.",
    internalReasonCodes: ["audit_created"],
    retryable: false
  };
}
