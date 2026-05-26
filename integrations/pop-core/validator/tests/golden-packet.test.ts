import { describe, expect, it } from "vitest";

import pp000001 from "../../fixtures/PP-000001.json" with { type: "json" };

describe("PP-000001 golden fixture", () => {
  it("matches Proof Packet v0 MVP subset", () => {
    expect(pp000001.packetVersion).toBe("0");
    expect(pp000001.sessionId).toBeTruthy();
    expect(pp000001.localUserRef).toBe("demo-user-001");
    expect(pp000001.review.status).toBe("pending");
    expect(pp000001.signals.presence.score).toBeGreaterThan(0);
  });
});
