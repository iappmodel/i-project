import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getPrimaryUserToken, getSecondUserToken } from "../setup/test-users";

describe("rls/api boundary", () => {
  it("does not expose another user's wallet through wallet summary", async () => {
    const userA = await getPrimaryUserToken();
    const userB = await getSecondUserToken();

    const resA = await api()
      .get("/v1/wallet/summary")
      .set("authorization", `Bearer ${userA.accessToken}`)
      .expect(200);

    const resB = await api()
      .get("/v1/wallet/summary")
      .set("authorization", `Bearer ${userB.accessToken}`)
      .expect(200);

    if (resA.body.data && resB.body.data) {
      expect(resA.body.data.userId).not.toBe(resB.body.data.userId);
      expect(resA.body.data.walletId).not.toBe(resB.body.data.walletId);
    }
  });

  it("does not allow user token to call worker endpoint", async () => {
    const user = await getPrimaryUserToken();

    const res = await api()
      .post("/v1/worker/jobs/run")
      .set("authorization", `Bearer ${user.accessToken}`)
      .send({
        jobKey: "observability_snapshot_every_5_minutes",
        lockedBy: "bad_user_call"
      })
      .expect(403);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("PERMISSION_DENIED");
  });

  it("does not allow user token to call admin endpoint", async () => {
    const user = await getPrimaryUserToken();

    const res = await api()
      .get("/v1/admin/system")
      .set("authorization", `Bearer ${user.accessToken}`)
      .expect(403);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("PERMISSION_DENIED");
  });
});
