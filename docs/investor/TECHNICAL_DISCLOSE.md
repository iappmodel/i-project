# Technical disclosure (investor diligence)

Mirror of checklist **Honest disclose** — say once per meeting.

| Topic | Truth today |
|-------|-------------|
| **Demo vs production** | DEMO track in `app/` locally; PRODUCTION cloud cutover parallel (`FEATURE_BIBLE.md`) |
| **Proof loop** | Validator + pending holds + ledger wired locally; cloud = pilot milestone |
| **Eye-tracking** | Flutter runtime + Seal Proof on device; web uses session-derived / mock gaze unless `VITE_VISION_ENGINE` |
| **Archive body** | `eye-earn-sparkle-archive` has production breadth — promotion in flight |
| **External OS control** | POP blocks OS/payment actions by default (`docs/POP_EXTERNAL_OS_CONTROL.md`) |

## Currency (ADR-001)

- **Canonical Tier 1:** a / i / v / e / o per [`MASTER_BRAIN/DECISIONS/CURRENCY_NAMING_ADR.md`](../MASTER_BRAIN/DECISIONS/CURRENCY_NAMING_ADR.md)
- **Demo labels:** may show legacy iCoin/vCoin strings in UI — not a second taxonomy

## POP v2

- Tag: `pop-v2-complete`
- Release: [`docs/POP_V2_RELEASE.md`](../POP_V2_RELEASE.md)

## Session gate (CR-01)

- No reward without `attentionSession.status === 'validated'`
- Implementation: `app/src/state/attentionSession.ts`
