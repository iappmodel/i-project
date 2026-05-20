import { beforeEach, describe, expect, it } from "vitest";
import {
  completePresenceSession,
  createLocalOffer,
  getLocalOffer,
  getPresenceSession,
  getPresenceVerificationResult,
  markPresenceArrived,
  resetPresenceStoreForTests,
  startPresenceSession,
  updatePresenceDwell,
  verifyStoredPresenceSession
} from "../presence-session-store";

describe("presence-session-store", () => {
  beforeEach(() => {
    resetPresenceStoreForTests();
  });

  it("creates local offer", () => {
    const offer = createLocalOffer({
      businessId: crypto.randomUUID(),
      locationId: crypto.randomUUID(),
      title: "Free coffee check-in",
      context: "local_offer",
      rewardCoin: "P",
      expectedRewardAmount: 5,
      requiresPurchaseProof: false,
      requiresQrProof: true,
      requiresNfcProof: false,
      requiresBluetoothProof: false,
      guardianRequiredForMinors: true
    });

    expect(offer.active).toBe(true);
    const stored = getLocalOffer(offer.offerId);
    expect(stored?.offerId).toBe(offer.offerId);
  });

  it("starts presence session from offer", () => {
    const offer = createLocalOffer({
      businessId: crypto.randomUUID(),
      locationId: crypto.randomUUID(),
      title: "Check in",
      context: "local_offer",
      rewardCoin: "P",
      expectedRewardAmount: 5,
      requiresPurchaseProof: false,
      requiresQrProof: true,
      requiresNfcProof: false,
      requiresBluetoothProof: false,
      guardianRequiredForMinors: true
    });

    const session = startPresenceSession({
      userId: crypto.randomUUID(),
      context: "local_offer",
      offerId: offer.offerId,
      requiredDwellMs: 2 * 60 * 1000,
      ageBand: "18_plus"
    });

    expect(session.status).toBe("started");
    expect(session.offerId).toBe(offer.offerId);
    expect(session.businessId).toBe(offer.businessId);
  });

  it("marks arrived and updates dwell", () => {
    const session = startPresenceSession({
      userId: crypto.randomUUID(),
      context: "store_visit",
      businessId: crypto.randomUUID(),
      locationId: crypto.randomUUID(),
      requiredDwellMs: 2 * 60 * 1000,
      ageBand: "18_plus"
    });

    const arrived = markPresenceArrived(session.presenceSessionId);
    expect(arrived.status).toBe("arrived");

    const updated = updatePresenceDwell({
      presenceSessionId: session.presenceSessionId,
      dwellMs: 2 * 60 * 1000
    });

    expect(updated.dwellMs).toBe(2 * 60 * 1000);
  });

  it("prevents dwell moving backwards", () => {
    const session = startPresenceSession({
      userId: crypto.randomUUID(),
      context: "store_visit",
      businessId: crypto.randomUUID(),
      locationId: crypto.randomUUID(),
      requiredDwellMs: 2 * 60 * 1000,
      ageBand: "18_plus"
    });

    updatePresenceDwell({
      presenceSessionId: session.presenceSessionId,
      dwellMs: 2 * 60 * 1000
    });

    expect(() =>
      updatePresenceDwell({
        presenceSessionId: session.presenceSessionId,
        dwellMs: 10 * 1000
      })
    ).toThrow();
  });

  it("completes presence session", () => {
    const session = startPresenceSession({
      userId: crypto.randomUUID(),
      context: "store_visit",
      businessId: crypto.randomUUID(),
      locationId: crypto.randomUUID(),
      requiredDwellMs: 2 * 60 * 1000,
      ageBand: "18_plus"
    });

    const completed = completePresenceSession(session.presenceSessionId);
    expect(completed.status).toBe("completed");
    expect(completed.completedAt).toBeTruthy();
  });

  it("verifies stored presence session", () => {
    const offer = createLocalOffer({
      businessId: crypto.randomUUID(),
      locationId: crypto.randomUUID(),
      title: "Check in",
      context: "local_offer",
      rewardCoin: "P",
      expectedRewardAmount: 5,
      requiresPurchaseProof: false,
      requiresQrProof: true,
      requiresNfcProof: false,
      requiresBluetoothProof: false,
      guardianRequiredForMinors: true
    });

    const session = startPresenceSession({
      userId: crypto.randomUUID(),
      context: "local_offer",
      offerId: offer.offerId,
      requiredDwellMs: 2 * 60 * 1000,
      ageBand: "18_plus"
    });

    markPresenceArrived(session.presenceSessionId);
    updatePresenceDwell({
      presenceSessionId: session.presenceSessionId,
      dwellMs: 2 * 60 * 1000
    });
    completePresenceSession(session.presenceSessionId);

    const result = verifyStoredPresenceSession({
      presenceSessionId: session.presenceSessionId,
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
      deviceIntegrityScore: 0.9
    });

    expect(result.status).toBe("local_action_verified");

    const stored = getPresenceVerificationResult(session.presenceSessionId);
    expect(stored?.status).toBe("local_action_verified");

    const updatedSession = getPresenceSession(session.presenceSessionId);
    expect(updatedSession?.status).toBe("local_action_verified");
  });
});
