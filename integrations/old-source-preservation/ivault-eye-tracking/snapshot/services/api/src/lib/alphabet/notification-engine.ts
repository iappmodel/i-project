import { NOTIFICATION_RULES } from "../../data/alphabet/notification-rules";
import type { AlphabetEvent } from "../../types/alphabet/event.types";
import type {
  NotificationRuleSet,
  NotificationSignalInput,
  NotificationVerificationResult,
  NotificationVerificationStatus
} from "../../types/alphabet/notification.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function findRule(input: NotificationSignalInput): NotificationRuleSet | undefined {
  return NOTIFICATION_RULES.find(
    (rule) =>
      rule.active &&
      rule.category === input.category &&
      rule.channel === input.channel
  );
}

function fallbackRule(input: NotificationSignalInput): NotificationRuleSet | undefined {
  return NOTIFICATION_RULES.find(
    (rule) =>
      rule.active &&
      rule.category === "system" &&
      rule.channel === input.channel
  );
}

function isUnder13(ageBand: string): boolean {
  return ageBand === "under_13";
}

function isTeen(ageBand: string): boolean {
  return ageBand === "13_15" || ageBand === "16_17";
}

function priorityWeight(priority: NotificationSignalInput["priority"]): number {
  switch (priority) {
    case "low":
      return 0.2;
    case "normal":
      return 0.4;
    case "high":
      return 0.65;
    case "urgent":
      return 0.85;
    case "critical":
      return 1;
    default:
      return 0.4;
  }
}

function calculateRiskScore(input: NotificationSignalInput): number {
  let risk =
    clamp(input.abuseRisk) * 0.2 +
    clamp(input.privacyRisk) * 0.25 +
    clamp(input.exploitLeakRisk) * 0.35 +
    clamp(input.confusionRisk) * 0.15 +
    (input.containsFraudDetail ? 0.03 : 0) +
    (input.containsComplianceDetail ? 0.02 : 0);

  if (!input.sensitiveLogicRedacted && input.explanationLevel !== "admin_full") {
    risk += 0.1;
  }

  if (input.userOptedOut && input.priority !== "critical") {
    risk += 0.05;
  }

  return clamp(risk);
}

function calculateMessageSafetyScore(input: NotificationSignalInput): number {
  const redactionScore = input.sensitiveLogicRedacted ? 1 : 0.35;
  const detailSafety =
    input.explanationLevel === "admin_full" && input.channel !== "admin" ? 0.3 : 1;
  const riskScore = calculateRiskScore(input);

  return clamp(
    redactionScore * 0.3 +
      detailSafety * 0.2 +
      (1 - clamp(input.privacyRisk)) * 0.2 +
      (1 - clamp(input.exploitLeakRisk)) * 0.2 +
      (1 - riskScore) * 0.1
  );
}

function calculateDeliveryPriorityScore(input: NotificationSignalInput): number {
  const channelScore = input.userCanReceiveChannel ? 1 : 0;
  const optOutPenalty = input.userOptedOut && input.priority !== "critical" ? 0.4 : 1;

  return (
    clamp(
      priorityWeight(input.priority) * 0.45 +
        clamp(input.urgencyScore) * 0.35 +
        channelScore * 0.2
    ) * optOutPenalty
  );
}

function calculateActionUrgencyScore(input: NotificationSignalInput): number {
  return clamp(
    clamp(input.urgencyScore) * 0.5 +
      (input.userActionRequired ? 0.35 : 0) +
      (input.appealAllowed ? 0.1 : 0) +
      (input.priority === "critical" ? 0.05 : 0)
  );
}

function redactExploitSensitiveText(input: NotificationSignalInput): {
  redactedTitle: string;
  redactedBody: string;
} {
  let title = input.title;
  let body = input.body;

  const shouldRedact =
    input.explanationLevel !== "admin_full" &&
    (input.containsFraudDetail ||
      input.containsComplianceDetail ||
      input.exploitLeakRisk > 0.2);

  if (!shouldRedact) {
    return { redactedTitle: title, redactedBody: body };
  }

  const replacements: Array<[RegExp, string]> = [
    [/fraud threshold[s]?:?\s*[0-9.]+/gi, "risk threshold"],
    [/risk score[s]?:?\s*[0-9.]+/gi, "risk score"],
    [/model weight[s]?:?\s*[0-9.]+/gi, "internal risk signal"],
    [/spoofing score[s]?:?\s*[0-9.]+/gi, "location integrity signal"],
    [/grant formula[s]?:?.*/gi, "grant eligibility logic"],
    [/exact rule[s]?:?.*/gi, "platform policy"]
  ];

  for (const [pattern, replacement] of replacements) {
    title = title.replace(pattern, replacement);
    body = body.replace(pattern, replacement);
  }

  if (input.containsFraudDetail) {
    body = `${body}\n\nFor security reasons, some internal risk details are not shown.`;
  }

  if (input.containsComplianceDetail) {
    body = `${body}\n\nSome compliance checks may require manual review.`;
  }

  return { redactedTitle: title, redactedBody: body };
}

