import { describe, expect, it } from "vitest";
import { api } from "../setup/client";

describe("proof links", () => {
  it("validates resolver query", async () => {
    const res = await api().get("/v1/proof-links/resolve").expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("rejects invalid resolver token", async () => {
    const res = await api()
      .get(`/v1/proof-links/resolve?code=missing&token=${"a".repeat(64)}`)
      .expect(403);

    expect(res.body.ok).toBe(false);
  });
});
