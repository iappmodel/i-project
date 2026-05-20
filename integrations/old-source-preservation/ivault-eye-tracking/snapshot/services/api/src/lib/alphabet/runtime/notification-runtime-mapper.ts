import type { RuntimeNotificationDraft } from "@/types/alphabet/runtime.types";

export function buildNotificationDraft(params: {
  userId: string;
  sourceSystem: string;
  sourceObjectId?: string | null;
  sourceEventIds: string[];
  status: "created" | "blocked" | "completed" | "review";
  reasonCodes: string[];
}): RuntimeNotificationDraft {
  const title =
    params.status === "completed"
      ? "Action completed"
      : params.status === "blocked"
        ? "Action could not continue"
        : params.status === "review"
          ? "Action under review"
          : "Action received";

  const body =
    params.status === "completed"
      ? "Your action completed successfully."
      : params.status === "blocked"
        ? "This action cannot continue right now."
        : params.status === "review"
          ? "This action needs review before it can continue."
          : "Your action was received.";

  return {
    recipientUserId: params.userId,
    sourceSystem: params.sourceSystem,
    sourceObjectId: params.sourceObjectId ?? null,
    sourceEventIds: params.sourceEventIds,
    category: "action",
    severity: params.status === "blocked" ? "warning" : "info",
    status: "created",
    title,
    body,
    explanationClass: params.status,
    objectLabel: "action",
    internalReasonCodes: params.reasonCodes,
    privacySensitivity: "medium",
    dedupeKey: `${params.sourceSystem}:${params.sourceObjectId ?? "unknown"}:${params.status}`,
    metadata: {
      source: "pipeline_runtime"
    }
  };
}
