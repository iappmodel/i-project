import { describe, expect, it } from "vitest";
import { api } from "../setup/client";

describe("audit package access", () => {
  it("rejects invalid token", async () => {
    const res = await api()
      .get("/v1/audit-package-access/invalid-token")
      .expect(400);

    expect(res.body.ok).toBe(false);
  });
});
