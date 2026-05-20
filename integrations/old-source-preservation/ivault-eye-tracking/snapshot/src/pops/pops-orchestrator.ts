import {
  POPS_PIPELINE_EVENT,
  createPopsPipelineEvent,
  type PopsPipelineEvent,
} from "./pops-pipeline-events";
import type {
  PopsAdminReviewItem,
  PopsPipelineInput,
  PopsPipelineOutput,
  PopsPipelinePrivacyReceipt,
  PopsPipelineRecommendedAction,
  PopsPipelineRewardDecision,
  PopsTrustImpact,
  PopsPipelineWalletIntent,
} from "./pops-pipeline.types";

const FRAUD_RISK_THRESHOLD_REVIEW = 0.5;

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, current) => sum + current, 0) / values.length;
}

function buildDeterministicId(prefix: string, sessionId: string): string {
  return `${prefix}_${sessionId}`;
}

export class PopsOrchestrator {
  async runPopsPipeline(input: PopsPipelineInput): Promise<PopsPipelineOutput> {
    const events: PopsPipelineEvent[] = [];
    const startedAtMs = input.session.startedAtMs;

    events.push(
      createPopsPipelineEvent(POPS_PIPELINE_EVENT.STARTED, startedAtMs, [
        "PIPELINE_STARTED",
      ]),
    );

    const validationReasonCodes = this.validateSession(input);
    events.push(
      createPopsPipelineEvent(
        POPS_PIPELINE_EVENT.SESSION_VALIDATED,
        startedAtMs + 1,
        validationReasonCodes,
      ),
    );

    const aggregatedSignals = this.aggregateSignals(input);
    events.push(
      createPopsPipelineEvent(
        POPS_PIPELINE_EVENT.SIGNALS_AGGREGATED,
        startedAtMs + 2,
        aggregatedSignals.reasonCodes,
        {
          presence: aggregatedSignals.presence,
          attention: aggregatedSignals.attention,
          intent: aggregatedSignals.intent,
          continuity: aggregatedSignals.continuity,
          fraudRisk: aggregatedSignals.fraudRisk,
        },
      ),
    );

    const scoringFailed = aggregatedSignals.reasonCodes.includes("SCORING_FAILED");

    const judgmentReasonCodes = [...validationReasonCodes, ...aggregatedSignals.reasonCodes];
    const judgment = {
      status: this.createJudgmentStatus(judgmentReasonCodes),
      reasonCodes: judgmentReasonCodes,
      scoreBreakdown: {
        presence: aggregatedSignals.presence,
        attention: aggregatedSignals.attention,
        intent: aggregatedSignals.intent,
        continuity: aggregatedSignals.continuity,
        fraudRisk: aggregatedSignals.fraudRisk,
      },
      auditable: true as const,
    };
    events.push(
      createPopsPipelineEvent(
        POPS_PIPELINE_EVENT.JUDGMENT_CREATED,
        startedAtMs + 3,
        judgment.reasonCodes,
      ),
    );

    const rewardDecision = this.createRewardDecision(input, judgment, scoringFailed);
    events.push(
      createPopsPipelineEvent(
        POPS_PIPELINE_EVENT.REWARD_DECISION_CREATED,
        startedAtMs + 4,
        rewardDecision.reasonCodes,
      ),
    );

    const walletIntent = this.createWalletIntent(input, rewardDecision);
    events.push(
      createPopsPipelineEvent(
        POPS_PIPELINE_EVENT.WALLET_INTENT_CREATED,
        startedAtMs + 5,
        walletIntent.reasonCodes,
      ),
    );

    const trustImpact = this.createTrustImpact(input, judgment, rewardDecision);
    events.push(
      createPopsPipelineEvent(
        POPS_PIPELINE_EVENT.TRUST_IMPACT_CREATED,
        startedAtMs + 6,
        trustImpact.reasonCodes,
      ),
    );

    let privacyReceipt: PopsPipelinePrivacyReceipt | null = null;
    try {
      privacyReceipt = this.createPrivacyReceipt(input, startedAtMs + 7, scoringFailed);
      events.push(
        createPopsPipelineEvent(
          POPS_PIPELINE_EVENT.PRIVACY_RECEIPT_CREATED,
          startedAtMs + 7,
          privacyReceipt.reasonCodes,
        ),
      );
    } catch {
      events.push(
        createPopsPipelineEvent(
          POPS_PIPELINE_EVENT.FAILED,
          startedAtMs + 7,
          ["PRIVACY_RECEIPT_CREATION_FAILED"],
        ),
      );
    }

    const adminReviewItem = this.createAdminReviewItem(
      input,
      rewardDecision,
      trustImpact,
      privacyReceipt,
      scoringFailed,
      startedAtMs + 8,
    );
    if (adminReviewItem) {
      events.push(
        createPopsPipelineEvent(
          POPS_PIPELINE_EVENT.ADMIN_REVIEW_CREATED,
          startedAtMs + 8,
          adminReviewItem.reasonCodes,
        ),
      );
    }

    const recommendedAction = this.createRecommendedAction(
      rewardDecision,
      walletIntent,
      trustImpact,
      privacyReceipt,
      adminReviewItem,
    );

    events.push(
      createPopsPipelineEvent(
        POPS_PIPELINE_EVENT.COMPLETED,
        startedAtMs + 9,
        recommendedAction.reasonCodes,
      ),
    );

    return {
      judgment,
      rewardDecision,
      walletIntent,
      trustImpact,
      privacyReceipt,
      adminReviewItem,
      recommendedAction,
      pipelineEvents: events,
    };
  }

