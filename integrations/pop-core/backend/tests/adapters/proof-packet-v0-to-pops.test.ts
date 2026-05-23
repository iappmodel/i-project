import { describe, expect, it } from "vitest";
import {
  proofPacketV0ToDecisionInput,
  proofPacketV0ToPopsSignalBatch
} from "../../adapters/proof-packet-v0-to-pops.js";
import { PopsScoringService } from "../../scoring/pops-scoring.service.js";
import { POPS_PROOF_LEVEL, POPS_SESSION_STATE } from "../../types/pops.types.js";
import { pp000001Packet } from "../fixtures/pp-000001-packet.js";

describe("proofPacketV0ToPopsSignalBatch", () => {
  it("maps PP-000001 into a PopsSignalBatch", () => {
    const batch = proofPacketV0ToPopsSignalBatch(pp000001Packet);

    expect(batch.sessionId).toBe("sess_8f3c2a1b-4e5d-6a7b-8c9d-0e1f2a3b4c5d");
    expect(batch.userId).toBe("demo-user-001");
    expect(batch.timestampMs).toBe(Date.parse("2026-05-20T18:08:42.000Z"));

    expect(batch.signals.screenActive).toBe(true);
    expect(batch.signals.appForegrounded).toBe(true);
    expect(batch.signals.contentProgressPct).toBe(1);
    expect(batch.signals.contentPositionMs).toBe(268000);
    expect(batch.signals.touchIntentScore).toBe(0.85);
    expect(batch.signals.visualPresenceScore).toBe(0.9);
    expect(batch.signals.deviceIntegrityScore).toBe(0.96);
    expect(batch.signals.audioDistractionScore).toBe(0.15);
    expect(batch.signals.accountContinuityScore).toBe(0.88);
    expect(batch.signals.locationClassConfidence).toBe(0.75);
  });

  it("uses static v0 privacy defaults", () => {
    const batch = proofPacketV0ToPopsSignalBatch(pp000001Packet);

    expect(batch.privacy).toEqual({
      rawCameraStored: false,
      rawAudioStored: false,
      rawLocationStored: false,
      localFeatureExtractionUsed: true,
      retentionPolicy: "STANDARD"
    });
  });

  it("prefers userId over localUserRef when present", () => {
    const batch = proofPacketV0ToPopsSignalBatch({
      ...pp000001Packet,
      userId: "auth-123"
    });

    expect(batch.userId).toBe("auth-123");
  });
});

describe("proofPacketV0ToDecisionInput", () => {
  it("merges scoring output with packet identity and defaults", () => {
    const batch = proofPacketV0ToPopsSignalBatch(pp000001Packet);
    const scoring = new PopsScoringService().score(batch);
    const input = proofPacketV0ToDecisionInput(pp000001Packet, scoring);

    expect(input.sessionId).toBe(pp000001Packet.sessionId);
    expect(input.userId).toBe("demo-user-001");
    expect(input.proofLevel).toBe(POPS_PROOF_LEVEL.LEVEL_2_ATTENTION);
    expect(input.state).toBe(POPS_SESSION_STATE.COMPLETED);
    expect(input.presenceConfidence).toBe(scoring.presenceConfidence);
    expect(input.fraudRisk).toBe(scoring.fraudRisk);
  });

  it("applies optional overrides", () => {
    const batch = proofPacketV0ToPopsSignalBatch(pp000001Packet);
    const scoring = new PopsScoringService().score(batch);
    const input = proofPacketV0ToDecisionInput(pp000001Packet, scoring, {
      proofLevel: POPS_PROOF_LEVEL.LEVEL_3_INTENT,
      state: POPS_SESSION_STATE.FOCUSED
    });

    expect(input.proofLevel).toBe(POPS_PROOF_LEVEL.LEVEL_3_INTENT);
    expect(input.state).toBe(POPS_SESSION_STATE.FOCUSED);
  });
});
