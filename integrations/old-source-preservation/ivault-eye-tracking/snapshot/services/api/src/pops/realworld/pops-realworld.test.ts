import { describe, expect, it } from "vitest";
import { POPS_PROOF_LEVEL } from "../types/pops.types";
import { POPS_RETENTION_POLICY } from "../privacy/pops-privacy-receipt.types";
import { PopsLocationProofService } from "./pops-location-proof.service";
import { PopsMerchantConfirmationService } from "./pops-merchant-confirmation.service";
import { InMemoryPopsNfcOneTimeStore, PopsNfcProofService } from "./pops-nfc-proof.service";
import { InMemoryPopsQrNonceStore, PopsQrProofService } from "./pops-qr-proof.service";
import {
  aggregateRealWorldDecision,
  buildRealWorldPrivacyDisclosure,
  evaluateLocationFraudRisk,
  POPS_REALWORLD_USER_COPY,
  POPS_REAL_WORLD_RULES,
} from "./pops-realworld-rules";
import {
  POPS_LOCATION_CLASS,
  POPS_REAL_WORLD_MIN_PROOF_LEVEL,
  POPS_REAL_WORLD_PROOF_TYPE,
  realWorldProofAllowedForLevel,
} from "./pops-realworld.types";

describe("P.O.P.S Stage 35 — real-world proof", () => {
  it("gates real-world module at LEVEL_4_IDENTITY_CONTINUITY", () => {
    expect(POPS_REAL_WORLD_MIN_PROOF_LEVEL).toBe("LEVEL_4_IDENTITY_CONTINUITY");
    expect(realWorldProofAllowedForLevel(POPS_PROOF_LEVEL.LEVEL_3_INTENT)).toBe(false);
    expect(realWorldProofAllowedForLevel(POPS_PROOF_LEVEL.LEVEL_4_IDENTITY_CONTINUITY)).toBe(true);
    expect(realWorldProofAllowedForLevel(POPS_PROOF_LEVEL.LEVEL_5_HIGH_VALUE)).toBe(true);
  });

  it("exposes user copy strings", () => {
    expect(POPS_REALWORLD_USER_COPY.verifyingVisit).toContain("verifying this visit");
    expect(POPS_REALWORLD_USER_COPY.scanConfirmed).toBe("Scan confirmed.");
  });

  it("documents normative rules", () => {
    expect(POPS_REAL_WORLD_RULES.QR_SCAN).toContain("reuse");
    expect(POPS_REAL_WORLD_RULES.MOTION_CONSISTENCY.toLowerCase()).toContain("wheelchair");
  });

  it("PopsLocationProofService prefers class and gates precise geofence on permission", () => {
    const svc = new PopsLocationProofService();
    const now = 1_700_000_000_000;
    const base = {
      locationClass: POPS_LOCATION_CLASS.MERCHANT_VICINITY,
      isLocalVisitCampaign: true,
      campaignRequiresExactAddress: false,
      insideGeofence: true,
      geofenceConfidence: 0.82,
      nowMs: now,
      sessionStartedAtMs: now - 120_000,
      sessionEndedAtMs: now,
      minimumDwellMs: 60_000,
      campaignTimeWindowStartMs: now - 3600_000,
      campaignTimeWindowEndMs: now + 3600_000,
    };

    const withoutPerm = svc.evaluate({ ...base, precisePermissionGranted: false });
    expect(withoutPreciseGeofence(withoutPerm.proofTypes)).toBe(true);
    expect(withoutPerm.preciseGeofenceUsed).toBe(false);

    const withPerm = svc.evaluate({ ...base, precisePermissionGranted: true });
    expect(withPerm.preciseGeofenceUsed).toBe(true);
    expect(withPerm.storeExactAddressRecommended).toBe(false);

    const exactAddr = svc.evaluate({
      ...base,
      precisePermissionGranted: false,
      campaignRequiresExactAddress: true,
    });
    expect(exactAddr.storeExactAddressRecommended).toBe(true);
  });

  it("PopsQrProofService enforces signature, TTL, and JTI reuse", () => {
    const store = new InMemoryPopsQrNonceStore();
    const svc = new PopsQrProofService(store);
    const secret = "campaign-secret";
    const now = 1_700_000_000_000;
    const payload = {
      qrScanId: "qr_1",
      jti: "jti-one",
      campaignId: "camp_a",
      merchantId: "merch_a",
      issuedAtMs: now - 1000,
      expiresAtMs: now + 60_000,
    };
    const envelope = svc.createSignedEnvelope(payload, secret);
    const first = svc.verify({
      envelope,
      secret,
      expectedCampaignId: "camp_a",
      expectedMerchantId: "merch_a",
      nowMs: now,
    });
    expect(first.ok).toBe(true);
    expect(first.qrProofScore).toBeGreaterThan(0.9);

    const second = svc.verify({
      envelope,
      secret,
      expectedCampaignId: "camp_a",
      expectedMerchantId: "merch_a",
      nowMs: now,
    });
    expect(second.ok).toBe(false);
    expect(second.qrReuseSuspected).toBe(true);

    expect(() =>
      svc.createSignedEnvelope(
        { ...payload, jti: "x", expiresAtMs: now + 20 * 60_000, issuedAtMs: now },
        secret,
      ),
    ).toThrow("QR_TTL_EXCEEDS_POLICY_MAX");
  });

  it("PopsNfcProofService rejects session token reuse", () => {
    const store = new InMemoryPopsNfcOneTimeStore();
    const svc = new PopsNfcProofService(store);
    const secret = "nfc-secret";
    const now = 1_700_000_000_000;
    const payload = {
      nfcTapId: "nfc_1",
      terminalId: "term_1",
      sessionToken: "tok_once",
      merchantId: "merch_a",
      deviceBindingId: "device_xyz",
      issuedAtMs: now - 500,
      expiresAtMs: now + 120_000,
    };
    const env = svc.createSignedEnvelope(payload, secret);
    const ok = svc.verify({
      envelope: env,
      secret,
      expectedMerchantId: "merch_a",
      expectedDeviceBindingId: "device_xyz",
      nowMs: now,
    });
    expect(ok.ok).toBe(true);

    const replay = svc.verify({
      envelope: env,
      secret,
      expectedMerchantId: "merch_a",
      expectedDeviceBindingId: "device_xyz",
      nowMs: now,
    });
    expect(replay.ok).toBe(false);
  });

  it("PopsMerchantConfirmationService binds session, user, and campaign", () => {
    const svc = new PopsMerchantConfirmationService();
    const secret = "msecret";
    const payload = {
      merchantConfirmationId: "mc1",
      merchantId: "merch_a",
      campaignId: "camp_a",
      sessionId: "sess_1",
      userId: "user_1",
      action: "VISIT" as const,
      confirmedAtMs: Date.now(),
    };
    const signature = svc.signPayloadForTests(payload, secret);
    const good = svc.verify({
      signature,
      payload,
      secret,
      expectedCampaignId: "camp_a",
      expectedSessionId: "sess_1",
      expectedUserId: "user_1",
      boundMerchantId: "merch_a",
      recentSelfConfirmCount: 0,
    });
    expect(good.ok).toBe(true);

    const wrongMerchant = svc.verify({
      signature,
      payload,
      secret,
      expectedCampaignId: "camp_a",
      expectedSessionId: "sess_1",
      expectedUserId: "user_1",
      boundMerchantId: "merch_other",
      recentSelfConfirmCount: 0,
    });
    expect(wrongMerchant.ok).toBe(false);

    const velocity = svc.verify({
      signature,
      payload,
      secret,
      expectedCampaignId: "camp_a",
      expectedSessionId: "sess_1",
      expectedUserId: "user_1",
      boundMerchantId: "merch_a",
      recentSelfConfirmCount: 9,
    });
    expect(velocity.merchantSelfFraudRisk).toBe(true);
  });

  it("evaluateLocationFraudRisk and aggregateRealWorldDecision combine signals", () => {
    const fraud = evaluateLocationFraudRisk({
      proofTypes: [POPS_REAL_WORLD_PROOF_TYPE.MOTION_CONSISTENCY],
      geofenceConfidence: 0.1,
      motionConsistencyScore: 0.15,
      timeWindowValid: false,
      qrReuseSuspected: true,
      qrShareSuspected: false,
      merchantSelfFraudRisk: false,
      impossibleTravelSuspected: false,
      repeatedVisitsRiskScore: 0,
      deviceFarmClusterSuspected: false,
    });
    expect(fraud).toBe("CRITICAL");

    const decision = aggregateRealWorldDecision({
      locationFraudRisk: "LOW",
      locationProofScore: 0.72,
      qrProofScore: 0.9,
      nfcProofScore: 0,
      merchantProofScore: 0.88,
      dwellSatisfied: true,
      motionSupportScore: 0.62,
    });
    expect(decision.recommendedAction).toBe("ALLOW");
    expect(decision.realWorldPresenceConfidence).toBeGreaterThan(0.5);
  });

  it("buildRealWorldPrivacyDisclosure lists receipt fields", () => {
    const d = buildRealWorldPrivacyDisclosure({
      locationClassUsed: POPS_LOCATION_CLASS.CITY,
      preciseGeofenceUsed: false,
      qrUsed: true,
      nfcUsed: false,
      merchantConfirmationUsed: true,
      retentionPolicy: POPS_RETENTION_POLICY.THIRTY_DAYS,
    });
    expect(d.preciseLocationUsed).toBe(false);
    expect(d.retentionPolicy).toBe(POPS_RETENTION_POLICY.THIRTY_DAYS);
  });
});

function withoutPreciseGeofence(types: string[]): boolean {
  return !types.includes("PRECISE_GEOFENCE");
}
