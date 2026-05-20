/*
  Repo note:
  The active worker entrypoint in this codebase is currently under services/api.
  This file mirrors the standalone worker job contract from Step 9.33 so it can
  be reused by a dedicated worker package when services/worker is wired.
*/

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false
    }
  }
);

function getWorkerId() {
  return process.env.WORKER_ID ?? `worker-${process.pid}`;
}

async function sendSlack(input: {
  destination: string;
  secretRef: string | null;
  payload: Record<string, unknown>;
}) {
  const webhookUrl = input.secretRef ? process.env[input.secretRef] : null;
  if (!webhookUrl) {
    throw new Error(`missing Slack webhook secret: ${input.secretRef}`);
  }

  const severity =
    typeof input.payload.severity === "string"
      ? input.payload.severity.toUpperCase()
      : "SECURITY";
  const eventKey =
    typeof input.payload.event_key === "string"
      ? input.payload.event_key
      : typeof input.payload.alert_key === "string"
        ? input.payload.alert_key
        : "Admin security event";
  const message =
    typeof input.payload.message === "string"
      ? input.payload.message
      : typeof input.payload.reason === "string"
        ? input.payload.reason
        : "Security event requires attention.";

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      text: `*[${severity}]* ${eventKey}\n${message}`,
      payload: input.payload
    })
  });

  if (!res.ok) {
    throw new Error(`Slack delivery failed: ${res.status}`);
  }

  return { status: res.status };
}

async function sendWebhook(input: {
  destination: string;
  secretRef: string | null;
  payload: Record<string, unknown>;
}) {
  const secret = input.secretRef ? process.env[input.secretRef] : null;

  const res = await fetch(input.destination, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(secret ? { "x-admin-security-secret": secret } : {})
    },
    body: JSON.stringify(input.payload)
  });

  if (!res.ok) {
    throw new Error(`Webhook delivery failed: ${res.status}`);
  }

  return { status: res.status };
}

async function sendEmailStub(input: {
  destination: string;
  payload: Record<string, unknown>;
}) {
  // Stub only. Replace with real email provider adapter.
  console.log("admin security email stub", {
    to: input.destination,
    subject: `[${String(input.payload.severity ?? "critical")}] Admin security event`,
    payload: input.payload
  });

  return { stub: true };
}

type DeliveryItem = {
  delivery_id: string;
  channel_type: string;
  destination: string;
  secret_ref: string | null;
  payload: Record<string, unknown>;
};

async function deliver(item: DeliveryItem) {
  if (item.channel_type === "slack") {
    return sendSlack({
      destination: item.destination,
      secretRef: item.secret_ref,
      payload: item.payload
    });
  }

  if (item.channel_type === "webhook") {
    return sendWebhook({
      destination: item.destination,
      secretRef: item.secret_ref,
      payload: item.payload
    });
  }

  if (item.channel_type === "email") {
    return sendEmailStub({
      destination: item.destination,
      payload: item.payload
    });
  }

  if (item.channel_type === "siem_stub") {
    console.log("admin security SIEM stub", item.payload);
    return { stub: true };
  }

  throw new Error(`unsupported notification channel type: ${item.channel_type}`);
}

export async function runAdminSecurityNotificationDeliveryJob() {
  const { data, error } = await supabaseAdmin.rpc(
    "claim_admin_security_notification_deliveries",
    {
      p_batch_size: 50,
      p_worker_id: getWorkerId(),
      p_metadata: {
        source: "admin-security-notifications-worker"
      }
    }
  );

  if (error) throw error;

  const items = (data as DeliveryItem[] | null) ?? [];

  for (const item of items) {
    try {
      const providerResponse = await deliver(item);

      await supabaseAdmin.rpc("mark_admin_security_notification_delivery_sent", {
        p_delivery_id: item.delivery_id,
        p_provider_response: providerResponse,
        p_metadata: {
          workerId: getWorkerId()
        }
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "unknown notification delivery error";

      await supabaseAdmin.rpc("mark_admin_security_notification_delivery_failed", {
        p_delivery_id: item.delivery_id,
        p_error: message,
        p_retry_seconds: 300,
        p_metadata: {
          workerId: getWorkerId()
        }
      });
    }
  }

  return {
    claimed: items.length
  };
}
