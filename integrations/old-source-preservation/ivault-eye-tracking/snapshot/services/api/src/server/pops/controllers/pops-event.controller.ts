import { POPS_RECOMMENDED_ACTION } from "../../../pops/types/pops-decisions.types";
import { POPS_SESSION_STATE } from "../../../pops/types/pops.types";
import { PopsEventRepository } from "../repositories/pops-event.repository";
import { PopsSessionRepository } from "../repositories/pops-session.repository";

const MAX_EVENT_PAYLOAD_SIZE = 8 * 1024;
const CLIENT_SERVER_DRIFT_TOLERANCE_MS = 10 * 60 * 1000;
const LATE_ARRIVAL_WINDOW_MS = 60_000;

function jsonSizeBytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

function toNumberSafe(input: unknown, fallback = 0): number {
  const value = Number(input);
  return Number.isFinite(value) ? value : fallback;
}

export class PopsEventController {
  constructor(
    private readonly sessions = new PopsSessionRepository(),
    private readonly events = new PopsEventRepository()
  ) {}

  private isSessionFinal(state: string): boolean {
    return [POPS_SESSION_STATE.COMPLETED, POPS_SESSION_STATE.CLOSED].includes(state as any);
  }

  private async getOwnedSession(sessionId: string, userId: string) {
    const session = await this.sessions.getSessionForUser(sessionId, userId);
    if (!session) throw new Error("session not found");
    return session;
  }

  async ingestEvents(
    sessionId: string,
    userId: string,
    body: { events: Array<{ eventId: string; eventType: string; source: string; clientTimestampMs: number; payload: Record<string, unknown>; privacyFlags: Record<string, unknown> }> }
  ) {
    const session = await this.getOwnedSession(sessionId, userId);
    const now = Date.now();
    const finalizedAt = toNumberSafe((session.metadata ?? {}).finalizedAt ? Date.parse(String((session.metadata ?? {}).finalizedAt)) : 0);
    const lateWindowUntil = finalizedAt ? finalizedAt + LATE_ARRIVAL_WINDOW_MS : 0;

    let accepted = 0;
    let rejected = 0;
    const rejectedItems: Array<{ eventId: string; reason: string }> = [];

    for (const item of body.events) {
      const drift = Math.abs(now - item.clientTimestampMs);
      if (drift > CLIENT_SERVER_DRIFT_TOLERANCE_MS) {
        rejected += 1;
        rejectedItems.push({ eventId: item.eventId, reason: "timestamp_drift_too_large" });
        continue;
      }

      if (jsonSizeBytes(item.payload) > MAX_EVENT_PAYLOAD_SIZE) {
        rejected += 1;
        rejectedItems.push({ eventId: item.eventId, reason: "payload_too_large" });
        continue;
      }

      if (this.isSessionFinal(session.state) && (!lateWindowUntil || now > lateWindowUntil)) {
        rejected += 1;
        rejectedItems.push({ eventId: item.eventId, reason: "session_closed_late_window_expired" });
        continue;
      }

      const duplicate = await this.events.hasEventId(sessionId, item.eventId);
      if (duplicate) {
        rejected += 1;
        rejectedItems.push({ eventId: item.eventId, reason: "duplicate_event_id" });
        continue;
      }

      const isLateArrival = this.isSessionFinal(session.state);
      await this.events.insertEvent({
        session_id: sessionId,
        user_id: userId,
        event_type: item.eventType,
        signal_source: item.source,
        timestamp_ms: item.clientTimestampMs,
        payload: {
          ...item.payload,
          eventId: item.eventId,
          privacyFlags: item.privacyFlags,
          late_arrival: isLateArrival
        }
      });

      accepted += 1;
    }

    await this.sessions.updateSession(sessionId, {
      metadata: {
        ...(session.metadata ?? {}),
        lastEventIngestAt: new Date().toISOString(),
        totalAcceptedEvents: toNumberSafe((session.metadata ?? {}).totalAcceptedEvents) + accepted,
        totalRejectedEvents: toNumberSafe((session.metadata ?? {}).totalRejectedEvents) + rejected
      }
    });

    return {
      acceptedCount: accepted,
      rejectedCount: rejected,
      rejectedItems
    };
  }

