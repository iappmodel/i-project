import { describe, expect, it } from "vitest";
import { ProofReviewService } from "../../review/proof-review-service.js";
import { InMemoryProofReviewStore } from "../../review/proof-review-store.js";
import {
  LEDGER_BOUNDARY_V1,
  buildLedgerCreditEntryFromReleaseExecution
} from "../../settlement/ledger-entry.js";
import {
  WALLET_BOUNDARY_V1,
  deriveWalletCreditId
} from "../../settlement/wallet-credit.js";
import {
  WalletCreditService,
  WalletOwnerNotFoundError,
  applyWalletCreditFromLedgerEntry
} from "../../settlement/wallet-credit-service.js";
import { InMemoryWalletCreditStore } from "../../settlement/wallet-credit-store.js";
import { createHoldReviewWalletOwnerResolver } from "../../settlement/wallet-owner-resolver.js";
import { createPendingHoldFromReview } from "../../settlement/pending-hold-service.js";
import { postLedgerCreditFromReleaseExecution } from "../../settlement/ledger-entry-service.js";
import { InMemoryLedgerEntryStore } from "../../settlement/ledger-entry-store.js";
import { RELEASE_EXECUTION_BOUNDARY_V1 } from "../../settlement/release-execution.js";
import { executePendingHoldRelease } from "../../settlement/release-execution-service.js";
import { InMemoryReleaseExecutionStore } from "../../settlement/release-execution-store.js";
import { InMemoryPendingHoldStore } from "../../settlement/pending-hold-store.js";
import { pp000001Packet } from "../fixtures/pp-000001-packet.js";
import { buildLedgerEntryFixture } from "./ledger-entry-store.contract.js";
import { buildPendingHoldRecord } from "./pending-hold-store.contract.js";
import { buildReleaseExecutionRecordFixture } from "./release-execution-store.contract.js";

const SESSION_ID = "sess_wallet_credit_service";
const EXECUTED_AT = "2026-05-23T12:02:00.000Z";
const CREDITED_AT = "2026-05-23T12:03:00.000Z";

function createStoresWithHold(sessionId = SESSION_ID) {
  const holdStore = new InMemoryPendingHoldStore();
  const reviewStore = new InMemoryProofReviewStore();
  const hold = buildPendingHoldRecord({ sessionId });
  holdStore.save(hold);

  return { holdStore, reviewStore, hold };
}

