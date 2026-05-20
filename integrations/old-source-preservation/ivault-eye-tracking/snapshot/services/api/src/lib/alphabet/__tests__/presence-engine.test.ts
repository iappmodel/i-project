import { describe, expect, it } from "vitest";
import type { PresenceSignalInput } from "../../../types/alphabet/presence.types";
import { verifyPresenceSession } from "../presence-engine";

function makeInput(
  overrides: Partial<PresenceSignalInput> = {}
): PresenceSignalInput {
  return {
    presenceSessionId: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    context: "local_offer",
    offerId: crypto.randomUUID(),
    businessId: crypto.randomUUID(),
    locationId: crypto.randomUUID(),
    requiredDwellMs: 2 * 60 * 1000,
    dwellMs: 2 * 60 * 1000,
    geofenceMatchScore: 0.9,
    movementConsistencyScore: 0.85,
    deviceLocationIntegrityScore: 0.9,
    networkLocationCorroborationScore: 0.8,
    qrProofScore: 0.8,
    nfcProofScore: 0.2,
    bluetoothProofScore: 0.6,
    purchaseProofScore: 0.5,
    staffConfirmationScore: 0.7,
    actionCompletionScore: 0.85,
    gpsSpoofingRisk: 0.02,
    emulatorRisk: 0.02,
    duplicateCheckinRisk: 0.03,
    impossibleTravelRisk: 0.01,
    businessCollusionRisk: 0.02,
    deviceIntegrityScore: 0.9,
    ageBand: "18_plus",
    metadata: {},
    ...overrides
  };
}

describe("presence-engine", () => {
  it("verifies clean local action", () => {
    const result = verifyPresenceSession(makeInput());

    expect(result.status).toBe("local_action_verified");
    expect(result.presenceScore).toBeGreaterThan(0.7);
    expect(result.localActionScore).toBeGreaterThan(0.65);
    expect(result.presenceVerifiedEvent?.eventType).toBe("presence_verified");
    expect(result.localActionCompletedEvent?.eventType).toBe("local_action_completed");
    expect(result.localOfferRedeemedEvent?.eventType).toBe("local_offer_redeemed");
  });

  it("verifies presence without local offer redemption when no offerId", () => {
    const result = verifyPresenceSession(
      makeInput({
        context: "store_visit",
        offerId: null,
        actionCompletionScore: 0.4
      })
    );

    expect([
      "presence_verified",
      "local_action_verified",
      "completed_needs_review"
    ]).toContain(result.status);
  });

  it("marks incomplete dwell as incomplete", () => {
    const result = verifyPresenceSession(
      makeInput({
        dwellMs: 20 * 1000
      })
    );

    expect(result.status).toBe("incomplete");
    expect(result.reasons).toContain("dwell_below_minimum");
  });

  it("rejects low geofence match", () => {
    const result = verifyPresenceSession(
      makeInput({
        geofenceMatchScore: 0.2
      })
    );

    expect(result.status).toBe("rejected");
    expect(result.reasons).toContain("geofence_match_below_minimum");
  });

  it("flags GPS spoofing as suspicious", () => {
    const result = verifyPresenceSession(
      makeInput({
        gpsSpoofingRisk: 0.95
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.spoofingEvent?.eventType).toBe("gps_spoofing_detected");
  });

  it("flags impossible travel as suspicious", () => {
    const result = verifyPresenceSession(
      makeInput({
        impossibleTravelRisk: 0.95
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.reasons).toContain("impossible_travel_risk_above_maximum");
  });

  it("flags duplicate checkin as suspicious", () => {
    const result = verifyPresenceSession(
      makeInput({
        duplicateCheckinRisk: 0.95
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.reasons).toContain("duplicate_checkin_risk_above_maximum");
  });

  it("flags business collusion as suspicious", () => {
    const result = verifyPresenceSession(
      makeInput({
        businessCollusionRisk: 0.95
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.reasons).toContain("business_collusion_risk_above_maximum");
  });

  it("blocks under 13 local offers", () => {
    const result = verifyPresenceSession(
      makeInput({
        ageBand: "under_13",
        context: "local_offer"
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.reasons).toContain("under_13_not_allowed_for_presence_context");
  });

  it("allows under 13 learning place with guardian not required", () => {
    const result = verifyPresenceSession(
      makeInput({
        context: "learning_place",
        offerId: null,
        ageBand: "under_13",
        actionCompletionScore: 0.5
      })
    );

    expect([
      "presence_verified",
      "local_action_verified",
      "completed_needs_review"
    ]).toContain(result.status);
  });
});
