import { describe, expect, it } from "vitest";
import { api } from "../setup/client";

describe("trust proof reports", () => {
  it("requires auth for private room report", async () => {
    const res = await api()
      .post("/v1/trust-proof-reports/private-room/example-room")
      .send({
        reportFormat: "html"
      })
      .expect(401);

    expect(res.body.ok).toBe(false);
  });

  it("validates report format", async () => {
    const res = await api()
      .post("/v1/trust-proof-reports/private-room/example-room")
      .send({
        reportFormat: "exe"
      })
      .expect(401);

    expect(res.body.ok).toBe(false);
  });
});
