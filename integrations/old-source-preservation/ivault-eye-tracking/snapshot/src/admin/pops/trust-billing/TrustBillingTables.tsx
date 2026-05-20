import type { CSSProperties } from "react";

const sectionStyle: CSSProperties = {
  border: "1px solid #dbe3ea",
  borderRadius: 12,
  padding: 20,
  background: "#fff"
};

const tableWrap: CSSProperties = {
  marginTop: 20,
  overflowX: "auto"
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
  textAlign: "left"
};

const thStyle: CSSProperties = {
  padding: "8px 4px",
  fontSize: 12,
  color: "#64748b",
  borderBottom: "1px solid #e2e8f0"
};

const tdStyle: CSSProperties = {
  padding: "12px 4px",
  borderTop: "1px solid #f1f5f9"
};

function formatMoney(cents: number | null | undefined, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format((cents ?? 0) / 100);
}

export function TrustBillingAccountTable({ items }: { items: Record<string, unknown>[] }) {
  return (
    <section style={sectionStyle}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Trust billing accounts</h2>

      <div style={tableWrap}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Customer</th>
              <th style={thStyle}>Plan</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Payment</th>
              <th style={thStyle}>Cycle</th>
              <th style={thStyle}>Overage</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={String(item.admin_security_trust_billing_account_id ?? item.billing_account_key)}>
                <td style={tdStyle}>{item.customer_name != null ? String(item.customer_name) : "—"}</td>
                <td style={tdStyle}>
                  {item.plan_name != null ? String(item.plan_name) : item.plan_code != null ? String(item.plan_code) : "—"}
                </td>
                <td style={tdStyle}>{String(item.status ?? "")}</td>
                <td style={tdStyle}>{String(item.payment_status ?? "")}</td>
                <td style={tdStyle}>{String(item.billing_cycle ?? "")}</td>
                <td style={tdStyle}>
                  {formatMoney(
                    typeof item.current_period_overage_cents === "number" ? item.current_period_overage_cents : undefined,
                    String(item.currency ?? "USD")
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function TrustEntitlementTable({ items }: { items: Record<string, unknown>[] }) {
  return (
    <section style={sectionStyle}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Customer trust entitlements</h2>

      <div style={tableWrap}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Customer</th>
              <th style={thStyle}>Plan</th>
              <th style={thStyle}>Reports</th>
              <th style={thStyle}>Verifications</th>
              <th style={thStyle}>Audit packages</th>
              <th style={thStyle}>Legal hold</th>
              <th style={thStyle}>Regulator exports</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={String(item.admin_security_customer_trust_entitlement_id ?? item.entitlement_key)}>
                <td style={tdStyle}>{item.customer_name != null ? String(item.customer_name) : "—"}</td>
                <td style={tdStyle}>{String(item.plan_code ?? "")}</td>
                <td style={tdStyle}>{String(item.proof_report_limit ?? "")}</td>
                <td style={tdStyle}>{String(item.public_verification_limit ?? "")}</td>
                <td style={tdStyle}>{String(item.audit_package_limit ?? "")}</td>
                <td style={tdStyle}>{item.allow_legal_hold === true ? "Yes" : "No"}</td>
                <td style={tdStyle}>{item.allow_regulator_exports === true ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function TrustUsageRollupTable({ items }: { items: Record<string, unknown>[] }) {
  return (
    <section style={sectionStyle}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Trust usage rollups</h2>

      <div style={tableWrap}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Customer</th>
              <th style={thStyle}>Meter</th>
              <th style={thStyle}>Used</th>
              <th style={thStyle}>Limit</th>
              <th style={thStyle}>Usage</th>
              <th style={thStyle}>Overage</th>
              <th style={thStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={String(item.admin_security_trust_usage_rollup_id ?? item.usage_rollup_key)}>
                <td style={tdStyle}>{item.customer_name != null ? String(item.customer_name) : "—"}</td>
                <td style={tdStyle}>{String(item.meter_name ?? "")}</td>
                <td style={tdStyle}>{String(item.total_quantity ?? "")}</td>
                <td style={tdStyle}>{item.limit_quantity != null ? String(item.limit_quantity) : "—"}</td>
                <td style={tdStyle}>{item.usage_percent != null ? `${String(item.usage_percent)}%` : "—"}</td>
                <td style={tdStyle}>
                  {formatMoney(
                    typeof item.overage_amount_cents === "number" ? item.overage_amount_cents : undefined,
                    String(item.currency ?? "USD")
                  )}
                </td>
                <td style={tdStyle}>{String(item.usage_status ?? "")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
