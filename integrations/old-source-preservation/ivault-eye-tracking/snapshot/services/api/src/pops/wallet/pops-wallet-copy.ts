import {
  POPS_WALLET_REWARD_STATUS,
  type PopsWalletRewardStatus
} from "./pops-wallet.types";

export const POPS_WALLET_STATUS_COPY: Record<PopsWalletRewardStatus, string> = {
  [POPS_WALLET_REWARD_STATUS.NO_REWARD]: "No reward.",
  [POPS_WALLET_REWARD_STATUS.PENDING]: "Reward pending.",
  [POPS_WALLET_REWARD_STATUS.PENDING_REVIEW]: "Reward under verification.",
  [POPS_WALLET_REWARD_STATUS.HELD]: "Reward held for review.",
  [POPS_WALLET_REWARD_STATUS.RELEASED]: "Reward available.",
  [POPS_WALLET_REWARD_STATUS.PARTIALLY_RELEASED]: "Partial reward available.",
  [POPS_WALLET_REWARD_STATUS.DENIED]: "Reward not approved.",
  [POPS_WALLET_REWARD_STATUS.EXPIRED]: "Reward expired."
};

export const POPS_WALLET_DETAIL_COPY: Record<PopsWalletRewardStatus, string> = {
  [POPS_WALLET_REWARD_STATUS.NO_REWARD]:
    "This moment did not produce a wallet reward.",
  [POPS_WALLET_REWARD_STATUS.PENDING]:
    "P.O.P.S verified the humane factor of this moment. Your reward is pending wallet release.",
  [POPS_WALLET_REWARD_STATUS.PENDING_REVIEW]:
    "P.O.P.S verified the humane factor of this moment. Your reward is pending wallet release.",
  [POPS_WALLET_REWARD_STATUS.HELD]:
    "P.O.P.S could not fully verify this moment. The reward is held for review.",
  [POPS_WALLET_REWARD_STATUS.RELEASED]:
    "P.O.P.S verified the humane factor of this moment. Your reward is now available.",
  [POPS_WALLET_REWARD_STATUS.PARTIALLY_RELEASED]:
    "P.O.P.S verified part of this moment. A partial reward is now available.",
  [POPS_WALLET_REWARD_STATUS.DENIED]:
    "This moment did not meet the verification requirements for the reward.",
  [POPS_WALLET_REWARD_STATUS.EXPIRED]:
    "The pending release window ended before this reward could be claimed."
};
