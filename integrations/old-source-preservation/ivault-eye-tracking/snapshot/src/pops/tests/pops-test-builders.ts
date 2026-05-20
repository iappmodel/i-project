import { buildLocalSponsoredWatchAggregate, createPopsEvent } from "../aggregation/pops-local-aggregate-builder";
import {
  POPS_DEFAULT_REQUIRED_COMPLETION_PCT,
  POPS_DEFAULT_REQUIRED_DURATION_MS,
  POPS_DEFAULT_REWARD_AMOUNT,
  POPS_DEFAULT_REWARD_COIN_TYPE,
} from "../constants/pops.constants";
import {
  buildSyntheticBackgroundFraud,
  buildSyntheticCleanFullWatch,
  buildSyntheticDeviceWarning,
  buildSyntheticImpossibleFast,
  buildSyntheticPartialWatch,
  buildSyntheticPassiveCleanWatch,
} from "../fixtures/pops-sponsored-watch-synthetic";
import type { PopsEvent } from "../types/pops-events.types";
import type { PopsSession, PopsSessionAggregate } from "../types/pops.types";
import { createPopsId } from "../utils/pops-id";

/** Fixed clock for deterministic builder defaults (tests / manual scenarios). */
export const POPS_TEST_BUILDER_ANCHOR_ISO = "2026-04-01T12:00:00.000Z";

export function makePopsSession(overrides?: Partial<PopsSession>): PopsSession {
  return {
    id: createPopsId("pops_sess"),
    userId: "pops-test-user",
    sessionType: "SPONSORED_WATCH",
    proofLevel: "LEVEL_2_ATTENTION",
    state: "ACTIVE",
    startedAt: POPS_TEST_BUILDER_ANCHOR_ISO,
    requiredDurationMs: POPS_DEFAULT_REQUIRED_DURATION_MS,
    requiredCompletionPct: POPS_DEFAULT_REQUIRED_COMPLETION_PCT,
    expectedReward: { coinType: POPS_DEFAULT_REWARD_COIN_TYPE, amount: POPS_DEFAULT_REWARD_AMOUNT },
    ...overrides,
  };
}

export function makePopsEvent(overrides: Partial<PopsEvent> & Pick<PopsEvent, "sessionId" | "userId" | "eventType" | "source">): PopsEvent {
  const clientTimestampMs = overrides.clientTimestampMs ?? Date.parse(POPS_TEST_BUILDER_ANCHOR_ISO);
  const base = createPopsEvent({
    sessionId: overrides.sessionId,
    userId: overrides.userId,
    eventType: overrides.eventType,
    source: overrides.source,
    clientTimestampMs,
    payload: overrides.payload,
  });
  return {
    ...base,
    ...overrides,
    eventId: overrides.eventId ?? base.eventId,
    clientTimestampMs: overrides.clientTimestampMs ?? base.clientTimestampMs,
    createdAt: overrides.createdAt ?? base.createdAt,
  };
}

export function makePopsAggregate(overrides?: Partial<PopsSessionAggregate>): PopsSessionAggregate {
  const sessionId = overrides?.sessionId ?? createPopsId("pops_sess");
  const userId = overrides?.userId ?? "pops-test-user";
  return {
    sessionId,
    userId,
    totalDurationMs: 35_000,
    activeDurationMs: 32_000,
    foregroundDurationMs: 32_000,
    backgroundDurationMs: 0,
    pausedDurationMs: 0,
    contentProgressPct: 100,
    contentCompleted: true,
    pauseCount: 0,
    resumeCount: 0,
    tapCount: 2,
    scrollCount: 1,
    appBackgroundCount: 0,
    appForegroundCount: 0,
    screenActiveRatio: 0.98,
    appForegroundRatio: 0.98,
    progressWhileBackgrounded: false,
    completionTooFast: false,
    deviceIntegrityScore: 0.95,
    accountContinuityScore: 0.9,
    sessionConsistencyScore: 0.95,
    reasonCodes: [],
    ...overrides,
  };
}

function aggregateFor(session: PopsSession, events: PopsEvent[], completedAt: string): PopsSessionAggregate {
  const ended: PopsSession = { ...session, endedAt: completedAt };
  return buildLocalSponsoredWatchAggregate({
    session: ended,
    events,
    referenceNowMs: Date.parse(completedAt),
  });
}

export function makeCleanSponsoredWatchFixture(): {
  session: PopsSession;
  events: PopsEvent[];
  aggregate: PopsSessionAggregate;
} {
  const session = makePopsSession();
  const { events, completedAt } = buildSyntheticCleanFullWatch(session);
  return { session, events, aggregate: aggregateFor(session, events, completedAt) };
}

export function makePartialSponsoredWatchFixture(): {
  session: PopsSession;
  events: PopsEvent[];
  aggregate: PopsSessionAggregate;
} {
  const session = makePopsSession();
  const { events, completedAt } = buildSyntheticPartialWatch(session);
  return { session, events, aggregate: aggregateFor(session, events, completedAt) };
}

export function makeBackgroundFraudFixture(): {
  session: PopsSession;
  events: PopsEvent[];
  aggregate: PopsSessionAggregate;
} {
  const session = makePopsSession();
  const { events, completedAt } = buildSyntheticBackgroundFraud(session);
  return { session, events, aggregate: aggregateFor(session, events, completedAt) };
}

export function makeImpossibleCompletionFixture(): {
  session: PopsSession;
  events: PopsEvent[];
  aggregate: PopsSessionAggregate;
} {
  const session = makePopsSession();
  const { events, completedAt } = buildSyntheticImpossibleFast(session);
  return { session, events, aggregate: aggregateFor(session, events, completedAt) };
}

export function makeDeviceWarningFixture(): {
  session: PopsSession;
  events: PopsEvent[];
  aggregate: PopsSessionAggregate;
} {
  const session = makePopsSession();
  const { events, completedAt } = buildSyntheticDeviceWarning(session);
  return { session, events, aggregate: aggregateFor(session, events, completedAt) };
}

export function makePassiveCleanFixture(): {
  session: PopsSession;
  events: PopsEvent[];
  aggregate: PopsSessionAggregate;
} {
  const session = makePopsSession();
  const { events, completedAt } = buildSyntheticPassiveCleanWatch(session);
  return { session, events, aggregate: aggregateFor(session, events, completedAt) };
}
