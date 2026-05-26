import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdirSync } from "node:fs";

import {
  createValidatorStores,
  validateProofPacket,
  VALIDATOR_VERSION,
  type ValidateRequestBody
} from "./validate-handler.js";
import { createSupabaseSettlementClient } from "./supabase-settlement-client.js";
import {
  getPendingHoldBySessionId,
  listPendingHoldsForUser,
  settlePendingHold
} from "./hold-query.js";
import type { SettleHoldRequestBody } from "./settle-handler.js";
import { readSupabaseSettlementConfig } from "./supabase-settlement.js";
import { applyCors } from "./cors.js";
import {
  broadcastProofSealed,
  inferProofSource,
  subscribeProofEvents,
} from "./proof-events.js";

const PORT = Number(process.env.POP_VALIDATOR_PORT ?? "8787");
const DATA_DIR = process.env.POP_VALIDATOR_DATA_DIR ?? "./data/validator";

mkdirSync(DATA_DIR, { recursive: true });

const stores = createValidatorStores(DATA_DIR);
const supabase = createSupabaseSettlementClient();

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) {
    return {};
  }
  return JSON.parse(raw) as unknown;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload)
  });
  res.end(payload);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const server = createServer(async (req, res) => {
  try {
    if (applyCors(req, res)) {
      return;
    }

    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (req.method === "GET" && url.pathname === "/health") {
      const supabaseConfig = readSupabaseSettlementConfig();
      sendJson(res, 200, {
        ok: true,
        validatorVersion: VALIDATOR_VERSION,
        dataDir: DATA_DIR,
        supabase: supabaseConfig
          ? { enabled: true, url: supabaseConfig.url }
          : { enabled: false },
        settlement: supabaseConfig ? "supabase" : "local-json"
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/v1/proof-events/stream") {
      const localUserRef = url.searchParams.get("localUserRef")?.trim() || null;
      subscribeProofEvents(res, localUserRef);
      return;
    }

    if (req.method === "POST" && url.pathname === "/v1/proof-packets/validate") {
      const body = (await readJsonBody(req)) as ValidateRequestBody;
      if (!body?.packet?.sessionId) {
        sendJson(res, 400, { error: "packet.sessionId is required" });
        return;
      }
      if (body.packet.packetVersion !== "0") {
        sendJson(res, 400, { error: "packetVersion must be 0" });
        return;
      }

      const result = await validateProofPacket(body, { stores, supabase });
      const mode = result.mode;
      broadcastProofSealed({
        type: "proof-sealed",
        sessionId: result.sessionId,
        localUserRef: body.packet.localUserRef ?? null,
        mode,
        reviewStatus: result.reviewStatus,
        holdOutcome: mode === "pending" ? result.holdOutcome : "created",
        timestamp: new Date().toISOString(),
        source: inferProofSource(body.packet.runtimeVersion),
      });
      sendJson(res, 200, result);
      return;
    }

    const settleDemoMatch = url.pathname.match(
      /^\/v1\/pending-holds\/([^/]+)\/settle-demo$/
    );
    if (req.method === "POST" && settleDemoMatch) {
      const sessionId = decodeURIComponent(settleDemoMatch[1] ?? "");
      const result = await settlePendingHold(
        DATA_DIR,
        sessionId,
        null,
        supabase,
        "demo"
      );
      sendJson(res, 200, result);
      return;
    }

    const settleMatch = url.pathname.match(
      /^\/v1\/pending-holds\/([^/]+)\/settle$/
    );
    if (req.method === "POST" && settleMatch) {
      const sessionId = decodeURIComponent(settleMatch[1] ?? "");
      const body = (await readJsonBody(req)) as SettleHoldRequestBody;

      if (supabase.isEnabled) {
        if (!body?.userId || !UUID_RE.test(body.userId)) {
          sendJson(res, 400, { error: "userId must be a valid UUID" });
          return;
        }
        const result = await settlePendingHold(
          DATA_DIR,
          sessionId,
          body.userId,
          supabase,
          "production"
        );
        sendJson(res, 200, result);
        return;
      }

      const result = await settlePendingHold(
        DATA_DIR,
        sessionId,
        null,
        supabase,
        "demo"
      );
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "GET" && url.pathname === "/v1/pending-holds") {
      const localUserRef = url.searchParams.get("localUserRef")?.trim();
      if (!localUserRef) {
        sendJson(res, 400, { error: "localUserRef query param is required" });
        return;
      }
      const listed = await listPendingHoldsForUser(DATA_DIR, localUserRef, supabase);
      sendJson(res, 200, { localUserRef, source: listed.source, holds: listed.holds });
      return;
    }

    const holdMatch = url.pathname.match(/^\/v1\/pending-holds\/([^/]+)$/);
    if (req.method === "GET" && holdMatch) {
      const sessionId = decodeURIComponent(holdMatch[1] ?? "");
      const hold = await getPendingHoldBySessionId(DATA_DIR, sessionId, supabase);
      if (!hold) {
        sendJson(res, 404, { error: "hold_not_found" });
        return;
      }
      sendJson(res, 200, { sessionId, hold });
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    sendJson(res, 500, { error: message });
  }
});

server.listen(PORT, () => {
  console.log(`POP validator stub listening on http://127.0.0.1:${PORT}`);
  console.log(`  POST /v1/proof-packets/validate`);
  console.log(`  POST /v1/pending-holds/:sessionId/settle`);
  console.log(`  POST /v1/pending-holds/:sessionId/settle-demo`);
  console.log(`  GET  /v1/pending-holds?localUserRef=...`);
  console.log(`  GET  /v1/pending-holds/:sessionId`);
  console.log(`  GET  /v1/proof-events/stream`);
  console.log(`  GET  /health`);
  console.log(`  data: ${DATA_DIR}`);
  console.log(
    supabase.isEnabled
      ? "  settlement: supabase"
      : "  settlement: local-json (no Docker required)"
  );
});
