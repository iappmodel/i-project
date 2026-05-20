import { Router } from "express";
import { ok } from "../../shared/api-response";
import { auditPackageAccessTokenSchema } from "./audit-package-access.validation";
import { resolveAuditPackageAccess } from "./audit-package-access.service";

export const auditPackageAccessRouter = Router();

function rid(req: { requestId?: string }): string {
  return req.requestId ?? "";
}

auditPackageAccessRouter.get("/:token", async (req, res, next) => {
  try {
    const params = auditPackageAccessTokenSchema.parse({
      token: req.params.token
    });

    const data = await resolveAuditPackageAccess({
      token: params.token,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") ?? undefined,
      requestId: rid(req)
    });

    return res.json(ok(data, rid(req)));
  } catch (err) {
    next(err);
  }
});
