import { type PopsWalletActionDecision } from "./pops-wallet-security.types";

/** User-facing strings only — never mention fraud scores, device risk, or behavioral internals. */
export const POPS_WALLET_ACTION_USER_COPY = {
  CONFIRM_ACTION: "Confirm this wallet action.",
  VERIFYING: "P.O.P.S is verifying this action.",
  EXTRA_CONFIRMATION: "Extra confirmation required.",
  WITHDRAWAL_REVIEW: "This withdrawal is under review.",
  NOT_VERIFIED: "This action could not be verified.",
  /** Shown when decision is ALLOW and the flow should acknowledge verification without exposing scores. */
  ACTION_VERIFIED: "This wallet action was verified."
} as const;

export function getWalletActionPrimaryCopy(decision: PopsWalletActionDecision): string {
  switch (decision) {
    case "ALLOW":
      return POPS_WALLET_ACTION_USER_COPY.ACTION_VERIFIED;
    case "ALLOW_WITH_STEP_UP":
      return POPS_WALLET_ACTION_USER_COPY.EXTRA_CONFIRMATION;
    case "HOLD":
      return POPS_WALLET_ACTION_USER_COPY.WITHDRAWAL_REVIEW;
    case "ADMIN_REVIEW":
      return POPS_WALLET_ACTION_USER_COPY.WITHDRAWAL_REVIEW;
    case "DENY":
      return POPS_WALLET_ACTION_USER_COPY.NOT_VERIFIED;
    default:
      return POPS_WALLET_ACTION_USER_COPY.VERIFYING;
  }
}

export function getWalletActionSecondaryCopy(decision: PopsWalletActionDecision): string | undefined {
  if (decision === "ALLOW" || decision === "DENY") {
    return undefined;
  }
  if (decision === "ALLOW_WITH_STEP_UP") {
    return POPS_WALLET_ACTION_USER_COPY.CONFIRM_ACTION;
  }
  return POPS_WALLET_ACTION_USER_COPY.VERIFYING;
}
