import type { MagicReveal, RevealType } from "../../studioTypes";
import type { StudioActions } from "../../studioStore";
import { isRevealTypeSelectable } from "../../magic/magicSafetyRules";

const CARDS: { type: RevealType; title: string; hint: string; icon: string }[] = [
  { type: "always_hidden", title: "Always Hidden", hint: "Never shown — privacy or safety.", icon: "◎" },
  { type: "free_tap_reveal", title: "Tap to Reveal", hint: "One tap unlocks for the session.", icon: "◇" },
  { type: "tip_to_reveal", title: "Tip to Reveal", hint: "Viewer tips the creator to unlock.", icon: "✦" },
  { type: "pay_to_reveal", title: "Pay to Reveal", hint: "Fixed price in coins.", icon: "◆" },
  { type: "watch_to_reveal", title: "Watch to Reveal", hint: "Sponsor action; may reward viewer & creator.", icon: "▶" },
  { type: "follow_to_reveal", title: "Follow to Reveal", hint: "Requires following the creator.", icon: "＋" },
  { type: "subscribe_to_reveal", title: "Subscribe to Reveal", hint: "Subscriber-only unlock.", icon: "★" },
  { type: "trust_to_reveal", title: "Trust to Reveal", hint: "Minimum trust score.", icon: "◎" },
  { type: "age_to_reveal", title: "Age to Reveal", hint: "Age verification — payment cannot bypass.", icon: "!" },
  { type: "location_to_reveal", title: "Location to Reveal", hint: "Must be within a geo region.", icon: "⌖" },
  { type: "time_to_reveal", title: "Time to Reveal", hint: "Unlocks at a scheduled time.", icon: "⏱" },
  { type: "collective_reveal", title: "Collective Reveal", hint: "Community tips reach a threshold.", icon: "◇" },
  { type: "creator_approval_reveal", title: "Creator Approval", hint: "Viewer requests access.", icon: "✉" },
];

export function MagicRevealTab({ reveal, actions }: { reveal: MagicReveal; actions: StudioActions }) {
  const blockedClass = reveal.safety.safetyClass === "blocked";
  const minor = reveal.safety.safetyClass === "minor_sensitive";
  const ageGate = reveal.safety.ageGateRequired;

  return (
    <div>
      {ageGate ? (
        <div className="ist-chip ist-chip--warn" style={{ marginBottom: 12, display: "block" }}>
          Age gates cannot be bypassed by payment — monetized reveal types are disabled where required.
        </div>
      ) : null}
      {blockedClass ? (
        <div className="ist-chip ist-chip--bad" style={{ marginBottom: 12, display: "block" }}>
          Safety class blocked — only &quot;Always hidden&quot; is available.
        </div>
      ) : null}
      {minor ? (
        <div className="ist-chip ist-chip--warn" style={{ marginBottom: 12, display: "block" }}>
          Minor-sensitive: paid / tip monetization is not allowed.
        </div>
      ) : null}
      <div className="ist-magic-reveal-cards">
        {CARDS.map((c) => {
          const on = reveal.revealType === c.type;
          const allowed = isRevealTypeSelectable(reveal, c.type);
          return (
            <button
              key={c.type}
              type="button"
              disabled={!allowed}
              className={`ist-magic-reveal-card${on ? " ist-magic-reveal-card--on" : ""}${!allowed ? " ist-magic-reveal-card--disabled" : ""}`}
              onClick={() => allowed && actions.updateMagicRevealType(reveal.id, c.type)}
            >
              <span className="ist-magic-reveal-card__icon" aria-hidden>
                {c.icon}
              </span>
              <span className="ist-magic-reveal-card__title">{c.title}</span>
              <span className="ist-magic-reveal-card__hint">{c.hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
