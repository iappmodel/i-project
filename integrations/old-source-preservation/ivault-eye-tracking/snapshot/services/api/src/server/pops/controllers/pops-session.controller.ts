import { popsRuntimeFlags } from "../../../pops/config/pops-runtime-flags";
import { POPS_DEFAULT_POLICY_BY_PROOF_LEVEL, POPS_PROOF_THRESHOLDS } from "../../../pops/constants/pops.constants";
import { PopsPrivacyService } from "../../../pops/services/pops-privacy.service";
import { PopsCompletionService } from "../../../pops/services/pops-completion.service";
import { POPS_SESSION_STATE } from "../../../pops/types/pops.types";
import { NoopPopsTrustIntegration } from "../../../pops/trust/pops-trust-integration";
import { POPS_PROOF_LEVEL, type PopsProofLevel } from "../../../pops/types/pops.types";
import { PopsSessionRepository } from "../repositories/pops-session.repository";
import { PopsEventRepository } from "../repositories/pops-event.repository";
import {
  PostgresPopsJudgmentRepository,
  PostgresPopsPrivacyReceiptRepository,
  PostgresPopsRewardDecisionRepository,
  PostgresPopsWalletIntentRepository
} from "../repositories/pops-postgres.repositories";
import { PostgresPopsTransaction } from "../repositories/pops-postgres.transaction";

const LATE_ARRIVAL_WINDOW_MS = 60_000;

function toNumberSafe(input: unknown, fallback = 0): number {
  const value = Number(input);
  return Number.isFinite(value) ? value : fallback;
}

export class PopsSessionController {
  private readonly sessions: PopsSessionRepository;
  private readonly events: PopsEventRepository;
  private readonly privacy: PopsPrivacyService;
  private readonly completion: PopsCompletionService;

  constructor(
    sessions?: PopsSessionRepository,
    events?: PopsEventRepository,
    privacy?: PopsPrivacyService,
    completion?: PopsCompletionService
  ) {
    this.sessions = sessions ?? new PopsSessionRepository();
    this.events = events ?? new PopsEventRepository();
    this.privacy = privacy ?? new PopsPrivacyService();
    this.completion =
      completion ??
      new PopsCompletionService(
        this.sessions,
        this.events,
        this.events,
        new PostgresPopsJudgmentRepository(),
        new PostgresPopsRewardDecisionRepository(),
        new PostgresPopsWalletIntentRepository(),
        new PostgresPopsPrivacyReceiptRepository(),
        new NoopPopsTrustIntegration(),
        new PostgresPopsTransaction()
      );
  }

  async startSession(input: {
    userId: string;
    deviceId: string;
    contentId?: string;
    campaignId?: string;
    sessionType: string;
    proofLevel: string;
    clientStartedAt: string;
    requiredDurationMs: number;
    clientContext: Record<string, unknown>;
    privacyMode: string;
  }) {
    const thresholds = POPS_PROOF_THRESHOLDS[input.proofLevel];
    if (!thresholds) {
      throw new Error("invalid proof level");
    }

    const privacyPolicy =
      POPS_DEFAULT_POLICY_BY_PROOF_LEVEL[input.proofLevel as PopsProofLevel] ??
      POPS_DEFAULT_POLICY_BY_PROOF_LEVEL[POPS_PROOF_LEVEL.LEVEL_1_SESSION];
    const rawStoragePolicy = "NONE";

    const session = await this.sessions.createSession({
      userId: input.userId,
      deviceId: input.deviceId,
      contentId: input.contentId ?? null,
      campaignId: input.campaignId ?? null,
      sessionType: input.sessionType as any,
      proofLevel: input.proofLevel as any,
      state: POPS_SESSION_STATE.INITIALIZING,
      startedAt: new Date().toISOString(),
      requiredDurationMs: input.requiredDurationMs,
      minimumPresenceConfidence: thresholds.minimumPresence,
      minimumAttentionConfidence: thresholds.minimumAttention,
      minimumIntentConfidence: thresholds.minimumIntent,
      minimumContinuityConfidence: thresholds.minimumContinuity ?? null,
      maximumFraudRisk: thresholds.maximumFraudRisk,
      privacyPolicy,
      rawStoragePolicy,
      metadata: {
        clientStartedAt: input.clientStartedAt,
        clientContext: input.clientContext,
        privacyMode: input.privacyMode,
        checkpointIntervalMs: 5000,
        timestampDeltaMs: Date.now() - Date.parse(input.clientStartedAt),
        preview: {
          presenceConfidence: 0,
          attentionConfidence: 0,
          intentConfidence: 0,
          continuityConfidence: 0,
          fraudRisk: 0
        }
      }
    });

    return {
      sessionId: session.id,
      state: session.state,
      proofLevel: session.proof_level,
      checkpointIntervalMs: 5000,
      requiredDurationMs: session.required_duration_ms,
      minimumPresenceConfidence: session.minimum_presence_confidence,
      minimumAttentionConfidence: session.minimum_attention_confidence,
      minimumIntentConfidence: session.minimum_intent_confidence,
      maximumFraudRisk: session.maximum_fraud_risk,
      privacyPolicy,
      rawStoragePolicy,
      serverStartedAt: session.started_at
    };
  }

