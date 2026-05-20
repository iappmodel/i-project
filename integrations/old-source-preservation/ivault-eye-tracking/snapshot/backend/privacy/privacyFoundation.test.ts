import test from "node:test";
import assert from "node:assert/strict";
import {
  assertPrivacySafePayload,
  PrivacyViolationError,
  verifyAttentionSession,
  buildEconomicProofEnvelope,
  fanoutEconomicProof,
  enableUserPrivateStorage,
  disableUserPrivateStorage,
  assertOptionalPrivateStorageAllowed,
  runRetentionEnforcementJob,
  ConsentScope,
  PrivacyPurpose,
  RetentionPolicy,
} from "./index";

test("raw camera/gaze/biometric fields cannot be persisted", async () => {
  const audits: unknown[] = [];
  await assert.rejects(
    () =>
      assertPrivacySafePayload(
        { campaign_id: "c1", camera_frame: "blob" },
        {
          eventId: "e1",
          userId: "u1",
          actor: "unit-test",
          purpose: PrivacyPurpose.AttentionVerification,
          auditWriter: { writeAuditEvent: async (event) => audits.push(event) },
        },
      ),
    PrivacyViolationError,
  );
  assert.equal(audits.length, 1);
});

test("raw_data_included=true is rejected", async () => {
  await assert.rejects(
    () =>
      assertPrivacySafePayload(
        { raw_data_included: true, campaign_id: "c1" },
        {
          eventId: "e2",
          userId: "u1",
          actor: "unit-test",
          purpose: PrivacyPurpose.RewardIssuance,
          auditWriter: { writeAuditEvent: async () => undefined },
        },
      ),
    PrivacyViolationError,
  );
});

test("attention verification returns derived proof and cleans raw buffers", () => {
  const input = {
    userId: "u1",
    campaignId: "c1",
    rewardAmount: 250,
    deviceAttestationHash: "hash",
    camera_frame: new Uint8Array([1, 2, 3, 4]),
    gaze_vector_raw: [0.1, 0.2, 0.3],
    biometric_raw: [0.4, 0.5],
    durationMs: 20000,
    facePresentScore: 0.9,
    eyesOpenScore: 0.85,
    gazeForwardScore: 0.8,
    interactionScore: 0.9,
  };
  const proof = verifyAttentionSession(input);
  assert.equal(proof.economicProofPayload.rawDataIncluded, false);
  assert.equal(input.gaze_vector_raw?.length, 0);
  assert.equal(input.biometric_raw?.length, 0);
  assert.equal(input.camera_frame, undefined);
});

test("wallet reward issuance fanout receives no raw signal fields", async () => {
  const seenKeys = new Set<string>();
  const proof = verifyAttentionSession({
    userId: "u1",
    campaignId: "c1",
    rewardAmount: 111,
    deviceAttestationHash: "device-hash",
    durationMs: 15000,
    facePresentScore: 0.9,
    eyesOpenScore: 0.9,
    gazeForwardScore: 0.9,
    interactionScore: 0.9,
  });
  const envelope = buildEconomicProofEnvelope({
    proofId: "p1",
    consentReceiptId: "consent-1",
    deviceAttestationHash: "device-hash",
    proof,
  });
  Object.keys(envelope).forEach((key) => seenKeys.add(key));

  const collector = async (payload: Record<string, unknown>) => {
    Object.keys(payload).forEach((key) => seenKeys.add(key));
  };

  await fanoutEconomicProof(
    {
      rewardIssuanceEngine: { issueFromProof: collector },
      walletLedger: { appendProofEntry: collector },
      pendingBalanceEngine: { addPendingReward: collector },
      campaignBudgetReserveEngine: { settleProofReward: collector },
      trustScoreEngine: { ingestVerificationOutcome: collector },
    },
    envelope,
  );

  assert.equal(seenKeys.has("camera_frame"), false);
  assert.equal(seenKeys.has("gaze_vector_raw"), false);
  assert.equal(seenKeys.has("biometric_raw"), false);
});

test("user can enable and disable private storage", async () => {
  const consentState = new Map<string, boolean>();
  const storageState = new Map<string, boolean>();
  const repo = {
    upsertVaultSettings: async (userId: string, enabled: boolean) => storageState.set(userId, enabled),
    upsertConsent: async (userId: string, scope: ConsentScope, granted: boolean) => {
      consentState.set(`${userId}:${scope}`, granted);
    },
    hasConsent: async (userId: string, scope: ConsentScope) => consentState.get(`${userId}:${scope}`) === true,
  };

  await enableUserPrivateStorage(repo, "u1");
  assert.equal(storageState.get("u1"), true);
  await disableUserPrivateStorage(repo, "u1");
  assert.equal(storageState.get("u1"), false);
});

test("consent revocation blocks optional private intelligence storage", async () => {
  const repo = {
    upsertVaultSettings: async () => undefined,
    upsertConsent: async () => undefined,
    hasConsent: async () => false,
  };

  await assert.rejects(
    () => assertOptionalPrivateStorageAllowed(repo, "u1"),
    PrivacyViolationError,
  );
});

test("economic proof can persist while raw signal sessions are deleted", async () => {
  const actions: string[] = [];
  await runRetentionEnforcementJob(
    {
      findExpired: async () => [
        {
          recordId: "s1",
          tableName: "raw_signal_processing_sessions",
          userId: "u1",
          retentionPolicy: RetentionPolicy.ImmediateDelete,
          expiresAt: new Date().toISOString(),
          legalHold: false,
        },
        {
          recordId: "p1",
          tableName: "economic_proofs",
          userId: "u1",
          retentionPolicy: RetentionPolicy.RegulatoryFinancial,
          expiresAt: new Date().toISOString(),
          legalHold: true,
        },
      ],
      deleteRecord: async (table, id) => actions.push(`delete:${table}:${id}`),
      anonymizeRecord: async (table, id) => actions.push(`anonymize:${table}:${id}`),
      confirmRawSignalDeletion: async (id) => actions.push(`confirm:${id}`),
      appendAudit: async () => undefined,
    },
    new Date("2026-04-25T00:00:00.000Z"),
  );

  assert.equal(actions.includes("delete:raw_signal_processing_sessions:s1"), true);
  assert.equal(actions.includes("confirm:s1"), true);
  assert.equal(actions.includes("anonymize:economic_proofs:p1"), true);
});
