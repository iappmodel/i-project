import { describe, expect, it } from "vitest";
import {
  buildKeyMetadata,
  isMoneyScope,
  isPast,
  secondsSince
} from "../idempotency-expiry-normalizers";

describe("idempotency-expiry-normalizers", () => {
  it("detects past timestamps", () => {
    expect(isPast("2026-04-27T00:00:00.000Z", "2026-04-27T00:00:01.000Z")).toBe(true);
  });

  it("calculates seconds since timestamp", () => {
    expect(secondsSince("2026-04-27T00:00:00.000Z", "2026-04-27T00:01:00.000Z")).toBe(60);
  });

  it("detects money scopes", () => {
    expect(isMoneyScope("wallet.withdrawal", "ledger_entry")).toBe(true);
    expect(isMoneyScope("content.like", "reaction")).toBe(false);
  });

  it("builds idempotency key metadata", () => {
    const meta = buildKeyMetadata(
      {
        idempotency_key: "idem_1",
        scope: "wallet.withdrawal",
        hit_count: 5
      },
      "idempotency"
    );

    expect(meta.keyValue).toBe("idem_1");
    expect(meta.keyType).toBe("idempotency");
    expect(meta.hitCount).toBe(5);
  });
});