  private validateSession(input: PopsPipelineInput): string[] {
    const reasonCodes = ["SESSION_VALID"];
    if (input.session.endedAtMs <= input.session.startedAtMs) {
      reasonCodes.push("SESSION_INVALID_DURATION");
    }
    if (input.events.length === 0) {
      reasonCodes.push("SESSION_NO_EVENTS");
    }
    return reasonCodes;
  }

  private aggregateSignals(input: PopsPipelineInput): {
    presence: number;
    attention: number;
    intent: number;
    continuity: number;
    fraudRisk: number;
    reasonCodes: string[];
  } {
    const reasonCodes: string[] = ["SIGNALS_AGGREGATED"];
    const scoringErrorCodes = input.signalBatches
      .map((batch) => batch.scoringErrorCode)
      .filter((code): code is string => Boolean(code));

    if (scoringErrorCodes.length > 0) {
      reasonCodes.push("SCORING_FAILED", ...scoringErrorCodes.map((code) => `SCORING_ERROR_${code}`));
    }

    const presence = clampScore(average(input.signalBatches.map((batch) => batch.presenceScore)));
    const attention = clampScore(average(input.signalBatches.map((batch) => batch.attentionScore)));
    const intent = clampScore(average(input.signalBatches.map((batch) => batch.intentScore)));
    const continuity = clampScore(average(input.signalBatches.map((batch) => batch.continuityScore)));

    const fraudSignalsAverage = clampScore(
      average(input.signalBatches.map((batch) => batch.fraudSignals ?? 0)),
    );
    const trustRiskWeight = clampScore(input.userTrustProfile.riskScore);
    const walletRiskWeight = input.walletRiskProfile.blocked ? 1 : input.walletRiskProfile.requiresManualReview ? 0.6 : 0.2;
    const fraudRisk = clampScore((fraudSignalsAverage * 0.6) + (trustRiskWeight * 0.25) + (walletRiskWeight * 0.15));

    if (fraudRisk >= input.campaignRequirements.maxFraudRisk) {
      reasonCodes.push("FRAUD_RISK_OVER_LIMIT");
    }

    return {
      presence,
      attention,
      intent,
      continuity,
      fraudRisk,
      reasonCodes,
    };
  }

  private createJudgmentStatus(reasonCodes: string[]): "PASS" | "REVIEW" | "FAIL" {
    if (reasonCodes.includes("SESSION_INVALID_DURATION")) return "FAIL";
    if (reasonCodes.includes("SCORING_FAILED")) return "REVIEW";
    return "PASS";
  }

