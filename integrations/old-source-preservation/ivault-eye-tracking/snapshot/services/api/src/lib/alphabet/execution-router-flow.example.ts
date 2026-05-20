import {
  createExecutionRequest,
  evaluateStoredExecutionRequest,
  markExecutionResult
} from "./execution-router-store";
import {
  createTrustEventFromExecutionResult,
  createUValueEventFromExecutionResult
} from "./execution-router-event-factory";
import {
  applyTrustImpactEventToUser,
  getOrCreateTrustScore
} from "./trust-store";
import {
  applyUValueImpactEventToUser,
  getOrCreateUValueState
} from "./u-value-store";

const policyDecisionId = crypto.randomUUID();
const walletId = crypto.randomUUID();
const userId = crypto.randomUUID();

const request = createExecutionRequest({
  sourcePolicyDecisionId: policyDecisionId,
  sourceEventIds: [crypto.randomUUID()],
  targetSystem: "wallet",
  targetObjectId: walletId,
  action: "credit",
  priority: "high",
  idempotencyKey: `wallet-credit:${policyDecisionId}`,
  dedupeKey: `wallet-credit:${policyDecisionId}`,
  handlerName: "wallet.credit",
  handlerVersion: "v1",
  payload: {
    userId,
    walletId,
    coinCode: "I",
    amount: 10,
    reasonCode: "policy_allowed_reward_credit",
    rawRiskScore: 0.91
  }
});

const allowed = evaluateStoredExecutionRequest({
  executionRequestId: request.executionRequestId,
  policyDecision: "allow",
  handlerAvailable: true,
  handlerHealthy: true,
  dispatchRequested: true,
  executionSucceeded: false,
  executionFailed: false,
  cancelRequested: false,
  requiresAudit: true,
  auditCreated: true,
  containsPaymentData: false,
  containsPrivateUserData: true,
  containsRawRiskData: true,
  riskScore: 0.02,
  paymentRisk: 0.02,
  privacyRisk: 0.05,
  complianceRisk: 0.02,
  handlerRisk: 0.01
});

/**
 * Production:
 * A worker consumes execution_dispatched and calls the real handler.
 * This example marks the result manually.
 */
markExecutionResult({
  executionRequestId: request.executionRequestId,
  succeeded: true,
  resultPayload: {
    ledgerEntryId: crypto.randomUUID(),
    balanceAfter: 110
  }
});

const completed = evaluateStoredExecutionRequest({
  executionRequestId: request.executionRequestId,
  policyDecision: "allow",
  handlerAvailable: true,
  handlerHealthy: true,
  dispatchRequested: true,
  executionSucceeded: true,
  executionFailed: false,
  cancelRequested: false,
  requiresAudit: true,
  auditCreated: true,
  containsPaymentData: false,
  containsPrivateUserData: true,
  containsRawRiskData: false,
  riskScore: 0.02,
  paymentRisk: 0.02,
  privacyRisk: 0.05,
  complianceRisk: 0.02,
  handlerRisk: 0.01,
  resultPayload: {
    ledgerEntryId: crypto.randomUUID(),
    balanceAfter: 110
  }
});

const trustEvent = createTrustEventFromExecutionResult(completed);
if (trustEvent) applyTrustImpactEventToUser(trustEvent);

const uValueEvent = createUValueEventFromExecutionResult(completed);
if (uValueEvent) applyUValueImpactEventToUser(uValueEvent);

console.log("Execution allowed:");
console.log(JSON.stringify(allowed, null, 2));

console.log("Execution completed:");
console.log(JSON.stringify(completed, null, 2));

console.log("System Trust:");
console.log(JSON.stringify(getOrCreateTrustScore("system"), null, 2));

console.log("System U Value:");
console.log(JSON.stringify(getOrCreateUValueState("system"), null, 2));
