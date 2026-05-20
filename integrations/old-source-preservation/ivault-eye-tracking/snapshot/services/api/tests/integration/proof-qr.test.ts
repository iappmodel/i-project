import { describe, expect, it } from "vitest";
import { api } from "../setup/client";

describe("proof qr", () => {
  it("requires auth to create proof link", async () => {
    const res = await api()
      .post("/v1/proof-qr/links")
      .send({
        proofType: "trust_proof_report",
        proofKey: "example",
        createQr: true
      })
      .expect(401);

    expect(res.body.ok).toBe(false);
  });
});
