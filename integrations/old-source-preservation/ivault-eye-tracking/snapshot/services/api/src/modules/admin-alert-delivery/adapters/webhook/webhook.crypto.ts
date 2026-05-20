import crypto from "node:crypto";

export function createWebhookNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function createWebhookTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

export function signWebhookPayload(input: {
  secret: string;
  timestamp: string;
  nonce: string;
  body: string;
}): string {
  if (!input.secret) {
    throw new Error("webhook signing secret is not configured");
  }

  const signedPayload = [input.timestamp, input.nonce, input.body].join(".");

  return crypto
    .createHmac("sha256", input.secret)
    .update(signedPayload)
    .digest("hex");
}
