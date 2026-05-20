import type { Response } from "express";

export function sendValidationFailure(res: Response, requestId: string) {
  return res.status(400).json({
    ok: false,
    data: null,
    error: {
      code: "VALIDATION_FAILED",
      category: "validation",
      message: "The request is invalid.",
      retryable: false,
      httpStatus: 400
    },
    requestId
  });
}
