/**
 * Orchestration example: user tap → action intent → policy/saga request hooks.
 * Call `runActionIntentFlowExample()` explicitly; this module does not run on import.
 *
 * Action intent is not permission — downstream policy, saga, and execution layers decide outcomes.
 */
import {
  createActionIntentRecord,
  evaluateStoredActionIntent
} from "./action-intent-store";
import {
  createTrustEventFromActionIntentResult,
  createUValueEventFromActionIntentResult
} from "./action-intent-event-factory";
import {
  applyTrustImpactEventToUser,
  getOrCreateTrustScore
} from "./trust-store";
import {
  applyUValueImpactEventToUser,
  getOrCreateUValueState
} from "./u-value-store";

export function runActionIntentFlowExample(): void {
  const userId = crypto.randomUUID();
  const walletId = crypto.randomUUID();

  const intent = createActionIntentRecord({
    intentType: "withdraw",
    intentSource: "user",
    userId,
    walletId,
    sessionId: crypto.randomUUID(),
    deviceId: crypto.randomUUID(),
    clientRequestId: crypto.randomUUID(),
    idempotencyKey: `withdraw:${userId}:${Date.now()}`,
    dedupeKey: `withdraw:${userId}:25:I`,
    sourceEventIds: [],
    context: {
      surface: "wallet",
      objectType: "wallet",
      objectId: walletId,
      amount: 25,
      coinCode: "I",
      regionCode: "US",
      ageBand: "18_plus",
      trustScore: 90,
      uValueScore: 40,
      walletStatus: "active"
    },
    riskSignals: {
      ageRisk: 0.01,
      safetyRisk: 0.01,
      rightsRisk: 0.01,
      fraudRisk: 0.02,
      paymentRisk: 0.03,
      privacyRisk: 0.02,
      complianceRisk: 0.02,
      duplicateRisk: 0.01
    }
  });

  const result = evaluateStoredActionIntent({
    actionIntentId: intent.actionIntentId,
    contextCaptured: true,
    policyRequested: true,
    sagaRequested: true,
    cancelRequested: false
  });

  const trustEvent = createTrustEventFromActionIntentResult(result);
  if (trustEvent) applyTrustImpactEventToUser(trustEvent);

  const uValueEvent = createUValueEventFromActionIntentResult(result);
  if (uValueEvent) applyUValueImpactEventToUser(uValueEvent);

  console.log("Action Intent:");
  console.log(JSON.stringify(result, null, 2));

  console.log("Policy Request:");
  console.log(JSON.stringify(result.policyRequest, null, 2));

  console.log("Saga Request:");
  console.log(JSON.stringify(result.sagaRequest, null, 2));

  console.log("User Trust:");
  console.log(JSON.stringify(getOrCreateTrustScore(userId), null, 2));

  console.log("User U Value:");
  console.log(JSON.stringify(getOrCreateUValueState(userId), null, 2));
}
