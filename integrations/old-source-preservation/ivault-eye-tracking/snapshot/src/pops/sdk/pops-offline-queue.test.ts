import { describe, expect, it } from "vitest";
import { PopsOfflineQueue } from "./pops-offline-queue";
import { PopsStorage } from "./pops-storage";

function makeStorage(): PopsStorage {
  const map = new Map<string, string>();
  return new PopsStorage(
    {
      getItem: (key) => map.get(key) ?? null,
      setItem: (key, value) => {
        map.set(key, value);
      },
      removeItem: (key) => {
        map.delete(key);
      },
    },
    "test",
  );
}

describe("PopsOfflineQueue", () => {
  it("deduplicates envelopes and enforces per-session cap", async () => {
    let now = 1_000;
    const queue = new PopsOfflineQueue(makeStorage(), {
      maxQueueSizePerSession: 2,
      queueTtlMs: 10_000,
      now: () => now,
      randomId: () => `id_${now++}`,
    });

    await queue.enqueue("s1", { kind: "checkpoint" }, "dup");
    await queue.enqueue("s1", { kind: "checkpoint" }, "dup");
    await queue.enqueue("s1", { kind: "control", action: "pause" }, "a2");
    await queue.enqueue("s1", { kind: "control", action: "resume" }, "a3");

    const events = await queue.getSessionEvents("s1");
    expect(events).toHaveLength(2);
    expect(events[0].event.kind).toBe("control");
  });

  it("expires old items by ttl", async () => {
    let now = 1_000;
    const queue = new PopsOfflineQueue(makeStorage(), {
      maxQueueSizePerSession: 10,
      queueTtlMs: 100,
      now: () => now,
      randomId: () => `id_${now++}`,
    });
    await queue.enqueue("s1", { kind: "checkpoint" }, "k1");
    now = 2_000;
    const events = await queue.getSessionEvents("s1");
    expect(events).toHaveLength(0);
  });
});
