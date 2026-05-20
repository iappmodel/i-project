import { describe, expect, it, vi } from "vitest";
import { PopsSessionController } from "../controllers/pops-session.controller";

describe("PopsSessionController", () => {
  it("returns stage-13 start session response shape", async () => {
    const sessions = {
      createSession: vi.fn().mockResolvedValue({
        id: "3c6d6d4a-e664-4ef8-902e-8fca632e42c8",
        state: "INITIALIZING",
        proof_level: "LEVEL_2_ATTENTION",
        required_duration_ms: 30000,
        minimum_presence_confidence: 0.65,
        minimum_attention_confidence: 0.6,
        minimum_intent_confidence: 0.3,
        maximum_fraud_risk: 0.4,
        started_at: "2026-04-27T00:00:00.000Z"
      })
    };

    const controller = new PopsSessionController(sessions as any);
    const result = await controller.startSession({
      userId: "5a2bc780-1229-4021-a1fb-a17ad68cbf4f",
      deviceId: "device-1",
      sessionType: "FEED_VIEW",
      proofLevel: "LEVEL_2_ATTENTION",
      clientStartedAt: "2026-04-27T00:00:00.000Z",
      requiredDurationMs: 30000,
      clientContext: {},
      privacyMode: "LOCAL_ONLY"
    });

    expect(result.sessionId).toBe("3c6d6d4a-e664-4ef8-902e-8fca632e42c8");
    expect(result.checkpointIntervalMs).toBe(5000);
    expect(result.minimumPresenceConfidence).toBe(0.65);
  });
});
