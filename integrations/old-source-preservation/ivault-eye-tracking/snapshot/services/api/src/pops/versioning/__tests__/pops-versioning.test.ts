import { describe, expect, it, vi } from "vitest";
import { POPS_EVENT_TYPE, type PopsEvent } from "../../types/pops-events.types";
import { POPS_PROOF_LEVEL, POPS_SIGNAL_SOURCE, POPS_SESSION_STATE, type PopsSignalBatch } from "../../types/pops.types";
import {
  POPS_CAMPAIGN_REQUIREMENTS_V1,
  POPS_PRIVACY_POLICY_V1,
  POPS_REWARD_FORMULA_V1,
  POPS_RULE_BUNDLE_V1
} from "../pops-rule-registry";
import { POPS_FRAUD_ENGINE_V1, POPS_SCORING_ENGINE_V1 } from "../pops-model-registry";
import { PopsReplayService, type PopsReplayDataStore } from "../pops-replay.service";
import {
  bundleToJudgmentVersionFields,
  bundleToPrivacyReceiptVersionFields,
  bundleToRewardVersionFields,
  resolveJudgmentRuleVersion,
  resolvePopsVersionBundle
} from "../pops-version-resolver";
import type { PopsVersionBundle } from "../pops-version.types";

function testBatch(sessionId: string, userId: string): PopsSignalBatch {
  return {
    sessionId,
    userId,
    timestampMs: Date.now(),
    signals: {
      screenActive: true,
      appForegrounded: true,
      contentProgressPct: 0.5,
      contentPositionMs: 5000,
      touchIntentScore: 0.6,
      motionStabilityScore: 0.7,
      visualPresenceScore: 0.8,
      audioDistractionScore: 0.2,
      deviceIntegrityScore: 0.9,
      accountContinuityScore: 0.85,
      locationClassConfidence: 0.7
    },
    privacy: {
      rawCameraStored: false,
      rawAudioStored: false,
      rawLocationStored: false,
      localFeatureExtractionUsed: true,
      retentionPolicy: "STANDARD"
    }
  };
}

describe("resolvePopsVersionBundle", () => {
  it("returns v1 registry ids for GLOBAL baseline", () => {
    const b = resolvePopsVersionBundle({
      sessionAt: new Date().toISOString(),
      region: "GLOBAL",
      appVersion: "2.4.1",
      featureFlags: {}
    });
    expect(b.scoringModelVersion).toBe(POPS_SCORING_ENGINE_V1);
    expect(b.fraudModelVersion).toBe(POPS_FRAUD_ENGINE_V1);
    expect(b.rewardFormulaVersion).toBe(POPS_REWARD_FORMULA_V1);
    expect(b.campaignRequirementVersion).toBe(POPS_CAMPAIGN_REQUIREMENTS_V1);
    expect(b.privacyPolicyVersion).toBe(POPS_PRIVACY_POLICY_V1);
    expect(b.walletRuleVersion).toBeTruthy();
    expect(b.createdAt).toMatch(/^\d{4}-/);
  });

  it("uses EU privacy suffix for EU region", () => {
    const b = resolvePopsVersionBundle({
      sessionAt: new Date().toISOString(),
      region: "EU",
      appVersion: "1.0.0",
      featureFlags: {}
    });
    expect(b.privacyPolicyVersion).toBe(`${POPS_PRIVACY_POLICY_V1}_EU`);
  });

  it("uses EU privacy when strict flag is on", () => {
    const b = resolvePopsVersionBundle({
      sessionAt: new Date().toISOString(),
      region: "US",
      appVersion: "1.0.0",
      featureFlags: { pops_strict_privacy_eu: true }
    });
    expect(b.privacyPolicyVersion).toBe(`${POPS_PRIVACY_POLICY_V1}_EU`);
  });

  it("uses campaign requirements beta when flag and campaignId set", () => {
    const b = resolvePopsVersionBundle({
      sessionAt: new Date().toISOString(),
      campaignId: "camp_1",
      region: "GLOBAL",
      appVersion: "1.0.0",
      featureFlags: { pops_campaign_requirements_beta: true }
    });
    expect(b.campaignRequirementVersion).toBe(`${POPS_CAMPAIGN_REQUIREMENTS_V1}_BETA`);
  });

  it("maps bundle to judgment, reward, and privacy field shapes", () => {
    const bundle = resolvePopsVersionBundle({
      sessionAt: new Date().toISOString(),
      region: "GLOBAL",
      appVersion: "1.0.0",
      featureFlags: {}
    });
    const ruleVersion = resolveJudgmentRuleVersion({
      sessionAt: bundle.createdAt,
      region: "GLOBAL",
      appVersion: "1.0.0",
      featureFlags: {}
    });
    expect(ruleVersion).toBe(POPS_RULE_BUNDLE_V1);

    const jv = bundleToJudgmentVersionFields(bundle, ruleVersion);
    expect(jv.ruleVersion).toBe(POPS_RULE_BUNDLE_V1);
    expect(jv.scoringModelVersion).toBe(bundle.scoringModelVersion);

    const rv = bundleToRewardVersionFields(bundle);
    expect(rv.rewardFormulaVersion).toBe(POPS_REWARD_FORMULA_V1);

    const pv = bundleToPrivacyReceiptVersionFields(bundle);
    expect(pv.privacyPolicyVersion).toBe(bundle.privacyPolicyVersion);
    expect(pv.retentionPolicyVersion).toContain("POPS_RETENTION_POLICY_V1");
    expect(pv.consentPolicyVersion).toContain("POPS_CONSENT_POLICY_V1");
  });
});

