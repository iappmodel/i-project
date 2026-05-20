import { describe, expect, it } from "vitest";
import { normalizePopsEvents } from "./pops-event-normalizer";
import { POPS_REASON_CODES } from "../constants/pops-reason-codes";
import { POPS_EVENT_DROP_REASONS } from "./pops-event-quality-reason-codes";

const baseSession = {
  id: "s1",
  userId: "u1",
  sessionType: "SPONSORED_WATCH" as const,
  proofLevel: "LEVEL_2_ATTENTION" as const,
  state: "ACTIVE" as const,
  startedAt: "2026-01-01T12:00:00.000Z",
  requiredDurationMs: 30_000,
  requiredCompletionPct: 80,
  expectedReward: { coinType: "iCoin", amount: 0.25 },
};

describe("normalizePopsEvents", () => {
  it("sorts by clientTimestampMs and dedupes eventId (keeps first)", () => {
    const t0 = Date.parse("2026-01-01T12:00:01.000Z");
    const out = normalizePopsEvents({
      session: baseSession,
      referenceNowMs: Date.parse("2026-01-01T12:05:00.000Z"),
      events: [
        { eventId: "b", eventType: "CONTENT_PROGRESS", clientTimestampMs: t0 + 2000, payload: { contentProgressPct: 10 } },
        { eventId: "a", eventType: "CONTENT_PROGRESS", clientTimestampMs: t0 + 1000, payload: { contentProgressPct: 5 } },
        { eventId: "a", eventType: "CONTENT_PROGRESS", clientTimestampMs: t0 + 3000, payload: { contentProgressPct: 20 } },
      ],
    });
    expect(out.normalizedEvents.map((e) => e.eventId)).toEqual(["a", "b"]);
    expect(out.droppedEvents.some((d) => d.reason === POPS_EVENT_DROP_REASONS.DUPLICATE_EVENT_ID)).toBe(true);
    expect(out.warnings).toContain(POPS_REASON_CODES.DUPLICATE_EVENT_DROPPED);
  });

  it("clamps CONTENT_PROGRESS and strips client score fields", () => {
    const t0 = Date.parse("2026-01-01T12:00:01.000Z");
    const out = normalizePopsEvents({
      session: baseSession,
      referenceNowMs: Date.parse("2026-01-01T12:05:00.000Z"),
      events: [
        {
          eventId: "p1",
          eventType: "CONTENT_PROGRESS",
          clientTimestampMs: t0,
          payload: { contentProgressPct: 150, presenceConfidence: 0.9, fraudRisk: 0.1 },
        },
      ],
    });
    expect(out.normalizedEvents[0].payload).toEqual({ contentProgressPct: 100 });
    expect(out.warnings).toContain(POPS_REASON_CODES.CLIENT_SCORE_FIELD_REMOVED);
    expect(out.warnings).toContain(POPS_REASON_CODES.EVENT_NORMALIZED);
  });

  it("drops CONTENT_PROGRESS without numeric contentProgressPct", () => {
    const t0 = Date.parse("2026-01-01T12:00:01.000Z");
    const out = normalizePopsEvents({
      session: baseSession,
      referenceNowMs: Date.parse("2026-01-01T12:05:00.000Z"),
      events: [{ eventId: "p1", eventType: "CONTENT_PROGRESS", clientTimestampMs: t0, payload: {} }],
    });
    expect(out.normalizedEvents).toHaveLength(0);
    expect(out.droppedEvents[0]?.reason).toBe(POPS_EVENT_DROP_REASONS.MISSING_REQUIRED_PAYLOAD);
  });

  it("flags EVENT_SEQUENCE_INVALID when CONTENT_COMPLETED before CONTENT_STARTED", () => {
    const t0 = Date.parse("2026-01-01T12:00:01.000Z");
    const out = normalizePopsEvents({
      session: baseSession,
      referenceNowMs: Date.parse("2026-01-01T12:05:00.000Z"),
      events: [
        { eventId: "c1", eventType: "CONTENT_COMPLETED", clientTimestampMs: t0 },
        { eventId: "s1", eventType: "CONTENT_STARTED", clientTimestampMs: t0 + 1000 },
      ],
    });
    expect(out.warnings).toContain(POPS_REASON_CODES.EVENT_SEQUENCE_INVALID);
    expect(out.normalizedEvents.some((e) => e.eventType === "CONTENT_COMPLETED")).toBe(true);
  });

  it("is deterministic for same input", () => {
    const t0 = Date.parse("2026-01-01T12:00:01.000Z");
    const ref = Date.parse("2026-01-01T12:05:00.000Z");
    const events = [
      { eventId: "x", eventType: "CONTENT_PROGRESS", clientTimestampMs: t0, payload: { contentProgressPct: 12 } },
    ];
    const a = normalizePopsEvents({ session: baseSession, referenceNowMs: ref, events });
    const b = normalizePopsEvents({ session: baseSession, referenceNowMs: ref, events });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
