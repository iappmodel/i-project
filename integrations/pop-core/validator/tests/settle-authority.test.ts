/**
 * Review branch review/claude-pop-settle-authority (POP lab findings EVO-D-004 / EVO-D-005).
 *
 * Before this change the settle route took `userId` from the request body and passed it to the service-role
 * RPC, which credits that user. Any caller who knew a session id could credit any account, once per hold.
 * These tests drive the route decision with a fake ledger client; nothing here touches a real database.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { ProofPacketV0 } from "@pop-core/backend";

import { bindPacketUser, handleSettleRequest, type SettleDeps } from "../src/settle-authority.js";
import type { SupabaseSettlementClient } from "../src/supabase-settlement-client.js";
import { createSupabaseSettlementClient } from "../src/supabase-settlement-client.js";
import { createValidatorStores, validateProofPacket } from "../src/validate-handler.js";
import pp000001 from "../../fixtures/PP-000001.json" with { type: "json" };

const ALICE = "11111111-1111-4111-8111-111111111111";
const MALLORY = "99999999-9999-4999-8999-999999999999";
const TOKENS: Record<string, string> = { "alice-token": ALICE, "mallory-token": MALLORY };

function fakeLedger(holds: Record<string, { user_id: string | null }>) {
  const settled: Array<{ sessionId: string; userId: string }> = [];
  const client: SupabaseSettlementClient = {
    isEnabled: true,
    async upsertPendingHold() { return { outcome: "existing" as const }; },
    async settlePendingHold(sessionId, userId) { settled.push({ sessionId, userId }); return { success: true, code: "settled" }; },
    async getPendingHold(sessionId) { return holds[sessionId] ? { session_id: sessionId, ...holds[sessionId] } : null; },
    async listPendingHolds() { return []; },
    async upsertPopsSession() { return { outcome: "existing" as const }; },
    async recordFraudEvent() {},
    async verifyAccessToken(token) { return TOKENS[token] ?? null; }
  };
  return { client, settled };
}
const deps = (client: SupabaseSettlementClient, env: Record<string, string | undefined> = { POP_LEDGER_SETTLE_ENABLED: "true" }): SettleDeps =>
  ({ dataDir: "/nonexistent", supabase: client, env });
const settle = (d: SettleDeps, sessionId: string, authorization: string | undefined, body: unknown = {}) =>
  handleSettleRequest({ route: "settle", sessionId, authorization, body, remoteAddress: "203.0.113.7" }, d);

describe("ledger settle: who may credit an account", () => {
  it("refuses a request with no token, whatever userId the body names", async () => {
    const { client, settled } = fakeLedger({ sess_a: { user_id: ALICE } });
    const out = await settle(deps(client), "sess_a", undefined, { userId: MALLORY });
    expect(out).toMatchObject({ status: 401, body: { error: "auth_required" } });
    expect(settled).toEqual([]);
  });

  it("refuses a token the auth service does not recognise", async () => {
    const { client, settled } = fakeLedger({ sess_a: { user_id: ALICE } });
    for (const header of ["Bearer forged", "Bearer ", "Basic alice-token", "alice-token"]) {
      const out = await settle(deps(client), "sess_a", header);
      expect(out.status).toBe(401);
    }
    expect(settled).toEqual([]);
  });

  it("refuses to settle another user's hold, and does not reveal that it exists", async () => {
    const { client, settled } = fakeLedger({ sess_a: { user_id: ALICE } });
    const out = await settle(deps(client), "sess_a", "Bearer mallory-token");
    expect(out).toMatchObject({ status: 404, body: { error: "hold_not_found" } });
    const missing = await settle(deps(client), "sess_missing", "Bearer mallory-token");
    expect(missing).toEqual(out);
    expect(settled).toEqual([]);
  });

  it("refuses a body userId that differs from the token's user", async () => {
    const { client, settled } = fakeLedger({ sess_a: { user_id: ALICE } });
    const out = await settle(deps(client), "sess_a", "Bearer alice-token", { userId: MALLORY });
    expect(out).toMatchObject({ status: 403, body: { error: "user_mismatch" } });
    expect(settled).toEqual([]);
  });

  it("refuses a hold that was never bound to an authenticated user", async () => {
    const { client, settled } = fakeLedger({ sess_unbound: { user_id: null } });
    const out = await settle(deps(client), "sess_unbound", "Bearer alice-token");
    expect(out).toMatchObject({ status: 409, body: { error: "hold_not_bound_to_user" } });
    expect(settled).toEqual([]);
  });

  it("settles the caller's own hold, crediting the token's user and no one else", async () => {
    const { client, settled } = fakeLedger({ sess_a: { user_id: ALICE } });
    const out = await settle(deps(client), "sess_a", "Bearer alice-token", { userId: ALICE });
    expect(out.status).toBe(200);
    expect(settled).toEqual([{ sessionId: "sess_a", userId: ALICE }]);
  });

  it("is off unless the operator turns ledger settlement on", async () => {
    const { client, settled } = fakeLedger({ sess_a: { user_id: ALICE } });
    for (const env of [{}, { POP_LEDGER_SETTLE_ENABLED: "false" }, { POP_LEDGER_SETTLE_ENABLED: "1" }]) {
      const out = await settle(deps(client, env), "sess_a", "Bearer alice-token");
      expect(out).toMatchObject({ status: 403, body: { error: "ledger_settle_disabled" } });
    }
    expect(settled).toEqual([]);
  });

  it("refuses a malformed session id before asking anything else", async () => {
    const { client, settled } = fakeLedger({});
    for (const id of ["", "a".repeat(200), "../etc/passwd", "sess a"]) {
      expect((await settle(deps(client), id, "Bearer alice-token")).status).toBe(400);
    }
    expect(settled).toEqual([]);
  });
});

describe("demo settle: local files only, never next to a ledger", () => {
  let dataDir: string;
  afterEach(() => { if (dataDir) rmSync(dataDir, { recursive: true, force: true }); });
  const local = createSupabaseSettlementClient(null);
  async function seed(sessionId: string) {
    dataDir = mkdtempSync(join(tmpdir(), "pop-settle-authority-"));
    const packet = structuredClone(pp000001) as unknown as ProofPacketV0;
    packet.sessionId = sessionId;
    await validateProofPacket({ packet, mode: "pending" }, { stores: createValidatorStores(dataDir), supabase: local });
  }

  it("is refused on a validator that has a ledger configured", async () => {
    const { client, settled } = fakeLedger({ sess_a: { user_id: ALICE } });
    const out = await handleSettleRequest({ route: "settle-demo", sessionId: "sess_a", body: {}, remoteAddress: "127.0.0.1" }, deps(client));
    expect(out).toMatchObject({ status: 403, body: { error: "demo_settle_disabled" } });
    expect(settled).toEqual([]);
  });

  it("is refused from a non-local address", async () => {
    await seed("sess_demo_remote");
    const out = await handleSettleRequest({ route: "settle-demo", sessionId: "sess_demo_remote", body: {}, remoteAddress: "203.0.113.7" }, { dataDir, supabase: local, env: {} });
    expect(out).toMatchObject({ status: 403, body: { error: "demo_settle_local_only" } });
    const unknown = await handleSettleRequest({ route: "settle-demo", sessionId: "sess_demo_remote", body: {}, remoteAddress: null }, { dataDir, supabase: local, env: {} });
    expect(unknown.status).toBe(403);
  });

  it("can be switched off entirely", async () => {
    await seed("sess_demo_off");
    const out = await handleSettleRequest({ route: "settle-demo", sessionId: "sess_demo_off", body: {}, remoteAddress: "127.0.0.1" }, { dataDir, supabase: local, env: { POP_VALIDATOR_ALLOW_DEMO_SETTLE: "false" } });
    expect(out).toMatchObject({ status: 403, body: { error: "demo_settle_disabled" } });
  });

  it("still works for the local investor demo, and says it is a demo", async () => {
    await seed("sess_demo_ok");
    for (const remoteAddress of ["127.0.0.1", "::1", "::ffff:127.0.0.1"]) {
      const out = await handleSettleRequest({ route: "settle-demo", sessionId: "sess_demo_ok", body: {}, remoteAddress }, { dataDir, supabase: local, env: {} });
      expect(out.status).toBe(200);
      expect(out.body).toMatchObject({ source: "local", settlement: { mode: "demo", hold_status: "settled" } });
    }
    const viaSettle = await handleSettleRequest({ route: "settle", sessionId: "sess_demo_ok", body: { userId: MALLORY }, remoteAddress: "127.0.0.1" }, { dataDir, supabase: local, env: {} });
    expect(viaSettle.body).toMatchObject({ source: "local", settlement: { mode: "demo" } });
  });

  it("reports a missing hold as 404, not a server error", async () => {
    await seed("sess_demo_exists");
    const out = await handleSettleRequest({ route: "settle-demo", sessionId: "sess_demo_nope", body: {}, remoteAddress: "127.0.0.1" }, { dataDir, supabase: local, env: {} });
    expect(out).toMatchObject({ status: 404, body: { error: "hold_not_found" } });
  });
});

describe("a hold is bound to the authenticated user, never to a user id the client wrote", () => {
  const packet = () => ({ ...(structuredClone(pp000001) as typeof pp000001), userId: MALLORY as string | null });

  it("with a ledger configured, the packet's own userId is discarded", () => {
    expect(bindPacketUser(packet(), null, true).userId).toBeNull();
    expect(bindPacketUser(packet(), ALICE, true).userId).toBe(ALICE);
  });

  it("without a ledger (local demo) the packet is left as it was", () => {
    const p = packet();
    expect(bindPacketUser(p, null, false)).toBe(p);
  });

  it("does not modify the packet it was given", () => {
    const p = packet();
    bindPacketUser(p, ALICE, true);
    expect(p.userId).toBe(MALLORY);
  });
});

describe("the lower-level settle function has no authority check of its own (pinned)", () => {
  it("credits whatever user it is handed, which is why routes must go through handleSettleRequest", async () => {
    // This is what the old route did with a userId read from the request body.
    const { settlePendingHold } = await import("../src/hold-query.js");
    const { client, settled } = fakeLedger({ sess_a: { user_id: ALICE } });
    await settlePendingHold("/nonexistent", "sess_a", MALLORY, client, "production");
    expect(settled).toEqual([{ sessionId: "sess_a", userId: MALLORY }]);
  });

  it("the server routes no longer call it directly", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(new URL("../src/server.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/settlePendingHold\(/);
    expect(source).not.toMatch(/body\.userId/);
    expect(source).toMatch(/handleSettleRequest\(/);
    expect(source).toMatch(/bindPacketUser\(body\.packet, authedUser, supabase\.isEnabled\)/);
  });
});

describe("a second packet for the same session cannot change the outcome (pinned)", () => {
  let dataDir: string;
  afterEach(() => { if (dataDir) rmSync(dataDir, { recursive: true, force: true }); });

  it("keeps the first review and the first hold amount", async () => {
    dataDir = mkdtempSync(join(tmpdir(), "pop-settle-replay-"));
    const stores = createValidatorStores(dataDir);
    const first = structuredClone(pp000001) as unknown as ProofPacketV0;
    first.sessionId = "sess_replay_001";
    const a = await validateProofPacket({ packet: first, mode: "pending" }, { stores });
    const second = structuredClone(first);
    second.offerId = "some-other-offer-watch";
    second.localUserRef = "someone-else";
    const b = await validateProofPacket({ packet: second, mode: "pending" }, { stores });
    if (a.mode !== "pending" || b.mode !== "pending") throw new Error("expected pending mode");
    expect(b.reviewOutcome).toBe("existing");
    expect(b.holdOutcome).toBe("existing");
    expect(b.hold).toEqual(a.hold);
    expect(b.reviewStatus).toBe(a.reviewStatus);
  });
});
