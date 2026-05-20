import { describe, expect, it } from "vitest";
import { api } from "../setup/client";

describe("trust transparency public access", () => {
  it("rejects invalid transparency access token", async () => {
    const res = await api().get("/v1/trust-transparency/access/invalid-token").expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
