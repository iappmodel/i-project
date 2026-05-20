import { describe, expect, it, vi } from "vitest";

vi.mock("../../db-repositories/wallet-invariants.repository", () => ({
  listWalletAccountsForInvariantScanDb: vi.fn(async () => []),
  fetchWalletAccountInvariantBundleDb: vi.fn(),
  fetchCampaignBudgetRowDb: vi.fn(async () => null)
}));

import { runWalletInvariantScan } from "../wallet-invariant-scanner";

describe("wallet-invariant-scanner", () => {
  it("returns ok when no wallet accounts are scanned", async () => {
    const result = await runWalletInvariantScan({ limit: 100 });

    expect(result.ok).toBe(true);
    expect(result.scannedObjectCounts.walletAccounts).toBe(0);
    expect(result.mutationCounts.invariantResultsCreated).toBe(0);
    expect(result.errorPayload).toBeNull();
    expect(result.reasonCodes).toContain("wallet_invariant_scan_completed");
  });
});
