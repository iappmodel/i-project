import { POPS_REWARD_DECISION_STATUS, type PopsRewardDecisionStatus } from "../rewards/pops-reward-decision.types";
import { evaluatePopsWalletHoldRules, type PopsWalletHoldRuleResult } from "./pops-wallet-hold-rules";
import {
  POPS_WALLET_REWARD_STATUS,
  type PopsWalletDeniedAuditRecord,
  type PopsWalletReleaseContext,
  type PopsWalletReleaseEvent,
  type PopsWalletRewardIntent
} from "./pops-wallet.types";

function nowIso(): string {
  return new Date().toISOString();
}

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function addDelay(baseIso: string, delayMs: number | null): string | null {
  if (delayMs === null) return null;
  return new Date(Date.parse(baseIso) + delayMs).toISOString();
}

export interface BuildPopsWalletIntentInput {
  userId: string;
  sessionId: string;
  campaignId: string;
  rewardDecisionId: string;
  coinType: string;
  amount: number;
  decision: PopsRewardDecisionStatus;
  context: PopsWalletReleaseContext;
  expiresInMs?: number;
}

export interface BuildPopsWalletIntentResult {
  intent: PopsWalletRewardIntent | null;
  deniedAuditRecord: PopsWalletDeniedAuditRecord | null;
}

export class PopsWalletReleaseService {
  buildRewardIntent(input: BuildPopsWalletIntentInput): BuildPopsWalletIntentResult {
    const createdAt = nowIso();
    const expiresAt =
      typeof input.expiresInMs === "number" ? addDelay(createdAt, input.expiresInMs) : null;

    if (this.isDeniedDecision(input.decision)) {
      return {
        intent: null,
        deniedAuditRecord: this.createDeniedAuditRecord(input, createdAt, input.decision)
      };
    }

    const holdRuleResult = this.evaluateForDecision(input.decision, input.context);
    if (holdRuleResult.status === POPS_WALLET_REWARD_STATUS.DENIED) {
      return {
        intent: null,
        deniedAuditRecord: this.createDeniedAuditRecord(
          input,
          createdAt,
          holdRuleResult.deniedReason ?? "DENIED_BY_HOLD_RULES"
        )
      };
    }

    const releaseEligibleAt = addDelay(createdAt, holdRuleResult.releaseDelayMs);
    return {
      intent: {
        id: id("pops_wallet_intent"),
        userId: input.userId,
        sessionId: input.sessionId,
        campaignId: input.campaignId,
        rewardDecisionId: input.rewardDecisionId,
        coinType: input.coinType,
        amount: input.amount,
        status: holdRuleResult.status,
        holdReason: holdRuleResult.holdReason,
        releaseEligibleAt,
        expiresAt,
        createdAt
      },
      deniedAuditRecord: null
    };
  }

  releaseIntent(
    intent: PopsWalletRewardIntent,
    releaseAmount = intent.amount
  ): { intent: PopsWalletRewardIntent; event: PopsWalletReleaseEvent } {
    const nextStatus =
      releaseAmount >= intent.amount
        ? POPS_WALLET_REWARD_STATUS.RELEASED
        : POPS_WALLET_REWARD_STATUS.PARTIALLY_RELEASED;

    const event: PopsWalletReleaseEvent = {
      id: id("pops_wallet_release"),
      rewardIntentId: intent.id,
      fromStatus: intent.status,
      toStatus: nextStatus,
      amountReleased: releaseAmount,
      createdAt: nowIso()
    };

    return {
      intent: {
        ...intent,
        status: nextStatus,
        releaseEligibleAt: null
      },
      event
    };
  }

  expireIntent(intent: PopsWalletRewardIntent): PopsWalletRewardIntent {
    return {
      ...intent,
      status: POPS_WALLET_REWARD_STATUS.EXPIRED
    };
  }

  private evaluateForDecision(
    decision: PopsRewardDecisionStatus,
    context: PopsWalletReleaseContext
  ): PopsWalletHoldRuleResult {
    if (decision === POPS_REWARD_DECISION_STATUS.APPROVED_FULL) {
      return evaluatePopsWalletHoldRules(context, false);
    }
    if (decision === POPS_REWARD_DECISION_STATUS.APPROVED_PARTIAL) {
      return evaluatePopsWalletHoldRules(context, false);
    }
    if (decision === POPS_REWARD_DECISION_STATUS.PENDING_REVIEW) {
      return evaluatePopsWalletHoldRules(context, true);
    }
    if (decision === POPS_REWARD_DECISION_STATUS.HELD) {
      return {
        status: POPS_WALLET_REWARD_STATUS.HELD,
        holdReason: evaluatePopsWalletHoldRules(context, true).holdReason,
        releaseDelayMs: null,
        deniedReason: null
      };
    }
    return {
      status: POPS_WALLET_REWARD_STATUS.NO_REWARD,
      holdReason: null,
      releaseDelayMs: null,
      deniedReason: "NO_REWARD"
    };
  }

  private createDeniedAuditRecord(
    input: BuildPopsWalletIntentInput,
    createdAt: string,
    reason: string
  ): PopsWalletDeniedAuditRecord {
    return {
      id: id("pops_wallet_denied"),
      userId: input.userId,
      sessionId: input.sessionId,
      campaignId: input.campaignId,
      rewardDecisionId: input.rewardDecisionId,
      decision: input.decision,
      reason,
      createdAt
    };
  }

  private isDeniedDecision(decision: PopsRewardDecisionStatus): boolean {
    return (
      decision === POPS_REWARD_DECISION_STATUS.DENIED_DUPLICATE ||
      decision === POPS_REWARD_DECISION_STATUS.DENIED_EXPIRED ||
      decision === POPS_REWARD_DECISION_STATUS.DENIED_FRAUD_RISK ||
      decision === POPS_REWARD_DECISION_STATUS.DENIED_INELIGIBLE ||
      decision === POPS_REWARD_DECISION_STATUS.DENIED_LOW_CONFIDENCE
    );
  }
}
