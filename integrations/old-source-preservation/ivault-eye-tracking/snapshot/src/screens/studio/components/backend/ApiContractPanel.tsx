import { STUDIO_API_CONTRACT_INDEX, type ApiContractDescriptor } from "../../backend/studioApiContracts";

export function ApiContractPanel() {
  const byDomain = STUDIO_API_CONTRACT_INDEX.reduce<Record<string, ApiContractDescriptor[]>>((acc, row) => {
    acc[row.domain] = acc[row.domain] ?? [];
    acc[row.domain].push(row);
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", margin: 0 }}>
        Static contract index for Stage 9 HTTP mapping. Types live in <code>studioApiContracts.ts</code>.
      </p>
      {Object.entries(byDomain).map(([domain, rows]) => (
        <div key={domain}>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>{domain}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {rows.map((r) => (
              <div
                key={`${domain}-${r.name}`}
                className="ist-mono"
                style={{
                  fontSize: 9,
                  padding: "6px 8px",
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ color: "var(--ist-muted)" }}>{r.name}</div>
                <div>
                  req: <span style={{ color: "#a5f3fc" }}>{r.requestType}</span> → res:{" "}
                  <span style={{ color: "#fde68a" }}>{r.responseType}</span>
                </div>
                <div style={{ marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{r.authority.replace(/_/g, " ")}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
