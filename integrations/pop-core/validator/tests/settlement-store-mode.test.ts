import { afterEach, describe, expect, it } from "vitest";

import { createSupabaseSettlementClient } from "../src/supabase-settlement-client.js";
import {
  readSettlementStoreMode,
  useInMemoryHoldStore
} from "../src/settlement-store-mode.js";

describe("readSettlementStoreMode", () => {
  const prev = process.env.POP_SETTLEMENT_PRIMARY;

  afterEach(() => {
    if (prev === undefined) {
      delete process.env.POP_SETTLEMENT_PRIMARY;
    } else {
      process.env.POP_SETTLEMENT_PRIMARY = prev;
    }
  });

  it("defaults to local-json when env unset", () => {
    delete process.env.POP_SETTLEMENT_PRIMARY;
    const client = createSupabaseSettlementClient(null);
    expect(readSettlementStoreMode(client)).toBe("local-json");
  });

  it("throws when supabase primary requested without credentials", () => {
    process.env.POP_SETTLEMENT_PRIMARY = "supabase";
    const client = createSupabaseSettlementClient(null);
    expect(() => readSettlementStoreMode(client)).toThrow(
      /POP_SETTLEMENT_PRIMARY=supabase requires/
    );
  });

  it("useInMemoryHoldStore only when primary + skip local json", () => {
    expect(useInMemoryHoldStore("local-json")).toBe(false);
    expect(useInMemoryHoldStore("supabase-primary")).toBe(false);
    process.env.POP_SETTLEMENT_SKIP_LOCAL_JSON = "true";
    expect(useInMemoryHoldStore("supabase-primary")).toBe(true);
    delete process.env.POP_SETTLEMENT_SKIP_LOCAL_JSON;
  });
});
