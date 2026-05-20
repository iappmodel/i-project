import type { AdminCommandSummary } from "@/lib/admin-command-center/admin-command-center-client";

export function AdminCommandCenterSummaryCards(props: {
  summary: AdminCommandSummary;
}) {
  const cards: [string, number][] = [
    ["Open", props.summary.totalOpen],
    ["Urgent", props.summary.urgentCount],
    ["Critical", props.summary.criticalCount],
    ["Assigned to Me", props.summary.assignedToMeCount],
    ["Waiting Evidence", props.summary.waitingForEvidenceCount],
    ["Action Recommended", props.summary.actionRecommendedCount],
    ["Finance", props.summary.financeCount],
    ["Wallet", props.summary.walletCount],
    ["Payout", props.summary.payoutCount],
    ["Compliance", props.summary.complianceCount],
    ["System", props.summary.systemCount]
  ];

  return (
    <section className="grid gap-4 md:grid-cols-4">
      {cards.map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
          <p className="text-xs text-neutral-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-neutral-100">{value}</p>
        </div>
      ))}
    </section>
  );
}
