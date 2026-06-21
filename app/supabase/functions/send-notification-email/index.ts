import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeadersStrict } from "../_shared/cors.ts";

// deno-lint-ignore no-explicit-any
export type SupabaseClientLike = any;

export type NotificationEmailType = "engagement" | "promotion" | "system" | "earnings";

export interface NotificationEmailRequest {
  userId: string;
  type: NotificationEmailType;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

const TYPE_TO_CATEGORY: Record<NotificationEmailType, string> = {
  engagement: "engagement",
  promotion: "promotions",
  system: "system",
  earnings: "earnings",
};

function jsonResponse(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

function buildEmailHtml(title: string, body?: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    h1 { margin: 0; font-size: 24px; }
    p { margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>${title}</h1></div>
    <div class="content">
      <p>${body || "You have a new notification from [ i ]."}</p>
      <p>Log in to your account to see more details.</p>
    </div>
    <div class="footer">
      <p>You're receiving this email because you have email notifications enabled.</p>
    </div>
  </div>
</body>
</html>`;
}

async function sendResendEmail(
  resendApiKey: string,
  to: string,
  title: string,
  body?: string,
): Promise<{ sent: boolean; error?: string }> {
  try {
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "notifications@resend.dev",
        to: [to],
        subject: title,
        html: buildEmailHtml(title, body),
      }),
    });

    if (emailResponse.ok) return { sent: true };
    const errorText = await emailResponse.text();
    return { sent: false, error: errorText || "resend_failed" };
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : "resend_error",
    };
  }
}

export async function handleSendNotificationEmail(
  req: Request,
  supabase: SupabaseClientLike,
  headers: Record<string, string>,
): Promise<Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ success: false, error: "Unauthorized" }, 401, headers);
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return jsonResponse({ success: false, error: "Unauthorized" }, 401, headers);
  }

  const payload = await req.json().catch(() => null) as NotificationEmailRequest | null;
  if (!payload?.userId || !payload.type || !payload.title?.trim()) {
    return jsonResponse({ success: false, error: "userId, type, and title are required" }, 400, headers);
  }

  const { userId, type, title, body, data } = payload;
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  const { data: preferences } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const categories = (preferences?.categories as string[] | undefined)
    ?? ["earnings", "system", "engagement", "promotions"];
  const category = TYPE_TO_CATEGORY[type];

  if (!categories.includes(category)) {
    return jsonResponse({ success: true, skipped: true, reason: "category_disabled" }, 200, headers);
  }

  const { data: notification, error: notifError } = await supabase
    .from("notifications")
    .insert({
      user_id: userId,
      type,
      title,
      body: body ?? null,
      data: data ?? {},
    })
    .select()
    .single();

  if (notifError) {
    console.error("[send-notification-email] insert error:", notifError);
    return jsonResponse({ success: false, error: "Failed to create notification" }, 500, headers);
  }

  let emailSent = false;
  let emailStub = false;
  let emailError: string | undefined;

  if (preferences?.email_enabled && resendApiKey) {
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    const userEmail = userData?.user?.email;
    if (userEmail) {
      const result = await sendResendEmail(resendApiKey, userEmail, title, body);
      emailSent = result.sent;
      emailError = result.error;
    }
  } else if (preferences?.email_enabled && !resendApiKey) {
    emailStub = true;
  }

  return jsonResponse(
    {
      success: true,
      notification,
      emailSent,
      emailStub,
      emailError: emailError ?? null,
    },
    200,
    headers,
  );
}

if (import.meta.main) {
  serve(async (req) => {
    const cors = getCorsHeadersStrict(req);
    if (!cors.ok) return cors.response;
    const headers = { ...cors.headers, "Content-Type": "application/json" };

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: cors.headers });
    }

    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405, headers);
    }

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      return await handleSendNotificationEmail(req, supabase, headers);
    } catch (error: unknown) {
      console.error("[send-notification-email] error:", error);
      return jsonResponse(
        { success: false, error: error instanceof Error ? error.message : "Internal server error" },
        500,
        headers,
      );
    }
  });
}
