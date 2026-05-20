import { supabaseAdmin } from "../../config/supabase";
import { runAdminAlertDeliveryProviderWorker } from "../admin-alert-delivery/admin-alert-delivery.service";
import { runAdminSecurityArchiveExportJob } from "./admin-security-archive-export.job";
import { runAdminSecurityArchiveVerificationJob } from "./admin-security-archive-verification.job";
import { runAdminSecurityArtifactSearchIndexingJob } from "./admin-security-artifact-search-indexing.job";
import { runAdminSecurityAuditPeriodExportGenerationJob } from "./admin-security-audit-period-export-generation.job";
import { runAdminSecurityComplianceReportGenerationJob } from "./admin-security-compliance-report-generation.job";
import { runAdminSecurityAuditorExportGenerationJob } from "./admin-security-auditor-export-generation.job";
import { runAdminSecurityAuditorPacketManifestGenerationJob } from "./admin-security-auditor-packet-manifest-generation.job";
import { runAdminSecurityQuestionnaireAiDraftingJob } from "./admin-security-questionnaire-ai-drafting.job";
import { runAdminSecurityNotificationDeliveryJob } from "./admin-security-notifications.job";
import { runAdminSecurityRevocationNotificationsJob } from "./admin-security-revocation-notifications.job";
import { runAdminSecurityTrustCenterManifestGenerationJob } from "./admin-security-trust-center-manifest-generation.job";
import { runAdminSecurityTrustNotificationDeliveryJob } from "./admin-security-trust-notification-delivery.job";
import { runAdminSecurityAnswerReceiptSigningJob } from "./admin-security-answer-receipt-signing.job";
import { runAdminSecurityAnswerReceiptExportBundleJob } from "./admin-security-answer-receipt-export-bundles.job";
import { runAdminSecurityTrustProofReportJob } from "./admin-security-trust-proof-reports.job";
import { runAdminSecurityProofQrCodeJob } from "./admin-security-proof-qr-codes.job";

export async function runWorkerJob(input: {
  jobKey: string;
  lockedBy: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  if (input.jobKey === "admin_security_alert_provider_delivery_every_minute") {
    return runAdminAlertDeliveryProviderWorker({
      batchSize: 100,
      lockedBy: input.lockedBy,
      requestId: input.requestId
    });
  }

  if (input.jobKey === "admin_security_notifications_delivery") {
    return runAdminSecurityNotificationDeliveryJob();
  }

  if (input.jobKey === "admin_security_revocation_notifications") {
    return runAdminSecurityRevocationNotificationsJob();
  }

  if (input.jobKey === "admin_security_trust_notification_delivery") {
    return runAdminSecurityTrustNotificationDeliveryJob();
  }

  if (input.jobKey === "admin_security_archive_export_delivery") {
    return runAdminSecurityArchiveExportJob();
  }

  if (input.jobKey === "admin_security_archive_verification_delivery") {
    return runAdminSecurityArchiveVerificationJob();
  }

  if (input.jobKey === "admin_security_auditor_export_generation") {
    return runAdminSecurityAuditorExportGenerationJob();
  }

  if (input.jobKey === "admin_security_auditor_packet_manifest_generation") {
    return runAdminSecurityAuditorPacketManifestGenerationJob();
  }

  if (input.jobKey === "admin_security_audit_period_export_generation") {
    return runAdminSecurityAuditPeriodExportGenerationJob();
  }

  if (input.jobKey === "admin_security_compliance_report_generation") {
    return runAdminSecurityComplianceReportGenerationJob();
  }

  if (input.jobKey === "admin_security_questionnaire_ai_drafting") {
    return runAdminSecurityQuestionnaireAiDraftingJob();
  }

  if (input.jobKey === "admin_security_trust_center_manifest_refresh_hourly") {
    return runAdminSecurityTrustCenterManifestGenerationJob();
  }

  if (input.jobKey === "admin_security_artifact_search_indexing") {
    return runAdminSecurityArtifactSearchIndexingJob();
  }

  if (input.jobKey === "admin_security_answer_receipt_signing") {
    return runAdminSecurityAnswerReceiptSigningJob();
  }

  if (input.jobKey === "admin_security_answer_receipt_export_bundle_build") {
    return runAdminSecurityAnswerReceiptExportBundleJob();
  }

  if (input.jobKey === "admin_security_trust_proof_report_build") {
    return runAdminSecurityTrustProofReportJob();
  }

  if (input.jobKey === "admin_security_proof_qr_code_build") {
    return runAdminSecurityProofQrCodeJob();
  }

  if (input.jobKey === "admin_security_proof_verification_link_expiry_every_5m") {
    const { data, error } = await supabaseAdmin.rpc(
      "expire_admin_security_proof_verification_links",
      {
        p_batch_size: 1000,
        p_worker_id: input.lockedBy,
        p_metadata: {
          requestId: input.requestId,
          source: input.jobKey,
          ...(input.metadata ?? {})
        }
      }
    );

    if (error) throw error;

    return {
      scheduledJobRunId: String(data)
    };
  }

  if (input.jobKey === "admin_security_audit_period_exports_expire_hourly") {
    const { data, error } = await supabaseAdmin.rpc(
      "expire_admin_security_audit_period_exports",
      {
        p_batch_size: 500,
        p_metadata: {
          requestId: input.requestId,
          source: input.jobKey,
          ...(input.metadata ?? {})
        }
      }
    );

    if (error) throw error;

    return {
      scheduledJobRunId: String(data)
    };
  }

  if (input.jobKey === "admin_security_disclosure_approval_expire_hourly") {
    const { data, error } = await supabaseAdmin.rpc(
      "expire_admin_security_disclosure_approval_requests",
      {
        p_batch_size: 500,
        p_metadata: {
          requestId: input.requestId,
          source: input.jobKey,
          ...(input.metadata ?? {})
        }
      }
    );

    if (error) throw error;

    return {
      scheduledJobRunId: String(data)
    };
  }

  const { data, error } = await supabaseAdmin.rpc("run_scheduled_job", {
    p_job_key: input.jobKey,
    p_locked_by: input.lockedBy,
    p_metadata: {
      requestId: input.requestId,
      ...(input.metadata ?? {})
    }
  });

  if (error) {
    throw error;
  }

  return {
    scheduledJobRunId: String(data)
  };
}
