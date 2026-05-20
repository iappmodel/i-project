import { supabaseAdmin } from "../../config/supabase";

function getWorkerId() {
  return process.env.WORKER_ID ?? `api-worker-${process.pid}`;
}

async function sendEmailPlaceholder(input: {
  to: string;
  subject: string;
  text: string;
  markdown?: string | null;
}) {
  void input;
  return {
    provider: "dev-console",
    providerMessageId: `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`
  };
}

export async function runAdminSecurityTrustNotificationDeliveryJob() {
  const workerId = getWorkerId();

  const { data: deliveries, error: claimError } = await supabaseAdmin.rpc(
    "claim_admin_security_trust_notification_deliveries",
    {
      p_batch_size: 50,
      p_worker_id: workerId,
      p_metadata: {
        source: "admin-security-trust-notification-delivery-worker"
      }
    }
  );

  if (claimError) throw claimError;

  const claimed = deliveries ?? [];
  for (const delivery of claimed) {
    try {
      if (delivery.delivery_channel !== "email") {
        await supabaseAdmin.rpc("fail_admin_security_trust_notification_delivery", {
          p_delivery_id: delivery.delivery_id,
          p_error_message: `unsupported delivery channel: ${delivery.delivery_channel}`,
          p_error_code: "UNSUPPORTED_CHANNEL",
          p_provider: "worker",
          p_worker_id: workerId,
          p_metadata: { source: "admin-security-trust-notification-delivery-worker" }
        });
        continue;
      }

      const result = await sendEmailPlaceholder({
        to: delivery.recipient_email,
        subject: delivery.subject,
        text: delivery.body_text,
        markdown: delivery.body_markdown
      });

      await supabaseAdmin.rpc("complete_admin_security_trust_notification_delivery", {
        p_delivery_id: delivery.delivery_id,
        p_provider: result.provider,
        p_provider_message_id: result.providerMessageId,
        p_worker_id: workerId,
        p_metadata: { source: "admin-security-trust-notification-delivery-worker" }
      });
    } catch (err: any) {
      await supabaseAdmin.rpc("fail_admin_security_trust_notification_delivery", {
        p_delivery_id: delivery.delivery_id,
        p_error_message: err?.message ?? "unknown trust notification delivery error",
        p_error_code: "DELIVERY_ERROR",
        p_provider: "worker",
        p_worker_id: workerId,
        p_metadata: { source: "admin-security-trust-notification-delivery-worker" }
      });
    }
  }

  return { claimed: claimed.length };
}
