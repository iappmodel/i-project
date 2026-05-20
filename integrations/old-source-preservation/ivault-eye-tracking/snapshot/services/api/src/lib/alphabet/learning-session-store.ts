import type {
  LearningSession,
  LearningSessionContext,
  LearningSignalInput,
  LearningVerificationResult
} from "../../types/alphabet/learning.types";
import { verifyLearningSession } from "./learning-engine";

type LearningSessionStoreState = {
  sessions: Map<string, LearningSession>;
  verificationResults: Map<string, LearningVerificationResult>;
};

const store: LearningSessionStoreState = {
  sessions: new Map(),
  verificationResults: new Map()
};

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function startLearningSession(params: {
  userId: string;
  context: LearningSessionContext;
  lessonId: string;
  requiredDurationMs: number;
  ageBand: string;
  courseId?: string | null;
  creatorId?: string | null;
  schoolId?: string | null;
}): LearningSession {
  if (params.requiredDurationMs <= 0) {
    throw new Error("requiredDurationMs must be greater than zero.");
  }

  const now = nowIso();
  const session: LearningSession = {
    learningSessionId: createId("learning_session"),
    userId: params.userId,
    context: params.context,
    lessonId: params.lessonId,
    courseId: params.courseId ?? null,
    creatorId: params.creatorId ?? null,
    schoolId: params.schoolId ?? null,
    requiredDurationMs: params.requiredDurationMs,
    watchedDurationMs: 0,
    status: "started",
    ageBand: params.ageBand,
    startedAt: now,
    completedAt: null,
    updatedAt: now
  };

  store.sessions.set(session.learningSessionId, session);
  return session;
}

export function getLearningSession(learningSessionId: string): LearningSession | null {
  return store.sessions.get(learningSessionId) ?? null;
}

export function updateLearningSessionProgress(params: {
  learningSessionId: string;
  watchedDurationMs: number;
}): LearningSession {
  const session = getLearningSession(params.learningSessionId);
  if (!session) throw new Error("Learning session not found.");

  if (params.watchedDurationMs < session.watchedDurationMs) {
    throw new Error("watchedDurationMs cannot move backwards.");
  }

  const next: LearningSession = {
    ...session,
    watchedDurationMs: params.watchedDurationMs,
    updatedAt: nowIso()
  };

  store.sessions.set(next.learningSessionId, next);
  return next;
}

export function completeLearningSession(learningSessionId: string): LearningSession {
  const session = getLearningSession(learningSessionId);
  if (!session) throw new Error("Learning session not found.");

  const completedAt = nowIso();
  const next: LearningSession = {
    ...session,
    status: "lesson_completed",
    completedAt,
    updatedAt: completedAt
  };

  store.sessions.set(next.learningSessionId, next);
  return next;
}

export function verifyStoredLearningSession(
  input: Omit<
    LearningSignalInput,
    | "learningSessionId"
    | "userId"
    | "context"
    | "requiredDurationMs"
    | "watchedDurationMs"
    | "ageBand"
  > & {
    learningSessionId: string;
  }
): LearningVerificationResult {
  const session = getLearningSession(input.learningSessionId);
  if (!session) throw new Error("Learning session not found.");

  const result = verifyLearningSession({
    ...input,
    learningSessionId: session.learningSessionId,
    userId: session.userId,
    context: session.context,
    requiredDurationMs: session.requiredDurationMs,
    watchedDurationMs: session.watchedDurationMs,
    ageBand: session.ageBand,
    metadata: {
      ...input.metadata,
      lessonId: session.lessonId,
      courseId: session.courseId,
      creatorId: session.creatorId,
      schoolId: session.schoolId
    }
  });

  const nextStatus: LearningSession["status"] =
    result.status === "knowledge_verified"
      ? "knowledge_verified"
      : result.status === "learned"
        ? "verified"
        : result.status === "partially_learned"
          ? "partially_verified"
          : result.status === "suspicious"
            ? "suspicious"
            : result.status === "failed"
              ? "failed"
              : "lesson_completed";

  const next: LearningSession = {
    ...session,
    status: nextStatus,
    updatedAt: nowIso()
  };

  store.sessions.set(next.learningSessionId, next);
  store.verificationResults.set(result.learningSessionId, result);

  return result;
}

export function getLearningVerificationResult(
  learningSessionId: string
): LearningVerificationResult | null {
  return store.verificationResults.get(learningSessionId) ?? null;
}

export function resetLearningSessionStoreForTests(): void {
  store.sessions.clear();
  store.verificationResults.clear();
}
