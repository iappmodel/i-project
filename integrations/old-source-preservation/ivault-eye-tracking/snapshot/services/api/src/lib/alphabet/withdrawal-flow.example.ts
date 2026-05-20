import {
  createWithdrawalRequest,
  verifyStoredWithdrawalRequest
} from "./withdrawal-store";
import {
  applyWithdrawalDebitToWallet,
  calculateWalletSummary,
  createWallet,
  getOrCreateCoinAccount
} from "./wallet-store";
import { applyTrustImpactEventToUser, getOrCreateTrustScore } from "./trust-store";
import { applyUValueImpactEventToUser, getOrCreateUValueState } from "./u-value-store";
import {
  createTrustEventFromWithdrawalVerification,
  createUValueEventFromWithdrawalVerification
} from "./withdrawal-event-factory";

const userId = crypto.randomUUID();
const wallet = createWallet(userId);
const icoinAccount = getOrCreateCoinAccount(wallet.walletId, "I");

// Demo setup only: seed available iCoin.
icoinAccount.availableBalance = 500;
icoinAccount.updatedAt = new Date().toISOString();

const withdrawal = createWithdrawalRequest({
  walletId: wallet.walletId,
  userId,
  sourceCoin: "I",
  requestedAmount: 100,
  payoutMethod: "bank",
  region: "US",
  countryCode: "US"
});

const withdrawalResult = verifyStoredWithdrawalRequest({
  withdrawalRequestId: withdrawal.withdrawalRequestId,
  availableBalance: 500,
  pendingBalance: 0,
  lockedBalance: 0,
  ageBand: "18_plus",
  guardianApproved: false,
  kycStatus: "verified",
  taxProfileStatus: "verified",
  complianceStatus: "clear",
  paymentMethodVerificationStatus: "verified",
  trustScore: 80,
  uValueScore: 35,
  withdrawalVelocityScore: 0.1,
  recentWithdrawalCount: 1,
  recentWithdrawalAmount: 100,
  chargebackRisk: 0.02,
  fraudRisk: 0.02,
  accountTakeoverRisk: 0.02,
  moneyLaunderingRisk: 0.02,
  payoutRailRisk: 0.02,
  deviceIntegrityScore: 0.9,
  recentPenaltyCount: 0,
  recentSeverePenaltyCount: 0,
  walletLocked: false,
  withdrawalsLocked: false,
  metadata: {
    payoutCompleted: true
  }
});

const withdrawalTrustEvent = createTrustEventFromWithdrawalVerification(withdrawalResult);
if (withdrawalTrustEvent) applyTrustImpactEventToUser(withdrawalTrustEvent);

const withdrawalUValueEvent = createUValueEventFromWithdrawalVerification(withdrawalResult);
if (withdrawalUValueEvent) applyUValueImpactEventToUser(withdrawalUValueEvent);

if (
  withdrawalResult.status === "withdrawal_approved" &&
  withdrawalResult.payoutCompletedEvent
) {
  applyWithdrawalDebitToWallet({
    walletId: withdrawalResult.walletId,
    userId: withdrawalResult.userId,
    withdrawalRequestId: withdrawalResult.withdrawalRequestId,
    coinCode: "I",
    requestedAmount: withdrawalResult.requestedAmount,
    payoutAmount: withdrawalResult.payoutAmount,
    feeAmount: withdrawalResult.feeAmount
  });
}

console.log("Withdrawal verification:");
console.log(JSON.stringify(withdrawalResult, null, 2));

console.log("Wallet:");
console.log(JSON.stringify(calculateWalletSummary(wallet.walletId), null, 2));

console.log("Trust:");
console.log(JSON.stringify(getOrCreateTrustScore(userId), null, 2));

console.log("U Value:");
console.log(JSON.stringify(getOrCreateUValueState(userId), null, 2));
