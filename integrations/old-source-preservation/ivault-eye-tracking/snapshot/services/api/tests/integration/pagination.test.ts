import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getPrimaryUserToken } from "../setup/test-users";

describe("pagination", () => {
  it("supports reward history cursor pagination", async () => {
    const user = await getPrimaryUserToken();

    const firstPage = await api()
      .get("/v1/rewards/history?limit=1")
      .set("authorization", `Bearer ${user.accessToken}`)
      .expect(200);

    expect(firstPage.body.ok).toBe(true);
    expect(Array.isArray(firstPage.body.data.items)).toBe(true);

    const cursor = firstPage.body.data.nextCursor;

    if (cursor) {
      const secondPage = await api()
        .get(`/v1/rewards/history?limit=1&cursor=${encodeURIComponent(cursor)}`)
        .set("authorization", `Bearer ${user.accessToken}`)
        .expect(200);

      expect(secondPage.body.ok).toBe(true);
      expect(Array.isArray(secondPage.body.data.items)).toBe(true);
    }
  });

  it("supports wallet ledger cursor pagination", async () => {
    const user = await getPrimaryUserToken();

    const res = await api()
      .get("/v1/wallet/ledger?limit=1")
      .set("authorization", `Bearer ${user.accessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("nextCursor");
  });

  it("supports attention history cursor pagination", async () => {
    const user = await getPrimaryUserToken();

    const res = await api()
      .get("/v1/attention/history?limit=1")
      .set("authorization", `Bearer ${user.accessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("nextCursor");
  });
});
