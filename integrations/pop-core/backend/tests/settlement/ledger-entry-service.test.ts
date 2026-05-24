import { describe, expect, it } from "vitest";
import { ProofReviewService } from "../../review/proof-review-service.js";
import { InMemoryProofReviewStore } from "../../review/proof-review-store.js";
import {
  LEDGER_BOUNDARY_V1,
  deriveLedgerEntryId
} from "../../settlement/ledger-entry.js";
import {
  LedgerEntryService,
  postLedgerCreditFromReleaseExecution
} from "../../settlement/ledger-entry-service.js";
import { InMemoryLedgerEntryStore } from "../../settlement/ledger-entry-store.js";
import { createPendingHoldFromReview } from "../../settlement/pending-hold-service.js";
import {
  RELEASE_EXECUTION_BOUNDARY_V1,
  deriveReleaseExecutionRef
} from "../../settlement/release-execution.js";
import { executePendingHoldRelease } from "../../settlement/release-execution-service.js";
import { InMemoryReleaseExecutionStore } from "../../settlement/release-execution-store.js";
import { InMemoryPendingHoldStore } from "../../settlement/pending-hold-store.js";
import { pp000001Packet } from "../fixtures/pp-000001-packet.js";
import { buildReleaseExecutionRecordFixture } from "./release-execution-store.contract.js";

const SESSION_ID = "sess_ledger_entry_service";
const EXECUTED_AT = "2026-05-23T12:02:00.000Z";

describe("postLedgerCreditFromReleaseExecution", () => {
  it("posts ledger credit and returns boundaryVersion LEDGER_BOUNDARY_V1", () => {
    const store = new InMemoryLedgerEntryStore();
    const execution = buildReleaseExecutionRecordFixture({ sessionId: SESSION_ID, amount: 100 });

    const result = postLedgerCreditFromReleaseExecution(execution, { store });

    expect(result.outcome).toBe("posted");
    expect(result.sessionId).toBe(SESSION_ID);
    expect(result.entry?.boundaryVersion).toBe(LEDGER_BOUNDARY_V1);
    expect(result.entry?.sourceRef).toBe(execution.executionRef);
    expect(result.entry?.ledgerEntryId).toBe(deriveLedgerEntryId(execution.executionRef));
    expect(result.entry?.amount).toBe(execution.amount);
    expect(result.entry?.currency).toBe(execution.currency);
    expect(result.entry?.status).toBe("pending_wallet_credit");
    expect(store.getBySourceRef(execution.executionRef)).toEqual(result.entry);
    expect(store.getBySessionId(SESSION_ID)).toEqual(result.entry);
  });

  it("returns existing entry for duplicate sourceRef", () => {
    const store = new InMemoryLedgerEntryStore();
    const execution = buildReleaseExecutionRecordFixture({ sessionId: SESSION_ID, amount: 100 });

    const first = postLedgerCreditFromReleaseExecution(execution, { store });
    const second = postLedgerCreditFromReleaseExecution(execution, { store });

    expect(first.outcome).toBe("posted");
    expect(second.outcome).toBe("existing");
    expect(second.entry).toBe(first.entry);
  });

  it("does not mutate ReleaseExecutionRecord", () => {
    const store = new InMemoryLedgerEntryStore();
    const execution = buildReleaseExecutionRecordFixture({ sessionId: SESSION_ID, amount: 100 });
    const snapshot = structuredClone(execution);

    postLedgerCreditFromReleaseExecution(execution, { store });

    expect(execution).toEqual(snapshot);
  });

  it("chains PR8 release execution to PR9 ledger post end-to-end", () => {
    const reviewStore = new InMemoryProofReviewStore();
    const holdStore = new InMemoryPendingHoldStore();
    const executionStore = new InMemoryReleaseExecutionStore();
    const ledgerStore = new InMemoryLedgerEntryStore();
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
    expect(ledgerResult.entry?.sourceRef).toBe(releaseResult.execution?.executionRef);
    expect(ledgerResult.entry?.amount).toBe(releaseResult.execution?.amount);
    expect(ledgerResult.entry?.currency).toBe(releaseResult.execution?.currency);
    expect(ledgerResult.entry?.sessionId).toBe(record.sessionId);
    expect(ledgerStore.getBySourceRef(releaseResult.execution!.executionRef)).toEqual(
      ledgerResult.entry
    );
  });
});

describe("LedgerEntryService", () => {
  it("delegates postLedgerCreditFromReleaseExecution and lookup by sourceRef and sessionId", () => {
    const store = new InMemoryLedgerEntryStore();
    const service = new LedgerEntryService(store);
    const execution = buildReleaseExecutionRecordFixture({ sessionId: SESSION_ID, amount: 100 });

    const result = service.postLedgerCreditFromReleaseExecution(execution);

    expect(result.outcome).toBe("posted");
    expect(result.entry?.boundaryVersion).toBe(LEDGER_BOUNDARY_V1);
    expect(service.getEntryBySourceRef(execution.executionRef)).toEqual(result.entry);
    expect(service.getEntryBySessionId(SESSION_ID)).toEqual(result.entry);
  });
});
