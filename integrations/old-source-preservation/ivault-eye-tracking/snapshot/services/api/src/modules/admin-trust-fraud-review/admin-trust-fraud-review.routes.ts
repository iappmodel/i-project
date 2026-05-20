import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { ok } from "../../shared/api-response";
import { listTrustFraudReviewBatches, getTrustFraudReviewBatch } from "@/lib/alphabet/trust-fraud-review/trust-fraud-review-store";
import { runTrustFraudReviewBatch } from "@/lib/alphabet/trust-fraud-review/trust-fraud-review-scanner";
import type { TrustFraudReviewScope } from "@/types/alphabet/trust-fraud-review.types";

export const adminTrustFraudReviewRouter = Router();
adminTrustFraudReviewRouter.use(requireAdminAuth);

const rid = (req: { requestId?: string }) => req.requestId ?? "unknown";

adminTrustFraudReviewRouter.get("/", requireAdminPermission("admin.read"), async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : null;
    const severity = typeof req.query.severity === "string" ? req.query.severity : null;
    const batchScope = typeof req.query.batchScope === "string" ? req.query.batchScope : null;
    const limit = Number(req.query.limit ?? 100);

    const batches = await listTrustFraudReviewBatches({
      status,
      severity,
      batchScope,
      limit: Number.isFinite(limit) ? limit : 100
    });
    return res.json(ok({ batches }, rid(req)));
  } catch (err) {
    next(err);
  }
});

adminTrustFraudReviewRouter.get("/:batchId", requireAdminPermission("admin.read"), async (req, res, next) => {
  try {
    const batch = await getTrustFraudReviewBatch(String(req.params.batchId));
    if (!batch) {
      return res.status(404).json({ ok: false, message: "Batch not found." });
    }
    return res.json(ok({ batch }, rid(req)));
  } catch (err) {
    next(err);
  }
});

adminTrustFraudReviewRouter.post("/", requireAdminPermission("admin.write"), async (req, res, next) => {
  try {
    const body = (req.body ?? {}) as { batchDate?: string; batchScope?: TrustFraudReviewScope };
    const result = await runTrustFraudReviewBatch({
      batchDate: body.batchDate,
      batchScope: body.batchScope ?? "global_daily",
      generatedBy: req.admin?.userId ?? "manual_admin"
    });
    return res.status(result.ok ? 200 : 400).json(ok(result as unknown as Record<string, unknown>, rid(req)));
  } catch (err) {
    next(err);
  }
});
