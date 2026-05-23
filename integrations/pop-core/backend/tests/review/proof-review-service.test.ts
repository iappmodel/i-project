import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ProofReviewNonPendingSubmissionError,
  ProofReviewService
} from "../../review/proof-review-service.js";
import { JsonFileProofReviewStore } from "../../review/persistence/json-file-proof-review-store.js";
import { InMemoryProofReviewStore } from "../../review/proof-review-store.js";
import { PROOF_REVIEW_LIFECYCLE_EVENT } from "../../review/proof-review-lifecycle.types.js";
import { PopsDecisionService } from "../../decisions/pops-decision.service.js";
import {
  POPS_REWARD_ELIGIBILITY,
  type PopsDecisionInput,
  type PopsRewardDecision
} from "../../types/pops-decisions.types.js";
import { POPS_PROOF_LEVEL, POPS_SESSION_STATE } from "../../types/pops.types.js";
import { pp000001Packet } from "../fixtures/pp-000001-packet.js";

describe("ProofReviewService", () => {
  const submittedAt = "2026-05-23T12:00:00.000Z";
  const tempDirs: string[] = [];

  afterEach(() => {
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  function createService(): ProofReviewService {
    return new ProofReviewService(new InMemoryProofReviewStore());
  }

  function createTempDir(): string {
    const dir = mkdtempSync(join(tmpdir(), "proof-review-service-"));
    tempDirs.push(dir);
    return dir;
  }

  it("submits PP-000001 and stores pending original with approved projection", () => {
    const service = createService();
    const inputPacket = pp000001Packet;

    expect(inputPacket.review.status).toBe("pending");

    const record = service.submitProofPacketForReview(inputPacket, {
      artifactId: "PP-000001",
      packetId: "pkt-test-001",
      submittedAt
    });

    expect(record.status).toBe("approved");
    expect(record.review.status).toBe("approved");
    expect(record.review.reasons).toContain("all_thresholds_met");
    expect(record.decision.rewardEligibility).toBe(POPS_REWARD_ELIGIBILITY.ELIGIBLE_FULL);

    expect(record.originalPacket.review.status).toBe("pending");
    expect(record.projectedPacket.review.status).toBe("approved");
    expect(record.projectedPacket.review).toEqual(record.review);

    expect(inputPacket.review.status).toBe("pending");
  });

  it("records lifecycleEvents with AUTHORITY_REVIEW_COMPLETED for PP-000001", () => {
    const service = createService();

    const record = service.submitProofPacketForReview(pp000001Packet, { submittedAt });

    expect(record.lifecycleEvents).toHaveLength(1);
    expect(record.lifecycleEvents[0]).toMatchObject({
      type: PROOF_REVIEW_LIFECYCLE_EVENT.AUTHORITY_REVIEW_COMPLETED,
      sessionId: pp000001Packet.sessionId,
      targetStatus: "approved",
      rewardEligibility: POPS_REWARD_ELIGIBILITY.ELIGIBLE_FULL
    });
  });

  it("stores identity fields and full projection artifacts for PP-000001", () => {
    const service = createService();

    const record = service.submitProofPacketForReview(pp000001Packet, { submittedAt });

    expect(record.sessionId).toBe(pp000001Packet.sessionId);
    expect(record.userId).toBeNull();
    expect(record.localUserRef).toBe(pp000001Packet.localUserRef);
    expect(record.contentId).toBe(pp000001Packet.contentId);
    expect(record.offerId).toBe(pp000001Packet.offerId);
    expect(record.submittedAt).toBe(submittedAt);
    expect(record.reviewedAt).toBe(record.decision.createdAt);

    expect(record.batch.sessionId).toBe(pp000001Packet.sessionId);
    expect(record.scoring.presenceConfidence).toBeGreaterThanOrEqual(0);
    expect(record.scoring.presenceConfidence).toBeLessThanOrEqual(1);
    expect(record).toHaveProperty("decision");
    expect(record).toHaveProperty("review");
  });

  it("does not populate settlement or layer outcomes beyond null settlementAmount", () => {
    const service = createService();

    const record = service.submitProofPacketForReview(pp000001Packet);

    expect(record.review.settlementAmount).toBeNull();
    expect(record.review.layerOutcomes).toBeNull();
    expect(record.projectedPacket.review.settlementAmount).toBeNull();
    expect(record.projectedPacket.review.layerOutcomes).toBeNull();
  });

  it("looks up records by sessionId, artifactId, and packetId", () => {
    const service = createService();

    const record = service.submitProofPacketForReview(pp000001Packet, {
      artifactId: "PP-000001",
      packetId: "pkt-test-001",
      submittedAt
    });

    expect(service.getReviewBySessionId(pp000001Packet.sessionId)).toBe(record);
    expect(service.getReviewByArtifactId("PP-000001")).toBe(record);
    expect(service.getReviewByPacketId("pkt-test-001")).toBe(record);
  });

  it("returns null for missing lookups", () => {
    const service = createService();

    expect(service.getReviewBySessionId("missing-session")).toBeNull();
    expect(service.getReviewByArtifactId("missing-artifact")).toBeNull();
    expect(service.getReviewByPacketId("missing-packet")).toBeNull();
  });

  it("rejects submission when original review.status is not pending", () => {
    const service = createService();
    const packet = structuredClone(pp000001Packet);
    packet.review = {
      ...packet.review,
      status: "approved",
      reviewedAt: "2026-05-20T18:08:42.000Z"
    };

    expect(() => service.submitProofPacketForReview(packet)).toThrow(
      ProofReviewNonPendingSubmissionError
    );
  });

  it("persists PP-000001 through JsonFileProofReviewStore across service restart", () => {
    const baseDir = createTempDir();
    const service = new ProofReviewService(new JsonFileProofReviewStore({ baseDir }));

    const record = service.submitProofPacketForReview(pp000001Packet, {
      artifactId: "PP-000001",
      packetId: "pkt-test-001",
      submittedAt
    });

    const reloadedService = new ProofReviewService(new JsonFileProofReviewStore({ baseDir }));
    const reloaded = reloadedService.getReviewBySessionId(pp000001Packet.sessionId);

    expect(reloaded).toEqual(record);
    expect(reloaded?.lifecycleEvents).toHaveLength(1);
    expect(reloadedService.getReviewByArtifactId("PP-000001")).toEqual(record);
    expect(reloadedService.getReviewByPacketId("pkt-test-001")).toEqual(record);
  });

  it("records AUTHORITY_REVIEW_DEFERRED when authority eligibility is ELIGIBLE_PENDING", () => {
    const deferredDecision: PopsRewardDecision = {
      id: "pops_reward_decision_deferred",
      sessionId: pp000001Packet.sessionId,
      userId: pp000001Packet.userId ?? "local-user",
      proofLevel: POPS_PROOF_LEVEL.LEVEL_2_ATTENTION,
      sessionState: POPS_SESSION_STATE.COMPLETED,
      rewardEligibility: POPS_REWARD_ELIGIBILITY.ELIGIBLE_PENDING,
      trustImpact: "NONE",
      recommendedAction: "CONTINUE_TRACKING",
      reasonCodes: ["confidence_pending"],
      createdAt: "2026-05-23T12:00:01.000Z"
    };

    const decisionService = {
      evaluate(_input: PopsDecisionInput): PopsRewardDecision {
        return deferredDecision;
      },
      toJudgment: PopsDecisionService.prototype.toJudgment
    };

    const service = new ProofReviewService(new InMemoryProofReviewStore());
    const record = service.submitProofPacketForReview(pp000001Packet, {
      submittedAt,
      decisionService
    });

    expect(record.status).toBe("pending");
    expect(record.review.status).toBe("pending");
    expect(record.reviewedAt).toBe("2026-05-23T12:00:01.000Z");
    expect(record.lifecycleEvents).toHaveLength(1);
    expect(record.lifecycleEvents[0]).toMatchObject({
      type: PROOF_REVIEW_LIFECYCLE_EVENT.AUTHORITY_REVIEW_DEFERRED,
      rewardEligibility: POPS_REWARD_ELIGIBILITY.ELIGIBLE_PENDING
    });
  });
});
