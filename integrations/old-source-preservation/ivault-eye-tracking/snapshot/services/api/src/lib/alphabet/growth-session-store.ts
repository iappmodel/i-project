import type {
  GrowthDomain,
  GrowthSession,
  GrowthSignalInput,
  GrowthVerificationResult
} from "../../types/alphabet/growth.types";
import { verifyGrowthSession } from "./growth-engine";

type GrowthSessionStoreState = {
  sessions: Map<string, GrowthSession>;
  verificationResults: Map<string, GrowthVerificationResult>;
};

const store: GrowthSessionStoreState = {
  sessions: new Map(),
  verificationResults: new Map()
};

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function startGrowthSession(params: {
  userId: string;
  domain: GrowthDomain;
  baselineScore: number;
  difficultyLevel: number;
  ageBand: string;
  objectType?: string | null;
  objectId?: string | null;
}): GrowthSession {
  if (params.baselineScore < 0 || params.baselineScore > 1) {
    throw new Error("baselineScore must be between 0 and 1.");
  }

  if (params.difficultyLevel < 1 || params.difficultyLevel > 10) {
    throw new Error("difficultyLevel must be between 1 and 10.");
  }

  const now = nowIso();

  const session: GrowthSession = {
    growthSessionId: createId("growth_session"),
    userId: params.userId,
    domain: params.domain,
    objectType: params.objectType ?? null,
    objectId: params.objectId ?? null,
    baselineScore: params.baselineScore,
    afterScore: null,
    practiceCount: 0,
    practiceDurationMs: 0,
    difficultyLevel: params.difficultyLevel,
    status: "baseline_recorded",
    ageBand: params.ageBand,
    startedAt: now,
    updatedAt: now,
    completedAt: null
  };

  store.sessions.set(session.growthSessionId, session);

  return session;
}

export function getGrowthSession(
  growthSessionId: string
): GrowthSession | null {
  return store.sessions.get(growthSessionId) ?? null;
}

export function recordGrowthPractice(params: {
  growthSessionId: string;
  practiceCountDelta: number;
  practiceDurationMsDelta: number;
}): GrowthSession {
  const session = getGrowthSession(params.growthSessionId);

  if (!session) {
    throw new Error("Growth session not found.");
  }

  if (params.practiceCountDelta < 0 || params.practiceDurationMsDelta < 0) {
    throw new Error("Practice deltas cannot be negative.");
  }

  const next: GrowthSession = {
    ...session,
    practiceCount: session.practiceCount + params.practiceCountDelta,
    practiceDurationMs:
      session.practiceDurationMs + params.practiceDurationMsDelta,
    status: "practice_recorded",
    updatedAt: nowIso()
  };

  store.sessions.set(next.growthSessionId, next);

  return next;
}

export function recordGrowthAfterScore(params: {
  growthSessionId: string;
  afterScore: number;
}): GrowthSession {
  const session = getGrowthSession(params.growthSessionId);

  if (!session) {
    throw new Error("Growth session not found.");
  }

  if (params.afterScore < 0 || params.afterScore > 1) {
    throw new Error("afterScore must be between 0 and 1.");
  }

  const next: GrowthSession = {
    ...session,
    afterScore: params.afterScore,
    status: "after_score_recorded",
    completedAt: nowIso(),
    updatedAt: nowIso()
  };

  store.sessions.set(next.growthSessionId, next);

  return next;
}

export function verifyStoredGrowthSession(
  input: Omit<
    GrowthSignalInput,
    | "growthSessionId"
    | "userId"
    | "domain"
    | "baselineScore"
    | "afterScore"
    | "practiceCount"
    | "practiceDurationMs"
    | "difficultyLevel"
    | "ageBand"
  > & {
    growthSessionId: string;
  }
): GrowthVerificationResult {
  const session = getGrowthSession(input.growthSessionId);

  if (!session) {
    throw new Error("Growth session not found.");
  }

  if (session.afterScore === null || session.afterScore === undefined) {
    throw new Error("Cannot verify growth before afterScore is recorded.");
  }

  const result = verifyGrowthSession({
    ...input,
    growthSessionId: session.growthSessionId,
    userId: session.userId,
    domain: session.domain,
    baselineScore: session.baselineScore,
    afterScore: session.afterScore,
    practiceCount: session.practiceCount,
    practiceDurationMs: session.practiceDurationMs,
    difficultyLevel: session.difficultyLevel,
    ageBand: session.ageBand,
    metadata: {
      ...input.metadata,
      objectType: session.objectType,
      objectId: session.objectId
    }
  });

  const nextStatus: GrowthSession["status"] =
    result.status === "growth_verified"
      ? "verified"
      : result.status === "small_growth"
        ? "small_growth"
        : result.status === "no_growth"
          ? "no_growth"
          : result.status === "regression"
            ? "regression"
            : result.status === "suspicious"
              ? "suspicious"
              : "expired";

  const next: GrowthSession = {
    ...session,
    status: nextStatus,
    updatedAt: nowIso()
  };

  store.sessions.set(next.growthSessionId, next);
  store.verificationResults.set(result.growthSessionId, result);

  return result;
}

export function getGrowthVerificationResult(
  growthSessionId: string
): GrowthVerificationResult | null {
  return store.verificationResults.get(growthSessionId) ?? null;
}

export function resetGrowthSessionStoreForTests(): void {
  store.sessions.clear();
  store.verificationResults.clear();
}