function decideNotificationStatus(params: {
  input: NotificationSignalInput;
  rule: NotificationRuleSet;
  messageSafetyScore: number;
  deliveryPriorityScore: number;
  actionUrgencyScore: number;
  riskScore: number;
  reasons: string[];
}): NotificationVerificationStatus {
  const { input, rule, messageSafetyScore, deliveryPriorityScore, riskScore, reasons } =
    params;

  if (isUnder13(input.ageBand) && !rule.under13Allowed) {
    reasons.push("under_13_not_allowed_for_notification");
    return "notification_suppressed";
  }

  if (isTeen(input.ageBand) && !rule.teenAllowed) {
    reasons.push("teen_not_allowed_for_notification");
    return "notification_suppressed";
  }

  if (
    isUnder13(input.ageBand) &&
    rule.guardianRequiredForUnder13 &&
    input.guardianRoutingRequired &&
    !input.guardianAvailable
  ) {
    reasons.push("guardian_routing_required_but_unavailable");
    return "notification_requires_review";
  }

  if (!input.userCanReceiveChannel) {
    reasons.push("user_cannot_receive_channel");
    return "notification_failed";
  }

  if (input.userOptedOut && input.priority !== "critical") {
    reasons.push("user_opted_out");
    return "notification_suppressed";
  }

  if (!input.deliveryProviderHealthy) {
    reasons.push("delivery_provider_unhealthy");
    return "notification_failed";
  }

  if (input.containsFraudDetail && !rule.allowSensitiveFraudDetail) {
    reasons.push("fraud_detail_redaction_required");
  }

  if (input.containsComplianceDetail && !rule.allowComplianceDetail) {
    reasons.push("compliance_detail_redaction_required");
  }

  if (input.abuseRisk > rule.maxAbuseRisk) {
    reasons.push("abuse_risk_above_maximum");
    return "notification_requires_review";
  }

  if (input.privacyRisk > rule.maxPrivacyRisk) {
    reasons.push("privacy_risk_above_maximum");
    return "notification_requires_review";
  }

  if (input.exploitLeakRisk > rule.maxExploitLeakRisk) {
    reasons.push("exploit_leak_risk_above_maximum");
    return "notification_requires_review";
  }

  if (input.confusionRisk > rule.maxConfusionRisk) {
    reasons.push("confusion_risk_above_maximum");
    return "notification_requires_review";
  }

  if (riskScore > 0.7) {
    reasons.push("notification_risk_score_too_high");
    return "notification_requires_review";
  }

  if (rule.requiresReviewForCritical && input.priority === "critical" && input.adminReviewRequired) {
    reasons.push("critical_notification_requires_review");
    return "notification_requires_review";
  }

  if (messageSafetyScore < rule.minMessageSafetyScore) {
    reasons.push("message_safety_score_below_minimum");
    return "notification_requires_review";
  }

  if (deliveryPriorityScore < rule.minDeliveryPriorityScore) {
    reasons.push("delivery_priority_score_below_minimum");
    return "notification_queued";
  }

  reasons.push("notification_sent");
  return "notification_sent";
}

