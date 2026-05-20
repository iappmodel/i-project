import type {
  PopsRewardDecisionStatus,
  PopsWalletDecisionStatus
} from "./pops-reward-decision.types";

export interface WalletTransactionIntent {
  intentId: string;
  kind: "PENDING_REWARD";
  sessionId: string;
  userId: string;
  decisionId: string;
  amountMinor: number;
  coinType: string;
  status: PopsWalletDecisionStatus;
  hold: boolean;
  createdAt: string;
}

export interface WalletHoldIntent {
  holdId: string;
  decisionId: string;
  sessionId: string;
  userId: string;
  amountMinor: number;
  coinType: string;
  reason: string;
  createdAt: string;
}

export interface WalletReleaseIntent {
  releaseId: string;
  decisionId: string;
  sessionId: string;
  userId: string;
  amountMinor: number;
  coinType: string;
  createdAt: string;
}

export interface WalletDenyIntent {
  denyId: string;
  decisionId: string;
  sessionId: string;
  userId: string;
  decision: PopsRewardDecisionStatus;
  reasonCodes: string[];
  createdAt: string;
}

export interface CreatePendingRewardInput {
  decisionId: string;
  sessionId: string;
  userId: string;
  amountMinor: number;
  coinType: string;
  status: PopsWalletDecisionStatus;
  hold: boolean;
}

export interface HoldRewardInput {
  decisionId: string;
  sessionId: string;
  userId: string;
  amountMinor: number;
  coinType: string;
  reason: string;
}

export interface ReleaseRewardInput {
  decisionId: string;
  sessionId: string;
  userId: string;
  amountMinor: number;
  coinType: string;
}

export interface DenyRewardInput {
  decisionId: string;
  sessionId: string;
  userId: string;
  decision: PopsRewardDecisionStatus;
  reasonCodes: string[];
}

export interface PopsWalletIntegration {
  createPendingReward(input: CreatePendingRewardInput): Promise<WalletTransactionIntent>;
  holdReward(input: HoldRewardInput): Promise<WalletHoldIntent>;
  releaseReward(input: ReleaseRewardInput): Promise<WalletReleaseIntent>;
  denyReward(input: DenyRewardInput): Promise<WalletDenyIntent>;
}

function nowIso(): string {
  return new Date().toISOString();
}

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export class MockPopsWalletIntegration implements PopsWalletIntegration {
  async createPendingReward(input: CreatePendingRewardInput): Promise<WalletTransactionIntent> {
    return {
      intentId: id("wallet_pending"),
      kind: "PENDING_REWARD",
      decisionId: input.decisionId,
      sessionId: input.sessionId,
      userId: input.userId,
      amountMinor: input.amountMinor,
      coinType: input.coinType,
      status: input.status,
      hold: input.hold,
      createdAt: nowIso()
    };
  }

  async holdReward(input: HoldRewardInput): Promise<WalletHoldIntent> {
    return {
      holdId: id("wallet_hold"),
      decisionId: input.decisionId,
      sessionId: input.sessionId,
      userId: input.userId,
      amountMinor: input.amountMinor,
      coinType: input.coinType,
      reason: input.reason,
      createdAt: nowIso()
    };
  }

  async releaseReward(input: ReleaseRewardInput): Promise<WalletReleaseIntent> {
    return {
      releaseId: id("wallet_release"),
      decisionId: input.decisionId,
      sessionId: input.sessionId,
      userId: input.userId,
      amountMinor: input.amountMinor,
      coinType: input.coinType,
      createdAt: nowIso()
    };
  }

  async denyReward(input: DenyRewardInput): Promise<WalletDenyIntent> {
    return {
      denyId: id("wallet_deny"),
      decisionId: input.decisionId,
      sessionId: input.sessionId,
      userId: input.userId,
      decision: input.decision,
      reasonCodes: input.reasonCodes,
      createdAt: nowIso()
    };
  }
}
