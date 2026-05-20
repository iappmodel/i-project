import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

export function validateQuery<T>(schema: ZodType<T, any, unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return res.status(400).json({
        ok: false,
        data: null,
        error: {
          code: "VALIDATION_FAILED",
          category: "validation",
          message: "The request is invalid.",
          retryable: false,
          httpStatus: 400,
          details: {
            issues: result.error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
              code: issue.code
            }))
          }
        },
        requestId: req.requestId
      });
    }

    req.validatedQuery = result.data;
    return next();
  };
}
