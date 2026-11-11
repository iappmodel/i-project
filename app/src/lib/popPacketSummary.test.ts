import { describe, expect, it } from "vitest"
import { buildDemoProofPacket } from "./demoProofPacket"
import { summarizeProofPacket } from "./popPacketSummary"
import { DEFAULT_SPONSORED_OFFER } from "../data/demoData"

describe("popPacketSummary", () => {
  it("summarizes packet without exposing eye-tracking detail", () => {
    const session = {
      id: "sess_test_001",
      offerId: "offer-1",
      status: "validated" as const,
      createdAt: Date.now() - 5000,
      validatedAt: Date.now(),
      attentionSamples: [{ t: Date.now(), score: 82 }],
      peakAttentionScore: 82,
    }
    const packet = buildDemoProofPacket({ session, offer: DEFAULT_SPONSORED_OFFER })
    const summary = summarizeProofPacket(packet)
    expect(summary.sessionId).toBe("sess_test_001")
    expect(summary.reviewStatus).toBe("pending")
    expect(summary.rewardEligibility).toBeGreaterThan(0)
    expect(summary).not.toHaveProperty("eyeTracking")
  })
})
