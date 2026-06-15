# Trade Secrets Inventory — [ i ] Project

**CONFIDENTIAL — DO NOT DISCLOSE OUTSIDE ORGANIZATION**

| Field | Value |
|-------|-------|
| **Document ID** | IP-TS-2026-001 |
| **Date** | 2026-06-15 |
| **Total trade secrets** | 28 |
| **Classification levels** | Critical / High / Medium / Low |

---

## Classification Guide

| Level | Definition | Protection requirement |
|-------|-----------|----------------------|
| **Critical** | Core competitive advantage; disclosure would eliminate moat | NDA required; no public patent (consider patent vs trade secret analysis per asset) |
| **High** | Significant commercial value; disclosure would aid competitors | Access-controlled; redact from investor materials |
| **Medium** | Operational advantage; not easily reverse-engineered | Standard employee NDA; no open-source publication |
| **Low** | Minor advantage; may become public through product use | Standard confidentiality |

---

## Critical Trade Secrets

| # | Secret | Domain | Location | Risk if disclosed |
|---|--------|--------|----------|-------------------|
| TS-01 | **POPS scoring weight tables** — exact per-layer weights for presence, attention, intent, continuity dimensions | POP Core | `integrations/pop-core/backend/scoring/pops.constants.ts` | Enables scoring bypass / game-the-system attacks |
| TS-02 | **POPS proof thresholds** — minimum layer scores for full/partial/reject outcomes | POP Core | `integrations/pop-core/backend/scoring/pops.constants.ts` | Allows crafting packets that barely pass |
| TS-03 | **Fraud detection scoring formulas** — automation signal score + impossible behavior score algorithms | POP Core | `integrations/pop-core/backend/scoring/pops-scoring.service.ts` | Reveals exact fraud detection boundaries |
| TS-04 | **Trust tier resolution logic** — allowlist + default tier + history-based upgrade criteria | Settlement | `integrations/pop-core/backend/settlement/trust-tier.ts` | Gaming trust to reach auto-settle |
| TS-05 | **Settlement amount policy** — trust-tier-adjusted payout formulas | Settlement | `integrations/pop-core/backend/settlement/settlement-amount-policy.ts` | Revenue model reverse engineering |
| TS-06 | **POPS decision state machine** — exact transition rules for judgment outcomes | POP Core | `integrations/pop-core/backend/decisions/pops-decision.service.ts` | Predicting settlement outcomes |

---

## High Trade Secrets

| # | Secret | Domain | Location | Risk if disclosed |
|---|--------|--------|----------|-------------------|
| TS-07 | **Attention scoring EMA weights** — face/eyes/gaze/pose weight distribution | Attention | `app/src/lib/attentionScoring.ts` | Gaming attention verification |
| TS-08 | **Calibration residual coefficients** — polynomial degree-2 gaze correction vectors | Vision | `app/src/lib/visionCalibration/residualModel.ts` | Synthesizing fake calibration profiles |
| TS-09 | **Feed personalization scoring algorithm** — relevance scoring + cold-start fallback rules | Marketplace | `app/supabase/functions/get-personalized-feed/index.ts` | SEO-style gaming of feed ranking |
| TS-10 | **Campaign valuation model** — how campaign eligibility scores map to advertiser billing | Campaigns | `integrations/pop-core/backend/decisions/versioning/pops-rule-registry.ts` | Advertiser arbitrage |
| TS-11 | **Reward daily cap structure** — 80 icoin / 120 vicoin / 20 promo view caps + trust tier multipliers | Economy | `app/supabase/functions/issue-reward/index.ts` | Optimizing farming strategies |
| TS-12 | **Governance kernel confidence thresholds** — 0.85 minimum + risk caps + rate limits | Intent OS | `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/governance_kernel.dart` | Bypassing autonomous safety |
| TS-13 | **Elo doctrine regex patterns** — exact blocked phrases for proof bypass and reward manipulation | Elo | `app/src/lib/elo/eloDoctrine.ts` | Crafting prompts that evade safety |
| TS-14 | **Wallet ledger invariant rules** — Rule 2/4/8 constraints on balance mutations | Wallet | `old-source-preservation/.../wallet_ledger_engine.dart` | Finding ledger edge cases |
| TS-15 | **VSL hysteresis parameters** — adopt 55% / hold 45% zone thresholds, 2000ms window | POP Core | `flutter-runtime/lib/verification/verification_stability_layer.dart` | Crafting gaze patterns that exploit thresholds |