function createNotificationAlphabetEvent(params: {
  input: NotificationSignalInput;
  eventType: AlphabetEvent["eventType"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: params.input.userId,
    coinCode: "J",
    eventType: params.eventType,
    objectType: "notification",
    objectId: params.input.notificationId,
    sourceContext: "system",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: params.input.ageBand,
    verificationStatus: params.verificationStatus,
    metadata: {
      notificationId: params.input.notificationId,
      walletId: params.input.walletId ?? null,
      category: params.input.category,
      channel: params.input.channel,
      priority: params.input.priority,
      sourceEventId: params.input.sourceEventId ?? null,
      sourceObjectType: params.input.sourceObjectType ?? null,
      sourceObjectId: params.input.sourceObjectId ?? null,
      explanationLevel: params.input.explanationLevel,
      appealAllowed: params.input.appealAllowed,
      userActionRequired: params.input.userActionRequired,
      ...params.metadata,
      ...params.input.metadata
    },
    createdAt: new Date().toISOString()
  };
}

export function verifyNotificationMessage(
  input: NotificationSignalInput
): NotificationVerificationResult {
  const reasons: string[] = [];
  const rule = findRule(input) ?? fallbackRule(input);

  const messageSafetyScore = calculateMessageSafetyScore(input);
  const deliveryPriorityScore = calculateDeliveryPriorityScore(input);
  const actionUrgencyScore = calculateActionUrgencyScore(input);
  const riskScore = calculateRiskScore(input);

  const { redactedTitle, redactedBody } = redactExploitSensitiveText(input);

  if (!rule) {
    reasons.push("no_active_notification_rule");

    const notificationCreatedEvent = createNotificationAlphabetEvent({
      input,
      eventType: "notification_created",
      rawScore: deliveryPriorityScore,
      qualityScore: messageSafetyScore,
      riskScore,
      verificationStatus: "rejected",
      metadata: { reasons }
    });

    return {
      notificationId: input.notificationId,
      userId: input.userId,
      walletId: input.walletId ?? null,
      status: "notification_failed",
      messageSafetyScore,
      deliveryPriorityScore,
      actionUrgencyScore,
      riskScore,
      redactedTitle,
      redactedBody,
      reasons,
      notificationCreatedEvent,
      notificationSentEvent: null,
      notificationReadEvent: null,
      notificationActionClickedEvent: null,
      notificationSuppressedEvent: null,
      metadata: input.metadata ?? {}
    };
  }

  const status = decideNotificationStatus({
    input,
    rule,
    messageSafetyScore,
    deliveryPriorityScore,
    actionUrgencyScore,
    riskScore,
    reasons
  });

  const verificationStatus =
    status === "notification_sent" ||
    status === "notification_queued" ||
    status === "notification_created"
      ? "verified"
      : "rejected";

  const notificationCreatedEvent = createNotificationAlphabetEvent({
    input,
    eventType: "notification_created",
    rawScore: deliveryPriorityScore,
    qualityScore: messageSafetyScore,
    riskScore,
    verificationStatus,
    metadata: {
      status,
      redactedTitle,
      redactedBody,
      reasons
    }
  });

  const notificationSentEvent =
    status === "notification_sent"
      ? createNotificationAlphabetEvent({
          input,
          eventType: "notification_sent",
          rawScore: deliveryPriorityScore,
          qualityScore: messageSafetyScore,
          riskScore,
          verificationStatus: "verified",
          metadata: {
            status,
            redactedTitle,
            redactedBody,
            reasons
          }
        })
      : null;

  const notificationReadEvent =
    input.metadata?.["read"] === true
      ? createNotificationAlphabetEvent({
          input,
          eventType: "notification_read",
          rawScore: 1,
          qualityScore: messageSafetyScore,
          riskScore,
          verificationStatus: "verified",
          metadata: {
            status,
            reasons
          }
        })
      : null;

  const notificationActionClickedEvent =
    input.metadata?.["actionClicked"] === true
      ? createNotificationAlphabetEvent({
          input,
          eventType: "notification_action_clicked",
          rawScore: actionUrgencyScore,
          qualityScore: messageSafetyScore,
          riskScore,
          verificationStatus: "verified",
          metadata: {
            status,
            actionLabel: input.actionLabel ?? null,
            actionTarget: input.actionTarget ?? null,
            reasons
          }
        })
      : null;

  const notificationSuppressedEvent =
    status === "notification_suppressed" ||
    status === "notification_requires_review"
      ? createNotificationAlphabetEvent({
          input,
          eventType: "notification_suppressed",
          rawScore: deliveryPriorityScore,
          qualityScore: messageSafetyScore,
          riskScore,
          verificationStatus: "rejected",
          metadata: {
            status,
            reasons
          }
        })
      : null;

  return {
    notificationId: input.notificationId,
    userId: input.userId,
    walletId: input.walletId ?? null,
    status,
    messageSafetyScore,
    deliveryPriorityScore,
    actionUrgencyScore,
    riskScore,
    redactedTitle,
    redactedBody,
    reasons,
    notificationCreatedEvent,
    notificationSentEvent,
    notificationReadEvent,
    notificationActionClickedEvent,
    notificationSuppressedEvent,
    metadata: {
      ruleCategory: rule.category,
      ruleChannel: rule.channel,
      ...input.metadata
    }
  };
}
