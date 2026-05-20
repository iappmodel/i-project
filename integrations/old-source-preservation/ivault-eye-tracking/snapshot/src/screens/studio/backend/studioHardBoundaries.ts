/**
 * [ i ] Studio Stage 8 — non-bypassable client/server invariants (document + guard hooks).
 */

export const STUDIO_HARD_BOUNDARY_RULES = [
  { id: 1, rule: "Client cannot create completed ledger entry directly." },
  { id: 2, rule: "Client cannot mark verification as passed without server authority." },
  { id: 3, rule: "Client cannot compute final wallet balance." },
  { id: 4, rule: "Client cannot release creator settlement." },
  { id: 5, rule: "Client cannot override age gate." },
  { id: 6, rule: "Client cannot lower fraud score." },
  { id: 7, rule: "Client cannot publish blocked post." },
  { id: 8, rule: "Client cannot mutate published post package snapshot." },
  { id: 9, rule: "Client cannot delete ledger entries." },
  { id: 10, rule: "Client cannot delete dispute evidence." },
  { id: 11, rule: "Client cannot pay campaign reward without verification." },
  { id: 12, rule: "Client cannot mark safety scan passed in production." },
  { id: 13, rule: "Client cannot self-assign trust score." },
  { id: 14, rule: "Client cannot decide campaign action payout." },
  { id: 15, rule: "Client cannot bypass idempotency on financial mutations." },
] as const;

/** Dev-time assertion helper — returns false when a would-be client action violates a rule id. */
export function assertHardBoundary(
  ruleId: (typeof STUDIO_HARD_BOUNDARY_RULES)[number]["id"],
  context: { clientOnly?: boolean; hasServerDecision?: boolean; isProduction?: boolean }
): { ok: boolean; reason?: string } {
  const { clientOnly = true, hasServerDecision = false, isProduction = false } = context;
  if (!clientOnly) return { ok: true };

  switch (ruleId) {
    case 1:
      return { ok: false, reason: "Ledger completion is server-append-only." };
    case 2:
      return hasServerDecision ? { ok: true } : { ok: false, reason: "Verification pass requires server authority." };
    case 3:
      return { ok: false, reason: "Balances are server-derived." };
    case 4:
      return { ok: false, reason: "Settlement release is server-owned." };
    case 5:
      return { ok: false, reason: "Age gate is server-evaluated." };
    case 6:
      return { ok: false, reason: "Fraud score is server-owned." };
    case 7:
      return { ok: false, reason: "Publish blocked requires remediation server-side." };
    case 8:
      return { ok: false, reason: "Published package snapshot is immutable." };
    case 9:
      return { ok: false, reason: "Ledger entries are append-only." };
    case 10:
      return { ok: false, reason: "Dispute evidence is append-only." };
    case 11:
      return hasServerDecision ? { ok: true } : { ok: false, reason: "Campaign payout requires verified server path." };
    case 12:
      return isProduction ? { ok: false, reason: "Safety pass is server moderation in production." } : { ok: true };
    case 13:
      return { ok: false, reason: "Trust score is server-computed." };
    case 14:
      return hasServerDecision ? { ok: true } : { ok: false, reason: "Payout decision is server-owned." };
    case 15:
      return { ok: false, reason: "Financial mutations require idempotency key server-side." };
    default:
      return { ok: true };
  }
}
