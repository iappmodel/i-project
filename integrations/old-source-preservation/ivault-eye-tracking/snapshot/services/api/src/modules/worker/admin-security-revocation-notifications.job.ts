import { supabaseAdmin } from "../../config/supabase";

function getWorkerId() {
  return process.env.WORKER_ID ?? `worker-${process.pid}`;
}

export async function runAdminSecurityRevocationNotificationsJob() {
  const workerId = getWorkerId();

  const { data: notifications, error } = await supabaseAdmin
    .from("admin_security_revocation_notifications")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(25);

  if (error) throw error;

  const items = notifications ?? [];

  for (const item of items) {
    const { error: claimError } = await supabaseAdmin
      .from("admin_security_revocation_notifications")
      .update({
        status: "sending",
        claimed_by_worker_id: workerId,
        claimed_at: new Date().toISOString()
      })
      .eq("id", item.id)
      .eq("status", "pending");

    if (claimError) continue;

    try {
      const { error: sentError } = await supabaseAdmin
        .from("admin_security_revocation_notifications")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          metadata: {
            ...(item.metadata ?? {}),
            mvpDelivery: "not-sent-external",
            workerId
          }
        })
        .eq("id", item.id);

      if (sentError) throw sentError;
    } catch (err: any) {
      await supabaseAdmin
        .from("admin_security_revocation_notifications")
        .update({
          status: "failed",
          failed_at: new Date().toISOString(),
          last_error: err?.message ?? "unknown revocation notification error"
        })
        .eq("id", item.id);
    }
  }

  return {
    processed: items.length
  };
}
