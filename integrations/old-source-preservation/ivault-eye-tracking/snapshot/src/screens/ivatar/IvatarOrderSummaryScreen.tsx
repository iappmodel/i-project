import React from "react";
import { ivatarNavigate } from "../../features/ivatar/ivatarNavigate";

function readOrder() {
  try {
    const raw = sessionStorage.getItem("ivatar_order");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function IvatarOrderSummaryScreen() {
  const order = readOrder();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#060708",
        color: "white",
        padding: 20,
        fontFamily: "DM Sans, system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 920, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => ivatarNavigate("/ivatar/tryon")}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            color: "rgba(255,255,255,0.86)",
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          ← Back
        </button>
      </div>

      <header style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontFamily: "Syne, system-ui, sans-serif" }}>Order prepared</h1>
        <div style={{ color: "rgba(255,255,255,0.72)", marginTop: 6 }}>
          No payment or checkout was started.
        </div>
      </header>

      <div style={{ display: "grid", gap: 12, maxWidth: 920 }}>
        <div
          style={{
            padding: 14,
            borderRadius: 12,
            background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{order?.name ?? "No order"}</div>
            <div style={{ color: "rgba(255,255,255,0.8)", marginTop: 6 }}>{order?.price ?? "-"}</div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ color: "rgba(255,255,255,0.7)" }}>Recommended size</div>
            <div style={{ fontWeight: 700 }}>{order?.recommendedSize ?? "-"}</div>
          </div>
        </div>

        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: "rgba(255,255,255,0.02)",
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ color: "rgba(255,255,255,0.7)" }}>Fit score</div>
            <div style={{ fontWeight: 700 }}>{order?.fitScore ?? "-"}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ color: "rgba(255,255,255,0.7)" }}>Delivery estimate</div>
            <div style={{ fontWeight: 700 }}>{order?.delivery ?? "-"}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ color: "rgba(255,255,255,0.7)" }}>Return-risk</div>
            <div style={{ fontWeight: 700 }}>{order?.returnRisk ?? "-"}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ color: "rgba(255,255,255,0.7)" }}>Tailoring</div>
            <div style={{ fontWeight: 700 }}>{order?.tailoring ?? "-"}</div>
          </div>
        </div>

        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: "linear-gradient(180deg, rgba(8,10,12,0.6), rgba(10,12,14,0.45))",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Privacy-safe sizing</div>
          <div style={{ color: "rgba(255,255,255,0.75)" }}>
            Brand receives a size token only. Raw scan data stays private.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => {
              console.log("[Ivatar] Confirm mock order");
              try {
                // no-op backend; push a transient flag
                sessionStorage.setItem("ivatar_order_confirmed", "1");
              } catch {}
              // show a transient in-page toast via simple alert fallback
              alert("Mock order confirmed\\nNo payment was processed.");
            }}
            style={{
              background: "linear-gradient(180deg, rgba(124,252,178,0.12), rgba(124,252,178,0.06))",
              border: "1px solid rgba(124,252,178,0.18)",
              color: "#7CFCB2",
              padding: "10px 14px",
              borderRadius: 10,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Confirm mock order
          </button>

          <button
            type="button"
            onClick={() => ivatarNavigate("/ivatar/tryon")}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.9)",
              padding: "10px 12px",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            Back to try-on
          </button>

          <button
            type="button"
            onClick={() => ivatarNavigate("/ivatar/worlds")}
            style={{
              marginLeft: "auto",
              background:
                "linear-gradient(180deg, rgba(255,207,138,0.12), rgba(255,207,138,0.04))",
              border: "1px solid rgba(255,207,138,0.18)",
              color: "#FFD28A",
              padding: "10px 14px",
              borderRadius: 10,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Enter worlds with this look
          </button>
        </div>
      </div>
    </div>
  );
}

