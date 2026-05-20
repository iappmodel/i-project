import type {
  MasteryDomain,
  MasteryEvidenceInput,
  MasteryPath,
  MasteryVerificationResult
} from "../../types/alphabet/mastery.types";
import { verifyMasteryPath } from "./mastery-engine";

type MasterySessionStoreState = {
  paths: Map<string, MasteryPath>;
  verificationResults: Map<string, MasteryVerificationResult>;
};

const store: MasterySessionStoreState = {
  paths: new Map(),
  verificationResults: new Map()
};

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function startMasteryPath(params: {
  userId: string;
  domain: MasteryDomain;
  ageBand: string;
  objectType?: string | null;
  objectId?: string | null;
}): MasteryPath {
  const now = nowIso();

  const path: MasteryPath = {
    masteryPathId: createId("mastery_path"),
    userId: params.userId,
    domain: params.domain,
    objectType: params.objectType ?? null,
    objectId: params.objectId ?? null,
    attemptCount: 0,
    successfulAttemptCount: 0,
    firstEvidenceAt: null,
    lastEvidenceAt: null,
    completedAt: null,
    status: "started",
    ageBand: params.ageBand,
    startedAt: now,
    createdAt: now,
    updatedAt: now
  };

  store.paths.set(path.masteryPathId, path);

  return path;
}

export function getMasteryPath(masteryPathId: string): MasteryPath | null {
  return store.paths.get(masteryPathId) ?? null;
}

export function recordMasteryEvidence(params: {
  masteryPathId: string;
  attemptCountDelta: number;
  successfulAttemptCountDelta: number;
}): MasteryPath {
  const path = getMasteryPath(params.masteryPathId);

  if (!path) {
    throw new Error("Mastery path not found.");
  }

  if (params.attemptCountDelta < 0 || params.successfulAttemptCountDelta < 0) {
    throw new Error("Attempt deltas cannot be negative.");
  }

  if (params.successfulAttemptCountDelta > params.attemptCountDelta) {
    throw new Error("Successful attempts cannot exceed total attempts delta.");
  }

  const now = nowIso();

  const next: MasteryPath = {
    ...path,
    attemptCount: path.attemptCount + params.attemptCountDelta,
    successfulAttemptCount:
      path.successfulAttemptCount + params.successfulAttemptCountDelta,
    firstEvidenceAt: path.firstEvidenceAt ?? now,
    lastEvidenceAt: now,
    status: "evidence_recorded",
    updatedAt: now
  };

  store.paths.set(next.masteryPathId, next);

  return next;
}

export function verifyStoredMasteryPath(
  input: Omit<
    MasteryEvidenceInput,
    | "masteryPathId"
    | "userId"
    | "domain"
    | "attemptCount"
    | "successfulAttemptCount"
    | "ageBand"
  > & {
    masteryPathId: string;
  }
): MasteryVerificationResult {
  const path = getMasteryPath(input.masteryPathId);

  if (!path) {
    throw new Error("Mastery path not found.");
  }

  const result = verifyMasteryPath({
    ...input,
    masteryPathId: path.masteryPathId,
    userId: path.userId,
    domain: path.domain,
    attemptCount: path.attemptCount,
    successfulAttemptCount: path.successfulAttemptCount,
    ageBand: path.ageBand,
    metadata: {
      ...input.metadata,
      objectType: path.objectType,
      objectId: path.objectId,
      firstEvidenceAt: path.firstEvidenceAt,
      lastEvidenceAt: path.lastEvidenceAt
    }
  });

  const nextStatus: MasteryPath["status"] =
    result.status === "mastery_verified"
      ? "verified"
      : result.status === "emerging_mastery"
        ? "emerging"
        : result.status === "insufficient_evidence"
          ? "insufficient_evidence"
          : result.status === "inconsistent"
            ? "inconsistent"
            : result.status === "suspicious"
              ? "suspicious"
              : "failed";

  const next: MasteryPath = {
    ...path,
    status: nextStatus,
    completedAt:
      result.status === "mastery_verified" ? nowIso() : path.completedAt,
    updatedAt: nowIso()
  };

  store.paths.set(next.masteryPathId, next);
  store.verificationResults.set(result.masteryPathId, result);

  return result;
}

export function getMasteryVerificationResult(
  masteryPathId: string
): MasteryVerificationResult | null {
  return store.verificationResults.get(masteryPathId) ?? null;
}

export function resetMasterySessionStoreForTests(): void {
  store.paths.clear();
  store.verificationResults.clear();
}
