import { describe, expect, it } from "vitest";
import { api } from "../setup/client";

describe("public trust timeline", () => {
  it("lists public trust center timeline", async () => {
    const res = await api().get("/v1/public/trust-center/timeline?limit=10").expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("timeline");
    expect(Array.isArray(res.body.data.timeline)).toBe(true);
  });

  it("validates limit", async () => {
    const res = await api().get("/v1/public/trust-center/timeline?limit=9999").expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