describe("applyWalletCreditFromLedgerEntry", () => {
  it("returns boundaryVersion WALLET_BOUNDARY_V1", () => {
    const walletStore = new InMemoryWalletCreditStore();
    const { holdStore, reviewStore } = createStoresWithHold();
    const ledger = buildLedgerEntryFixture({ sessionId: SESSION_ID, amount: 100 });

    const result = applyWalletCreditFromLedgerEntry(ledger, {
      walletCreditStore: walletStore,
      holdStore,
      reviewStore
    });

    expect(result.outcome).toBe("credited");
    expect(result.credit.boundaryVersion).toBe(WALLET_BOUNDARY_V1);
  });

  it("returns sourceBoundaryVersion LEDGER_BOUNDARY_V1", () => {
    const walletStore = new InMemoryWalletCreditStore();
    const { holdStore, reviewStore } = createStoresWithHold();
    const ledger = buildLedgerEntryFixture({ sessionId: SESSION_ID, amount: 100 });

    const result = applyWalletCreditFromLedgerEntry(ledger, {
      walletCreditStore: walletStore,
      holdStore,
      reviewStore
    });

    expect(result.outcome).toBe("credited");
    expect(result.credit.sourceBoundaryVersion).toBe(LEDGER_BOUNDARY_V1);
  });

  it("credits wallet and returns full mapping", () => {
    const walletStore = new InMemoryWalletCreditStore();
    const { holdStore, reviewStore, hold } = createStoresWithHold();
    const ledger = buildLedgerEntryFixture({ sessionId: SESSION_ID, amount: 100 });

    const result = applyWalletCreditFromLedgerEntry(ledger, {
      walletCreditStore: walletStore,
      holdStore,
      reviewStore,
      creditedAt: CREDITED_AT
    });

    expect(result.outcome).toBe("credited");
    expect(result.sessionId).toBe(SESSION_ID);
    expect(result.walletOwnerRef).toBe(hold.localUserRef);
    expect(result.credit.sourceRef).toBe(ledger.sourceRef);
    expect(result.credit.ledgerEntryId).toBe(ledger.ledgerEntryId);
    expect(result.credit.walletCreditId).toBe(deriveWalletCreditId(ledger.sourceRef));
    expect(result.credit.amount).toBe(ledger.amount);
    expect(result.credit.currency).toBe(ledger.currency);
    expect(result.credit.creditedAt).toBe(CREDITED_AT);
    expect(walletStore.getBySourceRef(ledger.sourceRef)).toEqual(result.credit);
  });

  it("returns existing credit for duplicate sourceRef", () => {
    const walletStore = new InMemoryWalletCreditStore();
    const { holdStore, reviewStore } = createStoresWithHold();
    const ledger = buildLedgerEntryFixture({ sessionId: SESSION_ID, amount: 100 });

    const first = applyWalletCreditFromLedgerEntry(ledger, {
      walletCreditStore: walletStore,
      holdStore,
      reviewStore
    });
    const second = applyWalletCreditFromLedgerEntry(ledger, {
      walletCreditStore: walletStore,
      holdStore,
      reviewStore
    });

    expect(first.outcome).toBe("credited");
    expect(second.outcome).toBe("existing");
    expect(second.credit).toBe(first.credit);
  });

  it("does not mutate LedgerEntry", () => {
    const walletStore = new InMemoryWalletCreditStore();
    const { holdStore, reviewStore } = createStoresWithHold();
    const ledger = buildLedgerEntryFixture({ sessionId: SESSION_ID, amount: 100 });
    const snapshot = structuredClone(ledger);

    applyWalletCreditFromLedgerEntry(ledger, {
      walletCreditStore: walletStore,
      holdStore,
      reviewStore
    });

    expect(ledger).toEqual(snapshot);
  });

  it("throws WalletOwnerNotFoundError when hold and review are missing", () => {
    const walletStore = new InMemoryWalletCreditStore();
    const holdStore = new InMemoryPendingHoldStore();
    const reviewStore = new InMemoryProofReviewStore();
    const ledger = buildLedgerEntryFixture({ sessionId: SESSION_ID, amount: 100 });

    expect(() =>
      applyWalletCreditFromLedgerEntry(ledger, {
        walletCreditStore: walletStore,
        holdStore,
        reviewStore
      })
    ).toThrow(WalletOwnerNotFoundError);
  });

  it("chains PR5 through PR10 end-to-end", () => {
    const reviewStore = new InMemoryProofReviewStore();
    const holdStore = new InMemoryPendingHoldStore();
    const executionStore = new InMemoryReleaseExecutionStore();
    const ledgerStore = new InMemoryLedgerEntryStore();
    const walletStore = new InMemoryWalletCreditStore();
    const reviewService = new ProofReviewService(reviewStore);

    const record = reviewService.submitProofPacketForReview(pp000001Packet, {
      artifactId: "PP-000001"
    });
    const holdResult = createPendingHoldFromReview(record, { store: holdStore });
    expect(holdResult.outcome).toBe("created");

    const releaseResult = executePendingHoldRelease(holdResult.hold!, {
      store: executionStore,
      executedAt: EXECUTED_AT
    });
    expect(releaseResult.outcome).toBe("executed");
    expect(releaseResult.execution?.boundaryVersion).toBe(RELEASE_EXECUTION_BOUNDARY_V1);

    const ledgerResult = postLedgerCreditFromReleaseExecution(releaseResult.execution!, {
      store: ledgerStore
    });
    expect(ledgerResult.outcome).toBe("posted");
    expect(ledgerResult.entry?.boundaryVersion).toBe(LEDGER_BOUNDARY_V1);

    const walletResult = applyWalletCreditFromLedgerEntry(ledgerResult.entry!, {
      walletCreditStore: walletStore,
      holdStore,
      reviewStore,
      creditedAt: CREDITED_AT
    });

    expect(walletResult.outcome).toBe("credited");
    expect(walletResult.credit.boundaryVersion).toBe(WALLET_BOUNDARY_V1);
    expect(walletResult.credit.sourceBoundaryVersion).toBe(LEDGER_BOUNDARY_V1);
    expect(walletResult.credit.sourceRef).toBe(releaseResult.execution?.executionRef);
    expect(walletResult.credit.amount).toBe(releaseResult.execution?.amount);
    expect(walletResult.credit.currency).toBe(releaseResult.execution?.currency);
    expect(walletResult.credit.sessionId).toBe(record.sessionId);
    expect(walletResult.credit.walletOwnerRef).toBe(record.localUserRef);
    expect(walletStore.getBySourceRef(releaseResult.execution!.executionRef)).toEqual(
      walletResult.credit
    );
  });
});

describe("WalletCreditService", () => {
  it("delegates applyWalletCreditFromLedgerEntry and lookup helpers", () => {
    const walletStore = new InMemoryWalletCreditStore();
    const { holdStore, reviewStore } = createStoresWithHold();
    const service = new WalletCreditService(
      walletStore,
      createHoldReviewWalletOwnerResolver({ holdStore, reviewStore })
    );
    const execution = buildReleaseExecutionRecordFixture({ sessionId: SESSION_ID, amount: 100 });
    const ledger = buildLedgerCreditEntryFromReleaseExecution(execution);

    const result = service.applyWalletCreditFromLedgerEntry(ledger);

    expect(result.outcome).toBe("credited");
    expect(service.getCreditBySourceRef(execution.executionRef)).toEqual(result.credit);
    expect(service.listCreditsByOwnerRef(result.walletOwnerRef)).toEqual([result.credit]);
  });
});
