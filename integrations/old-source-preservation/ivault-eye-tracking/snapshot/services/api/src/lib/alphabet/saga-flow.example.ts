import {
  createSagaRecord,
  createSagaStep,
  evaluateStoredSaga,
  startSaga
} from "./saga-store";
import {
  createTrustEventFromSagaResult,
  createUValueEventFromSagaResult
} from "./saga-event-factory";
import {
  applyTrustImpactEventToUser,
  getOrCreateTrustScore
} from "./trust-store";
import {
  applyUValueImpactEventToUser,
  getOrCreateUValueState
} from "./u-value-store";

const userId = crypto.randomUUID();
const walletId = crypto.randomUUID();
const policyDecisionId = crypto.randomUUID();
const executionRequestId = crypto.randomUUID();
const handlerDefinitionId = crypto.randomUUID();
const auditRecordId = crypto.randomUUID();
const notificationId = crypto.randomUUID();

const policyStep = createSagaStep({
  stepType: "policy",
  label: "Policy decision",
  status: "passed",
  sourceObjectId: policyDecisionId
});

const handlerStep = createSagaStep({
  stepType: "handler_validation",
  label: "Handler validation",
  status: "passed",
  sourceObjectId: handlerDefinitionId,
  dependsOnStepIds: [policyStep.sagaStepId]
});

const executionStep = createSagaStep({
  stepType: "execution",
  label: "Wallet credit execution",
  status: "passed",
  sourceObjectId: executionRequestId,
  dependsOnStepIds: [handlerStep.sagaStepId],
  compensationRequired: true,
  compensationAction: "reverse_wallet_credit"
});

const auditStep = createSagaStep({
  stepType: "audit",
  label: "Audit record",
  status: "passed",
  sourceObjectId: auditRecordId,
  dependsOnStepIds: [executionStep.sagaStepId]
});

const notificationStep = createSagaStep({
  stepType: "notification",
  label: "User notification",
  status: "passed",
  sourceObjectId: notificationId,
  dependsOnStepIds: [auditStep.sagaStepId]
});

const finalizationStep = createSagaStep({
  stepType: "finalization",
  label: "Finalize saga",
  status: "passed",
  dependsOnStepIds: [notificationStep.sagaStepId]
});

const saga = createSagaRecord({
  sagaType: "wallet_credit",
  userId,
  walletId,
  policyDecisionId,
  executionRequestIds: [executionRequestId],
  handlerDefinitionIds: [handlerDefinitionId],
  auditRecordIds: [auditRecordId],
  notificationIds: [notificationId],
  sourceEventIds: [crypto.randomUUID()],
  steps: [policyStep, handlerStep, executionStep, auditStep, notificationStep, finalizationStep],
  idempotencyKey: `wallet-credit:${policyDecisionId}`
});

startSaga(saga.sagaId);

const result = evaluateStoredSaga({
  sagaId: saga.sagaId,
  riskSignals: {
    sagaRisk: 0.01,
    policyRisk: 0.01,
    executionRisk: 0.01,
    handlerRisk: 0.01,
    auditRisk: 0.01,
    notificationRisk: 0.01
  },
  policyPassed: true,
  policyFailed: false,
  executionDispatched: true,
  executionCompleted: true,
  executionFailed: false,
  handlerValidationPassed: true,
  handlerValidationFailed: false,
  auditCompleted: true,
  notificationCompleted: true,
  cancelRequested: false,
  compensationRequested: false,
  compensationCompleted: false
});

const trustEvent = createTrustEventFromSagaResult(result);
if (trustEvent) applyTrustImpactEventToUser(trustEvent);

const uValueEvent = createUValueEventFromSagaResult(result);
if (uValueEvent) applyUValueImpactEventToUser(uValueEvent);

console.log("Saga:");
console.log(JSON.stringify(result, null, 2));

console.log("User Trust:");
console.log(JSON.stringify(getOrCreateTrustScore(userId), null, 2));

console.log("User U Value:");
console.log(JSON.stringify(getOrCreateUValueState(userId), null, 2));
