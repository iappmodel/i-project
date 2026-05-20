import { describe, expect, it } from "vitest";
import { api } from "../setup/client";

describe("artifact downloads", () => {
  it("validates resolve body", async () => {
    const res = await api()
      .post("/v1/artifact-downloads/resolve")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("rejects invalid download token", async () => {
    const res = await api()
      .post("/v1/artifact-downloads/resolve")
      .send({
        downloadToken: "a".repeat(64)
      })
      .expect(403);

    expect(res.body.ok).toBe(false);
  });

  it("validates complete body", async () => {
    const res = await api()
      .post("/v1/artifact-downloads/complete")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