  async getStatus(sessionId: string, userId: string) {
    const session = await this.sessions.getSessionForUser(sessionId, userId);
    if (!session) throw new Error("session not found");
    const privacyReceipt = await this.sessions.getLatestPrivacyReceiptForSession(sessionId);
    const preview = (session.metadata?.preview ?? {}) as Record<string, unknown>;
    return {
      state: session.state,
      currentConfidencePreview: {
        presenceConfidence: toNumberSafe(preview.presenceConfidence),
        attentionConfidence: toNumberSafe(preview.attentionConfidence),
        intentConfidence: toNumberSafe(preview.intentConfidence),
        continuityConfidence: toNumberSafe(preview.continuityConfidence),
        fraudRisk: toNumberSafe(preview.fraudRisk)
      },
      rewardStatus: session.metadata?.rewardStatus ?? "pending",
      walletStatus: session.metadata?.walletStatus ?? "not_created",
      privacyReceiptStatus: privacyReceipt ? "available" : "pending"
    };
  }

  async getPrivacyReceipt(sessionId: string, userId: string) {
    const session = await this.sessions.getSessionForUser(sessionId, userId);
    if (!session) throw new Error("session not found");
    const receipt = await this.sessions.getLatestPrivacyReceiptForSession(sessionId);
    if (!receipt) throw new Error("privacy receipt not found");
    return receipt;
  }

  async getRewardDecision(decisionId: string, userId: string) {
    const decision = await this.sessions.getRewardDecisionById(decisionId);
    if (!decision || decision.user_id !== userId) throw new Error("reward decision not found");
    return decision;
  }

  async completeSession(sessionId: string, userId: string) {
    if (!popsRuntimeFlags.enablePops()) {
      throw new Error("pops_disabled");
    }
    return this.completion.completeSession(sessionId, userId);
  }

  async closeSession(
    sessionId: string,
    userId: string,
    input: {
      reason: string;
      detail?: string;
      createPrivacyReceipt?: boolean;
    }
  ) {
    const session = await this.sessions.getSessionForUser(sessionId, userId);
    if (!session) throw new Error("session not found");

    let privacyReceiptId: string | null = null;
    if (input.createPrivacyReceipt && popsRuntimeFlags.enablePrivacyReceipts()) {
      const policy = this.privacy.resolvePolicy(session.proof_level);
      const receipt = await this.sessions.createPrivacyReceipt({
        session_id: sessionId,
        judgment_id: null,
        reward_decision_id: null,
        user_id: userId,
        session_type: session.session_type,
        proof_level: session.proof_level,
        signal_categories_used: [],
        raw_data_types_stored: [],
        stored_feature_types: [],
        local_processing_used: true,
        raw_data_discarded: true,
        retention_policy: policy,
        retention_expires_at: null,
        user_visible_summary:
          "Session closed without a reward. No raw camera or raw audio was stored for this session.",
        internal_summary: JSON.stringify({ closeReason: input.reason, closeDetail: input.detail ?? null }),
        policy_version: "pops-mvp-privacy-v1"
      });
      privacyReceiptId = receipt.id;
    }

    await this.sessions.updateSession(sessionId, {
      state: POPS_SESSION_STATE.CLOSED,
      ended_at: new Date().toISOString(),
      metadata: {
        ...(session.metadata ?? {}),
        closeReason: input.reason,
        closeDetail: input.detail ?? null,
        finalizationLateWindowEndsAt: Date.now() + LATE_ARRIVAL_WINDOW_MS,
        rewardStatus: "not_issued"
      }
    });

    return {
      sessionId,
      state: POPS_SESSION_STATE.CLOSED,
      rewardIssued: false,
      privacyReceiptId
    };
  }
}
