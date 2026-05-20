import type { PopsBackendEvent } from "../types/pops-events.types";
import type { PopsQualityInputEvent } from "./pops-event-quality.types";

/** Maps MVP demo wire events into quality rows for {@link normalizePopsEvents}. */
export function popsEventsFromBackendEvents(sessionId: string, events: PopsBackendEvent[]): PopsQualityInputEvent[] {
  return events.map((e, i) => ({
    eventId: e.eventId ?? `${sessionId}:evt:${i}:${e.type}`,
    eventType: e.type,
    clientTimestampMs: e.timestampMs,
    payload: e.payload,
  }));
}
