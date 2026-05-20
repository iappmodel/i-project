import { beforeEach, describe, expect, it } from "vitest";
import {
  createNotification,
  getNotification,
  getNotificationVerificationResult,
  listNotificationsForUser,
  markNotificationClicked,
  markNotificationRead,
  resetNotificationStoreForTests,
  verifyStoredNotification
} from "../notification-store";

describe("notification-store", () => {
  beforeEach(() => {
    resetNotificationStoreForTests();
  });

  it("creates notification", () => {
    const notification = createNotification({
      userId: crypto.randomUUID(),
      category: "wallet",
      channel: "in_app",
      priority: "normal",
      title: "Wallet updated",
      body: "Your wallet balance changed.",
      explanationLevel: "standard",
      appealAllowed: false,
      userActionRequired: false,
      sensitiveLogicRedacted: true,
      containsComplianceDetail: false,
      containsFraudDetail: false,
      ageBand: "18_plus"
    });

    expect(notification.status).toBe("created");

    const stored = getNotification(notification.notificationId);
    expect(stored?.notificationId).toBe(notification.notificationId);
  });

  it("lists notifications for user", () => {
    const userId = crypto.randomUUID();

    createNotification({
      userId,
      category: "wallet",
      channel: "in_app",
      priority: "normal",
      title: "Wallet updated",
      body: "Your wallet balance changed.",
      explanationLevel: "standard",
      appealAllowed: false,
      userActionRequired: false,
      sensitiveLogicRedacted: true,
      containsComplianceDetail: false,
      containsFraudDetail: false,
      ageBand: "18_plus"
    });

    createNotification({
      userId,
      category: "reward",
      channel: "in_app",
      priority: "low",
      title: "Reward earned",
      body: "You earned a reward.",
      explanationLevel: "standard",
      appealAllowed: false,
      userActionRequired: false,
      sensitiveLogicRedacted: true,
      containsComplianceDetail: false,
      containsFraudDetail: false,
      ageBand: "18_plus"
    });

    expect(listNotificationsForUser(userId)).toHaveLength(2);
  });

  it("verifies stored notification", () => {
    const notification = createNotification({
      userId: crypto.randomUUID(),
      walletId: crypto.randomUUID(),
      category: "withdrawal",
      channel: "in_app",
      priority: "high",
      title: "Withdrawal approved",
      body: "Your withdrawal was approved.",
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

    const result = verifyStoredNotification({
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
      urgencyScore: 0.6
    });

    expect(result.status).toBe("notification_sent");

    const storedResult = getNotificationVerificationResult(notification.notificationId);
    expect(storedResult?.status).toBe("notification_sent");

    const updated = getNotification(notification.notificationId);
    expect(updated?.status).toBe("sent");
  });

  it("marks notification read", () => {
    const notification = createNotification({
      userId: crypto.randomUUID(),
      category: "wallet",
      channel: "in_app",
      priority: "normal",
      title: "Wallet updated",
      body: "Your wallet balance changed.",
      explanationLevel: "standard",
      appealAllowed: false,
      userActionRequired: false,
      sensitiveLogicRedacted: true,
      containsComplianceDetail: false,
      containsFraudDetail: false,
      ageBand: "18_plus"
    });

    const read = markNotificationRead(notification.notificationId);

    expect(read.status).toBe("read");
    expect(read.readAt).toBeTruthy();
  });

  it("marks notification clicked", () => {
    const notification = createNotification({
      userId: crypto.randomUUID(),
      category: "wallet",
      channel: "in_app",
      priority: "normal",
      title: "Wallet updated",
      body: "Your wallet balance changed.",
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

    const clicked = markNotificationClicked(notification.notificationId);

    expect(clicked.status).toBe("clicked");
    expect(clicked.clickedAt).toBeTruthy();
  });
});
