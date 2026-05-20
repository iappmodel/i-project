import type {
  HelpContext,
  HelpSession,
  HelpSignalInput,
  HelpVerificationResult
} from "../../types/alphabet/help.types";
import { verifyHelpSession } from "./help-engine";

type HelpSessionStoreState = {
  sessions: Map<string, HelpSession>;
  verificationResults: Map<string, HelpVerificationResult>;
};

const store: HelpSessionStoreState = {
  sessions: new Map(),
  verificationResults: new Map()
};

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function startHelpSession(params: {
  helperUserId: string;
  recipientUserId: string;
  context: HelpContext;
  helperAgeBand: string;
  recipientAgeBand: string;
  objectType?: string | null;
  objectId?: string | null;
}): HelpSession {
  if (params.helperUserId === params.recipientUserId) {
    throw new Error("helperUserId and recipientUserId cannot be the same.");
  }

  const now = nowIso();

  const session: HelpSession = {
    helpSessionId: createId("help_session"),
    helperUserId: params.helperUserId,
    recipientUserId: params.recipientUserId,
    context: params.context,
    objectType: params.objectType ?? null,
    objectId: params.objectId ?? null,
    durationMs: 0,
    status: "started",
    helperAgeBand: params.helperAgeBand,
    recipientAgeBand: params.recipientAgeBand,
    startedAt: now,
    completedAt: null,
    updatedAt: now
  };

  store.sessions.set(session.helpSessionId, session);

  return session;
}

export function getHelpSession(helpSessionId: string): HelpSession | null {
  return store.sessions.get(helpSessionId) ?? null;
}

export function updateHelpSessionDuration(params: {
  helpSessionId: string;
  durationMs: number;
}): HelpSession {
  const session = getHelpSession(params.helpSessionId);

  if (!session) {
    throw new Error("Help session not found.");
  }

  if (params.durationMs < session.durationMs) {
    throw new Error("durationMs cannot move backwards.");
  }

  const next: HelpSession = {
    ...session,
    durationMs: params.durationMs,
    updatedAt: nowIso()
  };

  store.sessions.set(next.helpSessionId, next);

  return next;
}

export function completeHelpSession(helpSessionId: string): HelpSession {
  const session = getHelpSession(helpSessionId);

  if (!session) {
    throw new Error("Help session not found.");
  }

  const completedAt = nowIso();
  const next: HelpSession = {
    ...session,
    status: "completed",
    completedAt,
    updatedAt: completedAt
  };

  store.sessions.set(next.helpSessionId, next);

  return next;
}

export function verifyStoredHelpSession(
  input: Omit<
    HelpSignalInput,
    | "helpSessionId"
    | "helperUserId"
    | "recipientUserId"
    | "context"
    | "durationMs"
    | "helperAgeBand"
    | "recipientAgeBand"
  > & {
    helpSessionId: string;
  }
): HelpVerificationResult {
  const session = getHelpSession(input.helpSessionId);

  if (!session) {
    throw new Error("Help session not found.");
  }

  const result = verifyHelpSession({
    ...input,
    helpSessionId: session.helpSessionId,
    helperUserId: session.helperUserId,
    recipientUserId: session.recipientUserId,
    context: session.context,
    durationMs: session.durationMs,
    helperAgeBand: session.helperAgeBand,
    recipientAgeBand: session.recipientAgeBand,
    metadata: {
      ...input.metadata,
      objectType: session.objectType,
      objectId: session.objectId
    }
  });

  const nextStatus: HelpSession["status"] =
    result.status === "noble_action_verified"
      ? "noble"
      : result.status === "help_verified"
        ? "verified"
        : result.status === "useful_but_unverified"
          ? "useful_but_unverified"
          : result.status === "needs_review"
            ? "needs_review"
            : result.status === "suspicious"
              ? "suspicious"
              : "rejected";

  const next: HelpSession = {
    ...session,
    status: nextStatus,
    updatedAt: nowIso()
  };

  store.sessions.set(next.helpSessionId, next);
  store.verificationResults.set(result.helpSessionId, result);

  return result;
}

export function getHelpVerificationResult(helpSessionId: string): HelpVerificationResult | null {
  return store.verificationResults.get(helpSessionId) ?? null;
}

export function resetHelpSessionStoreForTests(): void {
  store.sessions.clear();
  store.verificationResults.clear();
}
