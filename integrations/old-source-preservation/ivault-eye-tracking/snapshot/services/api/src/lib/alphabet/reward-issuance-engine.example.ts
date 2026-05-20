import type { AlphabetEvent } from "../../types/alphabet/event.types";
import { issueRewardFromVerifiedEvent } from "./reward-issuance-engine";
import { applyTrustImpactEventToUser, getOrCreateTrustScore } from "./trust-store";
import { createTrustEventFromRewardResult } from "./trust-event-factory";

const userId = crypto.randomUUID();
const initialTrust = getOrCreateTrustScore(userId);

const event: AlphabetEvent = {
  eventId: crypto.randomUUID(),
  userId,
  coinCode: "A",
  eventType: "attention_verified",
  sourceContext: "earn",
  rawScore: 0.9,
  qualityScore: 0.8,
  trustScoreAtEvent: initialTrust.trustScore,
  riskScore: 0.2,
  ageBand: "18_plus",
  verificationStatus: "verified",
  metadata: {
    campaignId: "campaign_demo_001",
    watchSeconds: 30
  },
  createdAt: new Date().toISOString()
};

const result = issueRewardFromVerifiedEvent({
  walletId: crypto.randomUUID(),
  context: {
    event,
    trustScore: initialTrust.trustScore,
    trustTier: initialTrust.trustTier,
    qualityScore: 0.8,
    riskScore: 0.2,
    ageBand: "18_plus",
    hasBudgetSource: true
  }
});

const trustEvent = createTrustEventFromRewardResult(result);
if (trustEvent) {
  applyTrustImpactEventToUser(trustEvent);
}

console.log(result);
console.log(getOrCreateTrustScore(userId));
