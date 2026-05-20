import type { WorkerHandlerContext, WorkerHandlerResult } from "@/types/alphabet/worker-runtime.types";

export async function systemNoopHandler(
  context: WorkerHandlerContext
): Promise<WorkerHandlerResult> {
  return {
    ok: true,
    status: "completed",
    resultPayload: {
      noop: true,
      executionRequestId: context.executionRequest.execution_request_id
    },
    ledgerEntryIds: [],
    auditRecordIds: [],
    notificationIds: [],
    eventIds: [],
    publicMessage: "No operation completed.",
    internalReasonCodes: ["system_noop_completed"],
    retryable: false
  };
}
