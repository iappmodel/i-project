import { describe, expect, it } from "vitest";

import {
  broadcastProofSealed,
  inferProofSource,
  proofEventSubscriberCount,
  subscribeProofEvents,
  type ProofSealedEvent,
} from "../src/proof-events.js";

describe("proof-events", () => {
  it("streams SSE to subscribers and broadcasts events", () => {
    const chunks: string[] = [];
    const res = {
      writeHead(_code: number, _headers: Record<string, string>) {},
      write(chunk: string) {
        chunks.push(chunk);
      },
      on(_event: string, _fn: () => void) {},
    } as unknown as import("node:http").ServerResponse;

    subscribeProofEvents(res);
    expect(proofEventSubscriberCount()).toBe(1);
    expect(chunks.join("")).toContain(": connected");

    const event: ProofSealedEvent = {
      type: "proof-sealed",
      sessionId: "sess_test",
      localUserRef: "demo-user-001",
      mode: "pending",
      reviewStatus: "approved",
      holdOutcome: "created",
      timestamp: new Date().toISOString(),
      source: "web",
    };
    broadcastProofSealed(event);

    expect(chunks.join("")).toContain("proof-sealed");
    expect(chunks.join("")).toContain("sess_test");
  });

  it("filters events by localUserRef when subscriber requests it", () => {
    const allChunks: string[] = [];
    const filteredChunks: string[] = [];

    const allRes = {
      writeHead() {},
      write(chunk: string) {
        allChunks.push(chunk);
      },
      on() {},
    } as unknown as import("node:http").ServerResponse;

    const filteredRes = {
      writeHead() {},
      write(chunk: string) {
        filteredChunks.push(chunk);
      },
      on() {},
    } as unknown as import("node:http").ServerResponse;

    subscribeProofEvents(allRes, null);
    subscribeProofEvents(filteredRes, "demo-user-001");

    const event: ProofSealedEvent = {
      type: "proof-sealed",
      sessionId: "sess_filter",
      localUserRef: "other-user",
      mode: "pending",
      reviewStatus: "approved",
      holdOutcome: "created",
      timestamp: new Date().toISOString(),
      source: "flutter",
    };
    broadcastProofSealed(event);

    expect(allChunks.join("")).toContain("sess_filter");
    expect(filteredChunks.join("")).not.toContain("sess_filter");

    broadcastProofSealed({ ...event, localUserRef: "demo-user-001" });
    expect(filteredChunks.join("")).toContain("sess_filter");
  });

  it("infers proof source from runtimeVersion", () => {
    expect(inferProofSource("flutter-runtime@1")).toBe("flutter");
    expect(inferProofSource("vite-web-demo")).toBe("web");
    expect(inferProofSource(undefined)).toBe("unknown");
  });
});
