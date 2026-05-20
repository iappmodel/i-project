import { describe, expect, it } from "vitest";
import { api } from "../setup/client";

describe("artifact viewer", () => {
  it("validates resolve body", async () => {
    const res = await api()
      .post("/v1/artifact-viewer/resolve")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("rejects invalid viewer token", async () => {
    const res = await api()
      .post("/v1/artifact-viewer/resolve")
      .send({
        viewerToken: "a".repeat(64)
      })
      .expect(403);

    expect(res.body.ok).toBe(false);
  });
});
