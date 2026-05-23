import type {
  ProofPacketV0,
  ProofReviewResult,
  ProofReviewStatus
} from "../types/proof-packet-v0.types.js";
import type {
  PopsRewardDecision,
  PopsScoringResult
} from "../types/pops-decisions.types.js";
import type { PopsSignalBatch } from "../types/pops.types.js";

export interface ProofReviewRecord {
  sessionId: string;
  userId?: string | null;
  localUserRef: string;
  contentId: string;
  offerId: string;
  packetId?: string | null;
  artifactId?: string | null;
  submittedAt: string;
  reviewedAt: string;
  status: ProofReviewStatus;
  originalPacket: ProofPacketV0;
  projectedPacket: ProofPacketV0;
  batch: PopsSignalBatch;
  scoring: PopsScoringResult;
  decision: PopsRewardDecision;
  review: ProofReviewResult;
}

export interface ProofReviewStore {
  save(record: ProofReviewRecord): ProofReviewRecord;
  getBySessionId(sessionId: string): ProofReviewRecord | null;
  getByArtifactId(artifactId: string): ProofReviewRecord | null;
  getByPacketId(packetId: string): ProofReviewRecord | null;
}

export class ProofReviewConflictError extends Error {
  readonly sessionId: string;

  constructor(sessionId: string) {
    super(`Proof review record already exists for sessionId: ${sessionId}`);
    this.name = "ProofReviewConflictError";
    this.sessionId = sessionId;
  }
}

export class InMemoryProofReviewStore implements ProofReviewStore {
  private readonly bySessionId = new Map<string, ProofReviewRecord>();
  private readonly sessionIdByArtifactId = new Map<string, string>();
  private readonly sessionIdByPacketId = new Map<string, string>();

  save(record: ProofReviewRecord): ProofReviewRecord {
    if (this.bySessionId.has(record.sessionId)) {
      throw new ProofReviewConflictError(record.sessionId);
    }

    this.bySessionId.set(record.sessionId, record);

    if (record.artifactId) {
      this.sessionIdByArtifactId.set(record.artifactId, record.sessionId);
    }

    if (record.packetId) {
      this.sessionIdByPacketId.set(record.packetId, record.sessionId);
    }

    return record;
  }

  getBySessionId(sessionId: string): ProofReviewRecord | null {
    return this.bySessionId.get(sessionId) ?? null;
  }

  getByArtifactId(artifactId: string): ProofReviewRecord | null {
    const sessionId = this.sessionIdByArtifactId.get(artifactId);
    if (!sessionId) {
      return null;
    }

    return this.bySessionId.get(sessionId) ?? null;
  }

  getByPacketId(packetId: string): ProofReviewRecord | null {
    const sessionId = this.sessionIdByPacketId.get(packetId);
    if (!sessionId) {
      return null;
    }

    return this.bySessionId.get(sessionId) ?? null;
  }

  clear(): void {
    this.bySessionId.clear();
    this.sessionIdByArtifactId.clear();
    this.sessionIdByPacketId.clear();
  }
}
