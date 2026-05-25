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
  settleHoldViaSupabase,
  type SettleHoldRequestBody
} from "./settle-handler.js";
import { readSupabaseSettlementConfig } from "./supabase-settlement.js";

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
    throw new Error("Empty request body");
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
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (req.method === "GET" && url.pathname === "/health") {
      const supabaseConfig = readSupabaseSettlementConfig();
      sendJson(res, 200, {
        ok: true,
        validatorVersion: VALIDATOR_VERSION,
        dataDir: DATA_DIR,
        supabase: supabaseConfig
          ? { enabled: true, url: supabaseConfig.url }
          : { enabled: false }
      });
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
      sendJson(res, 200, result);
      return;
    }

    const settleMatch = url.pathname.match(
      /^\/v1\/pending-holds\/([^/]+)\/settle$/
    );
    if (req.method === "POST" && settleMatch) {
      const sessionId = decodeURIComponent(settleMatch[1] ?? "");
      const body = (await readJsonBody(req)) as SettleHoldRequestBody;
      if (!body?.userId || !UUID_RE.test(body.userId)) {
        sendJson(res, 400, { error: "userId must be a valid UUID" });
        return;
      }

      const result = await settleHoldViaSupabase(sessionId, body.userId, supabase);
      sendJson(res, 200, result);
      return;
    }

    const holdMatch = url.pathname.match(/^\/v1\/pending-holds\/([^/]+)$/);
    if (req.method === "GET" && holdMatch) {
      const sessionId = decodeURIComponent(holdMatch[1] ?? "");
      if (!supabase.isEnabled) {
        sendJson(res, 503, { error: "Supabase settlement is not configured" });
        return;
      }
      const hold = await supabase.getPendingHold(sessionId);
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
  console.log(`  GET  /v1/pending-holds/:sessionId`);
  console.log(`  GET  /health`);
  console.log(`  data: ${DATA_DIR}`);
  console.log(
    supabase.isEnabled
      ? "  supabase: enabled"
      : "  supabase: disabled (set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)"
  );
});