  private createRewardDecision(
    input: PopsPipelineInput,
    judgment: PopsPipelineOutput["judgment"],
    scoringFailed: boolean,
  ): PopsPipelineRewardDecision {
    const reasonCodes: string[] = [];

    if (!input.eligibilityProfile.eligible) {
      reasonCodes.push("INELIGIBLE_PROFILE", ...input.eligibilityProfile.reasonCodes);
      return {
        status: "DENIED",
        amountMinor: 0,
        currency: input.campaignRequirements.currency,
        reasonCodes,
        denialRequiresReview: true,
        auditable: true,
      };
    }

    if (scoringFailed) {
      reasonCodes.push("REWARD_PENDING_SCORING_REVIEW");
      return {
        status: "PENDING_REVIEW",
        amountMinor: input.campaignRequirements.rewardAmountMinor,
        currency: input.campaignRequirements.currency,
        reasonCodes,
        denialRequiresReview: true,
        auditable: true,
      };
    }

    const thresholdFailures: string[] = [];
    if (judgment.scoreBreakdown.presence < input.campaignRequirements.minPresenceScore) {
      thresholdFailures.push("PRESENCE_BELOW_THRESHOLD");
    }
    if (judgment.scoreBreakdown.attention < input.campaignRequirements.minAttentionScore) {
      thresholdFailures.push("ATTENTION_BELOW_THRESHOLD");
    }
    if (judgment.scoreBreakdown.intent < input.campaignRequirements.minIntentScore) {
      thresholdFailures.push("INTENT_BELOW_THRESHOLD");
    }
    if (judgment.scoreBreakdown.continuity < input.campaignRequirements.minContinuityScore) {
      thresholdFailures.push("CONTINUITY_BELOW_THRESHOLD");
    }
    if (judgment.scoreBreakdown.fraudRisk > input.campaignRequirements.maxFraudRisk) {
      thresholdFailures.push("FRAUD_RISK_TOO_HIGH");
    }

    if (thresholdFailures.length > 0) {
      return {
        status: "PENDING_REVIEW",
        amountMinor: input.campaignRequirements.rewardAmountMinor,
        currency: input.campaignRequirements.currency,
        reasonCodes: ["REWARD_THRESHOLD_UNMET", ...thresholdFailures],
        denialRequiresReview: true,
        auditable: true,
      };
    }

    return {
      status: "APPROVED",
      amountMinor: input.campaignRequirements.rewardAmountMinor,
      currency: input.campaignRequirements.currency,
      reasonCodes: ["REWARD_APPROVED"],
      denialRequiresReview: false,
      auditable: true,
    };
  }

  private createWalletIntent(
    input: PopsPipelineInput,
    rewardDecision: PopsPipelineRewardDecision,
  ): PopsPipelineWalletIntent {
    if (rewardDecision.status === "DENIED") {
      return {
        status: "BLOCKED",
        amountMinor: 0,
        currency: rewardDecision.currency,
        retryAtMs: null,
        reasonCodes: ["WALLET_BLOCKED_REWARD_DENIED"],
        rewardDecisionPreserved: true,
        auditable: true,
      };
    }

    if (input.walletRiskProfile.retryableIntegrationFailure) {
      return {
        status: "RETRY_SCHEDULED",
        amountMinor: rewardDecision.amountMinor,
        currency: rewardDecision.currency,
        retryAtMs: input.session.endedAtMs + 60_000,
        reasonCodes: ["WALLET_INTEGRATION_FAILED_RETRY_SCHEDULED", "REWARD_DECISION_PRESERVED"],
        rewardDecisionPreserved: true,
        auditable: true,
      };
    }

    if (rewardDecision.status === "PENDING_REVIEW" || input.walletRiskProfile.requiresManualReview) {
      return {
        status: "PENDING_REVIEW",
        amountMinor: rewardDecision.amountMinor,
        currency: rewardDecision.currency,
        retryAtMs: null,
        reasonCodes: ["WALLET_PENDING_MANUAL_REVIEW"],
        rewardDecisionPreserved: true,
        auditable: true,
      };
    }

    return {
      status: "READY",
      amountMinor: rewardDecision.amountMinor,
      currency: rewardDecision.currency,
      retryAtMs: null,
      reasonCodes: ["WALLET_INTENT_READY"],
      rewardDecisionPreserved: true,
      auditable: true,
    };
  }

