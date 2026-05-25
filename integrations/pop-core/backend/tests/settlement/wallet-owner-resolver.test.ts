import { describe, expect, it } from "vitest";
import { buildProofReviewRecord } from "../review/proof-review-store.contract.js";
import { InMemoryProofReviewStore } from "../../review/proof-review-store.js";
import { InMemoryPendingHoldStore } from "../../settlement/pending-hold-store.js";
import {
  createHoldReviewWalletOwnerResolver,
  resolveWalletOwnerRef
} from "../../settlement/wallet-owner-resolver.js";
import { buildPendingHoldRecord } from "./pending-hold-store.contract.js";

const SESSION_ID = "sess_wallet_owner_resolver";

describe("resolveWalletOwnerRef", () => {
  it("prefers userId over localUserRef", () => {
    expect(resolveWalletOwnerRef("user-123", "local-456")).toBe("user-123");
  });

  it("falls back to localUserRef when userId is null", () => {
    expect(resolveWalletOwnerRef(null, "local-456")).toBe("local-456");
  });
});

describe("createHoldReviewWalletOwnerResolver", () => {
  it("resolves owner from hold first", () => {
    const holdStore = new InMemoryPendingHoldStore();
    const reviewStore = new InMemoryProofReviewStore();
    const hold = buildPendingHoldRecord({ sessionId: SESSION_ID });
    holdStore.save(hold);

    const resolver = createHoldReviewWalletOwnerResolver({ holdStore, reviewStore });
    const owner = resolver.resolveBySessionId(SESSION_ID);

    expect(owner).not.toBeNull();
    expect(owner?.resolutionSource).toBe("hold");
    expect(owner?.walletOwnerRef).toBe(hold.localUserRef);
    expect(owner?.userId).toBe(hold.userId ?? null);
    expect(owner?.localUserRef).toBe(hold.localUserRef);
  });

  it("falls back to review when hold is missing", () => {
    const holdStore = new InMemoryPendingHoldStore();
    const reviewStore = new InMemoryProofReviewStore();
    const review = buildProofReviewRecord({ sessionId: SESSION_ID });
    reviewStore.save(review);

    const resolver = createHoldReviewWalletOwnerResolver({ holdStore, reviewStore });
    const owner = resolver.resolveBySessionId(SESSION_ID);

    expect(owner).not.toBeNull();
    expect(owner?.resolutionSource).toBe("review");
    expect(owner?.walletOwnerRef).toBe(review.localUserRef);
  });

  it("returns null when hold and review are missing", () => {
    const holdStore = new InMemoryPendingHoldStore();
    const reviewStore = new InMemoryProofReviewStore();
    const resolver = createHoldReviewWalletOwnerResolver({ holdStore, reviewStore });

    expect(resolver.resolveBySessionId("missing-session")).toBeNull();
  });
});
