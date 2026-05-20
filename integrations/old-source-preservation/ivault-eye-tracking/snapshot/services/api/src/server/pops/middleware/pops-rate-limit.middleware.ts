import type { NextFunction, Request, Response } from "express";
import { fail } from "../../../shared/api-response";

type RateLimitRule = {
  windowMs: number;
  max: number;
  key: (req: Request) => string;
};

const buckets = new Map<string, { count: number; resetAt: number }>();

function runRateLimit(ruleName: string, rule: RateLimitRule) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${ruleName}:${rule.key(req)}`;
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + rule.windowMs });
      return next();
    }

    if (existing.count >= rule.max) {
      return res.status(429).json(
        fail(
          {
            code: "RATE_LIMITED",
            category: "rate_limit",
            message: "Too many requests for this endpoint.",
            retryable: true,
            httpStatus: 429,
            details: { retryAfterMs: existing.resetAt - now }
          },
          req.requestId ?? "unknown"
        )
      );
    }

    existing.count += 1;
    return next();
  };
}

const userKey = (req: Request) => req.auth?.userId ?? "anonymous";
const sessionKey = (req: Request) => `${req.auth?.userId ?? "anonymous"}:${req.params.sessionId ?? "unknown"}`;

export const rateLimitStartSession = runRateLimit("pops:start", {
  windowMs: 60 * 60 * 1000,
  max: 60,
  key: userKey
});

export const rateLimitEvents = runRateLimit("pops:events", {
  windowMs: 1000,
  max: 1,
  key: sessionKey
});

export const rateLimitSignalBatch = runRateLimit("pops:signal-batch", {
  windowMs: 2000,
  max: 1,
  key: sessionKey
});

export const rateLimitCheckpoint = runRateLimit("pops:checkpoint", {
  windowMs: 5000,
  max: 1,
  key: sessionKey
});

export const rateLimitComplete = runRateLimit("pops:complete", {
  windowMs: 1000 * 60 * 60 * 24,
  max: 1,
  key: sessionKey
});

export const rateLimitClose = runRateLimit("pops:close", {
  windowMs: 1000 * 60 * 60 * 24,
  max: 1,
  key: sessionKey
});
