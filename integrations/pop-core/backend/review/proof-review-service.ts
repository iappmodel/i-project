import {
  projectProofPacketReview,
  type ProofReviewProjectorOptions
} from "./proof-review-projector.js";
import {
  InMemoryProofReviewStore,
  type ProofReviewRecord,
  type ProofReviewStore
} from "./proof-review-store.js";
import type { ProofPacketV0 } from "../types/proof-packet-v0.types.js";

export interface ProofReviewSubmitOptions extends ProofReviewProjectorOptions {
  artifactId?: string;
  packetId?: string;
  submittedAt?: string;
}

export class ProofReviewService {
  constructor(private readonly store: ProofReviewStore = new InMemoryProofReviewStore()) {}

  submitProofPacketForReview(
    packet: ProofPacketV0,
    options?: ProofReviewSubmitOptions
  ): ProofReviewRecord {
    const originalPacket = structuredClone(packet);
    const projection = projectProofPacketReview(originalPacket, options);

    const reviewedAt = projection.review.reviewedAt;
    if (!reviewedAt) {
      throw new Error(
        `Proof review projection did not set reviewedAt for sessionId: ${originalPacket.sessionId}`
      );
    }

    const record: ProofReviewRecord = {
      sessionId: originalPacket.sessionId,
      userId: originalPacket.userId,
      localUserRef: originalPacket.localUserRef,
      contentId: originalPacket.contentId,
      offerId: originalPacket.offerId,
      packetId: options?.packetId ?? null,
      artifactId: options?.artifactId ?? null,
      submittedAt: options?.submittedAt ?? new Date().toISOString(),
      reviewedAt,
      status: projection.review.status,
      originalPacket,
      projectedPacket: projection.packet,
      batch: projection.batch,
      scoring: projection.scoring,
      decision: projection.decision,
      review: projection.review
    };

    return this.store.save(record);
  }

  getReviewBySessionId(sessionId: string): ProofReviewRecord | null {
    return this.store.getBySessionId(sessionId);
  }

  getReviewByArtifactId(artifactId: string): ProofReviewRecord | null {
    return this.store.getByArtifactId(artifactId);
  }

  getReviewByPacketId(packetId: string): ProofReviewRecord | null {
    return this.store.getByPacketId(packetId);
  }
}
