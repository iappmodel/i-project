import Link from "next/link";
import type { RiskInboxAlertRow } from "@/lib/risk-inbox/risk-inbox-client";

export function riskAlertTimelineHref(alert: RiskInboxAlertRow): string | null {
  if (alert.external_transfer_id) {
    return `/admin/timeline/external_transfer/${alert.external_transfer_id}`;
  }
  if (alert.compensation_id) {
    return `/admin/timeline/compensation/${alert.compensation_id}`;
  }
  if (alert.ledger_entry_id) {
    return `/admin/timeline/ledger_entry/${alert.ledger_entry_id}`;
  }
  if (alert.execution_request_id) {
    return `/admin/timeline/execution_request/${alert.execution_request_id}`;
  }
  if (alert.wallet_id) {
    return `/admin/timeline/wallet/${alert.wallet_id}`;
  }
  return null;
}

export function RiskAlertTimelineLink(props: { alert: RiskInboxAlertRow }) {
  const href = riskAlertTimelineHref(props.alert);
  if (!href) return null;

  return (
    <Link
      href={href}
      className="block rounded-2xl border border-blue-900 bg-blue-950/20 p-5 text-sm text-blue-200 hover:bg-blue-950/40"
    >
      Open system timeline →
    </Link>
  );
}
