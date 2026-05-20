import {
  POPS_PROOF_LEVEL,
  POPS_SESSION_STATE,
  type PopsProofLevel,
  type PopsSession,
  type PopsSessionState,
  type PopsSessionType
} from "../types/pops.types";
import { POPS_PROOF_THRESHOLDS } from "../constants/pops.constants";
import { canTransitionPopsSessionState } from "../state/pops-state-machine";

function nowIso(): string {
  return new Date().toISOString();
}

function sessionId(): string {
  return `pops_session_${crypto.randomUUID()}`;
}

export interface CreatePopsSessionInput {
  userId: string;
  deviceId: string;
  sessionType: PopsSessionType;
  proofLevel: PopsProofLevel;
  contentId?: string | null;
  campaignId?: string | null;
  requiredDurationMs?: number;
  metadata?: Record<string, unknown>;
}

export class PopsSessionService {
  createSession(input: CreatePopsSessionInput): PopsSession {
    const thresholds =
      POPS_PROOF_THRESHOLDS[input.proofLevel] ?? POPS_PROOF_THRESHOLDS[POPS_PROOF_LEVEL.LEVEL_1_SESSION];

    return {
      id: sessionId(),
      userId: input.userId,
      deviceId: input.deviceId,
      contentId: input.contentId ?? null,
      campaignId: input.campaignId ?? null,
      sessionType: input.sessionType,
      proofLevel: input.proofLevel,
      state: POPS_SESSION_STATE.NOT_STARTED,
      startedAt: nowIso(),
      endedAt: null,
      requiredDurationMs: input.requiredDurationMs ?? 0,
      minimumPresenceConfidence: thresholds.minimumPresence,
      minimumAttentionConfidence: thresholds.minimumAttention,
      minimumIntentConfidence: thresholds.minimumIntent,
      maximumFraudRisk: thresholds.maximumFraudRisk,
      metadata: input.metadata ?? {}
    };
  }

  transitionState(session: PopsSession, nextState: PopsSessionState): PopsSession {
    if (!canTransitionPopsSessionState(session.state, nextState)) {
      throw new Error(`Invalid P.O.P.S state transition: ${session.state} -> ${nextState}`);
    }

    return {
      ...session,
      state: nextState
    };
  }

  closeSession(session: PopsSession): PopsSession {
    const closedState = session.state === POPS_SESSION_STATE.CLOSED ? session.state : POPS_SESSION_STATE.CLOSED;

    return {
      ...session,
      state: closedState,
      endedAt: session.endedAt ?? nowIso()
    };
  }
}