  private createTrustImpact(
    input: PopsPipelineInput,
    judgment: PopsPipelineOutput["judgment"],
    rewardDecision: PopsPipelineRewardDecision,
  ): PopsTrustImpact {
    const trustIntegrationFailed = judgment.reasonCodes.includes("SCORING_ERROR_TRUST_INTEGRATION");
    if (trustIntegrationFailed) {
      return {
        status: "PENDING",
        delta: 0,
        reasonCodes: ["TRUST_INTEGRATION_FAILED"],
        integrationFailed: true,
        blocksReward: Boolean(input.campaignRequirements.trustFailureBlocksRelease),
        auditable: true,
      };
    }

    if (rewardDecision.status === "APPROVED" && judgment.scoreBreakdown.fraudRisk < FRAUD_RISK_THRESHOLD_REVIEW) {
      return {
        status: "INCREASE",
        delta: 0.02,
        reasonCodes: ["TRUST_INCREASE_APPROVED_LOW_FRAUD"],
        integrationFailed: false,
        blocksReward: false,
        auditable: true,
      };
    }

    if (judgment.scoreBreakdown.fraudRisk > input.campaignRequirements.maxFraudRisk) {
      return {
        status: "DECREASE",
        delta: -0.05,
        reasonCodes: ["TRUST_DECREASE_HIGH_FRAUD_RISK"],
        integrationFailed: false,
        blocksReward: false,
        auditable: true,
      };
    }

    return {
      status: "NO_CHANGE",
      delta: 0,
      reasonCodes: ["TRUST_NO_CHANGE"],
      integrationFailed: false,
      blocksReward: false,
      auditable: true,
    };
  }

  private createPrivacyReceipt(
    input: PopsPipelineInput,
    createdAtMs: number,
    scoringFailed: boolean,
  ): PopsPipelinePrivacyReceipt {
    if (input.privacyPolicy.version === "FAIL_RECEIPT") {
      throw new Error("privacy receipt error");
    }

    const reasonCodes = [
      "PRIVACY_RECEIPT_CREATED",
      scoringFailed ? "PRIVACY_CAPTURED_DURING_SCORING_FAILURE" : "PRIVACY_CAPTURED_STANDARD",
      "NO_RAW_SENSITIVE_DATA_STORED_BY_DEFAULT",
    ];

    return {
      id: buildDeterministicId("privacy_receipt", input.session.id),
      sessionId: input.session.id,
      policyVersion: input.privacyPolicy.version,
      retainedFeatures: ["presenceScore", "attentionScore", "intentScore", "continuityScore", "fraudRisk"],
      rawSensitiveDataStored: input.privacyPolicy.allowRawSensitiveStorageByDefault,
      reasonCodes,
      createdAtMs,
      auditable: true,
    };
  }

  private createAdminReviewItem(
    input: PopsPipelineInput,
    rewardDecision: PopsPipelineRewardDecision,
    trustImpact: PopsTrustImpact,
    privacyReceipt: PopsPipelinePrivacyReceipt | null,
    scoringFailed: boolean,
    createdAtMs: number,
  ): PopsAdminReviewItem | null {
    const reasonCodes: string[] = [];
    if (scoringFailed) reasonCodes.push("ADMIN_REVIEW_SCORING_FAILED");
    if (rewardDecision.status !== "APPROVED") reasonCodes.push("ADMIN_REVIEW_NON_APPROVED_REWARD");
    if (trustImpact.integrationFailed) reasonCodes.push("ADMIN_REVIEW_TRUST_INTEGRATION_FAILED");
    if (!privacyReceipt) reasonCodes.push("ADMIN_REVIEW_MISSING_PRIVACY_RECEIPT");
    if (input.walletRiskProfile.requiresManualReview) reasonCodes.push("ADMIN_REVIEW_WALLET_RISK_PROFILE");

    if (reasonCodes.length === 0) return null;

    return {
      id: buildDeterministicId("admin_review", input.session.id),
      sessionId: input.session.id,
      priority: scoringFailed || !privacyReceipt ? "HIGH" : "MEDIUM",
      reasonCodes,
      createdAtMs,
      auditable: true,
    };
  }

