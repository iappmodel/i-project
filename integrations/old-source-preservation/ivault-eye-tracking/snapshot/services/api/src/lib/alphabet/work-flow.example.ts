import {
  acceptWorkTask,
  createWorkTask,
  markWorkDelivered,
  verifyStoredWorkTask
} from "./work-session-store";
import { issueRewardFromVerifiedEvent } from "./reward-issuance-engine";
import {
  applyRewardIssuanceResult,
  calculateWalletSummary,
  createWallet
} from "./wallet-store";
import { applyTrustImpactEventToUser, getOrCreateTrustScore } from "./trust-store";
import { applyUValueImpactEventToUser, getOrCreateUValueState } from "./u-value-store";
import {
  createTrustEventFromWorkVerification,
  createUValueEventFromWorkVerification
} from "./work-event-factory";
import { createTrustEventFromRewardResult } from "./trust-event-factory";
import { createUValueEventFromRewardResult } from "./u-value-event-factory";

const workerUserId = crypto.randomUUID();
const clientUserId = crypto.randomUUID();

const wallet = createWallet(workerUserId);

const task = createWorkTask({
  workerUserId,
  clientUserId,
  context: "marketplace_task",
  taskValue: 25,
  workerAgeBand: "18_plus",
  objectType: "marketplace_order",
  objectId: crypto.randomUUID()
});

acceptWorkTask(task.workTaskId);
markWorkDelivered(task.workTaskId);

const workResult = verifyStoredWorkTask({
  workTaskId: task.workTaskId,
  delivered: true,
  clientConfirmed: true,
  deliveryDurationMs: 20 * 60 * 1000,
  clientSatisfactionScore: 0.88,
  deliveryQualityScore: 0.86,
  requirementMatchScore: 0.9,
  timelinessScore: 0.85,
  revisionScore: 0.8,
  independentVerificationScore: 0.75,
  systemValidationScore: 0.8,
  disputeStatus: "none",
  escrowClean: true,
  paymentClean: true,
  fraudRisk: 0.03,
  taskFarmingRisk: 0.03,
  collusionRisk: 0.03,
  chargebackRisk: 0.02,
  refundAbuseRisk: 0.02,
  deviceIntegrityScore: 0.9
});

const workTrustEvent = createTrustEventFromWorkVerification(workResult);
if (workTrustEvent) applyTrustImpactEventToUser(workTrustEvent);

const workUValueEvent = createUValueEventFromWorkVerification(workResult);
if (workUValueEvent) applyUValueImpactEventToUser(workUValueEvent);

const trustState = getOrCreateTrustScore(workerUserId);

const rewardEvents = [
  workResult.workVerifiedEvent,
  workResult.exchangeCompletedEvent
].filter((event): event is NonNullable<typeof event> => Boolean(event));

for (const event of rewardEvents) {
  const rewardResult = issueRewardFromVerifiedEvent({
    walletId: wallet.walletId,
    context: {
      event,
      trustScore: trustState.trustScore,
      trustTier: trustState.trustTier,
      qualityScore: event.qualityScore ?? workResult.qualityScore,
      riskScore: workResult.riskScore,
      ageBand: "18_plus",
      hasBudgetSource: false
    }
  });

  applyRewardIssuanceResult(rewardResult);

  const rewardTrustEvent = createTrustEventFromRewardResult(rewardResult);
  if (rewardTrustEvent) applyTrustImpactEventToUser(rewardTrustEvent);

  const rewardUValueEvent = createUValueEventFromRewardResult(rewardResult);
  if (rewardUValueEvent) applyUValueImpactEventToUser(rewardUValueEvent);
}

console.log("Work verification:");
console.log(JSON.stringify(workResult, null, 2));

console.log("Wallet:");
console.log(JSON.stringify(calculateWalletSummary(wallet.walletId), null, 2));

console.log("Trust:");
console.log(JSON.stringify(getOrCreateTrustScore(workerUserId), null, 2));

console.log("U Value:");
console.log(JSON.stringify(getOrCreateUValueState(workerUserId), null, 2));
