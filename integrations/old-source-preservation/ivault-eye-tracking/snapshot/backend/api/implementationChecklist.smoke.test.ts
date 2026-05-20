import test from "node:test";
import assert from "node:assert/strict";
import {
  ENDPOINT_CONTRACTS,
  assertRoleAllowed,
  validateUuidLike,
} from "./contracts.ts";

test("wallet summary endpoint is scoped to authenticated caller roles only", () => {
  assert.deepEqual(
    ENDPOINT_CONTRACTS.walletSummary.allowedRoles,
    ["user_jwt", "app_api_role"],
  );
});

test("wallet ledger endpoint is scoped to authenticated caller roles only", () => {
  assert.deepEqual(
    ENDPOINT_CONTRACTS.walletLedger.allowedRoles,
    ["user_jwt", "app_api_role"],
  );
});

test("attention assignment endpoint contract returns runtime assignment id DTO key", () => {
  assert.equal(
    ENDPOINT_CONTRACTS.attentionAssignment.path,
    "/v1/attention/assignment",
  );
  assert.equal(
    ENDPOINT_CONTRACTS.attentionAssignment.rpcFunction,
    "resolve_attention_runtime_assignment",
  );
});

test("attention session start endpoint contract returns attention session id DTO key", () => {
  assert.equal(
    ENDPOINT_CONTRACTS.attentionSessionStart.path,
    "/v1/attention/session/start",
  );
  assert.equal(
    ENDPOINT_CONTRACTS.attentionSessionStart.rpcFunction,
    "start_attention_verification_session_from_assignment",
  );
});

test("attention session complete endpoint contract returns attention event id DTO key", () => {
  assert.equal(
    ENDPOINT_CONTRACTS.attentionSessionComplete.path,
    "/v1/attention/session/complete",
  );
  assert.equal(
    ENDPOINT_CONTRACTS.attentionSessionComplete.rpcFunction,
    "complete_attention_verification_event",
  );
});

test("withdrawal create endpoint returns withdrawal request id contract", () => {
  assert.equal(ENDPOINT_CONTRACTS.withdrawalsCreate.path, "/v1/withdrawals");
  assert.equal(
    ENDPOINT_CONTRACTS.withdrawalsCreate.rpcFunction,
    "create_withdrawal_request",
  );
});

test("withdrawal detail route is ID-parameterized for owner checks", () => {
  assert.equal(
    ENDPOINT_CONTRACTS.withdrawalsStatus.path,
    "/v1/withdrawals/:withdrawalRequestId",
  );
  assert.throws(
    () => assertRoleAllowed("withdrawalsStatus", "worker_role"),
    /not allowed/,
  );
});

test("admin action request endpoint requires admin role", () => {
  assert.throws(
    () => assertRoleAllowed("adminActionRequest", "user_jwt"),
    /not allowed/,
  );
  assert.doesNotThrow(() => assertRoleAllowed("adminActionRequest", "admin_api_role"));
});

test("admin approval endpoint requires admin role", () => {
  assert.throws(
    () => assertRoleAllowed("adminActionApprove", "app_api_role"),
    /not allowed/,
  );
  assert.doesNotThrow(() => assertRoleAllowed("adminActionApprove", "admin_api_role"));
});

test("worker run job endpoint rejects user token", () => {
  assert.throws(
    () => assertRoleAllowed("workerRunJob", "user_jwt"),
    /not allowed/,
  );
});

test("webhook endpoint accepts only webhook secret role", () => {
  assert.throws(
    () => assertRoleAllowed("payoutWebhook", "user_jwt"),
    /not allowed/,
  );
  assert.doesNotThrow(() => assertRoleAllowed("payoutWebhook", "webhook_secret"));
});

test("route id placeholders are UUID-shape compatible", () => {
  validateUuidLike("f47ac10b-58cc-4372-a567-0e02b2c3d479", "withdrawalRequestId");
  validateUuidLike("f47ac10b-58cc-4372-a567-0e02b2c3d479", "adminActionRequestId");
});
