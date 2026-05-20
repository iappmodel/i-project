import { popsRuntimeFlags } from "../config/pops-runtime-flags";
import { POPS_SESSION_STATE } from "../types/pops.types";
import type { PopsTrustImpactEvent, PopsTrustIntegration } from "../trust/pops-trust-integration";
import type {
  PopsCompletionTransaction,
  PopsEventRepository,
  PopsJudgmentRepository,
  PopsPrivacyReceiptRepository,
  PopsRewardDecisionRepository,
  PopsSessionRepository,
  PopsSignalBatchRepository,
  PopsWalletIntentRepository
} from "../../server/pops/repositories/pops-repository.types";
import { PostgresPopsTransaction } from "../../server/pops/repositories/pops-postgres.transaction";

export class PopsCompletionService {
  constructor(
    private readonly sessions: PopsSessionRepository,
    private readonly events: PopsEventRepository,
    private readonly signalBatches: PopsSignalBatchRepository,
    private readonly judgments: PopsJudgmentRepository,
    private readonly rewardDecisions: PopsRewardDecisionRepository,
    private readonly walletIntents: PopsWalletIntentRepository,
    private readonly privacyReceipts: PopsPrivacyReceiptRepository,
    private readonly trust: PopsTrustIntegration,
    private readonly transaction: PopsCompletionTransaction = new PostgresPopsTransaction()
  ) {}

  async completeSession(sessionId: string, userId: string): Promise<Record<string, unknown>> {
    if (!popsRuntimeFlags.enablePops()) throw new Error("pops_disabled");

    const session = await this.sessions.getSessionById(sessionId);
    if (!session || session.user_id !== userId) throw new Error("session not found");

    const existingDecision = await this.rewardDecisions.getRewardDecisionBySession(sessionId);
    if (existingDecision) throw new Error("duplicate_reward_decision");

    const events = await this.events.getEventsBySession(sessionId);
    const batches = await this.signalBatches.getSignalBatchesBySession(sessionId);
    const latestBatch = batches[batches.length - 1] as { signals?: Record<string, unknown>; privacy?: Record<string, unknown> } | undefined;

    const judgmentSeed = {
      session_id: sessionId,
      user_id: userId,
      judgment_layer: "LAYER_5_REWARD",
      session_state: "COMPLETED",
      presence_confidence: Number(latestBatch?.signals?.visualPresenceScore ?? 0),
      attention_confidence: Number(latestBatch?.signals?.screenActiveRatio ?? 0),
      intent_confidence: Number(latestBatch?.signals?.contentProgressDeltaPct ?? 0) / 100,
      continuity_confidence: Number(latestBatch?.signals?.accountContinuityScore ?? 0),
      fraud_risk: 1 - Number(latestBatch?.signals?.deviceIntegrityScore ?? 1),
      reward_eligibility: "ELIGIBLE_PENDING",
      trust_impact: "POSITIVE_LOW",
      recommended_action: "QUEUE_REWARD",
      reason_codes: ["auto_scored"],
      model_version: "pops-mvp-scoring-v1",
      rule_version: "pops-mvp-rules-v1",
      input_summary: { eventCount: events.length, batchCount: batches.length }
    };

    let judgmentRow: Record<string, unknown> | null = null;
    let rewardDecisionRow: Record<string, unknown> | null = null;
    let walletIntentRow: Record<string, unknown> | null = null;
    let privacyReceiptRow: Record<string, unknown> | null = null;

    await this.transaction.runInTransaction(async () => {
      judgmentRow = await this.judgments.createJudgment(judgmentSeed);
      rewardDecisionRow = await this.rewardDecisions.createRewardDecision({
        id: crypto.randomUUID(),
        session_id: sessionId,
        judgment_id: judgmentRow.id,
        user_id: userId,
        decision_status: "PENDING",
        hold_required: false,
        reason_codes: ["awaiting_privacy_receipt"]
      });
      const rewardDecisionId = String(rewardDecisionRow["id"] ?? "");

      walletIntentRow = await this.walletIntents.createWalletIntent({
        reward_decision_id: rewardDecisionId,
        session_id: sessionId,
        user_id: userId,
        coin_type: "USD",
        amount: 1,
        status: "PENDING"
      });

      if (popsRuntimeFlags.enablePrivacyReceipts()) {
        try {
          privacyReceiptRow = await this.privacyReceipts.createPrivacyReceipt({
            session_id: sessionId,
            judgment_id: String(judgmentRow["id"] ?? ""),
            reward_decision_id: rewardDecisionId,
            user_id: userId,
            session_type: session.session_type,
            proof_level: session.proof_level,
            signal_categories_used: ["screen_lifecycle", "content_progress"],
            raw_data_types_stored: [],
            stored_feature_types: Object.keys(latestBatch?.signals ?? {}),
            local_processing_used: true,
            raw_data_discarded: true,
            retention_policy: "SESSION_ONLY",
            user_visible_summary:
              "P.O.P.S verified this moment with derived signal summaries only.",
            internal_summary: JSON.stringify({ events: events.length, batches: batches.length }),
            policy_version: "pops-mvp-privacy-v1"
          });
        } catch (_error) {
          walletIntentRow = await this.walletIntents.createWalletIntent({
            reward_decision_id: rewardDecisionId,
            session_id: sessionId,
            user_id: userId,
            coin_type: "USD",
            amount: 1,
            status: "HELD_PRIVACY_RECEIPT_FAILED",
            hold_reason: "privacy_receipt_failed"
          });
        }
      }
    });

    await this.sessions.updateSessionState(sessionId, POPS_SESSION_STATE.COMPLETED, {
      ended_at: new Date().toISOString(),
      metadata: {
        ...(session.metadata ?? {}),
        finalizedAt: new Date().toISOString(),
        walletStatus: String(walletIntentRow?.["status"] ?? "not_created"),
        rewardDecisionId: rewardDecisionRow?.["id"] ?? null
      }
    });

    if (popsRuntimeFlags.enableTrustImpact()) {
      await this.trust.emit({
        userId,
        sessionId,
        source: "POPS",
        impact: "POSITIVE_LOW" as PopsTrustImpactEvent["impact"],
        reasonCodes: ["auto_scored"],
        occurredAt: new Date().toISOString()
      });
    }

    return {
      sessionId,
      finalState: POPS_SESSION_STATE.COMPLETED,
      judgment: judgmentRow,
      rewardDecision: rewardDecisionRow,
      walletIntent: walletIntentRow,
      privacyReceiptId: privacyReceiptRow?.["id"] ?? null
    };
  }
}

export { coerceDeviceUuid } from "../../server/pops/repositories/pops-session.repository";
