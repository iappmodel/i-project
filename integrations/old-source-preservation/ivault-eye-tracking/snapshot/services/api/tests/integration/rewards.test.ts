import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getPrimaryUserToken } from "../setup/test-users";

describe("rewards", () => {
  it("returns reward history as camelCase DTOs", async () => {
    const user = await getPrimaryUserToken();

    const res = await api()
      .get("/v1/rewards/history?limit=10")
      .set("authorization", `Bearer ${user.accessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);

    const first = res.body.data.items[0];

    if (first) {
      expect(first).toHaveProperty("rewardId");
      expect(first).toHaveProperty("rewardAmountMinor");
      expect(first).toHaveProperty("displayStatus");
      expect(first).not.toHaveProperty("reward_id");
      expect(first).not.toHaveProperty("metadata");
    }
  });

  it("rejects invalid cursor", async () => {
    const user = await getPrimaryUserToken();

    const res = await api()
      .get("/v1/rewards/history?cursor=bad-cursor")
      .set("authorization", `Bearer ${user.accessToken}`)
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("INVALID_PAGINATION_CURSOR");
  });
});
