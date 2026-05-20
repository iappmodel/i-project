import type { PopsEventType, PopsSessionStartInput, PopsSignalItem } from "../../../pops/capture/pops-client-events";

export type InMemoryPopsSessionState = "ACTIVE" | "PAUSED" | "COMPLETED" | "CLOSED";

export type InMemoryPopsSession = PopsSessionStartInput & {
  sessionId: string;
  startedAt: number;
  endedAt?: number;
  state: InMemoryPopsSessionState;
  checkpoint: {
    progressPct: number;
    presenceConfidence: number;
    attentionConfidence: number;
    intentConfidence: number;
    fraudRisk: number;
    rewardEligibility: boolean;
    recommendedAction: string;
    reasonCodes: string[];
  };
  finalDecision?: PopsCompletionOutput;
};

export type InMemoryPopsEvent = {
  eventId: string;
  sessionId: string;
  type: PopsEventType;
  timestamp: number;
  payload?: Record<string, unknown>;
};

export type InMemoryPopsSignalBatch = {
  batchId: string;
  sessionId: string;
  createdAt: number;
  signals: PopsSignalItem[];
};

export type InMemoryPopsJudgment = {
  id: string;
  sessionId: string;
  createdAt: number;
  presenceConfidence: number;
  attentionConfidence: number;
  intentConfidence: number;
  fraudRisk: number;
  rewardEligibility: boolean;
  reasonCodes: string[];
};

export type InMemoryPopsRewardDecision = {
  id: string;
  sessionId: string;
  createdAt: number;
  status: "APPROVED" | "HELD" | "DENIED";
  amountMinor: number;
  reasonCodes: string[];
};

export type InMemoryPopsWalletIntent = {
  id: string;
  sessionId: string;
  rewardDecisionId: string;
  createdAt: number;
  type: "WALLET_REWARD_INTENT";
  status: "CREATED";
  amountMinor: number;
};

export type InMemoryPopsPrivacyReceipt = {
  id: string;
  sessionId: string;
  createdAt: number;
  summary: string;
  signalCategoriesUsed: string[];
  rawDataStored: false;
  retentionPolicy: "SESSION_ONLY";
};

export type PopsCompletionOutput = {
  sessionId: string;
  finalState: "COMPLETED";
  checkpoint: InMemoryPopsSession["checkpoint"];
  judgment: InMemoryPopsJudgment;
  rewardDecision: InMemoryPopsRewardDecision;
  walletIntent: InMemoryPopsWalletIntent | null;
  privacyReceipt: InMemoryPopsPrivacyReceipt;
  userVisibleMessage: string;
};

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
}

export class InMemoryPopsSessionRepository {
  readonly sessions = new Map<string, InMemoryPopsSession>();
  readonly judgments = new Map<string, InMemoryPopsJudgment>();
  readonly rewardDecisions = new Map<string, InMemoryPopsRewardDecision>();
  readonly walletIntents = new Map<string, InMemoryPopsWalletIntent>();
  readonly privacyReceipts = new Map<string, InMemoryPopsPrivacyReceipt>();

  createSession(input: PopsSessionStartInput): InMemoryPopsSession {
    const sessionId = makeId("pops_session");
    const session: InMemoryPopsSession = {
      ...input,
      sessionId,
      startedAt: Date.now(),
      state: "ACTIVE",
      checkpoint: {
        progressPct: 0,
        presenceConfidence: 0,
        attentionConfidence: 0,
        intentConfidence: 0,
        fraudRisk: 0,
        rewardEligibility: false,
        recommendedAction: "Presence forming…",
        reasonCodes: [],
      },
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId: string): InMemoryPopsSession | undefined {
    return this.sessions.get(sessionId);
  }

  updateSession(sessionId: string, patch: Partial<InMemoryPopsSession>): InMemoryPopsSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error("session not found");
    }
    const next = { ...session, ...patch };
    this.sessions.set(sessionId, next);
    return next;
  }

  createJudgment(row: Omit<InMemoryPopsJudgment, "id" | "createdAt">): InMemoryPopsJudgment {
    const judgment: InMemoryPopsJudgment = {
      ...row,
      id: makeId("pops_judgment"),
      createdAt: Date.now(),
    };
    this.judgments.set(judgment.id, judgment);
    return judgment;
  }

  createRewardDecision(
    row: Omit<InMemoryPopsRewardDecision, "id" | "createdAt">,
  ): InMemoryPopsRewardDecision {
    const decision: InMemoryPopsRewardDecision = {
      ...row,
      id: makeId("pops_reward_decision"),
      createdAt: Date.now(),
    };
    this.rewardDecisions.set(decision.id, decision);
    return decision;
  }

  findWalletIntentBySessionId(sessionId: string): InMemoryPopsWalletIntent | undefined {
    for (const intent of this.walletIntents.values()) {
      if (intent.sessionId === sessionId) return intent;
    }
    return undefined;
  }

  createWalletIntent(row: Omit<InMemoryPopsWalletIntent, "id" | "createdAt">): InMemoryPopsWalletIntent {
    const existing = this.findWalletIntentBySessionId(row.sessionId);
    if (existing) return existing;
    const walletIntent: InMemoryPopsWalletIntent = {
      ...row,
      id: makeId("pops_wallet_intent"),
      createdAt: Date.now(),
    };
    this.walletIntents.set(walletIntent.id, walletIntent);
    return walletIntent;
  }

  createPrivacyReceipt(
    row: Omit<InMemoryPopsPrivacyReceipt, "id" | "createdAt">,
  ): InMemoryPopsPrivacyReceipt {
    const receipt: InMemoryPopsPrivacyReceipt = {
      ...row,
      id: makeId("pops_privacy_receipt"),
      createdAt: Date.now(),
    };
    this.privacyReceipts.set(receipt.id, receipt);
    return receipt;
  }

  getLatestPrivacyReceipt(sessionId: string): InMemoryPopsPrivacyReceipt | undefined {
    let latest: InMemoryPopsPrivacyReceipt | undefined;
    for (const receipt of this.privacyReceipts.values()) {
      if (receipt.sessionId !== sessionId) continue;
      if (!latest || receipt.createdAt > latest.createdAt) latest = receipt;
    }
    return latest;
  }
}