  private createRecommendedAction(
    rewardDecision: PopsPipelineRewardDecision,
    walletIntent: PopsPipelineWalletIntent,
    trustImpact: PopsTrustImpact,
    privacyReceipt: PopsPipelinePrivacyReceipt | null,
    adminReviewItem: PopsAdminReviewItem | null,
  ): PopsPipelineRecommendedAction {
    if (!privacyReceipt) {
      return {
        type: "WAIT_FOR_PRIVACY_RECEIPT",
        reasonCodes: ["PRIVACY_RECEIPT_REQUIRED_FOR_RELEASE"],
      };
    }

    if (walletIntent.status === "RETRY_SCHEDULED") {
      return {
        type: "RETRY_WALLET_INTENT",
        reasonCodes: walletIntent.reasonCodes,
      };
    }

    if (trustImpact.blocksReward) {
      return {
        type: "REVIEW_REWARD",
        reasonCodes: ["TRUST_FAILURE_BLOCKS_RELEASE"],
      };
    }

    if (rewardDecision.status === "DENIED") {
      return {
        type: "BLOCK_REWARD",
        reasonCodes: rewardDecision.reasonCodes,
      };
    }

    if (rewardDecision.status === "PENDING_REVIEW" || adminReviewItem) {
      return {
        type: "REVIEW_REWARD",
        reasonCodes: [
          ...rewardDecision.reasonCodes,
          ...(adminReviewItem?.reasonCodes ?? []),
        ],
      };
    }

    return {
      type: "RELEASE_REWARD",
      reasonCodes: ["REWARD_RELEASE_READY"],
    };
  }
}

export async function runExamplePopsPipeline(): Promise<PopsPipelineOutput> {
  const orchestrator = new PopsOrchestrator();
  return orchestrator.runPopsPipeline({
    session: {
      id: "session_example_001",
      userId: "user_example_001",
      campaignId: "campaign_example_001",
      startedAtMs: 1_710_000_000_000,
      endedAtMs: 1_710_000_060_000,
      contentId: "content_example_001",
    },
    events: [
      { type: "attention.session.started", timestampMs: 1_710_000_000_100 },
      { type: "attention.runtime_signal.sampled", timestampMs: 1_710_000_010_000, confidence: 0.8 },
      { type: "attention.session.completed", timestampMs: 1_710_000_060_000 },
    ],
    signalBatches: [
      {
        timestampMs: 1_710_000_010_000,
        presenceScore: 0.84,
        attentionScore: 0.78,
        intentScore: 0.81,
        continuityScore: 0.8,
        fraudSignals: 0.18,
      },
      {
        timestampMs: 1_710_000_040_000,
        presenceScore: 0.86,
        attentionScore: 0.8,
        intentScore: 0.83,
        continuityScore: 0.82,
        fraudSignals: 0.2,
      },
    ],
    campaignRequirements: {
      minPresenceScore: 0.7,
      minAttentionScore: 0.7,
      minIntentScore: 0.7,
      minContinuityScore: 0.7,
      maxFraudRisk: 0.55,
      rewardAmountMinor: 250,
      currency: "USD",
      holdOnMediumRisk: true,
      trustFailureBlocksRelease: false,
    },
    userTrustProfile: {
      level: 3,
      riskScore: 0.2,
    },
    walletRiskProfile: {
      blocked: false,
      requiresManualReview: false,
      retryableIntegrationFailure: false,
    },
    eligibilityProfile: {
      eligible: true,
      reasonCodes: ["ELIGIBLE_STANDARD_RULES"],
    },
    privacyPolicy: {
      version: "POPS_PRIVACY_V1",
      allowRawSensitiveStorageByDefault: false,
      retentionDays: 30,
    },
  });
}
