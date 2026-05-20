import { describe, expect, it } from "vitest";
import { POPS_REWARD_DECISION_STATUS, type PopsRewardDecision } from "../../rewards/pops-reward-decision.types";
import { POPS_REWARD_ELIGIBILITY, POPS_RECOMMENDED_ACTION, POPS_TRUST_IMPACT } from "../../types/pops-decisions.types";
import { POPS_PROOF_LEVEL, POPS_SESSION_STATE, POPS_SESSION_TYPE, type PopsSession } from "../../types/pops.types";
import {
  InMemoryPopsPrivacyReceiptRepository,
  PopsPrivacyReceiptService
} from "../pops-privacy-receipt.service";
import {
  POPS_RAW_DATA_TYPE,
  POPS_RETENTION_POLICY,
  POPS_SIGNAL_CATEGORY,
  POPS_STORED_FEATURE_TYPE,
  type CreatePopsPrivacyReceiptInput
} from "../pops-privacy-receipt.types";
import { retentionExpiresAtForPolicy } from "../pops-retention-policy";
import { POPS_TRUST_EVENT_TYPE, POPS_TRUST_SEVERITY } from "../../trust/pops-trust.types";

function buildSession(overrides: Partial<PopsSession> = {}): PopsSession {
  return {
    id: "pops_session_1",
    userId: "user_1",
    deviceId: "device_1",
    contentId: "content_1",
    campaignId: "campaign_1",
    sessionType: POPS_SESSION_TYPE.SPONSORED_WATCH,
    proofLevel: POPS_PROOF_LEVEL.LEVEL_2_ATTENTION,
    state: POPS_SESSION_STATE.FOCUSED,
    startedAt: "2026-04-20T10:00:00.000Z",
    endedAt: null,
    requiredDurationMs: 45_000,
    minimumPresenceConfidence: 0.4,
    minimumAttentionConfidence: 0.45,
    minimumIntentConfidence: 0.35,
    maximumFraudRisk: 0.4,
    metadata: {},
    ...overrides
  };
}

function buildRewardDecision(status: PopsRewardDecision["decision"]): PopsRewardDecision {
  return {
    id: "decision_1",
    sessionId: "pops_session_1",
    userId: "user_1",
    campaignId: "campaign_1",
    contentId: "content_1",
    coinType: "ICOIN",
    baseAmount: 100,
    finalAmount: 95,
    decision: status,
    rewardQuality: 0.9,
    presenceConfidence: 0.9,
    attentionConfidence: 0.9,
    intentConfidence: 0.85,
    continuityConfidence: 0.9,
    fraudRisk: 0.1,
    holdRequired: false,
    holdReason: null,
    reasonCodes: [],
    walletTransactionIntent: null,
    createdAt: "2026-04-20T10:05:00.000Z"
  };
}

function buildInput(overrides: Partial<CreatePopsPrivacyReceiptInput> = {}): CreatePopsPrivacyReceiptInput {
  return {
    session: buildSession(),
    judgment: {
      sessionId: "pops_session_1",
      userId: "user_1",
      sessionState: POPS_SESSION_STATE.FOCUSED,
      presenceConfidence: 0.93,
      attentionConfidence: 0.91,
      intentConfidence: 0.87,
      continuityConfidence: 0.92,
      fraudRisk: 0.08,
      rewardEligibility: POPS_REWARD_ELIGIBILITY.ELIGIBLE_FULL,
      trustImpact: POPS_TRUST_IMPACT.POSITIVE_MEDIUM,
      recommendedAction: POPS_RECOMMENDED_ACTION.APPROVE_REWARD,
      reasonCodes: ["all_thresholds_met"],
      modelVersion: "pops-v1",
      ruleVersion: "pops-rules-v1",
      createdAt: "2026-04-20T10:05:00.000Z"
    },
    rewardDecision: buildRewardDecision(POPS_REWARD_DECISION_STATUS.APPROVED_FULL),
    signalCategoriesUsed: [
      POPS_SIGNAL_CATEGORY.SCREEN_ACTIVITY,
      POPS_SIGNAL_CATEGORY.CONTENT_PROGRESS,
      POPS_SIGNAL_CATEGORY.APP_STATE,
      POPS_SIGNAL_CATEGORY.TOUCH_BEHAVIOR
    ],
    rawDataTypesStored: [],
    storedFeatureTypes: [
      POPS_STORED_FEATURE_TYPE.PRESENCE_CONFIDENCE,
      POPS_STORED_FEATURE_TYPE.ATTENTION_CONFIDENCE,
      POPS_STORED_FEATURE_TYPE.REASON_CODES
    ],
    localProcessingUsed: true,
    retentionPolicy: POPS_RETENTION_POLICY.THIRTY_DAYS,
    ...overrides
  };
}

