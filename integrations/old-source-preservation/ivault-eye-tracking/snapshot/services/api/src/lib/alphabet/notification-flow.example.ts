import {
  createNotification,
  verifyStoredNotification
} from "./notification-store";
import { createNotificationObservabilityEvent } from "./notification-event-factory";

const userId = crypto.randomUUID();
const walletId = crypto.randomUUID();

const notification = createNotification({
  userId,
  walletId,
  category: "withdrawal",
  channel: "in_app",
  priority: "high",
  sourceEventId: crypto.randomUUID(),
  sourceObjectType: "withdrawal_request",
  sourceObjectId: crypto.randomUUID(),
  title: "Withdrawal approved",
  body: "Your withdrawal was approved and is being processed.",
  actionLabel: "View wallet",
  actionTarget: "/wallet",
  explanationLevel: "standard",
  appealAllowed: false,
  userActionRequired: false,
  sensitiveLogicRedacted: true,
  containsComplianceDetail: false,
  containsFraudDetail: false,
  ageBand: "18_plus"
});

const notificationResult = verifyStoredNotification({
  notificationId: notification.notificationId,

  userCanReceiveChannel: true,
  userOptedOut: false,

  guardianRoutingRequired: false,
  guardianAvailable: false,

  adminReviewRequired: false,

  deliveryProviderHealthy: true,

  abuseRisk: 0.02,
  privacyRisk: 0.02,
  exploitLeakRisk: 0.02,
  confusionRisk: 0.02,
  urgencyScore: 0.6,

  metadata: {
    read: true,
    actionClicked: true
  }
});

const observabilityEvent = createNotificationObservabilityEvent(notificationResult);

console.log("Notification:");
console.log(JSON.stringify(notificationResult, null, 2));

console.log("Observability:");
console.log(JSON.stringify(observabilityEvent, null, 2));

// Domain mutations (reward/wallet/trust/u_value) should be driven by underlying
// domain events and business engines, not by notification delivery outcomes.
// TODO: Add NotificationInboxScreen later; feed/wallet entry points already exist
// in the current UI (wallet pips + user action cards).