describe("PopsReplayService", () => {
  it("throws when no signal batches exist", async () => {
    const sessionId = "sess_empty";
    const store: PopsReplayDataStore = {
      loadEvents: async () => [],
      loadSignalBatches: async () => []
    };
    const svc = new PopsReplayService({ dataStore: store });
    const bundle: PopsVersionBundle = resolvePopsVersionBundle({
      sessionAt: new Date().toISOString(),
      region: "GLOBAL",
      appVersion: "1.0.0",
      featureFlags: {}
    });
    await expect(svc.replayJudgment(sessionId, bundle)).rejects.toThrow(/no signal batches/);
  });

  it("replays from stored events and batches without mutating original snapshot", async () => {
    const sessionId = "sess_replay_1";
    const userId = "user_1";
    const batch = testBatch(sessionId, userId);
    const events: PopsEvent[] = [
      {
        id: "ev1",
        sessionId,
        userId,
        type: POPS_EVENT_TYPE.SESSION_STARTED,
        source: POPS_SIGNAL_SOURCE.SCREEN,
        timestampMs: 1,
        payload: {}
      }
    ];

    const store: PopsReplayDataStore = {
      loadEvents: async () => events,
      loadSignalBatches: async () => [batch]
    };

    const saved: unknown[] = [];
    const svc = new PopsReplayService({
      dataStore: store,
      replayRepository: {
        save: vi.fn(async (r) => {
          saved.push(r);
        })
      }
    });

    const bundle = resolvePopsVersionBundle({
      sessionAt: new Date().toISOString(),
      region: "GLOBAL",
      appVersion: "1.0.0",
      featureFlags: {}
    });

    const original = { fraudRisk: 0.99, sessionId };
    const record = await svc.replayJudgment(sessionId, bundle, {
      requestedBy: "admin:test",
      originalJudgment: original,
      sessionContext: {
        userId,
        proofLevel: POPS_PROOF_LEVEL.LEVEL_2_ATTENTION,
        state: POPS_SESSION_STATE.FOCUSED
      }
    });

    expect(record.replayOutput.eventCount).toBe(1);
    expect(record.replayOutput.signalBatchCount).toBe(1);
    expect(record.replayOutput.versionBundle.scoringModelVersion).toBe(bundle.scoringModelVersion);
    expect(record.differenceSummary?.changedKeys).toContain("fraudRisk");
    expect(original.fraudRisk).toBe(0.99);
    expect(saved).toHaveLength(1);
  });
});
