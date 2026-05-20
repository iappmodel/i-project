import type { WorkerHandlerContext, WorkerHandlerResult } from "@/types/alphabet/worker-runtime.types";
import { insertNotificationRecordDb } from "../../db-repositories/notifications.repository";

function getPayloadValue<T>(payload: unknown, key: string): T | null {
  if (!payload || typeof payload !== "object") return null;
  return (payload as Record<string, T>)[key] ?? null;
}

export async function notificationSendHandler(
  context: WorkerHandlerContext
): Promise<WorkerHandlerResult> {
  const payload = context.executionRequest.sanitized_payload;

  const recipientUserId =
    getPayloadValue<string>(payload, "recipientUserId") ??
    getPayloadValue<string>(payload, "userId");

  if (!recipientUserId) {
    return {
      ok: false,
      status: "failed",
      resultPayload: {
        error: "notification_missing_recipient"
      },
      ledgerEntryIds: [],
      auditRecordIds: [],
      notificationIds: [],
      eventIds: [],
      publicMessage: "Notification could not be created.",
      internalReasonCodes: ["notification_missing_recipient"],
      retryable: false
    };
  }

  const notification = await insertNotificationRecordDb({
    recipientUserId,
    sourceSystem: "execution_worker",
    sourceObjectId: context.executionRequest.execution_request_id,
    sourceEventIds: context.executionRequest.source_event_ids,
    category: getPayloadValue<string>(payload, "category") ?? "system",
    severity: getPayloadValue<string>(payload, "severity") ?? "info",
    status: "created",
    title: getPayloadValue<string>(payload, "title") ?? "Update",
    body: getPayloadValue<string>(payload, "body") ?? "Your action was updated.",
    explanationClass: "worker_notification",
    objectLabel: "action",
    internalReasonCodes: ["notification_created_by_worker"],
    privacySensitivity: "medium",
    dedupeKey: context.executionRequest.dedupe_key,
    metadata: {
      workerId: context.workerId
    }
  });

  return {
    ok: true,
    status: "completed",
    resultPayload: {
      notificationId: notification.notification_id,
      status: notification.status
    },
    ledgerEntryIds: [],
    auditRecordIds: [],
    notificationIds: [notification.notification_id],
    eventIds: [],
    publicMessage: "Notification created.",
    internalReasonCodes: ["notification_created"],
    retryable: false
  };
}
