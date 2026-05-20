import type { PopsRewardDecision } from "../types/pops-decisions.types";
import type { PopsWalletRewardIntent } from "../types/pops-decisions.types";

export interface PopsDemoLedgerEntry {
  id: string;
  sessionId: string;
  decisionStatus: PopsRewardDecision["decisionStatus"];
  walletStatus: PopsWalletRewardIntent["status"] | "NONE";
  coinType: string;
  amount: number;
  createdAt: string;
  summary: string;
}

export interface PopsDemoLedgerAddInput {
  rewardDecision: PopsRewardDecision;
  walletIntent: PopsWalletRewardIntent | null;
}