describe("PopsPrivacyReceiptService", () => {
  it("creates receipt and attaches receipt id to reward/trust outputs", async () => {
    const repository = new InMemoryPopsPrivacyReceiptRepository();
    const service = new PopsPrivacyReceiptService(repository);
    const trustEvent = {
      id: "trust_1",
      userId: "user_1",
      sessionId: "pops_session_1",
      source: "pops",
      eventType: POPS_TRUST_EVENT_TYPE.VERIFIED_ATTENTION_SESSION,
      weight: 0.1,
      confidence: 0.95,
      severity: POPS_TRUST_SEVERITY.INFO,
      reasonCodes: [] as string[],
      createdAt: "2026-04-20T10:05:00.000Z"
    };

    const result = await service.createPrivacyReceipt(buildInput({ trustEvent }));

    expect(result.receipt.id).toContain("pops_privacy_receipt_");
    expect(result.receipt.rawDataDiscarded).toBe(true);
    expect(result.attachments.rewardDecision?.privacyReceiptId).toBe(result.receipt.id);
    expect(result.attachments.trustEvent?.privacyReceiptId).toBe(result.receipt.id);
    expect(repository.list()).toHaveLength(1);
  });

  it("uses visual presence copy when visual signals are part of a high-proof session", async () => {
    const repository = new InMemoryPopsPrivacyReceiptRepository();
    const service = new PopsPrivacyReceiptService(repository);
    const result = await service.createPrivacyReceipt(
      buildInput({
        session: buildSession({
          sessionType: POPS_SESSION_TYPE.ACCOUNT_VERIFICATION,
          proofLevel: POPS_PROOF_LEVEL.LEVEL_4_IDENTITY_CONTINUITY
        }),
        signalCategoriesUsed: [POPS_SIGNAL_CATEGORY.VISUAL_PRESENCE],
        rawDataTypesStored: [POPS_RAW_DATA_TYPE.RAW_CAMERA_FRAME]
      })
    );

    expect(result.receipt.userVisibleSummary).toContain("temporary visual presence signals");
    expect(result.receipt.rawDataTypesStored).toEqual([POPS_RAW_DATA_TYPE.RAW_CAMERA_FRAME]);
  });

  it("uses held and denied user-facing copy variants", async () => {
    const repository = new InMemoryPopsPrivacyReceiptRepository();
    const service = new PopsPrivacyReceiptService(repository);

    const heldResult = await service.createPrivacyReceipt(
      buildInput({
        rewardDecision: buildRewardDecision(POPS_REWARD_DECISION_STATUS.HELD)
      })
    );
    expect(heldResult.receipt.userVisibleSummary).toContain("held because the session could not be fully verified");

    const deniedResult = await service.createPrivacyReceipt(
      buildInput({
        rewardDecision: buildRewardDecision(POPS_REWARD_DECISION_STATUS.DENIED_LOW_CONFIDENCE)
      })
    );
    expect(deniedResult.receipt.userVisibleSummary).toContain("not approved");
  });
});

describe("retentionExpiresAtForPolicy", () => {
  it("returns null for LEGAL_REQUIRED retention", () => {
    expect(
      retentionExpiresAtForPolicy(POPS_RETENTION_POLICY.LEGAL_REQUIRED, "2026-04-20T10:00:00.000Z")
    ).toBeNull();
  });

  it("returns iso date for fixed retention windows", () => {
    const result = retentionExpiresAtForPolicy(
      POPS_RETENTION_POLICY.NINETY_DAYS,
      "2026-04-20T10:00:00.000Z"
    );
    expect(result).toBe("2026-07-19T10:00:00.000Z");
  });
});

