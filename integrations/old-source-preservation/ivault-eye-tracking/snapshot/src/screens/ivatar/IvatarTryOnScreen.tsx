import React, { useEffect, useState } from "react";
import StudioIntegrationCard from "../../components/ivatar/StudioIntegrationCard";
import { mockOutfits } from "../../features/ivatar/ivatarMock";
import { ivatarNavigate } from "../../features/ivatar/ivatarNavigate";

export default function IvatarTryOnScreen() {
  const [selected, setSelected] = useState(mockOutfits[0].id);
  const [arrivalVisible, setArrivalVisible] = useState(false);
  const [toasts, setToasts] = useState<
    { id: string; title: string; body?: string }[]
  >([]);

  const outfit = mockOutfits.find((o) => o.id === selected) || mockOutfits[0];

  function pushToast(title: string, body?: string) {
    const id = String(Date.now()) + Math.random().toString(16).slice(2, 6);
    setToasts((t) => [...t, { id, title, body }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 2200);
  }

  const fitDataMap: Record<
    string,
    {
      fitScore: string;
      size: string;
      notes: string;
      returnRisk: string;
      tailoring: string;
      delivery: string;
    }
  > = {
    "street-1": {
      fitScore: "94%",
      size: "M relaxed",
      notes: "Slight oversized shoulder, clean crop",
      returnRisk: "Low",
      tailoring: "None needed",
      delivery: "2–4 days",
    },
    "lux-1": {
      fitScore: "89%",
      size: "40 tailored",
      notes: "Close waist, strong shoulder line",
      returnRisk: "Medium",
      tailoring: "Hem adjustment suggested",
      delivery: "5–7 days",
    },
    "every-1": {
      fitScore: "97%",
      size: "M true-to-fit",
      notes: "Best match to TrueFit body profile",
      returnRisk: "Very low",
      tailoring: "None needed",
      delivery: "2–3 days",
    },
  };

  useEffect(() => {
    try {
      const v = sessionStorage.getItem("ivatar_generated");
      if (v === "1") {
        setArrivalVisible(true);
        sessionStorage.removeItem("ivatar_generated");
        const t = setTimeout(() => setArrivalVisible(false), 2200);
        return () => clearTimeout(t);
      }
    } catch (e) {
      // ignore in non-browser env
    }
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#070809",
        color: "white",
        padding: 20,
        fontFamily: "DM Sans, system-ui, sans-serif",
      }}
    >
      {/* toasts container */}
      <div style={{ position: "fixed", right: 18, top: 84, zIndex: 9999 }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              background: "linear-gradient(180deg, rgba(12,16,12,0.9), rgba(6,8,6,0.85))",
              border: "1px solid rgba(124,252,178,0.12)",
              color: "#eafff0",
              padding: "10px 12px",
              borderRadius: 10,
              marginBottom: 8,
              minWidth: 200,
              boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ fontWeight: 800 }}>{t.title}</div>
            {t.body && <div style={{ color: "rgba(255,255,255,0.8)", marginTop: 6 }}>{t.body}</div>}
          </div>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 8,
          maxWidth: 980,
        }}
      >
        <button
          type="button"
          onClick={() => ivatarNavigate("/ivatar/studio")}
          style={{
            flexShrink: 0,
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
          ← Studio
        </button>
        <button
          type="button"
          onClick={() => ivatarNavigate("/iam")}
          style={{
            marginLeft: "auto",
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid rgba(124,231,252,0.12)",
            background: "rgba(124,231,252,0.04)",
            color: "rgba(124,231,252,0.95)",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Profile
        </button>
      </div>

      <header
        style={{
          marginBottom: 12,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          maxWidth: 980,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontFamily: "Syne, system-ui, sans-serif" }}>Try it on</h1>
          <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.66)", fontSize: 13 }}>
            Mock fits — sizing and commerce are illustrative only.
          </p>
        </div>

        <button
          type="button"
          onClick={() => ivatarNavigate("/ivatar/worlds")}
          style={{
            padding: "10px 16px",
            borderRadius: 12,
            fontWeight: 700,
            border: "1px solid rgba(255,207,138,0.22)",
            background:
              "linear-gradient(180deg, rgba(255,207,138,0.14), rgba(255,207,138,0.05))",
            color: "#FFD28A",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Enter worlds →
        </button>
      </header>

      {/* subtle arrival toast */}
      {arrivalVisible && (
        <div
          style={{
            maxWidth: 980,
            marginBottom: 12,
            background: "linear-gradient(180deg, rgba(124,252,178,0.06), rgba(124,252,178,0.03))",
            border: "1px solid rgba(124,252,178,0.12)",
            color: "#dfffe6",
            padding: "10px 14px",
            borderRadius: 10,
            display: "inline-flex",
            gap: 12,
            alignItems: "center",
            boxShadow: "0 8px 30px rgba(124,252,178,0.06)",
          }}
        >
          <div style={{ fontWeight: 800 }}>Ivatar generated</div>
          <div style={{ color: "rgba(255,255,255,0.8)" }}>Ready for virtual try-on</div>
        </div>
      )}

      <div style={{ display: "flex", gap: 16, flexDirection: "column", maxWidth: 980 }}>
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              width: 260,
              height: 420,
              borderRadius: 16,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
              flexShrink: 0,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <svg width="130" height="210" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2a4 4 0 100 8 4 4 0 000-8zm0 10c4.418 0 8 2.239 8 5v1H4v-1c0-2.761 3.582-5 8-5z"
                  fill="#7CFCB2"
                />
              </svg>
              <div style={{ marginTop: 10, color: "rgba(255,255,255,0.8)" }}>{outfit.name}</div>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              {mockOutfits.map((o) => (
                <OutfitCard
                  key={o.id}
                  outfit={o}
                  selected={o.id === selected}
                  onSelect={() => setSelected(o.id)}
                />
              ))}
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.02)",
                padding: 12,
                borderRadius: 10,
                marginTop: 12,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Fit details</div>
              <div style={{ color: "rgba(255,255,255,0.8)" }}>
                Fit score: {outfit.fitScore} • Suggested size: {outfit.suggestedSize}
              </div>
              <div style={{ marginTop: 8, color: "rgba(255,255,255,0.7)" }}>
                Comfort note: {outfit.comfort}
              </div>
              <div style={{ marginTop: 8, color: "rgba(255,255,255,0.6)" }}>
                Price: {outfit.price}
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => {
                    // prepare mocked order and navigate to summary
                    const order = {
                      outfitId: outfit.id,
                      name: outfit.name,
                      price: outfit.price,
                      recommendedSize: fitDataMap[outfit.id]?.size,
                      fitScore: fitDataMap[outfit.id]?.fitScore,
                      delivery: fitDataMap[outfit.id]?.delivery,
                      returnRisk: fitDataMap[outfit.id]?.returnRisk,
                      tailoring: fitDataMap[outfit.id]?.tailoring,
                      timestamp: Date.now(),
                    };
                    try {
                      sessionStorage.setItem(\"ivatar_order\", JSON.stringify(order));
                    } catch (e) {
                      console.warn(\"sessionStorage unavailable\", e);
                    }
                    ivatarNavigate(\"/ivatar/order-summary\");
                  }}
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(124,252,178,0.12), rgba(124,252,178,0.06))",
                    border: "1px solid rgba(124,252,178,0.18)",
                    color: "#7CFCB2",
                    padding: "10px 14px",
                    borderRadius: 10,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Order this fit
                </button>

                <button
                  type="button"
                  onClick={() => {
                    console.log("[Ivatar] Send size token tapped (demo)");
                    pushToast("Size token ready", "Brand receives fit data, not raw body scan.");
                  }}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.9)",
                    padding: "10px 12px",
                    borderRadius: 10,
                    cursor: "pointer",
                  }}
                >
                  Send size token
                </button>
              </div>
            </div>

            {/* Fit Intelligence commerce panel */}
            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 12,
                background: "linear-gradient(180deg, rgba(6,8,10,0.6), rgba(8,10,12,0.45))",
                border: "1px solid rgba(255,255,255,0.04)",
                maxWidth: 520,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 800, fontFamily: "Syne, system-ui, sans-serif" }}>Fit Intelligence</div>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>{fitDataMap[outfit.id]?.delivery}</div>
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ color: "rgba(255,255,255,0.7)" }}>Fit score</div>
                  <div style={{ fontWeight: 700 }}>{fitDataMap[outfit.id]?.fitScore}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ color: "rgba(255,255,255,0.7)" }}>Recommended size</div>
                  <div style={{ fontWeight: 700 }}>{fitDataMap[outfit.id]?.size}</div>
                </div>
                <div>
                  <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>Fit notes</div>
                  <div style={{ marginTop: 4 }}>{fitDataMap[outfit.id]?.notes}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ color: "rgba(255,255,255,0.7)" }}>Return-risk estimate</div>
                  <div style={{ fontWeight: 700 }}>{fitDataMap[outfit.id]?.returnRisk}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ color: "rgba(255,255,255,0.7)" }}>Tailoring</div>
                  <div style={{ fontWeight: 700 }}>{fitDataMap[outfit.id]?.tailoring}</div>
                </div>

                <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, marginTop: 6 }}>
                  Brands receive sizing tokens only. Raw scan data stays private.
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    type="button"
                  onClick={() => {
                      const order = {
                        outfitId: outfit.id,
                        name: outfit.name,
                        price: outfit.price,
                        recommendedSize: fitDataMap[outfit.id]?.size,
                        fitScore: fitDataMap[outfit.id]?.fitScore,
                        delivery: fitDataMap[outfit.id]?.delivery,
                        returnRisk: fitDataMap[outfit.id]?.returnRisk,
                        tailoring: fitDataMap[outfit.id]?.tailoring,
                        timestamp: Date.now(),
                      };
                      try {
                        sessionStorage.setItem("ivatar_order", JSON.stringify(order));
                      } catch (e) {}
                      ivatarNavigate("/ivatar/order-summary");
                    }}
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(124,252,178,0.12), rgba(124,252,178,0.06))",
                      border: "1px solid rgba(124,252,178,0.18)",
                      color: "#7CFCB2",
                      padding: "10px 14px",
                      borderRadius: 10,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Order this fit
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      pushToast("Size token ready", "Brand receives fit data, not raw body scan.");
                    }}
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.06)",
                      color: "rgba(255,255,255,0.9)",
                      padding: "10px 12px",
                      borderRadius: 10,
                      cursor: "pointer",
                    }}
                  >
                    Send size token
                  </button>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 14, maxWidth: 520 }}>
              <StudioIntegrationCard compact />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OutfitCard({
  outfit,
  selected,
  onSelect,
}: {
  outfit: (typeof mockOutfits)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
      style={{
        minWidth: 180,
        padding: 12,
        borderRadius: 10,
        background: selected ? "rgba(124,252,178,0.04)" : "rgba(255,255,255,0.02)",
        border: selected
          ? "1px solid rgba(124,252,178,0.14)"
          : "1px solid rgba(255,255,255,0.02)",
        cursor: "pointer",
      }}
    >
      <div style={{ fontWeight: 800 }}>{outfit.name}</div>
      <div style={{ color: "rgba(255,255,255,0.7)", marginTop: 8 }}>
        Fit score {outfit.fitScore} • {outfit.suggestedSize}
      </div>
      <div style={{ color: "rgba(255,255,255,0.55)", marginTop: 6, fontSize: 12 }}>
        {outfit.comfort}
      </div>
      <div style={{ color: "rgba(255,255,255,0.6)", marginTop: 8 }}>{outfit.price}</div>
    </div>
  );
}
