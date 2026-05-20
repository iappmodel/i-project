import { describe, expect, it } from "vitest";
import { api } from "../setup/client";

describe("trust timeline", () => {
  it("requires auth for private room snapshot", async () => {
    const res = await api()
      .post("/v1/trust-timeline/private-room/example-room/snapshots")
      .send({})
      .expect(401);

    expect(res.body.ok).toBe(false);
  });
});
