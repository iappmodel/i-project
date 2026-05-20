import type { AlphabetEvent } from "./event.types";

export type NotificationCategory =
  | "reward"
  | "wallet"
  | "conversion"
  | "withdrawal"
  | "trust"
  | "u_value"
  | "safety"
  | "review"
  | "appeal"
  | "grant"
  | "campaign"
  | "creator"
  | "learning"
  | "presence"
  | "work"
  | "identity"
  | "system";

export type NotificationChannel =
  | "in_app"
  | "push"
  | "email"
  | "sms"
  | "admin"
  | "webhook";

export type NotificationPriority =
  | "low"
  | "normal"
  | "high"
  | "urgent"
  | "critical";

export type ExplanationLevel =
  | "minimal"
  | "standard"
  | "detailed"
  | "admin_full";

export type NotificationDeliveryStatus =
  | "created"
  | "queued"
  | "sent"
  | "read"
  | "clicked"
  | "suppressed"
  | "requires_review"
  | "failed";

export type NotificationVerificationStatus =
  | "notification_created"
  | "notification_queued"
  | "notification_sent"
  | "notification_suppressed"
  | "notification_requires_review"
  | "notification_failed";

export interface NotificationMessage {
  notificationId: string;

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

  status: NotificationDeliveryStatus;

  ageBand: string;

  createdAt: string;
  queuedAt?: string | null;
  sentAt?: string | null;
  readAt?: string | null;
  clickedAt?: string | null;
  expiresAt?: string | null;
  updatedAt: string;
}

export interface NotificationSignalInput {
  notificationId: string;

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

  userCanReceiveChannel: boolean;
  userOptedOut: boolean;

  guardianRoutingRequired: boolean;
  guardianAvailable: boolean;

  adminReviewRequired: boolean;

  deliveryProviderHealthy: boolean;

  abuseRisk: number;
  privacyRisk: number;
  exploitLeakRisk: number;
  confusionRisk: number;
  urgencyScore: number;

  ageBand: string;

  metadata?: Record<string, unknown>;
}

export interface NotificationRuleSet {
  category: NotificationCategory;
  channel: NotificationChannel;

  minMessageSafetyScore: number;
  minDeliveryPriorityScore: number;

  maxAbuseRisk: number;
  maxPrivacyRisk: number;
  maxExploitLeakRisk: number;
  maxConfusionRisk: number;

  allowSensitiveFraudDetail: boolean;
  allowComplianceDetail: boolean;

  under13Allowed: boolean;
  teenAllowed: boolean;
  guardianRequiredForUnder13: boolean;

  requiresReviewForCritical: boolean;

  active: boolean;
}

export interface NotificationVerificationResult {
  notificationId: string;

  userId: string;

  walletId?: string | null;

  status: NotificationVerificationStatus;

  messageSafetyScore: number;
  deliveryPriorityScore: number;
  actionUrgencyScore: number;
  riskScore: number;

  redactedTitle: string;
  redactedBody: string;

  reasons: string[];

  notificationCreatedEvent: AlphabetEvent;
  notificationSentEvent?: AlphabetEvent | null;
  notificationReadEvent?: AlphabetEvent | null;
  notificationActionClickedEvent?: AlphabetEvent | null;
  notificationSuppressedEvent?: AlphabetEvent | null;

  metadata: Record<string, unknown>;
}
