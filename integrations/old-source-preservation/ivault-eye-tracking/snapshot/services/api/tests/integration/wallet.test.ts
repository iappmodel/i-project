import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getPrimaryUserToken } from "../setup/test-users";

describe("wallet", () => {
  it("returns wallet summary in camelCase DTO shape", async () => {
    const user = await getPrimaryUserToken();

    const res = await api()
      .get("/v1/wallet/summary")
      .set("authorization", `Bearer ${user.accessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);

    if (res.body.data) {
      expect(res.body.data).toHaveProperty("walletId");
      expect(res.body.data).toHaveProperty("availableBalanceMinor");
      expect(res.body.data).toHaveProperty("pendingBalanceMinor");
      expect(res.body.data).toHaveProperty("totalBalanceMinor");

      expect(res.body.data).not.toHaveProperty("wallet_id");
      expect(res.body.data).not.toHaveProperty("available_balance_minor");
    }
  });

  it("returns wallet ledger as paginated DTO", async () => {
    const user = await getPrimaryUserToken();

    const res = await api()
      .get("/v1/wallet/ledger?limit=10")
      .set("authorization", `Bearer ${user.accessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data).toHaveProperty("nextCursor");

    const first = res.body.data.items[0];

    if (first) {
      expect(first).toHaveProperty("walletLedgerEntryId");
      expect(first).toHaveProperty("displayLabel");
      expect(first).not.toHaveProperty("wallet_ledger_entry_id");
    }
  });

  it("rejects invalid ledger limit", async () => {
    const user = await getPrimaryUserToken();

    const res = await api()
      .get("/v1/wallet/ledger?limit=100000")
      .set("authorization", `Bearer ${user.accessToken}`)
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
