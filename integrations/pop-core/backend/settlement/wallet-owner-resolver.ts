import type { ProofReviewStore } from "../review/proof-review-store.js";
import type { PendingHoldStore } from "./pending-hold-store.js";

export interface WalletOwnerIdentity {
  sessionId: string;
  userId: string | null;
  localUserRef: string;
  walletOwnerRef: string;
  resolutionSource: "hold" | "review";
}

export interface WalletOwnerResolver {
  resolveBySessionId(sessionId: string): WalletOwnerIdentity | null;
}

export function resolveWalletOwnerRef(
  userId: string | null | undefined,
  localUserRef: string
): string {
  return userId ?? localUserRef;
}

export function createHoldReviewWalletOwnerResolver(deps: {
  holdStore: PendingHoldStore;
  reviewStore: ProofReviewStore;
}): WalletOwnerResolver {
  return {
    resolveBySessionId(sessionId: string): WalletOwnerIdentity | null {
      const hold = deps.holdStore.getBySessionId(sessionId);
      if (hold) {
        return {
          sessionId: hold.sessionId,
          userId: hold.userId ?? null,
          localUserRef: hold.localUserRef,
          walletOwnerRef: resolveWalletOwnerRef(hold.userId, hold.localUserRef),
          resolutionSource: "hold"
        };
      }

      const review = deps.reviewStore.getBySessionId(sessionId);
      if (review) {
        return {
          sessionId: review.sessionId,
          userId: review.userId ?? null,
          localUserRef: review.localUserRef,
          walletOwnerRef: resolveWalletOwnerRef(review.userId, review.localUserRef),
          resolutionSource: "review"
        };
      }

      return null;
    }
  };
}
