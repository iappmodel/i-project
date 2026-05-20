import { evaluatePopsWalletActionRules } from "./pops-wallet-action-rules";
import {
  type PopsWalletActionEvaluationContext,
  type PopsWalletActionProof,
  type PopsWalletActionProofClientView
} from "./pops-wallet-security.types";

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function newProofId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  return `pwa_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 10)}`;
}

function deriveFraudRisk(ctx: PopsWalletActionEvaluationContext): number {
  if (ctx.fraudRiskHint !== undefined) {
    return clamp01(ctx.fraudRiskHint);
  }
  const p = clamp01(ctx.presenceConfidence);
  const i = clamp01(ctx.intentConfidence);
  const co = clamp01(ctx.continuityConfidence);
  const soft = 0.34 * (1 - p) + 0.33 * (1 - i) + 0.33 * (1 - co);
  const payout = clamp01(ctx.payoutRiskScore) * 0.22;
  const session = ctx.suspiciousRecentPopsSession ? 0.18 : 0;
  return clamp01(soft + payout + session);
}

export function toPopsWalletActionProofClientView(proof: PopsWalletActionProof): PopsWalletActionProofClientView {
  const { fraudRisk: _fraud, ...rest } = proof;
  return rest;
}

export class PopsWalletActionProofService {
  evaluate(ctx: PopsWalletActionEvaluationContext): PopsWalletActionProof {
    const ruleOutcome = evaluatePopsWalletActionRules(ctx);
    const presenceConfidence = clamp01(ctx.presenceConfidence);
    const intentConfidence = clamp01(ctx.intentConfidence);
    const continuityConfidence = clamp01(ctx.continuityConfidence);
    const fraudRisk = deriveFraudRisk(ctx);

    return {
      id: newProofId(),
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      walletActionId: ctx.walletActionId,
      actionType: ctx.actionType,
      amount: ctx.amountMinor,
      coinType: ctx.coinType,
      recipientId: ctx.recipientId ?? null,
      presenceConfidence,
      intentConfidence,
      continuityConfidence,
      fraudRisk,
      requiresStepUp: ruleOutcome.requiresStepUp,
      stepUpType: ruleOutcome.stepUpType,
      decision: ruleOutcome.decision,
      reasonCodes: ruleOutcome.reasonCodes,
      createdAt: new Date().toISOString()
    };
  }
}
