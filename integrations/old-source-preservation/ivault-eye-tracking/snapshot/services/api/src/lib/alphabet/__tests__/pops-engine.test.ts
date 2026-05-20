import { describe, expect, it } from "vitest";
import type { PresencePhase1SignalBatch } from "../../../types/alphabet/pops.types";
import {
  buildPhase1PresenceJudgment,
  buildPresenceRewardDecision,
  buildPrivacyReceipt,
  buildTrustEventFromDecision,
  buildWalletPendingInstruction,
  canTransitionPresenceSessionState
} from "../pops-engine";

function makeSignalBatch(
  overrides: Partial<PresencePhase1SignalBatch> = {}
): PresencePhase1SignalBatch {
  return {
    sessionId: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    contentId: crypto.randomUUID(),
    campaignId: crypto.randomUUID(),
    clientTimestampMs: Date.now(),
    signals: {
      screenActive: true,
      appForeground: true,
      sessionDurationMs: 90_000,
      contentProgressPct: 62,
      touchEvents: 11,
      touchIntentScore: 0.78,
      motionStability: 0.82,
      facePresent: true
    },
    deviceIntegrity: {
      emulatorRisk: 0.02,
      automationRisk: 0.03,
      replayRisk: 0.02
    },
    privacy: {
      rawCameraStored: false,
      rawAudioStored: false,
      rawLocationStored: false,
      localFeatureExtraction: true
    },
    ...overrides
  };
}

describe("pops-engine", () => {
  it("builds a high-confidence judgment from clean signals", () => {
    const judgment = buildPhase1PresenceJudgment(makeSignalBatch());
    expect(judgment.presenceConfidence).toBeGreaterThan(0.75);
    expect(judgment.attentionConfidence).toBeGreaterThan(0.6);
    expect(judgment.intentConfidence).toBeGreaterThan(0.6);
    expect(judgment.fraudRisk).toBeLessThan(0.2);
    expect(["engaged_active", "focused"]).toContain(judgment.sessionState);
  });

  it("flags likely fraud for high automation and replay risk", () => {
    const judgment = buildPhase1PresenceJudgment(
      makeSignalBatch({
        deviceIntegrity: {
          emulatorRisk: 0.85,
          automationRisk: 0.9,
          replayRisk: 0.88
        }
      })
    );
    expect(judgment.fraudRisk).toBeGreaterThanOrEqual(0.75);
    expect(judgment.sessionState).toBe("fraud_likely");
    expect(judgment.recommendedAction).toBe("deny_reward");
  });

  it("creates approved decision and wallet pending instruction", () => {
    const judgment = buildPhase1PresenceJudgment(makeSignalBatch());
    const decision = buildPresenceRewardDecision({
      judgment,
      baseAmountMinor: 120
    });

    expect(["approved", "partial", "pending_review"]).toContain(decision.decision);
    const instruction = buildWalletPendingInstruction(decision);
    if (decision.finalAmountMinor > 0 && decision.decision !== "denied" && decision.decision !== "fraud_blocked") {
      expect(instruction).not.toBeNull();
      expect(instruction?.amountMinor).toBe(decision.finalAmountMinor);
    }
  });

  it("creates deny decision with no wallet instruction for fraud block", () => {
    const judgment = buildPhase1PresenceJudgment(
      makeSignalBatch({
        deviceIntegrity: {
          emulatorRisk: 0.95,
          automationRisk: 0.95,
          replayRisk: 0.95
        }
      })
    );
    const decision = buildPresenceRewardDecision({
      judgment,
      baseAmountMinor: 100
    });
    expect(decision.decision).toBe("fraud_blocked");
    expect(decision.finalAmountMinor).toBe(0);
    expect(buildWalletPendingInstruction(decision)).toBeNull();
    expect(buildTrustEventFromDecision(decision).trustEventType).toBe("spoof_detected");
  });

  it("creates privacy receipt with local-processing defaults", () => {
    const receipt = buildPrivacyReceipt(makeSignalBatch());
    expect(receipt.localProcessingUsed).toBe(true);
    expect(receipt.rawCameraStored).toBe(false);
    expect(receipt.rawDataDeletedAt).not.toBeNull();
  });

  it("validates canonical state transitions", () => {
    expect(canTransitionPresenceSessionState("detecting", "present_idle")).toBe(true);
    expect(canTransitionPresenceSessionState("reward_approved", "reward_pending")).toBe(false);
    expect(canTransitionPresenceSessionState("focused", "reward_pending")).toBe(true);
  });
});
