import type { PopsEvent, PopsEventType, PopsSignalSource } from "../types/pops-events.types";
import { createPopsId } from "../utils/pops-id";
import { nowMs } from "../utils/pops-time";
import { sanitizePopsPayloadDeep } from "./pops-payload-helpers";

export function createPopsEvent(input: {
  sessionId: string;
  userId: string;
  eventType: PopsEventType;
  source: PopsSignalSource;
  clientTimestampMs?: number;
  payload?: Record<string, unknown>;
}): PopsEvent {
  const clientTimestampMs = input.clientTimestampMs ?? nowMs();
  const payload = sanitizePopsPayloadDeep(input.payload);
  return {
    eventId: createPopsId("pops_event"),
    sessionId: input.sessionId,
    userId: input.userId,
    eventType: input.eventType,
    source: input.source,
    clientTimestampMs,
    payload: Object.keys(payload).length > 0 ? payload : undefined,
    createdAt: new Date(clientTimestampMs).toISOString(),
  };
}
