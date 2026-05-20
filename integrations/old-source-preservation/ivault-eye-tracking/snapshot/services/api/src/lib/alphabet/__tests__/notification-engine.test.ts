import { describe, expect, it } from "vitest";
import type { NotificationSignalInput } from "../../../types/alphabet/notification.types";
import { verifyNotificationMessage } from "../notification-engine";

function makeInput(
  overrides: Partial<NotificationSignalInput> = {}
): NotificationSignalInput {
  return {
    notificationId: crypto.randomUUID(),

    userId: crypto.randomUUID(),
    walletId: crypto.randomUUID(),

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

    ageBand: "18_plus",

    metadata: {},
    ...overrides
  };
}

describe("notification-engine", () => {
  it("sends clean notification", () => {
    const result = verifyNotificationMessage(makeInput());

    expect(result.status).toBe("notification_sent");
    expect(result.notificationSentEvent?.eventType).toBe("notification_sent");
  });

  it("suppresses opted-out non-critical notification", () => {
    const result = verifyNotificationMessage(
      makeInput({
        userOptedOut: true,
        priority: "normal"
      })
    );

    expect(result.status).toBe("notification_suppressed");
    expect(result.reasons).toContain("user_opted_out");
  });

  it("sends critical notification even if opted out", () => {
    const result = verifyNotificationMessage(
      makeInput({
        userOptedOut: true,
        priority: "critical",
        adminReviewRequired: false
      })
    );

    expect(["notification_sent", "notification_requires_review"]).toContain(
      result.status
    );
  });

  it("fails if user cannot receive channel", () => {
    const result = verifyNotificationMessage(
      makeInput({
        userCanReceiveChannel: false
      })
    );

    expect(result.status).toBe("notification_failed");
    expect(result.reasons).toContain("user_cannot_receive_channel");
  });

  it("fails if delivery provider unhealthy", () => {
    const result = verifyNotificationMessage(
      makeInput({
        deliveryProviderHealthy: false
      })
    );

    expect(result.status).toBe("notification_failed");
    expect(result.reasons).toContain("delivery_provider_unhealthy");
  });

  it("requires review for high exploit leak risk", () => {
    const result = verifyNotificationMessage(
      makeInput({
        exploitLeakRisk: 0.95
      })
    );

    expect(result.status).toBe("notification_requires_review");
    expect(result.reasons).toContain("exploit_leak_risk_above_maximum");
  });

  it("redacts fraud details", () => {
    const result = verifyNotificationMessage(
      makeInput({
        category: "withdrawal",
        containsFraudDetail: true,
        exploitLeakRisk: 0.1,
        body: "Your withdrawal was blocked because fraud threshold: 0.72 was triggered.",
        sensitiveLogicRedacted: true
      })
    );

    expect(result.redactedBody).not.toContain("fraud threshold: 0.72");
    expect(result.redactedBody).toContain("For security reasons");
  });

  it("allows admin full detail for admin channel", () => {
    const result = verifyNotificationMessage(
      makeInput({
        category: "system",
        channel: "admin",
        explanationLevel: "admin_full",
        containsFraudDetail: true,
        sensitiveLogicRedacted: false,
        exploitLeakRisk: 0.5
      })
    );

    expect(["notification_sent", "notification_queued"]).toContain(result.status);
  });

  it("routes under 13 guardian-required messages to review if guardian unavailable", () => {
    const result = verifyNotificationMessage(
      makeInput({
        category: "wallet",
        ageBand: "under_13",
        guardianRoutingRequired: true,
        guardianAvailable: false
      })
    );

    expect(result.status).toBe("notification_requires_review");
    expect(result.reasons).toContain("guardian_routing_required_but_unavailable");
  });

  it("creates read and click events when metadata says so", () => {
    const result = verifyNotificationMessage(
      makeInput({
        metadata: {
          read: true,
          actionClicked: true
        }
      })
    );

    expect(result.notificationReadEvent?.eventType).toBe("notification_read");
    expect(result.notificationActionClickedEvent?.eventType).toBe(
      "notification_action_clicked"
    );
  });
});
