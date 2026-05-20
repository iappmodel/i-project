import crypto from "node:crypto";
import type { Request } from "express";

function getHashSecret() {
  const secret = process.env.ADMIN_RISK_HASH_SECRET;

  if (!secret) {
    throw new Error("ADMIN_RISK_HASH_SECRET is not configured");
  }

  return secret;
}

export function hashAdminRiskValue(value: string) {
  return crypto.createHmac("sha256", getHashSecret()).update(value).digest("hex");
}

export function getRequestIp(req: Request) {
  const forwarded = req.header("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "";
  }

  return req.ip ?? "";
}

export function getUserAgent(req: Request) {
  return req.header("user-agent") ?? "";
}

export function buildDeviceFingerprintHash(req: Request) {
  const raw = [
    req.header("user-agent") ?? "",
    req.header("accept-language") ?? "",
    req.header("sec-ch-ua") ?? "",
    req.header("sec-ch-ua-platform") ?? ""
  ].join("|");

  return hashAdminRiskValue(raw);
}
