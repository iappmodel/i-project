# Investor Demo Knowledge Map

**Classification:** Mixed — dual strategy is intentional  
**Confidence:** High

## Build Priority #1 (Constitution)

Investor Demo is the first build priority.

## Three Parallel Demo Paths

| Path | Location | Narrative | Classification |
|------|----------|-----------|----------------|
| **Loop 1 spine** | `app/` | Linear 13-screen router, consent gate, proof layer, creator economics, roadmap | **Canonical for Loop 1 story** |
| **Full-app demo overlay** | eye-earn-sparkle-archive `codex/investor-demo-mode-v2` | HeroEntry, scenarios, pending wallet, presenter controls | **Experimental UX reference** |
| **Linear Vite walkthrough** | `integrations/eye-tracking/demos/investor-demo/` | Presenter Prev/Next, mocked gaze | **Prototype** (mirrors i-initial-structures branch) |
| **Single-file MVP** | `integrations/eye-tracking/prototypes/i-mvp-prototype/` | Monolithic click-through | **Prototype** |

## Loop 1 Screen Order (`app/`)

```
splash → feed → offer-detail → watch-verify → verification-result →
reward-reveal → wallet → convert → withdraw-preview → creator-economics →
roadmap (+ consent-camera-gate, proof-layer)
```

## Investor Demo v2 Scenarios

| ID | Region | Flow |
|----|--------|------|
| us-earner | US | Promo → Earn → Convert → Withdraw → Checkout |
| brazil-shopper | BRAZIL | Promo → Earn → Pay (Pix) |
| wallet-explorer | US/BRAZIL | Dashboard + status pills |

## Key UX Patterns to Preserve

- **Pending-first earn** (demoState) — best POPS narrative match
- **HeroEntry copy:** "Verified attention becomes usable value"
- **Transaction status pills** with reasons and ETA
- **Presenter controls:** verification delay, reward mode, checkout outcome

## Gaps vs Constitution

- v2 lacks proof-layer screen and creator economics slide
- app/ lacks pending-first flow (instant credit gap)
- Neither emits Proof Packet v0

## Dual Demo Strategy (Decision)

Do **not** merge architectures. `app/` = Loop 1 + proof spine. Archive `npm run demo` = full-product fintech walkthrough.

**Sources:** INVESTOR_DEMO_MODE_V2 audit; I_INITIAL_STRUCTURES audit; constitution
