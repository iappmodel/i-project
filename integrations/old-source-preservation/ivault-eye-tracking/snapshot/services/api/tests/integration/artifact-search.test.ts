import { describe, expect, it } from "vitest";
import { api } from "../setup/client";

describe("artifact search", () => {
  it("validates execute body", async () => {
    const res = await api()
      .post("/v1/artifact-search/execute")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("rejects invalid search token", async () => {
    const res = await api()
      .post("/v1/artifact-search/execute")
      .send({
        searchToken: "a".repeat(64),
        queryText: "security",
        queryType: "keyword",
        limit: 20
      })
      .expect(403);

    expect(res.body.ok).toBe(false);
  });
});
