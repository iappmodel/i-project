import { describe, expect, it } from "vitest";
import {
  LEDGER_BOUNDARY_V1,
  POP_VALUE_FLOW_V1,
  PopValueFlowSkippedError,
  RELEASE_EXECUTION_BOUNDARY_V1,
  WALLET_BOUNDARY_V1,
  createDefaultPopValueFlowStores,
  runPopValueFlow
} from "../../index.js";
import { buildProofReviewRecord } from "../review/proof-review-store.contract.js";
import { pp000001Packet } from "../fixtures/pp-000001-packet.js";
import { ProofReviewService } from "../../review/proof-review-service.js";

const SUBMITTED_AT = "2026-05-23T12:00:00.000Z";
const HOLD_CREATED_AT = "2026-05-23T12:01:00.000Z";
const EXECUTED_AT = "2026-05-23T12:02:00.000Z";
const POSTED_AT = "2026-05-23T12:02:30.000Z";
const CREDITED_AT = "2026-05-23T12:03:00.000Z";

function pp000001FlowOptions(stores: ReturnType<typeof createDefaultPopValueFlowStores>) {
  return {
    stores,
    artifactId: "PP-000001",
    submittedAt: SUBMITTED_AT,
    holdCreatedAt: HOLD_CREATED_AT,
    executedAt: EXECUTED_AT,
    postedAt: POSTED_AT,
    creditedAt: CREDITED_AT
  };
}

describe("runPopValueFlow", () => {
  it("runs PP-000001 through full POP value pipeline", () => {
    const stores = createDefaultPopValueFlowStores();
    const packetBefore = structuredClone(pp000001Packet);

    const result = runPopValueFlow(pp000001Packet, pp000001FlowOptions(stores));

    expect(result.valueFlowVersion).toBe(POP_VALUE_FLOW_V1);
    expect(result.review.review.status).toBe("approved");
    expect(result.review.status).toBe("approved");
    expect(result.hold.amount).toBe(100);
    expect(result.releaseExecution.executionRef).toBeTruthy();
    expect(result.releaseExecution.boundaryVersion).toBe(RELEASE_EXECUTION_BOUNDARY_V1);
    expect(result.ledgerEntry.status).toBe("pending_wallet_credit");
    expect(result.ledgerEntry.boundaryVersion).toBe(LEDGER_BOUNDARY_V1);
    expect(result.walletCredit.amount).toBe(100);
    expect(result.walletCredit.boundaryVersion).toBe(WALLET_BOUNDARY_V1);
    expect(result.walletCredit.sourceBoundaryVersion).toBe(LEDGER_BOUNDARY_V1);
    expect(result.balance.availableMinor).toBe(100);
    expect(result.balance.creditCount).toBe(1);
    expect(result.walletCredit.walletOwnerRef).toBe("demo-user-001");

    expect(result.sourceRef).toBe(result.releaseExecution.executionRef);
    expect(result.ledgerEntry.sourceRef).toBe(result.sourceRef);
    expect(result.walletCredit.sourceRef).toBe(result.sourceRef);

    expect(result.outcomes).toEqual({
      review: "submitted",
      hold: "created",
      release: "executed",
      ledger: "posted",
      wallet: "credited"
    });

    expect(pp000001Packet).toEqual(packetBefore);
  });

  it("returns valueFlowVersion POP_VALUE_FLOW_V1", () => {
    const stores = createDefaultPopValueFlowStores();

    const result = runPopValueFlow(pp000001Packet, pp000001FlowOptions(stores));

    expect(result.valueFlowVersion).toBe("POP_VALUE_FLOW_V1");
  });

  it("does not double-credit on idempotent rerun and preserves valueFlowVersion", () => {
    const stores = createDefaultPopValueFlowStores();
    const options = pp000001FlowOptions(stores);

    const first = runPopValueFlow(pp000001Packet, options);
    const second = runPopValueFlow(pp000001Packet, options);

    expect(second.valueFlowVersion).toBe(POP_VALUE_FLOW_V1);
    expect(second.valueFlowVersion).toBe(first.valueFlowVersion);
    expect(second.outcomes).toEqual({
      review: "existing",
      hold: "existing",
      release: "existing",
      ledger: "existing",
      wallet: "existing"
    });
    expect(second.balance.availableMinor).toBe(100);
    expect(second.balance.creditCount).toBe(1);
    expect(second.walletCredit).toEqual(first.walletCredit);
    expect(second.sourceRef).toBe(first.sourceRef);
    expect(stores.walletCreditStore.listByOwnerRef("demo-user-001")).toHaveLength(1);
  });

  it("throws PopValueFlowSkippedError when review is not settlement-eligible", () => {
    const stores = createDefaultPopValueFlowStores();
    const record = buildProofReviewRecord({
      status: "rejected",
      review: {
        ...buildProofReviewRecord().review,
        status: "rejected",
        reasons: ["fraud_threshold_exceeded"]
      }
    });
    stores.reviewStore.save(record);

    expect(() =>
      runPopValueFlow(pp000001Packet, {
        stores,
        artifactId: "PP-000001"
      })
    ).toThrow(PopValueFlowSkippedError);
  });

  it("recalls existing review without resubmitting", () => {
    const stores = createDefaultPopValueFlowStores();
    const reviewService = new ProofReviewService(stores.reviewStore);
    const existing = reviewService.submitProofPacketForReview(pp000001Packet, {
      artifactId: "PP-000001",
      submittedAt: SUBMITTED_AT
    });

    const result = runPopValueFlow(pp000001Packet, pp000001FlowOptions(stores));

    expect(result.outcomes.review).toBe("existing");
    expect(result.review).toBe(existing);
  });
});
