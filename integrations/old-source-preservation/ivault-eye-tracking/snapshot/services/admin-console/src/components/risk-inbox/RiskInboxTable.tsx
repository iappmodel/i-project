import Link from "next/link";
import type { RiskInboxAlertRow } from "@/lib/risk-inbox/risk-inbox-client";
import { formatRiskDate, formatRiskId, formatRiskLabel } from "@/lib/risk-inbox/risk-inbox-formatters";
import { RiskAlertStatusBadge } from "./RiskAlertStatusBadge";
import { RiskAlertSeverityBadge } from "./RiskAlertSeverityBadge";

export function RiskInboxTable(props: { alerts: RiskInboxAlertRow[] }) {
  if (!props.alerts.length) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-950 p-10 text-center">
        <h3 className="text-sm font-semibold text-neutral-200">No alerts</h3>
        <p className="mt-2 text-sm text-neutral-500">Risk inbox is clean for this view.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-neutral-800 bg-neutral-900/60 text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-4 py-3">Alert</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Severity</th>
            <th className="px-4 py-3">Team</th>
            <th className="px-4 py-3">Linked Object</th>
            <th className="px-4 py-3">Created</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-neutral-900">
          {props.alerts.map((alert) => (
            <tr key={alert.alert_id} className="hover:bg-neutral-900/50">
              <td className="px-4 py-3">
                <Link
                  href={`/admin/risk-inbox/${alert.alert_id}`}
                  className="font-mono text-xs text-red-300 hover:text-red-200"
                >
                  {formatRiskId(alert.alert_id)}
                </Link>
                <p className="mt-1 max-w-md truncate text-xs text-neutral-500">
                  {alert.public_summary ?? alert.internal_summary ?? "No summary"}
                </p>
              </td>

              <td className="px-4 py-3 text-neutral-300">{formatRiskLabel(alert.alert_type)}</td>

              <td className="px-4 py-3">
                <RiskAlertStatusBadge status={alert.status} />
              </td>

              <td className="px-4 py-3">
                <RiskAlertSeverityBadge severity={alert.severity} />
              </td>

              <td className="px-4 py-3 text-neutral-300">{alert.assigned_team ?? "—"}</td>

              <td className="px-4 py-3 font-mono text-xs text-neutral-400">
                {formatRiskId(
                  alert.external_transfer_id ??
                    alert.compensation_id ??
                    alert.ledger_entry_id ??
                    alert.execution_request_id ??
                    alert.wallet_id ??
                    alert.user_id
                )}
              </td>

              <td className="px-4 py-3 text-xs text-neutral-500">{formatRiskDate(alert.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
