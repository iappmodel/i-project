import { describe, expect, it } from "vitest";
import { api } from "../setup/client";

describe("evidence answers", () => {
  it("validates generate body", async () => {
    const res = await api()
      .post("/v1/evidence-answers/generate")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("rejects invalid answer token", async () => {
    const res = await api()
      .post("/v1/evidence-answers/generate")
      .send({
        answerToken: "a".repeat(64),
        questionText: "Do you encrypt data?",
        limit: 8
      })
      .expect(403);

    expect(res.body.ok).toBe(false);
  });
});
