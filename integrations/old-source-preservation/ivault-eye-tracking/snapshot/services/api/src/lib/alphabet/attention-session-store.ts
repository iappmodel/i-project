import type {
  AttentionSession,
  AttentionSessionContext,
  AttentionSignalInput,
  AttentionVerificationResult
} from "../../types/alphabet/attention.types";
import { verifyAttentionSession } from "./attention-verification-engine";

type AttentionSessionStoreState = {
  sessions: Map<string, AttentionSession>;
  verificationResults: Map<string, AttentionVerificationResult>;
};

const store: AttentionSessionStoreState = {
  sessions: new Map(),
  verificationResults: new Map()
};

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function startAttentionSession(params: {
  userId: string;
  context: AttentionSessionContext;
  objectType: string;
  objectId: string;
  requiredDurationMs: number;
  ageBand: string;
  campaignId?: string | null;
  creatorId?: string | null;
}): AttentionSession {
  if (params.requiredDurationMs <= 0) {
    throw new Error("requiredDurationMs must be greater than zero.");
  }

  const now = nowIso();

  const session: AttentionSession = {
    attentionSessionId: createId("attention_session"),
    userId: params.userId,
    context: params.context,
    objectType: params.objectType,
    objectId: params.objectId,
    campaignId: params.campaignId ?? null,
    creatorId: params.creatorId ?? null,
    requiredDurationMs: params.requiredDurationMs,
    watchedDurationMs: 0,
    status: "started",
    ageBand: params.ageBand,
    startedAt: now,
    completedAt: null,
    updatedAt: now
  };

  store.sessions.set(session.attentionSessionId, session);

  return session;
}

export function getAttentionSession(
  attentionSessionId: string
): AttentionSession | null {
  return store.sessions.get(attentionSessionId) ?? null;
}

export function updateAttentionSessionProgress(params: {
  attentionSessionId: string;
  watchedDurationMs: number;
}): AttentionSession {
  const session = getAttentionSession(params.attentionSessionId);

  if (!session) {
    throw new Error("Attention session not found.");
  }

  if (params.watchedDurationMs < session.watchedDurationMs) {
    throw new Error("watchedDurationMs cannot move backwards.");
  }

  const next: AttentionSession = {
    ...session,
    watchedDurationMs: params.watchedDurationMs,
    updatedAt: nowIso()
  };

  store.sessions.set(next.attentionSessionId, next);

  return next;
}

export function completeAttentionSession(
  attentionSessionId: string
): AttentionSession {
  const session = getAttentionSession(attentionSessionId);

  if (!session) {
    throw new Error("Attention session not found.");
  }

  const now = nowIso();

  const next: AttentionSession = {
    ...session,
    status: "completed",
    completedAt: now,
    updatedAt: now
  };

  store.sessions.set(next.attentionSessionId, next);

  return next;
}

export function verifyStoredAttentionSession(
  input: Omit<
    AttentionSignalInput,
    | "attentionSessionId"
    | "userId"
    | "watchedDurationMs"
    | "requiredDurationMs"
    | "ageBand"
    | "context"
  > & {
    attentionSessionId: string;
  }
): AttentionVerificationResult {
  const session = getAttentionSession(input.attentionSessionId);

  if (!session) {
    throw new Error("Attention session not found.");
  }

  const result = verifyAttentionSession({
    ...input,
    attentionSessionId: session.attentionSessionId,
    userId: session.userId,
    watchedDurationMs: session.watchedDurationMs,
    requiredDurationMs: session.requiredDurationMs,
    ageBand: session.ageBand,
    context: session.context,
    metadata: {
      ...input.metadata,
      campaignId: session.campaignId,
      creatorId: session.creatorId,
      objectType: session.objectType,
      objectId: session.objectId
    }
  });

  const nextSession: AttentionSession = {
    ...session,
    status:
      result.status === "verified"
        ? "verified"
        : result.status === "suspicious"
          ? "suspicious"
          : result.status === "incomplete"
            ? "completed"
            : "rejected",
    updatedAt: nowIso()
  };

  store.sessions.set(nextSession.attentionSessionId, nextSession);
  store.verificationResults.set(result.attentionSessionId, result);

  return result;
}

export function getAttentionVerificationResult(
  attentionSessionId: string
): AttentionVerificationResult | null {
  return store.verificationResults.get(attentionSessionId) ?? null;
}

export function resetAttentionSessionStoreForTests(): void {
  store.sessions.clear();
  store.verificationResults.clear();
}
