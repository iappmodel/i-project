import type { MagicReveal, RevealSafetyClass, RevealType } from "../studioTypes";

const MONETIZED: RevealType[] = [
  "tip_to_reveal",
  "pay_to_reveal",
  "collective_reveal",
];

export function isMonetizedRevealType(revealType: RevealType): boolean {
  return MONETIZED.includes(revealType);
}

/** Rule: paid/tip/collective reveals need a substantive description. */
export function paidRevealRequiresDescription(reveal: MagicReveal): boolean {
  if (!isMonetizedRevealType(reveal.revealType)) return false;
  const d = reveal.description?.trim() ?? "";
  return d.length < 3;
}

/** Age gate cannot be bypassed by payment — informational; enforced in eligibility engine. */
export const COPY_AGE_GATE_PAYMENT = "Age gates cannot be bypassed by payment.";

/** Creator revenue settles pending — copy for UI. */
export const COPY_PENDING_SETTLEMENT =
  "Creator revenue settles as pending until verification clears.";

export function applyMagicSafetyScanToReveal(reveal: MagicReveal, nowIso: string): MagicReveal {
  const cls: RevealSafetyClass = reveal.safety.safetyClass;
  let safetyStatus = reveal.safety.safetyStatus;
  let monetizationAllowed = reveal.safety.monetizationAllowed;
  let monetizationRestrictionReason: string | undefined;
  let publishBlocked = reveal.safety.publishBlocked ?? false;
  let ageGateRequired = reveal.safety.ageGateRequired;
  let requiresSafetyScan = false;

  const base = { ...reveal.safety };

  switch (cls) {
    case "normal":
      safetyStatus = "passed";
      monetizationAllowed = isMonetizedRevealType(reveal.revealType) ? true : monetizationAllowed;
      monetizationRestrictionReason = undefined;
      publishBlocked = false;
      break;
    case "privacy_sensitive":
      safetyStatus = "warning";
      monetizationAllowed = false;
      monetizationRestrictionReason = "Privacy-sensitive: monetization restricted.";
      publishBlocked = false;
      break;
    case "identity_sensitive":
      safetyStatus = "warning";
      monetizationAllowed = false;
      monetizationRestrictionReason = "Identity-sensitive: monetization restricted.";
      publishBlocked = false;
      break;
    case "minor_sensitive":
      safetyStatus = "blocked";
      monetizationAllowed = false;
      monetizationRestrictionReason = "Minor-sensitive: monetization blocked.";
      ageGateRequired = true;
      if (isMonetizedRevealType(reveal.revealType)) {
        publishBlocked = true;
      }
      break;
    case "financial_sensitive":
      if (isMonetizedRevealType(reveal.revealType)) {
        safetyStatus = "blocked";
        monetizationAllowed = false;
        monetizationRestrictionReason = "Financial-sensitive: paid/tip reveal not allowed.";
        publishBlocked = true;
      } else {
        safetyStatus = "warning";
      }
      break;
    case "blocked":
      safetyStatus = "blocked";
      monetizationAllowed = false;
      monetizationRestrictionReason = "Class blocked.";
      publishBlocked = true;
      break;
    default:
      safetyStatus = reveal.safety.safetyStatus === "pending" ? "warning" : reveal.safety.safetyStatus;
      monetizationRestrictionReason = "Review recommended for this safety class.";
      break;
  }

  if (reveal.revealType === "watch_to_reveal" && !reveal.eligibility.requireVerifiedHuman) {
    monetizationRestrictionReason =
      (monetizationRestrictionReason ? `${monetizationRestrictionReason} ` : "") +
      "Watch-to-reveal should require verified completion.";
    if (safetyStatus === "passed") safetyStatus = "warning";
  }

  if (paidRevealRequiresDescription(reveal) && isMonetizedRevealType(reveal.revealType)) {
    monetizationRestrictionReason =
      (monetizationRestrictionReason ? `${monetizationRestrictionReason} ` : "") +
      "Paid reveals require a description.";
    publishBlocked = true;
  }

  return {
    ...reveal,
    safety: {
      ...base,
      safetyStatus,
      monetizationAllowed,
      monetizationRestrictionReason,
      publishBlocked,
      ageGateRequired,
      requiresSafetyScan,
    },
    updatedAt: nowIso,
  };
}

export type PublishGateResult = { ok: true } | { ok: false; reasons: string[] };

/** Hard publish gate: only `publishBlocked` stops publishing (export may still run). */
export function collectMagicPublishErrors(reveals: MagicReveal[]): string[] {
  const reasons: string[] = [];
  for (const r of reveals) {
    if (r.status === "deleted") continue;
    if (r.safety.publishBlocked) {
      reasons.push(`Publishing blocked. Resolve blocked Magic reveals first. (${r.name})`);
    }
  }
  return reasons;
}

/** Non-blocking issues: monetization / description / safety warnings (export allowed, review recommended). */
export function collectMagicPublishSoftWarnings(reveals: MagicReveal[]): string[] {
  const w: string[] = [];
  for (const r of reveals) {
    if (r.status === "deleted") continue;
    if (r.safety.safetyStatus === "blocked" && !r.safety.publishBlocked) {
      w.push(`"${r.name}" is safety-blocked — review before shipping.`);
    }
    if (r.safety.safetyClass === "minor_sensitive" && isMonetizedRevealType(r.revealType)) {
      w.push(`"${r.name}": minor-sensitive content cannot be monetized.`);
    }
    if (isMonetizedRevealType(r.revealType) && !r.safety.monetizationAllowed) {
      w.push(`"${r.name}": some reveals can publish but cannot be monetized.`);
    }
    if (paidRevealRequiresDescription(r)) {
      w.push(`"${r.name}": paid/tip reveals need a short description.`);
    }
  }
  return w;
}

export function assertMagicPublishAllowed(reveals: MagicReveal[]): PublishGateResult {
  const reasons = collectMagicPublishErrors(reveals);
  return reasons.length ? { ok: false, reasons } : { ok: true };
}

export function hasMonetizationWarnings(reveals: MagicReveal[]): boolean {
  return reveals.some(
    (r) =>
      r.status !== "deleted" &&
      isMonetizedRevealType(r.revealType) &&
      (!r.safety.monetizationAllowed || r.safety.safetyStatus === "warning")
  );
}

export function isRevealTypeSelectable(reveal: MagicReveal, nextType: RevealType): boolean {
  if (reveal.safety.safetyClass === "blocked") {
    return nextType === "always_hidden";
  }
  if (reveal.safety.safetyClass === "minor_sensitive" && isMonetizedRevealType(nextType)) {
    return false;
  }
  if (reveal.safety.safetyClass === "financial_sensitive" && isMonetizedRevealType(nextType)) {
    return false;
  }
  if (reveal.safety.ageGateRequired && isMonetizedRevealType(nextType)) {
    return false;
  }
  return true;
}
