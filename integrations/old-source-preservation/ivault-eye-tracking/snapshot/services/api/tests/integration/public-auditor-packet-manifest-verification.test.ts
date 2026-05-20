import { describe, expect, it } from "vitest";
import { api } from "../setup/client";

describe("public auditor packet manifest verification", () => {
  it("validates verification body", async () => {
    const res = await api()
      .post("/v1/public/verify/auditor-packet-manifest")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("returns not_found for unknown manifest with valid-shaped values", async () => {
    const res = await api()
      .post("/v1/public/verify/auditor-packet-manifest")
      .send({
        manifestKey: "unknown-auditor-manifest",
        checksumSha256: "a".repeat(64),
        signature: "b".repeat(64)
      })
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data.verificationStatus).toBe("not_found");
    expect(res.body.data.verified).toBe(false);
  });
});
