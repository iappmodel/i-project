import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, afterEach } from "vitest";

import {
  createValidatorStores,
  validateProofPacket
} from "../src/validate-handler.js";
import { createSupabaseSettlementClient } from "../src/supabase-settlement-client.js";
import pp000001 from "../../fixtures/PP-000001.json" with { type: "json" };

describe("validateProofPacket", () => {
  let dataDir: string;

  afterEach(() => {
    if (dataDir) {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });

  it("pending mode returns review + pending hold", async () => {
    dataDir = mkdtempSync(join(tmpdir(), "pop-validator-"));
    const stores = createValidatorStores(dataDir);
    const packet = structuredClone(pp000001) as typeof pp000001;

    const result = await validateProofPacket(
      { packet, mode: "pending", artifactId: "PP-000001" },
      { stores, supabase: createSupabaseSettlementClient(null) }
    );

    expect(result.mode).toBe("pending");
    if (result.mode !== "pending") return;

    expect(result.reviewStatus).toBe("approved");
    expect(result.holdOutcome).toBe("created");
    expect(result.hold?.amount).toBe(100);
    expect(result.hold?.currency).toBe("icoin");
    expect(result.hold?.status).toBe("pending");
    expect(result.supabase?.enabled).toBe(false);
  });

  it("is idempotent on rerun for same sessionId", async () => {
    dataDir = mkdtempSync(join(tmpdir(), "pop-validator-"));
    const stores = createValidatorStores(dataDir);
    const packet = structuredClone(pp000001) as typeof pp000001;

    const first = await validateProofPacket({ packet, mode: "pending" }, { stores });
    const second = await validateProofPacket({ packet, mode: "pending" }, { stores });

    expect(first.mode).toBe("pending");
    expect(second.mode).toBe("pending");
    if (second.mode !== "pending") return;

    expect(second.reviewOutcome).toBe("existing");
    expect(second.holdOutcome).toBe("existing");
  });

  it("full mode runs golden-path value flow", async () => {
    dataDir = mkdtempSync(join(tmpdir(), "pop-validator-"));
    const stores = createValidatorStores(dataDir);
    const packet = structuredClone(pp000001) as typeof pp000001;
    packet.sessionId = "sess_full_mode_golden_path";

    const result = await validateProofPacket(
      {
        packet,
        mode: "full",
        artifactId: "PP-FULL-001",
        submittedAt: "2026-05-23T12:00:00.000Z"
      },
      { stores, supabase: createSupabaseSettlementClient(null) }
    );

    expect(result.mode).toBe("full");
    if (result.mode !== "full") return;

    expect(result.reviewStatus).toBe("approved");
    expect(result.holdAmount).toBe(100);
    expect(result.walletCreditAmount).toBe(100);
    expect(result.availableMinor).toBe(100);
  });
});