---

## Medium Trade Secrets

| # | Secret | Domain | Location |
|---|--------|--------|----------|
| TS-16 | **Check-in streak bonus ladder** — 2d=5%, 3d=10%, 5d=15% escalation | Marketplace | `app/supabase/functions/verify-checkin/index.ts` |
| TS-17 | **Fibonacci ramp parameters** — gentle/standard/aggressive curve profiles | Economy UX | `app/src/lib/gestureButtons/ramp.ts` |
| TS-18 | **Interaction abuse overrun ratio** — 2x content duration maximum | Fraud | `app/supabase/functions/track-interaction/index.ts` |
| TS-19 | **Rate limit bucket sizing** — per-user + per-IP throttle parameters | Fraud | `app/supabase/functions/_shared/rateLimit.ts` |
| TS-20 | **Idempotency cache TTL** — 24h scoped by endpoint | Infrastructure | `app/supabase/functions/_shared/idempotency.ts` |
| TS-21 | **Creator tier multiplier tables** — Newcomer 1.0x through Master 2.5x | Creator | `MASTER_BRAIN/ECONOMY/i-app-economy-rules.md` §7 |
| TS-22 | **60/30/10 revenue split allocation rules** | Creator | `MASTER_BRAIN/ECONOMY/i-app-economy-rules.md` §6 |
| TS-23 | **Conversion rate tables** — rCoins→iCoins 100:1 base + trust tier bonuses | Economy | `MASTER_BRAIN/ECONOMY/i-app-economy-rules.md` §3 |
| TS-24 | **Digital twin behavior profile schemas** | Intent OS | `flutter-runtime/lib/core/intent_os/learning/` |

---

## Low Trade Secrets

| # | Secret | Domain | Location |
|---|--------|--------|----------|
| TS-25 | **Demo fixture data** — golden proof packet structure | Testing | `integrations/pop-core/fixtures/PP-000001.json` |
| TS-26 | **Presenter mode detection logic** | Demo | `app/src/lib/appMode.ts` |
| TS-27 | **Subscription tier multipliers** — Pro 2x, Creator 3x | Payments | `app/supabase/functions/check-subscription/index.ts` |
| TS-28 | **Skin tone fallback thresholds** | Vision | `app/src/lib/skinToneFallback.ts` |

---

## Patent vs Trade Secret Recommendations

| Asset | Recommendation | Rationale |
|-------|---------------|-----------|
| POPS scoring weights (TS-01, TS-02) | **Trade secret** | Not visible in product; reverse-engineering extremely difficult |
| Fraud formulas (TS-03) | **Trade secret** | Publishing enables adversarial bypass |
| Settlement amounts (TS-05) | **Trade secret** | Competitive pricing intelligence |
| POPS architecture (patent) | **Patent** | Architecture visible in API behavior; patent protects structure |
| VSL algorithm (patent) | **Patent** | Algorithm discoverable from SDK analysis |
| Governance kernel gates (TS-12) | **Hybrid** — patent architecture, trade secret thresholds | Gate ordering is patentable; exact values are trade secret |
| Elo doctrine patterns (TS-13) | **Trade secret** | Publishing enables adversarial prompt crafting |

---

## Protection Measures Required

1. All trade secrets must be marked CONFIDENTIAL in source code comments
2. Employee/contractor NDAs must cover all Critical and High items
3. Investor pitch materials must NOT include exact scoring weights, thresholds, or formulas
4. Open-source contributions (if any) must exclude files listed above
5. API responses must not expose internal scoring parameters
6. Patent filings must describe architecture/method without disclosing exact threshold values

---

*Review with counsel to determine patent vs trade secret strategy per asset.*
