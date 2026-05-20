export function AdminCommandCenterStatusBadge(props: { status?: string | null }) {
  const status = props.status ?? "unknown";

  const tone =
    status === "command_item_resolved"
      ? "border-emerald-800 bg-emerald-950 text-emerald-300"
      : status === "command_item_dismissed"
        ? "border-neutral-700 bg-neutral-900 text-neutral-300"
        : status === "command_item_escalated"
          ? "border-red-700 bg-red-950 text-red-200"
          : status === "command_item_action_approved"
            ? "border-violet-700 bg-violet-950 text-violet-200"
            : "border-yellow-800 bg-yellow-950 text-yellow-300";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>
      {status}
    </span>
  );
}
