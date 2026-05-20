import type {
  FocusSession,
  FocusSessionPurpose,
  FocusSignalInput,
  FocusVerificationResult
} from "../../types/alphabet/focus.types";
import { verifyFocusSession } from "./focus-engine";

type FocusSessionStoreState = {
  sessions: Map<string, FocusSession>;
  verificationResults: Map<string, FocusVerificationResult>;
};

const store: FocusSessionStoreState = {
  sessions: new Map(),
  verificationResults: new Map()
};

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function startFocusSession(params: {
  userId: string;
  purpose: FocusSessionPurpose;
  intendedDurationMs: number;
  ageBand: string;
  objectType?: string | null;
  objectId?: string | null;
}): FocusSession {
  if (params.intendedDurationMs <= 0) {
    throw new Error("intendedDurationMs must be greater than zero.");
  }

  const now = nowIso();
  const session: FocusSession = {
    focusSessionId: createId("focus_session"),
    userId: params.userId,
    purpose: params.purpose,
    objectType: params.objectType ?? null,
    objectId: params.objectId ?? null,
    intendedDurationMs: params.intendedDurationMs,
    focusedDurationMs: 0,
    status: "started",
    ageBand: params.ageBand,
    startedAt: now,
    completedAt: null,
    updatedAt: now
  };

  store.sessions.set(session.focusSessionId, session);
  return session;
}

export function getFocusSession(focusSessionId: string): FocusSession | null {
  return store.sessions.get(focusSessionId) ?? null;
}

export function updateFocusSessionProgress(params: {
  focusSessionId: string;
  focusedDurationMs: number;
}): FocusSession {
  const session = getFocusSession(params.focusSessionId);
  if (!session) throw new Error("Focus session not found.");

  if (params.focusedDurationMs < session.focusedDurationMs) {
    throw new Error("focusedDurationMs cannot move backwards.");
  }

  const next: FocusSession = {
    ...session,
    focusedDurationMs: params.focusedDurationMs,
    updatedAt: nowIso()
  };

  store.sessions.set(next.focusSessionId, next);
  return next;
}

export function completeFocusSession(focusSessionId: string): FocusSession {
  const session = getFocusSession(focusSessionId);
  if (!session) throw new Error("Focus session not found.");

  const completedAt = nowIso();
  const next: FocusSession = {
    ...session,
    status: "completed",
    completedAt,
    updatedAt: completedAt
  };

  store.sessions.set(next.focusSessionId, next);
  return next;
}

export function verifyStoredFocusSession(
  input: Omit<
    FocusSignalInput,
    | "focusSessionId"
    | "userId"
    | "purpose"
    | "focusedDurationMs"
    | "intendedDurationMs"
    | "ageBand"
  > & {
    focusSessionId: string;
  }
): FocusVerificationResult {
  const session = getFocusSession(input.focusSessionId);
  if (!session) throw new Error("Focus session not found.");

  const result = verifyFocusSession({
    ...input,
    focusSessionId: session.focusSessionId,
    userId: session.userId,
    purpose: session.purpose,
    focusedDurationMs: session.focusedDurationMs,
    intendedDurationMs: session.intendedDurationMs,
    ageBand: session.ageBand,
    metadata: {
      ...input.metadata,
      objectType: session.objectType,
      objectId: session.objectId
    }
  });

  const nextSession: FocusSession = {
    ...session,
    status:
      result.status === "verified"
        ? "verified"
        : result.status === "weak"
          ? "weak"
          : result.status === "distracted"
            ? "distracted"
            : result.status === "suspicious"
              ? "suspicious"
              : "completed",
    updatedAt: nowIso()
  };

  store.sessions.set(nextSession.focusSessionId, nextSession);
  store.verificationResults.set(result.focusSessionId, result);

  return result;
}

export function getFocusVerificationResult(focusSessionId: string): FocusVerificationResult | null {
  return store.verificationResults.get(focusSessionId) ?? null;
}

export function resetFocusSessionStoreForTests(): void {
  store.sessions.clear();
  store.verificationResults.clear();
}
