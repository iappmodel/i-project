import type { NextFunction, Request, Response } from "express";
import { requireUserAuth } from "../../../middleware/auth";
import { fail } from "../../../shared/api-response";

export async function requirePopsAuth(req: Request, res: Response, next: NextFunction) {
  return requireUserAuth(req, res, next);
}

export function requireBodyUserMatch(req: Request, res: Response, next: NextFunction) {
  const authUserId = req.auth?.userId;
  const bodyUserId = req.validatedBody?.userId;

  if (!authUserId || !bodyUserId || authUserId !== bodyUserId) {
    return res.status(403).json(
      fail(
        {
          code: "POPS_USER_MISMATCH",
          category: "permission",
          message: "Session owner does not match authenticated user.",
          retryable: false,
          httpStatus: 403
        },
        req.requestId ?? "unknown"
      )
    );
  }

  return next();
}
