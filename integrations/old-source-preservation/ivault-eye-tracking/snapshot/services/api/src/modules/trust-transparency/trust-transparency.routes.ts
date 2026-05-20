import { Router } from "express";
import { fail, ok } from "../../shared/api-response";
import {
  trustPortalSlugSchema,
  trustTransparencyAccessTokenSchema
} from "./trust-transparency.validation";
import { getPublishedTrustPortalBySlug, getTrustPortalByAccessToken } from "./trust-transparency.service";

export const trustTransparencyRouter = Router();

trustTransparencyRouter.get("/portal/:slug", async (req, res, next) => {
  try {
    const parsed = trustPortalSlugSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json(
        fail(
          {
            code: "VALIDATION_FAILED",
            category: "validation",
            message: "The request is invalid.",
            retryable: false,
            httpStatus: 400,
            details: {
              issues: parsed.error.issues.map((issue) => ({
                path: issue.path.join("."),
                message: issue.message,
                code: issue.code
              }))
            }
          },
          req.requestId ?? ""
        )
      );
    }

    const data = await getPublishedTrustPortalBySlug({
      slug: parsed.data.slug,
      requestId: req.requestId ?? "",
      ipAddress: req.ip,
      userAgent: req.get("user-agent") ?? undefined
    });

    return res.json(ok(data, req.requestId ?? ""));
  } catch (err) {
    next(err);
  }
});

trustTransparencyRouter.get("/access/:token", async (req, res, next) => {
  try {
    const parsed = trustTransparencyAccessTokenSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json(
        fail(
          {
            code: "VALIDATION_FAILED",
            category: "validation",
            message: "The request is invalid.",
            retryable: false,
            httpStatus: 400,
            details: {
              issues: parsed.error.issues.map((issue) => ({
                path: issue.path.join("."),
                message: issue.message,
                code: issue.code
              }))
            }
          },
          req.requestId ?? ""
        )
      );
    }

    const data = await getTrustPortalByAccessToken({
      token: parsed.data.token,
      requestId: req.requestId ?? "",
      ipAddress: req.ip,
      userAgent: req.get("user-agent") ?? undefined
    });

    return res.json(ok(data, req.requestId ?? ""));
  } catch (err) {
    next(err);
  }
});
