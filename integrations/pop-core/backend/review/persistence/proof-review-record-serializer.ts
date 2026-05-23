import type {
  ProofPacketV0,
  ProofReviewResult,
  ProofReviewStatus
} from "../../types/proof-packet-v0.types.js";
import type {
  PopsRewardDecision,
  PopsScoringResult
} from "../../types/pops-decisions.types.js";
import type { PopsSignalBatch } from "../../types/pops.types.js";
import type { ProofReviewRecord } from "../proof-review-store.js";
import type { ProofReviewLifecycleEvent } from "../proof-review-lifecycle.types.js";

export const PROOF_REVIEW_RECORD_STORAGE_VERSION = 1 as const;

export interface ProofReviewStoredRecordV1 {
  storageVersion: typeof PROOF_REVIEW_RECORD_STORAGE_VERSION;
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
  lifecycleEvents: ProofReviewLifecycleEvent[];
}

export class ProofReviewRecordStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProofReviewRecordStorageError";
  }
}

export function toStoredRecord(record: ProofReviewRecord): ProofReviewStoredRecordV1 {
  return {
    storageVersion: PROOF_REVIEW_RECORD_STORAGE_VERSION,
    sessionId: record.sessionId,
    userId: record.userId,
    localUserRef: record.localUserRef,
    contentId: record.contentId,
    offerId: record.offerId,
    packetId: record.packetId,
    artifactId: record.artifactId,
    submittedAt: record.submittedAt,
    reviewedAt: record.reviewedAt,
    status: record.status,
    originalPacket: record.originalPacket,
    projectedPacket: record.projectedPacket,
    batch: record.batch,
    scoring: record.scoring,
    decision: record.decision,
    review: record.review,
    lifecycleEvents: record.lifecycleEvents
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertStringField(
  stored: Record<string, unknown>,
  field: keyof ProofReviewStoredRecordV1
): string {
  const value = stored[field as string];
  if (typeof value !== "string" || value.length === 0) {
    throw new ProofReviewRecordStorageError(`Missing or invalid string field: ${String(field)}`);
  }

  return value;
}

function assertArrayField(
  stored: Record<string, unknown>,
  field: keyof ProofReviewStoredRecordV1
): ProofReviewLifecycleEvent[] {
  const value = stored[field as string];
  if (!Array.isArray(value)) {
    throw new ProofReviewRecordStorageError(`Missing or invalid array field: ${String(field)}`);
  }

  return value as ProofReviewLifecycleEvent[];
}

export function fromStoredRecord(stored: unknown): ProofReviewRecord {
  if (!isRecord(stored)) {
    throw new ProofReviewRecordStorageError("Stored record must be a JSON object");
  }

  if (stored.storageVersion !== PROOF_REVIEW_RECORD_STORAGE_VERSION) {
    throw new ProofReviewRecordStorageError(
      `Unsupported storageVersion: ${String(stored.storageVersion)}`
    );
  }

  return {
    sessionId: assertStringField(stored, "sessionId"),
    userId: stored.userId === undefined ? undefined : (stored.userId as string | null),
    localUserRef: assertStringField(stored, "localUserRef"),
    contentId: assertStringField(stored, "contentId"),
    offerId: assertStringField(stored, "offerId"),
    packetId: stored.packetId === undefined ? undefined : (stored.packetId as string | null),
    artifactId: stored.artifactId === undefined ? undefined : (stored.artifactId as string | null),
    submittedAt: assertStringField(stored, "submittedAt"),
    reviewedAt: assertStringField(stored, "reviewedAt"),
    status: assertStringField(stored, "status") as ProofReviewStatus,
    originalPacket: stored.originalPacket as ProofPacketV0,
    projectedPacket: stored.projectedPacket as ProofPacketV0,
    batch: stored.batch as PopsSignalBatch,
    scoring: stored.scoring as PopsScoringResult,
    decision: stored.decision as PopsRewardDecision,
    review: stored.review as ProofReviewResult,
    lifecycleEvents: assertArrayField(stored, "lifecycleEvents")
  };
}
