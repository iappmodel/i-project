import type { AlphabetEvent } from "../../types/alphabet/event.types";
import { issueRewardFromVerifiedEvent } from "./reward-issuance-engine";
import {
  applyRewardIssuanceResult,
  calculateWalletSummary,
  createWallet,
  releasePendingLots
} from "./wallet-store";

const userId = crypto.randomUUID();
const wallet = createWallet(userId);

const attentionEvent: AlphabetEvent = {
  eventId: crypto.randomUUID(),
  userId,
  coinCode: "A",
  eventType: "attention_verified",
  objectType: "campaign",
  objectId: crypto.randomUUID(),
  sourceContext: "earn",
  rawScore: 0.92,
  qualityScore: 0.84,
  trustScoreAtEvent: 76,
  riskScore: 0.12,
  ageBand: "18_plus",
  verificationStatus: "verified",
  metadata: {
    campaignId: "campaign_demo_001",
    watchSeconds: 38,
    verificationGatesPassed: 5
  },
  createdAt: new Date().toISOString()
};

const rewardResult = issueRewardFromVerifiedEvent({
  walletId: wallet.walletId,
  context: {
    event: attentionEvent,
    trustScore: 76,
    trustTier: 3,
    qualityScore: 0.84,
    riskScore: 0.12,
    ageBand: "18_plus",
    hasBudgetSource: true
  }
});

applyRewardIssuanceResult(rewardResult);

console.log("After issuance:");
console.log(JSON.stringify(calculateWalletSummary(wallet.walletId), null, 2));

const tomorrow = new Date();
tomorrow.setHours(tomorrow.getHours() + 25);

releasePendingLots(wallet.walletId, tomorrow);

console.log("After release:");
console.log(JSON.stringify(calculateWalletSummary(wallet.walletId), null, 2));
