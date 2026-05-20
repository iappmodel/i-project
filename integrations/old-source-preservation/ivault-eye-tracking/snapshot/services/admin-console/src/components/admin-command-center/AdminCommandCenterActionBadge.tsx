import { formatCommandLabel } from "@/lib/admin-command-center/admin-command-center-formatters";

export function AdminCommandCenterActionBadge(props: {
  action: string;
  tone?: "recommended" | "approved" | "rejected";
}) {
  const tone =
    props.tone === "approved"
      ? "border-emerald-800 bg-emerald-950 text-emerald-300"
      : props.tone === "rejected"
        ? "border-red-900 bg-red-950 text-red-300"
        : "border-violet-800 bg-violet-950 text-violet-300";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>
      {formatCommandLabel(props.action)}
    </span>
  );
}
