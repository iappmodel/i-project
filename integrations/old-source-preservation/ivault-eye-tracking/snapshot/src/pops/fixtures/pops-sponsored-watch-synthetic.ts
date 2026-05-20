import { createPopsEvent } from "../aggregation/pops-local-aggregate-builder";
import type { PopsEvent } from "../types/pops-events.types";
import type { PopsSession } from "../types/pops.types";

export function parsePopsSessionStartMs(session: PopsSession): number {
  return Date.parse(session.startedAt);
}

/** Full clean watch with taps/scrolls (interaction density). */
export function buildSyntheticCleanFullWatch(session: PopsSession): { events: PopsEvent[]; completedAt: string } {
  const startMs = parsePopsSessionStartMs(session);
  const req = session.requiredDurationMs;
  const at = (f: number) => startMs + Math.floor(req * f);
  const finalTs = startMs + req + 1000;
  const sid = session.id;
  const uid = session.userId;
  const events: PopsEvent[] = [
    createPopsEvent({ sessionId: sid, userId: uid, eventType: "SESSION_STARTED", source: "SESSION", clientTimestampMs: startMs }),
    createPopsEvent({ sessionId: sid, userId: uid, eventType: "CONTENT_STARTED", source: "CONTENT", clientTimestampMs: startMs + 50 }),
    createPopsEvent({ sessionId: sid, userId: uid, eventType: "CONTENT_PROGRESS", source: "CONTENT", payload: { contentProgressPct: 25 }, clientTimestampMs: at(0.25) }),
    createPopsEvent({ sessionId: sid, userId: uid, eventType: "TOUCH_TAP", source: "TOUCH", clientTimestampMs: at(0.28) }),
    createPopsEvent({ sessionId: sid, userId: uid, eventType: "TOUCH_TAP", source: "TOUCH", clientTimestampMs: at(0.3) }),
    createPopsEvent({ sessionId: sid, userId: uid, eventType: "TOUCH_SCROLL", source: "TOUCH", clientTimestampMs: at(0.32) }),
    createPopsEvent({ sessionId: sid, userId: uid, eventType: "CONTENT_PROGRESS", source: "CONTENT", payload: { contentProgressPct: 50 }, clientTimestampMs: at(0.5) }),
    createPopsEvent({ sessionId: sid, userId: uid, eventType: "CONTENT_PROGRESS", source: "CONTENT", payload: { contentProgressPct: 90 }, clientTimestampMs: at(0.9) }),
    createPopsEvent({ sessionId: sid, userId: uid, eventType: "CONTENT_PROGRESS", source: "CONTENT", payload: { contentProgressPct: 100 }, clientTimestampMs: finalTs - 2 }),
    createPopsEvent({ sessionId: sid, userId: uid, eventType: "CONTENT_COMPLETED", source: "CONTENT", clientTimestampMs: finalTs }),
  ];
  return { events, completedAt: new Date(finalTs).toISOString() };
}

/** Clean full watch with no touch events (passive viewing). */
export function buildSyntheticPassiveCleanWatch(session: PopsSession): { events: PopsEvent[]; completedAt: string } {
  const startMs = parsePopsSessionStartMs(session);
  const req = session.requiredDurationMs;
  const at = (f: number) => startMs + Math.floor(req * f);
  const finalTs = startMs + req + 1000;
  const sid = session.id;
  const uid = session.userId;
  const events: PopsEvent[] = [
    createPopsEvent({ sessionId: sid, userId: uid, eventType: "SESSION_STARTED", source: "SESSION", clientTimestampMs: startMs }),
    createPopsEvent({ sessionId: sid, userId: uid, eventType: "CONTENT_STARTED", source: "CONTENT", clientTimestampMs: startMs + 50 }),
    createPopsEvent({ sessionId: sid, userId: uid, eventType: "CONTENT_PROGRESS", source: "CONTENT", payload: { contentProgressPct: 30 }, clientTimestampMs: at(0.3) }),
    createPopsEvent({ sessionId: sid, userId: uid, eventType: "CONTENT_PROGRESS", source: "CONTENT", payload: { contentProgressPct: 60 }, clientTimestampMs: at(0.6) }),
    createPopsEvent({ sessionId: sid, userId: uid, eventType: "CONTENT_PROGRESS", source: "CONTENT", payload: { contentProgressPct: 100 }, clientTimestampMs: finalTs - 2 }),
    createPopsEvent({ sessionId: sid, userId: uid, eventType: "CONTENT_COMPLETED", source: "CONTENT", clientTimestampMs: finalTs }),
  ];
  return { events, completedAt: new Date(finalTs).toISOString() };
}

