import {
  createConversionQuote,
  verifyStoredConversionQuote
} from "./conversion-store";
import { issueRewardFromVerifiedEvent } from "./reward-issuance-engine";
import {
  applyConversionToWallet,
  applyRewardIssuanceResult,
  calculateWalletSummary,
  createWallet
} from "./wallet-store";
import {
  applyTrustImpactEventToUser,
  getOrCreateTrustScore
} from "./trust-store";
import {
  applyUValueImpactEventToUser,
  getOrCreateUValueState
} from "./u-value-store";
import {
  createTrustEventFromConversionVerification,
  createUValueEventFromConversionVerification
} from "./conversion-event-factory";
import { createTrustEventFromRewardResult } from "./trust-event-factory";
import { createUValueEventFromRewardResult } from "./u-value-event-factory";
import type { CoinCode } from "../../types/alphabet/coin.types";

const userId = crypto.randomUUID();
const wallet = createWallet(userId);

/**
 * Demo assumption:
 * Wallet already has W available balance from prior verified work.
 * In real flow, this comes from coin lots becoming available.
 */

const quote = createConversionQuote({
  walletId: wallet.walletId,
  userId,
  sourceCoin: "W",
  targetCoin: "I",
  sourceAmount: 100,
  conversionRate: 0.25,
  conversionFeeRate: 0.02,
  sourceState: "available"
});

const conversionResult = verifyStoredConversionQuote({
  conversionQuoteId: quote.conversionQuoteId,

  availableSourceBalance: 200,

  trustScore: 80,
  uValueScore: 40,

  walletRiskScore: 0.03,
  fraudRisk: 0.02,
  chargebackRisk: 0.02,
  sourceCoinAbuseRisk: 0.02,
  conversionVelocityRisk: 0.02,
  liquidityManipulationRisk: 0.01,

  recentPenaltyCount: 0,
  recentSeverePenaltyCount: 0,

  withdrawalLocked: false,
  walletLocked: false,

  liquidityAvailableAmount: 1000,
  liquidityReserveRatio: 0.9,

  ageBand: "18_plus"
});

const conversionTrustEvent =
  createTrustEventFromConversionVerification(conversionResult);
if (conversionTrustEvent) applyTrustImpactEventToUser(conversionTrustEvent);

const conversionUValueEvent =
  createUValueEventFromConversionVerification(conversionResult);
if (conversionUValueEvent) applyUValueImpactEventToUser(conversionUValueEvent);

if (conversionResult.status === "conversion_approved") {
  applyConversionToWallet({
    walletId: conversionResult.walletId,
    userId: conversionResult.userId,
    conversionQuoteId: conversionResult.conversionQuoteId,
    sourceCoin: conversionResult.sourceCoin as CoinCode,
    targetCoin: conversionResult.targetCoin as CoinCode,
    sourceAmount: conversionResult.sourceAmount,
    targetAmount: conversionResult.targetAmount,
    conversionFeeAmount: conversionResult.conversionFeeAmount
  });
}

const trustState = getOrCreateTrustScore(userId);

if (conversionResult.vCoinEvent) {
  const rewardResult = issueRewardFromVerifiedEvent({
    walletId: wallet.walletId,
    context: {
      event: conversionResult.vCoinEvent,
      trustScore: trustState.trustScore,
      trustTier: trustState.trustTier,
      qualityScore:
        conversionResult.vCoinEvent.qualityScore ??
        conversionResult.conversionEligibilityScore,
      riskScore: conversionResult.riskScore,
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

console.log("Conversion verification:");
console.log(JSON.stringify(conversionResult, null, 2));

console.log("Wallet:");
console.log(JSON.stringify(calculateWalletSummary(wallet.walletId), null, 2));

console.log("Trust:");
console.log(JSON.stringify(getOrCreateTrustScore(userId), null, 2));

console.log("U Value:");
console.log(JSON.stringify(getOrCreateUValueState(userId), null, 2));
