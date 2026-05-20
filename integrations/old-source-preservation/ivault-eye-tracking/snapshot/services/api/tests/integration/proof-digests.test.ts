import { describe, expect, it } from "vitest";
import { api } from "../setup/client";

describe("proof digests", () => {
  it("requires auth to create private room digest subscription", async () => {
    const res = await api()
      .post("/v1/proof-digests/private-room/example/subscriptions")
      .send({
        recipientEmail: "customer@example.com",
        digestFrequency: "daily",
        digestChannel: "email"
      })
      .expect(401);

    expect(res.body.ok).toBe(false);
  });

  it("validates digest subscription body after auth layer", async () => {
    const res = await api()
      .post("/v1/proof-digests/private-room/example/subscriptions")
      .send({})
      .expect(401);

    expect(res.body.ok).toBe(false);
  });
});
