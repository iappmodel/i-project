import { RiskInboxShell } from "@/components/risk-inbox/RiskInboxShell";
import { RiskInboxTable } from "@/components/risk-inbox/RiskInboxTable";
import { listRiskInboxAlerts } from "@/lib/alphabet/operational-alerts/operational-alert-store";

export default function RiskInboxPage() {
  const alerts = listRiskInboxAlerts({ limit: 100 });

  return (
    <RiskInboxShell
      title="Operational alerts"
      description="Proactive risk, payout, wallet, review, and infrastructure alerts. Detection and routing only."
    >
      <RiskInboxTable alerts={alerts} />
    </RiskInboxShell>
  );
}
