# Compliance brief (investor meetings)

**Not legal advice.** Obtain US counsel before any securities offering language.

## Rewards framing

- Position rewards as **compensation for verified attention** on sponsored media, not investment returns.
- On-platform coins (a/i/v/e/o Tier 1) are utility within the marketplace; withdraw rails are separate product decisions.

## Withdraw / payout

| Mode | Truth |
|------|-------|
| Demo | `WithdrawPreviewScreen` — simulated bank/PayPal/crypto; `payout.service.ts` demo fallback |
| Live | `request-payout` edge when Supabase + Stripe configured (`enable_stripe_live_env.sh`) |

Say: “Demo shows UX; production payout requires KYC and partner rails.”

## Privacy / camera

Canon: [`MASTER_BRAIN/CANONICAL/IMMERSIVE_UI_DESIGN_LAW.md`](../MASTER_BRAIN/CANONICAL/IMMERSIVE_UI_DESIGN_LAW.md)

| Surface | Copy today | Notes |
|---------|--------------|-------|
| `ConsentCameraGateScreen` | States React demo **simulates** gaze; no camera in default browser | Matches honest disclose |
| Production target | Camera-based attention proof before payout | Document in roadmap |

## Fraud / validation

- Multi-signal POP: [`POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md`](../technical/POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md)
- Pending holds before settlement; appeals path in pop-core

## Securities

- Do not promise APY, token appreciation, or profit-sharing without counsel.
- If asked “is this a security?” → “We’re building attention marketplace infrastructure; counsel review required for US offering structure.”
