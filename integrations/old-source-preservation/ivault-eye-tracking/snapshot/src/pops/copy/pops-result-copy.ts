import type { PopsJudgment } from "../types/pops.types";
import type { PopsRewardDecision, PopsWalletRewardIntent } from "../types/pops-decisions.types";

export type PopsResultTone = "success" | "pending" | "held" | "denied" | "neutral";

export function getPopsResultCopy(input: {
  judgment?: PopsJudgment | null;
  rewardDecision?: PopsRewardDecision | null;
  walletIntent?: PopsWalletRewardIntent | null; // reserved for future wallet-specific copy
}): {
  title: string;
  body: string;
  status: string;
  tone: PopsResultTone;
} {
  const d = input.rewardDecision?.decisionStatus;
  if (!d) {
    return {
      title: "P.O.P.S ready",
      body: "Start a moment to verify presence.",
      status: "Ready",
      tone: "neutral",
    };
  }
  switch (d) {
    case "APPROVED_FULL":
      return {
        title: "Moment verified",
        body: "Reward pending. Wallet will settle after verification.",
        status: "Reward pending",
        tone: "success",
      };
    case "APPROVED_PARTIAL":
      return {
        title: "Partial moment verified",
        body: "A reduced reward is pending wallet release.",
        status: "Partial reward pending",
        tone: "pending",
      };
    case "HELD":
      return {
        title: "Reward under review",
        body: "This moment needs a quick review before release.",
        status: "Reward under review",
        tone: "held",
      };
    case "DENIED_LOW_CONFIDENCE":
      return {
        title: "Moment not verified",
        body: "This session did not meet the offer requirements.",
        status: "No reward issued",
        tone: "denied",
      };
    case "DENIED_FRAUD_RISK":
      return {
        title: "Moment not verified",
        body: "This moment could not be verified.",
        status: "No reward issued",
        tone: "denied",
      };
    default: {
      const _exhaustive: never = d;
      return {
        title: "P.O.P.S ready",
        body: String(_exhaustive),
        status: "Ready",
        tone: "neutral",
      };
    }
  }
}
