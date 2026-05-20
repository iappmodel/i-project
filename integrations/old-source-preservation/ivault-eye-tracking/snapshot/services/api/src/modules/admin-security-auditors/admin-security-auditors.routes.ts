import { z } from "zod";
import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import { sendValidationFailure } from "../../shared/route-helpers";
import {
  approveAdminAuditorExport,
  listAdminAuditorExports
} from "./admin-security-auditors.service";
import {
  auditorExportApproveSchema,
  auditorExportDownloadParamSchema
} from "./admin-security-auditors.validation";

const listAdminAuditorExportsQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100))
});

export const adminSecurityAuditorsRouter = Router();
adminSecurityAuditorsRouter.use(requireAdminAuth);

const rid = (req: { requestId?: string }) => req.requestId ?? "unknown";

adminSecurityAuditorsRouter.get(
  "/exports",
  requireAdminPermission("admin.read"),
  validateQuery(listAdminAuditorExportsQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;
      const data = await listAdminAuditorExports({ limit: query.limit });
      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditorsRouter.post(
  "/exports/:id/approve",
  requireAdminPermission("admin.write"),
  validateBody(auditorExportApproveSchema),
  async (req, res, next) => {
    try {
      const params = auditorExportDownloadParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const body = req.validatedBody!;
      const data = await approveAdminAuditorExport({
        adminAuthUserId: req.admin!.userId,
        exportRequestId: params.data.id,
        approvalNote: body.approvalNote,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });
      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);
