import {
  createPolicyDecisionRecord,
  evaluateStoredPolicyDecision
} from "./policy-orchestrator-store";
import {
  createTrustEventFromPolicyResult,
  createUValueEventFromPolicyResult
} from "./policy-orchestrator-event-factory";
import { applyTrustImpactEventToUser, getOrCreateTrustScore } from "./trust-store";
import { applyUValueImpactEventToUser, getOrCreateUValueState } from "./u-value-store";
import { createNotification, verifyStoredNotification } from "./notification-store";

const userId = crypto.randomUUID();
const contentId = crypto.randomUUID();

const policyRecord = createPolicyDecisionRecord({
  userId,
  contentId,
  actionType: "view_content",
  primaryDomain: "safety",
  gateResults: [
    {
      gateName: "age",
      decision: "pass",
      score: 0.95,
      riskScore: 0.02,
      hardBlock: false,
      reasonCodes: ["age_permission_allowed"]
    },
    {
      gateName: "safety",
      decision: "pass",
      score: 0.9,
      riskScore: 0.04,
      hardBlock: false,
      reasonCodes: ["content_safety_allowed"]
    }
  ],
  riskSignals: {
    ageRisk: 0.02,
    safetyRisk: 0.04,
    rightsRisk: 0,
    fraudRisk: 0.01,
    paymentRisk: 0,
    treasuryRisk: 0,
    privacyRisk: 0.02,
    complianceRisk: 0.01,
    reputationRisk: 0.01
  },
  ageBand: "18_plus",
  trustScore: 80,
  uValueScore: 40,
  contentSafetyStatus: "safety_allowed"
});

const policyResult = evaluateStoredPolicyDecision({
  policyDecisionId: policyRecord.policyDecisionId,
  actionRequested: true,
  reviewRequested: false,
  auditRequested: false,
  treasuryRequested: false,
  notificationRequested: true
});

const trustEvent = createTrustEventFromPolicyResult(policyResult);
if (trustEvent) applyTrustImpactEventToUser(trustEvent);

const uValueEvent = createUValueEventFromPolicyResult(policyResult);
if (uValueEvent) applyUValueImpactEventToUser(uValueEvent);

const notification = createNotification({
  userId,
  walletId: null,
  category: "system",
  channel: "in_app",
  priority: policyResult.allowed ? "normal" : "high",
  sourceEventId: policyResult.policyDecisionCreatedEvent.eventId,
  sourceObjectType: "policy_decision",
  sourceObjectId: policyResult.policyDecisionId,
  title: policyResult.allowed ? "Action approved" : "Action needs review",
  body: policyResult.reasons.join(", "),
  actionLabel: policyResult.reviewRequired ? "Open review" : null,
  actionTarget: policyResult.reviewRequired ? "/review" : null,
  explanationLevel: "standard",
  appealAllowed: true,
  userActionRequired: policyResult.reviewRequired || policyResult.guardianRequired,
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
  adminReviewRequired: policyResult.reviewRequired,
  deliveryProviderHealthy: true,
  abuseRisk: 0.05,
  privacyRisk: 0.05,
  exploitLeakRisk: 0.05,
  confusionRisk: 0.05,
  urgencyScore: 0.5
});

console.log("Policy:");
console.log(JSON.stringify(policyResult, null, 2));

console.log("Policy notification:");
console.log(JSON.stringify(notificationResult, null, 2));

console.log("User Trust:");
console.log(JSON.stringify(getOrCreateTrustScore(userId), null, 2));

console.log("User U Value:");
console.log(JSON.stringify(getOrCreateUValueState(userId), null, 2));
