import {
  projectProofPacketReview,
  type ProofReviewProjectorOptions
} from "./proof-review-projector.js";
import { lifecycleEventFromDecision } from "./proof-review-lifecycle.js";
import { ProofReviewStateMachine } from "./proof-review-state-machine.js";
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

export class ProofReviewNonPendingSubmissionError extends Error {
  readonly sessionId: string;
  readonly status: string;

  constructor(sessionId: string, status: string) {
    super(
      `Proof review submission requires review.status "pending" for sessionId: ${sessionId}, received: ${status}`
    );
    this.name = "ProofReviewNonPendingSubmissionError";
    this.sessionId = sessionId;
    this.status = status;
  }
}

export class ProofReviewProjectionMismatchError extends Error {
  readonly sessionId: string;
  readonly projectedStatus: string;
  readonly transitionStatus: string;

  constructor(sessionId: string, projectedStatus: string, transitionStatus: string) {
    super(
      `Proof review projection status "${projectedStatus}" does not match state machine transition "${transitionStatus}" for sessionId: ${sessionId}`
    );
    this.name = "ProofReviewProjectionMismatchError";
    this.sessionId = sessionId;
    this.projectedStatus = projectedStatus;
    this.transitionStatus = transitionStatus;
  }
}

export class ProofReviewService {
  constructor(private readonly store: ProofReviewStore = new InMemoryProofReviewStore()) {}

  submitProofPacketForReview(
    packet: ProofPacketV0,
    options?: ProofReviewSubmitOptions
  ): ProofReviewRecord {
    const originalPacket = structuredClone(packet);

    if (originalPacket.review.status !== ProofReviewStateMachine.initialStatus()) {
      throw new ProofReviewNonPendingSubmissionError(
        originalPacket.sessionId,
        originalPacket.review.status
      );
    }

    const projection = projectProofPacketReview(originalPacket, options);
    const lifecycleEvent = lifecycleEventFromDecision(projection.decision);
    const transition = ProofReviewStateMachine.transition(
      ProofReviewStateMachine.initialStatus(),
      lifecycleEvent
    );

    if (transition.to !== projection.review.status) {
      throw new ProofReviewProjectionMismatchError(
        originalPacket.sessionId,
        projection.review.status,
        transition.to
      );
    }

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
      status: transition.to,
      originalPacket,
      projectedPacket: projection.packet,
      batch: projection.batch,
      scoring: projection.scoring,
      decision: projection.decision,
      review: projection.review,
      lifecycleEvents: [lifecycleEvent]
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
