import type { MagicReveal, RevealType } from "../../studioTypes";

function revealIcon(rt: RevealType): string {
  switch (rt) {
    case "always_hidden":
      return "◎";
    case "tip_to_reveal":
      return "✦";
    case "pay_to_reveal":
      return "◆";
    case "watch_to_reveal":
      return "▶";
    case "collective_reveal":
      return "◇";
    default:
      return "✦";
  }
}

function priceBadge(r: MagicReveal): string | null {
  if (r.revealType === "tip_to_reveal" && r.pricing) return `Tip ${r.pricing.amount} ${r.pricing.coin}`;
  if (r.revealType === "pay_to_reveal" && r.pricing) return `Pay ${r.pricing.amount} ${r.pricing.coin}`;
  if (r.safety.safetyClass === "privacy_sensitive") return "Privacy";
  if (r.revealType === "watch_to_reveal") return "Watch";
  if (r.revealType === "collective_reveal") return "Collective";
  if (r.status === "blocked" || r.safety.publishBlocked) return "Blocked";
  return null;
}

export function MagicRevealList({
  reveals,
  selectedId,
  onSelect,
}: {
  reveals: MagicReveal[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
      {reveals.map((m) => {
        const selected = m.id === selectedId;
        const badge = priceBadge(m);
        const danger = m.status === "blocked" || m.safety.safetyStatus === "blocked" || m.safety.publishBlocked;
        const privacy = m.safety.safetyClass === "privacy_sensitive";
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelect(m.id)}
            className={`ist-magic-reveal-row${selected ? " ist-magic-reveal-row--selected" : ""}${danger ? " ist-magic-reveal-row--danger" : ""}${privacy ? " ist-magic-reveal-row--privacy" : ""}`}
          >
            <span className="ist-magic-reveal-row__icon" aria-hidden>
              {revealIcon(m.revealType)}
            </span>
            <span className="ist-magic-reveal-row__main">
              <span className="ist-magic-reveal-row__name">{m.name}</span>
              <span className="ist-mono ist-magic-reveal-row__time">
                {(m.timelineStartMs / 1000).toFixed(1)}s – {(m.timelineEndMs / 1000).toFixed(1)}s
              </span>
            </span>
            <span className="ist-magic-reveal-row__meta">
              {badge ? <span className="ist-chip ist-magic-reveal-row__badge">{badge}</span> : null}
              <span className={`ist-chip ist-magic-reveal-row__status${danger ? " ist-chip--bad" : ""}`}>{m.status}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
