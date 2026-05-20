import { describe, expect, it } from "vitest";
import { PopsAbuseRulesEngine } from "./pops-abuse-rules";
import { PopsDeviceRiskEngine } from "./pops-device-risk";
import {
  createPopsSessionToken,
  validatePopsSessionToken,
  verifyPopsEventDigestSignature,
  signPopsEventDigest,
} from "./pops-event-signing";
import { PopsReplayProtection } from "./pops-replay-protection";
import { PopsSessionIntegrityValidator } from "./pops-session-integrity";

describe("POPS Stage 24 security hardening", () => {
  it("rejects replayed event ids and impossible sequence completion", () => {
    const validator = new PopsSessionIntegrityValidator();
    const start = validator.validateSequence(
      {
        eventId: "evt-1",
        eventType: "SESSION_STARTED",
        sessionId: "sess-1",
        userId: "u1",
        deviceId: "d1",
        campaignId: "c1",
        clientTimestampMs: 1_000,
        sequence: 1,
        payload: {},
      },
      { requiredDurationMs: 10_000, nowMs: 1_000 },
    );
    expect(start.accepted).toBe(true);

    const duplicate = validator.validateSequence(
      {
        eventId: "evt-1",
        eventType: "CONTENT_PROGRESS",
        sessionId: "sess-1",
        userId: "u1",
        deviceId: "d1",
        campaignId: "c1",
        clientTimestampMs: 2_000,
        sequence: 2,
        payload: {},
      },
      { requiredDurationMs: 10_000, nowMs: 2_000 },
    );
    expect(duplicate.accepted).toBe(false);
    expect(duplicate.reasons).toContain("DUPLICATE_EVENT_ID");
    expect(duplicate.reasons).toContain("CANNOT_PROGRESS_CONTENT_BEFORE_CONTENT_STARTED");
  });

  it("enforces reward idempotency across session and campaign completion", () => {
    const validator = new PopsSessionIntegrityValidator();
    const first = validator.assertRewardIdempotency({
      sessionId: "sess-1",
      campaignId: "c1",
      userId: "u1",
      campaignAllowsDuplicateRewards: false,
    });
    expect(first.allowed).toBe(true);

    const second = validator.assertRewardIdempotency({
      sessionId: "sess-1",
      campaignId: "c1",
      userId: "u1",
      campaignAllowsDuplicateRewards: false,
    });
    expect(second.allowed).toBe(false);
    expect(second.reasons).toContain("SESSION_ALREADY_HAS_WALLET_INTENT");
    expect(second.reasons).toContain("DUPLICATE_CAMPAIGN_COMPLETION_REWARD_BLOCKED");
  });

  it("validates bound session tokens and event digest signatures", () => {
    const nowMs = Date.now();
    const secret = "pops_test_secret";
    const token = createPopsSessionToken(
      {
        sessionId: "sess-7",
        userId: "u7",
        deviceId: "d7",
        campaignId: "c7",
        startedAtMs: nowMs - 1000,
        expiresAtMs: nowMs + 5000,
      },
      secret,
    );

    const validToken = validatePopsSessionToken(
      {
        token,
        expectedSessionId: "sess-7",
        expectedUserId: "u7",
        expectedDeviceId: "d7",
        expectedCampaignId: "c7",
        atMs: nowMs,
      },
      secret,
    );
    expect(validToken.valid).toBe(true);

    const digest = "sha256:deadbeef";
    const signature = signPopsEventDigest(digest, token, secret);
    expect(verifyPopsEventDigestSignature(digest, token, signature, secret)).toBe(true);
    expect(verifyPopsEventDigestSignature("sha256:bad", token, signature, secret)).toBe(false);
  });

  it("blocks oversized and forged payload fields", () => {
    const abuse = new PopsAbuseRulesEngine();
    const result = abuse.validatePayload(
      "SESSION_STARTED",
      {
        proofLevel: "FAKE_LEVEL",
        finalConfidence: 0.99,
        rawMediaBlob: "x".repeat(100),
        presenceConfidence: 2,
      },
      {
        maxPayloadBytes: 20,
        allowlistedEventTypes: ["SESSION_STARTED", "SESSION_COMPLETED"],
        allowlistedProofLevels: ["LEVEL_1_SESSION", "LEVEL_2_ATTENTION"],
        allowRawMediaUpload: false,
      },
    );
    expect(result.accepted).toBe(false);
    expect(result.reasons).toContain("PAYLOAD_OVERSIZED");
    expect(result.reasons).toContain("INVALID_PROOF_LEVEL");
    expect(result.reasons).toContain("CLIENT_FINAL_CONFIDENCE_OVERRIDE_REJECTED");
    expect(result.reasons).toContain("RAW_MEDIA_UPLOAD_REJECTED");
  });

  it("detects signal replay patterns and abusive rate spikes", () => {
    const replay = new PopsReplayProtection();
    const first = replay.acceptBatch({
      batchId: "b1",
      sessionId: "s1",
      userId: "u1",
      deviceId: "d1",
      timingSignature: "100,200,350",
      signalDigest: "sigA",
      createdAtMs: 1000,
    });
    expect(first.accepted).toBe(true);

    const duplicate = replay.acceptBatch({
      batchId: "b1",
      sessionId: "s1",
      userId: "u1",
      deviceId: "d1",
      timingSignature: "100,200,350",
      signalDigest: "sigA",
      createdAtMs: 1001,
    });
    expect(duplicate.accepted).toBe(false);
    expect(duplicate.reasons).toContain("DUPLICATE_BATCH_ID");

    const abuse = new PopsAbuseRulesEngine();
    const firstTry = abuse.enforceRateLimit({ key: "sessions:user:u1", max: 1, windowMs: 60_000 }, 1_000);
    const secondTry = abuse.enforceRateLimit({ key: "sessions:user:u1", max: 1, windowMs: 60_000 }, 1_001);
    expect(firstTry.allowed).toBe(true);
    expect(secondTry.allowed).toBe(false);
  });

  it("assigns high risk to emulator and multi-account device farms", () => {
    const risk = new PopsDeviceRiskEngine();
    risk.assess({
      deviceId: "device-shared",
      userId: "u1",
      emulator: false,
      rootedOrJailbroken: false,
      automationFrameworkDetected: false,
      debugMode: false,
      accessibilityAutomationSuspected: false,
      installAgeHours: 24,
      sessionsLast24h: 2,
    });
    risk.assess({
      deviceId: "device-shared",
      userId: "u2",
      emulator: false,
      rootedOrJailbroken: false,
      automationFrameworkDetected: false,
      debugMode: false,
      accessibilityAutomationSuspected: false,
      installAgeHours: 24,
      sessionsLast24h: 2,
    });
    risk.assess({
      deviceId: "device-shared",
      userId: "u3",
      emulator: false,
      rootedOrJailbroken: false,
      automationFrameworkDetected: false,
      debugMode: false,
      accessibilityAutomationSuspected: false,
      installAgeHours: 24,
      sessionsLast24h: 2,
    });

    const highRisk = risk.assess({
      deviceId: "device-shared",
      userId: "u4",
      emulator: true,
      rootedOrJailbroken: true,
      automationFrameworkDetected: true,
      debugMode: true,
      accessibilityAutomationSuspected: true,
      installAgeHours: 0.1,
      sessionsLast24h: 50,
    });
    expect(highRisk.score).toBeGreaterThan(0.8);
    expect(highRisk.riskTier).toBe("CRITICAL");
  });
});
