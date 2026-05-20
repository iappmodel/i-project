/**
 * [ i ] Studio — local wallet / ledger simulation (Stage 3). No real payments.
 */

/** Matches `MagicCoin` in studioTypes (declared here to avoid circular imports). */
export type StudioCoin = "iCoin" | "vCoin" | "aCoin" | "uCoin";

export type StudioWalletAccountType = "viewer" | "creator" | "platform" | "escrow" | "reward_pool";

export interface StudioWalletBalance {
  coin: StudioCoin;
  available: number;
  pending: number;
  reserved: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
}

export interface StudioWalletAccount {
  id: string;
  userId: string;
  type: StudioWalletAccountType;
  displayName: string;
  balances: StudioWalletBalance[];
  trustScore?: number;
  age?: number;
  isVerifiedHuman?: boolean;
  isFollower?: boolean;
  isSubscriber?: boolean;
}

export type StudioLedgerEntryType =
  | "magic_unlock_payment"
  | "magic_unlock_tip"
  | "magic_ad_reward"
  | "magic_viewer_reward"
  | "magic_creator_pending_credit"
  | "magic_creator_pending_debit"
  | "magic_platform_fee"
  | "magic_platform_fee_from_pending"
  | "magic_refund"
  | "magic_settlement_release"
  | "magic_settlement_reversal"
  | "magic_reward_reversal"
  | "magic_pending_release"
  | "escrow_hold"
  | "escrow_release";

export type StudioLedgerEntryStatus = "pending" | "completed" | "failed" | "reversed" | "cancelled";

export interface StudioLedgerEntry {
  id: string;
  type: StudioLedgerEntryType;
  status: StudioLedgerEntryStatus;
  coin: StudioCoin;
  amount: number;
  fromAccountId?: string;
  toAccountId?: string;
  revealId?: string;
  unlockId?: string;
  projectId?: string;
  postId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  availableAt?: string;
}

export type StudioUnlockStatus =
  | "idle"
  | "checking_eligibility"
  | "blocked"
  | "awaiting_confirmation"
  | "processing_payment"
  | "verifying_action"
  | "unlocked"
  | "failed"
  | "refunded"
  | "expired";

export type StudioUnlockAction =
  | "free"
  | "tip"
  | "pay"
  | "watch_ad"
  | "follow"
  | "subscribe"
  | "verify_age"
  | "build_trust"
  | "verify_human"
  | "location_check"
  | "wait"
  | "request_creator_approval"
  | "collective_contribute";

export type VerificationStatus = "not_required" | "pending" | "verified" | "failed" | "reversed";

export type SettlementStatus = "not_required" | "pending" | "released" | "reversed" | "refunded";

/** Eligibility snapshot from Stage 2 engine (serializable). */
export type StudioEligibilitySnapshot = {
  eligible: boolean;
  blockedReason?: string;
  requiredAction?: string;
  displayMessage: string;
};

export interface StudioRevealUnlock {
  id: string;
  revealId: string;
  projectId: string;
  postId: string;
  viewerAccountId: string;
  creatorAccountId: string;
  unlockAction: StudioUnlockAction;
  status: StudioUnlockStatus;
  coin: StudioCoin;
  amount: number;
  creatorGrossAmount: number;
  platformFeeAmount: number;
  viewerRewardAmount: number;
  verificationStatus: VerificationStatus;
  unlockStatus: StudioUnlockStatus;
  ledgerEntryIds: string[];
  eligibilityResult: StudioEligibilitySnapshot;
  settlementStatus: SettlementStatus;
  createdAt: string;
  unlockedAt?: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

export interface MagicSettlementBreakdown {
  creatorGrossAmount: number;
  platformFeeAmount: number;
  viewerRewardAmount: number;
  creatorShareBps: number;
  platformFeeBps: number;
  viewerRewardBps: number;
  pendingHoldSeconds: number;
}
