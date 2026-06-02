import { describe, expect, it } from "vitest";

import { createAppealHoldFromReview } from "../../settlement/appeal-hold-service.js";
import type { ProofReviewRecord } from "../../review/proof-review-store.js";

function review(status: ProofReviewRecord["status"]): ProofReviewRecord {
  return {
    sessionId: "sess_appeal_1",
    userId: "user-1",
    localUserRef: "local-1",
    contentId: "content-1",
    offerId: "nike-pegasus-41-watch",
    status,
    reviewedAt: "2026-06-02T12:00:00.000Z",
    lifecycleEvents: [],
    review: { status, reviewedAt: "2026-06-02T12:00:00.000Z", reasons: [], layerOutcomes: null }
  };
}

describe("createAppealHoldFromReview", () => {
  it("creates appeal_pending hold for escalated review", () => {
    const result = createAppealHoldFromReview(review("escalated"), {
      appealExpiresAt: "2026-06-09T12:00:00.000Z"
    });

    expect(result.outcome).toBe("created");
    expect(result.hold?.status).toBe("appeal_pending");
    expect(result.hold?.releaseStatus).toBe("release_blocked");
    expect(result.hold?.appealExpiresAt).toBe("2026-06-09T12:00:00.000Z");
    expect(result.hold?.reverifyUsed).toBe(false);
  });

  it("skips approved reviews", () => {
    const result = createAppealHoldFromReview(review("approved"));
    expect(result.outcome).toBe("skipped");
    expect(result.skipReason).toBe("not_appeal_review_status");
  });
});
