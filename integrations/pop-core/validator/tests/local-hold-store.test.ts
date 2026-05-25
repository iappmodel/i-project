import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, afterEach } from "vitest";

import {
  getLocalPendingHold,
  listLocalPendingHolds,
  settleLocalHoldDemo
} from "../src/local-hold-store.js";
import { createValidatorStores, validateProofPacket } from "../src/validate-handler.js";
import { createSupabaseSettlementClient } from "../src/supabase-settlement-client.js";
import pp000001 from "../../fixtures/PP-000001.json" with { type: "json" };

describe("local hold store", () => {
  let dataDir: string;

  afterEach(() => {
    if (dataDir) {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });

  it("lists and settles holds without Supabase", async () => {
    dataDir = mkdtempSync(join(tmpdir(), "pop-local-holds-"));
    const stores = createValidatorStores(dataDir);
    const packet = structuredClone(pp000001) as typeof pp000001;
    packet.sessionId = "sess_local_smoke_001";

    await validateProofPacket(
      { packet, mode: "pending" },
      { stores, supabase: createSupabaseSettlementClient(null) }
    );

    const listed = listLocalPendingHolds(dataDir, "demo-user-001");
    expect(listed).toHaveLength(1);
    expect(listed[0]?.hold_status).toBe("pending");
    expect(listed[0]?.amount).toBe(100);

    const settled = settleLocalHoldDemo(dataDir, packet.sessionId);
    expect(settled.hold_status).toBe("settled");

    const reread = getLocalPendingHold(dataDir, packet.sessionId);
    expect(reread?.hold_status).toBe("settled");
  });
});
