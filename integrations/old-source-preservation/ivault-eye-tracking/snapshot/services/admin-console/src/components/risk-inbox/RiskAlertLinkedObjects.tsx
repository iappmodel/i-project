import type { RiskInboxAlertRow } from "@/lib/risk-inbox/risk-inbox-client";
import { formatRiskId } from "@/lib/risk-inbox/risk-inbox-formatters";

const rows: Array<[string, keyof RiskInboxAlertRow]> = [
  ["User", "user_id"],
  ["Wallet", "wallet_id"],
  ["Ledger", "ledger_entry_id"],
  ["External transfer", "external_transfer_id"],
  ["Compensation", "compensation_id"],
  ["Review case", "review_case_id"],
  ["Execution", "execution_request_id"],
  ["Pipeline", "pipeline_id"],
  ["Saga", "saga_id"],
  ["Provider reconciliation", "provider_reconciliation_id"]
];

export function RiskAlertLinkedObjects(props: { alert: RiskInboxAlertRow }) {
  const { alert } = props;

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
      <h3 className="text-sm font-semibold text-neutral-100">Linked objects</h3>
      <div className="mt-4 space-y-3 text-sm">
        {rows.map(([label, key]) => {
          const value = alert[key] as string | null | undefined;
          return (
            <div key={label} className="rounded-xl border border-neutral-900 bg-black p-3">
              <p className="text-xs text-neutral-500">{label}</p>
              <p className="mt-1 font-mono text-xs text-neutral-300">{formatRiskId(value ?? null)}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
