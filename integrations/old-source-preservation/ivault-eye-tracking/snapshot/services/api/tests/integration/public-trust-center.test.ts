import { describe, expect, it } from "vitest";
import { api } from "../setup/client";

describe("public trust center", () => {
  it("gets public trust center", async () => {
    const res = await api().get("/v1/public/trust-center/default").expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("trustCenter");
  });

  it("lists public disclosures", async () => {
    const res = await api()
      .get("/v1/public/trust-center/default/disclosures?limit=10")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("items");
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists public revocations", async () => {
    const res = await api()
      .get("/v1/public/trust-center/default/revocations?limit=10")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("items");
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("validates manifest verification body", async () => {
    const res = await api()
      .post("/v1/public/trust-center/verify/manifest")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("returns not_found for unknown manifest with valid-shaped values", async () => {
    const res = await api()
      .post("/v1/public/trust-center/verify/manifest")
      .send({
        manifestKey: "unknown-trust-center-manifest",
        checksumSha256: "a".repeat(64),
        signature: "b".repeat(64)
      })
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data.verificationStatus).toBe("not_found");
    expect(res.body.data.verified).toBe(false);
  });
});
