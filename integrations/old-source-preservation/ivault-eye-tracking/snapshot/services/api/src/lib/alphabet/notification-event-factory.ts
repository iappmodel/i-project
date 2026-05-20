import type { NotificationVerificationResult } from "../../types/alphabet/notification.types";

export interface NotificationObservabilityEvent {
  eventType:
    | "notification_delivery_sent"
    | "notification_delivery_queued"
    | "notification_delivery_suppressed"
    | "notification_delivery_requires_review"
    | "notification_delivery_failed";
  notificationId: string;
  userId: string;
  walletId?: string | null;
  status: NotificationVerificationResult["status"];
  reasons: string[];
  messageSafetyScore: number;
  deliveryPriorityScore: number;
  actionUrgencyScore: number;
  riskScore: number;
  sourceEventId?: string | null;
  sourceObjectType?: string | null;
  sourceObjectId?: string | null;
  createdAt: string;
}

function mapStatusToObservabilityType(
  status: NotificationVerificationResult["status"]
): NotificationObservabilityEvent["eventType"] {
  switch (status) {
    case "notification_sent":
      return "notification_delivery_sent";
    case "notification_queued":
      return "notification_delivery_queued";
    case "notification_suppressed":
      return "notification_delivery_suppressed";
    case "notification_requires_review":
      return "notification_delivery_requires_review";
    case "notification_failed":
    case "notification_created":
    default:
      return "notification_delivery_failed";
  }
}

export function createNotificationObservabilityEvent(
  result: NotificationVerificationResult
): NotificationObservabilityEvent {
  const metadata = result.notificationCreatedEvent.metadata ?? {};

  return {
    eventType: mapStatusToObservabilityType(result.status),
    notificationId: result.notificationId,
    userId: result.userId,
    walletId: result.walletId ?? null,
    status: result.status,
    reasons: result.reasons,
    messageSafetyScore: result.messageSafetyScore,
    deliveryPriorityScore: result.deliveryPriorityScore,
    actionUrgencyScore: result.actionUrgencyScore,
    riskScore: result.riskScore,
    sourceEventId:
      typeof metadata["sourceEventId"] === "string"
        ? metadata["sourceEventId"]
        : null,
    sourceObjectType:
      typeof metadata["sourceObjectType"] === "string"
        ? metadata["sourceObjectType"]
        : null,
    sourceObjectId:
      typeof metadata["sourceObjectId"] === "string"
        ? metadata["sourceObjectId"]
        : null,
    createdAt: new Date().toISOString()
  };
}
