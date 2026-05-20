import type { NextFunction, Request, Response } from "express";
import { fail } from "../../../shared/api-response";

export function requirePopsDeviceIntegrity(req: Request, res: Response, next: NextFunction) {
  const expectedDeviceId =
    req.validatedBody?.deviceId ?? req.validatedBody?.clientContext?.deviceId ?? req.header("x-device-id");
  const providedDeviceId = req.header("x-device-id") ?? req.body?.deviceId ?? req.validatedBody?.deviceId;

  if (!expectedDeviceId || !providedDeviceId || expectedDeviceId !== providedDeviceId) {
    return res.status(403).json(
      fail(
        {
          code: "POPS_DEVICE_INTEGRITY_FAILED",
          category: "risk",
          message: "Device integrity validation failed for this request.",
          retryable: false,
          httpStatus: 403
        },
        req.requestId ?? "unknown"
      )
    );
  }

  return next();
}
