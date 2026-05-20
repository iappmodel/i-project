import { supabaseAdmin } from "../../config/supabase";

export async function createAnswerReceiptExportBundle(input: {
  answerReceiptId: string;
  exportFormat?: string;
  includePdfSummary?: boolean;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_admin_security_answer_receipt_export_bundle",
    {
      p_answer_receipt_id: input.answerReceiptId,
      p_bundle_type: "customer_receipt_bundle",
      p_export_format: input.exportFormat ?? "json",
      p_include_pdf_summary: input.includePdfSummary ?? false,
      p_request_id: input.requestId,
      p_metadata: {
        source: "answer-receipt-export-consumer-api"
      }
    }
  );

  if (error) throw error;

  return {
    answerReceiptExportBundleId: String(data),
    status: "pending"
  };
}
