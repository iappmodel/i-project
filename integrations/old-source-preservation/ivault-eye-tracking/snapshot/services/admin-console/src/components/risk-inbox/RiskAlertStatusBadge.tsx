export function RiskAlertStatusBadge(props: { status?: string | null }) {
  const status = props.status ?? "unknown";

  const tone =
    status === "alert_resolved"
      ? "border-emerald-800 bg-emerald-950 text-emerald-300"
      : status === "alert_escalated"
        ? "border-red-700 bg-red-950 text-red-200"
        : status === "alert_acknowledged" || status === "alert_investigating"
          ? "border-yellow-800 bg-yellow-950 text-yellow-300"
          : status === "alert_dismissed" || status === "alert_suppressed"
            ? "border-neutral-700 bg-neutral-900 text-neutral-400"
            : "border-orange-800 bg-orange-950 text-orange-300";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>
      {status}
    </span>
  );
}
