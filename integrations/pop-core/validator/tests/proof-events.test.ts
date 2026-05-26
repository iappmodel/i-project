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

  it("infers proof source from runtimeVersion", () => {
    expect(inferProofSource("flutter-runtime@1")).toBe("flutter");
    expect(inferProofSource("vite-web-demo")).toBe("web");
    expect(inferProofSource(undefined)).toBe("unknown");
  });
});
