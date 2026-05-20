import { describe, expect, it } from "vitest";
import { api } from "../setup/client";

describe("answer receipts", () => {
  it("validates create receipt body", async () => {
    const res = await api().post("/v1/answer-receipts").send({}).expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("validates verify receipt body", async () => {
    const res = await api()
      .post("/v1/answer-receipts/verify")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
