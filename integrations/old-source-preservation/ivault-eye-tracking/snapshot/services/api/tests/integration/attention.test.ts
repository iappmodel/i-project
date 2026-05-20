import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getPrimaryUserToken } from "../setup/test-users";

describe("attention", () => {
  it("rejects invalid start body", async () => {
    const user = await getPrimaryUserToken();

    const res = await api()
      .post("/v1/attention/session/start")
      .set("authorization", `Bearer ${user.accessToken}`)
      .send({
        walletId: "not-a-uuid"
      })
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("rejects invalid complete body", async () => {
    const user = await getPrimaryUserToken();

    const res = await api()
      .post("/v1/attention/session/complete")
      .set("authorization", `Bearer ${user.accessToken}`)
      .send({
        attentionSessionId: "not-a-uuid",
        decision: "passed"
      })
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("returns attention history in camelCase DTO shape", async () => {
    const user = await getPrimaryUserToken();

    const res = await api()
      .get("/v1/attention/history?limit=10")
      .set("authorization", `Bearer ${user.accessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);

    const first = res.body.data.items[0];

    if (first) {
      expect(first).toHaveProperty("attentionEventId");
      expect(first).toHaveProperty("userVisibleResult");
      expect(first).not.toHaveProperty("attention_event_id");
      expect(first).not.toHaveProperty("fraudRiskScore");
    }
  });
});
