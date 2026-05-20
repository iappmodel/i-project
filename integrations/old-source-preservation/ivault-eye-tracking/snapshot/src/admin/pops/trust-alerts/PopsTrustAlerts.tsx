import type { CSSProperties } from "react";
import { TrustAlertEventTable, TrustAlertIntegrityCards, TrustAlertNotificationTable } from "./TrustAlertTables";

const sectionGap: CSSProperties = { display: "grid", gap: 16 };

export type PopsTrustAlertsProps = {
  integrity?: Record<string, unknown> | null;
  events?: Record<string, unknown>[];
  notifications?: Record<string, unknown>[];
};

export function PopsTrustAlerts({
  integrity = null,
  events = [],
  notifications = []
}: PopsTrustAlertsProps) {
  return (
    <section style={sectionGap}>
      <header>
        <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700 }}>Trust Alerts</h2>
        <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
          Escalation, delivery attempts, and integrity for trust signals. Wire to{" "}
          <code>/v1/admin/security-trust-alerts</code> for live data.
        </p>
      </header>

      <TrustAlertIntegrityCards integrity={integrity} />
      <TrustAlertEventTable items={events} />
      <TrustAlertNotificationTable items={notifications} />
    </section>
  );
}
