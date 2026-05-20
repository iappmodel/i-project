import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getUserToken } from "../setup/test-users";

describe("enterprise review room", () => {
  it("requires valid room access", async () => {
    const user = await getUserToken();

    const res = await api()
      .get("/v1/enterprise-review-rooms/unknown-room")
      .set("authorization", `Bearer ${user.accessToken}`)
      .expect(403);

    expect(res.body.ok).toBe(false);
  });

  it("validates NDA acceptance body", async () => {
    const user = await getUserToken();

    const res = await api()
      .post("/v1/enterprise-review-rooms/nda/accept")
      .set("authorization", `Bearer ${user.accessToken}`)
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
