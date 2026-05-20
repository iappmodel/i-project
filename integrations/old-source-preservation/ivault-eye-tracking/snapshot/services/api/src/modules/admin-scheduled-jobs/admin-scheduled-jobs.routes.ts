import { Router, type Request, type Response } from "express";
import { requireAdminAuth } from "../../middleware/auth";
import {
  getScheduledJobRun,
  listScheduledJobRuns,
  runScheduledJob
} from "../../lib/alphabet/scheduled-jobs/scheduled-job-store";
import type { ScheduledJobKey } from "../../types/alphabet/scheduled-job.types";

const VALID_JOB_KEYS = new Set<ScheduledJobKey>([
  "provider_polling_5m",
  "pending_payout_scan_5m",
  "review_sla_scan_5m",
  "operational_alert_scan_5m",
  "stuck_saga_scan_1h",
  "wallet_invariant_scan_1h",
  "idempotency_expiry_1h",
  "dedupe_expiry_1h",
  "audit_integrity_daily",
  "financial_reconciliation_daily",
  "trust_fraud_review_daily"
]);

export const adminScheduledJobsRouter = Router();

adminScheduledJobsRouter.get("/", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const jobKey = typeof req.query.jobKey === "string" ? req.query.jobKey : null;
    const status = typeof req.query.status === "string" ? req.query.status : null;
    const limitRaw = req.query.limit;
    const limit =
      typeof limitRaw === "string" && limitRaw.length > 0 ? Number(limitRaw) : Number.NaN;

    const runs = await listScheduledJobRuns({
      jobKey,
      status,
      limit: Number.isFinite(limit) ? limit : 100
    });

    res.json({
      ok: true,
      runs
    });
  } catch {
    res.status(400).json({ ok: false, message: "Could not list job runs." });
  }
});

adminScheduledJobsRouter.post("/", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as { jobKey?: string; triggeredByUserId?: string | null };
    const jobKey = body.jobKey as ScheduledJobKey;

    if (!jobKey || !VALID_JOB_KEYS.has(jobKey)) {
      res.status(400).json({ ok: false, message: "Invalid job key." });
      return;
    }

    const admin = req.admin!;
    const triggeredByUserId =
      (req.header("x-user-id") as string | undefined) ?? body.triggeredByUserId ?? admin.userId;

    const result = await runScheduledJob({
      jobKey,
      triggerSource: "manual_admin",
      triggeredByUserId,
      lockedBy: `manual_admin:${triggeredByUserId ?? "unknown"}`
    });

    res.json({
      ok: result.ok,
      jobRunId: result.jobRunId,
      jobKey: result.jobKey,
      status: result.status,
      reasonCodes: result.reasonCodes
    });
  } catch (err) {
    res.status(400).json({
      ok: false,
      message: err instanceof Error ? err.message : "Scheduled job could not run."
    });
  }
});

adminScheduledJobsRouter.get("/:jobRunId", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { jobRunId } = req.params;
    const run = await getScheduledJobRun(jobRunId);

    if (!run) {
      res.status(404).json({ ok: false, message: "Job run not found." });
      return;
    }

    res.json({
      ok: true,
      run
    });
  } catch {
    res.status(400).json({ ok: false, message: "Could not load job run." });
  }
});
