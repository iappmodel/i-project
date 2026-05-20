import { describe, expect, it } from "vitest";
import { api } from "../setup/client";

describe("customer trust proof portal", () => {
  it("requires auth to create private room portal session", async () => {
    const res = await api()
      .post("/v1/customer-trust-proof-portal/private-room/example/session")
      .send({})
      .expect(401);

    expect(res.body.ok).toBe(false);
  });

  it("validates dashboard body", async () => {
    const res = await api()
      .post("/v1/customer-trust-proof-portal/dashboard")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("rejects invalid portal token", async () => {
    const res = await api()
      .post("/v1/customer-trust-proof-portal/dashboard")
      .send({
        portalToken: "a".repeat(64)
      })
      .expect(403);

    expect(res.body.ok).toBe(false);
  });
});
