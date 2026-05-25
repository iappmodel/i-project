import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdirSync } from "node:fs";

import {
  createValidatorStores,
  validateProofPacket,
  VALIDATOR_VERSION,
  type ValidateRequestBody
} from "./validate-handler.js";

const PORT = Number(process.env.POP_VALIDATOR_PORT ?? "8787");
const DATA_DIR = process.env.POP_VALIDATOR_DATA_DIR ?? "./data/validator";

mkdirSync(DATA_DIR, { recursive: true });

const stores = createValidatorStores(DATA_DIR);

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

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, {
        ok: true,
        validatorVersion: VALIDATOR_VERSION,
        dataDir: DATA_DIR
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

      const result = validateProofPacket(body, stores);
      sendJson(res, 200, result);
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
  console.log(`  GET  /health`);
  console.log(`  data: ${DATA_DIR}`);
});
