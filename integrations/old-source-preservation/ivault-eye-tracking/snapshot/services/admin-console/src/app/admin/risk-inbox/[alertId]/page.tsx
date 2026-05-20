import { notFound } from "next/navigation";
import { RiskAlertActionPanel } from "@/components/risk-inbox/RiskAlertActionPanel";
import { RiskAlertDetailHeader } from "@/components/risk-inbox/RiskAlertDetailHeader";
import { RiskAlertEvidencePanel } from "@/components/risk-inbox/RiskAlertEvidencePanel";
import { RiskAlertLinkedObjects } from "@/components/risk-inbox/RiskAlertLinkedObjects";
import { RiskAlertTimelineLink } from "@/components/risk-inbox/RiskAlertTimelineLink";
import { RiskInboxShell } from "@/components/risk-inbox/RiskInboxShell";
import { getRiskInboxAlert } from "@/lib/alphabet/operational-alerts/operational-alert-store";
import { formatRiskId, formatRiskLabel } from "@/lib/risk-inbox/risk-inbox-formatters";

export default async function RiskInboxDetailPage(props: { params: Promise<{ alertId: string }> }) {
  const { alertId } = await props.params;
  const alert = getRiskInboxAlert(alertId);

  if (!alert) {
    notFound();
  }

  return (
    <RiskInboxShell
      title="Risk alert detail"
      description={`${formatRiskLabel(alert.alert_type)} / ${formatRiskId(alert.alert_id)}`}
    >
      <div className="space-y-6">
        <RiskAlertDetailHeader alert={alert} />

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <RiskAlertEvidencePanel alert={alert} />

          <aside className="space-y-6">
            <RiskAlertActionPanel alert={alert} />
            <RiskAlertLinkedObjects alert={alert} />
            <RiskAlertTimelineLink alert={alert} />

            <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
              <h3 className="text-sm font-semibold text-neutral-100">Risk scores</h3>
              <pre className="mt-4 max-h-80 overflow-auto rounded-xl border border-neutral-900 bg-black p-4 text-xs text-neutral-300">
                {JSON.stringify(alert.risk_scores ?? {}, null, 2)}
              </pre>
            </section>
          </aside>
        </div>
      </div>
    </RiskInboxShell>
  );
}