export function buildSyntheticPartialWatch(session: PopsSession): { events: PopsEvent[]; completedAt: string } {
  const startMs = parsePopsSessionStartMs(session);
  const req = session.requiredDurationMs;
  const half = startMs + Math.floor(req * 0.5);
  const sid = session.id;
  const uid = session.userId;
  const events: PopsEvent[] = [
    createPopsEvent({ sessionId: sid, userId: uid, eventType: "SESSION_STARTED", source: "SESSION", clientTimestampMs: startMs }),
    createPopsEvent({ sessionId: sid, userId: uid, eventType: "CONTENT_STARTED", source: "CONTENT", clientTimestampMs: startMs + 50 }),
    createPopsEvent({ sessionId: sid, userId: uid, eventType: "CONTENT_PROGRESS", source: "CONTENT", payload: { contentProgressPct: 50 }, clientTimestampMs: half }),
  ];
  return { events, completedAt: new Date(half).toISOString() };
}

export function buildSyntheticBackgroundFraud(session: PopsSession): { events: PopsEvent[]; completedAt: string } {
  const startMs = parsePopsSessionStartMs(session);
  const req = session.requiredDurationMs;
  const sid = session.id;
  const uid = session.userId;
  const t = (f: number) => startMs + Math.floor(req * f);
  const finalTs = startMs + req + 1000;
  const events: PopsEvent[] = [
    createPopsEvent({ sessionId: sid, userId: uid, eventType: "SESSION_STARTED", source: "SESSION", clientTimestampMs: startMs }),
    createPopsEvent({ sessionId: sid, userId: uid, eventType: "CONTENT_STARTED", source: "CONTENT", clientTimestampMs: startMs + 50 }),
    createPopsEvent({ sessionId: sid, userId: uid, eventType: "CONTENT_PROGRESS", source: "CONTENT", payload: { contentProgressPct: 10 }, clientTimestampMs: t(0.08) }),
    createPopsEvent({ sessionId: sid, userId: uid, eventType: "APP_BACKGROUNDED", source: "APP_STATE", clientTimestampMs: t(0.1) }),
    createPopsEvent({ sessionId: sid, userId: uid, eventType: "SIMULATED_BACKGROUND_FRAUD", source: "SIMULATION", clientTimestampMs: t(0.11) }),
    createPopsEvent({ sessionId: sid, userId: uid, eventType: "CONTENT_PROGRESS", source: "CONTENT", payload: { contentProgressPct: 100 }, clientTimestampMs: t(0.55) }),
    createPopsEvent({ sessionId: sid, userId: uid, eventType: "CONTENT_COMPLETED", source: "CONTENT", clientTimestampMs: finalTs }),
  ];
  return { events, completedAt: new Date(finalTs).toISOString() };
}

export function buildSyntheticDeviceWarning(session: PopsSession): { events: PopsEvent[]; completedAt: string } {
  const clean = buildSyntheticCleanFullWatch(session);
  const events = [...clean.events];
  const completed = events[events.length - 1]!;
  const progress100 = events[events.length - 2]!;
  const warnTs = completed.clientTimestampMs - 400;
  const warn = createPopsEvent({
    sessionId: session.id,
    userId: session.userId,
    eventType: "SIMULATED_DEVICE_WARNING",
    source: "SIMULATION",
    clientTimestampMs: warnTs,
  });
  const head = events.slice(0, -2);
  const reordered = [...head, warn, progress100, completed];
  return { events: reordered, completedAt: clean.completedAt };
}

export function buildSyntheticImpossibleFast(session: PopsSession): { events: PopsEvent[]; completedAt: string } {
  const startMs = parsePopsSessionStartMs(session);
  const req = session.requiredDurationMs;
  const fin = startMs + Math.floor(req * 0.2);
  const sid = session.id;
  const uid = session.userId;
  const events: PopsEvent[] = [
    createPopsEvent({ sessionId: sid, userId: uid, eventType: "SESSION_STARTED", source: "SESSION", clientTimestampMs: startMs }),
    createPopsEvent({ sessionId: sid, userId: uid, eventType: "CONTENT_STARTED", source: "CONTENT", clientTimestampMs: startMs + 50 }),
    createPopsEvent({ sessionId: sid, userId: uid, eventType: "CONTENT_PROGRESS", source: "CONTENT", payload: { contentProgressPct: 100 }, clientTimestampMs: fin - 2 }),
    createPopsEvent({ sessionId: sid, userId: uid, eventType: "CONTENT_COMPLETED", source: "CONTENT", clientTimestampMs: fin }),
  ];
  return { events, completedAt: new Date(fin).toISOString() };
}
