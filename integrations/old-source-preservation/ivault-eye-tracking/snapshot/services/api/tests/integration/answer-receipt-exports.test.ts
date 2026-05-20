import { describe, expect, it } from "vitest";
import { api } from "../setup/client";

describe("answer receipt exports", () => {
  it("validates create bundle body", async () => {
    const res = await api().post("/v1/answer-receipt-exports/bundles").send({}).expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
