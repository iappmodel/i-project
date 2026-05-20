import { Router, type Request, type Response } from "express";
import { env } from "../../config/env";
import { runScheduledJob } from "../../lib/alphabet/scheduled-jobs/scheduled-job-runner";
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

function requireCronSecret(req: Request, res: Response): boolean {
  const expected = env.CRON_SECRET;
  const actual = req.header("x-cron-secret") ?? (req.query.secret as string | undefined);

  if (!expected || actual !== expected) {
    res.status(403).json({
      ok: false,
      message: "Cron job rejected."
    });
    return false;
  }

  return true;
}

export const cronAlphabetRouter = Router();

async function runCronJob(req: Request, res: Response) {
  if (!requireCronSecret(req, res)) return;

  const jobKey = req.params.jobKey as ScheduledJobKey;
  if (!VALID_JOB_KEYS.has(jobKey)) {
    res.status(400).json({ ok: false, message: "Unknown job key." });
    return;
  }

  try {
    const result = await runScheduledJob({
      jobKey,
      triggerSource: "cron",
      lockedBy: `cron:${jobKey}`
    });

    res.json({
      ok: result.ok,
      jobRunId: result.jobRunId,
      jobKey: result.jobKey,
      status: result.status,
      reasonCodes: result.reasonCodes
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      message: err instanceof Error ? err.message : "Cron job failed."
    });
  }
}

cronAlphabetRouter.post("/:jobKey", runCronJob);
cronAlphabetRouter.get("/:jobKey", runCronJob);
