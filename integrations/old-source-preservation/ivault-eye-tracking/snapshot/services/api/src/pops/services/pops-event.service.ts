import {
  POPS_EVENT_TYPE,
  type PopsBatchDerivedEvents,
  type PopsEvent,
  type PopsEventServiceInput
} from "../types/pops-events.types";
import { POPS_SIGNAL_SOURCE, type PopsSignalBatch } from "../types/pops.types";

function eventId(): string {
  return `pops_event_${crypto.randomUUID()}`;
}

function safeTimestamp(timestampMs?: number): number {
  return timestampMs ?? Date.now();
}

export class PopsEventService {
  createEvent(input: PopsEventServiceInput): PopsEvent {
    return {
      id: eventId(),
      sessionId: input.sessionId,
      userId: input.userId,
      type: input.eventType,
      source: input.signalSource,
      timestampMs: safeTimestamp(input.timestampMs),
      payload: input.payload ?? {}
    };
  }

  deriveEventsFromSignalBatch(batch: PopsSignalBatch): PopsBatchDerivedEvents {
    const events: PopsEvent[] = [];
    const checkpointTypes: PopsBatchDerivedEvents["derivedCheckpointTypes"] = [];
    const { signals } = batch;

    events.push(
      this.createEvent({
        sessionId: batch.sessionId,
        userId: batch.userId,
        eventType: signals.screenActive ? POPS_EVENT_TYPE.SCREEN_ACTIVE : POPS_EVENT_TYPE.SCREEN_INACTIVE,
        signalSource: POPS_SIGNAL_SOURCE.SCREEN,
        payload: { screenActive: signals.screenActive },
        timestampMs: batch.timestampMs
      })
    );

    events.push(
      this.createEvent({
        sessionId: batch.sessionId,
        userId: batch.userId,
        eventType: signals.appForegrounded
          ? POPS_EVENT_TYPE.APP_FOREGROUNDED
          : POPS_EVENT_TYPE.APP_BACKGROUNDED,
        signalSource: POPS_SIGNAL_SOURCE.APP_STATE,
        payload: { appForegrounded: signals.appForegrounded },
        timestampMs: batch.timestampMs
      })
    );

    if (signals.visualPresenceScore !== null) {
      events.push(
        this.createEvent({
          sessionId: batch.sessionId,
          userId: batch.userId,
          eventType:
            signals.visualPresenceScore >= 0.45 ? POPS_EVENT_TYPE.FACE_PRESENT : POPS_EVENT_TYPE.FACE_MISSING,
          signalSource: POPS_SIGNAL_SOURCE.VISUAL,
          payload: { visualPresenceScore: signals.visualPresenceScore },
          timestampMs: batch.timestampMs
        })
      );
    }

    if (signals.motionStabilityScore < 0.4) {
      events.push(
        this.createEvent({
          sessionId: batch.sessionId,
          userId: batch.userId,
          eventType: POPS_EVENT_TYPE.MOTION_UNSTABLE,
          signalSource: POPS_SIGNAL_SOURCE.MOTION,
          payload: { motionStabilityScore: signals.motionStabilityScore },
          timestampMs: batch.timestampMs
        })
      );
    } else {
      events.push(
        this.createEvent({
          sessionId: batch.sessionId,
          userId: batch.userId,
          eventType: POPS_EVENT_TYPE.MOTION_STABLE,
          signalSource: POPS_SIGNAL_SOURCE.MOTION,
          payload: { motionStabilityScore: signals.motionStabilityScore },
          timestampMs: batch.timestampMs
        })
      );
    }

    if (signals.audioDistractionScore >= 0.6) {
      events.push(
        this.createEvent({
          sessionId: batch.sessionId,
          userId: batch.userId,
          eventType: POPS_EVENT_TYPE.AUDIO_DISTRACTION_DETECTED,
          signalSource: POPS_SIGNAL_SOURCE.AUDIO_FEATURES,
          payload: { audioDistractionScore: signals.audioDistractionScore },
          timestampMs: batch.timestampMs
        })
      );
    }

    if (signals.contentProgressPct >= 1) {
      checkpointTypes.push(POPS_EVENT_TYPE.REWARD_CHECKPOINT);
    }

    if (signals.accountContinuityScore < 0.5 || signals.deviceIntegrityScore < 0.5) {
      checkpointTypes.push(POPS_EVENT_TYPE.TRUST_CHECKPOINT);
    }

    return { events, derivedCheckpointTypes: checkpointTypes };
  }
}
