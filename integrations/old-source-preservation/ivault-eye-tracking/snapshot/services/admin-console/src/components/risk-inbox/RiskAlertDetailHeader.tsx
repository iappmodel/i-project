import type { RiskInboxAlertRow } from "@/lib/risk-inbox/risk-inbox-client";
import { formatRiskDate, formatRiskId, formatRiskLabel } from "@/lib/risk-inbox/risk-inbox-formatters";
import { RiskAlertSeverityBadge } from "./RiskAlertSeverityBadge";
import { RiskAlertStatusBadge } from "./RiskAlertStatusBadge";

export function RiskAlertDetailHeader(props: { alert: RiskInboxAlertRow }) {
  const { alert } = props;

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
            Alert / {formatRiskId(alert.alert_id)}
          </p>

          <h2 className="mt-3 text-2xl font-semibold text-neutral-100">
            {formatRiskLabel(alert.alert_type)}
          </h2>

          <p className="mt-2 max-w-3xl text-sm text-neutral-400">
            {alert.public_summary ?? alert.internal_summary ?? "No summary provided."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <RiskAlertStatusBadge status={alert.status} />
          <RiskAlertSeverityBadge severity={alert.severity} />
          <span className="rounded-full border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-300">
            {alert.priority}
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 border-t border-neutral-900 pt-4 text-sm md:grid-cols-2 lg:grid-cols-5">
        <div>
          <p className="text-xs text-neutral-500">Source</p>
          <p className="mt-1 text-neutral-300">{alert.alert_source}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-500">Team</p>
          <p className="mt-1 text-neutral-300">{alert.assigned_team ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-500">Route</p>
          <p className="mt-1 text-xs text-neutral-400">{alert.route_reason ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-500">Created</p>
          <p className="mt-1 text-neutral-300">{formatRiskDate(alert.created_at)}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-500">Updated</p>
          <p className="mt-1 text-neutral-300">{formatRiskDate(alert.updated_at)}</p>
        </div>
      </div>
    </section>
  );
}
