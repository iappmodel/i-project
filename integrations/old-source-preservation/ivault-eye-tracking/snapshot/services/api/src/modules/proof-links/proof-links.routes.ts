import { Router } from "express";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import { resolveProofLinkSchema } from "./proof-links.validation";
import { resolveProofVerificationLink } from "./proof-links.service";

export const proofLinksRouter = Router();

proofLinksRouter.get(
  "/resolve",
  validateQuery(resolveProofLinkSchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const data = await resolveProofVerificationLink({
        code: query.code,
        token: query.token,
        requesterIp: req.ip,
        userAgent:
          typeof req.headers["user-agent"] === "string"
            ? req.headers["user-agent"]
            : undefined,
        referrer:
          typeof req.headers.referer === "string"
            ? req.headers.referer
            : undefined,
        requestId: (req as any).requestId
      });

      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);
