import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPopsSessionRouter } from "../routes/pops-session.routes";
import { createPopsEventRouter } from "../routes/pops-event.routes";

vi.mock("../../../middleware/auth", () => ({
  requireUserAuth: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.auth = {
      userId: "6e8a7d8a-3286-4ad7-9929-e38850bf8ae3",
      accessToken: "test-token"
    };
    next();
  }
}));

describe("P.O.P.S routes", () => {
  let app: express.Express;

  beforeEach(() => {
    const sessionController = {
      startSession: vi.fn().mockResolvedValue({ sessionId: "sid-1", state: "INITIALIZING" }),
      completeSession: vi.fn().mockResolvedValue({ sessionId: "sid-1", finalState: "COMPLETED" }),
      closeSession: vi.fn().mockResolvedValue({ sessionId: "sid-1", state: "CLOSED" }),
      getStatus: vi.fn().mockResolvedValue({ state: "DETECTING" }),
      getPrivacyReceipt: vi.fn().mockResolvedValue({ id: "pr-1" }),
      getRewardDecision: vi.fn().mockResolvedValue({ id: "rd-1" })
    };
    const eventController = {
      ingestEvents: vi.fn().mockResolvedValue({ acceptedCount: 1, rejectedCount: 0, rejectedItems: [] }),
      ingestSignalBatch: vi.fn().mockResolvedValue({ accepted: true, previewJudgment: {} }),
      checkpoint: vi.fn().mockResolvedValue({ sessionState: "DETECTING" })
    };

    app = express();
    app.use(express.json());
    app.use("/api/pops", createPopsSessionRouter(sessionController as any));
    app.use("/api/pops", createPopsEventRouter(eventController as any));
  });

  it("handles session start endpoint", async () => {
    const res = await request(app)
      .post("/api/pops/sessions/start")
      .set("authorization", "Bearer test")
      .set("x-device-id", "device-1")
      .send({
        userId: "6e8a7d8a-3286-4ad7-9929-e38850bf8ae3",
        deviceId: "device-1",
        sessionType: "FEED_VIEW",
        proofLevel: "LEVEL_1_SESSION",
        clientStartedAt: "2026-04-27T00:00:00.000Z",
        requiredDurationMs: 30000,
        clientContext: {},
        privacyMode: "LOCAL_ONLY"
      })
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data.sessionId).toBe("sid-1");
  });

  it("handles signal batch endpoint", async () => {
    const res = await request(app)
      .post("/api/pops/sessions/7dce9d55-0ef2-4720-b7ef-92695806f5ec/signal-batch")
      .set("authorization", "Bearer test")
      .send({
        batchId: "batch-1",
        clientTimestampMs: Date.now(),
        windowStartMs: Date.now() - 2000,
        windowEndMs: Date.now(),
        signals: {
          screenActiveRatio: 0.8,
          appForegroundRatio: 0.9,
          contentProgressDeltaPct: 10,
          touchEventCount: 3,
          scrollDistance: 120,
          averageScrollVelocity: 42,
          tapCount: 2,
          motionStabilityScore: 0.91,
          visualPresenceScore: 0.88,
          visualQualityScore: 0.82,
          audioDistractionScore: 0.05,
          deviceIntegrityScore: 0.95,
          accountContinuityScore: 0.92,
          locationClassConfidence: 0.7
        },
        privacy: {
          rawCameraStored: false,
          rawAudioStored: false,
          rawLocationStored: false,
          localFeatureExtractionUsed: true
        }
      })
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data.accepted).toBe(true);
  });
});
