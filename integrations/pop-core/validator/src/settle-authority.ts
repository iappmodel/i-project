/**
 * Who may settle a pending hold.
 *
 * The validator holds the Supabase service-role key, and `settle_pop_pending_hold(session, user)` credits
 * whichever user it is given. So the decision about *which* user must be made here, from an access token the
 * auth service has verified, and never from a user id written by the caller.
 *
 * Ledger settlement (Supabase configured):
 *   - off unless POP_LEDGER_SETTLE_ENABLED is exactly "true";
 *   - the caller must present `Authorization: Bearer <access token>`;
 *   - the user is the token's user; a different `userId` in the body is refused;
 *   - the hold must already be bound to that user (see bindPacketUser). Someone else's hold and a missing
 *     hold give the same 404, so the route does not reveal which sessions exist.
 *
 * Demo settlement (local JSON files, no ledger):
 *   - refused when a ledger is configured;
 *   - local callers only, unless POP_VALIDATOR_DEMO_SETTLE_ALLOW_REMOTE is "true" (for a container network);
 *   - POP_VALIDATOR_ALLOW_DEMO_SETTLE="false" turns it off.
 *
 * This does not make the proof itself trustworthy: review status still comes from scores the client computed.
 * It only closes the route by which one caller could credit another account.
 */
import type { ProofPacketV0 } from "@pop-core/backend";

import { settlePendingHold } from "./hold-query.js";
import type { SupabaseSettlementClient } from "./supabase-settlement-client.js";

export interface SettleRequestContext {
  route: "settle" | "settle-demo";
  sessionId: string;
  /** Raw Authorization header, if any. */
  authorization?: string | null;
  body: unknown;
  /** Socket remote address. Unknown is treated as not local. */
  remoteAddress?: string | null;
}

export interface SettleDeps {
  dataDir: string;
  supabase: SupabaseSettlementClient;
  env: Record<string, string | undefined>;
}

export interface SettleHttpResult {
  status: number;
  body: unknown;
}

const SESSION_ID_RE = /^[A-Za-z0-9_-]{3,128}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

const refuse = (status: number, error: string): SettleHttpResult => ({ status, body: { error } });

export function bearerToken(header: string | null | undefined): string | null {
  if (typeof header !== "string") return null;
  const match = /^Bearer ([A-Za-z0-9._~+/=-]{8,4096})$/.exec(header.trim());
  return match ? match[1] ?? null : null;
}

/** The user an access token belongs to, or null. Never throws: a failed lookup is "not authenticated". */
export async function authenticatedUserId(
  header: string | null | undefined,
  supabase: SupabaseSettlementClient
): Promise<string | null> {
  const token = bearerToken(header);
  if (!token || !supabase.isEnabled) return null;
  try {
    const userId = await supabase.verifyAccessToken(token);
    return userId && UUID_RE.test(userId) ? userId : null;
  } catch {
    return null;
  }
}

/**
 * With a ledger configured, a hold is bound to the authenticated user or to no one. The packet's own `userId`
 * is client input and is discarded. Without a ledger (local demo) the packet is returned unchanged.
 */
export function bindPacketUser<T extends Pick<ProofPacketV0, "userId">>(
  packet: T,
  authenticatedUser: string | null,
  ledgerConfigured: boolean
): T {
  if (!ledgerConfigured) return packet;
  return { ...packet, userId: authenticatedUser };
}

async function demoSettle(ctx: SettleRequestContext, deps: SettleDeps): Promise<SettleHttpResult> {
  if (deps.supabase.isEnabled || deps.env.POP_VALIDATOR_ALLOW_DEMO_SETTLE === "false") {
    return refuse(403, "demo_settle_disabled");
  }
  const local = typeof ctx.remoteAddress === "string" && LOOPBACK.has(ctx.remoteAddress);
  if (!local && deps.env.POP_VALIDATOR_DEMO_SETTLE_ALLOW_REMOTE !== "true") {
    return refuse(403, "demo_settle_local_only");
  }
  try {
    return { status: 200, body: await settlePendingHold(deps.dataDir, ctx.sessionId, null, deps.supabase, "demo") };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "hold_not_found") return refuse(404, "hold_not_found");
    if (message.startsWith("review_not_settlement_eligible")) return refuse(409, message);
    throw error;
  }
}

export async function handleSettleRequest(ctx: SettleRequestContext, deps: SettleDeps): Promise<SettleHttpResult> {
  if (typeof ctx.sessionId !== "string" || !SESSION_ID_RE.test(ctx.sessionId)) {
    return refuse(400, "invalid_session_id");
  }
  if (ctx.route === "settle-demo" || !deps.supabase.isEnabled) {
    return demoSettle(ctx, deps);
  }

  if (deps.env.POP_LEDGER_SETTLE_ENABLED !== "true") return refuse(403, "ledger_settle_disabled");

  if (!bearerToken(ctx.authorization)) return refuse(401, "auth_required");
  const userId = await authenticatedUserId(ctx.authorization, deps.supabase);
  if (!userId) return refuse(401, "invalid_token");

  const claimed = (ctx.body as { userId?: unknown } | null)?.userId;
  if (claimed !== undefined && claimed !== null && claimed !== userId) return refuse(403, "user_mismatch");

  const hold = await deps.supabase.getPendingHold(ctx.sessionId);
  const owner = hold ? (hold as { user_id?: unknown }).user_id : undefined;
  if (hold && (owner === null || owner === undefined)) return refuse(409, "hold_not_bound_to_user");
  if (!hold || owner !== userId) return refuse(404, "hold_not_found");

  return { status: 200, body: await settlePendingHold(deps.dataDir, ctx.sessionId, userId, deps.supabase, "production") };
}
