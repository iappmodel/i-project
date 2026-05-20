import type { AlphabetEvent } from "../../types/alphabet/event.types";
import { executeCoinConversion } from "./conversion-engine";
import { issueRewardFromVerifiedEvent } from "./reward-issuance-engine";
import {
  applyConversionExecutionResult,
  applyRewardIssuanceResult,
  calculateWalletSummary,
  createWallet,
  releasePendingLots
} from "./wallet-store";
import {
  applyTrustImpactEventToUser,
  getOrCreateTrustScore,
  getTrustFreezeFlags
} from "./trust-store";
import {
  createTrustEventFromConversionResult,
  createTrustEventFromRewardResult
} from "./trust-event-factory";
import {
  applyUValueImpactEventToUser,
  getOrCreateUValueState
} from "./u-value-store";
import {
  createUValueEventFromConversionResult,
  createUValueEventFromRewardResult
} from "./u-value-event-factory";

const userId = crypto.randomUUID();
const wallet = createWallet(userId);

const initialTrust = getOrCreateTrustScore(userId);

const event: AlphabetEvent = {
  eventId: crypto.randomUUID(),
  userId,
  coinCode: "A",
  eventType: "attention_verified",
  objectType: "campaign",
  objectId: crypto.randomUUID(),
  sourceContext: "earn",
  rawScore: 0.95,
  qualityScore: 0.9,
  trustScoreAtEvent: initialTrust.trustScore,
  riskScore: 0.05,
  ageBand: "18_plus",
  verificationStatus: "verified",
  metadata: {
    campaignId: "campaign_demo_001",
    watchSeconds: 45
  },
  createdAt: new Date().toISOString()
};

const rewardTrust = getOrCreateTrustScore(userId);

const rewardResult = issueRewardFromVerifiedEvent({
  walletId: wallet.walletId,
  context: {
    event,
    trustScore: rewardTrust.trustScore,
    trustTier: rewardTrust.trustTier,
    qualityScore: 0.9,
    riskScore: 0.05,
    ageBand: "18_plus",
    hasBudgetSource: true
  }
});

applyRewardIssuanceResult(rewardResult);

const rewardTrustEvent = createTrustEventFromRewardResult(rewardResult);

if (rewardTrustEvent) {
  applyTrustImpactEventToUser(rewardTrustEvent);
}

const rewardUValueEvent = createUValueEventFromRewardResult(rewardResult);
if (rewardUValueEvent) {
  applyUValueImpactEventToUser(rewardUValueEvent);
}

const future = new Date();
future.setHours(future.getHours() + 25);
releasePendingLots(wallet.walletId, future);

const beforeConversion = calculateWalletSummary(wallet.walletId);
const aCoin = beforeConversion.coins.find((coin) => coin.coinCode === "A");

if (!aCoin) {
  throw new Error("No aCoin account found.");
}

const currentTrust = getOrCreateTrustScore(userId);
const freezeFlags = getTrustFreezeFlags(userId);

if (freezeFlags.freezesConversions) {
  throw new Error("Conversions frozen for this user.");
}

const conversionResult = executeCoinConversion({
  walletId: wallet.walletId,
  userId,
  sourceCoin: "A",
  targetCoin: "I",
  sourceAmount: aCoin.availableBalance,
  availableSourceBalance: aCoin.availableBalance,
  trustScore: currentTrust.trustScore,
  trustTier: currentTrust.trustTier,
  qualityScore: 0.9,
  riskScore: 0.05,
  ageBand: "18_plus",
  hasBudgetSource: true
});

applyConversionExecutionResult(conversionResult);

const conversionTrustEvent = createTrustEventFromConversionResult({
  userId,
  result: conversionResult
});

if (conversionTrustEvent) {
  applyTrustImpactEventToUser(conversionTrustEvent);
}

const conversionUValueEvent = createUValueEventFromConversionResult({
  userId,
  result: conversionResult
});

if (conversionUValueEvent) {
  applyUValueImpactEventToUser(conversionUValueEvent);
}

console.log("Wallet summary:");
console.log(JSON.stringify(calculateWalletSummary(wallet.walletId), null, 2));

console.log("Trust:");
console.log(JSON.stringify(getOrCreateTrustScore(userId), null, 2));

console.log("Freeze flags:");
console.log(JSON.stringify(getTrustFreezeFlags(userId), null, 2));

console.log("U Value:");
console.log(JSON.stringify(getOrCreateUValueState(userId), null, 2));
