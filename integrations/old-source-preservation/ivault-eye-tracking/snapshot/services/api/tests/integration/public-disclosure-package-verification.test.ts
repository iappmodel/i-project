import { describe, expect, it } from "vitest";
import { api } from "../setup/client";

describe("public disclosure package verification", () => {
  it("validates verification body", async () => {
    const res = await api()
      .post("/v1/public/verify/disclosure-package")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("returns not_found for unknown package", async () => {
    const res = await api()
      .post("/v1/public/verify/disclosure-package")
      .send({
        packageKey: "unknown-disclosure-package"
      })
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data.verificationStatus).toBe("not_found");
    expect(res.body.data.verified).toBe(false);
  });
});