  async ingestSignalBatch(
    sessionId: string,
    userId: string,
    body: {
      batchId: string;
      clientTimestampMs: number;
      windowStartMs: number;
      windowEndMs: number;
      signals: Record<string, number>;
      privacy: Record<string, unknown>;
    }
  ) {
    const session = await this.getOwnedSession(sessionId, userId);
    const duplicate = await this.events.hasBatchId(sessionId, body.batchId);
    if (duplicate) {
      return {
        accepted: false,
        reason: "duplicate_batch_id",
        previewJudgment: session.metadata?.preview ?? null
      };
    }

    if (body.windowEndMs < body.windowStartMs) {
      return {
        accepted: false,
        reason: "invalid_window_range",
        previewJudgment: session.metadata?.preview ?? null
      };
    }

    const impossibleData =
      body.signals.contentProgressDeltaPct > 100 ||
      body.signals.screenActiveRatio > 1 ||
      body.signals.appForegroundRatio > 1 ||
      body.signals.locationClassConfidence > 1;
    if (impossibleData) {
      return {
        accepted: false,
        reason: "impossible_signal_data",
        previewJudgment: session.metadata?.preview ?? null
      };
    }

    await this.events.insertSignalBatch({
      session_id: sessionId,
      user_id: userId,
      timestamp_ms: body.clientTimestampMs,
      signals: {
        ...body.signals,
        __batchId: body.batchId,
        __windowStartMs: body.windowStartMs,
        __windowEndMs: body.windowEndMs
      },
      privacy: body.privacy
    });

    const preview = {
      sessionState: session.state,
      presenceConfidence: body.signals.visualPresenceScore,
      attentionConfidence: body.signals.screenActiveRatio,
      intentConfidence: Math.min(1, body.signals.contentProgressDeltaPct / 100),
      continuityConfidence: body.signals.accountContinuityScore,
      fraudRisk: 1 - body.signals.deviceIntegrityScore,
      rewardProgressPct: Math.round(Math.min(1, body.signals.contentProgressDeltaPct / 100) * 100),
      recommendedAction:
        body.signals.deviceIntegrityScore < 0.5
          ? POPS_RECOMMENDED_ACTION.HOLD_REWARD
          : POPS_RECOMMENDED_ACTION.CONTINUE_TRACKING,
      reasonCodes: body.signals.deviceIntegrityScore < 0.5 ? ["device_integrity_low"] : ["tracking_healthy"],
      userVisibleStatus:
        body.signals.deviceIntegrityScore < 0.5
          ? "Verification quality degraded. Keep device steady."
          : "Verification in progress."
    };

    await this.sessions.updateSession(sessionId, {
      metadata: {
        ...(session.metadata ?? {}),
        preview,
        lastSignalBatchAt: new Date().toISOString(),
        timestampDeltaMs: Date.now() - body.clientTimestampMs
      }
    });

    return {
      accepted: true,
      previewJudgment: preview
    };
  }

  async checkpoint(sessionId: string, userId: string) {
    const session = await this.getOwnedSession(sessionId, userId);
    const preview = (session.metadata?.preview ?? {}) as Record<string, unknown>;
    return {
      sessionState: session.state,
      presenceConfidence: toNumberSafe(preview.presenceConfidence),
      attentionConfidence: toNumberSafe(preview.attentionConfidence),
      intentConfidence: toNumberSafe(preview.intentConfidence),
      continuityConfidence: toNumberSafe(preview.continuityConfidence),
      fraudRisk: toNumberSafe(preview.fraudRisk),
      rewardProgressPct: toNumberSafe(preview.rewardProgressPct),
      recommendedAction: preview.recommendedAction ?? POPS_RECOMMENDED_ACTION.CONTINUE_TRACKING,
      reasonCodes: (preview.reasonCodes as string[]) ?? [],
      userVisibleStatus: preview.userVisibleStatus ?? "Verification active."
    };
  }
}
