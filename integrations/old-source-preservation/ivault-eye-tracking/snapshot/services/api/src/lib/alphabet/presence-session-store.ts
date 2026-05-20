import type {
  LocalOffer,
  PresenceContext,
  PresenceSession,
  PresenceSignalInput,
  PresenceVerificationResult
} from "../../types/alphabet/presence.types";
import { verifyPresenceSession } from "./presence-engine";

type PresenceStoreState = {
  offers: Map<string, LocalOffer>;
  sessions: Map<string, PresenceSession>;
  verificationResults: Map<string, PresenceVerificationResult>;
};

const store: PresenceStoreState = {
  offers: new Map(),
  sessions: new Map(),
  verificationResults: new Map()
};

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createLocalOffer(params: {
  businessId: string;
  locationId: string;
  title: string;
  description?: string | null;
  context: PresenceContext;
  rewardCoin: "P" | "I" | "A" | "E" | "V";
  expectedRewardAmount: number;
  requiresPurchaseProof: boolean;
  requiresQrProof: boolean;
  requiresNfcProof: boolean;
  requiresBluetoothProof: boolean;
  minAgeBand?: string | null;
  guardianRequiredForMinors: boolean;
}): LocalOffer {
  if (params.expectedRewardAmount < 0) {
    throw new Error("expectedRewardAmount cannot be negative.");
  }

  const now = nowIso();
  const offer: LocalOffer = {
    offerId: createId("local_offer"),
    businessId: params.businessId,
    locationId: params.locationId,
    title: params.title,
    description: params.description ?? null,
    context: params.context,
    rewardCoin: params.rewardCoin,
    expectedRewardAmount: params.expectedRewardAmount,
    requiresPurchaseProof: params.requiresPurchaseProof,
    requiresQrProof: params.requiresQrProof,
    requiresNfcProof: params.requiresNfcProof,
    requiresBluetoothProof: params.requiresBluetoothProof,
    minAgeBand: params.minAgeBand ?? null,
    guardianRequiredForMinors: params.guardianRequiredForMinors,
    active: true,
    createdAt: now,
    updatedAt: now
  };

  store.offers.set(offer.offerId, offer);
  return offer;
}

export function getLocalOffer(offerId: string): LocalOffer | null {
  return store.offers.get(offerId) ?? null;
}

export function startPresenceSession(params: {
  userId: string;
  context: PresenceContext;
  requiredDwellMs: number;
  ageBand: string;
  offerId?: string | null;
  businessId?: string | null;
  locationId?: string | null;
}): PresenceSession {
  if (params.requiredDwellMs <= 0) {
    throw new Error("requiredDwellMs must be greater than zero.");
  }

  const offer = params.offerId ? getLocalOffer(params.offerId) : null;
  if (params.offerId && !offer) {
    throw new Error("Local offer not found.");
  }
  if (offer && !offer.active) {
    throw new Error("Local offer is inactive.");
  }

  const now = nowIso();
  const session: PresenceSession = {
    presenceSessionId: createId("presence_session"),
    userId: params.userId,
    context: offer?.context ?? params.context,
    offerId: params.offerId ?? null,
    businessId: offer?.businessId ?? params.businessId ?? null,
    locationId: offer?.locationId ?? params.locationId ?? null,
    requiredDwellMs: params.requiredDwellMs,
    dwellMs: 0,
    status: "started",
    ageBand: params.ageBand,
    startedAt: now,
    arrivedAt: null,
    completedAt: null,
    updatedAt: now
  };

  store.sessions.set(session.presenceSessionId, session);
  return session;
}

export function getPresenceSession(presenceSessionId: string): PresenceSession | null {
  return store.sessions.get(presenceSessionId) ?? null;
}

export function markPresenceArrived(presenceSessionId: string): PresenceSession {
  const session = getPresenceSession(presenceSessionId);
  if (!session) {
    throw new Error("Presence session not found.");
  }

  const now = nowIso();
  const next: PresenceSession = {
    ...session,
    status: "arrived",
    arrivedAt: now,
    updatedAt: now
  };

  store.sessions.set(next.presenceSessionId, next);
  return next;
}

export function updatePresenceDwell(params: {
  presenceSessionId: string;
  dwellMs: number;
}): PresenceSession {
  const session = getPresenceSession(params.presenceSessionId);
  if (!session) {
    throw new Error("Presence session not found.");
  }
  if (params.dwellMs < session.dwellMs) {
    throw new Error("dwellMs cannot move backwards.");
  }

  const next: PresenceSession = {
    ...session,
    dwellMs: params.dwellMs,
    updatedAt: nowIso()
  };

  store.sessions.set(next.presenceSessionId, next);
  return next;
}

export function completePresenceSession(presenceSessionId: string): PresenceSession {
  const session = getPresenceSession(presenceSessionId);
  if (!session) {
    throw new Error("Presence session not found.");
  }

  const now = nowIso();
  const next: PresenceSession = {
    ...session,
    status: "completed",
    completedAt: now,
    updatedAt: now
  };

  store.sessions.set(next.presenceSessionId, next);
  return next;
}

export function verifyStoredPresenceSession(
  input: Omit<
    PresenceSignalInput,
    | "presenceSessionId"
    | "userId"
    | "context"
    | "offerId"
    | "businessId"
    | "locationId"
    | "requiredDwellMs"
    | "dwellMs"
    | "ageBand"
  > & {
    presenceSessionId: string;
  }
): PresenceVerificationResult {
  const session = getPresenceSession(input.presenceSessionId);
  if (!session) {
    throw new Error("Presence session not found.");
  }

  const result = verifyPresenceSession({
    ...input,
    presenceSessionId: session.presenceSessionId,
    userId: session.userId,
    context: session.context,
    offerId: session.offerId,
    businessId: session.businessId,
    locationId: session.locationId,
    requiredDwellMs: session.requiredDwellMs,
    dwellMs: session.dwellMs,
    ageBand: session.ageBand,
    metadata: {
      ...input.metadata
    }
  });

  const nextStatus: PresenceSession["status"] =
    result.status === "local_action_verified"
      ? "local_action_verified"
      : result.status === "presence_verified"
        ? "verified"
        : result.status === "completed_needs_review"
          ? "needs_review"
          : result.status === "incomplete"
            ? "incomplete"
            : result.status === "suspicious"
              ? "suspicious"
              : "rejected";

  const next: PresenceSession = {
    ...session,
    status: nextStatus,
    updatedAt: nowIso()
  };

  store.sessions.set(next.presenceSessionId, next);
  store.verificationResults.set(result.presenceSessionId, result);
  return result;
}

export function getPresenceVerificationResult(
  presenceSessionId: string
): PresenceVerificationResult | null {
  return store.verificationResults.get(presenceSessionId) ?? null;
}

export function resetPresenceStoreForTests(): void {
  store.offers.clear();
  store.sessions.clear();
  store.verificationResults.clear();
}
