export function RiskAlertSeverityBadge(props: { severity?: string | null }) {
  const severity = props.severity ?? "medium";

  const tone =
    severity === "critical"
      ? "border-red-700 bg-red-950 text-red-200"
      : severity === "high"
        ? "border-orange-700 bg-orange-950 text-orange-200"
        : severity === "medium"
          ? "border-yellow-700 bg-yellow-950 text-yellow-200"
          : "border-neutral-700 bg-neutral-900 text-neutral-300";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>
      {severity}
    </span>
  );
}
