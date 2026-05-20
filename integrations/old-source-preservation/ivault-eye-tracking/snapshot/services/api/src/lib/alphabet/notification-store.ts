import type {
  ExplanationLevel,
  NotificationCategory,
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationMessage,
  NotificationPriority,
  NotificationSignalInput,
  NotificationVerificationResult
} from "../../types/alphabet/notification.types";
import { verifyNotificationMessage } from "./notification-engine";

type NotificationStoreState = {
  notifications: Map<string, NotificationMessage>;
  results: Map<string, NotificationVerificationResult>;
};

const store: NotificationStoreState = {
  notifications: new Map(),
  results: new Map()
};

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createNotification(params: {
  userId: string;
  walletId?: string | null;
  category: NotificationCategory;
  channel: NotificationChannel;
  priority: NotificationPriority;
  sourceEventId?: string | null;
  sourceObjectType?: string | null;
  sourceObjectId?: string | null;
  title: string;
  body: string;
  actionLabel?: string | null;
  actionTarget?: string | null;
  explanationLevel: ExplanationLevel;
  appealAllowed: boolean;
  userActionRequired: boolean;
  sensitiveLogicRedacted: boolean;
  containsComplianceDetail: boolean;
  containsFraudDetail: boolean;
  ageBand: string;
  expiresAt?: string | null;
}): NotificationMessage {
  const now = nowIso();

  const notification: NotificationMessage = {
    notificationId: createId("notification"),
    userId: params.userId,
    walletId: params.walletId ?? null,
    category: params.category,
    channel: params.channel,
    priority: params.priority,
    sourceEventId: params.sourceEventId ?? null,
    sourceObjectType: params.sourceObjectType ?? null,
    sourceObjectId: params.sourceObjectId ?? null,
    title: params.title,
    body: params.body,
    actionLabel: params.actionLabel ?? null,
    actionTarget: params.actionTarget ?? null,
    explanationLevel: params.explanationLevel,
    appealAllowed: params.appealAllowed,
    userActionRequired: params.userActionRequired,
    sensitiveLogicRedacted: params.sensitiveLogicRedacted,
    containsComplianceDetail: params.containsComplianceDetail,
    containsFraudDetail: params.containsFraudDetail,
    status: "created",
    ageBand: params.ageBand,
    createdAt: now,
    queuedAt: null,
    sentAt: null,
    readAt: null,
    clickedAt: null,
    expiresAt: params.expiresAt ?? null,
    updatedAt: now
  };

  store.notifications.set(notification.notificationId, notification);

  return notification;
}

export function getNotification(notificationId: string): NotificationMessage | null {
  return store.notifications.get(notificationId) ?? null;
}

export function listNotificationsForUser(userId: string): NotificationMessage[] {
  return Array.from(store.notifications.values()).filter(
    (notification) => notification.userId === userId
  );
}

function statusFromResult(
  status: NotificationVerificationResult["status"]
): NotificationDeliveryStatus {
  switch (status) {
    case "notification_sent":
      return "sent";
    case "notification_queued":
      return "queued";
    case "notification_suppressed":
      return "suppressed";
    case "notification_requires_review":
      return "requires_review";
    case "notification_failed":
      return "failed";
    case "notification_created":
    default:
      return "created";
  }
}

export function verifyStoredNotification(
  input: Omit<
    NotificationSignalInput,
    | "notificationId"
    | "userId"
    | "walletId"
    | "category"
    | "channel"
    | "priority"
    | "sourceEventId"
    | "sourceObjectType"
    | "sourceObjectId"
    | "title"
    | "body"
    | "actionLabel"
    | "actionTarget"
    | "explanationLevel"
    | "appealAllowed"
    | "userActionRequired"
    | "sensitiveLogicRedacted"
    | "containsComplianceDetail"
    | "containsFraudDetail"
    | "ageBand"
  > & {
    notificationId: string;
  }
): NotificationVerificationResult {
  const notification = getNotification(input.notificationId);

  if (!notification) {
    throw new Error("Notification not found.");
  }

  if (
    notification.expiresAt &&
    new Date(notification.expiresAt).getTime() < Date.now()
  ) {
    const expired: NotificationMessage = {
      ...notification,
      status: "failed",
      updatedAt: nowIso()
    };

    store.notifications.set(expired.notificationId, expired);
    throw new Error("Notification expired.");
  }

  const result = verifyNotificationMessage({
    ...input,
    notificationId: notification.notificationId,
    userId: notification.userId,
    walletId: notification.walletId,
    category: notification.category,
    channel: notification.channel,
    priority: notification.priority,
    sourceEventId: notification.sourceEventId,
    sourceObjectType: notification.sourceObjectType,
    sourceObjectId: notification.sourceObjectId,
    title: notification.title,
    body: notification.body,
    actionLabel: notification.actionLabel,
    actionTarget: notification.actionTarget,
    explanationLevel: notification.explanationLevel,
    appealAllowed: notification.appealAllowed,
    userActionRequired: notification.userActionRequired,
    sensitiveLogicRedacted: notification.sensitiveLogicRedacted,
    containsComplianceDetail: notification.containsComplianceDetail,
    containsFraudDetail: notification.containsFraudDetail,
    ageBand: notification.ageBand,
    metadata: {
      ...input.metadata
    }
  });

  const now = nowIso();
  const nextStatus = statusFromResult(result.status);

  const next: NotificationMessage = {
    ...notification,
    title: result.redactedTitle,
    body: result.redactedBody,
    status: nextStatus,
    queuedAt: nextStatus === "queued" ? now : notification.queuedAt,
    sentAt: nextStatus === "sent" ? now : notification.sentAt,
    updatedAt: now
  };

  store.notifications.set(next.notificationId, next);
  store.results.set(result.notificationId, result);

  return result;
}

export function markNotificationRead(notificationId: string): NotificationMessage {
  const notification = getNotification(notificationId);

  if (!notification) {
    throw new Error("Notification not found.");
  }

  const now = nowIso();

  const next: NotificationMessage = {
    ...notification,
    status: "read",
    readAt: now,
    updatedAt: now
  };

  store.notifications.set(next.notificationId, next);

  return next;
}

export function markNotificationClicked(notificationId: string): NotificationMessage {
  const notification = getNotification(notificationId);

  if (!notification) {
    throw new Error("Notification not found.");
  }

  const now = nowIso();

  const next: NotificationMessage = {
    ...notification,
    status: "clicked",
    clickedAt: now,
    updatedAt: now
  };

  store.notifications.set(next.notificationId, next);

  return next;
}

export function getNotificationVerificationResult(
  notificationId: string
): NotificationVerificationResult | null {
  return store.results.get(notificationId) ?? null;
}

export function resetNotificationStoreForTests(): void {
  store.notifications.clear();
  store.results.clear();
}
