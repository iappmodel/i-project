import test from "node:test";
import assert from "node:assert/strict";
import {
  APP_RESPONSE_REDACTED_FIELDS,
  ENDPOINT_CONTRACTS,
  IDEMPOTENCY_KEYS,
  RETRY_REQUIRES_GUARDRAILS,
  RETRY_SAFE_OPERATIONS,
  assertMetadataSizeWithinLimit,
  assertRoleAllowed,
  buildErrorResponse,
  buildSuccessResponse,
  sanitizeForAppResponse,
  validateIdempotencyKey,
  validateNonNegativeInt,
  validatePositiveAmountMinor,
  validateScore,
  validateUuidLike,
} from "./contracts.ts";

test("all endpoint contracts are role-scoped", () => {
  for (const contract of Object.values(ENDPOINT_CONTRACTS)) {
    assert.ok(contract.allowedRoles.length > 0);
    assert.ok(contract.path.startsWith("/v1/"));
  }
});

test("worker job endpoint rejects user JWT role", () => {
  assert.throws(
    () => assertRoleAllowed("workerRunJob", "user_jwt"),
    /not allowed/,
  );
});

test("response envelope builders keep contract shape", () => {
  const success = buildSuccessResponse("req_1", { walletId: "w1" });
  assert.equal(success.ok, true);
  assert.equal(success.error, null);
  assert.equal(success.requestId, "req_1");

  const failure = buildErrorResponse("req_2", {
    code: "INSUFFICIENT_BALANCE",
    message: "Insufficient available balance.",
    retryable: false,
  });
  assert.equal(failure.ok, false);
  assert.equal(failure.data, null);
  assert.equal(failure.error.code, "INSUFFICIENT_BALANCE");
  assert.equal(failure.requestId, "req_2");
});

test("validation helpers enforce expected constraints", () => {
  validateUuidLike("f47ac10b-58cc-4372-a567-0e02b2c3d479", "walletId");
  validateScore(0.5, "attentionScore");
  validateNonNegativeInt(0, "invalidFrameCount");
  validatePositiveAmountMinor(100, "amountMinor");
  validateIdempotencyKey("attention_complete:session_123");

  assert.throws(() => validateScore(1.2, "attentionScore"), /between 0 and 1/);
  assert.throws(() => validatePositiveAmountMinor(0, "amountMinor"), /positive integer/);
  assert.throws(() => validateNonNegativeInt(-1, "invalidFrameCount"), /non-negative/);
  assert.throws(() => validateUuidLike("not-a-uuid", "walletId"), /valid UUID/);
});

test("metadata limit blocks oversized metadata", () => {
  const safe = { appVersion: "1.2.0", platform: "android" };
  assert.doesNotThrow(() => assertMetadataSizeWithinLimit(safe));

  const huge = { payload: "x".repeat(20_000) };
  assert.throws(() => assertMetadataSizeWithinLimit(huge), /metadata exceeds max/);
});

test("idempotency key builders are deterministic", () => {
  assert.equal(
    IDEMPOTENCY_KEYS.attentionComplete("session_uuid"),
    "attention_complete:session_uuid",
  );
  assert.equal(
    IDEMPOTENCY_KEYS.adminCredit("case_uuid", "wallet_uuid", 500),
    "admin_credit:case_uuid:wallet_uuid:500",
  );
});

test("retry policy splits safe vs guarded operations", () => {
  assert.equal(RETRY_SAFE_OPERATIONS.has("run_scheduled_job"), true);
  assert.equal(RETRY_REQUIRES_GUARDRAILS.has("admin_credit"), true);
  assert.equal(RETRY_SAFE_OPERATIONS.has("admin_credit"), false);
});

test("app response sanitizer removes redacted fields", () => {
  const payload = {
    walletId: "w1",
    status: "active",
    identity_graph_details: { links: 4 },
    processor_raw_payload: { vendor: "secret" },
  };
  const sanitized = sanitizeForAppResponse(payload);
  assert.equal(sanitized.walletId, "w1");
  assert.equal(sanitized.status, "active");
  for (const field of APP_RESPONSE_REDACTED_FIELDS) {
    assert.equal(Object.prototype.hasOwnProperty.call(sanitized, field), false);
  }
});
