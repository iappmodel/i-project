import { describe, expect, it, vi } from "vitest";
import { PopsEventController } from "../controllers/pops-event.controller";

describe("PopsEventController", () => {
  it("rejects impossible signal-batch values", async () => {
    const sessions = {
      getSessionForUser: vi.fn().mockResolvedValue({
        id: "ab542764-5112-49b9-84e5-2360645f8f39",
        state: "DETECTING",
        metadata: {}
      })
    };
    const events = {
      hasBatchId: vi.fn().mockResolvedValue(false)
    };
    const controller = new PopsEventController(sessions as any, events as any);

    const result = await controller.ingestSignalBatch(
      "ab542764-5112-49b9-84e5-2360645f8f39",
      "d55de6e7-e31b-47c5-a213-1205ec6b7800",
      {
        batchId: "batch-1",
        clientTimestampMs: Date.now(),
        windowStartMs: 100,
        windowEndMs: 200,
        signals: {
          screenActiveRatio: 2,
          appForegroundRatio: 1,
          contentProgressDeltaPct: 10,
          touchEventCount: 1,
          scrollDistance: 10,
          averageScrollVelocity: 1,
          tapCount: 1,
          motionStabilityScore: 0.5,
          visualPresenceScore: 0.8,
          visualQualityScore: 0.9,
          audioDistractionScore: 0.1,
          deviceIntegrityScore: 0.8,
          accountContinuityScore: 0.7,
          locationClassConfidence: 0.4
        },
        privacy: {
          rawCameraStored: false,
          rawAudioStored: false,
          rawLocationStored: false,
          localFeatureExtractionUsed: true
        }
      }
    );

    expect(result.accepted).toBe(false);
    expect(result.reason).toBe("impossible_signal_data");
  });
});
