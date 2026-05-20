import { beforeEach, describe, expect, it } from "vitest";
import {
  applyRewardIssuanceResult,
  calculateWalletSummary,
  createWallet,
  getWallet,
  lockCoinLot,
  releasePendingLots,
  resetWalletStoreForTests,
  revokeCoinLot
} from "../wallet-store";
import { issueRewardFromVerifiedEvent } from "../reward-issuance-engine";
import type { AlphabetEvent } from "../../../types/alphabet/event.types";

function makeEvent(overrides: Partial<AlphabetEvent> = {}): AlphabetEvent {
  return {
    eventId: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    coinCode: "A",
    eventType: "attention_verified",
    objectType: "campaign",
    objectId: crypto.randomUUID(),
    sourceContext: "earn",
    rawScore: 0.9,
    qualityScore: 0.8,
    trustScoreAtEvent: 75,
    riskScore: 0.1,
    ageBand: "18_plus",
    verificationStatus: "verified",
    metadata: {},
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

describe("wallet-store", () => {
  beforeEach(() => {
    resetWalletStoreForTests();
  });

  it("creates one wallet per user", () => {
    const userId = crypto.randomUUID();

    const walletA = createWallet(userId);
    const walletB = createWallet(userId);

    expect(walletA.walletId).toBe(walletB.walletId);
    expect(getWallet(userId)?.walletId).toBe(walletA.walletId);
  });

  it("attention_verified creates pending aCoin lot", () => {
    const userId = crypto.randomUUID();
    const wallet = createWallet(userId);
    const event = makeEvent({ userId });

    const result = issueRewardFromVerifiedEvent({
      walletId: wallet.walletId,
      context: {
        event,
        trustScore: 75,
        trustTier: 3,
        qualityScore: 0.8,
        riskScore: 0.1,
        ageBand: "18_plus",
        hasBudgetSource: true
      }
    });

    expect(result.issued).toBe(true);
    expect(result.coinLot?.coinCode).toBe("A");
    expect(result.coinLot?.state).toBe("pending");

    applyRewardIssuanceResult(result);

    const summary = calculateWalletSummary(wallet.walletId);
    const aCoin = summary.coins.find((coin) => coin.coinCode === "A");

    expect(aCoin?.pendingBalance).toBeGreaterThan(0);
    expect(aCoin?.availableBalance).toBe(0);
  });

  it("pending lot increases pending balance", () => {
    const userId = crypto.randomUUID();
    const wallet = createWallet(userId);
    const event = makeEvent({ userId });

    const result = issueRewardFromVerifiedEvent({
      walletId: wallet.walletId,
      context: {
        event,
        trustScore: 75,
        trustTier: 3,
        qualityScore: 0.8,
        riskScore: 0.1,
        ageBand: "18_plus",
        hasBudgetSource: true
      }
    });

    applyRewardIssuanceResult(result);

    const summary = calculateWalletSummary(wallet.walletId);
    expect(summary.totals.pendingValue).toBeGreaterThan(0);
  });

  it("releasePendingLots moves pending balance to available balance", () => {
    const userId = crypto.randomUUID();
    const wallet = createWallet(userId);
    const event = makeEvent({ userId });

    const result = issueRewardFromVerifiedEvent({
      walletId: wallet.walletId,
      context: {
        event,
        trustScore: 75,
        trustTier: 3,
        qualityScore: 0.8,
        riskScore: 0.1,
        ageBand: "18_plus",
        hasBudgetSource: true
      }
    });

    applyRewardIssuanceResult(result);

    const future = new Date();
    future.setHours(future.getHours() + 25);

    releasePendingLots(wallet.walletId, future);

    const summary = calculateWalletSummary(wallet.walletId);
    const aCoin = summary.coins.find((coin) => coin.coinCode === "A");

    expect(aCoin?.pendingBalance).toBe(0);
    expect(aCoin?.availableBalance).toBeGreaterThan(0);
  });

  it("lockCoinLot moves balance into locked balance", () => {
    const userId = crypto.randomUUID();
    const wallet = createWallet(userId);
    const event = makeEvent({ userId });

    const result = issueRewardFromVerifiedEvent({
      walletId: wallet.walletId,
      context: {
        event,
        trustScore: 75,
        trustTier: 3,
        qualityScore: 0.8,
        riskScore: 0.1,
        ageBand: "18_plus",
        hasBudgetSource: true
      }
    });

    applyRewardIssuanceResult(result);

    if (!result.coinLot) throw new Error("Expected coin lot.");

    lockCoinLot(result.coinLot.lotId, "risk_review");

    const summary = calculateWalletSummary(wallet.walletId);
    const aCoin = summary.coins.find((coin) => coin.coinCode === "A");

    expect(aCoin?.pendingBalance).toBe(0);
    expect(aCoin?.lockedBalance).toBeGreaterThan(0);
  });

  it("revokeCoinLot removes remaining balance", () => {
    const userId = crypto.randomUUID();
    const wallet = createWallet(userId);
    const event = makeEvent({ userId });

    const result = issueRewardFromVerifiedEvent({
      walletId: wallet.walletId,
      context: {
        event,
        trustScore: 75,
        trustTier: 3,
        qualityScore: 0.8,
        riskScore: 0.1,
        ageBand: "18_plus",
        hasBudgetSource: true
      }
    });

    applyRewardIssuanceResult(result);

    if (!result.coinLot) throw new Error("Expected coin lot.");

    revokeCoinLot(result.coinLot.lotId, "fraud_detected");

    const summary = calculateWalletSummary(wallet.walletId);
    const aCoin = summary.coins.find((coin) => coin.coinCode === "A");

    expect(aCoin?.pendingBalance).toBe(0);
    expect(aCoin?.availableBalance).toBe(0);
    expect(aCoin?.lockedBalance).toBe(0);
  });
});
